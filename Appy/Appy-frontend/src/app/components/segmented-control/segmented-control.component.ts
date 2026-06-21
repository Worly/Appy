import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface SegmentedOption {
  // The value bound to this segment (string, enum, etc.).
  value: any;
  // Translation key shown as the segment's text (run through TranslatePipe; a literal also works).
  label: string;
  // Optional data-test hook placed on the segment button.
  dataTest?: string;
}

// A single-select button group ("segmented control" / radio-style toggle): a pill container with one
// segment per option, exactly one active. Each segment is an app-button (transparent when inactive,
// solid-primary when active). Two-way bindable via [(value)].
@Component({
  selector: "app-segmented-control",
  templateUrl: "./segmented-control.component.html",
  styleUrls: ["./segmented-control.component.scss"],
})
export class SegmentedControlComponent {
  @Input() options: SegmentedOption[] = [];
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();

  // "default" — segments share the full width equally (tabs / form segments); "compact" — content-sized
  // segments in a fit-content pill (e.g. an Upcoming | Past scope toggle).
  @Input() size: "default" | "compact" = "default";

  // Optional data-test hook placed on the container.
  @Input() dataTest?: string;

  select(option: SegmentedOption): void {
    if (option.value === this.value) return;
    this.value = option.value;
    this.valueChange.emit(option.value);
  }
}
