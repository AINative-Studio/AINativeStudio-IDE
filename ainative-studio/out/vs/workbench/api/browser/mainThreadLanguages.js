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
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { Range } from '../../../editor/common/core/range.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { ILanguageStatusService } from '../../services/languageStatus/common/languageStatusService.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
let MainThreadLanguages = class MainThreadLanguages {
    constructor(_extHostContext, _languageService, _modelService, _resolverService, _languageStatusService) {
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._resolverService = _resolverService;
        this._languageStatusService = _languageStatusService;
        this._disposables = new DisposableStore();
        this._status = new DisposableMap();
        this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostLanguages);
        this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        this._disposables.add(_languageService.onDidChange(_ => {
            this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._status.dispose();
    }
    async $changeLanguage(resource, languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return Promise.reject(new Error(`Unknown language id: ${languageId}`));
        }
        const uri = URI.revive(resource);
        const ref = await this._resolverService.createModelReference(uri);
        try {
            ref.object.textEditorModel.setLanguage(this._languageService.createById(languageId));
        }
        finally {
            ref.dispose();
        }
    }
    async $tokensAtPosition(resource, position) {
        const uri = URI.revive(resource);
        const model = this._modelService.getModel(uri);
        if (!model) {
            return undefined;
        }
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const tokens = model.tokenization.getLineTokens(position.lineNumber);
        const idx = tokens.findTokenIndexAtOffset(position.column - 1);
        return {
            type: tokens.getStandardTokenType(idx),
            range: new Range(position.lineNumber, 1 + tokens.getStartOffset(idx), position.lineNumber, 1 + tokens.getEndOffset(idx))
        };
    }
    // --- language status
    $setLanguageStatus(handle, status) {
        this._status.get(handle)?.dispose();
        this._status.set(handle, this._languageStatusService.addStatus(status));
    }
    $removeLanguageStatus(handle) {
        this._status.get(handle)?.dispose();
    }
};
MainThreadLanguages = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguages),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITextModelService),
    __param(4, ILanguageStatusService)
], MainThreadLanguages);
export { MainThreadLanguages };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQTRCLFdBQVcsRUFBRSxjQUFjLEVBQXlCLE1BQU0sK0JBQStCLENBQUM7QUFDN0gsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBRTdHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUc1RSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQU8vQixZQUNDLGVBQWdDLEVBQ2QsZ0JBQW1ELEVBQ3RELGFBQTZDLEVBQ3pDLGdCQUEyQyxFQUN0QyxzQkFBK0Q7UUFIcEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNqQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3JCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFWdkUsaUJBQVksR0FBRyxJQUFJ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