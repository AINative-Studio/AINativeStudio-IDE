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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9icm93c2VyL2ZpbGVJY29uVGhlbWVEYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBaUQsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUlwRixPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxHQUFHLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFOUYsTUFBTSxPQUFPLGlCQUFpQjthQUViLGdCQUFXLEdBQUcsZUFBZSxDQUFDO0lBZ0I5QyxZQUFvQixFQUFVLEVBQUUsS0FBYSxFQUFFLFVBQXlCO1FBQ3ZFLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FB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