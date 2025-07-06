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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdEljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2Jyb3dzZXIvcHJvZHVjdEljb25UaGVtZURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFvRCxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEUsT0FBTyxFQUFrQixlQUFlLEVBQW9CLGtCQUFrQixFQUFrQixXQUFXLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6TixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsRUFBRSxDQUFDLENBQUMsT0FBTztBQUV4RCxNQUFNLE9BQU8sb0JBQW9CO2FBRWhCLGdCQUFXLEdBQUcsc0JBQXNCLEFBQXpCLENBQTBCO0lBY3JELFlBQW9CLEVBQVUsRUFBRSxLQUFhLEVBQUUsVUFBa0I7UUFIakUsc0JBQWlCLEdBQTZCLEVBQUUsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUk1RSxJ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