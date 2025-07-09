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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tNdWx0aURpZmZFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSwrQkFBK0IsRUFBMkQsTUFBTSxvRUFBb0UsQ0FBQztBQUU5SyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVyRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxpQ0FBaUMsQ0FBQztBQUUvRSxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsdUJBQXVCO2FBQy9DLE9BQUUsR0FBVyx3Q0FBd0MsQ0FBQztJQUMvRSxNQUFNLENBQVUsTUFBTSxDQUFDLG9CQUEyQyxFQUFFLFFBQWEsRUFBRSxJQUF3QixFQUFFLFdBQStCLEVBQUUsZ0JBQXFCLEVBQUUsUUFBZ0I7UUFDcEwsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5RyxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0RyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0gsQ0FBQzs7QUFHSyxJQUFNLGtDQUFrQywwQ0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxvQkFBb0I7SUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBNEMsRUFBRSxvQkFBMkM7UUFDbEgsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLDZCQUE2QixJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1SSxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsb0NBQWtDLEVBQ2xDLGVBQWUsRUFDZixxQkFBcUIsQ0FDckIsQ0FBQztJQUNILENBQUM7SUFDRCxZQUNDLGVBQW9CLEVBQ0gscUJBQTRDLEVBQzFDLGlCQUFvQyxFQUNwQixpQ0FBb0UsRUFDaEYscUJBQTRDLEVBQ2xDLCtCQUFnRSxFQUMvRSxnQkFBa0M7UUFFcEQsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSwrQkFBK0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBUGxLLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFRN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQywrQkFBK0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBUTtRQUNwQixPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzNELENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBTTtRQUM3QixPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQ2xELENBQUM7Q0FDRCxDQUFBO0FBN0JZLGtDQUFrQztJQVk1QyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLCtCQUErQixDQUFBO0lBQy9CLFdBQUEsZ0JBQWdCLENBQUE7R0FoQk4sa0NBQWtDLENBNkI5QyJ9