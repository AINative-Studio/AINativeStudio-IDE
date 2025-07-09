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
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { INotebookRendererMessagingService } from '../../contrib/notebook/common/notebookRendererMessagingService.js';
let MainThreadNotebookRenderers = class MainThreadNotebookRenderers extends Disposable {
    constructor(extHostContext, messaging) {
        super();
        this.messaging = messaging;
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookRenderers);
        this._register(messaging.onShouldPostMessage(e => {
            this.proxy.$postRendererMessage(e.editorId, e.rendererId, e.message);
        }));
    }
    $postMessage(editorId, rendererId, message) {
        return this.messaging.receiveMessage(editorId, rendererId, message);
    }
};
MainThreadNotebookRenderers = __decorate([
    extHostNamedCustomer(MainContext.MainThreadNotebookRenderers),
    __param(1, INotebookRendererMessagingService)
], MainThreadNotebookRenderers);
export { MainThreadNotebookRenderers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rUmVuZGVyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tSZW5kZXJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQWlDLFdBQVcsRUFBb0MsTUFBTSwrQkFBK0IsQ0FBQztBQUM3SSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFHL0csSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBRzFELFlBQ0MsY0FBK0IsRUFDcUIsU0FBNEM7UUFFaEcsS0FBSyxFQUFFLENBQUM7UUFGNEMsY0FBUyxHQUFULFNBQVMsQ0FBbUM7UUFHaEcsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hELElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUE0QixFQUFFLFVBQWtCLEVBQUUsT0FBZ0I7UUFDOUUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7Q0FDRCxDQUFBO0FBakJZLDJCQUEyQjtJQUR2QyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUM7SUFNM0QsV0FBQSxpQ0FBaUMsQ0FBQTtHQUx2QiwyQkFBMkIsQ0FpQnZDIn0=