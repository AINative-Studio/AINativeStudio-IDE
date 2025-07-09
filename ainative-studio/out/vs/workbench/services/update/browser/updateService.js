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
import { Emitter } from '../../../../base/common/event.js';
import { IUpdateService, State } from '../../../../platform/update/common/update.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IHostService } from '../../host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let BrowserUpdateService = class BrowserUpdateService extends Disposable {
    get state() { return this._state; }
    set state(state) {
        this._state = state;
        this._onStateChange.fire(state);
    }
    constructor(environmentService, hostService) {
        super();
        this.environmentService = environmentService;
        this.hostService = hostService;
        this._onStateChange = this._register(new Emitter());
        this.onStateChange = this._onStateChange.event;
        this._state = State.Uninitialized;
        this.checkForUpdates(false);
    }
    async isLatestVersion() {
        const update = await this.doCheckForUpdates(false);
        if (update === undefined) {
            return undefined; // no update provider
        }
        return !!update;
    }
    async checkForUpdates(explicit) {
        await this.doCheckForUpdates(explicit);
    }
    async doCheckForUpdates(explicit) {
        if (this.environmentService.options && this.environmentService.options.updateProvider) {
            const updateProvider = this.environmentService.options.updateProvider;
            // State -> Checking for Updates
            this.state = State.CheckingForUpdates(explicit);
            const update = await updateProvider.checkForUpdate();
            if (update) {
                // State -> Downloaded
                this.state = State.Ready({ version: update.version, productVersion: update.version });
            }
            else {
                // State -> Idle
                this.state = State.Idle(1 /* UpdateType.Archive */);
            }
            return update;
        }
        return undefined; // no update provider to ask
    }
    async downloadUpdate() {
        // no-op
    }
    async applyUpdate() {
        this.hostService.reload();
    }
    async quitAndInstall() {
        this.hostService.reload();
    }
    async _applySpecificUpdate(packagePath) {
        // noop
    }
};
BrowserUpdateService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IHostService)
], BrowserUpdateService);
export { BrowserUpdateService };
registerSingleton(IUpdateService, BrowserUpdateService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXBkYXRlL2Jyb3dzZXIvdXBkYXRlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQWMsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQWdCM0QsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBUW5ELElBQUksS0FBSyxLQUFZLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDMUMsSUFBSSxLQUFLLENBQUMsS0FBWTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsWUFDc0Msa0JBQXdFLEVBQy9GLFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBSDhDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUM7UUFDOUUsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFaakQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFTLENBQUMsQ0FBQztRQUNyRCxrQkFBYSxHQUFpQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztRQUV6RCxXQUFNLEdBQVUsS0FBSyxDQUFDLGFBQWEsQ0FBQztRQWEzQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZTtRQUNwQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQyxDQUFDLHFCQUFxQjtRQUN4QyxDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQWlCO1FBQ3RDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBaUI7UUFDaEQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7WUFFdEUsZ0NBQWdDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRWhELE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osc0JBQXNCO2dCQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDdkYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGdCQUFnQjtnQkFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSw0QkFBb0IsQ0FBQztZQUM3QyxDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUMsQ0FBQyw0QkFBNEI7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjO1FBQ25CLFFBQVE7SUFDVCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWM7UUFDbkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFdBQW1CO1FBQzdDLE9BQU87SUFDUixDQUFDO0NBQ0QsQ0FBQTtBQXpFWSxvQkFBb0I7SUFlOUIsV0FBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxXQUFBLFlBQVksQ0FBQTtHQWhCRixvQkFBb0IsQ0F5RWhDOztBQUVELGlCQUFpQixDQUFDLGNBQWMsRUFBRSxvQkFBb0Isa0NBQTBCLENBQUMifQ==