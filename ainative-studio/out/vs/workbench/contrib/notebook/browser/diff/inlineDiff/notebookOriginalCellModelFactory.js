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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbENlbGxNb2RlbEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rT3JpZ2luYWxDZWxsTW9kZWxGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYyxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUUxSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdsRixNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLG1DQUFtQyxDQUFDLENBQUM7QUFRbEksSUFBTSw0Q0FBNEMsR0FBbEQsTUFBTSw0Q0FBNkMsU0FBUSxtQkFBK0I7SUFDaEcsWUFBNEMsWUFBMkIsRUFDbkMsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBSG1DLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7SUFHdEUsQ0FBQztJQUVrQixzQkFBc0IsQ0FBQyxJQUFZLEVBQUUsR0FBUSxFQUFFLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxRQUFrQjtRQUN4SCxNQUFNLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLFlBQVksQ0FBQztRQUN6QyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNyRixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN4TixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQ2tCLHVCQUF1QixDQUFDLElBQVksRUFBRSxLQUFpQjtRQUN6RSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNELENBQUE7QUFoQlksNENBQTRDO0lBQzNDLFdBQUEsYUFBYSxDQUFBO0lBQ3hCLFdBQUEsZ0JBQWdCLENBQUE7R0FGTiw0Q0FBNEMsQ0FnQnhEOztBQUVNLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWdDO0lBRzVDLFlBQW1DLG9CQUEyQztRQUM3RSxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFRCxXQUFXLENBQUMsR0FBUSxFQUFFLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxRQUFrQjtRQUM1RSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMvRSxDQUFDO0NBQ0QsQ0FBQTtBQVZZLGdDQUFnQztJQUcvQixXQUFBLHFCQUFxQixDQUFBO0dBSHRCLGdDQUFnQyxDQVU1QyJ9