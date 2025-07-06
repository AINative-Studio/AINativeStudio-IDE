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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL3ZhcmlhYmxlc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RyxPQUFPLEtBQUssS0FBSyxNQUFNLHFCQUFxQixDQUFDO0FBRTdDLE9BQU8sRUFBMEIsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFMUUsTUFBTSw4QkFBOEIsR0FBRyw0QkFBNEIsQ0FBQztBQUVwRSxlQUFlLENBQUMsTUFBTSx1QkFBd0IsU0FBUSxjQUFjO0lBRW5FO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUUsU0FBUyxDQUFDLG1DQUFtQyxFQUFFLFdBQVcsQ0FBQztZQUNsRSxJQUFJLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsNEJBQTRCO29CQUM1QiwwRUFBMEU7b0JBQzFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLEVBQzFELDhCQUE4QixDQUM5QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQ1QsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qiw0QkFBNEI7b0JBQzVCLDBFQUEwRTtvQkFDMUUsY0FBYyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsRUFDMUQsY0FBYyxDQUFDLFNBQVMsQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsRUFDL0QsOEJBQThCLENBQzlCO2lCQUNEO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDVCxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDRCQUE0QjtvQkFDNUIsMEVBQTBFO29CQUMxRSxjQUFjLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxFQUMxRCxjQUFjLENBQUMsTUFBTSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxFQUM1RCw4QkFBOEIsQ0FDOUI7aUJBQ0Q7YUFDRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBK0I7UUFDeEYsTUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUM7UUFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRCxDQUFDLENBQUMifQ==