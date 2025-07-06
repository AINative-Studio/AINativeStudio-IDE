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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBdUI3RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDBCQUEwQixDQUFDLENBQUM7QUFpQmhILE1BQU0sQ0FBQyxNQUFNLDRDQUE0QyxHQUFHLG9DQUFvQyxDQUFDO0FBQ2pHLE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLGlDQUFpQyxDQUFDO0FBQzNGLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGdDQUFnQyxDQUFDO0FBRXhGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzdGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RHLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFVLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ25HLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUks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