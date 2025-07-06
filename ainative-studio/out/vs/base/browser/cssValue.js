import { FileAccess } from '../common/network.js';
function asFragment(raw) {
    return raw;
}
export function asCssValueWithDefault(cssPropertyValue, dflt) {
    if (cssPropertyValue !== undefined) {
        const variableMatch = cssPropertyValue.match(/^\s*var\((.+)\)$/);
        if (variableMatch) {
            const varArguments = variableMatch[1].split(',', 2);
            if (varArguments.length === 2) {
                dflt = asCssValueWithDefault(varArguments[1].trim(), dflt);
            }
            return `var(${varArguments[0]}, ${dflt})`;
        }
        return cssPropertyValue;
    }
    return dflt;
}
export function sizeValue(value) {
    const out = value.replaceAll(/[^\w.%+-]/gi, '');
    if (out !== value) {
        console.warn(`CSS size ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function hexColorValue(value) {
    const out = value.replaceAll(/[^[0-9a-fA-F#]]/gi, '');
    if (out !== value) {
        console.warn(`CSS hex color ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function identValue(value) {
    const out = value.replaceAll(/[^_\-a-z0-9]/gi, '');
    if (out !== value) {
        console.warn(`CSS ident value ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function stringValue(value) {
    return asFragment(`'${value.replaceAll(/'/g, '\\000027')}'`);
}
/**
 * returns url('...')
 */
export function asCSSUrl(uri) {
    if (!uri) {
        return asFragment(`url('')`);
    }
    return inline `url('${asFragment(CSS.escape(FileAccess.uriToBrowserUri(uri).toString(true)))}')`;
}
export function className(value, escapingExpected = false) {
    const out = CSS.escape(value);
    if (!escapingExpected && out !== value) {
        console.warn(`CSS class name ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
/**
 * Template string tag that that constructs a CSS fragment.
 *
 * All expressions in the template must be css safe values.
 */
export function inline(strings, ...values) {
    return asFragment(strings.reduce((result, str, i) => {
        const value = values[i] || '';
        return result + str + value;
    }, ''));
}
export class Builder {
    constructor() {
        this._parts = [];
    }
    push(...parts) {
        this._parts.push(...parts);
    }
    join(joiner = '\n') {
        return asFragment(this._parts.join(joiner));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzVmFsdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9jc3NWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFLbEQsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM5QixPQUFPLEdBQWtCLENBQUM7QUFDM0IsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxnQkFBb0MsRUFBRSxJQUFZO0lBQ3ZGLElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDcEMsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDakUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUQsQ0FBQztZQUNELE9BQU8sT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUM7UUFDM0MsQ0FBQztRQUNELE9BQU8sZ0JBQWdCLENBQUM7SUFDekIsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxTQUFTLENBQUMsS0FBYTtJQUN0QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJ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