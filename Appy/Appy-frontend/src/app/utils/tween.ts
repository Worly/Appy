export class TweenManager {
    private tweens: Tween[] = [];
    private intervalId?: any;

    public addTween(tween: Tween) {
        this.tweens.push(tween);
    }

    public start() {
        if (this.tweens.every(t => !t.running))
            return;

        if (this.intervalId != null)
            return;

        this.intervalId = setInterval(() => this.tick());
    }

    public stop() {
        if (this.tweens.some(t => t.running))
            return;

        if (this.intervalId == null)
            return;

        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    private tick() {
        for (let t of this.tweens) {
            if (t.running)
                t.tick();
        }
    }
}

export class Tween {
    private getter: Getter;
    private setter: Setter;

    private startValue?: number;
    private endValue?: number;
    private startTime?: number;
    private duration?: number;

    private _running: boolean = false;
    public get running(): boolean {
        return this._running;
    }
    private set running(value: boolean) {
        this._running = value;
    }

    private manager: TweenManager;

    constructor(getter: Getter, setter: Setter, manager?: TweenManager) {
        this.getter = getter;
        this.setter = setter;

        this.manager = manager ?? new TweenManager();

        this.manager.addTween(this);
    }

    public tweenTo(endValue: number, durationMs: number): void {
        if (this.running && endValue == this.endValue)
            return;

        this.startValue = this.getter();
        this.endValue = endValue;

        if (!this.running)
            this.startTime = Date.now();

        this.duration = durationMs;

        this.running = true;

        this.manager.start();
    }

    public stop() {
        this.running = false;
        this.manager.stop();
    }

    public tick() {
        if (this.startTime == null || this.startValue == null || this.endValue == null || this.duration == null) {
            console.error("Error in tween, missing data!");
            this.stop();
            return;
        }

        var p = (Date.now() - this.startTime) / this.duration;
        if (p < 0)
            p = 0;
        if (p > 1)
            p = 1;

        // easing function
        let t = easeInOutCubic(p);

        this.setter(this.startValue + (this.endValue - this.startValue) * t);

        if (p == 1)
            this.stop();
    }
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export type Getter = () => number;
export type Setter = (v: number) => void;