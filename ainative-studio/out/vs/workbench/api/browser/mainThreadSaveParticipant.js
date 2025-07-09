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
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { raceCancellationError } from '../../../base/common/async.js';
class ExtHostSaveParticipant {
    constructor(extHostContext) {
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentSaveParticipant);
    }
    async participate(editorModel, context, _progress, token) {
        if (!editorModel.textEditorModel || !shouldSynchronizeModel(editorModel.textEditorModel)) {
            // the model never made it to the extension
            // host meaning we cannot participate in its save
            return undefined;
        }
        const p = new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error(localize('timeout.onWillSave', "Aborted onWillSaveTextDocument-event after 1750ms"))), 1750);
            this._proxy.$participateInSave(editorModel.resource, context.reason).then(values => {
                if (!values.every(success => success)) {
                    return Promise.reject(new Error('listener failed'));
                }
                return undefined;
            }).then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
// The save participant can change a model before its saved to support various scenarios like trimming trailing whitespace
let SaveParticipant = class SaveParticipant {
    constructor(extHostContext, instantiationService, _textFileService) {
        this._textFileService = _textFileService;
        this._saveParticipantDisposable = this._textFileService.files.addSaveParticipant(instantiationService.createInstance(ExtHostSaveParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
SaveParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, ITextFileService)
], SaveParticipant);
export { SaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNhdmVQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFNhdmVQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUN4RyxPQUFPLEVBQTRCLGdCQUFnQixFQUF5RCxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hLLE9BQU8sRUFBRSxjQUFjLEVBQXVDLE1BQU0sK0JBQStCLENBQUM7QUFFcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEUsTUFBTSxzQkFBc0I7SUFJM0IsWUFBWSxjQUErQjtRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBaUMsRUFBRSxPQUF3QyxFQUFFLFNBQW1DLEVBQUUsS0FBd0I7UUFFM0osSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMxRiwyQ0FBMkM7WUFDM0MsaURBQWlEO1lBQ2pELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUU5QyxVQUFVLENBQ1QsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxtREFBbUQsQ0FBQyxDQUFDLENBQUMsRUFDNUcsSUFBSSxDQUNKLENBQUM7WUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUN2QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0Q7QUFFRCwwSEFBMEg7QUFFbkgsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTtJQUkzQixZQUNDLGNBQStCLEVBQ1Isb0JBQTJDLEVBQy9CLGdCQUFrQztRQUFsQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBRXJFLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQy9KLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLENBQUM7Q0FDRCxDQUFBO0FBZlksZUFBZTtJQUQzQixlQUFlO0lBT2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0dBUE4sZUFBZSxDQWUzQiJ9