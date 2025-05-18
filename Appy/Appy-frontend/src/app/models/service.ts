import { EditModel, REQUIRED_VALIDATION, Validation } from "./base-model";
import { Duration } from "dayjs/plugin/duration";
import { parseDuration } from "../utils/time-utils";

export class ServiceDTO {
    public id: number = 0;
    public name?: string;
    public displayName?: string;
    public duration?: string;
    public colorId?: number;
    public isArchived?: boolean;
}

export class Service extends EditModel<Service> {
    public static readonly ENTITY_TYPE: string = "service";

    public id: number;
    public name?: string;
    public displayName?: string;
    public duration?: Duration;
    public colorId?: number;
    public isArchived?: boolean;

    override validations: Validation<Service>[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.name),
            propertyName: "name",
            errorCode: "pages.services.errors.MISSING_NAME"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.displayName),
            propertyName: "displayName",
            errorCode: "pages.services.errors.MISSING_DISPLAY_NAME"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.colorId),
            propertyName: "colorId",
            errorCode: "pages.services.errors.MISSING_COLOR"
        },
        {
            isValid: () => REQUIRED_VALIDATION(this.duration),
            propertyName: "duration",
            errorCode: "pages.services.errors.MISSING_DURATION"
        }
    ]

    constructor(dto: ServiceDTO = new ServiceDTO()) {
        super();

        this.id = dto.id;
        this.name = dto.name;
        this.displayName = dto.displayName;
        this.duration = dto.duration ? parseDuration(dto.duration) : undefined;
        this.colorId = dto.colorId;
        this.isArchived = dto.isArchived;

        this.initProperties();
    }

    public getDTO(): ServiceDTO {
        let dto = new ServiceDTO();
        dto.id = this.id;
        dto.name = this.name;
        dto.displayName = this.displayName;
        dto.duration = this.duration ? this.duration.format("HH:mm:ss") : undefined;
        dto.colorId = this.colorId;
        dto.isArchived = this.isArchived;

        return dto;
    }
}