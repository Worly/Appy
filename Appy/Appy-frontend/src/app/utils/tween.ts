export class Tween {
    private getter: Getter;
    private setter: Setter;

    private startValue?: number;
    private endValue?: number;
    private startTime?: number;
    private duration?: number;

    private running: boolean = false;

    private intervalId?: any;

    constructor(getter: Getter, setter: Setter) {
        this.getter = getter;
        this.setter = setter;
    }

    public tweenTo(endValue: number, durationMs: number): void {
        if (this.running)
            this.stop();

        this.startValue = this.getter();
        this.endValue = endValue;

        this.startTime = Date.now();
        this.duration = durationMs;

        this.running = true;
        this.intervalId = setInterval(() => this.tick());
    }

    public stop() {
        clearInterval(this.intervalId);
        this.running = false;
    }

    private tick() {
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