/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/style.css';
import { registerThemingParticipant } from '../../platform/theme/common/themeService.js';
import { WORKBENCH_BACKGROUND, TITLE_BAR_ACTIVE_BACKGROUND } from '../common/theme.js';
import { isWeb, isIOS } from '../../base/common/platform.js';
import { createMetaElement } from '../../base/browser/dom.js';
import { isSafari, isStandalone } from '../../base/browser/browser.js';
import { selectionBackground } from '../../platform/theme/common/colorRegistry.js';
import { mainWindow } from '../../base/browser/window.js';
registerThemingParticipant((theme, collector) => {
    // Background (helps for subpixel-antialiasing on Windows)
    const workbenchBackground = WORKBENCH_BACKGROUND(theme);
    collector.addRule(`.monaco-workbench { background-color: ${workbenchBackground}; }`);
    // Selection (do NOT remove - https://github.com/microsoft/vscode/issues/169662)
    const windowSelectionBackground = theme.getColor(selectionBackground);
    if (windowSelectionBackground) {
        collector.addRule(`.monaco-workbench ::selection { background-color: ${windowSelectionBackground}; }`);
    }
    // Update <meta name="theme-color" content=""> based on selected theme
    if (isWeb) {
        const titleBackground = theme.getColor(TITLE_BAR_ACTIVE_BACKGROUND);
        if (titleBackground) {
            const metaElementId = 'monaco-workbench-meta-theme-color';
            let metaElement = mainWindow.document.getElementById(metaElementId);
            if (!metaElement) {
                metaElement = createMetaElement();
                metaElement.name = 'theme-color';
                metaElement.id = metaElementId;
            }
            metaElement.content = titleBackground.toString();
        }
    }
    // We disable user select on the root element, however on Safari this seems
    // to prevent any text selection in the monaco editor. As a workaround we
    // allow to select text in monaco editor instances.
    if (isSafari) {
        collector.addRule(`
			body.web {
				touch-action: none;
			}
			.monaco-workbench .monaco-editor .view-lines {
				user-select: text;
				-webkit-user-select: text;
			}
		`);
    }
    // Update body background color to ensure the home indicator area looks similar to the workbench
    if (isIOS && isStandalone()) {
        collector.addRule(`body { background-color: ${workbenchBackground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvc3R5bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQztBQUMzQixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RixPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTFELDBCQUEwQixDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBRS9DLDBEQUEwRDtJQUMxRCxNQUFNLG1CQUFtQixHQUFHLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hELFNBQVMsQ0FBQyxPQUFPLENBQUMseUNBQXlDLG1CQUFtQixLQUFLLENBQUMsQ0FBQztJQUVyRixnRkFBZ0Y7SUFDaEYsTUFBTSx5QkFBeUIsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDdEUsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO1FBQy9CLFNBQVMsQ0FBQyxPQUFPLENBQUMscURBQXFELHlCQUF5QixLQUFLLENBQUMsQ0FBQztJQUN4RyxDQUFDO0lBRUQsc0VBQXNFO0lBQ3RFLElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDcEUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixNQUFNLGFBQWEsR0FBRyxtQ0FBbUMsQ0FBQztZQUMxRCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQTJCLENBQUM7WUFDOUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixXQUFXLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztnQkFDbEMsV0FBVyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7Z0JBQ2pDLFdBQVcsQ0FBQyxFQUFFLEdBQUcsYUFBYSxDQUFDO1lBQ2hDLENBQUM7WUFFRCxXQUFXLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVELDJFQUEyRTtJQUMzRSx5RUFBeUU7SUFDekUsbURBQW1EO0lBQ25ELElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxTQUFTLENBQUMsT0FBTyxDQUFDOzs7Ozs7OztHQVFqQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsZ0dBQWdHO0lBQ2hHLElBQUksS0FBSyxJQUFJLFlBQVksRUFBRSxFQUFFLENBQUM7UUFDN0IsU0FBUyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsbUJBQW1CLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyJ9