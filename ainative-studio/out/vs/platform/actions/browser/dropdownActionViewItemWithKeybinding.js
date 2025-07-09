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
import { DropdownMenuActionViewItem } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import * as nls from '../../../nls.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
let DropdownMenuActionViewItemWithKeybinding = class DropdownMenuActionViewItemWithKeybinding extends DropdownMenuActionViewItem {
    constructor(action, menuActionsOrProvider, contextMenuProvider, options = Object.create(null), keybindingService, contextKeyService) {
        super(action, menuActionsOrProvider, contextMenuProvider, options);
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
    }
    getTooltip() {
        const keybinding = this.keybindingService.lookupKeybinding(this.action.id, this.contextKeyService);
        const keybindingLabel = keybinding && keybinding.getLabel();
        const tooltip = this.action.tooltip ?? this.action.label;
        return keybindingLabel
            ? nls.localize('titleAndKb', "{0} ({1})", tooltip, keybindingLabel)
            : tooltip;
    }
};
DropdownMenuActionViewItemWithKeybinding = __decorate([
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], DropdownMenuActionViewItemWithKeybinding);
export { DropdownMenuActionViewItemWithKeybinding };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25BY3Rpb25WaWV3SXRlbVdpdGhLZXliaW5kaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci9kcm9wZG93bkFjdGlvblZpZXdJdGVtV2l0aEtleWJpbmRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFzQyxNQUFNLDZEQUE2RCxDQUFDO0FBRTdJLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEUsSUFBTSx3Q0FBd0MsR0FBOUMsTUFBTSx3Q0FBeUMsU0FBUSwwQkFBMEI7SUFDdkYsWUFDQyxNQUFlLEVBQ2YscUJBQTJELEVBQzNELG1CQUF5QyxFQUN6QyxVQUE4QyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUM1QixpQkFBcUMsRUFDckMsaUJBQXFDO1FBRTFFLEtBQUssQ0FBQyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFIOUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBRzNFLENBQUM7SUFFa0IsVUFBVTtRQUM1QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkcsTUFBTSxlQUFlLEdBQUcsVUFBVSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU1RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUN6RCxPQUFPLGVBQWU7WUFDckIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDO1lBQ25FLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQXJCWSx3Q0FBd0M7SUFNbEQsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0dBUFIsd0NBQXdDLENBcUJwRCJ9