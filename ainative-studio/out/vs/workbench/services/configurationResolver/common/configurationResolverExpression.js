/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../base/common/iterator.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
export class ConfigurationResolverExpression {
    static { this.VARIABLE_LHS = '${'; }
    constructor(object) {
        this.locations = new Map();
        // If the input is a string, wrap it in an object so we can use the same logic
        if (typeof object === 'string') {
            this.stringRoot = true;
            this.root = { value: object };
        }
        else {
            this.stringRoot = false;
            this.root = structuredClone(object);
        }
    }
    /**
     * Creates a new {@link ConfigurationResolverExpression} from an object.
     * Note that platform-specific keys (i.e. `windows`, `osx`, `linux`) are
     * applied during parsing.
     */
    static parse(object) {
        if (object instanceof ConfigurationResolverExpression) {
            return object;
        }
        const expr = new ConfigurationResolverExpression(object);
        expr.applyPlatformSpecificKeys();
        expr.parseObject(expr.root);
        return expr;
    }
    applyPlatformSpecificKeys() {
        const config = this.root; // already cloned by ctor, safe to change
        const key = isWindows ? 'windows' : isMacintosh ? 'osx' : isLinux ? 'linux' : undefined;
        if (key === undefined || !config || typeof config !== 'object' || !config.hasOwnProperty(key)) {
            return;
        }
        Object.keys(config[key]).forEach(k => config[k] = config[key][k]);
        delete config.windows;
        delete config.osx;
        delete config.linux;
    }
    parseVariable(str, start) {
        if (str[start] !== '$' || str[start + 1] !== '{') {
            return undefined;
        }
        let end = start + 2;
        let braceCount = 1;
        while (end < str.length) {
            if (str[end] === '{') {
                braceCount++;
            }
            else if (str[end] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    break;
                }
            }
            end++;
        }
        if (braceCount !== 0) {
            return undefined;
        }
        const id = str.slice(start, end + 1);
        const inner = str.substring(start + 2, end);
        const colonIdx = inner.indexOf(':');
        if (colonIdx === -1) {
            return { replacement: { id, name: inner, inner }, end };
        }
        return {
            replacement: {
                id,
                inner,
                name: inner.slice(0, colonIdx),
                arg: inner.slice(colonIdx + 1)
            },
            end
        };
    }
    parseObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const value = obj[i];
                if (typeof value === 'string') {
                    this.parseString(obj, i, value);
                }
                else {
                    this.parseObject(value);
                }
            }
            return;
        }
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                this.parseString(obj, key, value);
            }
            else {
                this.parseObject(value);
            }
        }
    }
    parseString(object, propertyName, value) {
        let pos = 0;
        while (pos < value.length) {
            const match = value.indexOf('${', pos);
            if (match === -1) {
                break;
            }
            const parsed = this.parseVariable(value, match);
            if (parsed) {
                const locations = this.locations.get(parsed.replacement.id) || { locations: [], replacement: parsed.replacement };
                locations.locations.push({ object, propertyName });
                this.locations.set(parsed.replacement.id, locations);
                pos = parsed.end + 1;
            }
            else {
                pos = match + 2;
            }
        }
    }
    unresolved() {
        return Iterable.map(Iterable.filter(this.locations.values(), l => l.resolved === undefined), l => l.replacement);
    }
    resolved() {
        return Iterable.map(Iterable.filter(this.locations.values(), l => !!l.resolved), l => [l.replacement, l.resolved]);
    }
    resolve(replacement, data) {
        if (typeof data !== 'object') {
            data = { value: String(data) };
        }
        const location = this.locations.get(replacement.id);
        if (!location) {
            return;
        }
        if (data.value !== undefined) {
            for (const { object, propertyName } of location.locations || []) {
                const newValue = object[propertyName].replaceAll(replacement.id, data.value);
                object[propertyName] = newValue;
            }
        }
        location.resolved = data;
    }
    toObject() {
        // If we wrapped a string, unwrap it
        if (this.stringRoot) {
            return this.root.value;
        }
        return this.root;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyRXhwcmVzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi9jb25maWd1cmF0aW9uUmVzb2x2ZXJFeHByZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQXlEdEYsTUFBTSxPQUFPLCtCQUErQjthQUNwQixpQkFBWSxHQUFHLElBQUksQUFBUCxDQUFRO0lBTTNDLFlBQW9CLE1BQVM7UUFKckIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBSzNELDhFQUE4RTtRQUM5RSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFTLENBQUM7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFJLE1BQVM7UUFDL0IsSUFBSSxNQUFNLFlBQVksK0JBQStCLEVBQUUsQ0FBQztZQUN2RCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLCtCQUErQixDQUFJLE1BQU0sQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBVyxDQUFDLENBQUMseUNBQXlDO1FBQzFFLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4RixJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9GLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEUsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ3RCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNsQixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUMvQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNsRCxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNwQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUN0QixVQUFVLEVBQUUsQ0FBQztZQUNkLENBQUM7aUJBQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQzdCLFVBQVUsRUFBRSxDQUFDO2dCQUNiLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN0QixNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBQ0QsR0FBRyxFQUFFLENBQUM7UUFDUCxDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUN6RCxDQUFDO1FBRUQsT0FBTztZQUNOLFdBQVcsRUFBRTtnQkFDWixFQUFFO2dCQUNGLEtBQUs7Z0JBQ0wsSUFBSSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQztnQkFDOUIsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzthQUM5QjtZQUNELEdBQUc7U0FDSCxDQUFDO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFRO1FBQzNCLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckIsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekIsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPO1FBQ1IsQ0FBQztRQUVELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEQsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxNQUFXLEVBQUUsWUFBNkIsRUFBRSxLQUFhO1FBQzVFLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLE9BQU8sR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN2QyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixNQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEgsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3JELEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsSCxDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3JILENBQUM7SUFFTSxPQUFPLENBQUMsV0FBd0IsRUFBRSxJQUE2QjtRQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNoQyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzlCLEtBQUssTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxRQUFRLENBQUMsU0FBUyxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNqRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM3RSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsUUFBUSxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO1FBRUQsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDMUIsQ0FBQztJQUVNLFFBQVE7UUFDZCxvQ0FBb0M7UUFDcEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBUSxJQUFJLENBQUMsSUFBWSxDQUFDLEtBQVUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUMifQ==