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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvY29tbW9uL2V4cGxvcmVyRmlsZU5lc3RpbmdUcmllLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxPQUFPLHVCQUF1QjtJQUduQyxZQUFZLE1BQTRCO1FBRmhDLFNBQUksR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBRzVCLEtBQUssTUFBTSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNyRCxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRU8sYUFBYSxDQUFDLFFBQWdCLEVBQUUsT0FBZTtRQUN0RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ04sT0FBTztnQkFDUCxRQUFRLEVBQUUsUUFBUTtnQkFDbEIsT0FBTyxFQUFFLEVBQUU7YUFDWCxDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPO2dCQUNOLE9BQU87Z0JBQ1AsUUFBUSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztn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