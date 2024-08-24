export class DashboardSettingsDTO {
    public settingsJSON: string = "{}";

    constructor(json: string) {
        this.settingsJSON = json;
    }
}

export class DashboardSettings {
    public upcomingUnconfirmedDays: number = 7;

    constructor(dto?: DashboardSettingsDTO) {
        if (dto != null) {
            var parsedJson = JSON.parse(dto.settingsJSON);
    
            this.upcomingUnconfirmedDays = parsedJson.upcomingUnconfirmedDays ?? 7;
        }
    }

    public toDTO(): DashboardSettingsDTO {
        return new DashboardSettingsDTO(JSON.stringify(this));
    }
}