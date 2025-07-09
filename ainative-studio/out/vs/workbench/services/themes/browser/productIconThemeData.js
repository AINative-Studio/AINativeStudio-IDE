/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Paths from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import * as Json from '../../../../base/common/json.js';
import { ExtensionData, ThemeSettingDefaults } from '../common/workbenchThemeService.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { getIconRegistry, IconFontDefinition, fontIdRegex, fontWeightRegex, fontStyleRegex, fontFormatRegex } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export const DEFAULT_PRODUCT_ICON_THEME_ID = ''; // TODO
export class ProductIconThemeData {
    static { this.STORAGE_KEY = 'productIconThemeData'; }
    constructor(id, label, settingsId) {
        this.iconThemeDocument = { iconDefinitions: new Map() };
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
    }
    getIcon(iconContribution) {
        return _resolveIconDefinition(iconContribution, this.iconThemeDocument);
    }
    ensureLoaded(fileService, logService) {
        return !this.isLoaded ? this.load(fileService, logService) : Promise.resolve(this.styleSheetContent);
    }
    reload(fileService, logService) {
        return this.load(fileService, logService);
    }
    async load(fileService, logService) {
        const location = this.location;
        if (!location) {
            return Promise.resolve(this.styleSheetContent);
        }
        const warnings = [];
        this.iconThemeDocument = await _loadProductIconThemeDocument(fileService, location, warnings);
        this.isLoaded = true;
        if (warnings.length) {
            logService.error(nls.localize('error.parseicondefs', "Problems processing product icons definitions in {0}:\n{1}", location.toString(), warnings.join('\n')));
        }
        return this.styleSheetContent;
    }
    static fromExtensionTheme(iconTheme, iconThemeLocation, extensionData) {
        const id = extensionData.extensionId + '-' + iconTheme.id;
        const label = iconTheme.label || Paths.basename(iconTheme.path);
        const settingsId = iconTheme.id;
        const themeData = new ProductIconThemeData(id, label, settingsId);
        themeData.description = iconTheme.description;
        themeData.location = iconThemeLocation;
        themeData.extensionData = extensionData;
        themeData.watch = iconTheme._watch;
        themeData.isLoaded = false;
        return themeData;
    }
    static createUnloadedTheme(id) {
        const themeData = new ProductIconThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.extensionData = undefined;
        themeData.watch = false;
        return themeData;
    }
    static { this._defaultProductIconTheme = null; }
    static get defaultTheme() {
        let themeData = ProductIconThemeData._defaultProductIconTheme;
        if (!themeData) {
            themeData = ProductIconThemeData._defaultProductIconTheme = new ProductIconThemeData(DEFAULT_PRODUCT_ICON_THEME_ID, nls.localize('defaultTheme', 'Default'), ThemeSettingDefaults.PRODUCT_ICON_THEME);
            themeData.isLoaded = true;
            themeData.extensionData = undefined;
            themeData.watch = false;
        }
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(ProductIconThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new ProductIconThemeData('', '', '');
            for (const key in data) {
                switch (key) {
                    case 'id':
                    case 'label':
                    case 'description':
                    case 'settingsId':
                    case 'styleSheetContent':
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
            const { iconDefinitions, iconFontDefinitions } = data;
            if (Array.isArray(iconDefinitions) && isObject(iconFontDefinitions)) {
                const restoredIconDefinitions = new Map();
                for (const entry of iconDefinitions) {
                    const { id, fontCharacter, fontId } = entry;
                    if (isString(id) && isString(fontCharacter)) {
                        if (isString(fontId)) {
                            const iconFontDefinition = IconFontDefinition.fromJSONObject(iconFontDefinitions[fontId]);
                            if (iconFontDefinition) {
                                restoredIconDefinitions.set(id, { fontCharacter, font: { id: fontId, definition: iconFontDefinition } });
                            }
                        }
                        else {
                            restoredIconDefinitions.set(id, { fontCharacter });
                        }
                    }
                }
                theme.iconThemeDocument = { iconDefinitions: restoredIconDefinitions };
            }
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    toStorage(storageService) {
        const iconDefinitions = [];
        const iconFontDefinitions = {};
        for (const entry of this.iconThemeDocument.iconDefinitions.entries()) {
            const font = entry[1].font;
            iconDefinitions.push({ id: entry[0], fontCharacter: entry[1].fontCharacter, fontId: font?.id });
            if (font && iconFontDefinitions[font.id] === undefined) {
                iconFontDefinitions[font.id] = IconFontDefinition.toJSONObject(font.definition);
            }
        }
        const data = JSON.stringify({
            id: this.id,
            label: this.label,
            description: this.description,
            settingsId: this.settingsId,
            styleSheetContent: this.styleSheetContent,
            watch: this.watch,
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            iconDefinitions,
            iconFontDefinitions
        });
        storageService.store(ProductIconThemeData.STORAGE_KEY, data, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
}
function _loadProductIconThemeDocument(fileService, location, warnings) {
    return fileService.readExtensionResource(location).then((content) => {
        const parseErrors = [];
        const contentValue = Json.parse(content, parseErrors);
        if (parseErrors.length > 0) {
            return Promise.reject(new Error(nls.localize('error.cannotparseicontheme', "Problems parsing product icons file: {0}", parseErrors.map(e => getParseErrorMessage(e.error)).join(', '))));
        }
        else if (Json.getNodeType(contentValue) !== 'object') {
            return Promise.reject(new Error(nls.localize('error.invalidformat', "Invalid format for product icons theme file: Object expected.")));
        }
        else if (!contentValue.iconDefinitions || !Array.isArray(contentValue.fonts) || !contentValue.fonts.length) {
            return Promise.reject(new Error(nls.localize('error.missingProperties', "Invalid format for product icons theme file: Must contain iconDefinitions and fonts.")));
        }
        const iconThemeDocumentLocationDirname = resources.dirname(location);
        const sanitizedFonts = new Map();
        for (const font of contentValue.fonts) {
            const fontId = font.id;
            if (isString(fontId) && fontId.match(fontIdRegex)) {
                let fontWeight = undefined;
                if (isString(font.weight) && font.weight.match(fontWeightRegex)) {
                    fontWeight = font.weight;
                }
                else {
                    warnings.push(nls.localize('error.fontWeight', 'Invalid font weight in font \'{0}\'. Ignoring setting.', font.id));
                }
                let fontStyle = undefined;
                if (isString(font.style) && font.style.match(fontStyleRegex)) {
                    fontStyle = font.style;
                }
                else {
                    warnings.push(nls.localize('error.fontStyle', 'Invalid font style in font \'{0}\'. Ignoring setting.', font.id));
                }
                const sanitizedSrc = [];
                if (Array.isArray(font.src)) {
                    for (const s of font.src) {
                        if (isString(s.path) && isString(s.format) && s.format.match(fontFormatRegex)) {
                            const iconFontLocation = resources.joinPath(iconThemeDocumentLocationDirname, s.path);
                            sanitizedSrc.push({ location: iconFontLocation, format: s.format });
                        }
                        else {
                            warnings.push(nls.localize('error.fontSrc', 'Invalid font source in font \'{0}\'. Ignoring source.', font.id));
                        }
                    }
                }
                if (sanitizedSrc.length) {
                    sanitizedFonts.set(fontId, { weight: fontWeight, style: fontStyle, src: sanitizedSrc });
                }
                else {
                    warnings.push(nls.localize('error.noFontSrc', 'No valid font source in font \'{0}\'. Ignoring font definition.', font.id));
                }
            }
            else {
                warnings.push(nls.localize('error.fontId', 'Missing or invalid font id \'{0}\'. Skipping font definition.', font.id));
            }
        }
        const iconDefinitions = new Map();
        const primaryFontId = contentValue.fonts[0].id;
        for (const iconId in contentValue.iconDefinitions) {
            const definition = contentValue.iconDefinitions[iconId];
            if (isString(definition.fontCharacter)) {
                const fontId = definition.fontId ?? primaryFontId;
                const fontDefinition = sanitizedFonts.get(fontId);
                if (fontDefinition) {
                    const font = { id: `pi-${fontId}`, definition: fontDefinition };
                    iconDefinitions.set(iconId, { fontCharacter: definition.fontCharacter, font });
                }
                else {
                    warnings.push(nls.localize('error.icon.font', 'Skipping icon definition \'{0}\'. Unknown font.', iconId));
                }
            }
            else {
                warnings.push(nls.localize('error.icon.fontCharacter', 'Skipping icon definition \'{0}\': Needs to be defined', iconId));
            }
        }
        return { iconDefinitions };
    });
}
const iconRegistry = getIconRegistry();
function _resolveIconDefinition(iconContribution, iconThemeDocument) {
    const iconDefinitions = iconThemeDocument.iconDefinitions;
    let definition = iconDefinitions.get(iconContribution.id);
    let defaults = iconContribution.defaults;
    while (!definition && ThemeIcon.isThemeIcon(defaults)) {
        // look if an inherited icon has a definition
        const ic = iconRegistry.getIcon(defaults.id);
        if (ic) {
            definition = iconDefinitions.get(ic.id);
            defaults = ic.defaults;
        }
        else {
            return undefined;
        }
    }
    if (definition) {
        return definition;
    }
    if (!ThemeIcon.isThemeIcon(defaults)) {
        return defaults;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdEljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9icm93c2VyL3Byb2R1Y3RJY29uVGhlbWVEYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBb0Qsb0JBQW9CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVwRixPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRFLE9BQU8sRUFBa0IsZUFBZSxFQUFvQixrQkFBa0IsRUFBa0IsV0FBVyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDek4sT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2pFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU87QUFFeEQsTUFBTSxPQUFPLG9CQUFvQjthQUVoQixnQkFBVyxHQUFHLHNCQUFzQixBQUF6QixDQUEwQjtJQWNyRCxZQUFvQixFQUFVLEVBQUUsS0FBYSxFQUFFLFVBQWtCO1FBSGpFLHNCQUFpQixHQUE2QixFQUFFLGVBQWUsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUM7UUFJNUUs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