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
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkbenchThemeService, ExtensionData, ThemeSettings, ThemeSettingDefaults, COLOR_THEME_DARK_INITIAL_COLORS, COLOR_THEME_LIGHT_INITIAL_COLORS } from '../common/workbenchThemeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as errors from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ColorThemeData } from '../common/colorThemeData.js';
import { Extensions as ThemingExtensions } from '../../../../platform/theme/common/themeService.js';
import { Emitter } from '../../../../base/common/event.js';
import { registerFileIconThemeSchemas } from '../common/fileIconThemeSchema.js';
import { dispose, Disposable } from '../../../../base/common/lifecycle.js';
import { FileIconThemeData, FileIconThemeLoader } from './fileIconThemeData.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import * as resources from '../../../../base/common/resources.js';
import { registerColorThemeSchemas } from '../common/colorThemeSchema.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { ThemeRegistry, registerColorThemeExtensionPoint, registerFileIconThemeExtensionPoint, registerProductIconThemeExtensionPoint } from '../common/themeExtensionPoints.js';
import { updateColorThemeConfigurationSchemas, updateFileIconThemeConfigurationSchemas, ThemeConfiguration, updateProductIconThemeConfigurationSchemas } from '../common/themeConfiguration.js';
import { ProductIconThemeData, DEFAULT_PRODUCT_ICON_THEME_ID } from './productIconThemeData.js';
import { registerProductIconThemeSchemas } from '../common/productIconThemeSchema.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { RunOnceScheduler, Sequencer } from '../../../../base/common/async.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { asCssVariableName, getColorRegistry } from '../../../../platform/theme/common/colorRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { mainWindow } from '../../../../base/browser/window.js';
// implementation
const defaultThemeExtensionId = 'vscode-theme-defaults';
const DEFAULT_FILE_ICON_THEME_ID = 'vscode.vscode-theme-seti-vs-seti';
const fileIconsEnabledClass = 'file-icons-enabled';
const colorThemeRulesClassName = 'contributedColorTheme';
const fileIconThemeRulesClassName = 'contributedFileIconTheme';
const productIconThemeRulesClassName = 'contributedProductIconTheme';
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
function validateThemeId(theme) {
    // migrations
    switch (theme) {
        case ThemeTypeSelector.VS: return `vs ${defaultThemeExtensionId}-themes-light_vs-json`;
        case ThemeTypeSelector.VS_DARK: return `vs-dark ${defaultThemeExtensionId}-themes-dark_vs-json`;
        case ThemeTypeSelector.HC_BLACK: return `hc-black ${defaultThemeExtensionId}-themes-hc_black-json`;
        case ThemeTypeSelector.HC_LIGHT: return `hc-light ${defaultThemeExtensionId}-themes-hc_light-json`;
    }
    return theme;
}
const colorThemesExtPoint = registerColorThemeExtensionPoint();
const fileIconThemesExtPoint = registerFileIconThemeExtensionPoint();
const productIconThemesExtPoint = registerProductIconThemeExtensionPoint();
let WorkbenchThemeService = class WorkbenchThemeService extends Disposable {
    constructor(extensionService, storageService, configurationService, telemetryService, environmentService, fileService, extensionResourceLoaderService, layoutService, logService, hostColorService, userDataInitializationService, languageService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
        this.hostColorService = hostColorService;
        this.userDataInitializationService = userDataInitializationService;
        this.languageService = languageService;
        this.themeExtensionsActivated = new Map();
        this.container = layoutService.mainContainer;
        this.settings = new ThemeConfiguration(configurationService, hostColorService);
        this.colorThemeRegistry = this._register(new ThemeRegistry(colorThemesExtPoint, ColorThemeData.fromExtensionTheme));
        this.colorThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentColorTheme.bind(this)));
        this.onColorThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentColorTheme = ColorThemeData.createUnloadedTheme('');
        this.colorThemeSequencer = new Sequencer();
        this.fileIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentFileIconTheme.bind(this)));
        this.fileIconThemeRegistry = this._register(new ThemeRegistry(fileIconThemesExtPoint, FileIconThemeData.fromExtensionTheme, true, FileIconThemeData.noIconTheme));
        this.fileIconThemeLoader = new FileIconThemeLoader(extensionResourceLoaderService, languageService);
        this.onFileIconThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentFileIconTheme = FileIconThemeData.createUnloadedTheme('');
        this.fileIconThemeSequencer = new Sequencer();
        this.productIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentProductIconTheme.bind(this)));
        this.productIconThemeRegistry = this._register(new ThemeRegistry(productIconThemesExtPoint, ProductIconThemeData.fromExtensionTheme, true, ProductIconThemeData.defaultTheme));
        this.onProductIconThemeChange = new Emitter();
        this.currentProductIconTheme = ProductIconThemeData.createUnloadedTheme('');
        this.productIconThemeSequencer = new Sequencer();
        this._register(this.onDidColorThemeChange(theme => getColorRegistry().notifyThemeUpdate(theme)));
        // In order to avoid paint flashing for tokens, because
        // themes are loaded asynchronously, we need to initialize
        // a color theme document with good defaults until the theme is loaded
        let themeData = ColorThemeData.fromStorageData(this.storageService);
        const colorThemeSetting = this.settings.colorTheme;
        if (themeData && colorThemeSetting !== themeData.settingsId) {
            themeData = undefined;
        }
        const defaultColorMap = colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_LIGHT ? COLOR_THEME_LIGHT_INITIAL_COLORS : colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_DARK ? COLOR_THEME_DARK_INITIAL_COLORS : undefined;
        if (!themeData) {
            const initialColorTheme = environmentService.options?.initialColorTheme;
            if (initialColorTheme) {
                themeData = ColorThemeData.createUnloadedThemeForThemeType(initialColorTheme.themeType, initialColorTheme.colors ?? defaultColorMap);
            }
        }
        if (!themeData) {
            const colorScheme = this.settings.getPreferredColorScheme() ?? (isWeb ? ColorScheme.LIGHT : ColorScheme.DARK);
            themeData = ColorThemeData.createUnloadedThemeForThemeType(colorScheme, defaultColorMap);
        }
        themeData.setCustomizations(this.settings);
        this.applyTheme(themeData, undefined, true);
        const fileIconData = FileIconThemeData.fromStorageData(this.storageService);
        if (fileIconData) {
            this.applyAndSetFileIconTheme(fileIconData, true);
        }
        const productIconData = ProductIconThemeData.fromStorageData(this.storageService);
        if (productIconData) {
            this.applyAndSetProductIconTheme(productIconData, true);
        }
        extensionService.whenInstalledExtensionsRegistered().then(_ => {
            this.installConfigurationListener();
            this.installPreferredSchemeListener();
            this.installRegistryListeners();
            this.initialize().catch(errors.onUnexpectedError);
        });
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = this._register(new RunOnceScheduler(updateAll, 0));
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
    }
    initialize() {
        const extDevLocs = this.environmentService.extensionDevelopmentLocationURI;
        const extDevLoc = extDevLocs && extDevLocs.length === 1 ? extDevLocs[0] : undefined; // in dev mode, switch to a theme provided by the extension under dev.
        const initializeColorTheme = async () => {
            const devThemes = this.colorThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                const matchedColorTheme = devThemes.find(theme => theme.type === this.currentColorTheme.type);
                return this.setColorTheme(matchedColorTheme ? matchedColorTheme.id : devThemes[0].id, undefined);
            }
            let theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, undefined);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                // try to get the theme again, now with a fallback to the default themes
                const fallbackTheme = this.currentColorTheme.type === ColorScheme.LIGHT ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK;
                theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, fallbackTheme);
            }
            return this.setColorTheme(theme && theme.id, undefined);
        };
        const initializeFileIconTheme = async () => {
            const devThemes = this.fileIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setFileIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            }
            return this.setFileIconTheme(theme ? theme.id : DEFAULT_FILE_ICON_THEME_ID, undefined);
        };
        const initializeProductIconTheme = async () => {
            const devThemes = this.productIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setProductIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            }
            return this.setProductIconTheme(theme ? theme.id : DEFAULT_PRODUCT_ICON_THEME_ID, undefined);
        };
        return Promise.all([initializeColorTheme(), initializeFileIconTheme(), initializeProductIconTheme()]);
    }
    installConfigurationListener() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ThemeSettings.COLOR_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_DARK_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_LIGHT_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_HC_DARK_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_HC_LIGHT_THEME)
                || e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)
                || e.affectsConfiguration(ThemeSettings.DETECT_HC)
                || e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME)) {
                this.restoreColorTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.FILE_ICON_THEME)) {
                this.restoreFileIconTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.PRODUCT_ICON_THEME)) {
                this.restoreProductIconTheme();
            }
            if (this.currentColorTheme) {
                let hasColorChanges = false;
                if (e.affectsConfiguration(ThemeSettings.COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomColors(this.settings.colorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomTokenColors(this.settings.tokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomSemanticTokenColors(this.settings.semanticTokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (hasColorChanges) {
                    this.updateDynamicCSSRules(this.currentColorTheme);
                    this.onColorThemeChange.fire(this.currentColorTheme);
                }
            }
        }));
    }
    installRegistryListeners() {
        let prevColorId = undefined;
        // update settings schema setting for theme specific settings
        this._register(this.colorThemeRegistry.onDidChange(async (event) => {
            updateColorThemeConfigurationSchemas(event.themes);
            if (await this.restoreColorTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentColorTheme.settingsId === ThemeSettingDefaults.COLOR_THEME_DARK && !types.isUndefined(prevColorId) && await this.colorThemeRegistry.findThemeById(prevColorId)) {
                    await this.setColorTheme(prevColorId, 'auto');
                    prevColorId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
                    await this.reloadCurrentColorTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
                // current theme is no longer available
                prevColorId = this.currentColorTheme.id;
                const defaultTheme = this.colorThemeRegistry.findThemeBySettingsId(ThemeSettingDefaults.COLOR_THEME_DARK);
                await this.setColorTheme(defaultTheme, 'auto');
            }
        }));
        let prevFileIconId = undefined;
        this._register(this._register(this.fileIconThemeRegistry.onDidChange(async (event) => {
            updateFileIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreFileIconTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentFileIconTheme.id === DEFAULT_FILE_ICON_THEME_ID && !types.isUndefined(prevFileIconId) && this.fileIconThemeRegistry.findThemeById(prevFileIconId)) {
                    await this.setFileIconTheme(prevFileIconId, 'auto');
                    prevFileIconId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
                    await this.reloadCurrentFileIconTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
                // current theme is no longer available
                prevFileIconId = this.currentFileIconTheme.id;
                await this.setFileIconTheme(DEFAULT_FILE_ICON_THEME_ID, 'auto');
            }
        })));
        let prevProductIconId = undefined;
        this._register(this.productIconThemeRegistry.onDidChange(async (event) => {
            updateProductIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreProductIconTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentProductIconTheme.id === DEFAULT_PRODUCT_ICON_THEME_ID && !types.isUndefined(prevProductIconId) && this.productIconThemeRegistry.findThemeById(prevProductIconId)) {
                    await this.setProductIconTheme(prevProductIconId, 'auto');
                    prevProductIconId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
                    await this.reloadCurrentProductIconTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
                // current theme is no longer available
                prevProductIconId = this.currentProductIconTheme.id;
                await this.setProductIconTheme(DEFAULT_PRODUCT_ICON_THEME_ID, 'auto');
            }
        }));
        this._register(this.languageService.onDidChange(() => this.reloadCurrentFileIconTheme()));
        return Promise.all([this.getColorThemes(), this.getFileIconThemes(), this.getProductIconThemes()]).then(([ct, fit, pit]) => {
            updateColorThemeConfigurationSchemas(ct);
            updateFileIconThemeConfigurationSchemas(fit);
            updateProductIconThemeConfigurationSchemas(pit);
        });
    }
    // preferred scheme handling
    installPreferredSchemeListener() {
        this._register(this.hostColorService.onDidChangeColorScheme(() => {
            if (this.settings.isDetectingColorScheme()) {
                this.restoreColorTheme();
            }
        }));
    }
    getColorTheme() {
        return this.currentColorTheme;
    }
    async getColorThemes() {
        return this.colorThemeRegistry.getThemes();
    }
    getPreferredColorScheme() {
        return this.settings.getPreferredColorScheme();
    }
    async getMarketplaceColorThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.colorThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    get onDidColorThemeChange() {
        return this.onColorThemeChange.event;
    }
    setColorTheme(themeIdOrTheme, settingsTarget) {
        return this.colorThemeSequencer.queue(async () => {
            return this.internalSetColorTheme(themeIdOrTheme, settingsTarget);
        });
    }
    async internalSetColorTheme(themeIdOrTheme, settingsTarget) {
        if (!themeIdOrTheme) {
            return null;
        }
        const themeId = types.isString(themeIdOrTheme) ? validateThemeId(themeIdOrTheme) : themeIdOrTheme.id;
        if (this.currentColorTheme.isLoaded && themeId === this.currentColorTheme.id) {
            if (settingsTarget !== 'preview') {
                this.currentColorTheme.toStorage(this.storageService);
            }
            return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
        }
        let themeData = this.colorThemeRegistry.findThemeById(themeId);
        if (!themeData) {
            if (themeIdOrTheme instanceof ColorThemeData) {
                themeData = themeIdOrTheme;
            }
            else {
                return null;
            }
        }
        try {
            await themeData.ensureLoaded(this.extensionResourceLoaderService);
            themeData.setCustomizations(this.settings);
            return this.applyTheme(themeData, settingsTarget);
        }
        catch (error) {
            throw new Error(nls.localize('error.cannotloadtheme', "Unable to load {0}: {1}", themeData.location?.toString(), error.message));
        }
    }
    reloadCurrentColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            try {
                const theme = this.colorThemeRegistry.findThemeBySettingsId(this.currentColorTheme.settingsId) || this.currentColorTheme;
                await theme.reload(this.extensionResourceLoaderService);
                theme.setCustomizations(this.settings);
                await this.applyTheme(theme, undefined, false);
            }
            catch (error) {
                this.logService.info('Unable to reload {0}: {1}', this.currentColorTheme.location?.toString());
            }
        });
    }
    async restoreColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            const settingId = this.settings.colorTheme;
            const theme = this.colorThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentColorTheme.settingsId) {
                    await this.internalSetColorTheme(theme.id, undefined);
                }
                else if (theme !== this.currentColorTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService);
                    theme.setCustomizations(this.settings);
                    await this.applyTheme(theme, undefined, true);
                }
                return true;
            }
            return false;
        });
    }
    updateDynamicCSSRules(themeData) {
        const cssRules = new Set();
        const ruleCollector = {
            addRule: (rule) => {
                if (!cssRules.has(rule)) {
                    cssRules.add(rule);
                }
            }
        };
        ruleCollector.addRule(`.monaco-workbench { forced-color-adjust: none; }`);
        themingRegistry.getThemingParticipants().forEach(p => p(themeData, ruleCollector, this.environmentService));
        const colorVariables = [];
        for (const item of getColorRegistry().getColors()) {
            const color = themeData.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        ruleCollector.addRule(`.monaco-workbench { ${colorVariables.join('\n')} }`);
        _applyRules([...cssRules].join('\n'), colorThemeRulesClassName);
    }
    applyTheme(newTheme, settingsTarget, silent = false) {
        this.updateDynamicCSSRules(newTheme);
        if (this.currentColorTheme.id) {
            this.container.classList.remove(...this.currentColorTheme.classNames);
        }
        else {
            this.container.classList.remove(ThemeTypeSelector.VS, ThemeTypeSelector.VS_DARK, ThemeTypeSelector.HC_BLACK, ThemeTypeSelector.HC_LIGHT);
        }
        this.container.classList.add(...newTheme.classNames);
        this.currentColorTheme.clearCaches();
        this.currentColorTheme = newTheme;
        if (!this.colorThemingParticipantChangeListener) {
            this.colorThemingParticipantChangeListener = themingRegistry.onThemingParticipantAdded(_ => this.updateDynamicCSSRules(this.currentColorTheme));
        }
        this.colorThemeWatcher.update(newTheme);
        this.sendTelemetry(newTheme.id, newTheme.extensionData, 'color');
        if (silent) {
            return Promise.resolve(null);
        }
        this.onColorThemeChange.fire(this.currentColorTheme);
        // remember theme data for a quick restore
        if (newTheme.isLoaded && settingsTarget !== 'preview') {
            newTheme.toStorage(this.storageService);
        }
        return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
    }
    sendTelemetry(themeId, themeData, themeType) {
        if (themeData) {
            const key = themeType + themeData.extensionId;
            if (!this.themeExtensionsActivated.get(key)) {
                this.telemetryService.publicLog2('activatePlugin', {
                    id: themeData.extensionId,
                    name: themeData.extensionName,
                    isBuiltin: themeData.extensionIsBuiltin,
                    publisherDisplayName: themeData.extensionPublisher,
                    themeId: themeId
                });
                this.themeExtensionsActivated.set(key, true);
            }
        }
    }
    async getFileIconThemes() {
        return this.fileIconThemeRegistry.getThemes();
    }
    getFileIconTheme() {
        return this.currentFileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this.onFileIconThemeChange.event;
    }
    async setFileIconTheme(iconThemeOrId, settingsTarget) {
        return this.fileIconThemeSequencer.queue(async () => {
            return this.internalSetFileIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetFileIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentFileIconTheme.id || !this.currentFileIconTheme.isLoaded) {
            let newThemeData = this.fileIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof FileIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = FileIconThemeData.noIconTheme;
            }
            await newThemeData.ensureLoaded(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(newThemeData); // updates this.currentFileIconTheme
        }
        const themeData = this.currentFileIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded && settingsTarget !== 'preview' && (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceFileIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.fileIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            await this.currentFileIconTheme.reload(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(this.currentFileIconTheme);
        });
    }
    async restoreFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            const settingId = this.settings.fileIconTheme;
            const theme = this.fileIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentFileIconTheme.settingsId) {
                    await this.internalSetFileIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentFileIconTheme) {
                    await theme.ensureLoaded(this.fileIconThemeLoader);
                    this.applyAndSetFileIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetFileIconTheme(iconThemeData, silent = false) {
        this.currentFileIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, fileIconThemeRulesClassName);
        if (iconThemeData.id) {
            this.container.classList.add(fileIconsEnabledClass);
        }
        else {
            this.container.classList.remove(fileIconsEnabledClass);
        }
        this.fileIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'fileIcon');
        }
        if (!silent) {
            this.onFileIconThemeChange.fire(this.currentFileIconTheme);
        }
    }
    async getProductIconThemes() {
        return this.productIconThemeRegistry.getThemes();
    }
    getProductIconTheme() {
        return this.currentProductIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this.onProductIconThemeChange.event;
    }
    async setProductIconTheme(iconThemeOrId, settingsTarget) {
        return this.productIconThemeSequencer.queue(async () => {
            return this.internalSetProductIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetProductIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentProductIconTheme.id || !this.currentProductIconTheme.isLoaded) {
            let newThemeData = this.productIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof ProductIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = ProductIconThemeData.defaultTheme;
            }
            await newThemeData.ensureLoaded(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(newThemeData); // updates this.currentProductIconTheme
        }
        const themeData = this.currentProductIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded && settingsTarget !== 'preview' && (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceProductIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.productIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            await this.currentProductIconTheme.reload(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(this.currentProductIconTheme);
        });
    }
    async restoreProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            const settingId = this.settings.productIconTheme;
            const theme = this.productIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentProductIconTheme.settingsId) {
                    await this.internalSetProductIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentProductIconTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService, this.logService);
                    this.applyAndSetProductIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetProductIconTheme(iconThemeData, silent = false) {
        this.currentProductIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, productIconThemeRulesClassName);
        this.productIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'productIcon');
        }
        if (!silent) {
            this.onProductIconThemeChange.fire(this.currentProductIconTheme);
        }
    }
};
WorkbenchThemeService = __decorate([
    __param(0, IExtensionService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IFileService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IWorkbenchLayoutService),
    __param(8, ILogService),
    __param(9, IHostColorSchemeService),
    __param(10, IUserDataInitializationService),
    __param(11, ILanguageService)
], WorkbenchThemeService);
export { WorkbenchThemeService };
class ThemeFileWatcher {
    constructor(fileService, environmentService, onUpdate) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.onUpdate = onUpdate;
    }
    update(theme) {
        if (!resources.isEqual(theme.location, this.watchedLocation)) {
            this.dispose();
            if (theme.location && (theme.watch || this.environmentService.isExtensionDevelopment)) {
                this.watchedLocation = theme.location;
                this.watcherDisposable = this.fileService.watch(theme.location);
                this.fileService.onDidFilesChange(e => {
                    if (this.watchedLocation && e.contains(this.watchedLocation, 0 /* FileChangeType.UPDATED */)) {
                        this.onUpdate();
                    }
                });
            }
        }
    }
    dispose() {
        this.watcherDisposable = dispose(this.watcherDisposable);
        this.fileChangeListener = dispose(this.fileChangeListener);
        this.watchedLocation = undefined;
    }
}
function _applyRules(styleSheetContent, rulesClassName) {
    const themeStyles = mainWindow.document.head.getElementsByClassName(rulesClassName);
    if (themeStyles.length === 0) {
        const elStyle = createStyleSheet();
        elStyle.className = rulesClassName;
        elStyle.textContent = styleSheetContent;
    }
    else {
        themeStyles[0].textContent = styleSheetContent;
    }
}
registerColorThemeSchemas();
registerFileIconThemeSchemas();
registerProductIconThemeSchemas();
// The WorkbenchThemeService should stay eager as the constructor restores the
// last used colors / icons from storage. This needs to happen as quickly as possible
// for a flicker-free startup experience.
registerSingleton(IWorkbenchThemeService, WorkbenchThemeService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvYnJvd3Nlci93b3JrYmVuY2hUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBaUQsYUFBYSxFQUFFLGFBQWEsRUFBa0Qsb0JBQW9CLEVBQUUsK0JBQStCLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsUyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUF1QixNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQWUsVUFBVSxJQUFJLGlCQUFpQixFQUFvQixNQUFNLG1EQUFtRCxDQUFDO0FBQ25JLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRixPQUFPLEVBQWUsT0FBTyxFQUFF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