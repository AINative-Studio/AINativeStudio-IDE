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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { SimpleCommentEditor } from './simpleCommentEditor.js';
let CommentsInputContentProvider = class CommentsInputContentProvider extends Disposable {
    static { this.ID = 'comments.input.contentProvider'; }
    constructor(textModelService, codeEditorService, _modelService, _languageService) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.commentsInput, this));
        this._register(codeEditorService.registerCodeEditorOpenHandler(async (input, editor, _sideBySide) => {
            if (!(editor instanceof SimpleCommentEditor)) {
                return null;
            }
            if (editor.getModel()?.uri.toString() !== input.resource.toString()) {
                return null;
            }
            if (input.options) {
                applyTextEditorOptions(input.options, editor, 1 /* ScrollType.Immediate */);
            }
            return editor;
        }));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        return existing ?? this._modelService.createModel('', this._languageService.createById('markdown'), resource);
    }
};
CommentsInputContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ICodeEditorService),
    __param(2, IModelService),
    __param(3, ILanguageService)
], CommentsInputContentProvider);
export { CommentsInputContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNJbnB1dENvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzSW5wdXRDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUc3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXJILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXhELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUVwQyxPQUFFLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW9DO0lBRTdELFlBQ29CLGdCQUFtQyxFQUNsQyxpQkFBcUMsRUFDekIsYUFBNEIsRUFDekIsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBSHdCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFHckUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsS0FBK0IsRUFBRSxNQUEwQixFQUFFLFdBQXFCLEVBQStCLEVBQUU7WUFDeEwsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDckUsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSwrQkFBdUIsQ0FBQztZQUNyRSxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFhO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sUUFBUSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQy9HLENBQUM7O0FBaENXLDRCQUE0QjtJQUt0QyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGdCQUFnQixDQUFBO0dBUk4sNEJBQTRCLENBaUN4QyJ9