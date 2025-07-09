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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzVmFsdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2Nzc1ZhbHVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUtsRCxTQUFTLFVBQVUsQ0FBQyxHQUFXO0lBQzlCLE9BQU8sR0FBa0IsQ0FBQztBQUMzQixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLGdCQUFvQyxFQUFFLElBQVk7SUFDdkYsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNwQyxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNqRSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1RCxDQUFDO1lBQ0QsT0FBTyxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQztJQUN6QixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxLQUFhO0lBQ3RDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2hE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