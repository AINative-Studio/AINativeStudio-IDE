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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { dispose, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { EditOperation } from '../../../editor/common/core/editOperation.js';
import { Range } from '../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
let MainThreadDocumentContentProviders = class MainThreadDocumentContentProviders {
    constructor(extHostContext, _textModelResolverService, _languageService, _modelService, _editorWorkerService) {
        this._textModelResolverService = _textModelResolverService;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._editorWorkerService = _editorWorkerService;
        this._resourceContentProvider = new DisposableMap();
        this._pendingUpdate = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentContentProviders);
    }
    dispose() {
        this._resourceContentProvider.dispose();
        dispose(this._pendingUpdate.values());
    }
    $registerTextContentProvider(handle, scheme) {
        const registration = this._textModelResolverService.registerTextModelContentProvider(scheme, {
            provideTextContent: (uri) => {
                return this._proxy.$provideTextDocumentContent(handle, uri).then(value => {
                    if (typeof value === 'string') {
                        const firstLineText = value.substr(0, 1 + value.search(/\r?\n/));
                        const languageSelection = this._languageService.createByFilepathOrFirstLine(uri, firstLineText);
                        return this._modelService.createModel(value, languageSelection, uri);
                    }
                    return null;
                });
            }
        });
        this._resourceContentProvider.set(handle, registration);
    }
    $unregisterTextContentProvider(handle) {
        this._resourceContentProvider.deleteAndDispose(handle);
    }
    async $onVirtualDocumentChange(uri, value) {
        const model = this._modelService.getModel(URI.revive(uri));
        if (!model) {
            return;
        }
        // cancel and dispose an existing update
        const pending = this._pendingUpdate.get(model.id);
        pending?.cancel();
        // create and keep update token
        const myToken = new CancellationTokenSource();
        this._pendingUpdate.set(model.id, myToken);
        try {
            const edits = await this._editorWorkerService.computeMoreMinimalEdits(model.uri, [{ text: value, range: model.getFullModelRange() }]);
            // remove token
            this._pendingUpdate.delete(model.id);
            if (myToken.token.isCancellationRequested) {
                // ignore this
                return;
            }
            if (edits && edits.length > 0) {
                // use the evil-edit as these models show in readonly-editor only
                model.applyEdits(edits.map(edit => EditOperation.replace(Range.lift(edit.range), edit.text)));
            }
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
MainThreadDocumentContentProviders = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDocumentContentProviders),
    __param(1, ITextModelService),
    __param(2, ILanguageService),
    __param(3, IModelService),
    __param(4, IEditorWorkerService)
], MainThreadDocumentContentProviders);
export { MainThreadDocumentContentProviders };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxjQUFjLEVBQXdDLFdBQVcsRUFBMkMsTUFBTSwrQkFBK0IsQ0FBQztBQUMzSixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd4RSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQztJQU05QyxZQUNDLGNBQStCLEVBQ1oseUJBQTZELEVBQzlELGdCQUFtRCxFQUN0RCxh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