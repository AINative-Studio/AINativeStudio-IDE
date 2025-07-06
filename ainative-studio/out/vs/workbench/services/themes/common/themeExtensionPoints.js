/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { ExtensionData } from './workbenchThemeService.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
export function registerColorThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'themes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.themes', 'Contributes textmate color themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [{ body: { label: '${1:label}', id: '${2:id}', uiTheme: ThemeTypeSelector.VS_DARK, path: './themes/${3:id}.tmTheme.' } }],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.themes.id', 'Id of the color theme as used in the user settings.'),
                        type: 'string'
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.themes.label', 'Label of the color theme as shown in the UI.'),
                        type: 'string'
                    },
                    uiTheme: {
                        description: nls.localize('vscode.extension.contributes.themes.uiTheme', 'Base theme defining the colors around the editor: \'vs\' is the light color theme, \'vs-dark\' is the dark color theme. \'hc-black\' is the dark high contrast theme, \'hc-light\' is the light high contrast theme.'),
                        enum: [ThemeTypeSelector.VS, ThemeTypeSelector.VS_DARK, ThemeTypeSelector.HC_BLACK, ThemeTypeSelector.HC_LIGHT]
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.themes.path', 'Path of the tmTheme file. The path is relative to the extension folder and is typically \'./colorthemes/awesome-color-theme.json\'.'),
                        type: 'string'
                    }
                },
                required: ['path', 'uiTheme']
            }
        }
    });
}
export function registerFileIconThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'iconThemes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.iconThemes', 'Contributes file icon themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [{ body: { id: '${1:id}', label: '${2:label}', path: './fileicons/${3:id}-icon-theme.json' } }],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.id', 'Id of the file icon theme as used in the user settings.'),
                        type: 'string'
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.label', 'Label of the file icon theme as shown in the UI.'),
                        type: 'string'
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.path', 'Path of the file icon theme definition file. The path is relative to the extension folder and is typically \'./fileicons/awesome-icon-theme.json\'.'),
                        type: 'string'
                    }
                },
                required: ['path', 'id']
            }
        }
    });
}
export function registerProductIconThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'productIconThemes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.productIconThemes', 'Contributes product icon themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [{ body: { id: '${1:id}', label: '${2:label}', path: './producticons/${3:id}-product-icon-theme.json' } }],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.id', 'Id of the product icon theme as used in the user settings.'),
                        type: 'string'
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.label', 'Label of the product icon theme as shown in the UI.'),
                        type: 'string'
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.path', 'Path of the product icon theme definition file. The path is relative to the extension folder and is typically \'./producticons/awesome-product-icon-theme.json\'.'),
                        type: 'string'
                    }
                },
                required: ['path', 'id']
            }
        }
    });
}
class ThemeDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.themes || !!manifest.contributes?.iconThemes || !!manifest.contributes?.productIconThemes;
    }
    render(manifest) {
        const markdown = new MarkdownString();
        if (manifest.contributes?.themes) {
            markdown.appendMarkdown(`### ${nls.localize('color themes', "Color Themes")}\n\n`);
            for (const theme of manifest.contributes.themes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        if (manifest.contributes?.iconThemes) {
            markdown.appendMarkdown(`### ${nls.localize('file icon themes', "File Icon Themes")}\n\n`);
            for (const theme of manifest.contributes.iconThemes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        if (manifest.contributes?.productIconThemes) {
            markdown.appendMarkdown(`### ${nls.localize('product icon themes', "Product Icon Themes")}\n\n`);
            for (const theme of manifest.contributes.productIconThemes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        return {
            data: markdown,
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'themes',
    label: nls.localize('themes', "Themes"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ThemeDataRenderer),
});
export class ThemeRegistry {
    constructor(themesExtPoint, create, idRequired = false, builtInTheme = undefined) {
        this.themesExtPoint = themesExtPoint;
        this.create = create;
        this.idRequired = idRequired;
        this.builtInTheme = builtInTheme;
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.extensionThemes = [];
        this.initialize();
    }
    dispose() {
        this.themesExtPoint.setHandler(() => { });
    }
    initialize() {
        this.themesExtPoint.setHandler((extensions, delta) => {
            const previousIds = {};
            const added = [];
            for (const theme of this.extensionThemes) {
                previousIds[theme.id] = theme;
            }
            this.extensionThemes.length = 0;
            for (const ext of extensions) {
                const extensionData = ExtensionData.fromName(ext.description.publisher, ext.description.name, ext.description.isBuiltin);
                this.onThemes(extensionData, ext.description.extensionLocation, ext.value, this.extensionThemes, ext.collector);
            }
            for (const theme of this.extensionThemes) {
                if (!previousIds[theme.id]) {
                    added.push(theme);
                }
                else {
                    delete previousIds[theme.id];
                }
            }
            const removed = Object.values(previousIds);
            this.onDidChangeEmitter.fire({ themes: this.extensionThemes, added, removed });
        });
    }
    onThemes(extensionData, extensionLocation, themeContributions, resultingThemes = [], log) {
        if (!Array.isArray(themeContributions)) {
            log?.error(nls.localize('reqarray', "Extension point `{0}` must be an array.", this.themesExtPoint.name));
            return resultingThemes;
        }
        themeContributions.forEach(theme => {
            if (!theme.path || !types.isString(theme.path)) {
                log?.error(nls.localize('reqpath', "Expected string in `contributes.{0}.path`. Provided value: {1}", this.themesExtPoint.name, String(theme.path)));
                return;
            }
            if (this.idRequired && (!theme.id || !types.isString(theme.id))) {
                log?.error(nls.localize('reqid', "Expected string in `contributes.{0}.id`. Provided value: {1}", this.themesExtPoint.name, String(theme.id)));
                return;
            }
            const themeLocation = resources.joinPath(extensionLocation, theme.path);
            if (!resources.isEqualOrParent(themeLocation, extensionLocation)) {
                log?.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", this.themesExtPoint.name, themeLocation.path, extensionLocation.path));
            }
            const themeData = this.create(theme, themeLocation, extensionData);
            resultingThemes.push(themeData);
        });
        return resultingThemes;
    }
    findThemeById(themeId) {
        if (this.builtInTheme && this.builtInTheme.id === themeId) {
            return this.builtInTheme;
        }
        const allThemes = this.getThemes();
        for (const t of allThemes) {
            if (t.id === themeId) {
                return t;
            }
        }
        return undefined;
    }
    findThemeBySettingsId(settingsId, defaultSettingsId) {
        if (this.builtInTheme && this.builtInTheme.settingsId === settingsId) {
            return this.builtInTheme;
        }
        const allThemes = this.getThemes();
        let defaultTheme = undefined;
        for (const t of allThemes) {
            if (t.settingsId === settingsId) {
                return t;
            }
            if (t.settingsId === defaultSettingsId) {
                defaultTheme = t;
            }
        }
        return defaultTheme;
    }
    findThemeByExtensionLocation(extLocation) {
        if (extLocation) {
            return this.getThemes().filter(t => t.location && resources.isEqualOrParent(t.location, extLocation));
        }
        return [];
    }
    getThemes() {
        return this.extensionThemes;
    }
    getMarketplaceThemes(manifest, extensionLocation, extensionData) {
        const themes = manifest?.contributes?.[this.themesExtPoint.name];
        if (Array.isArray(themes)) {
            return this.onThemes(extensionData, extensionLocation, themes);
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90aGVtZUV4dGVuc2lvblBvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQThDLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0gsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSw0QkFBNEIsQ0FBQztBQUVqRixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQWdGLE1BQU0sdURBQXVELENBQUM7QUFFakssT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRS9FLE1BQU0sVUFBVSxnQ0FBZ0M7SUFDL0MsT0FBTyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBeUI7UUFDeEUsY0FBYyxFQUFFLFFBQVE7UUFDeEIsVUFBVSxFQUFFO1lBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsb0NBQW9DLENBQUM7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