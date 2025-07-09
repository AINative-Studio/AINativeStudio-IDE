/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
import * as nls from '../../../nls.js';
/**
 * Returns the css variable name for the given color identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editorSuggestWidget.background` is `--vscode-editorSuggestWidget-background`.
 */
export function asCssVariableName(colorIdent) {
    return `--vscode-${colorIdent.replace(/\./g, '-')}`;
}
export function asCssVariable(color) {
    return `var(${asCssVariableName(color)})`;
}
export function asCssVariableWithDefault(color, defaultCssValue) {
    return `var(${asCssVariableName(color)}, ${defaultCssValue})`;
}
export var ColorTransformType;
(function (ColorTransformType) {
    ColorTransformType[ColorTransformType["Darken"] = 0] = "Darken";
    ColorTransformType[ColorTransformType["Lighten"] = 1] = "Lighten";
    ColorTransformType[ColorTransformType["Transparent"] = 2] = "Transparent";
    ColorTransformType[ColorTransformType["Opaque"] = 3] = "Opaque";
    ColorTransformType[ColorTransformType["OneOf"] = 4] = "OneOf";
    ColorTransformType[ColorTransformType["LessProminent"] = 5] = "LessProminent";
    ColorTransformType[ColorTransformType["IfDefinedThenElse"] = 6] = "IfDefinedThenElse";
})(ColorTransformType || (ColorTransformType = {}));
export function isColorDefaults(value) {
    return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}
// color registry
export const Extensions = {
    ColorContribution: 'base.contributions.colors'
};
export const DEFAULT_COLOR_CONFIG_VALUE = 'default';
class ColorRegistry {
    constructor() {
        this._onDidChangeSchema = new Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.colorSchema = { type: 'object', properties: {} };
        this.colorReferenceSchema = { type: 'string', enum: [], enumDescriptions: [] };
        this.colorsById = {};
    }
    notifyThemeUpdate(colorThemeData) {
        for (const key of Object.keys(this.colorsById)) {
            const color = colorThemeData.getColor(key);
            if (color) {
                this.colorSchema.properties[key].oneOf[0].defaultSnippets[0].body = `\${1:${Color.Format.CSS.formatHexA(color, true)}}`;
            }
        }
        this._onDidChangeSchema.fire();
    }
    registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
        const colorContribution = { id, description, defaults, needsTransparency, deprecationMessage };
        this.colorsById[id] = colorContribution;
        const propertySchema = { type: 'string', format: 'color-hex', defaultSnippets: [{ body: '${1:#ff0000}' }] };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (needsTransparency) {
            propertySchema.pattern = '^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$';
            propertySchema.patternErrorMessage = nls.localize('transparecyRequired', 'This color must be transparent or it will obscure content');
        }
        this.colorSchema.properties[id] = {
            description,
            oneOf: [
                propertySchema,
                { type: 'string', const: DEFAULT_COLOR_CONFIG_VALUE, description: nls.localize('useDefault', 'Use the default color.') }
            ]
        };
        this.colorReferenceSchema.enum.push(id);
        this.colorReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    deregisterColor(id) {
        delete this.colorsById[id];
        delete this.colorSchema.properties[id];
        const index = this.colorReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.colorReferenceSchema.enum.splice(index, 1);
            this.colorReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChangeSchema.fire();
    }
    getColors() {
        return Object.keys(this.colorsById).map(id => this.colorsById[id]);
    }
    resolveDefaultColor(id, theme) {
        const colorDesc = this.colorsById[id];
        if (colorDesc?.defaults) {
            const colorValue = isColorDefaults(colorDesc.defaults) ? colorDesc.defaults[theme.type] : colorDesc.defaults;
            return resolveColorValue(colorValue, theme);
        }
        return undefined;
    }
    getColorSchema() {
        return this.colorSchema;
    }
    getColorReferenceSchema() {
        return this.colorReferenceSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.colorsById).sort(sorter).map(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
    }
}
const colorRegistry = new ColorRegistry();
platform.Registry.add(Extensions.ColorContribution, colorRegistry);
export function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
    return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
export function getColorRegistry() {
    return colorRegistry;
}
// ----- color functions
export function executeTransform(transform, theme) {
    switch (transform.op) {
        case 0 /* ColorTransformType.Darken */:
            return resolveColorValue(transform.value, theme)?.darken(transform.factor);
        case 1 /* ColorTransformType.Lighten */:
            return resolveColorValue(transform.value, theme)?.lighten(transform.factor);
        case 2 /* ColorTransformType.Transparent */:
            return resolveColorValue(transform.value, theme)?.transparent(transform.factor);
        case 3 /* ColorTransformType.Opaque */: {
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return resolveColorValue(transform.value, theme);
            }
            return resolveColorValue(transform.value, theme)?.makeOpaque(backgroundColor);
        }
        case 4 /* ColorTransformType.OneOf */:
            for (const candidate of transform.values) {
                const color = resolveColorValue(candidate, theme);
                if (color) {
                    return color;
                }
            }
            return undefined;
        case 6 /* ColorTransformType.IfDefinedThenElse */:
            return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
        case 5 /* ColorTransformType.LessProminent */: {
            const from = resolveColorValue(transform.value, theme);
            if (!from) {
                return undefined;
            }
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return from.transparent(transform.factor * transform.transparency);
            }
            return from.isDarkerThan(backgroundColor)
                ? Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency)
                : Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
        }
        default:
            throw assertNever(transform);
    }
}
export function darken(colorValue, factor) {
    return { op: 0 /* ColorTransformType.Darken */, value: colorValue, factor };
}
export function lighten(colorValue, factor) {
    return { op: 1 /* ColorTransformType.Lighten */, value: colorValue, factor };
}
export function transparent(colorValue, factor) {
    return { op: 2 /* ColorTransformType.Transparent */, value: colorValue, factor };
}
export function opaque(colorValue, background) {
    return { op: 3 /* ColorTransformType.Opaque */, value: colorValue, background };
}
export function oneOf(...colorValues) {
    return { op: 4 /* ColorTransformType.OneOf */, values: colorValues };
}
export function ifDefinedThenElse(ifArg, thenArg, elseArg) {
    return { op: 6 /* ColorTransformType.IfDefinedThenElse */, if: ifArg, then: thenArg, else: elseArg };
}
export function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
    return { op: 5 /* ColorTransformType.LessProminent */, value: colorValue, background: backgroundColorValue, factor, transparency };
}
// ----- implementation
/**
 * @param colorValue Resolve a color value in the context of a theme
 */
export function resolveColorValue(colorValue, theme) {
    if (colorValue === null) {
        return undefined;
    }
    else if (typeof colorValue === 'string') {
        if (colorValue[0] === '#') {
            return Color.fromHex(colorValue);
        }
        return theme.getColor(colorValue);
    }
    else if (colorValue instanceof Color) {
        return colorValue;
    }
    else if (typeof colorValue === 'object') {
        return executeTransform(colorValue, theme);
    }
    return undefined;
}
export const workbenchColorsSchemaId = 'vscode://schemas/workbench-colors';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vY29sb3JVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQTZCLFVBQVUsSUFBSSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvSCxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFjdkM7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsVUFBMkI7SUFDNUQsT0FBTyxZQUFZLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDckQsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsS0FBc0I7SUFDbkQsT0FBTyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDM0MsQ0FBQztBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFzQixFQUFFLGVBQXVCO0lBQ3ZGLE9BQU8sT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxlQUFlLEdBQUcsQ0FBQztBQUMvRCxDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQVFqQjtBQVJELFdBQWtCLGtCQUFrQjtJQUNuQywrREFBTSxDQUFB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