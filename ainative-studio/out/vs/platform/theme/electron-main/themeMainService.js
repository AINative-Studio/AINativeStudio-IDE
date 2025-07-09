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
import electron from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IStateService } from '../../state/node/state.js';
import { ThemeTypeSelector } from '../common/theme.js';
import { coalesce } from '../../../base/common/arrays.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
// These default colors match our default themes
// editor background color ("Dark Modern", etc...)
const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1F1F1F';
const DEFAULT_BG_HC_BLACK = '#000000';
const DEFAULT_BG_HC_LIGHT = '#FFFFFF';
const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';
const THEME_WINDOW_SPLASH_KEY = 'windowSplash';
const THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY = 'windowSplashWorkspaceOverride';
var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings.DETECT_COLOR_SCHEME = 'window.autoDetectColorScheme';
    ThemeSettings.DETECT_HC = 'window.autoDetectHighContrast';
    ThemeSettings.SYSTEM_COLOR_THEME = 'window.systemColorTheme';
})(ThemeSettings || (ThemeSettings = {}));
export const IThemeMainService = createDecorator('themeMainService');
let ThemeMainService = class ThemeMainService extends Disposable {
    constructor(stateService, configurationService) {
        super();
        this.stateService = stateService;
        this.configurationService = configurationService;
        this._onDidChangeColorScheme = this._register(new Emitter());
        this.onDidChangeColorScheme = this._onDidChangeColorScheme.event;
        // System Theme
        if (!isLinux) {
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME) || e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)) {
                    this.updateSystemColorTheme();
                }
            }));
        }
        this.updateSystemColorTheme();
        // Color Scheme changes
        this._register(Event.fromNodeEventEmitter(electron.nativeTheme, 'updated')(() => this._onDidChangeColorScheme.fire(this.getColorScheme())));
    }
    updateSystemColorTheme() {
        if (isLinux || this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            // only with `system` we can detect the system color scheme
            electron.nativeTheme.themeSource = 'system';
        }
        else {
            switch (this.configurationService.getValue(ThemeSettings.SYSTEM_COLOR_THEME)) {
                case 'dark':
                    electron.nativeTheme.themeSource = 'dark';
                    break;
                case 'light':
                    electron.nativeTheme.themeSource = 'light';
                    break;
                case 'auto':
                    switch (this.getPreferredBaseTheme() ?? this.getStoredBaseTheme()) {
                        case ThemeTypeSelector.VS:
                            electron.nativeTheme.themeSource = 'light';
                            break;
                        case ThemeTypeSelector.VS_DARK:
                            electron.nativeTheme.themeSource = 'dark';
                            break;
                        default: electron.nativeTheme.themeSource = 'system';
                    }
                    break;
                default:
                    electron.nativeTheme.themeSource = 'system';
                    break;
            }
        }
    }
    getColorScheme() {
        if (isWindows) {
            // high contrast is reflected by the shouldUseInvertedColorScheme property
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                // shouldUseInvertedColorScheme is dark, !shouldUseInvertedColorScheme is light
                return { dark: electron.nativeTheme.shouldUseInvertedColorScheme, highContrast: true };
            }
        }
        else if (isMacintosh) {
            // high contrast is set if one of shouldUseInvertedColorScheme or shouldUseHighContrastColors is set, reflecting the 'Invert colours' and `Increase contrast` settings in MacOS
            if (electron.nativeTheme.shouldUseInvertedColorScheme || electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: electron.nativeTheme.shouldUseDarkColors, highContrast: true };
            }
        }
        else if (isLinux) {
            // ubuntu gnome seems to have 3 states, light dark and high contrast
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: true, highContrast: true };
            }
        }
        return {
            dark: electron.nativeTheme.shouldUseDarkColors,
            highContrast: false
        };
    }
    getPreferredBaseTheme() {
        const colorScheme = this.getColorScheme();
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && colorScheme.highContrast) {
            return colorScheme.dark ? ThemeTypeSelector.HC_BLACK : ThemeTypeSelector.HC_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return colorScheme.dark ? ThemeTypeSelector.VS_DARK : ThemeTypeSelector.VS;
        }
        return undefined;
    }
    getBackgroundColor() {
        const preferred = this.getPreferredBaseTheme();
        const stored = this.getStoredBaseTheme();
        // If the stored theme has the same base as the preferred, we can return the stored background
        if (preferred === undefined || preferred === stored) {
            const storedBackground = this.stateService.getItem(THEME_BG_STORAGE_KEY, null);
            if (storedBackground) {
                return storedBackground;
            }
        }
        // Otherwise we return the default background for the preferred base theme. If there's no preferred, use the stored one.
        switch (preferred ?? stored) {
            case ThemeTypeSelector.VS: return DEFAULT_BG_LIGHT;
            case ThemeTypeSelector.HC_BLACK: return DEFAULT_BG_HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return DEFAULT_BG_HC_LIGHT;
            default: return DEFAULT_BG_DARK;
        }
    }
    getStoredBaseTheme() {
        const baseTheme = this.stateService.getItem(THEME_STORAGE_KEY, ThemeTypeSelector.VS_DARK).split(' ')[0];
        switch (baseTheme) {
            case ThemeTypeSelector.VS: return ThemeTypeSelector.VS;
            case ThemeTypeSelector.HC_BLACK: return ThemeTypeSelector.HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return ThemeTypeSelector.HC_LIGHT;
            default: return ThemeTypeSelector.VS_DARK;
        }
    }
    saveWindowSplash(windowId, workspace, splash) {
        // Update override as needed
        const splashOverride = this.updateWindowSplashOverride(workspace, splash);
        // Update in storage
        this.stateService.setItems(coalesce([
            { key: THEME_STORAGE_KEY, data: splash.baseTheme },
            { key: THEME_BG_STORAGE_KEY, data: splash.colorInfo.background },
            { key: THEME_WINDOW_SPLASH_KEY, data: splash },
            splashOverride ? { key: THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY, data: splashOverride } : undefined
        ]));
        // Update in opened windows
        if (typeof windowId === 'number') {
            this.updateBackgroundColor(windowId, splash);
        }
        // Update system theme
        this.updateSystemColorTheme();
    }
    updateWindowSplashOverride(workspace, splash) {
        let splashOverride = undefined;
        let changed = false;
        if (workspace) {
            splashOverride = { ...this.getWindowSplashOverride() }; // make a copy for modifications
            const [auxiliarySideBarWidth, workspaceIds] = splashOverride.layoutInfo.auxiliarySideBarWidth;
            if (splash.layoutInfo?.auxiliarySideBarWidth) {
                if (auxiliarySideBarWidth !== splash.layoutInfo.auxiliarySideBarWidth) {
                    splashOverride.layoutInfo.auxiliarySideBarWidth[0] = splash.layoutInfo.auxiliarySideBarWidth;
                    changed = true;
                }
                if (!workspaceIds.includes(workspace.id)) {
                    workspaceIds.push(workspace.id);
                    changed = true;
                }
            }
            else {
                const index = workspaceIds.indexOf(workspace.id);
                if (index > -1) {
                    workspaceIds.splice(index, 1);
                    changed = true;
                }
            }
        }
        return changed ? splashOverride : undefined;
    }
    updateBackgroundColor(windowId, splash) {
        for (const window of getAllWindowsExcludingOffscreen()) {
            if (window.id === windowId) {
                window.setBackgroundColor(splash.colorInfo.background);
                break;
            }
        }
    }
    getWindowSplash(workspace) {
        const partSplash = this.stateService.getItem(THEME_WINDOW_SPLASH_KEY);
        if (!partSplash?.layoutInfo) {
            return partSplash; // return early: overrides currently only apply to layout info
        }
        // Apply workspace specific overrides
        let auxiliarySideBarWidthOverride;
        if (workspace) {
            const [auxiliarySideBarWidth, workspaceIds] = this.getWindowSplashOverride().layoutInfo.auxiliarySideBarWidth;
            if (workspaceIds.includes(workspace.id)) {
                auxiliarySideBarWidthOverride = auxiliarySideBarWidth;
            }
        }
        return {
            ...partSplash,
            layoutInfo: {
                ...partSplash.layoutInfo,
                // Only apply an auxiliary bar width when we have a workspace specific
                // override. Auxiliary bar is not visible by default unless explicitly
                // opened in a workspace.
                auxiliarySideBarWidth: typeof auxiliarySideBarWidthOverride === 'number' ? auxiliarySideBarWidthOverride : 0
            }
        };
    }
    getWindowSplashOverride() {
        return this.stateService.getItem(THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY, { layoutInfo: { auxiliarySideBarWidth: [0, []] } });
    }
};
ThemeMainService = __decorate([
    __param(0, IStateService),
    __param(1, IConfigurationService)
], ThemeMainService);
export { ThemeMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9lbGVjdHJvbi1tYWluL3RoZW1lTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpGLGdEQUFnRDtBQUNoRCxrREFBa0Q7QUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7QUFDbkMsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDO0FBQ2xDLE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDO0FBQ3RDLE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDO0FBRXRDLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDO0FBQ2xDLE1BQU0sb0JBQW9CLEdBQUcs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