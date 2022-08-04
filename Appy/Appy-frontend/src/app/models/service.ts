import { BaseModel, REQUIRED_VALIDATION, Validation } from "./base-model";
import { Duration, duration, utc } from "moment";

export class ServiceDTO {
    public id: number = 0;
    public name?: string;
    public duration?: string;
    public colorId?: number;
}

export class Service extends BaseModel {
    public id: number;
    public name?: string;
    public duration?: Duration;
    public colorId?: number;

    override validations: Validation[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.name),
            propertyName: "name",
            errorCode: "pages.services.errors.MISSING_NAME"
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
        this.duration = dto.duration ? duration(dto.duration) : undefined;
        this.colorId = dto.colorId;

        this.initProperties();
    }

    public getDTO(): ServiceDTO {
        let dto = new ServiceDTO();
        dto.id = this.id;
        dto.name = this.name;
        dto.duration = this.duration ? utc(this.duration.asMilliseconds()).format("HH:mm:ss") : undefined;
        dto.colorId = this.colorId;
        
        return dto;
    }
}