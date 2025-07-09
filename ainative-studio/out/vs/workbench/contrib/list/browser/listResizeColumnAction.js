/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TableColumnResizeQuickPick } from './tableColumnResizeQuickPick.js';
import { Table } from '../../../../base/browser/ui/table/tableWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchListFocusContextKey } from '../../../../platform/list/browser/listService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
export class ListResizeColumnAction extends Action2 {
    constructor() {
        super({
            id: 'list.resizeColumn',
            title: { value: localize('list.resizeColumn', "Resize Column"), original: 'Resize Column' },
            category: { value: localize('list', "List"), original: 'List' },
            precondition: WorkbenchListFocusContextKey,
            f1: true
        });
    }
    async run(accessor) {
        const listService = accessor.get(IListService);
        const instantiationService = accessor.get(IInstantiationService);
        const list = listService.lastFocusedList;
        if (list instanceof Table) {
            await instantiationService.createInstance(TableColumnResizeQuickPick, list).show();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFJlc2l6ZUNvbHVtbkFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9saXN0L2Jyb3dzZXIvbGlzdFJlc2l6ZUNvbHVtbkFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxPQUFPO0lBQ2xEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUU7WUFDM0YsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRTtZQUMvRCxZQUFZLEVBQUUsNEJBQTRCO1lBQzFDLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVqRSxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDO1FBQ3pDLElBQUksSUFBSSxZQUFZLEtBQUssRUFBRSxDQUFDO1lBQzNCLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==