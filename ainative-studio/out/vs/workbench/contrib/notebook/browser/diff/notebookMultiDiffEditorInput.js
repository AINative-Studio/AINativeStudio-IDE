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
var NotebookMultiDiffEditorWidgetInput_1;
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { IMultiDiffSourceResolverService } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
export const NotebookMultiDiffEditorScheme = 'multi-cell-notebook-diff-editor';
export class NotebookMultiDiffEditorInput extends NotebookDiffEditorInput {
    static { this.ID = 'workbench.input.multiDiffNotebookInput'; }
    static create(instantiationService, resource, name, description, originalResource, viewType) {
        const original = NotebookEditorInput.getOrCreate(instantiationService, originalResource, undefined, viewType);
        const modified = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, viewType);
        return instantiationService.createInstance(NotebookMultiDiffEditorInput, name, description, original, modified, viewType);
    }
}
let NotebookMultiDiffEditorWidgetInput = NotebookMultiDiffEditorWidgetInput_1 = class NotebookMultiDiffEditorWidgetInput extends MultiDiffEditorInput {
    static createInput(notebookDiffViewModel, instantiationService) {
        const multiDiffSource = URI.parse(`${NotebookMultiDiffEditorScheme}:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
        return instantiationService.createInstance(NotebookMultiDiffEditorWidgetInput_1, multiDiffSource, notebookDiffViewModel);
    }
    constructor(multiDiffSource, notebookDiffViewModel, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService) {
        super(multiDiffSource, undefined, undefined, true, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService);
        this.notebookDiffViewModel = notebookDiffViewModel;
        this._register(_multiDiffSourceResolverService.registerResolver(this));
    }
    canHandleUri(uri) {
        return uri.toString() === this.multiDiffSource.toString();
    }
    async resolveDiffSource(_) {
        return { resources: this.notebookDiffViewModel };
    }
};
NotebookMultiDiffEditorWidgetInput = NotebookMultiDiffEditorWidgetInput_1 = __decorate([
    __param(2, ITextModelService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IMultiDiffSourceResolverService),
    __param(6, ITextFileService)
], NotebookMultiDiffEditorWidgetInput);
export { NotebookMultiDiffEditorWidgetInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rTXVsdGlEaWZmRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUN2SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsK0JBQStCLEVBQTJELE1BQU0sb0VBQW9FLENBQUM7QUFFOUssT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFckYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsaUNBQWlDLENBQUM7QUFFL0UsTUFBTSxPQUFPLDRCQUE2QixTQUFRLHVCQUF1QjthQUMvQyxPQUFFLEdBQVcsd0NBQXdDLENBQUM7SUFDL0UsTUFBTSxDQUFVLE1BQU0sQ0FBQyxvQkFBMkMsRUFBRSxRQUFhLEVBQUUsSUFBd0IsRUFBRSxXQUErQixFQUFFLGdCQUFxQixFQUFFLFFBQWdCO1FBQ3BMLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUcsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEcsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNILENBQUM7O0FBR0ssSUFBTSxrQ0FBa0MsMENBQXhDLE1BQU0sa0NBQW1DLFNBQVEsb0JBQW9CO0lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQTRDLEVBQUUsb0JBQTJDO1FBQ2xILE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyw2QkFBNkIsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUksT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLG9DQUFrQyxFQUNsQyxlQUFlLEVBQ2YscUJBQXFCLENBQ3JCLENBQUM7SUFDSCxDQUFDO0lBQ0QsWUFDQyxlQUFvQixFQUNILHFCQUE0QyxFQUMxQyxpQkFBb0MsRUFDcEIsaUNBQW9FLEVBQ2hGLHFCQUE0QyxFQUNsQywrQkFBZ0UsRUFDL0UsZ0JBQWtDO1FBRXBELEtBQUssQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQVBsSywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBUTdELElBQUksQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVE7UUFDcEIsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUMzRCxDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQU07UUFDN0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0NBQ0QsQ0FBQTtBQTdCWSxrQ0FBa0M7SUFZNUMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwrQkFBK0IsQ0FBQTtJQUMvQixXQUFBLGdCQUFnQixDQUFBO0dBaEJOLGtDQUFrQyxDQTZCOUMifQ==