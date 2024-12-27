import dayjs, { Dayjs } from "dayjs";

export class ClientNotificationsSettingsDTO {
    public instagramAPIAccessToken?: string;
    public appointmentConfirmationMessageTemplate?: string;
    public appointmentReminderMessageTemplate?: string;
    public appointmentReminderTime?: string;
}

export class ClientNotificationsSettings {
    public instagramAPIAccessToken?: string;
    public appointmentConfirmationMessageTemplate?: string;
    public appointmentReminderMessageTemplate?: string;
    public appointmentReminderTime?: Dayjs;

    constructor(dto: ClientNotificationsSettingsDTO = new ClientNotificationsSettingsDTO()) {
        this.instagramAPIAccessToken = dto.instagramAPIAccessToken;
        this.appointmentConfirmationMessageTemplate = dto.appointmentConfirmationMessageTemplate;
        this.appointmentReminderMessageTemplate = dto.appointmentReminderMessageTemplate;
        this.appointmentReminderTime = dto.appointmentReminderTime ? dayjs(dto.appointmentReminderTime) : undefined;
    }

    public getDTO(): ClientNotificationsSettingsDTO {
        let dto = new ClientNotificationsSettingsDTO();
        dto.instagramAPIAccessToken = this.instagramAPIAccessToken;
        dto.appointmentConfirmationMessageTemplate = this.appointmentConfirmationMessageTemplate;
        dto.appointmentReminderMessageTemplate = this.appointmentReminderMessageTemplate;
        dto.appointmentReminderTime = this.appointmentReminderTime?.toISOString();

        return dto;
    }
}