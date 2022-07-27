import { Observable, Subscriber } from "rxjs";

export function onUnsubscribed<T>(subscriber: Subscriber<T>): Observable<void> {
    return new Observable<void>(s => {
        let originalUnSub = subscriber.unsubscribe.bind(subscriber);
        subscriber.unsubscribe = () => {
            originalUnSub();
            s.next();
        };
    });
}