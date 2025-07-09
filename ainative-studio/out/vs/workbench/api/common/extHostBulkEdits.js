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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEJ1bGtFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QnVsa0VkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQTRCLE1BQU0sdUJBQXVCLENBQUM7QUFFOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRzdGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBSzVCLFlBQ3FCLFVBQThCLEVBQ2xELDBCQUFzRDtRQUV0RCxJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLDJCQUEyQixHQUFHO1lBQ2xDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU87WUFDbkYsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztTQUMzQyxDQUFDO0lBQ0gsQ0FBQztJQUVELGtCQUFrQixDQUFDLElBQTBCLEVBQUUsU0FBZ0MsRUFBRSxRQUFrRDtRQUNsSSxNQUFNLEdBQUcsR0FBRyxJQUFJLDZCQUE2QixDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7UUFDMUcsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLGFBQWEsSUFBSSxLQUFLLENBQUMsQ0FBQztJQUM3RixDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxnQkFBZ0I7SUFNMUIsV0FBQSxrQkFBa0IsQ0FBQTtHQU5SLGdCQUFnQixDQXFCNUIifQ==