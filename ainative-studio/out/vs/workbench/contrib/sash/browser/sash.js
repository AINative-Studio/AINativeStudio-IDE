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
import { clamp } from '../../../../base/common/numbers.js';
import { setGlobalSashSize, setGlobalHoverDelay } from '../../../../base/browser/ui/sash/sash.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
export const minSize = 1;
export const maxSize = 20; // see also https://ux.stackexchange.com/questions/39023/what-is-the-optimum-button-size-of-touch-screen-applications
let SashSettingsController = class SashSettingsController {
    constructor(configurationService, layoutService) {
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.disposables = new DisposableStore();
        const onDidChangeSize = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('workbench.sash.size'));
        onDidChangeSize(this.onDidChangeSize, this, this.disposables);
        this.onDidChangeSize();
        const onDidChangeHoverDelay = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('workbench.sash.hoverDelay'));
        onDidChangeHoverDelay(this.onDidChangeHoverDelay, this, this.disposables);
        this.onDidChangeHoverDelay();
    }
    onDidChangeSize() {
        const configuredSize = this.configurationService.getValue('workbench.sash.size');
        const size = clamp(configuredSize, 4, 20);
        const hoverSize = clamp(configuredSize, 1, 8);
        this.layoutService.mainContainer.style.setProperty('--vscode-sash-size', size + 'px');
        this.layoutService.mainContainer.style.setProperty('--vscode-sash-hover-size', hoverSize + 'px');
        setGlobalSashSize(size);
    }
    onDidChangeHoverDelay() {
        setGlobalHoverDelay(this.configurationService.getValue('workbench.sash.hoverDelay'));
    }
    dispose() {
        this.disposables.dispose();
    }
};
SashSettingsController = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILayoutService)
], SashSettingsController);
export { SashSettingsController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zYXNoL2Jyb3dzZXIvc2FzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEYsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztBQUN6QixNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMscUhBQXFIO0FBRXpJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBSWxDLFlBQ3dCLG9CQUE0RCxFQUNuRSxhQUE4QztRQUR0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUo5QyxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFNcEQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDeEksZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkIsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUNwSixxQkFBcUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLHFCQUFxQixDQUFDLENBQUM7UUFDekYsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDakcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVPLHFCQUFxQjtRQUM1QixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLDJCQUEyQixDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNELENBQUE7QUFsQ1ksc0JBQXNCO0lBS2hDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7R0FOSixzQkFBc0IsQ0FrQ2xDIn0=