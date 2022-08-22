export class Timer {
    private name?: string;
    private startTime: number = 0;
    private running: boolean = false;

    private elapsedMilliseconds: number = 0;

    constructor(name?: string, start: boolean = true) {
        this.name = name;

        if (start)
            this.start();
    }

    public start() {
        this.startTime = Date.now();
        this.running = true;
    }

    public stop() {
        if (!this.running)
            return;

        this.elapsedMilliseconds += Date.now() - this.startTime;

        this.running = false;
    }

    public getElapsedMilliseconds(): number {
        if (this.running)
            return this.elapsedMilliseconds + Date.now() - this.startTime;
        else
            return this.elapsedMilliseconds;
    }

    public log(): void {
        console.log(`Timer ${this.name ?? ""} has elapsed ${this.getElapsedMilliseconds()} ms.`);
    }

    public stopAndLog(): void {
        this.stop();
        this.log();
    }
}