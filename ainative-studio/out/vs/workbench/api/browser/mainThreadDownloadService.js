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
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { URI } from '../../../base/common/uri.js';
let MainThreadDownloadService = class MainThreadDownloadService extends Disposable {
    constructor(extHostContext, downloadService) {
        super();
        this.downloadService = downloadService;
    }
    $download(uri, to) {
        return this.downloadService.download(URI.revive(uri), URI.revive(to));
    }
};
MainThreadDownloadService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDownloadService),
    __param(1, IDownloadService)
], MainThreadDownloadService);
export { MainThreadDownloadService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvd25sb2FkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERvd25sb2FkU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBa0MsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFpQixHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUcxRCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFFeEQsWUFDQyxjQUErQixFQUNJLGVBQWlDO1FBRXBFLEtBQUssRUFBRSxDQUFDO1FBRjJCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtJQUdyRSxDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQWtCLEVBQUUsRUFBaUI7UUFDOUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0NBRUQsQ0FBQTtBQWJZLHlCQUF5QjtJQURyQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUM7SUFLekQsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLHlCQUF5QixDQWFyQyJ9