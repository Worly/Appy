import { BaseModel, REQUIRED_VALIDATION, Validation } from "./base-model";

export class ClientDTO {
    public id: number = 0;
    public nickname?: string;
    public name?: string;
    public surname?: string;
    public phoneNumber?: string;
    public email?: string;
    public notes?: string;
    public isArchived?: boolean;
}

export class Client extends BaseModel {
    public id: number;
    public nickname?: string;
    public name?: string;
    public surname?: string;
    public phoneNumber?: string;
    public email?: string;
    public notes?: string;
    public isArchived?: boolean;

    override validations: Validation[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.nickname),
            propertyName: "nickname",
            errorCode: "pages.clients.errors.MISSING_NICKNAME"
        },
    ]

    constructor(dto: ClientDTO = new ClientDTO()) {
        super();

        this.id = dto.id;
        this.nickname = dto.nickname;
        this.name = dto.name;
        this.surname = dto.surname;
        this.phoneNumber = dto.phoneNumber;
        this.email = dto.email;
        this.notes = dto.notes;
        this.isArchived = dto.isArchived;

        this.initProperties();
    }

    public getDTO(): ClientDTO {
        let dto = new ClientDTO();
        dto.id = this.id;
        dto.nickname = this.nickname;
        dto.name = this.name;
        dto.surname = this.surname;
        dto.phoneNumber = this.phoneNumber;
        dto.email = this.email;
        dto.notes = this.notes;
        dto.isArchived = this.isArchived;

        return dto;
    }
}