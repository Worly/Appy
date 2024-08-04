export class Search {
    private ignoreFields: string[];

    constructor(...ignoreFields: string[]) {
        this.ignoreFields = ignoreFields;
    }

    public search<T>(items: T[], term: string): T[] {
        term = term.trim().toLowerCase();
        let terms = term.split(" ").map(t => ascii(t)).filter(t => t != null && t != "");

        if (terms.length == 0)
            return items;

        let searchResults: SearchResult<T>[] = items.map(i => {
            let score = 0;

            for (let field in i) {
                if (this.ignoreFields.includes(field))
                    continue;

                let value = i[field];

                if (typeof value == "string") {
                    let asciiValue = ascii(value);

                    for (let term of terms) {
                        if (asciiValue == term)
                            score += 3;
                        if (asciiValue.startsWith(term))
                            score += 2;
                        else if (asciiValue.includes(term))
                            score += 1;
                    }
                }
            }

            return {
                score: score,
                item: i
            };
        });

        searchResults = searchResults.filter(r => r.score > 0);
        searchResults.sort((a, b) => b.score - a.score);

        let results = searchResults.map(s => s.item);
        return results;
    }
}

function ascii(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type SearchResult<T> = {
    score: number;
    item: T;
}