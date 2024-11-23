import { Children, Model, REQUIRED_VALIDATION, Validation } from "./base-model";

export type ClientContactType = "Instagram" | "WhatsApp";

export class ClientContactDTO {
    public id: number = 0;
    public type!: ClientContactType;
    public value!: string;
}

export class ClientDTO {
    public id: number = 0;
    public name!: string;
    public surname?: string;
    public contacts?: ClientContactDTO[];
    public notes?: string;
    public isArchived?: boolean;

    public static getFullname(dto: ClientDTO): string {
        if (dto.surname == null || dto.surname == "")
            return dto.name;

        return dto.name + " " + dto.surname;
    }
}

export class ClientContact extends Model<ClientContact> {
    public static readonly ENTITY_TYPE: string = "clientContact";

    public id: number;
    public type: ClientContactType;
    public value: string;

    override validations: Validation<ClientContact>[] = [
        {
            isValid: () => REQUIRED_VALIDATION(this.value),
            propertyName: "value",
            errorCode: "pages.clients.errors.MISSING_CONTACT_VALUE"
        },
    ]

    constructor(dto: ClientContactDTO = new ClientContactDTO()) {
        super();

        this.id = dto.id;
        this.type = dto.type;
        this.value = dto.value;

        this.initProperties();
    }

    public getDTO(): ClientContactDTO {
        let dto = new ClientContactDTO();
        dto.id = this.id;
        dto.type = this.type;
        dto.value = this.value;

        return dto;
    }
}

export class Client extends Model<Client> {
    public static readonly ENTITY_TYPE: string = "client";

    public id: number;
    public name?: string;
    public surname?: string;
    @Children public contacts?: ClientContact[];
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
        this.contacts = dto.contacts?.map(c => new ClientContact(c)) ?? [];
        this.notes = dto.notes;
        this.isArchived = dto.isArchived;

        this.initProperties();
    }

    public getDTO(): ClientDTO {
        let dto = new ClientDTO();
        dto.id = this.id;
        dto.name = this.name!;
        dto.surname = this.surname;
        dto.contacts = this.contacts?.map(c => c.getDTO());
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