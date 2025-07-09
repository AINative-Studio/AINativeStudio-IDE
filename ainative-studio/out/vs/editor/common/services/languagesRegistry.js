/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { compareIgnoreCase, regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { clearPlatformLanguageAssociations, getLanguageIds, registerPlatformLanguageAssociation } from './languagesAssociations.js';
import { ModesRegistry, PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { Extensions } from '../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../platform/registry/common/platform.js';
const hasOwnProperty = Object.prototype.hasOwnProperty;
const NULL_LANGUAGE_ID = 'vs.editor.nullLanguage';
export class LanguageIdCodec {
    constructor() {
        this._languageIdToLanguage = [];
        this._languageToLanguageId = new Map();
        this._register(NULL_LANGUAGE_ID, 0 /* LanguageId.Null */);
        this._register(PLAINTEXT_LANGUAGE_ID, 1 /* LanguageId.PlainText */);
        this._nextLanguageId = 2;
    }
    _register(language, languageId) {
        this._languageIdToLanguage[languageId] = language;
        this._languageToLanguageId.set(language, languageId);
    }
    register(language) {
        if (this._languageToLanguageId.has(language)) {
            return;
        }
        const languageId = this._nextLanguageId++;
        this._register(language, languageId);
    }
    encodeLanguageId(languageId) {
        return this._languageToLanguageId.get(languageId) || 0 /* LanguageId.Null */;
    }
    decodeLanguageId(languageId) {
        return this._languageIdToLanguage[languageId] || NULL_LANGUAGE_ID;
    }
}
export class LanguagesRegistry extends Disposable {
    static { this.instanceCount = 0; }
    constructor(useModesRegistry = true, warnOnOverwrite = false) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        LanguagesRegistry.instanceCount++;
        this._warnOnOverwrite = warnOnOverwrite;
        this.languageIdCodec = new LanguageIdCodec();
        this._dynamicLanguages = [];
        this._languages = {};
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        if (useModesRegistry) {
            this._initializeFromRegistry();
            this._register(ModesRegistry.onDidChangeLanguages((m) => {
                this._initializeFromRegistry();
            }));
        }
    }
    dispose() {
        LanguagesRegistry.instanceCount--;
        super.dispose();
    }
    setDynamicLanguages(def) {
        this._dynamicLanguages = def;
        this._initializeFromRegistry();
    }
    _initializeFromRegistry() {
        this._languages = {};
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        clearPlatformLanguageAssociations();
        const desc = [].concat(ModesRegistry.getLanguages()).concat(this._dynamicLanguages);
        this._registerLanguages(desc);
    }
    registerLanguage(desc) {
        return ModesRegistry.registerLanguage(desc);
    }
    _registerLanguages(desc) {
        for (const d of desc) {
            this._registerLanguage(d);
        }
        // Rebuild fast path maps
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        Object.keys(this._languages).forEach((langId) => {
            const language = this._languages[langId];
            if (language.name) {
                this._nameMap[language.name] = language.identifier;
            }
            language.aliases.forEach((alias) => {
                this._lowercaseNameMap[alias.toLowerCase()] = language.identifier;
            });
            language.mimetypes.forEach((mimetype) => {
                this._mimeTypesMap[mimetype] = language.identifier;
            });
        });
        Registry.as(Extensions.Configuration).registerOverrideIdentifiers(this.getRegisteredLanguageIds());
        this._onDidChange.fire();
    }
    _registerLanguage(lang) {
        const langId = lang.id;
        let resolvedLanguage;
        if (hasOwnProperty.call(this._languages, langId)) {
            resolvedLanguage = this._languages[langId];
        }
        else {
            this.languageIdCodec.register(langId);
            resolvedLanguage = {
                identifier: langId,
                name: null,
                mimetypes: [],
                aliases: [],
                extensions: [],
                filenames: [],
                configurationFiles: [],
                icons: []
            };
            this._languages[langId] = resolvedLanguage;
        }
        this._mergeLanguage(resolvedLanguage, lang);
    }
    _mergeLanguage(resolvedLanguage, lang) {
        const langId = lang.id;
        let primaryMime = null;
        if (Array.isArray(lang.mimetypes) && lang.mimetypes.length > 0) {
            resolvedLanguage.mimetypes.push(...lang.mimetypes);
            primaryMime = lang.mimetypes[0];
        }
        if (!primaryMime) {
            primaryMime = `text/x-${langId}`;
            resolvedLanguage.mimetypes.push(primaryMime);
        }
        if (Array.isArray(lang.extensions)) {
            if (lang.configuration) {
                // insert first as this appears to be the 'primary' language definition
                resolvedLanguage.extensions = lang.extensions.concat(resolvedLanguage.extensions);
            }
            else {
                resolvedLanguage.extensions = resolvedLanguage.extensions.concat(lang.extensions);
            }
            for (const extension of lang.extensions) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, extension: extension }, this._warnOnOverwrite);
            }
        }
        if (Array.isArray(lang.filenames)) {
            for (const filename of lang.filenames) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, filename: filename }, this._warnOnOverwrite);
                resolvedLanguage.filenames.push(filename);
            }
        }
        if (Array.isArray(lang.filenamePatterns)) {
            for (const filenamePattern of lang.filenamePatterns) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, filepattern: filenamePattern }, this._warnOnOverwrite);
            }
        }
        if (typeof lang.firstLine === 'string' && lang.firstLine.length > 0) {
            let firstLineRegexStr = lang.firstLine;
            if (firstLineRegexStr.charAt(0) !== '^') {
                firstLineRegexStr = '^' + firstLineRegexStr;
            }
            try {
                const firstLineRegex = new RegExp(firstLineRegexStr);
                if (!regExpLeadsToEndlessLoop(firstLineRegex)) {
                    registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, firstline: firstLineRegex }, this._warnOnOverwrite);
                }
            }
            catch (err) {
                // Most likely, the regex was bad
                console.warn(`[${lang.id}]: Invalid regular expression \`${firstLineRegexStr}\`: `, err);
            }
        }
        resolvedLanguage.aliases.push(langId);
        let langAliases = null;
        if (typeof lang.aliases !== 'undefined' && Array.isArray(lang.aliases)) {
            if (lang.aliases.length === 0) {
                // signal that this language should not get a name
                langAliases = [null];
            }
            else {
                langAliases = lang.aliases;
            }
        }
        if (langAliases !== null) {
            for (const langAlias of langAliases) {
                if (!langAlias || langAlias.length === 0) {
                    continue;
                }
                resolvedLanguage.aliases.push(langAlias);
            }
        }
        const containsAliases = (langAliases !== null && langAliases.length > 0);
        if (containsAliases && langAliases[0] === null) {
            // signal that this language should not get a name
        }
        else {
            const bestName = (containsAliases ? langAliases[0] : null) || langId;
            if (containsAliases || !resolvedLanguage.name) {
                resolvedLanguage.name = bestName;
            }
        }
        if (lang.configuration) {
            resolvedLanguage.configurationFiles.push(lang.configuration);
        }
        if (lang.icon) {
            resolvedLanguage.icons.push(lang.icon);
        }
    }
    isRegisteredLanguageId(languageId) {
        if (!languageId) {
            return false;
        }
        return hasOwnProperty.call(this._languages, languageId);
    }
    getRegisteredLanguageIds() {
        return Object.keys(this._languages);
    }
    getSortedRegisteredLanguageNames() {
        const result = [];
        for (const languageName in this._nameMap) {
            if (hasOwnProperty.call(this._nameMap, languageName)) {
                result.push({
                    languageName: languageName,
                    languageId: this._nameMap[languageName]
                });
            }
        }
        result.sort((a, b) => compareIgnoreCase(a.languageName, b.languageName));
        return result;
    }
    getLanguageName(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        return this._languages[languageId].name;
    }
    getMimeType(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        const language = this._languages[languageId];
        return (language.mimetypes[0] || null);
    }
    getExtensions(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].extensions;
    }
    getFilenames(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].filenames;
    }
    getIcon(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        const language = this._languages[languageId];
        return (language.icons[0] || null);
    }
    getConfigurationFiles(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].configurationFiles || [];
    }
    getLanguageIdByLanguageName(languageName) {
        const languageNameLower = languageName.toLowerCase();
        if (!hasOwnProperty.call(this._lowercaseNameMap, languageNameLower)) {
            return null;
        }
        return this._lowercaseNameMap[languageNameLower];
    }
    getLanguageIdByMimeType(mimeType) {
        if (!mimeType) {
            return null;
        }
        if (hasOwnProperty.call(this._mimeTypesMap, mimeType)) {
            return this._mimeTypesMap[mimeType];
        }
        return null;
    }
    guessLanguageIdByFilepathOrFirstLine(resource, firstLine) {
        if (!resource && !firstLine) {
            return [];
        }
        return getLanguageIds(resource, firstLine);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZXNSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxjQUFjLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUlwSSxPQUFPLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFckYsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxpRUFBaUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFekUsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7QUFDdkQsTUFBTSxnQkFBZ0IsR0FBRyx3QkFBd0IsQ0FBQztBQWFsRCxNQUFNLE9BQU8sZUFBZTtJQU0zQjtRQUhpQiwwQkFBcUIsR0FBYSxFQUFFLENBQUM7UUFDckMsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFHbEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsMEJBQWtCLENBQUM7UUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsK0JBQXVCLENBQUM7UUFDNUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVPLFNBQVMsQ0FBQyxRQUFnQixFQUFFLFVBQXNCO1FBQ3pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLENBQUM7UUFDbEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVNLFFBQVEsQ0FBQyxRQUFnQjtRQUMvQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsVUFBa0I7UUFDekMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQywyQkFBbUIsQ0FBQztJQUN0RSxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsVUFBc0I7UUFDN0MsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLElBQUksZ0JBQWdCLENBQUM7SUFDbkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFVBQVU7YUFFekMsa0JBQWEsR0FBRyxDQUFDLEFBQUosQ0FBSztJQWF6QixZQUFZLGdCQUFnQixHQUFHLElBQUksRUFBRSxlQUFlLEdBQUcsS0FBSztRQUMzRCxLQUFLLEVBQUUsQ0FBQztRQVpRLGlCQUFZLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ25FLGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBWWxFLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRWxDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7UUFDeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzdDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUU1QixJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDdkQsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU0sbUJBQW1CLENBQUMsR0FBOEI7UUFDeEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztRQUM3QixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUM7UUFFNUIsaUNBQWlDLEVBQUUsQ0FBQztRQUNwQyxNQUFNLElBQUksR0FBK0IsRUFBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakgsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUE2QjtRQUM3QyxPQUFPLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsSUFBK0I7UUFFakQsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7WUFDcEQsQ0FBQztZQUNELFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ25FLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDdkMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUUzSCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxJQUE2QjtRQUN0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBRXZCLElBQUksZ0JBQW1DLENBQUM7UUFDeEMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEMsZ0JBQWdCLEdBQUc7Z0JBQ2xCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixJQUFJLEVBQUUsSUFBSTtnQkFDVixTQUFTLEVBQUUsRUFBRTtnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxVQUFVLEVBQUUsRUFBRTtnQkFDZCxTQUFTLEVBQUUsRUFBRTtnQkFDYixrQkFBa0IsRUFBRSxFQUFFO2dCQUN0QixLQUFLLEVBQUUsRUFBRTthQUNULENBQUM7WUFDRixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDO1FBQzVDLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFTyxjQUFjLENBQUMsZ0JBQW1DLEVBQUUsSUFBNkI7UUFDeEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUV2QixJQUFJLFdBQVcsR0FBa0IsSUFBSSxDQUFDO1FBRXRDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuRCxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsR0FBRyxVQUFVLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEIsdUVBQXVFO2dCQUN2RSxnQkFBZ0IsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRixDQUFDO1lBQ0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3pDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNySCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdkMsbUNBQW1DLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNsSCxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDMUMsS0FBSyxNQUFNLGVBQWUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDckQsbUNBQW1DLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdILENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JFLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN2QyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDekMsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLGlCQUFpQixDQUFDO1lBQzdDLENBQUM7WUFDRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxjQUFjLEdBQUcsSUFBSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQy9DLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDMUgsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLGlDQUFpQztnQkFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLG1DQUFtQyxpQkFBaUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFGLENBQUM7UUFDRixDQUFDO1FBRUQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0QyxJQUFJLFdBQVcsR0FBZ0MsSUFBSSxDQUFDO1FBQ3BELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3hFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLGtEQUFrRDtnQkFDbEQsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDMUIsS0FBSyxNQUFNLFNBQVMsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUMxQyxTQUFTO2dCQUNWLENBQUM7Z0JBQ0QsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLENBQUMsV0FBVyxLQUFLLElBQUksSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksZUFBZSxJQUFJLFdBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNqRCxrREFBa0Q7UUFDbkQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUM7WUFDdEUsSUFBSSxlQUFlLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDL0MsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxVQUFxQztRQUNsRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxnQ0FBZ0M7UUFDdEMsTUFBTSxNQUFNLEdBQTBCLEVBQUUsQ0FBQztRQUN6QyxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLFlBQVksRUFBRSxZQUFZO29CQUMxQixVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7aUJBQ3ZDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDekUsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0sZUFBZSxDQUFDLFVBQWtCO1FBQ3hDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3pDLENBQUM7SUFFTSxXQUFXLENBQUMsVUFBa0I7UUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUFrQjtRQUN0QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdkQsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUMvQyxDQUFDO0lBRU0sWUFBWSxDQUFDLFVBQWtCO1FBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQzlDLENBQUM7SUFFTSxPQUFPLENBQUMsVUFBa0I7UUFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLHFCQUFxQixDQUFDLFVBQWtCO1FBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDO0lBQzdELENBQUM7SUFFTSwyQkFBMkIsQ0FBQyxZQUFvQjtRQUN0RCxNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ3JFLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLHVCQUF1QixDQUFDLFFBQW1DO1FBQ2pFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdkQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxvQ0FBb0MsQ0FBQyxRQUFvQixFQUFFLFNBQWtCO1FBQ25GLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM3QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxPQUFPLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDNUMsQ0FBQyJ9