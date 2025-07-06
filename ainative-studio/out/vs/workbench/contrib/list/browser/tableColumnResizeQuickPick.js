/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
let TableColumnResizeQuickPick = class TableColumnResizeQuickPick extends Disposable {
    constructor(_table, _quickInputService) {
        super();
        this._table = _table;
        this._quickInputService = _quickInputService;
    }
    async show() {
        const items = [];
        this._table.getColumnLabels().forEach((label, index) => {
            if (label) {
                items.push({ label, index });
            }
        });
        const column = await this._quickInputService.pick(items, { placeHolder: localize('table.column.selection', "Select the column to resize, type to filter.") });
        if (!column) {
            return;
        }
        const value = await this._quickInputService.input({
            placeHolder: localize('table.column.resizeValue.placeHolder', "i.e. 20, 60, 100..."),
            prompt: localize('table.column.resizeValue.prompt', "Please enter a width in percentage for the '{0}' column.", column.label),
            validateInput: (input) => this._validateColumnResizeValue(input)
        });
        const percentageValue = value ? Number.parseInt(value) : undefined;
        if (!percentageValue) {
            return;
        }
        this._table.resizeColumn(column.index, percentageValue);
    }
    async _validateColumnResizeValue(input) {
        const percentage = Number.parseInt(input);
        if (input && !Number.isInteger(percentage)) {
            return localize('table.column.resizeValue.invalidType', "Please enter an integer.");
        }
        else if (percentage < 0 || percentage > 100) {
            return localize('table.column.resizeValue.invalidRange', "Please enter a number greater than 0 and less than or equal to 100.");
        }
        return null;
    }
};
TableColumnResizeQuickPick = __decorate([
    __param(1, IQuickInputService)
], TableColumnResizeQuickPick);
export { TableColumnResizeQuickPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVDb2x1bW5SZXNpemVRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9saXN0L2Jyb3dzZXIvdGFibGVDb2x1bW5SZXNpemVRdWlja1BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0sc0RBQXNELENBQUM7QUFNbkcsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBQ3pELFlBQ2tCLE1BQWtCLEVBQ0Usa0JBQXNDO1FBRTNFLEtBQUssRUFBRSxDQUFDO1FBSFMsV0FBTSxHQUFOLE1BQU0sQ0FBWTtRQUNFLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7SUFHNUUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsTUFBTSxLQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN0RCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQTZCLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsOENBQThDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUwsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7WUFDakQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxxQkFBcUIsQ0FBQztZQUNwRixNQUFNLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDBEQUEwRCxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDN0gsYUFBYSxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1NBQ3hFLENBQUMsQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ25FLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxLQUFhO1FBQ3JELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUMsSUFBSSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUNyRixDQUFDO2FBQU0sSUFBSSxVQUFVLEdBQUcsQ0FBQyxJQUFJLFVBQVUsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUMvQyxPQUFPLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxxRUFBcUUsQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCxDQUFBO0FBeENZLDBCQUEwQjtJQUdwQyxXQUFBLGtCQUFrQixDQUFBO0dBSFIsMEJBQTBCLENBd0N0QyJ9