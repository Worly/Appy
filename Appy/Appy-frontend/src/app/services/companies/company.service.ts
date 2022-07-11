import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { forkJoin, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { appConfig } from "../../app.config";
import { Company } from "../../dtos/company";

@Injectable({ providedIn: "root" })
export class CompanyService {

    public myCompanies: Company[] = [];
    private selectedCompanyId: number | null = null;

    constructor(private http: HttpClient) { }

    public loadMy(): Observable<Company[]> {
        var getMy = this.http.get<Company[]>(appConfig.apiUrl + "company/getMy");
        var getSelected = this.http.get<number>(appConfig.apiUrl + "company/getSelectedCompany");

        return forkJoin([getMy, getSelected])
            .pipe(map(([companies, selectedId]) => {
                this.myCompanies = companies;
                this.selectedCompanyId = selectedId;
                return companies;
            }));
    }

    public getSelected(): Company | null | undefined {
        if (this.selectedCompanyId == null || this.myCompanies == null)
            return null;

        return this.myCompanies.find(o => o.id == this.selectedCompanyId);
    }

    public selectCompany(company: Company): Observable<void> {
        return this.http.put<void>(appConfig.apiUrl + "company/selectCompany", company.id)
            .pipe(tap(() => this.selectedCompanyId = company.id));
    }

    public deleteCompany(company: Company): Observable<void> {
        return this.http.delete<void>(appConfig.apiUrl + "company/delete/" + company.id)
            .pipe(tap(() => {
                var index = this.myCompanies.indexOf(company);
                if (index > -1)
                    this.myCompanies.splice(index, 1);

                if (this.selectedCompanyId == company.id)
                    this.selectedCompanyId = null;
            }));
    }

    public addNew(name: string): Observable<Company> {
        return this.http.post<Company>(appConfig.apiUrl + "company/addNew", {
            name: name
        }).pipe(tap(w => {
            this.myCompanies.push(w);
        }));
    }

    public edit(companyId: number, newName: string): Observable<Company> {
        return this.http.put<Company>(appConfig.apiUrl + "company/edit/" + companyId, {
            name: newName
        }).pipe(tap(w => {
            var oldCompany = this.myCompanies.find(o => o.id == w.id);
            if (oldCompany)
                oldCompany.name = w.name;
        }));
    }

    public clear() {
        this.myCompanies = [];
    }
}