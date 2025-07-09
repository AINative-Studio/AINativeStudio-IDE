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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextEditorService } from '../../../../services/textfile/common/textEditorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { NO_TYPE_ID } from '../../../../services/workingCopy/common/workingCopy.js';
import { IWorkingCopyEditorService } from '../../../../services/workingCopy/common/workingCopyEditorService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
export class FileEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        const fileEditorInput = editorInput;
        const resource = fileEditorInput.resource;
        const preferredResource = fileEditorInput.preferredResource;
        const serializedFileEditorInput = {
            resourceJSON: resource.toJSON(),
            preferredResourceJSON: isEqual(resource, preferredResource) ? undefined : preferredResource, // only storing preferredResource if it differs from the resource
            name: fileEditorInput.getPreferredName(),
            description: fileEditorInput.getPreferredDescription(),
            encoding: fileEditorInput.getEncoding(),
            modeId: fileEditorInput.getPreferredLanguageId() // only using the preferred user associated language here if available to not store redundant data
        };
        return JSON.stringify(serializedFileEditorInput);
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction(accessor => {
            const serializedFileEditorInput = JSON.parse(serializedEditorInput);
            const resource = URI.revive(serializedFileEditorInput.resourceJSON);
            const preferredResource = URI.revive(serializedFileEditorInput.preferredResourceJSON);
            const name = serializedFileEditorInput.name;
            const description = serializedFileEditorInput.description;
            const encoding = serializedFileEditorInput.encoding;
            const languageId = serializedFileEditorInput.modeId;
            const fileEditorInput = accessor.get(ITextEditorService).createTextEditor({ resource, label: name, description, encoding, languageId, forceFile: true });
            if (preferredResource) {
                fileEditorInput.setPreferredResource(preferredResource);
            }
            return fileEditorInput;
        });
    }
}
let FileEditorWorkingCopyEditorHandler = class FileEditorWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.fileEditorWorkingCopyEditorHandler'; }
    constructor(workingCopyEditorService, textEditorService, fileService) {
        super();
        this.textEditorService = textEditorService;
        this.fileService = fileService;
        this._register(workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.typeId === NO_TYPE_ID && this.fileService.canHandleResource(workingCopy.resource);
    }
    handlesSync(workingCopy) {
        return workingCopy.typeId === NO_TYPE_ID && this.fileService.hasProvider(workingCopy.resource);
    }
    isOpen(workingCopy, editor) {
        if (!this.handlesSync(workingCopy)) {
            return false;
        }
        // Naturally it would make sense here to check for `instanceof FileEditorInput`
        // but because some custom editors also leverage text file based working copies
        // we need to do a weaker check by only comparing for the resource
        return isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return this.textEditorService.createTextEditor({ resource: workingCopy.resource, forceFile: true });
    }
};
FileEditorWorkingCopyEditorHandler = __decorate([
    __param(0, IWorkingCopyEditorService),
    __param(1, ITextEditorService),
    __param(2, IFileService)
], FileEditorWorkingCopyEditorHandler);
export { FileEditorWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9lZGl0b3JzL2ZpbGVFZGl0b3JIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdsRSxPQUFPLEVBQTBCLFVBQVUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVHLE9BQU8sRUFBNkIseUJBQXlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUUzSSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFXN0UsTUFBTSxPQUFPLHlCQUF5QjtJQUVyQyxZQUFZLENBQUMsV0FBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsU0FBUyxDQUFDLFdBQXdCO1FBQ2pDLE1BQU0sZUFBZSxHQUFHLFdBQThCLENBQUM7UUFDdkQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQztRQUMxQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQztRQUM1RCxNQUFNLHlCQUF5QixHQUErQjtZQUM3RCxZQUFZLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMvQixxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsaUVBQWlFO1lBQzlKLElBQUksRUFBRSxlQUFlLENBQUMsZ0JBQWdCLEVBQUU7WUFDeEMsV0FBVyxFQUFFLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRTtZQUN0RCxRQUFRLEVBQUUsZUFBZSxDQUFDLFdBQVcsRUFBRTtZQUN2QyxNQUFNLEVBQUUsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsa0dBQWtHO1NBQ25KLENBQUM7UUFFRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsV0FBVyxDQUFDLG9CQUEyQyxFQUFFLHFCQUE2QjtRQUNyRixPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRCxNQUFNLHlCQUF5QixHQUErQixJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDaEcsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNwRSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN0RixNQUFNLElBQUksR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7WUFDNUMsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsV0FBVyxDQUFDO1lBQzFELE1BQU0sUUFBUSxHQUFHLHlCQUF5QixDQUFDLFFBQVEsQ0FBQztZQUNwRCxNQUFNLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQyxNQUFNLENBQUM7WUFFcEQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFvQixDQUFDO1lBQzVLLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsZUFBZSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDekQsQ0FBQztZQUVELE9BQU8sZUFBZSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRU0sSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxVQUFVO2FBRWpELE9BQUUsR0FBRyxzREFBc0QsQUFBekQsQ0FBMEQ7SUFFNUUsWUFDNEIsd0JBQW1ELEVBQ3pDLGlCQUFxQyxFQUMzQyxXQUF5QjtRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUg2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBSXhELElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELE9BQU8sQ0FBQyxXQUFtQztRQUMxQyxPQUFPLFdBQVcsQ0FBQyxNQUFNLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFTyxXQUFXLENBQUMsV0FBbUM7UUFDdEQsT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFtQyxFQUFFLE1BQW1CO1FBQzlELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsK0VBQStFO1FBQy9FLCtFQUErRTtRQUMvRSxrRUFBa0U7UUFFbEUsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELFlBQVksQ0FBQyxXQUFtQztRQUMvQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3JHLENBQUM7O0FBcENXLGtDQUFrQztJQUs1QyxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7R0FQRixrQ0FBa0MsQ0FxQzlDIn0=