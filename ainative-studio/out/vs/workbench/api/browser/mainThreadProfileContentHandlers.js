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
import { revive } from '../../../base/common/marshalling.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IUserDataProfileImportExportService } from '../../services/userDataProfile/common/userDataProfile.js';
let MainThreadProfileContentHandlers = class MainThreadProfileContentHandlers extends Disposable {
    constructor(context, userDataProfileImportExportService) {
        super();
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.registeredHandlers = this._register(new DisposableMap());
        this.proxy = context.getProxy(ExtHostContext.ExtHostProfileContentHandlers);
    }
    async $registerProfileContentHandler(id, name, description, extensionId) {
        this.registeredHandlers.set(id, this.userDataProfileImportExportService.registerProfileContentHandler(id, {
            name,
            description,
            extensionId,
            saveProfile: async (name, content, token) => {
                const result = await this.proxy.$saveProfile(id, name, content, token);
                return result ? revive(result) : null;
            },
            readProfile: async (uri, token) => {
                return this.proxy.$readProfile(id, uri, token);
            },
        }));
    }
    async $unregisterProfileContentHandler(id) {
        this.registeredHandlers.deleteAndDispose(id);
    }
};
MainThreadProfileContentHandlers = __decorate([
    extHostNamedCustomer(MainContext.MainThreadProfileContentHandlers),
    __param(1, IUserDataProfileImportExportService)
], MainThreadProfileContentHandlers);
export { MainThreadProfileContentHandlers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFByb2ZpbGVDb250ZW50SGFuZGxlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRQcm9maWxlQ29udGVudEhhbmRsZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDM0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxjQUFjLEVBQXNDLFdBQVcsRUFBeUMsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SixPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFzQixtQ0FBbUMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRzVILElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsVUFBVTtJQU0vRCxZQUNDLE9BQXdCLEVBQ2Esa0NBQXdGO1FBRTdILEtBQUssRUFBRSxDQUFDO1FBRjhDLHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFKN0csdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBdUIsQ0FBQyxDQUFDO1FBTzlGLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsS0FBSyxDQUFDLDhCQUE4QixDQUFDLEVBQVUsRUFBRSxJQUFZLEVBQUUsV0FBK0IsRUFBRSxXQUFtQjtRQUNsSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsa0NBQWtDLENBQUMsNkJBQTZCLENBQUMsRUFBRSxFQUFFO1lBQ3pHLElBQUk7WUFDSixXQUFXO1lBQ1gsV0FBVztZQUNYLFdBQVcsRUFBRSxLQUFLLEVBQUUsSUFBWSxFQUFFLE9BQWUsRUFBRSxLQUF3QixFQUFFLEVBQUU7Z0JBQzlFLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQXFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDM0QsQ0FBQztZQUNELFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBUSxFQUFFLEtBQXdCLEVBQUUsRUFBRTtnQkFDekQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsRUFBVTtRQUNoRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUVELENBQUE7QUFqQ1ksZ0NBQWdDO0lBRDVDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQztJQVNoRSxXQUFBLG1DQUFtQyxDQUFBO0dBUnpCLGdDQUFnQyxDQWlDNUMifQ==