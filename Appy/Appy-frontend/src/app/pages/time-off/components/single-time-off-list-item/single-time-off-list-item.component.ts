import { Component, EventEmitter, Input, Output } from "@angular/core";
import { TimeOffRowView } from "../../time-off-display";

// Presentational list row. It renders a flattened TimeOffRowView and has no idea whether it came
// from a time-off rule or a holiday — callers build the view (timeOffRowView / holidayRowView).
@Component({
  selector: "app-single-time-off-list-item",
  templateUrl: "./single-time-off-list-item.component.html",
  styleUrls: ["./single-time-off-list-item.component.scss"],
})
export class SingleTimeOffListItemComponent {
  @Input() view!: TimeOffRowView;
  @Output() onOpenView: EventEmitter<void> = new EventEmitter();
}
