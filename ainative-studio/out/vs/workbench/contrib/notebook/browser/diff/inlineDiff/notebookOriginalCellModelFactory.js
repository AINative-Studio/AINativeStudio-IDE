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
import { ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
export const INotebookOriginalCellModelFactory = createDecorator('INotebookOriginalCellModelFactory');
let OriginalNotebookCellModelReferenceCollection = class OriginalNotebookCellModelReferenceCollection extends ReferenceCollection {
    constructor(modelService, _languageService) {
        super();
        this.modelService = modelService;
        this._languageService = _languageService;
    }
    createReferencedObject(_key, uri, cellValue, language, cellKind) {
        const scheme = `${uri.scheme}-chat-edit`;
        const originalCellUri = URI.from({ scheme, fragment: uri.fragment, path: uri.path });
        const languageSelection = this._languageService.getLanguageIdByLanguageName(language) ? this._languageService.createById(language) : cellKind === CellKind.Markup ? this._languageService.createById('markdown') : null;
        return this.modelService.createModel(cellValue, languageSelection, originalCellUri);
    }
    destroyReferencedObject(_key, model) {
        model.dispose();
    }
};
OriginalNotebookCellModelReferenceCollection = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService)
], OriginalNotebookCellModelReferenceCollection);
export { OriginalNotebookCellModelReferenceCollection };
let OriginalNotebookCellModelFactory = class OriginalNotebookCellModelFactory {
    constructor(instantiationService) {
        this._data = instantiationService.createInstance(OriginalNotebookCellModelReferenceCollection);
    }
    getOrCreate(uri, cellValue, language, cellKind) {
        return this._data.acquire(uri.toString(), uri, cellValue, language, cellKind);
    }
};
OriginalNotebookCellModelFactory = __decorate([
    __param(0, IInstantiationService)
], OriginalNotebookCellModelFactory);
export { OriginalNotebookCellModelFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbENlbGxNb2RlbEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tPcmlnaW5hbENlbGxNb2RlbEZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFjLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRTFILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR2xGLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FBb0MsbUNBQW1DLENBQUMsQ0FBQztBQVFsSSxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUE2QyxTQUFRLG1CQUErQjtJQUNoRyxZQUE0QyxZQUEyQixFQUNuQyxnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFIbUMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtJQUd0RSxDQUFDO0lBRWtCLHNCQUFzQixDQUFDLElBQVksRUFBRSxHQUFRLEVBQUUsU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWtCO1FBQ3hILE1BQU0sTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sWUFBWSxDQUFDO1FBQ3pDLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3hOLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFDa0IsdUJBQXVCLENBQUMsSUFBWSxFQUFFLEtBQWlCO1FBQ3pFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQWhCWSw0Q0FBNEM7SUFDM0MsV0FBQSxhQUFhLENBQUE7SUFDeEIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUZOLDRDQUE0QyxDQWdCeEQ7O0FBRU0sSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBZ0M7SUFHNUMsWUFBbUMsb0JBQTJDO1FBQzdFLElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVELFdBQVcsQ0FBQyxHQUFRLEVBQUUsU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWtCO1FBQzVFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQy9FLENBQUM7Q0FDRCxDQUFBO0FBVlksZ0NBQWdDO0lBRy9CLFdBQUEscUJBQXFCLENBQUE7R0FIdEIsZ0NBQWdDLENBVTVDIn0=