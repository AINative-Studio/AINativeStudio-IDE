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
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
let MainThreadLocalization = class MainThreadLocalization extends Disposable {
    constructor(extHostContext, fileService, languagePackService) {
        super();
        this.fileService = fileService;
        this.languagePackService = languagePackService;
    }
    async $fetchBuiltInBundleUri(id, language) {
        try {
            const uri = await this.languagePackService.getBuiltInExtensionTranslationsUri(id, language);
            return uri;
        }
        catch (e) {
            return undefined;
        }
    }
    async $fetchBundleContents(uriComponents) {
        const contents = await this.fileService.readFile(URI.revive(uriComponents));
        return contents.value.toString();
    }
};
MainThreadLocalization = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLocalization),
    __param(1, IFileService),
    __param(2, ILanguagePackService)
], MainThreadLocalization);
export { MainThreadLocalization };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExvY2FsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExvY2FsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUErQixNQUFNLCtCQUErQixDQUFDO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFHeEYsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBRXJELFlBQ0MsY0FBK0IsRUFDQSxXQUF5QixFQUNqQixtQkFBeUM7UUFFaEYsS0FBSyxFQUFFLENBQUM7UUFIdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDakIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtJQUdqRixDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUN4RCxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUYsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLGFBQTRCO1FBQ3RELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0QsQ0FBQTtBQXZCWSxzQkFBc0I7SUFEbEMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDO0lBS3RELFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxvQkFBb0IsQ0FBQTtHQUxWLHNCQUFzQixDQXVCbEMifQ==