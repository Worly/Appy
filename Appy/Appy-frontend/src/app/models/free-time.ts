import * as moment from "moment";

export class FreeTimeDTO {
    public from: string = "";
    public to: string = "";
    public toIncludingDuration: string = "";
}

export class FreeTime {
    public from: moment.Moment;
    public to: moment.Moment;
    public toIncludingDuration: moment.Moment;

    constructor(dto: FreeTimeDTO) {
        this.from = moment(dto.from, "HH:mm:ss");
        this.to = moment(dto.to, "HH:mm:ss");
        this.toIncludingDuration = moment(dto.toIncludingDuration, "HH:mm:ss");
    }
}

export class TakenTime {
    public from: moment.Moment;
    public to: moment.Moment;

    constructor(from: moment.Moment, to: moment.Moment) {
        this.from = from;
        this.to = to;
    }
}

export function getTakenTimesFromFreeTimes(freeTimes: FreeTime[], startTime: moment.Moment, endTime: moment.Moment, stepInMins: number = 5): TakenTime[] {
    let takenTimes: TakenTime[] = [];

    let time = startTime.clone();

    let currentTakenTime: TakenTime | null = null;

    while (time.isSameOrBefore(endTime)) {

        let isTaken = true;
        for (let ft of freeTimes) {
            if (time.isAfter(ft.from) && time.isBefore(ft.toIncludingDuration)) {
                isTaken = false;
                break;
            }
        }

        if (currentTakenTime == null && isTaken) {
            currentTakenTime = {
                from: time.clone(),
                to: time.clone()
            };
        }
        else if (currentTakenTime != null && !isTaken) {
            currentTakenTime.to = time.clone().add({ minutes: -stepInMins });
            takenTimes.push(currentTakenTime);
            currentTakenTime = null;
        }

        time = time.clone().add({ minutes: stepInMins });
    }

    if (currentTakenTime != null) {
        currentTakenTime.to = time.clone().add({ minutes: -stepInMins });
        takenTimes.push(currentTakenTime);
        currentTakenTime = null;
    }

    return takenTimes;
}