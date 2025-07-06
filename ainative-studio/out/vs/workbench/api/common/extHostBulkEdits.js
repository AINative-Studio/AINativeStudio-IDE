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
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { WorkspaceEdit } from './extHostTypeConverters.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
let ExtHostBulkEdits = class ExtHostBulkEdits {
    constructor(extHostRpc, extHostDocumentsAndEditors) {
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadBulkEdits);
        this._versionInformationProvider = {
            getTextDocumentVersion: uri => extHostDocumentsAndEditors.getDocument(uri)?.version,
            getNotebookDocumentVersion: () => undefined
        };
    }
    applyWorkspaceEdit(edit, extension, metadata) {
        const dto = new SerializableObjectWithBuffers(WorkspaceEdit.from(edit, this._versionInformationProvider));
        return this._proxy.$tryApplyWorkspaceEdit(dto, undefined, metadata?.isRefactoring ?? false);
    }
};
ExtHostBulkEdits = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostBulkEdits);
export { ExtHostBulkEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEJ1bGtFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEJ1bGtFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUE0QixNQUFNLHVCQUF1QixDQUFDO0FBRTlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUc3RixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUs1QixZQUNxQixVQUE4QixFQUNsRCwwQkFBc0Q7UUFFdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRW5FLElBQUksQ0FBQywyQkFBMkIsR0FBRztZQUNsQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPO1lBQ25GLDBCQUEwQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7U0FDM0MsQ0FBQztJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUEwQixFQUFFLFNBQWdDLEVBQUUsUUFBa0Q7UUFDbEksTUFBTSxHQUFHLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQzFHLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxhQUFhLElBQUksS0FBSyxDQUFDLENBQUM7SUFDN0YsQ0FBQztDQUNELENBQUE7QUFyQlksZ0JBQWdCO0lBTTFCLFdBQUEsa0JBQWtCLENBQUE7R0FOUixnQkFBZ0IsQ0FxQjVCIn0=