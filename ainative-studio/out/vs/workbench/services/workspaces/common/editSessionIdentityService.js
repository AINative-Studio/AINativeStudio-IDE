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
import { insert } from '../../../../base/common/arrays.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditSessionIdentityService } from '../../../../platform/workspace/common/editSessions.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
let EditSessionIdentityService = class EditSessionIdentityService {
    constructor(_extensionService, _logService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._editSessionIdentifierProviders = new Map();
        this._participants = [];
    }
    registerEditSessionIdentityProvider(provider) {
        if (this._editSessionIdentifierProviders.get(provider.scheme)) {
            throw new Error(`A provider has already been registered for scheme ${provider.scheme}`);
        }
        this._editSessionIdentifierProviders.set(provider.scheme, provider);
        return toDisposable(() => {
            this._editSessionIdentifierProviders.delete(provider.scheme);
        });
    }
    async getEditSessionIdentifier(workspaceFolder, token) {
        const { scheme } = workspaceFolder.uri;
        const provider = await this.activateProvider(scheme);
        this._logService.trace(`EditSessionIdentityProvider for scheme ${scheme} available: ${!!provider}`);
        return provider?.getEditSessionIdentifier(workspaceFolder, token);
    }
    async provideEditSessionIdentityMatch(workspaceFolder, identity1, identity2, cancellationToken) {
        const { scheme } = workspaceFolder.uri;
        const provider = await this.activateProvider(scheme);
        this._logService.trace(`EditSessionIdentityProvider for scheme ${scheme} available: ${!!provider}`);
        return provider?.provideEditSessionIdentityMatch?.(workspaceFolder, identity1, identity2, cancellationToken);
    }
    async onWillCreateEditSessionIdentity(workspaceFolder, cancellationToken) {
        this._logService.debug('Running onWillCreateEditSessionIdentity participants...');
        // TODO@joyceerhl show progress notification?
        for (const participant of this._participants) {
            await participant.participate(workspaceFolder, cancellationToken);
        }
        this._logService.debug(`Done running ${this._participants.length} onWillCreateEditSessionIdentity participants.`);
    }
    addEditSessionIdentityCreateParticipant(participant) {
        const dispose = insert(this._participants, participant);
        return toDisposable(() => dispose());
    }
    async activateProvider(scheme) {
        const transformedScheme = scheme === 'vscode-remote' ? 'file' : scheme;
        const provider = this._editSessionIdentifierProviders.get(scheme);
        if (provider) {
            return provider;
        }
        await this._extensionService.activateByEvent(`onEditSession:${transformedScheme}`);
        return this._editSessionIdentifierProviders.get(scheme);
    }
};
EditSessionIdentityService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService)
], EditSessionIdentityService);
export { EditSessionIdentityService };
registerSingleton(IEditSessionIdentityService, EditSessionIdentityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25JZGVudGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvY29tbW9uL2VkaXRTZXNzaW9uSWRlbnRpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUzRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQWlHLDJCQUEyQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFbk0sT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbkUsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMEI7SUFLdEMsWUFDb0IsaUJBQXFELEVBQzNELFdBQXlDO1FBRGxCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFKL0Msb0NBQStCLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7UUErQ2xGLGtCQUFhLEdBQTRDLEVBQUUsQ0FBQztJQTFDaEUsQ0FBQztJQUVMLG1DQUFtQyxDQUFDLFFBQXNDO1FBQ3pFLElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMvRCxNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6RixD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