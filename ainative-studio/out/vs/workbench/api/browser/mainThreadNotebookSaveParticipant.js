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
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { NotebookFileWorkingCopyModel } from '../../contrib/notebook/common/notebookEditorModel.js';
class ExtHostNotebookDocumentSaveParticipant {
    constructor(extHostContext) {
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookDocumentSaveParticipant);
    }
    async participate(workingCopy, context, _progress, token) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return undefined;
        }
        let _warningTimeout;
        const p = new Promise((resolve, reject) => {
            _warningTimeout = setTimeout(() => reject(new Error(localize('timeout.onWillSave', "Aborted onWillSaveNotebookDocument-event after 1750ms"))), 1750);
            this._proxy.$participateInSave(workingCopy.resource, context.reason, token).then(_ => {
                clearTimeout(_warningTimeout);
                return undefined;
            }).then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
let SaveParticipant = class SaveParticipant {
    constructor(extHostContext, instantiationService, workingCopyFileService) {
        this.workingCopyFileService = workingCopyFileService;
        this._saveParticipantDisposable = this.workingCopyFileService.addSaveParticipant(instantiationService.createInstance(ExtHostNotebookDocumentSaveParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
SaveParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, IWorkingCopyFileService)
], SaveParticipant);
export { SaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rU2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tTYXZlUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBK0MsTUFBTSwrQkFBK0IsQ0FBQztBQUU1RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQXVGLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFM0wsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFcEcsTUFBTSxzQ0FBc0M7SUFJM0MsWUFBWSxjQUErQjtRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBZ0UsRUFBRSxPQUFxRCxFQUFFLFNBQW1DLEVBQUUsS0FBd0I7UUFFdk0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLFlBQVksNEJBQTRCLENBQUMsRUFBRSxDQUFDO1lBQ3hGLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLGVBQW9CLENBQUM7UUFFekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFFOUMsZUFBZSxHQUFHLFVBQVUsQ0FDM0IsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx1REFBdUQsQ0FBQyxDQUFDLENBQUMsRUFDaEgsSUFBSSxDQUNKLENBQUM7WUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BGLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDOUIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8scUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRDtBQUdNLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFJM0IsWUFDQyxjQUErQixFQUNSLG9CQUEyQyxFQUN4QixzQkFBK0M7UUFBL0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUV6RixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQ0FBc0MsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQy9LLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLENBQUM7Q0FDRCxDQUFBO0FBZlksZUFBZTtJQUQzQixlQUFlO0lBT2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHVCQUF1QixDQUFBO0dBUGIsZUFBZSxDQWUzQiJ9