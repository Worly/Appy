import { Component, Input } from "@angular/core";

// Presentational shell for a time-off / holiday details view: the umbrella header, optional
// holiday provenance, and the schedule/time info-card. Purely input-driven — it has no idea
// whether a time-off, an active holiday, or a removed holiday is being shown. Callers project
// the rest (notes, changes block, action buttons) through <ng-content>.
@Component({
  selector: "app-time-off-details-card",
  templateUrl: "./time-off-details-card.component.html",
  styleUrls: ["./time-off-details-card.component.scss"],
})
export class TimeOffDetailsCardComponent {
  @Input() label: string = "";
  @Input() struck: boolean = false;
  @Input() badge?: string;         // "edited" | "removed"
  @Input() countryCode?: string;   // when set, renders the public-holiday provenance line
  @Input() schedule: string = "";
  @Input() dateRange?: string;
  @Input() dayCount?: string;
  @Input() time: string = "";
  @Input() dataTest?: string;
}
