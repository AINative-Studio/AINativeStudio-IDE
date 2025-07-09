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
var StructuredLogger_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
/**
 * The sourceLabel must not contain '@'!
*/
export function formatRecordableLogEntry(entry) {
    return entry.sourceId + ' @@ ' + JSON.stringify({ ...entry, sourceId: undefined });
}
let StructuredLogger = StructuredLogger_1 = class StructuredLogger extends Disposable {
    static cast() {
        return this;
    }
    constructor(_contextKey, _contextKeyService, _commandService) {
        super();
        this._contextKey = _contextKey;
        this._contextKeyService = _contextKeyService;
        this._commandService = _commandService;
        this._contextKeyValue = observableContextKey(this._contextKey, this._contextKeyService).recomputeInitiallyAndOnChange(this._store);
        this.isEnabled = this._contextKeyValue.map(v => v !== undefined);
    }
    log(data) {
        const commandId = this._contextKeyValue.get();
        if (!commandId) {
            return false;
        }
        this._commandService.executeCommand(commandId, data);
        return true;
    }
};
StructuredLogger = StructuredLogger_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICommandService)
], StructuredLogger);
export { StructuredLogger };
function observableContextKey(key, contextKeyService) {
    return observableFromEvent(contextKeyService.onDidChangeContext, () => contextKeyService.getContextKeyValue(key));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0dXJlZExvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3N0cnVjdHVyZWRMb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFZMUY7O0VBRUU7QUFDRixNQUFNLFVBQVUsd0JBQXdCLENBQWdDLEtBQVE7SUFDL0UsT0FBTyxLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUVNLElBQU0sZ0JBQWdCLHdCQUF0QixNQUFNLGdCQUFnRCxTQUFRLFVBQVU7SUFDdkUsTUFBTSxDQUFDLElBQUk7UUFDakIsT0FBTyxJQUFrQyxDQUFDO0lBQzNDLENBQUM7SUFLRCxZQUNrQixXQUFtQixFQUNDLGtCQUFzQyxFQUN6QyxlQUFnQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQUpTLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFHbEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFTLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNJLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU0sR0FBRyxDQUFDLElBQU87UUFDakIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxnQkFBZ0I7SUFVMUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtHQVhMLGdCQUFnQixDQTBCNUI7O0FBRUQsU0FBUyxvQkFBb0IsQ0FBSSxHQUFXLEVBQUUsaUJBQXFDO0lBQ2xGLE9BQU8sbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN0SCxDQUFDIn0=