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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2VsZWN0cm9uLW1haW4vdGhlbWVNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUcxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFekYsZ0RBQWdEO0FBQ2hELGtEQUFrRDtBQUNsRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztBQUNuQyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUM7QUFDbEMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUM7QUFDdEMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUM7QUFFdEMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUM7QUFDbEMsTUFBTSxvQkFBb0IsR0FBRyxp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