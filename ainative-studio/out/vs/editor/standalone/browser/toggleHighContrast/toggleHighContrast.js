/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { IStandaloneThemeService } from '../../common/standaloneTheme.js';
import { ToggleHighContrastNLS } from '../../../common/standaloneStrings.js';
import { isDark, isHighContrast } from '../../../../platform/theme/common/theme.js';
import { HC_BLACK_THEME_NAME, HC_LIGHT_THEME_NAME, VS_DARK_THEME_NAME, VS_LIGHT_THEME_NAME } from '../standaloneThemeService.js';
class ToggleHighContrast extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.toggleHighContrast',
            label: ToggleHighContrastNLS.toggleHighContrast,
            alias: 'Toggle High Contrast Theme',
            precondition: undefined
        });
        this._originalThemeName = null;
    }
    run(accessor, editor) {
        const standaloneThemeService = accessor.get(IStandaloneThemeService);
        const currentTheme = standaloneThemeService.getColorTheme();
        if (isHighContrast(currentTheme.type)) {
            // We must toggle back to the integrator's theme
            standaloneThemeService.setTheme(this._originalThemeName || (isDark(currentTheme.type) ? VS_DARK_THEME_NAME : VS_LIGHT_THEME_NAME));
            this._originalThemeName = null;
        }
        else {
            standaloneThemeService.setTheme(isDark(currentTheme.type) ? HC_BLACK_THEME_NAME : HC_LIGHT_THEME_NAME);
            this._originalThemeName = currentTheme.themeName;
        }
    }
}
registerEditorAction(ToggleHighContrast);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlSGlnaENvbnRyYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvdG9nZ2xlSGlnaENvbnRyYXN0L3RvZ2dsZUhpZ2hDb250cmFzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFvQixvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFakksTUFBTSxrQkFBbUIsU0FBUSxZQUFZO0lBSTVDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUscUJBQXFCLENBQUMsa0JBQWtCO1lBQy9DLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQsTUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDckUsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUQsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdkMsZ0RBQWdEO1lBQ2hELHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQ25JLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDdkcsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLENBQUMifQ==