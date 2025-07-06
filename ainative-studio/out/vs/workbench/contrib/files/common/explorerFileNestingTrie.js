/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A sort of double-ended trie, used to efficiently query for matches to "star" patterns, where
 * a given key represents a parent and may contain a capturing group ("*"), which can then be
 * referenced via the token "$(capture)" in associated child patterns.
 *
 * The generated tree will have at most two levels, as subtrees are flattened rather than nested.
 *
 * Example:
 * The config: [
 * [ *.ts , [ $(capture).*.ts ; $(capture).js ] ]
 * [ *.js , [ $(capture).min.js ] ] ]
 * Nests the files: [ a.ts ; a.d.ts ; a.js ; a.min.js ; b.ts ; b.min.js ]
 * As:
 * - a.ts => [ a.d.ts ; a.js ; a.min.js ]
 * - b.ts => [ ]
 * - b.min.ts => [ ]
 */
export class ExplorerFileNestingTrie {
    constructor(config) {
        this.root = new PreTrie();
        for (const [parentPattern, childPatterns] of config) {
            for (const childPattern of childPatterns) {
                this.root.add(parentPattern, childPattern);
            }
        }
    }
    toString() {
        return this.root.toString();
    }
    getAttributes(filename, dirname) {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot < 1) {
            return {
                dirname,
                basename: filename,
                extname: ''
            };
        }
        else {
            return {
                dirname,
                basename: filename.substring(0, lastDot),
                extname: filename.substring(lastDot + 1)
            };
        }
    }
    nest(files, dirname) {
        const parentFinder = new PreTrie();
        for (const potentialParent of files) {
            const attributes = this.getAttributes(potentialParent, dirname);
            const children = this.root.get(potentialParent, attributes);
            for (const child of children) {
                parentFinder.add(child, potentialParent);
            }
        }
        const findAllRootAncestors = (file, seen = new Set()) => {
            if (seen.has(file)) {
                return [];
            }
            seen.add(file);
            const attributes = this.getAttributes(file, dirname);
            const ancestors = parentFinder.get(file, attributes);
            if (ancestors.length === 0) {
                return [file];
            }
            if (ancestors.length === 1 && ancestors[0] === file) {
                return [file];
            }
            return ancestors.flatMap(a => findAllRootAncestors(a, seen));
        };
        const result = new Map();
        for (const file of files) {
            let ancestors = findAllRootAncestors(file);
            if (ancestors.length === 0) {
                ancestors = [file];
            }
            for (const ancestor of ancestors) {
                let existing = result.get(ancestor);
                if (!existing) {
                    result.set(ancestor, existing = new Set());
                }
                if (file !== ancestor) {
                    existing.add(file);
                }
            }
        }
        return result;
    }
}
/** Export for test only. */
export class PreTrie {
    constructor() {
        this.value = new SufTrie();
        this.map = new Map();
    }
    add(key, value) {
        if (key === '') {
            this.value.add(key, value);
        }
        else if (key[0] === '*') {
            this.value.add(key, value);
        }
        else {
            const head = key[0];
            const rest = key.slice(1);
            let existing = this.map.get(head);
            if (!existing) {
                this.map.set(head, existing = new PreTrie());
            }
            existing.add(rest, value);
        }
    }
    get(key, attributes) {
        const results = [];
        results.push(...this.value.get(key, attributes));
        const head = key[0];
        const rest = key.slice(1);
        const existing = this.map.get(head);
        if (existing) {
            results.push(...existing.get(rest, attributes));
        }
        return results;
    }
    toString(indentation = '') {
        const lines = [];
        if (this.value.hasItems) {
            lines.push('* => \n' + this.value.toString(indentation + '  '));
        }
        [...this.map.entries()].map(([key, trie]) => lines.push('^' + key + ' => \n' + trie.toString(indentation + '  ')));
        return lines.map(l => indentation + l).join('\n');
    }
}
/** Export for test only. */
export class SufTrie {
    constructor() {
        this.star = [];
        this.epsilon = [];
        this.map = new Map();
        this.hasItems = false;
    }
    add(key, value) {
        this.hasItems = true;
        if (key === '*') {
            this.star.push(new SubstitutionString(value));
        }
        else if (key === '') {
            this.epsilon.push(new SubstitutionString(value));
        }
        else {
            const tail = key[key.length - 1];
            const rest = key.slice(0, key.length - 1);
            if (tail === '*') {
                throw Error('Unexpected star in SufTrie key: ' + key);
            }
            else {
                let existing = this.map.get(tail);
                if (!existing) {
                    this.map.set(tail, existing = new SufTrie());
                }
                existing.add(rest, value);
            }
        }
    }
    get(key, attributes) {
        const results = [];
        if (key === '') {
            results.push(...this.epsilon.map(ss => ss.substitute(attributes)));
        }
        if (this.star.length) {
            results.push(...this.star.map(ss => ss.substitute(attributes, key)));
        }
        const tail = key[key.length - 1];
        const rest = key.slice(0, key.length - 1);
        const existing = this.map.get(tail);
        if (existing) {
            results.push(...existing.get(rest, attributes));
        }
        return results;
    }
    toString(indentation = '') {
        const lines = [];
        if (this.star.length) {
            lines.push('* => ' + this.star.join('; '));
        }
        if (this.epsilon.length) {
            // allow-any-unicode-next-line
            lines.push('ε => ' + this.epsilon.join('; '));
        }
        [...this.map.entries()].map(([key, trie]) => lines.push(key + '$' + ' => \n' + trie.toString(indentation + '  ')));
        return lines.map(l => indentation + l).join('\n');
    }
}
var SubstitutionType;
(function (SubstitutionType) {
    SubstitutionType["capture"] = "capture";
    SubstitutionType["basename"] = "basename";
    SubstitutionType["dirname"] = "dirname";
    SubstitutionType["extname"] = "extname";
})(SubstitutionType || (SubstitutionType = {}));
const substitutionStringTokenizer = /\$[({](capture|basename|dirname|extname)[)}]/g;
class SubstitutionString {
    constructor(pattern) {
        this.tokens = [];
        substitutionStringTokenizer.lastIndex = 0;
        let token;
        let lastIndex = 0;
        while (token = substitutionStringTokenizer.exec(pattern)) {
            const prefix = pattern.slice(lastIndex, token.index);
            this.tokens.push(prefix);
            const type = token[1];
            switch (type) {
                case "basename" /* SubstitutionType.basename */:
                case "dirname" /* SubstitutionType.dirname */:
                case "extname" /* SubstitutionType.extname */:
                case "capture" /* SubstitutionType.capture */:
                    this.tokens.push({ capture: type });
                    break;
                default: throw Error('unknown substitution type: ' + type);
            }
            lastIndex = token.index + token[0].length;
        }
        if (lastIndex !== pattern.length) {
            const suffix = pattern.slice(lastIndex, pattern.length);
            this.tokens.push(suffix);
        }
    }
    substitute(attributes, capture) {
        return this.tokens.map(t => {
            if (typeof t === 'string') {
                return t;
            }
            switch (t.capture) {
                case "basename" /* SubstitutionType.basename */: return attributes.basename;
                case "dirname" /* SubstitutionType.dirname */: return attributes.dirname;
                case "extname" /* SubstitutionType.extname */: return attributes.extname;
                case "capture" /* SubstitutionType.capture */: return capture || '';
            }
        }).join('');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9leHBsb3JlckZpbGVOZXN0aW5nVHJpZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRzs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsWUFBWSxNQUE0QjtRQUZoQyxTQUFJLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUc1QixLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDckQsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLGFBQWEsQ0FBQyxRQUFnQixFQUFFLE9BQWU7UUFDdEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNOLE9BQU87Z0JBQ1AsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLE9BQU8sRUFBRSxFQUFFO2FBQ1gsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTztnQkFDTixPQUFPO2dCQUNQLFFBQVEsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENB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