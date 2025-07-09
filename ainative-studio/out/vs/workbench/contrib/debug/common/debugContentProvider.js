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
var DebugContentProvider_1;
import { localize } from '../../../../nls.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { DEBUG_SCHEME, IDebugService } from './debug.js';
import { Source } from './debugSource.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Debug URI format
 *
 * a debug URI represents a Source object and the debug session where the Source comes from.
 *
 *       debug:arbitrary_path?session=123e4567-e89b-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 * the arbitrary_path and the session id are encoded with 'encodeURIComponent'
 *
 */
let DebugContentProvider = class DebugContentProvider extends Disposable {
    static { DebugContentProvider_1 = this; }
    constructor(textModelResolverService, debugService, modelService, languageService, editorWorkerService) {
        super();
        this.debugService = debugService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.editorWorkerService = editorWorkerService;
        this.pendingUpdates = new Map();
        this._store.add(textModelResolverService.registerTextModelContentProvider(DEBUG_SCHEME, this));
        DebugContentProvider_1.INSTANCE = this;
    }
    dispose() {
        this.pendingUpdates.forEach(cancellationSource => cancellationSource.dispose());
        super.dispose();
    }
    provideTextContent(resource) {
        return this.createOrUpdateContentModel(resource, true);
    }
    /**
     * Reload the model content of the given resource.
     * If there is no model for the given resource, this method does nothing.
     */
    static refreshDebugContent(resource) {
        DebugContentProvider_1.INSTANCE?.createOrUpdateContentModel(resource, false);
    }
    /**
     * Create or reload the model content of the given resource.
     */
    createOrUpdateContentModel(resource, createIfNotExists) {
        const model = this.modelService.getModel(resource);
        if (!model && !createIfNotExists) {
            // nothing to do
            return null;
        }
        let session;
        if (resource.query) {
            const data = Source.getEncodedDebugData(resource);
            session = this.debugService.getModel().getSession(data.sessionId);
        }
        if (!session) {
            // fallback: use focused session
            session = this.debugService.getViewModel().focusedSession;
        }
        if (!session) {
            return Promise.reject(new ErrorNoTelemetry(localize('unable', "Unable to resolve the resource without a debug session")));
        }
        const createErrModel = (errMsg) => {
            this.debugService.sourceIsNotAvailable(resource);
            const languageSelection = this.languageService.createById(PLAINTEXT_LANGUAGE_ID);
            const message = errMsg
                ? localize('canNotResolveSourceWithError', "Could not load source '{0}': {1}.", resource.path, errMsg)
                : localize('canNotResolveSource', "Could not load source '{0}'.", resource.path);
            return this.modelService.createModel(message, languageSelection, resource);
        };
        return session.loadSource(resource).then(response => {
            if (response && response.body) {
                if (model) {
                    const newContent = response.body.content;
                    // cancel and dispose an existing update
                    const cancellationSource = this.pendingUpdates.get(model.id);
                    cancellationSource?.cancel();
                    // create and keep update token
                    const myToken = new CancellationTokenSource();
                    this.pendingUpdates.set(model.id, myToken);
                    // update text model
                    return this.editorWorkerService.computeMoreMinimalEdits(model.uri, [{ text: newContent, range: model.getFullModelRange() }]).then(edits => {
                        // remove token
                        this.pendingUpdates.delete(model.id);
                        if (!myToken.token.isCancellationRequested && edits && edits.length > 0) {
                            // use the evil-edit as these models show in readonly-editor only
                            model.applyEdits(edits.map(edit => EditOperation.replace(Range.lift(edit.range), edit.text)));
                        }
                        return model;
                    });
                }
                else {
                    // create text model
                    const mime = response.body.mimeType || getMimeTypes(resource)[0];
                    const languageSelection = this.languageService.createByMimeType(mime);
                    return this.modelService.createModel(response.body.content, languageSelection, resource);
                }
            }
            return createErrModel();
        }, (err) => createErrModel(err.message));
    }
};
DebugContentProvider = DebugContentProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IDebugService),
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IEditorWorkerService)
], DebugContentProvider);
export { DebugContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnQ29udGVudFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQTZCLE1BQU0sdURBQXVELENBQUM7QUFFckgsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQWlCLE1BQU0sWUFBWSxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRTs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSSxJQUFN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