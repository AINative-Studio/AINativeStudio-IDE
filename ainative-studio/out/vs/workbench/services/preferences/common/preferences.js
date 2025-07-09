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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsT0FBTyxFQUFFLDBCQUEwQixFQUFlLE1BQU0sMkJBQTJCLENBQUM7QUFJcEYsTUFBTSxDQUFOLElBQVksZ0JBbUJYO0FBbkJELFdBQVksZ0JBQWdCO0lBQzNCLGlDQUFhLENBQUE7SUFDYixpQ0FBYSxDQUFBO0lBQ2IscUNBQWlCLENBQUE7SUFDakIsd0RBQW9DLENBQUE7SUFDcEMsdUNBQW1CLENBQUE7SUFDbkIscUNBQWlCLENBQUE7SUFDakIsdUNBQW1CLENBQUE7SUFDbkIsbUNBQWUsQ0FBQTtJQUNmLHVDQUFtQixDQUFBO0lBQ25CLHVDQUFtQixDQUFBO0lBQ25CLHVDQUFtQixDQUFBO0lBQ25CLHdEQUFvQyxDQUFBO0lBQ3BDLHNEQUFrQyxDQUFBO0lBQ2xDLHFDQUFpQixDQUFBO0lBQ2pCLG9EQUFnQyxDQUFBO0lBQ2hDLGdEQUE0QixDQUFBO0lBQzVCLHdEQUFvQyxDQUFBO0lBQ3BDLG9EQUFnQyxDQUFBO0FBQ2pDLENBQUMsRUFuQlcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQW1CM0I7QUF5RkQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQVksZ0JBV1g7QUFYRCxXQUFZLGdCQUFnQjtJQUMzQix1REFBUSxDQUFBO0lBQ1IsNkZBQWdDLENBQUE7SUFDaEMscUVBQW9CLENBQUE7SUFDcEIseUdBQXNDLENBQUE7SUFDdEMsNkZBQWdDLENBQUE7SUFDaEMsa0hBQTBDLENBQUE7SUFDMUMsNEdBQXVDLENBQUE7SUFDdkMsb0dBQW1DLENBQUE7SUFDbkMsK0ZBQWdDLENBQUE7SUFDaEMscUVBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQVhXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFXM0I7QUFDRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QjtNQUMxRSxnQkFBZ0IsQ0FBQyw4QkFBOEI7TUFDL0MsZ0JBQWdCLENBQUMsaUNBQWlDO01BQ2xELGdCQUFnQixDQUFDLDZCQUE2QjtNQUM5QyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBMkVoRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsT0FBK0I7SUFDNUUsT0FBTztRQUNOLDJCQUEyQjtRQUMzQixHQUFHLE9BQU87UUFFVixpREFBaUQ7UUFDakQsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7UUFDdkMsTUFBTSxFQUFFLElBQUk7S0FDWixDQUFDO0FBQ0gsQ0FBQztBQWFELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQTRGOUYsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsaUNBQWlDLENBQUM7QUFLckYsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQUM7QUFDNUQsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsd0NBQXdDLENBQUM7QUFDeEYsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsaUNBQWlDLENBQUM7QUFFeEUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDIn0=