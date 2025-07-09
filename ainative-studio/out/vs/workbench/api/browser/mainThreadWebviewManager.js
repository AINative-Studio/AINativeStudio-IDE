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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { MainThreadCustomEditors } from './mainThreadCustomEditors.js';
import { MainThreadWebviewPanels } from './mainThreadWebviewPanels.js';
import { MainThreadWebviews } from './mainThreadWebviews.js';
import { MainThreadWebviewsViews } from './mainThreadWebviewViews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadWebviewManager = class MainThreadWebviewManager extends Disposable {
    constructor(context, instantiationService) {
        super();
        const webviews = this._register(instantiationService.createInstance(MainThreadWebviews, context));
        context.set(extHostProtocol.MainContext.MainThreadWebviews, webviews);
        const webviewPanels = this._register(instantiationService.createInstance(MainThreadWebviewPanels, context, webviews));
        context.set(extHostProtocol.MainContext.MainThreadWebviewPanels, webviewPanels);
        const customEditors = this._register(instantiationService.createInstance(MainThreadCustomEditors, context, webviews, webviewPanels));
        context.set(extHostProtocol.MainContext.MainThreadCustomEditors, customEditors);
        const webviewViews = this._register(instantiationService.createInstance(MainThreadWebviewsViews, context, webviews));
        context.set(extHostProtocol.MainContext.MainThreadWebviewViews, webviewViews);
    }
};
MainThreadWebviewManager = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService)
], MainThreadWebviewManager);
export { MainThreadWebviewManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkV2Vidmlld01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sS0FBSyxlQUFlLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUdqRyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFDdkQsWUFDQyxPQUF3QixFQUNELG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQUVSLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbEcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXRFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3RILE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVoRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDckksT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JILE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMvRSxDQUFDO0NBQ0QsQ0FBQTtBQW5CWSx3QkFBd0I7SUFEcEMsZUFBZTtJQUliLFdBQUEscUJBQXFCLENBQUE7R0FIWCx3QkFBd0IsQ0FtQnBDIn0=