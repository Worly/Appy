import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { forkJoin, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { RouteReuseStrategy } from "@angular/router";
import { appConfig } from "src/app/app.config";
import { Facility } from "src/app/models/facility";
import { CacheCoordinator } from "src/app/shared/services/data/cache-coordinator";
import { CustomReuseStrategy } from "src/app/services/route-reuse-strategy";

@Injectable({ providedIn: "root" })
export class FacilityService {

    public myFacilities: Facility[] = [];
    private selectedFacilityId: number | null = null;

    constructor(
        private http: HttpClient,
        private cache: CacheCoordinator,
        private reuseStrategy: RouteReuseStrategy,
    ) { }

    public loadMy(): Observable<Facility[]> {
        var getMy = this.http.get<Facility[]>(appConfig.apiUrl + "facility/getMy");
        var getSelected = this.http.get<number>(appConfig.apiUrl + "facility/getSelectedFacility");

        return forkJoin([getMy, getSelected])
            .pipe(map(([facilities, selectedId]) => {
                this.myFacilities = facilities;
                this.selectedFacilityId = selectedId;
                return facilities;
            }));
    }

    public getSelected(): Facility | null | undefined {
        if (this.selectedFacilityId == null || this.myFacilities == null)
            return null;

        return this.myFacilities.find(o => o.id == this.selectedFacilityId);
    }

    public selectFacility(facility: Facility): Observable<void> {
        return this.http.put<void>(appConfig.apiUrl + "facility/selectFacility", facility.id)
            .pipe(tap(() => {
                this.selectedFacilityId = facility.id;
                // New tenant → forget the previous one entirely (no page reload happens here).
                this.cache.clear();
                (this.reuseStrategy as CustomReuseStrategy).clear();
            }));
    }

    public deleteFacility(facility: Facility): Observable<void> {
        return this.http.delete<void>(appConfig.apiUrl + "facility/delete/" + facility.id)
            .pipe(tap(() => {
                var index = this.myFacilities.indexOf(facility);
                if (index > -1)
                    this.myFacilities.splice(index, 1);

                if (this.selectedFacilityId == facility.id)
                    this.selectedFacilityId = null;
            }));
    }

    public addNew(name: string): Observable<Facility> {
        return this.http.post<Facility>(appConfig.apiUrl + "facility/addNew", {
            name: name
        }).pipe(tap(w => {
            this.myFacilities.push(w);
        }));
    }

    public edit(facilityId: number, newName: string): Observable<Facility> {
        return this.http.put<Facility>(appConfig.apiUrl + "facility/edit/" + facilityId, {
            name: newName
        }).pipe(tap(w => {
            var oldFacility = this.myFacilities.find(o => o.id == w.id);
            if (oldFacility)
                oldFacility.name = w.name;
        }));
    }

    public clear() {
        this.myFacilities = [];
    }
}