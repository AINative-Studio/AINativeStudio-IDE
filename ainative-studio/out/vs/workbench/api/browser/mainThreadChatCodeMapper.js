var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MainThreadChatCodemapper_1;
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { TextEdit } from '../../../editor/common/languages.js';
import { ICodeMapperService } from '../../contrib/chat/common/chatCodeMapperService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
let MainThreadChatCodemapper = class MainThreadChatCodemapper extends Disposable {
    static { MainThreadChatCodemapper_1 = this; }
    static { this._requestHandlePool = 0; }
    constructor(extHostContext, codeMapperService) {
        super();
        this.codeMapperService = codeMapperService;
        this.providers = this._register(new DisposableMap());
        this._responseMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCodeMapper);
    }
    $registerCodeMapperProvider(handle, displayName) {
        const impl = {
            displayName,
            mapCode: async (uiRequest, response, token) => {
                const requestId = String(MainThreadChatCodemapper_1._requestHandlePool++);
                this._responseMap.set(requestId, response);
                const extHostRequest = {
                    requestId,
                    codeBlocks: uiRequest.codeBlocks,
                    chatRequestId: uiRequest.chatRequestId,
                    location: uiRequest.location
                };
                try {
                    return await this._proxy.$mapCode(handle, extHostRequest, token).then((result) => result ?? undefined);
                }
                finally {
                    this._responseMap.delete(requestId);
                }
            }
        };
        const disposable = this.codeMapperService.registerCodeMapperProvider(handle, impl);
        this.providers.set(handle, disposable);
    }
    $unregisterCodeMapperProvider(handle) {
        this.providers.deleteAndDispose(handle);
    }
    $handleProgress(requestId, data) {
        const response = this._responseMap.get(requestId);
        if (response) {
            const edits = data.edits;
            const resource = URI.revive(data.uri);
            if (!edits.length) {
                response.textEdit(resource, []);
            }
            else if (edits.every(TextEdit.isTextEdit)) {
                response.textEdit(resource, edits);
            }
            else {
                response.notebookEdit(resource, edits.map(NotebookDto.fromCellEditOperationDto));
            }
        }
        return Promise.resolve();
    }
};
MainThreadChatCodemapper = MainThreadChatCodemapper_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCodeMapper),
    __param(1, ICodeMapperService)
], MainThreadChatCodemapper);
export { MainThreadChatCodemapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRDb2RlTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdENvZGVNYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUtBLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDM0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQWdFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEosT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBMEIsY0FBYyxFQUFpRCxXQUFXLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFDOUssT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBR2xELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFJeEMsdUJBQWtCLEdBQVcsQ0FBQyxBQUFaLENBQWE7SUFHOUMsWUFDQyxjQUErQixFQUNYLGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQUY2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBUG5FLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1QixDQUFDLENBQUM7UUFHckUsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQU83RCxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDekUs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