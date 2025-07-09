/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { KERNEL_HAS_VARIABLE_PROVIDER } from '../../common/notebookContextKeys.js';
import { NOTEBOOK_VARIABLE_VIEW_ENABLED } from '../contrib/notebookVariables/notebookVariableContextKeys.js';
import * as icons from '../notebookIcons.js';
import { NotebookAction } from './coreActions.js';
const OPEN_VARIABLES_VIEW_COMMAND_ID = 'notebook.openVariablesView';
registerAction2(class OpenVariablesViewAction extends NotebookAction {
    constructor() {
        super({
            id: OPEN_VARIABLES_VIEW_COMMAND_ID,
            title: localize2('notebookActions.openVariablesView', "Variables"),
            icon: icons.variablesViewIcon,
            menu: [
                {
                    id: MenuId.InteractiveToolbar,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), NOTEBOOK_VARIABLE_VIEW_ENABLED)
                },
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true), NOTEBOOK_VARIABLE_VIEW_ENABLED)
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), ContextKeyExpr.equals('config.notebook.globalToolbar', true), NOTEBOOK_VARIABLE_VIEW_ENABLED)
                }
            ]
        });
    }
    async runWithContext(accessor, context) {
        const variableViewId = 'workbench.notebook.variables';
        accessor.get(IViewsService).openView(variableViewId, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvdmFyaWFibGVzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdHLE9BQU8sS0FBSyxLQUFLLE1BQU0scUJBQXFCLENBQUM7QUFFN0MsT0FBTyxFQUEwQixjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUxRSxNQUFNLDhCQUE4QixHQUFHLDRCQUE0QixDQUFDO0FBRXBFLGVBQWUsQ0FBQyxNQUFNLHVCQUF3QixTQUFRLGNBQWM7SUFFbkU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOEJBQThCO1lBQ2xDLEtBQUssRUFBRSxTQUFTLENBQUMsbUNBQW1DLEVBQUUsV0FBVyxDQUFDO1lBQ2xFLElBQUksRUFBRSxLQUFLLENBQUMsaUJBQWlCO1lBQzdCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qiw0QkFBNEI7b0JBQzVCLDBFQUEwRTtvQkFDMUUsY0FBYyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsRUFDMUQsOEJBQThCLENBQzlCO2lCQUNEO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDVCxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDRCQUE0QjtvQkFDNUIsMEVBQTBFO29CQUMxRSxjQUFjLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxFQUMxRCxjQUFjLENBQUMsU0FBUyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxFQUMvRCw4QkFBOEIsQ0FDOUI7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO29CQUMxQixLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNULEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsNEJBQTRCO29CQUM1QiwwRUFBMEU7b0JBQzFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLEVBQzFELGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLEVBQzVELDhCQUE4QixDQUM5QjtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBMEIsRUFBRSxPQUErQjtRQUN4RixNQUFNLGNBQWMsR0FBRyw4QkFBOEIsQ0FBQztRQUN0RCxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQztDQUNELENBQUMsQ0FBQyJ9