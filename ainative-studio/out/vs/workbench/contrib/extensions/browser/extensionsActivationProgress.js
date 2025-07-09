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
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { localize } from '../../../../nls.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
let ExtensionActivationProgress = class ExtensionActivationProgress {
    constructor(extensionService, progressService, logService) {
        const options = {
            location: 10 /* ProgressLocation.Window */,
            title: localize('activation', "Activating Extensions...")
        };
        let deferred;
        let count = 0;
        this._listener = extensionService.onWillActivateByEvent(e => {
            logService.trace('onWillActivateByEvent: ', e.event);
            if (!deferred) {
                deferred = new DeferredPromise();
                progressService.withProgress(options, _ => deferred.p);
            }
            count++;
            Promise.race([e.activation, timeout(5000, CancellationToken.None)]).finally(() => {
                if (--count === 0) {
                    deferred.complete(undefined);
                    deferred = undefined;
                }
            });
        });
    }
    dispose() {
        this._listener.dispose();
    }
};
ExtensionActivationProgress = __decorate([
    __param(0, IExtensionService),
    __param(1, IProgressService),
    __param(2, ILogService)
], ExtensionActivationProgress);
export { ExtensionActivationProgress };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGl2YXRpb25Qcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc0FjdGl2YXRpb25Qcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sa0RBQWtELENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lBSXZDLFlBQ29CLGdCQUFtQyxFQUNwQyxlQUFpQyxFQUN0QyxVQUF1QjtRQUdwQyxNQUFNLE9BQU8sR0FBRztZQUNmLFFBQVEsa0NBQXlCO1lBQ2pDLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLDBCQUEwQixDQUFDO1NBQ3pELENBQUM7UUFFRixJQUFJLFFBQTBDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBRWQsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzRCxVQUFVLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVyRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsUUFBUSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ2pDLGVBQWUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7WUFFRCxLQUFLLEVBQUUsQ0FBQztZQUVSLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hGLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25CLFFBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzlCLFFBQVEsR0FBRyxTQUFTLENBQUM7Z0JBQ3RCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBeENZLDJCQUEyQjtJQUtyQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxXQUFXLENBQUE7R0FQRCwyQkFBMkIsQ0F3Q3ZDIn0=