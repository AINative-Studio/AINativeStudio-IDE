/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escape } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
import { ThemeSettingDefaults } from '../../../../services/themes/common/workbenchThemeService.js';
export default () => `
<checklist>
	<div class="theme-picker-row">
		<checkbox when-checked="setTheme:${ThemeSettingDefaults.COLOR_THEME_DARK}" checked-on="config.workbench.colorTheme == '${ThemeSettingDefaults.COLOR_THEME_DARK}'">
			<img width="200" src="./dark.png"/>
			${escape(localize('dark', "Dark Modern"))}
		</checkbox>
		<checkbox when-checked="setTheme:${ThemeSettingDefaults.COLOR_THEME_LIGHT}" checked-on="config.workbench.colorTheme == '${ThemeSettingDefaults.COLOR_THEME_LIGHT}'">
			<img width="200" src="./light.png"/>
			${escape(localize('light', "Light Modern"))}
		</checkbox>
	</div>
	<div class="theme-picker-row">
		<checkbox when-checked="setTheme:${ThemeSettingDefaults.COLOR_THEME_HC_DARK}" checked-on="config.workbench.colorTheme == '${ThemeSettingDefaults.COLOR_THEME_HC_DARK}'">
			<img width="200" src="./dark-hc.png"/>
			${escape(localize('HighContrast', "Dark High Contrast"))}
		</checkbox>
		<checkbox when-checked="setTheme:${ThemeSettingDefaults.COLOR_THEME_HC_LIGHT}" checked-on="config.workbench.colorTheme == '${ThemeSettingDefaults.COLOR_THEME_HC_LIGHT}'">
			<img width="200" src="./light-hc.png"/>
			${escape(localize('HighContrastLight', "Light High Contrast"))}
		</checkbox>
	</div>
</checklist>
<checkbox class="theme-picker-link" when-checked="command:workbench.action.selectTheme" checked-on="false">
	${escape(localize('seeMore', "See More Themes..."))}
</checkbox>
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVfcGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9jb21tb24vbWVkaWEvdGhlbWVfcGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFbkcsZUFBZSxHQUFHLEVBQUUsQ0FBQzs7O3FDQUdnQixvQkFBb0IsQ0FBQyxnQkFBZ0IsaURBQWlELG9CQUFvQixDQUFDLGdCQUFnQjs7S0FFM0osTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7O3FDQUVQLG9CQUFvQixDQUFDLGlCQUFpQixpREFBaUQsb0JBQW9CLENBQUMsaUJBQWlCOztLQUU3SixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQzs7OztxQ0FJVCxvQkFBb0IsQ0FBQyxtQkFBbUIsaURBQWlELG9CQUFvQixDQUFDLG1CQUFtQjs7S0FFakssTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLENBQUMsQ0FBQzs7cUNBRXRCLG9CQUFvQixDQUFDLG9CQUFvQixpREFBaUQsb0JBQW9CLENBQUMsb0JBQW9COztLQUVuSyxNQUFNLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDLENBQUM7Ozs7O0dBSzlELE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7O0NBRW5ELENBQUMifQ==