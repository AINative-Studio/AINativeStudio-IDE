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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVDb2x1bW5SZXNpemVRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGlzdC9icm93c2VyL3RhYmxlQ29sdW1uUmVzaXplUXVpY2tQaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFrQixNQUFNLHNEQUFzRCxDQUFDO0FBTW5HLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUN6RCxZQUNrQixNQUFrQixFQUNFLGtCQUFzQztRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUhTLFdBQU0sR0FBTixNQUFNLENBQVk7UUFDRSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO0lBRzVFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNULE1BQU0sS0FBSyxHQUFpQyxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDdEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUE2QixLQUFLLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDhDQUE4QyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFMLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ2pELFdBQVcsRUFBRSxRQUFRLENBQUMsc0NBQXNDLEVBQUUscUJBQXFCLENBQUM7WUFDcEYsTUFBTSxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwwREFBMEQsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQzdILGFBQWEsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztTQUN4RSxDQUFDLENBQUM7UUFDSCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNuRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQUMsS0FBYTtRQUNyRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFDLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sUUFBUSxDQUFDLHNDQUFzQyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDckYsQ0FBQzthQUFNLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDL0MsT0FBTyxRQUFRLENBQUMsdUNBQXVDLEVBQUUscUVBQXFFLENBQUMsQ0FBQztRQUNqSSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQXhDWSwwQkFBMEI7SUFHcEMsV0FBQSxrQkFBa0IsQ0FBQTtHQUhSLDBCQUEwQixDQXdDdEMifQ==