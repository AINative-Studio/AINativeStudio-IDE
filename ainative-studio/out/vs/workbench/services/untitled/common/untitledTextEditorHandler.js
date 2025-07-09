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
import { Schemas } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { isEqual, toLocalResource } from '../../../../base/common/resources.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IPathService } from '../../path/common/pathService.js';
import { UntitledTextEditorInput } from './untitledTextEditorInput.js';
import { NO_TYPE_ID } from '../../workingCopy/common/workingCopy.js';
import { IWorkingCopyEditorService } from '../../workingCopy/common/workingCopyEditorService.js';
import { IUntitledTextEditorService } from './untitledTextEditorService.js';
let UntitledTextEditorInputSerializer = class UntitledTextEditorInputSerializer {
    constructor(filesConfigurationService, environmentService, pathService) {
        this.filesConfigurationService = filesConfigurationService;
        this.environmentService = environmentService;
        this.pathService = pathService;
    }
    canSerialize(editorInput) {
        return this.filesConfigurationService.isHotExitEnabled && !editorInput.isDisposed();
    }
    serialize(editorInput) {
        if (!this.canSerialize(editorInput)) {
            return undefined;
        }
        const untitledTextEditorInput = editorInput;
        let resource = untitledTextEditorInput.resource;
        if (untitledTextEditorInput.hasAssociatedFilePath) {
            resource = toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme); // untitled with associated file path use the local schema
        }
        // Language: only remember language if it is either specific (not text)
        // or if the language was explicitly set by the user. We want to preserve
        // this information across restarts and not set the language unless
        // this is the case.
        let languageId;
        const languageIdCandidate = untitledTextEditorInput.getLanguageId();
        if (languageIdCandidate !== PLAINTEXT_LANGUAGE_ID) {
            languageId = languageIdCandidate;
        }
        else if (untitledTextEditorInput.hasLanguageSetExplicitly) {
            languageId = languageIdCandidate;
        }
        const serialized = {
            resourceJSON: resource.toJSON(),
            modeId: languageId,
            encoding: untitledTextEditorInput.getEncoding()
        };
        return JSON.stringify(serialized);
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction(accessor => {
            const deserialized = JSON.parse(serializedEditorInput);
            const resource = URI.revive(deserialized.resourceJSON);
            const languageId = deserialized.modeId;
            const encoding = deserialized.encoding;
            return accessor.get(ITextEditorService).createTextEditor({ resource, languageId, encoding, forceUntitled: true });
        });
    }
};
UntitledTextEditorInputSerializer = __decorate([
    __param(0, IFilesConfigurationService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IPathService)
], UntitledTextEditorInputSerializer);
export { UntitledTextEditorInputSerializer };
let UntitledTextEditorWorkingCopyEditorHandler = class UntitledTextEditorWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.untitledTextEditorWorkingCopyEditorHandler'; }
    constructor(workingCopyEditorService, environmentService, pathService, textEditorService, untitledTextEditorService) {
        super();
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.textEditorService = textEditorService;
        this.untitledTextEditorService = untitledTextEditorService;
        this._register(workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.resource.scheme === Schemas.untitled && workingCopy.typeId === NO_TYPE_ID;
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return editor instanceof UntitledTextEditorInput && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        let editorInputResource;
        // If the untitled has an associated resource,
        // ensure to restore the local resource it had
        if (this.untitledTextEditorService.isUntitledWithAssociatedResource(workingCopy.resource)) {
            editorInputResource = toLocalResource(workingCopy.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
        }
        else {
            editorInputResource = workingCopy.resource;
        }
        return this.textEditorService.createTextEditor({ resource: editorInputResource, forceUntitled: true });
    }
};
UntitledTextEditorWorkingCopyEditorHandler = __decorate([
    __param(0, IWorkingCopyEditorService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IPathService),
    __param(3, ITextEditorService),
    __param(4, IUntitledTextEditorService)
], UntitledTextEditorWorkingCopyEditorHandler);
export { UntitledTextEditorWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvY29tbW9uL3VudGl0bGVkVGV4dEVkaXRvckhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXZFLE9BQU8sRUFBMEIsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0YsT0FBTyxFQUE2Qix5QkFBeUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBUXJFLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWlDO0lBRTdDLFlBQzhDLHlCQUFxRCxF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