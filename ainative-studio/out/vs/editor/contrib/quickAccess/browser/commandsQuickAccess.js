/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { AbstractCommandsQuickAccessProvider } from '../../../../platform/quickinput/browser/commandsQuickAccess.js';
export class AbstractEditorCommandsQuickAccessProvider extends AbstractCommandsQuickAccessProvider {
    constructor(options, instantiationService, keybindingService, commandService, telemetryService, dialogService) {
        super(options, instantiationService, keybindingService, commandService, telemetryService, dialogService);
    }
    getCodeEditorCommandPicks() {
        const activeTextEditorControl = this.activeTextEditorControl;
        if (!activeTextEditorControl) {
            return [];
        }
        const editorCommandPicks = [];
        for (const editorAction of activeTextEditorControl.getSupportedActions()) {
            let commandDescription;
            if (editorAction.metadata?.description) {
                if (isLocalizedString(editorAction.metadata.description)) {
                    commandDescription = editorAction.metadata.description;
                }
                else {
                    commandDescription = { original: editorAction.metadata.description, value: editorAction.metadata.description };
                }
            }
            editorCommandPicks.push({
                commandId: editorAction.id,
                commandAlias: editorAction.alias,
                commandDescription,
                label: stripIcons(editorAction.label) || editorAction.id,
            });
        }
        return editorCommandPicks;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL2NvbW1hbmRzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBS2pGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBa0QsTUFBTSxnRUFBZ0UsQ0FBQztBQUdySyxNQUFNLE9BQWdCLHlDQUEwQyxTQUFRLG1DQUFtQztJQUUxRyxZQUNDLE9BQW9DLEVBQ3BDLG9CQUEyQyxFQUMzQyxpQkFBcUMsRUFDckMsY0FBK0IsRUFDL0IsZ0JBQW1DLEVBQ25DLGFBQTZCO1FBRTdCLEtBQUssQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzFHLENBQUM7SUFPUyx5QkFBeUI7UUFDbEMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFDN0QsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBd0IsRUFBRSxDQUFDO1FBQ25ELEtBQUssTUFBTSxZQUFZLElBQUksdUJBQXVCLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1lBQzFFLElBQUksa0JBQWdELENBQUM7WUFDckQsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7Z0JBQ3hELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsR0FBRyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDaEgsQ0FBQztZQUNGLENBQUM7WUFDRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLFNBQVMsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDMUIsWUFBWSxFQUFFLFlBQVksQ0FBQyxLQUFLO2dCQUNoQyxrQkFBa0I7Z0JBQ2xCLEtBQUssRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxFQUFFO2FBQ3hELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7Q0FDRCJ9