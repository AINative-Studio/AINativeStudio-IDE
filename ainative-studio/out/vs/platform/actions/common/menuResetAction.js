/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { Categories } from '../../action/common/actionCommonCategories.js';
import { Action2, IMenuService } from './actions.js';
import { ILogService } from '../../log/common/log.js';
export class MenuHiddenStatesReset extends Action2 {
    constructor() {
        super({
            id: 'menu.resetHiddenStates',
            title: localize2('title', "Reset All Menus"),
            category: Categories.View,
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IMenuService).resetHiddenStates();
        accessor.get(ILogService).info('did RESET all menu hidden states');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVJlc2V0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvY29tbW9uL21lbnVSZXNldEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXJELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsT0FBTztJQUVqRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDNUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDL0MsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0NBQ0QifQ==