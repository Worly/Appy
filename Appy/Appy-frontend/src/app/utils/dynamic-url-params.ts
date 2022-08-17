import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

function URLParamsToObject(activatedRoute: ActivatedRoute): any {
    let result: any = {};
    for (let key of activatedRoute.snapshot.queryParamMap.keys)
        result[key] = activatedRoute.snapshot.queryParamMap.get(key);
    return result;
}

export function setUrlParams(router: Router, activatedRoute: ActivatedRoute, location: Location, params: any) {
    let url = router.createUrlTree([], {
        relativeTo: activatedRoute,
        queryParams: {
            ...URLParamsToObject(activatedRoute),
            ...params
        }
    }).toString();
    location.replaceState(url);
}