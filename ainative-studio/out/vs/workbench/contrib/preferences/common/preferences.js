/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IPreferencesSearchService = createDecorator('preferencesSearchService');
export const SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'settings.action.clearSearchResults';
export const SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU = 'settings.action.showContextMenu';
export const SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS = 'settings.action.suggestFilters';
export const CONTEXT_SETTINGS_EDITOR = new RawContextKey('inSettingsEditor', false);
export const CONTEXT_SETTINGS_JSON_EDITOR = new RawContextKey('inSettingsJSONEditor', false);
export const CONTEXT_SETTINGS_SEARCH_FOCUS = new RawContextKey('inSettingsSearch', false);
export const CONTEXT_TOC_ROW_FOCUS = new RawContextKey('settingsTocRowFocus', false);
export const CONTEXT_SETTINGS_ROW_FOCUS = new RawContextKey('settingRowFocus', false);
export const CONTEXT_KEYBINDINGS_EDITOR = new RawContextKey('inKeybindings', false);
export const CONTEXT_KEYBINDINGS_SEARCH_FOCUS = new RawContextKey('inKeybindingsSearch', false);
export const CONTEXT_KEYBINDING_FOCUS = new RawContextKey('keybindingFocus', false);
export const CONTEXT_WHEN_FOCUS = new RawContextKey('whenFocus', false);
export const KEYBINDINGS_EDITOR_COMMAND_SEARCH = 'keybindings.editor.searchKeybindings';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'keybindings.editor.clearSearchResults';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_HISTORY = 'keybindings.editor.clearSearchHistory';
export const KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS = 'keybindings.editor.recordSearchKeys';
export const KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE = 'keybindings.editor.toggleSortByPrecedence';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE = 'keybindings.editor.defineKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_ADD = 'keybindings.editor.addKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN = 'keybindings.editor.defineWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_ACCEPT_WHEN = 'keybindings.editor.acceptWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REJECT_WHEN = 'keybindings.editor.rejectWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REMOVE = 'keybindings.editor.removeKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_RESET = 'keybindings.editor.resetKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_COPY = 'keybindings.editor.copyKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND = 'keybindings.editor.copyCommandKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE = 'keybindings.editor.copyCommandTitle';
export const KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR = 'keybindings.editor.showConflicts';
export const KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS = 'keybindings.editor.focusKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS = 'keybindings.editor.showDefaultKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS = 'keybindings.editor.showUserKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_EXTENSION_KEYBINDINGS = 'keybindings.editor.showExtensionKeybindings';
export const MODIFIED_SETTING_TAG = 'modified';
export const EXTENSION_SETTING_TAG = 'ext:';
export const FEATURE_SETTING_TAG = 'feature:';
export const ID_SETTING_TAG = 'id:';
export const LANGUAGE_SETTING_TAG = 'lang:';
export const GENERAL_TAG_SETTING_TAG = 'tag:';
export const POLICY_SETTING_TAG = 'hasPolicy';
export const WORKSPACE_TRUST_SETTING_TAG = 'workspaceTrust';
export const REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG = 'requireTrustedWorkspace';
export const KEYBOARD_LAYOUT_OPEN_PICKER = 'workbench.action.openKeyboardLayoutPicker';
export const ENABLE_LANGUAGE_FILTER = true;
export const ENABLE_EXTENSION_TOGGLE_SETTINGS = true;
export const EXTENSION_FETCH_TIMEOUT_MS = 1000;
let cachedExtensionToggleData;
export async function getExperimentalExtensionToggleData(extensionGalleryService, productService) {
    if (!ENABLE_EXTENSION_TOGGLE_SETTINGS) {
        return undefined;
    }
    if (!extensionGalleryService.isEnabled()) {
        return undefined;
    }
    if (cachedExtensionToggleData) {
        return cachedExtensionToggleData;
    }
    if (productService.extensionRecommendations && productService.commonlyUsedSettings) {
        const settingsEditorRecommendedExtensions = {};
        Object.keys(productService.extensionRecommendations).forEach(extensionId => {
            const extensionInfo = productService.extensionRecommendations[extensionId];
            if (extensionInfo.onSettingsEditorOpen) {
                settingsEditorRecommendedExtensions[extensionId] = extensionInfo;
            }
        });
        const recommendedExtensionsGalleryInfo = {};
        for (const key in settingsEditorRecommendedExtensions) {
            const extensionId = key;
            // Recommend prerelease if not on Stable.
            const isStable = productService.quality === 'stable';
            try {
                const extensions = await raceTimeout(extensionGalleryService.getExtensions([{ id: extensionId, preRelease: !isStable }], CancellationToken.None), EXTENSION_FETCH_TIMEOUT_MS);
                if (extensions?.length === 1) {
                    recommendedExtensionsGalleryInfo[key] = extensions[0];
                }
                else {
                    // same as network connection fail. we do not want a blank settings page: https://github.com/microsoft/vscode/issues/195722
                    // so instead of returning partial data we return undefined here
                    return undefined;
                }
            }
            catch (e) {
                // Network connection fail. Return nothing rather than partial data.
                return undefined;
            }
        }
        cachedExtensionToggleData = {
            settingsEditorRecommendedExtensions,
            recommendedExtensionsGalleryInfo,
            commonlyUsed: productService.commonlyUsedSettings
        };
        return cachedExtensionToggleData;
    }
    return undefined;
}
/**
 * Compares two nullable numbers such that null values always come after defined ones.
 */
export function compareTwoNullableNumbers(a, b) {
    const aOrMax = a ?? Number.MAX_SAFE_INTEGER;
    const bOrMax = b ?? Number.MAX_SAFE_INTEGER;
    if (aOrMax < bOrMax) {
        return -1;
    }
    else if (aOrMax > bOrMax) {
        return 1;
    }
    else {
        return 0;
    }
}
export const PREVIEW_INDICATOR_DESCRIPTION = localize('previewIndicatorDescription', "Preview setting: this setting controls a new feature that is still under refinement yet ready to use. Feedback is welcome.");
export const EXPERIMENTAL_INDICATOR_DESCRIPTION = localize('experimentalIndicatorDescription', "Experimental setting: this setting controls a new feature that is actively being developed and may be unstable. It is subject to change or removal.");
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvY29tbW9uL3ByZWZlcmVuY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQXVCN0YsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwwQkFBMEIsQ0FBQyxDQUFDO0FBaUJoSCxNQUFNLENBQUMsTUFBTSw0Q0FBNEMsR0FBRyxvQ0FBb0MsQ0FBQztBQUNqRyxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FBRyxpQ0FBaUMsQ0FBQztBQUMzRixNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRyxnQ0FBZ0MsQ0FBQztBQUV4RixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3RixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN0RyxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNuRyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJ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