export class ClientNotificationsSettingsDTO {
    public instagramAPIAccessToken?: string;
    public appointmentConfirmationMessageTemplate?: string;
}

export class ClientNotificationsSettings {
    public instagramAPIAccessToken?: string;
    public appointmentConfirmationMessageTemplate?: string;

    constructor(dto: ClientNotificationsSettingsDTO = new ClientNotificationsSettingsDTO()) {
        this.instagramAPIAccessToken = dto.instagramAPIAccessToken;
        this.appointmentConfirmationMessageTemplate = dto.appointmentConfirmationMessageTemplate;
    }

    public getDTO(): ClientNotificationsSettingsDTO {
        let dto = new ClientNotificationsSettingsDTO();
        dto.instagramAPIAccessToken = this.instagramAPIAccessToken;
        dto.appointmentConfirmationMessageTemplate = this.appointmentConfirmationMessageTemplate;

        return dto;
    }
}