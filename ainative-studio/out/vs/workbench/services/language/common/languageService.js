/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize } from '../../../../nls.js';
import { clearConfiguredLanguageAssociations, registerConfiguredLanguageAssociation } from '../../../../editor/common/services/languagesAssociations.js';
import { joinPath } from '../../../../base/common/resources.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { FILES_ASSOCIATIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { index } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { isString } from '../../../../base/common/types.js';
export const languagesExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languages',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languages', 'Contributes language declarations.'),
        type: 'array',
        items: {
            type: 'object',
            defaultSnippets: [{ body: { id: '${1:languageId}', aliases: ['${2:label}'], extensions: ['${3:extension}'], configuration: './language-configuration.json' } }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.languages.id', 'ID of the language.'),
                    type: 'string'
                },
                aliases: {
                    description: localize('vscode.extension.contributes.languages.aliases', 'Name aliases for the language.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                extensions: {
                    description: localize('vscode.extension.contributes.languages.extensions', 'File extensions associated to the language.'),
                    default: ['.foo'],
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                filenames: {
                    description: localize('vscode.extension.contributes.languages.filenames', 'File names associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                filenamePatterns: {
                    description: localize('vscode.extension.contributes.languages.filenamePatterns', 'File name glob patterns associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                mimetypes: {
                    description: localize('vscode.extension.contributes.languages.mimetypes', 'Mime types associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                firstLine: {
                    description: localize('vscode.extension.contributes.languages.firstLine', 'A regular expression matching the first line of a file of the language.'),
                    type: 'string'
                },
                configuration: {
                    description: localize('vscode.extension.contributes.languages.configuration', 'A relative path to a file containing configuration options for the language.'),
                    type: 'string',
                    default: './language-configuration.json'
                },
                icon: {
                    type: 'object',
                    description: localize('vscode.extension.contributes.languages.icon', 'A icon to use as file icon, if no icon theme provides one for the language.'),
                    properties: {
                        light: {
                            description: localize('vscode.extension.contributes.languages.icon.light', 'Icon path when a light theme is used'),
                            type: 'string'
                        },
                        dark: {
                            description: localize('vscode.extension.contributes.languages.icon.dark', 'Icon path when a dark theme is used'),
                            type: 'string'
                        }
                    }
                }
            }
        }
    },
    activationEventsGenerator: (languageContributions, result) => {
        for (const languageContribution of languageContributions) {
            if (languageContribution.id && languageContribution.configuration) {
                result.push(`onLanguage:${languageContribution.id}`);
            }
        }
    }
});
class LanguageTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languages;
    }
    render(manifest) {
        const contributes = manifest.contributes;
        const rawLanguages = contributes?.languages || [];
        const languages = [];
        for (const l of rawLanguages) {
            if (isValidLanguageExtensionPoint(l)) {
                languages.push({
                    id: l.id,
                    name: (l.aliases || [])[0] || l.id,
                    extensions: l.extensions || [],
                    hasGrammar: false,
                    hasSnippets: false
                });
            }
        }
        const byId = index(languages, l => l.id);
        const grammars = contributes?.grammars || [];
        grammars.forEach(grammar => {
            if (!isString(grammar.language)) {
                // ignore the grammars that are only used as includes in other grammars
                return;
            }
            let language = byId[grammar.language];
            if (language) {
                language.hasGrammar = true;
            }
            else {
                language = { id: grammar.language, name: grammar.language, extensions: [], hasGrammar: true, hasSnippets: false };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        const snippets = contributes?.snippets || [];
        snippets.forEach(snippet => {
            if (!isString(snippet.language)) {
                // ignore invalid snippets
                return;
            }
            let language = byId[snippet.language];
            if (language) {
                language.hasSnippets = true;
            }
            else {
                language = { id: snippet.language, name: snippet.language, extensions: [], hasGrammar: false, hasSnippets: true };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        if (!languages.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('language id', "ID"),
            localize('language name', "Name"),
            localize('file extensions', "File Extensions"),
            localize('grammar', "Grammar"),
            localize('snippets', "Snippets")
        ];
        const rows = languages.sort((a, b) => a.id.localeCompare(b.id))
            .map(l => {
            return [
                l.id, l.name,
                new MarkdownString().appendMarkdown(`${l.extensions.map(e => `\`${e}\``).join('&nbsp;')}`),
                l.hasGrammar ? '✔︎' : '\u2014',
                l.hasSnippets ? '✔︎' : '\u2014'
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
    id: 'languages',
    label: localize('languages', "Programming Languages"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageTableRenderer),
});
let WorkbenchLanguageService = class WorkbenchLanguageService extends LanguageService {
    constructor(extensionService, configurationService, environmentService, logService) {
        super(environmentService.verbose || environmentService.isExtensionDevelopment || !environmentService.isBuilt);
        this.logService = logService;
        this._configurationService = configurationService;
        this._extensionService = extensionService;
        languagesExtPoint.setHandler((extensions) => {
            const allValidLanguages = [];
            for (let i = 0, len = extensions.length; i < len; i++) {
                const extension = extensions[i];
                if (!Array.isArray(extension.value)) {
                    extension.collector.error(localize('invalid', "Invalid `contributes.{0}`. Expected an array.", languagesExtPoint.name));
                    continue;
                }
                for (let j = 0, lenJ = extension.value.length; j < lenJ; j++) {
                    const ext = extension.value[j];
                    if (isValidLanguageExtensionPoint(ext, extension.collector)) {
                        let configuration = undefined;
                        if (ext.configuration) {
                            configuration = joinPath(extension.description.extensionLocation, ext.configuration);
                        }
                        allValidLanguages.push({
                            id: ext.id,
                            extensions: ext.extensions,
                            filenames: ext.filenames,
                            filenamePatterns: ext.filenamePatterns,
                            firstLine: ext.firstLine,
                            aliases: ext.aliases,
                            mimetypes: ext.mimetypes,
                            configuration: configuration,
                            icon: ext.icon && {
                                light: joinPath(extension.description.extensionLocation, ext.icon.light),
                                dark: joinPath(extension.description.extensionLocation, ext.icon.dark)
                            }
                        });
                    }
                }
            }
            this._registry.setDynamicLanguages(allValidLanguages);
        });
        this.updateMime();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
                this.updateMime();
            }
        }));
        this._extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.updateMime();
        });
        this._register(this.onDidRequestRichLanguageFeatures((languageId) => {
            // extension activation
            this._extensionService.activateByEvent(`onLanguage:${languageId}`);
            this._extensionService.activateByEvent(`onLanguage`);
        }));
    }
    updateMime() {
        const configuration = this._configurationService.getValue();
        // Clear user configured mime associations
        clearConfiguredLanguageAssociations();
        // Register based on settings
        if (configuration.files?.associations) {
            Object.keys(configuration.files.associations).forEach(pattern => {
                const langId = configuration.files.associations[pattern];
                if (typeof langId !== 'string') {
                    this.logService.warn(`Ignoring configured 'files.associations' for '${pattern}' because its type is not a string but '${typeof langId}'`);
                    return; // https://github.com/microsoft/vscode/issues/147284
                }
                const mimeType = this.getMimeType(langId) || `text/x-${langId}`;
                registerConfiguredLanguageAssociation({ id: langId, mime: mimeType, filepattern: pattern });
            });
        }
        this._onDidChange.fire();
    }
};
WorkbenchLanguageService = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentService),
    __param(3, ILogService)
], WorkbenchLanguageService);
export { WorkbenchLanguageService };
function isUndefinedOrStringArray(value) {
    if (typeof value === 'undefined') {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    return value.every(item => typeof item === 'string');
}
function isValidLanguageExtensionPoint(value, collector) {
    if (!value) {
        collector?.error(localize('invalid.empty', "Empty value for `contributes.{0}`", languagesExtPoint.name));
        return false;
    }
    if (typeof value.id !== 'string') {
        collector?.error(localize('require.id', "property `{0}` is mandatory and must be of type `string`", 'id'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.extensions)) {
        collector?.error(localize('opt.extensions', "property `{0}` can be omitted and must be of type `string[]`", 'extensions'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.filenames)) {
        collector?.error(localize('opt.filenames', "property `{0}` can be omitted and must be of type `string[]`", 'filenames'));
        return false;
    }
    if (typeof value.firstLine !== 'undefined' && typeof value.firstLine !== 'string') {
        collector?.error(localize('opt.firstLine', "property `{0}` can be omitted and must be of type `string`", 'firstLine'));
        return false;
    }
    if (typeof value.configuration !== 'undefined' && typeof value.configuration !== 'string') {
        collector?.error(localize('opt.configuration', "property `{0}` can be omitted and must be of type `string`", 'configuration'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.aliases)) {
        collector?.error(localize('opt.aliases', "property `{0}` can be omitted and must be of type `string[]`", 'aliases'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.mimetypes)) {
        collector?.error(localize('opt.mimetypes', "property `{0}` can be omitted and must be of type `string[]`", 'mimetypes'));
        return false;
    }
    if (typeof value.icon !== 'undefined') {
        if (typeof value.icon !== 'object' || typeof value.icon.light !== 'string' || typeof value.icon.dark !== 'string') {
            collector?.error(localize('opt.icon', "property `{0}` can be omitted and must be of type `object` with properties `{1}` and `{2}` of type `string`", 'icon', 'light', 'dark'));
            return false;
        }
    }
    return true;
}
registerSingleton(ILanguageService, WorkbenchLanguageService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYW5ndWFnZS9jb21tb24vbGFuZ3VhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUscUNBQXFDLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN6SixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQXVCLE1BQU0sNENBQTRDLENBQUM7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUE2QixrQkFBa0IsRUFBd0MsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwSixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFtRyxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BMLE9BQU8sRUFBRSxRQUFRLEVBQUUs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