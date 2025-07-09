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
import { SequencerByKey } from '../../../../base/common/async.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService, BaseSecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
let BrowserSecretStorageService = class BrowserSecretStorageService extends BaseSecretStorageService {
    constructor(storageService, encryptionService, environmentService, logService) {
        // We don't have encryption in the browser so instead we use the
        // in-memory base class implementation instead.
        super(true, storageService, encryptionService, logService);
        if (environmentService.options?.secretStorageProvider) {
            this._secretStorageProvider = environmentService.options.secretStorageProvider;
            this._embedderSequencer = new SequencerByKey();
        }
    }
    get(key) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, () => this._secretStorageProvider.get(key));
        }
        return super.get(key);
    }
    set(key, value) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, async () => {
                await this._secretStorageProvider.set(key, value);
                this.onDidChangeSecretEmitter.fire(key);
            });
        }
        return super.set(key, value);
    }
    delete(key) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, async () => {
                await this._secretStorageProvider.delete(key);
                this.onDidChangeSecretEmitter.fire(key);
            });
        }
        return super.delete(key);
    }
    get type() {
        if (this._secretStorageProvider) {
            return this._secretStorageProvider.type;
        }
        return super.type;
    }
};
BrowserSecretStorageService = __decorate([
    __param(0, IStorageService),
    __param(1, IEncryptionService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ILogService)
], BrowserSecretStorageService);
export { BrowserSecretStorageService };
registerSingleton(ISecretStorageService, BrowserSecretStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0U3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlY3JldHMvYnJvd3Nlci9zZWNyZXRTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQTBCLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRS9GLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsd0JBQXdCO0lBS3hFLFlBQ2tCLGNBQStCLEVBQzVCLGlCQUFxQyxFQUNwQixrQkFBdUQsRUFDL0UsVUFBdUI7UUFFcEMsZ0VBQWdFO1FBQ2hFLCtDQUErQztRQUMvQyxLQUFLLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRCxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUM7WUFDL0UsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksY0FBYyxFQUFVLENBQUM7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFUSxHQUFHLENBQUMsR0FBVztRQUN2QixJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVRLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUN0QyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JELE1BQU0sSUFBSSxDQUFDLHNCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ25ELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRVEsTUFBTSxDQUFDLEdBQVc7UUFDMUIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxrQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNyRCxNQUFNLElBQUksQ0FBQyxzQkFBdUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxJQUFhLElBQUk7UUFDaEIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7UUFDekMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0NBQ0QsQ0FBQTtBQTFEWSwyQkFBMkI7SUFNckMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUNBQW1DLENBQUE7SUFDbkMsV0FBQSxXQUFXLENBQUE7R0FURCwyQkFBMkIsQ0EwRHZDOztBQUVELGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLDJCQUEyQixvQ0FBNEIsQ0FBQyJ9