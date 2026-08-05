/**
 * Regenerates every raster icon from src/assets/icons/appy-logo.svg.
 * Run with `npm run icons` after editing the SVG.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '..', 'src');
const ICONS = path.join(SRC, 'assets', 'icons');
const LOGO = path.join(ICONS, 'appy-logo.svg');

const MINT = '#E8F1F2';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const ANY_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 384, 512];
const ICO_SIZES = [16, 32, 48];

const ANY_FILL = 0.92;
const FAVICON_FILL = 0.88;
const SAFE_CIRCLE = 0.8;
// Scaling the mark to touch the safe circle exactly leaves its outermost pixels
// a rounding error outside it, so it is fitted just inside instead.
const SAFE_INSET = 0.98;

// How far to pull the maskable icons' centre from the bounding box towards the
// ink centroid. The stem's mass sits on one side, so 0 looks right-heavy inside
// a circular crop; a full correction overshoots and the silhouette hangs left.
const MASKABLE_BALANCE = 0.5;

const PROBE_WIDTH = 800;
const DENSITY = 2400;

const logo = fs.readFileSync(LOGO);

/**
 * Measures the mark by rasterising it once: where its ink sits, and how far the
 * ink reaches from both the bounding-box centre and the ink centroid.
 * The counter is excluded from the centroid — it reads as a hole, not as mass.
 */
async function measure() {
  const { data, info } = await sharp(logo, { density: DENSITY })
    .resize({ width: PROBE_WIDTH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const opaque = [];
  let inkCount = 0;
  let inkSumX = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] < 128) continue;
      opaque.push(x, y);
      const isCounter = data[i] > 200 && data[i + 1] > 220 && data[i + 2] > 220;
      if (isCounter) continue;
      inkCount++;
      inkSumX += x;
    }
  }

  const extentsAbout = (cx, cy) => {
    let halfX = 0;
    let halfY = 0;
    let radius = 0;
    for (let i = 0; i < opaque.length; i += 2) {
      const dx = opaque[i] - cx;
      const dy = opaque[i + 1] - cy;
      halfX = Math.max(halfX, Math.abs(dx));
      halfY = Math.max(halfY, Math.abs(dy));
      radius = Math.max(radius, Math.hypot(dx, dy));
    }
    return { cx, cy, halfX, halfY, radius };
  };

  const inkX = inkSumX / inkCount;

  return {
    width,
    boxCentred: extentsAbout(width / 2, height / 2),
    // Horizontal only: the silhouette is symmetric top to bottom, so the ink's
    // slight upward bias is interior detail and must not shift the letter down.
    balanced: (towardsInk) => extentsAbout(width / 2 + towardsInk * (inkX - width / 2), height / 2),
  };
}

async function render({ size, anchor, background, constraint }) {
  const target =
    constraint === 'safe-circle'
      ? ((SAFE_CIRCLE / 2) * SAFE_INSET * size) / anchor.radius
      : (constraint * size) / (2 * Math.max(anchor.halfX, anchor.halfY));

  // Placement is derived from the width actually rasterised, not the target, so
  // the two can't disagree by a rounded pixel.
  const markWidth = Math.max(1, Math.floor(target * probe.width));
  const scale = markWidth / probe.width;

  const mark = await sharp(logo, { density: DENSITY }).resize({ width: markWidth }).png().toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([
      {
        input: mark,
        left: Math.round(size / 2 - anchor.cx * scale),
        top: Math.round(size / 2 - anchor.cy * scale),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO container holding one PNG per size — supported everywhere since Vista. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, buf }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

let probe;

(async () => {
  probe = await measure();

  for (const size of ANY_SIZES) {
    const buf = await render({
      size,
      anchor: probe.boxCentred,
      background: TRANSPARENT,
      constraint: ANY_FILL,
    });
    fs.writeFileSync(path.join(ICONS, `icon-${size}x${size}.png`), buf);
    console.log(`icon-${size}x${size}.png`.padEnd(30), 'transparent');
  }

  // Android crops these to a circle, so they are the one set where the mark is
  // balanced on its ink centroid rather than on its bounding box.
  for (const size of MASKABLE_SIZES) {
    const buf = await render({
      size,
      anchor: probe.balanced(MASKABLE_BALANCE),
      background: MINT,
      constraint: 'safe-circle',
    });
    fs.writeFileSync(path.join(ICONS, `icon-maskable-${size}x${size}.png`), buf);
    console.log(`icon-maskable-${size}x${size}.png`.padEnd(30), MINT);
  }

  const ico = [];
  for (const size of ICO_SIZES) {
    ico.push({
      size,
      buf: await render({ size, anchor: probe.boxCentred, background: TRANSPARENT, constraint: FAVICON_FILL }),
    });
  }
  fs.writeFileSync(path.join(SRC, 'favicon.ico'), buildIco(ico));
  console.log(`favicon.ico (${ICO_SIZES.join(', ')})`.padEnd(30), 'transparent');
})();
