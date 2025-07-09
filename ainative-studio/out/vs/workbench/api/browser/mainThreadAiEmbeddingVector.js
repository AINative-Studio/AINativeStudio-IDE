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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IAiEmbeddingVectorService } from '../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadAiEmbeddingVector = class MainThreadAiEmbeddingVector extends Disposable {
    constructor(context, _AiEmbeddingVectorService) {
        super();
        this._AiEmbeddingVectorService = _AiEmbeddingVectorService;
        this._registrations = this._register(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostAiEmbeddingVector);
    }
    $registerAiEmbeddingVectorProvider(model, handle) {
        const provider = {
            provideAiEmbeddingVector: (strings, token) => {
                return this._proxy.$provideAiEmbeddingVector(handle, strings, token);
            },
        };
        this._registrations.set(handle, this._AiEmbeddingVectorService.registerAiEmbeddingVectorProvider(model, provider));
    }
    $unregisterAiEmbeddingVectorProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
};
MainThreadAiEmbeddingVector = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAiEmbeddingVector),
    __param(1, IAiEmbeddingVectorService)
], MainThreadAiEmbeddingVector);
export { MainThreadAiEmbeddingVector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpRW1iZWRkaW5nVmVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQWlFbWJlZGRpbmdWZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQWlDLGNBQWMsRUFBRSxXQUFXLEVBQW9DLE1BQU0sK0JBQStCLENBQUM7QUFDN0ksT0FBTyxFQUE4Qix5QkFBeUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVJLE9BQU8sRUFBbUIsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RyxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFJMUQsWUFDQyxPQUF3QixFQUNHLHlCQUFxRTtRQUVoRyxLQUFLLEVBQUUsQ0FBQztRQUZvQyw4QkFBeUIsR0FBekIseUJBQXlCLENBQTJCO1FBSmhGLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBVSxDQUFDLENBQUM7UUFPN0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxLQUFhLEVBQUUsTUFBYztRQUMvRCxNQUFNLFFBQVEsR0FBK0I7WUFDNUMsd0JBQXdCLEVBQUUsQ0FBQyxPQUFpQixFQUFFLEtBQXdCLEVBQUUsRUFBRTtnQkFDekUsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUMzQyxNQUFNLEVBQ04sT0FBTyxFQUNQLEtBQUssQ0FDTCxDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUM7UUFDRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGlDQUFpQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3BILENBQUM7SUFFRCxvQ0FBb0MsQ0FBQyxNQUFjO1FBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNELENBQUE7QUE1QlksMkJBQTJCO0lBRHZDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQztJQU8zRCxXQUFBLHlCQUF5QixDQUFBO0dBTmYsMkJBQTJCLENBNEJ2QyJ9