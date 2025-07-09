/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
export const COPY_NOTEBOOK_VARIABLE_VALUE_ID = 'workbench.debug.viewlet.action.copyWorkspaceVariableValue';
export const COPY_NOTEBOOK_VARIABLE_VALUE_LABEL = localize('copyWorkspaceVariableValue', "Copy Value");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: COPY_NOTEBOOK_VARIABLE_VALUE_ID,
            title: COPY_NOTEBOOK_VARIABLE_VALUE_LABEL,
            f1: false,
        });
    }
    run(accessor, context) {
        const clipboardService = accessor.get(IClipboardService);
        if (context.value) {
            clipboardService.writeText(context.value);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: '_executeNotebookVariableProvider',
            title: localize('executeNotebookVariableProvider', "Execute Notebook Variable Provider"),
            f1: false,
        });
    }
    async run(accessor, resource) {
        if (!resource) {
            return [];
        }
        const uri = URI.revive(resource);
        const notebookKernelService = accessor.get(INotebookKernelService);
        const notebookService = accessor.get(INotebookService);
        const notebookTextModel = notebookService.getNotebookTextModel(uri);
        if (!notebookTextModel) {
            return [];
        }
        const selectedKernel = notebookKernelService.getMatchingKernel(notebookTextModel).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            const variables = selectedKernel.provideVariables(notebookTextModel.uri, undefined, 'named', 0, CancellationToken.None);
            return await variables
                .map(variable => { return variable; })
                .toPromise();
        }
        return [];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va1ZhcmlhYmxlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUdwRyxPQUFPLEVBQUUsc0JBQXNCLEVBQW1CLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdEUsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsMkRBQTJELENBQUM7QUFDM0csTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3ZHLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF1QjtRQUN0RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV6RCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBR0gsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLG9DQUFvQyxDQUFDO1lBQ3hGLEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxRQUFtQztRQUN4RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVwRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMzRixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMxRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hILE9BQU8sTUFBTSxTQUFTO2lCQUNwQixHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDckMsU0FBUyxFQUFFLENBQUM7UUFDZixDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=