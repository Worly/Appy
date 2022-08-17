import dayjs from "dayjs";
import { Dayjs } from "dayjs";

export class FreeTimeDTO {
    public from: string = "";
    public to: string = "";
    public toIncludingDuration: string = "";
}

export class FreeTime {
    public from: Dayjs;
    public to: Dayjs;
    public toIncludingDuration: Dayjs;

    constructor(dto: FreeTimeDTO) {
        this.from = dayjs(dto.from, "HH:mm:ss");
        this.to = dayjs(dto.to, "HH:mm:ss");
        this.toIncludingDuration = dayjs(dto.toIncludingDuration, "HH:mm:ss");
    }
}