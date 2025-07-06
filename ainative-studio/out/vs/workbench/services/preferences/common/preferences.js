/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
export var SettingValueType;
(function (SettingValueType) {
    SettingValueType["Null"] = "null";
    SettingValueType["Enum"] = "enum";
    SettingValueType["String"] = "string";
    SettingValueType["MultilineString"] = "multiline-string";
    SettingValueType["Integer"] = "integer";
    SettingValueType["Number"] = "number";
    SettingValueType["Boolean"] = "boolean";
    SettingValueType["Array"] = "array";
    SettingValueType["Exclude"] = "exclude";
    SettingValueType["Include"] = "include";
    SettingValueType["Complex"] = "complex";
    SettingValueType["NullableInteger"] = "nullable-integer";
    SettingValueType["NullableNumber"] = "nullable-number";
    SettingValueType["Object"] = "object";
    SettingValueType["BooleanObject"] = "boolean-object";
    SettingValueType["LanguageTag"] = "language-tag";
    SettingValueType["ExtensionToggle"] = "extension-toggle";
    SettingValueType["ComplexObject"] = "complex-object";
})(SettingValueType || (SettingValueType = {}));
/**
 * The ways a setting could match a query,
 * sorted in increasing order of relevance.
 */
export var SettingMatchType;
(function (SettingMatchType) {
    SettingMatchType[SettingMatchType["None"] = 0] = "None";
    SettingMatchType[SettingMatchType["LanguageTagSettingMatch"] = 1] = "LanguageTagSettingMatch";
    SettingMatchType[SettingMatchType["RemoteMatch"] = 2] = "RemoteMatch";
    SettingMatchType[SettingMatchType["NonContiguousQueryInSettingId"] = 4] = "NonContiguousQueryInSettingId";
    SettingMatchType[SettingMatchType["DescriptionOrValueMatch"] = 8] = "DescriptionOrValueMatch";
    SettingMatchType[SettingMatchType["NonContiguousWordsInSettingsLabel"] = 16] = "NonContiguousWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ContiguousWordsInSettingsLabel"] = 32] = "ContiguousWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ContiguousQueryInSettingId"] = 64] = "ContiguousQueryInSettingId";
    SettingMatchType[SettingMatchType["AllWordsInSettingsLabel"] = 128] = "AllWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ExactMatch"] = 256] = "ExactMatch";
})(SettingMatchType || (SettingMatchType = {}));
export const SettingKeyMatchTypes = (SettingMatchType.AllWordsInSettingsLabel
    | SettingMatchType.ContiguousWordsInSettingsLabel
    | SettingMatchType.NonContiguousWordsInSettingsLabel
    | SettingMatchType.NonContiguousQueryInSettingId
    | SettingMatchType.ContiguousQueryInSettingId);
export function validateSettingsEditorOptions(options) {
    return {
        // Inherit provided options
        ...options,
        // Enforce some options for settings specifically
        override: DEFAULT_EDITOR_ASSOCIATION.id,
        pinned: true
    };
}
export const IPreferencesService = createDecorator('preferencesService');
export const DEFINE_KEYBINDING_EDITOR_CONTRIB_ID = 'editor.contrib.defineKeybinding';
export const FOLDER_SETTINGS_PATH = '.vscode/settings.json';
export const DEFAULT_SETTINGS_EDITOR_SETTING = 'workbench.settings.openDefaultSettings';
export const USE_SPLIT_JSON_SETTING = 'workbench.settings.useSplitJSON';
export const SETTINGS_AUTHORITY = 'settings';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFjaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBZSxNQUFNLDJCQUEyQixDQUFDO0FBSXBGLE1BQU0sQ0FBTixJQUFZLGdCQW1CWDtBQW5CRCxXQUFZLGdCQUFnQjtJQUMzQixpQ0FBYSxDQUFBO0lBQ2IsaUNBQWEsQ0FBQTtJQUNiLHFDQUFpQixDQUFBO0lBQ2pCLHdEQUFvQyxDQUFBO0lBQ3BDLHVDQUFtQixDQUFBO0lBQ25CLHFDQUFpQixDQUFBO0lBQ2pCLHVDQUFtQixDQUFBO0lBQ25CLG1DQUFlLENBQUE7SUFDZix1Q0FBbUIsQ0FBQTtJQUNuQix1Q0FBbUIsQ0FBQTtJQUNuQix1Q0FBbUIsQ0FBQTtJQUNuQix3REFBb0MsQ0FBQTtJQUNwQyxzREFBa0MsQ0FBQTtJQUNsQyxxQ0FBaUIsQ0FBQTtJQUNqQixvREFBZ0MsQ0FBQTtJQUNoQyxnREFBNEIsQ0FBQTtJQUM1Qix3REFBb0MsQ0FBQTtJQUNwQyxvREFBZ0MsQ0FBQTtBQUNqQyxDQUFDLEVBbkJXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFtQjNCO0FBeUZEOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFZLGdCQVdYO0FBWEQsV0FBWSxnQkFBZ0I7SUFDM0IsdURBQVEsQ0FBQTtJQUNSLDZGQUFnQyxDQUFBO0lBQ2hDLHFFQUFvQixDQUFBO0lBQ3BCLHlHQUFzQyxDQUFBO0lBQ3RDLDZGQUFnQyxDQUFBO0lBQ2hDLGtIQUEwQyxDQUFBO0lBQzFDLDRHQUF1QyxDQUFBO0lBQ3ZDLG9HQUFtQyxDQUFBO0lBQ25DLCtGQUFnQyxDQUFBO0lBQ2hDLHFFQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFYVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBVzNCO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUI7TUFDMUUsZ0JBQWdCLENBQUMsOEJBQThCO01BQy9DLGdCQUFnQixDQUFDLGlDQUFpQztNQUNsRCxnQkFBZ0IsQ0FBQyw2QkFBNkI7TUFDOUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQTJFaEQsTUFBTSxVQUFVLDZCQUE2QixDQUFDLE9BQStCO0lBQzVFLE9BQU87UUFDTiwyQkFBMkI7UUFDM0IsR0FBRyxPQUFPO1FBRVYsaURBQWlEO1FBQ2pELFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFO1FBQ3ZDLE1BQU0sRUFBRSxJQUFJO0tBQ1osQ0FBQztBQUNILENBQUM7QUFhRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUE0RjlGLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLGlDQUFpQyxDQUFDO0FBS3JGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDO0FBQzVELE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLHdDQUF3QyxDQUFDO0FBQ3hGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGlDQUFpQyxDQUFDO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyJ9