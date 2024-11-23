export class Search {
    private static readonly implicitlyIgnoredFields: string[] = ["validations"];

    private ignoreFields: string[];

    constructor(...ignoreFields: string[]) {
        this.ignoreFields = [...ignoreFields, ...Search.implicitlyIgnoredFields];
    }

    public search<T>(items: T[], term: string): T[] {
        term = term.trim().toLowerCase();
        let terms = term.split(" ").map(t => ascii(t)).filter(t => t != null && t != "");

        if (terms.length == 0)
            return items;

        let searchResults: SearchResult<T>[] = items.map(i => {
            return {
                score: this.getItemScore(i, terms),
                item: i
            };
        });

        searchResults = searchResults.filter(r => r.score > 0);
        searchResults.sort((a, b) => b.score - a.score);

        let results = searchResults.map(s => s.item);
        return results;
    }

    private getItemScore(item: any, terms: string[]): number {
        let score = 0;

        for (let field in item) {
            if (this.ignoreFields.includes(field))
                continue;

            let value = item[field];

            if (Array.isArray(value)) {
                for (let v of value) {
                    score += this.getItemScore(v, terms);
                }
            }
            else if (typeof value == "string") {
                score += this.getValueScore(value, terms);
            }
        }

        return score;
    }

    private getValueScore(value: string, terms: string[]): number {
        let asciiValue = ascii(value);

        for (let term of terms) {
            if (asciiValue == term)
                return 3;
            if (asciiValue.startsWith(term))
                return 2;
            else if (asciiValue.includes(term))
                return 1;
        }

        return 0;
    }
}

function ascii(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type SearchResult<T> = {
    score: number;
    item: T;
}