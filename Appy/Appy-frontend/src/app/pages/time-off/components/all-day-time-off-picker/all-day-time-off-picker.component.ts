import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Dayjs } from "dayjs";
import { TimeOffOccurrence } from "src/app/models/time-off-occurrence";

// Presentational pick-list shown inside a dialog when a day has several all-day time-offs (the list
// view's badge or the scroller's collapsed band). Pure UI: it renders the day's occurrences and emits
// the one the user picks; the host owns the dialog and opens the details view in response.
@Component({
  selector: "app-all-day-time-off-picker",
  templateUrl: "./all-day-time-off-picker.component.html",
  styleUrls: ["./all-day-time-off-picker.component.scss"],
})
export class AllDayTimeOffPickerComponent {
  // The all-day occurrences for a single day.
  @Input() occurrences: TimeOffOccurrence[] = [];
  // The day they fall on, shown as the title's subtitle.
  @Input() date?: Dayjs;
  // Prefixes the data-test hooks so each host keeps its own selectors ("list" / "scroller").
  @Input() testPrefix: string = "";

  // The picked occurrence's id.
  @Output() pick = new EventEmitter<number | undefined>();
}
