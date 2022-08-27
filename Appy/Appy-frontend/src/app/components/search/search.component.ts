import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Search } from 'src/app/utils/search';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  private _source?: any[];
  @Input() set source(value: any[] | undefined) {
    if (this._source == value)
      return;

    this._source = value;
    this.applySearch();
  }
  get source(): any[] | undefined {
    return this._source;
  }

  @Output() onSearch: EventEmitter<SearchResult> = new EventEmitter();

  private _search: string = "";
  set search(value: string) {
    if (this._search == value)
      return;

    this._search = value;

    this.applySearch();
  }
  get search(): string {
    return this._search;
  }
  private searchManager: Search = new Search();

  constructor() { }

  ngOnInit(): void {
  }

  private applySearch() {
    let filteredSource = this.source == null ? [] : this.searchManager.search(this.source, this.search);

    this.onSearch.next({
      searchTerm: this.search,
      filteredSource: filteredSource
    });
  }

}

export type SearchResult = {
  searchTerm: string,
  filteredSource: any[]
}
