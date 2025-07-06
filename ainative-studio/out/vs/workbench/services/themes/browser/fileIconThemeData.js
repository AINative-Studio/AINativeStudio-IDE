/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as paths from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import * as Json from '../../../../base/common/json.js';
import { ExtensionData } from '../common/workbenchThemeService.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { fontColorRegex, fontSizeRegex } from '../../../../platform/theme/common/iconRegistry.js';
import * as css from '../../../../base/browser/cssValue.js';
import { fileIconSelectorEscape } from '../../../../editor/common/services/getIconClasses.js';
export class FileIconThemeData {
    static { this.STORAGE_KEY = 'iconThemeData'; }
    constructor(id, label, settingsId) {
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
        this.hasFileIcons = false;
        this.hasFolderIcons = false;
        this.hidesExplorerArrows = false;
    }
    ensureLoaded(themeLoader) {
        return !this.isLoaded ? this.load(themeLoader) : Promise.resolve(this.styleSheetContent);
    }
    reload(themeLoader) {
        return this.load(themeLoader);
    }
    load(themeLoader) {
        return themeLoader.load(this);
    }
    static fromExtensionTheme(iconTheme, iconThemeLocation, extensionData) {
        const id = extensionData.extensionId + '-' + iconTheme.id;
        const label = iconTheme.label || paths.basename(iconTheme.path);
        const settingsId = iconTheme.id;
        const themeData = new FileIconThemeData(id, label, settingsId);
        themeData.description = iconTheme.description;
        themeData.location = iconThemeLocation;
        themeData.extensionData = extensionData;
        themeData.watch = iconTheme._watch;
        themeData.isLoaded = false;
        return themeData;
    }
    static { this._noIconTheme = null; }
    static get noIconTheme() {
        let themeData = FileIconThemeData._noIconTheme;
        if (!themeData) {
            themeData = FileIconThemeData._noIconTheme = new FileIconThemeData('', '', null);
            themeData.hasFileIcons = false;
            themeData.hasFolderIcons = false;
            themeData.hidesExplorerArrows = false;
            themeData.isLoaded = true;
            themeData.extensionData = undefined;
            themeData.watch = false;
        }
        return themeData;
    }
    static createUnloadedTheme(id) {
        const themeData = new FileIconThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.hasFileIcons = false;
        themeData.hasFolderIcons = false;
        themeData.hidesExplorerArrows = false;
        themeData.extensionData = undefined;
        themeData.watch = false;
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(FileIconThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new FileIconThemeData('', '', null);
            for (const key in data) {
                switch (key) {
                    case 'id':
                    case 'label':
                    case 'description':
                    case 'settingsId':
                    case 'styleSheetContent':
                    case 'hasFileIcons':
                    case 'hidesExplorerArrows':
                    case 'hasFolderIcons':
                    case 'watch':
                        theme[key] = data[key];
                        break;
                    case 'location':
                        // ignore, no longer restore
                        break;
                    case 'extensionData':
                        theme.extensionData = ExtensionData.fromJSONObject(data.extensionData);
                        break;
                }
            }
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    toStorage(storageService) {
        const data = JSON.stringify({
            id: this.id,
            label: this.label,
            description: this.description,
            settingsId: this.settingsId,
            styleSheetContent: this.styleSheetContent,
            hasFileIcons: this.hasFileIcons,
            hasFolderIcons: this.hasFolderIcons,
            hidesExplorerArrows: this.hidesExplorerArrows,
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            watch: this.watch
        });
        storageService.store(FileIconThemeData.STORAGE_KEY, data, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
}
export class FileIconThemeLoader {
    constructor(fileService, languageService) {
        this.fileService = fileService;
        this.languageService = languageService;
    }
    load(data) {
        if (!data.location) {
            return Promise.resolve(data.styleSheetContent);
        }
        return this.loadIconThemeDocument(data.location).then(iconThemeDocument => {
            const result = this.processIconThemeDocument(data.id, data.location, iconThemeDocument);
            data.styleSheetContent = result.content;
            data.hasFileIcons = result.hasFileIcons;
            data.hasFolderIcons = result.hasFolderIcons;
            data.hidesExplorerArrows = result.hidesExplorerArrows;
            data.isLoaded = true;
            return data.styleSheetContent;
        });
    }
    loadIconThemeDocument(location) {
        return this.fileService.readExtensionResource(location).then((content) => {
            const errors = [];
            const contentValue = Json.parse(content, errors);
            if (errors.length > 0) {
                return Promise.reject(new Error(nls.localize('error.cannotparseicontheme', "Problems parsing file icons file: {0}", errors.map(e => getParseErrorMessage(e.error)).join(', '))));
            }
            else if (Json.getNodeType(contentValue) !== 'object') {
                return Promise.reject(new Error(nls.localize('error.invalidformat', "Invalid format for file icons theme file: Object expected.")));
            }
            return Promise.resolve(contentValue);
        });
    }
    processIconThemeDocument(id, iconThemeDocumentLocation, iconThemeDocument) {
        const result = { content: '', hasFileIcons: false, hasFolderIcons: false, hidesExplorerArrows: !!iconThemeDocument.hidesExplorerArrows };
        let hasSpecificFileIcons = false;
        if (!iconThemeDocument.iconDefinitions) {
            return result;
        }
        const selectorByDefinitionId = {};
        const coveredLanguages = {};
        const iconThemeDocumentLocationDirname = resources.dirname(iconThemeDocumentLocation);
        function resolvePath(path) {
            return resources.joinPath(iconThemeDocumentLocationDirname, path);
        }
        function collectSelectors(associations, baseThemeClassName) {
            function addSelector(selector, defId) {
                if (defId) {
                    let list = selectorByDefinitionId[defId];
                    if (!list) {
                        list = selectorByDefinitionId[defId] = new css.Builder();
                    }
                    list.push(selector);
                }
            }
            if (associations) {
                let qualifier = css.inline `.show-file-icons`;
                if (baseThemeClassName) {
                    qualifier = css.inline `${baseThemeClassName} ${qualifier}`;
                }
                const expanded = css.inline `.monaco-tl-twistie.collapsible:not(.collapsed) + .monaco-tl-contents`;
                if (associations.folder) {
                    addSelector(css.inline `${qualifier} .folder-icon::before`, associations.folder);
                    result.hasFolderIcons = true;
                }
                if (associations.folderExpanded) {
                    addSelector(css.inline `${qualifier} ${expanded} .folder-icon::before`, associations.folderExpanded);
                    result.hasFolderIcons = true;
                }
                const rootFolder = associations.rootFolder || associations.folder;
                const rootFolderExpanded = associations.rootFolderExpanded || associations.folderExpanded;
                if (rootFolder) {
                    addSelector(css.inline `${qualifier} .rootfolder-icon::before`, rootFolder);
                    result.hasFolderIcons = true;
                }
                if (rootFolderExpanded) {
                    addSelector(css.inline `${qualifier} ${expanded} .rootfolder-icon::before`, rootFolderExpanded);
                    result.hasFolderIcons = true;
                }
                if (associations.file) {
                    addSelector(css.inline `${qualifier} .file-icon::before`, associations.file);
                    result.hasFileIcons = true;
                }
                const folderNames = associations.folderNames;
                if (folderNames) {
                    for (const key in folderNames) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(name)}-name-folder-icon`);
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.folder-icon::before`, folderNames[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const folderNamesExpanded = associations.folderNamesExpanded;
                if (folderNamesExpanded) {
                    for (const key in folderNamesExpanded) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(name)}-name-folder-icon`);
                        addSelector(css.inline `${qualifier} ${expanded} ${selectors.join('')}.folder-icon::before`, folderNamesExpanded[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const rootFolderNames = associations.rootFolderNames;
                if (rootFolderNames) {
                    for (const key in rootFolderNames) {
                        const name = key.toLowerCase();
                        addSelector(css.inline `${qualifier} .${classSelectorPart(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNames[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const rootFolderNamesExpanded = associations.rootFolderNamesExpanded;
                if (rootFolderNamesExpanded) {
                    for (const key in rootFolderNamesExpanded) {
                        const name = key.toLowerCase();
                        addSelector(css.inline `${qualifier} ${expanded} .${classSelectorPart(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNamesExpanded[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const languageIds = associations.languageIds;
                if (languageIds) {
                    if (!languageIds.jsonc && languageIds.json) {
                        languageIds.jsonc = languageIds.json;
                    }
                    for (const languageId in languageIds) {
                        addSelector(css.inline `${qualifier} .${classSelectorPart(languageId)}-lang-file-icon.file-icon::before`, languageIds[languageId]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                        coveredLanguages[languageId] = true;
                    }
                }
                const fileExtensions = associations.fileExtensions;
                if (fileExtensions) {
                    for (const key in fileExtensions) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        const segments = name.split('.');
                        if (segments.length) {
                            for (let i = 0; i < segments.length; i++) {
                                selectors.push(css.inline `.${classSelectorPart(segments.slice(i).join('.'))}-ext-file-icon`);
                            }
                            selectors.push(css.inline `.ext-file-icon`); // extra segment to increase file-ext score
                        }
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.file-icon::before`, fileExtensions[key]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                    }
                }
                const fileNames = associations.fileNames;
                if (fileNames) {
                    for (const key in fileNames) {
                        const selectors = new css.Builder();
                        const fileName = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(fileName)}-name-file-icon`);
                        selectors.push(css.inline `.name-file-icon`); // extra segment to increase file-name score
                        const segments = fileName.split('.');
                        if (segments.length) {
                            for (let i = 1; i < segments.length; i++) {
                                selectors.push(css.inline `.${classSelectorPart(segments.slice(i).join('.'))}-ext-file-icon`);
                            }
                            selectors.push(css.inline `.ext-file-icon`); // extra segment to increase file-ext score
                        }
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.file-icon::before`, fileNames[key]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                    }
                }
            }
        }
        collectSelectors(iconThemeDocument);
        collectSelectors(iconThemeDocument.light, css.inline `.vs`);
        collectSelectors(iconThemeDocument.highContrast, css.inline `.hc-black`);
        collectSelectors(iconThemeDocument.highContrast, css.inline `.hc-light`);
        if (!result.hasFileIcons && !result.hasFolderIcons) {
            return result;
        }
        const showLanguageModeIcons = iconThemeDocument.showLanguageModeIcons === true || (hasSpecificFileIcons && iconThemeDocument.showLanguageModeIcons !== false);
        const cssRules = new css.Builder();
        const fonts = iconThemeDocument.fonts;
        const fontSizes = new Map();
        if (Array.isArray(fonts)) {
            const defaultFontSize = this.tryNormalizeFontSize(fonts[0].size) || '150%';
            fonts.forEach(font => {
                const fontSrcs = new css.Builder();
                fontSrcs.push(...font.src.map(l => css.inline `${css.asCSSUrl(resolvePath(l.path))} format(${css.stringValue(l.format)})`));
                cssRules.push(css.inline `@font-face { src: ${fontSrcs.join(', ')}; font-family: ${css.stringValue(font.id)}; font-weight: ${css.identValue(font.weight)}; font-style: ${css.identValue(font.style)}; font-display: block; }`);
                const fontSize = this.tryNormalizeFontSize(font.size);
                if (fontSize !== undefined && fontSize !== defaultFontSize) {
                    fontSizes.set(font.id, fontSize);
                }
            });
            cssRules.push(css.inline `.show-file-icons .file-icon::before, .show-file-icons .folder-icon::before, .show-file-icons .rootfolder-icon::before { font-family: ${css.stringValue(fonts[0].id)}; font-size: ${css.sizeValue(defaultFontSize)}; }`);
        }
        // Use emQuads to prevent the icon from collapsing to zero height for image icons
        const emQuad = css.stringValue('\\2001');
        for (const defId in selectorByDefinitionId) {
            const selectors = selectorByDefinitionId[defId];
            const definition = iconThemeDocument.iconDefinitions[defId];
            if (definition) {
                if (definition.iconPath) {
                    cssRules.push(css.inline `${selectors.join(', ')} { content: ${emQuad}; background-image: ${css.asCSSUrl(resolvePath(definition.iconPath))}; }`);
                }
                else if (definition.fontCharacter || definition.fontColor) {
                    const body = new css.Builder();
                    if (definition.fontColor && definition.fontColor.match(fontColorRegex)) {
                        body.push(css.inline `color: ${css.hexColorValue(definition.fontColor)};`);
                    }
                    if (definition.fontCharacter) {
                        body.push(css.inline `content: ${css.stringValue(definition.fontCharacter)};`);
                    }
                    const fontSize = definition.fontSize ?? (definition.fontId ? fontSizes.get(definition.fontId) : undefined);
                    if (fontSize && fontSize.match(fontSizeRegex)) {
                        body.push(css.inline `font-size: ${css.sizeValue(fontSize)};`);
                    }
                    if (definition.fontId) {
                        body.push(css.inline `font-family: ${css.stringValue(definition.fontId)};`);
                    }
                    if (showLanguageModeIcons) {
                        body.push(css.inline `background-image: unset;`); // potentially set by the language default
                    }
                    cssRules.push(css.inline `${selectors.join(', ')} { ${body.join(' ')} }`);
                }
            }
        }
        if (showLanguageModeIcons) {
            for (const languageId of this.languageService.getRegisteredLanguageIds()) {
                if (!coveredLanguages[languageId]) {
                    const icon = this.languageService.getIcon(languageId);
                    if (icon) {
                        const selector = css.inline `.show-file-icons .${classSelectorPart(languageId)}-lang-file-icon.file-icon::before`;
                        cssRules.push(css.inline `${selector} { content: ${emQuad}; background-image: ${css.asCSSUrl(icon.dark)}; }`);
                        cssRules.push(css.inline `.vs ${selector} { content: ${emQuad}; background-image: ${css.asCSSUrl(icon.light)}; }`);
                    }
                }
            }
        }
        result.content = cssRules.join('\n');
        return result;
    }
    /**
     * Try converting absolute font sizes to relative values.
     *
     * This allows them to be scaled nicely depending on where they are used.
     */
    tryNormalizeFontSize(size) {
        if (!size) {
            return undefined;
        }
        const defaultFontSizeInPx = 13;
        if (size.endsWith('px')) {
            const value = parseInt(size, 10);
            if (!isNaN(value)) {
                return Math.round((value / defaultFontSizeInPx) * 100) + '%';
            }
        }
        return size;
    }
}
function handleParentFolder(key, selectors) {
    const lastIndexOfSlash = key.lastIndexOf('/');
    if (lastIndexOfSlash >= 0) {
        const parentFolder = key.substring(0, lastIndexOfSlash);
        selectors.push(css.inline `.${classSelectorPart(parentFolder)}-name-dir-icon`);
        return key.substring(lastIndexOfSlash + 1);
    }
    return key;
}
function classSelectorPart(str) {
    str = fileIconSelectorEscape(str);
    return css.className(str, true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2Jyb3dzZXIvZmlsZUljb25UaGVtZURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFpRCxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBSXBGLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUU5RixNQUFNLE9BQU8saUJBQWlCO2FBRWIsZ0JBQVcsR0FBRyxlQUFlLENBQUM7SUFnQjlDLFlBQW9CLEVBQVUsRUFBRSxLQUFhLEVBQUUsVUFBeUI7UUFDdkUsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFH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