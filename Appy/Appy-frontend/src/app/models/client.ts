import { Model, REQUIRED_VALIDATION, Validation } from "./base-model";

export class ClientDTO {
    public id: number = 0;
    public name!: string;
    public surname?: string;
    public phoneNumber?: string;
    public email?: string;
    public notes?: string;
    public isArchived?: boolean;

    public static getFullname(dto: ClientDTO): string {
        if (dto.surname == null || dto.surname == "")
            return dto.name;

        return dto.name + " " + dto.surname;
    }
}

export class Client extends Model<Client> {
    public id: number;
    public name?: string;
    public surname?: string;
    public phoneNumber?: string;
    public email?: string;
    public notes?: string;
    public isArchived?: boolean;

    override validations: Validation<Client>[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.name),
            propertyName: "name",
            errorCode: "pages.clients.errors.MISSING_NAME"
        },
    ]

    constructor(dto: ClientDTO = new ClientDTO()) {
        super();

        this.id = dto.id;
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
        dto.name = this.name!;
        dto.surname = this.surname;
        dto.phoneNumber = this.phoneNumber;
        dto.email = this.email;
        dto.notes = this.notes;
        dto.isArchived = this.isArchived;

        return dto;
    }

    public getFullname(): string {
        if (this.surname == null || this.surname == "")
            return this.name!;

        return this.name + " " + this.surname;
    }
}