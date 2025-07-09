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
import { macLinuxKeyboardMappingEquals, windowsKeyboardMappingEquals } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { Emitter } from '../../../../base/common/event.js';
import { OS } from '../../../../base/common/platform.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const INativeKeyboardLayoutService = createDecorator('nativeKeyboardLayoutService');
let NativeKeyboardLayoutService = class NativeKeyboardLayoutService extends Disposable {
    constructor(mainProcessService) {
        super();
        this._onDidChangeKeyboardLayout = this._register(new Emitter());
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        this._keyboardLayoutService = ProxyChannel.toService(mainProcessService.getChannel('keyboardLayout'));
        this._initPromise = null;
        this._keyboardMapping = null;
        this._keyboardLayoutInfo = null;
        this._register(this._keyboardLayoutService.onDidChangeKeyboardLayout(async ({ keyboardLayoutInfo, keyboardMapping }) => {
            await this.initialize();
            if (keyboardMappingEquals(this._keyboardMapping, keyboardMapping)) {
                // the mappings are equal
                return;
            }
            this._keyboardMapping = keyboardMapping;
            this._keyboardLayoutInfo = keyboardLayoutInfo;
            this._onDidChangeKeyboardLayout.fire();
        }));
    }
    initialize() {
        if (!this._initPromise) {
            this._initPromise = this._doInitialize();
        }
        return this._initPromise;
    }
    async _doInitialize() {
        const keyboardLayoutData = await this._keyboardLayoutService.getKeyboardLayoutData();
        const { keyboardLayoutInfo, keyboardMapping } = keyboardLayoutData;
        this._keyboardMapping = keyboardMapping;
        this._keyboardLayoutInfo = keyboardLayoutInfo;
    }
    getRawKeyboardMapping() {
        return this._keyboardMapping;
    }
    getCurrentKeyboardLayout() {
        return this._keyboardLayoutInfo;
    }
};
NativeKeyboardLayoutService = __decorate([
    __param(0, IMainProcessService)
], NativeKeyboardLayoutService);
export { NativeKeyboardLayoutService };
function keyboardMappingEquals(a, b) {
    if (OS === 1 /* OperatingSystem.Windows */) {
        return windowsKeyboardMappingEquals(a, b);
    }
    return macLinuxKeyboardMappingEquals(a, b);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlS2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQTRGLDZCQUE2QixFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDck8sT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQStCLDZCQUE2QixDQUFDLENBQUM7QUFTbEgsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBWTFELFlBQ3NCLGtCQUF1QztRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQVhRLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3pFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFXMUUsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQW1DLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDeEksSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDekIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUM3QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUU7WUFDdEgsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDbkUseUJBQXlCO2dCQUN6QixPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7WUFDeEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO1lBQzlDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLFVBQVU7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYTtRQUMxQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDckYsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxHQUFHLGtCQUFrQixDQUFDO1FBQ25FLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7UUFDeEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO0lBQy9DLENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxDQUFDO0NBQ0QsQ0FBQTtBQXZEWSwyQkFBMkI7SUFhckMsV0FBQSxtQkFBbUIsQ0FBQTtHQWJULDJCQUEyQixDQXVEdkM7O0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUEwQixFQUFFLENBQTBCO0lBQ3BGLElBQUksRUFBRSxvQ0FBNEIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sNEJBQTRCLENBQWlDLENBQUMsRUFBa0MsQ0FBQyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVELE9BQU8sNkJBQTZCLENBQWtDLENBQUMsRUFBbUMsQ0FBQyxDQUFDLENBQUM7QUFDOUcsQ0FBQyJ9