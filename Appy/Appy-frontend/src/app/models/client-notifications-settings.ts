export class ClientNotificationsSettingsDTO {
    public instagramAPIAccessToken?: string;
}

export class ClientNotificationsSettings {
    public instagramAPIAccessToken?: string;

    constructor(dto: ClientNotificationsSettingsDTO = new ClientNotificationsSettingsDTO()) {
        this.instagramAPIAccessToken = dto.instagramAPIAccessToken;
    }

    public getDTO(): ClientNotificationsSettingsDTO {
        let dto = new ClientNotificationsSettingsDTO();
        dto.instagramAPIAccessToken = this.instagramAPIAccessToken;

        return dto;
    }
}