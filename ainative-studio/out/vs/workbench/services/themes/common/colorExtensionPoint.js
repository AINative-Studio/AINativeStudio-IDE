/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as ColorRegistryExtensions } from '../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../base/common/color.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const colorRegistry = Registry.as(ColorRegistryExtensions.ColorContribution);
const colorReferenceSchema = colorRegistry.getColorReferenceSchema();
const colorIdPattern = '^\\w+[.\\w+]*$';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'colors',
    jsonSchema: {
        description: nls.localize('contributes.color', 'Contributes extension defined themable colors'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.color.id', 'The identifier of the themable color'),
                    pattern: colorIdPattern,
                    patternErrorMessage: nls.localize('contributes.color.id.format', 'Identifiers must only contain letters, digits and dots and can not start with a dot'),
                },
                description: {
                    type: 'string',
                    description: nls.localize('contributes.color.description', 'The description of the themable color'),
                },
                defaults: {
                    type: 'object',
                    properties: {
                        light: {
                            description: nls.localize('contributes.defaults.light', 'The default color for light themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default.'),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        dark: {
                            description: nls.localize('contributes.defaults.dark', 'The default color for dark themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default.'),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        highContrast: {
                            description: nls.localize('contributes.defaults.highContrast', 'The default color for high contrast dark themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default. If not provided, the `dark` color is used as default for high contrast dark themes.'),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        highContrastLight: {
                            description: nls.localize('contributes.defaults.highContrastLight', 'The default color for high contrast light themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default. If not provided, the `light` color is used as default for high contrast light themes.'),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        }
                    },
                    required: ['light', 'dark']
                }
            }
        }
    }
});
export class ColorExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.colorConfiguration', "'configuration.colors' must be a array"));
                    return;
                }
                const parseColorValue = (s, name) => {
                    if (s.length > 0) {
                        if (s[0] === '#') {
                            return Color.Format.CSS.parseHex(s);
                        }
                        else {
                            return s;
                        }
                    }
                    collector.error(nls.localize('invalid.default.colorType', "{0} must be either a color value in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of a themable color which provides the default.", name));
                    return Color.red;
                };
                for (const colorContribution of extensionValue) {
                    if (typeof colorContribution.id !== 'string' || colorContribution.id.length === 0) {
                        collector.error(nls.localize('invalid.id', "'configuration.colors.id' must be defined and can not be empty"));
                        return;
                    }
                    if (!colorContribution.id.match(colorIdPattern)) {
                        collector.error(nls.localize('invalid.id.format', "'configuration.colors.id' must only contain letters, digits and dots and can not start with a dot"));
                        return;
                    }
                    if (typeof colorContribution.description !== 'string' || colorContribution.id.length === 0) {
                        collector.error(nls.localize('invalid.description', "'configuration.colors.description' must be defined and can not be empty"));
                        return;
                    }
                    const defaults = colorContribution.defaults;
                    if (!defaults || typeof defaults !== 'object' || typeof defaults.light !== 'string' || typeof defaults.dark !== 'string') {
                        collector.error(nls.localize('invalid.defaults', "'configuration.colors.defaults' must be defined and must contain 'light' and 'dark'"));
                        return;
                    }
                    if (defaults.highContrast && typeof defaults.highContrast !== 'string') {
                        collector.error(nls.localize('invalid.defaults.highContrast', "If defined, 'configuration.colors.defaults.highContrast' must be a string."));
                        return;
                    }
                    if (defaults.highContrastLight && typeof defaults.highContrastLight !== 'string') {
                        collector.error(nls.localize('invalid.defaults.highContrastLight', "If defined, 'configuration.colors.defaults.highContrastLight' must be a string."));
                        return;
                    }
                    colorRegistry.registerColor(colorContribution.id, {
                        light: parseColorValue(defaults.light, 'configuration.colors.defaults.light'),
                        dark: parseColorValue(defaults.dark, 'configuration.colors.defaults.dark'),
                        hcDark: parseColorValue(defaults.highContrast ?? defaults.dark, 'configuration.colors.defaults.highContrast'),
                        hcLight: parseColorValue(defaults.highContrastLight ?? defaults.light, 'configuration.colors.defaults.highContrastLight'),
                    }, colorContribution.description);
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const colorContribution of extensionValue) {
                    colorRegistry.deregisterColor(colorContribution.id);
                }
            }
        });
    }
}
class ColorDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.colors;
    }
    render(manifest) {
        const colors = manifest.contributes?.colors || [];
        if (!colors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('id', "ID"),
            nls.localize('description', "Description"),
            nls.localize('defaultDark', "Dark Default"),
            nls.localize('defaultLight', "Light Default"),
            nls.localize('defaultHC', "High Contrast Default"),
        ];
        const toColor = (colorReference) => colorReference[0] === '#' ? Color.fromHex(colorReference) : undefined;
        const rows = colors.sort((a, b) => a.id.localeCompare(b.id))
            .map(color => {
            return [
                new MarkdownString().appendMarkdown(`\`${color.id}\``),
                color.description,
                toColor(color.defaults.dark) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.dark}\``),
                toColor(color.defaults.light) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.light}\``),
                toColor(color.defaults.highContrast) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.highContrast}\``),
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'colors',
    label: nls.localize('colors', "Colors"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ColorDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9jb2xvckV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbkYsT0FBTyxFQUFrQixVQUFVLElBQUksdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFtRyxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BMLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUUxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFReEUsTUFBTSxhQUFhLEdBQW1CLFFBQVEsQ0FBQyxFQUFFLENBQWlCLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFFN0csTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztBQUNyRSxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQztBQUV4QyxNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUF5QjtJQUMvRixjQUFjLEVBQUUsUUFBUTtJQUN4QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFB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