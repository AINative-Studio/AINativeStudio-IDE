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
import { BaseTextEditorModel } from './textEditorModel.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageDetectionService } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
/**
 * An editor model for in-memory, readonly text content that
 * is backed by an existing editor model.
 */
let TextResourceEditorModel = class TextResourceEditorModel extends BaseTextEditorModel {
    constructor(resource, languageService, modelService, languageDetectionService, accessibilityService) {
        super(modelService, languageService, languageDetectionService, accessibilityService, resource);
    }
    dispose() {
        // force this class to dispose the underlying model
        if (this.textEditorModelHandle) {
            this.modelService.destroyModel(this.textEditorModelHandle);
        }
        super.dispose();
    }
};
TextResourceEditorModel = __decorate([
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ILanguageDetectionService),
    __param(4, IAccessibilityService)
], TextResourceEditorModel);
export { TextResourceEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvdGV4dFJlc291cmNlRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHOzs7R0FHRztBQUNJLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsbUJBQW1CO0lBRS9ELFlBQ0MsUUFBYSxFQUNLLGVBQWlDLEVBQ3BDLFlBQTJCLEVBQ2Ysd0JBQW1ELEVBQ3ZELG9CQUEyQztRQUVsRSxLQUFLLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBRVEsT0FBTztRQUVmLG1EQUFtRDtRQUNuRCxJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNELENBQUE7QUFyQlksdUJBQXVCO0lBSWpDLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEscUJBQXFCLENBQUE7R0FQWCx1QkFBdUIsQ0FxQm5DIn0=