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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vdGhlbWVFeHRlbnNpb25Qb2ludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUE4QyxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sNEJBQTRCLENBQUM7QUFFakYsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFnRixNQUFNLHVEQUF1RCxDQUFDO0FBRWpLLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUvRSxNQUFNLFVBQVUsZ0NBQWdDO0lBQy9DLE9BQU8sa0JBQWtCLENBQUMsc0JBQXNCLENBQXlCO1FBQ3hFLGNBQWMsRUFBRSxRQUFRO1FBQ3hCLFVBQVUsRUFBRTtZQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG9DQUFvQyxDQUFD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