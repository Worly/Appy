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

const TILE = '#FCE5EB';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const ANY_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 384, 512];
const ICO_SIZES = [16, 32, 48];

const ANY_FILL = 0.92;
const FAVICON_FILL = 0.88;

// Android may crop a maskable icon to anything inside a circle of this diameter, so
// the whole mark has to sit within it — and short of it, or the mark crowds the edge
// of the crop.
const SAFE_CIRCLE = 0.8;
const SAFE_INSET = 0.9;

// The flared feet carry the mark's weight, so a circular crop centred on the
// bounding box reads as sitting too low. The maskable icons are centred on the ink
// instead, which lifts the mark until its weight balances on the middle of the crop.

// Rasterises the 512pt artwork at 2048px, which every icon downsamples from.
const DENSITY = 288;
const PROBE_WIDTH = 800;

const logo = fs.readFileSync(LOGO);

/**
 * Measures the mark by rasterising it once: where its ink sits, where that ink
 * balances, and how far it reaches from the point the circular crop is centred on.
 * The artwork carries the tile's padding around the mark, which every icon drops
 * and then re-pads to taste.
 */
async function measure() {
  const { data, info } = await sharp(logo, { density: DENSITY })
    .resize({ width: PROBE_WIDTH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const opaque = [];
  let inkSumY = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < 128) continue;
      opaque.push(x, y);
      inkSumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Vertical only: the silhouette's horizontal weight is close enough to its
  // bounding box that correcting sideways just makes the mark look off-centre.
  const inkCy = inkSumY / (opaque.length / 2);

  let radius = 0;
  for (let i = 0; i < opaque.length; i += 2) {
    radius = Math.max(radius, Math.hypot(opaque[i] - cx, opaque[i + 1] - inkCy));
  }

  return { probe: width, minX, minY, markW: maxX - minX + 1, markH: maxY - minY + 1, cx, cy, inkCy, radius };
}

/** Rasterises the mark at `target` scale, with `anchor` landing at the centre of `background`. */
async function place(size, target, anchor, background) {
  const { probe, minX, minY, markW, markH } = mark;

  // Placement is derived from the pixels actually rasterised, not the target, so
  // the two can't disagree by a rounded pixel. The artwork is square.
  const raster = Math.max(1, Math.round(target * probe));
  const scale = raster / probe;
  const left = Math.round(minX * scale);
  const top = Math.round(minY * scale);
  const width = Math.min(Math.round(markW * scale), raster - left);
  const height = Math.min(Math.round(markH * scale), raster - top);

  const cropped = await sharp(logo, { density: DENSITY })
    .resize({ width: raster })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([
      {
        input: cropped,
        left: Math.round(size / 2 - (anchor[0] * scale - left)),
        top: Math.round(size / 2 - (anchor[1] * scale - top)),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Scales the mark to `fill` of the canvas and centres it on transparency. */
const renderMark = (size, fill) =>
  place(size, (fill * size) / Math.max(mark.markW, mark.markH), [mark.cx, mark.cy], TRANSPARENT);

/** Android crops these to a shape of its own choosing, so they keep the tile and
 * hold the mark inside the safe circle, balanced on its ink rather than its box. */
const renderTile = (size) =>
  place(size, ((SAFE_CIRCLE / 2) * SAFE_INSET * size) / mark.radius, [mark.cx, mark.inkCy], TILE);

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

let mark;

(async () => {
  mark = await measure();

  for (const size of ANY_SIZES) {
    fs.writeFileSync(path.join(ICONS, `icon-${size}x${size}.png`), await renderMark(size, ANY_FILL));
    console.log(`icon-${size}x${size}.png`.padEnd(30), 'transparent');
  }

  for (const size of MASKABLE_SIZES) {
    fs.writeFileSync(path.join(ICONS, `icon-maskable-${size}x${size}.png`), await renderTile(size));
    console.log(`icon-maskable-${size}x${size}.png`.padEnd(30), TILE);
  }

  const ico = [];
  for (const size of ICO_SIZES) {
    ico.push({ size, buf: await renderMark(size, FAVICON_FILL) });
  }
  fs.writeFileSync(path.join(SRC, 'favicon.ico'), buildIco(ico));
  console.log(`favicon.ico (${ICO_SIZES.join(', ')})`.padEnd(30), 'transparent');
})();
