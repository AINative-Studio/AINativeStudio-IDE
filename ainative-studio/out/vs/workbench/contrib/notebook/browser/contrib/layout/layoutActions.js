/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../../controller/coreActions.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
const TOGGLE_CELL_TOOLBAR_POSITION = 'notebook.toggleCellToolbarPosition';
export class ToggleCellToolbarPositionAction extends Action2 {
    constructor() {
        super({
            id: TOGGLE_CELL_TOOLBAR_POSITION,
            title: localize2('notebook.toggleCellToolbarPosition', 'Toggle Cell Toolbar Position'),
            menu: [{
                    id: MenuId.NotebookCellTitle,
                    group: 'View',
                    order: 1
                }],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: false
        });
    }
    async run(accessor, context) {
        const editor = context && context.ui ? context.notebookEditor : undefined;
        if (editor && editor.hasModel()) {
            // from toolbar
            const viewType = editor.textModel.viewType;
            const configurationService = accessor.get(IConfigurationService);
            const toolbarPosition = configurationService.getValue(NotebookSetting.cellToolbarLocation);
            const newConfig = this.togglePosition(viewType, toolbarPosition);
            await configurationService.updateValue(NotebookSetting.cellToolbarLocation, newConfig);
        }
    }
    togglePosition(viewType, toolbarPosition) {
        if (typeof toolbarPosition === 'string') {
            // legacy
            if (['left', 'right', 'hidden'].indexOf(toolbarPosition) >= 0) {
                // valid position
                const newViewValue = toolbarPosition === 'right' ? 'left' : 'right';
                const config = {
                    default: toolbarPosition
                };
                config[viewType] = newViewValue;
                return config;
            }
            else {
                // invalid position
                const config = {
                    default: 'right',
                };
                config[viewType] = 'left';
                return config;
            }
        }
        else {
            const oldValue = toolbarPosition[viewType] ?? toolbarPosition['default'] ?? 'right';
            const newViewValue = oldValue === 'right' ? 'left' : 'right';
            const newConfig = {
                ...toolbarPosition
            };
            newConfig[viewType] = newViewValue;
            return newConfig;
        }
    }
}
registerAction2(ToggleCellToolbarPositionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbGF5b3V0L2xheW91dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsTUFBTSw0QkFBNEIsR0FBRyxvQ0FBb0MsQ0FBQztBQUUxRSxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsT0FBTztJQUMzRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEI7WUFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSw4QkFBOEIsQ0FBQztZQUN0RixJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtvQkFDNUIsS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsRUFBRSxFQUFFLEtBQUs7U0FDVCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE9BQVk7UUFDakQsTUFBTSxNQUFNLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFFLE9BQWtDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDdEcsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDakMsZUFBZTtZQUNmLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1lBQzNDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBcUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDL0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDakUsTUFBTSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWdCLEVBQUUsZUFBbUQ7UUFDbkYsSUFBSSxPQUFPLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxTQUFTO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxpQkFBaUI7Z0JBQ2pCLE1BQU0sWUFBWSxHQUFHLGVBQWUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNwRSxNQUFNLE1BQU0sR0FBOEI7b0JBQ3pDLE9BQU8sRUFBRSxlQUFlO2lCQUN4QixDQUFDO2dCQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUM7Z0JBQ2hDLE9BQU8sTUFBTSxDQUFDO1lBQ2YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG1CQUFtQjtnQkFDbkIsTUFBTSxNQUFNLEdBQThCO29CQUN6QyxPQUFPLEVBQUUsT0FBTztpQkFDaEIsQ0FBQztnQkFDRixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDO2dCQUMxQixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDO1lBQ3BGLE1BQU0sWUFBWSxHQUFHLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzdELE1BQU0sU0FBUyxHQUFHO2dCQUNqQixHQUFHLGVBQWU7YUFDbEIsQ0FBQztZQUNGLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUVGLENBQUM7Q0FDRDtBQUNELGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDIn0=