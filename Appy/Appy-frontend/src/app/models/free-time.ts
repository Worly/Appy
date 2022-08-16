import moment from "moment/moment";
import { Moment } from "moment";

export class FreeTimeDTO {
    public from: string = "";
    public to: string = "";
    public toIncludingDuration: string = "";
}

export class FreeTime {
    public from: Moment;
    public to: Moment;
    public toIncludingDuration: Moment;

    constructor(dto: FreeTimeDTO) {
        this.from = moment(dto.from, "HH:mm:ss");
        this.to = moment(dto.to, "HH:mm:ss");
        this.toIncludingDuration = moment(dto.toIncludingDuration, "HH:mm:ss");
    }
}