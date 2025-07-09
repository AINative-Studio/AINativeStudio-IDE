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
import { ReferenceCollection } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService, createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookCellOutlineDataSource } from './notebookOutlineDataSource.js';
let NotebookCellOutlineDataSourceReferenceCollection = class NotebookCellOutlineDataSourceReferenceCollection extends ReferenceCollection {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    createReferencedObject(_key, editor) {
        return this.instantiationService.createInstance(NotebookCellOutlineDataSource, editor);
    }
    destroyReferencedObject(_key, object) {
        object.dispose();
    }
};
NotebookCellOutlineDataSourceReferenceCollection = __decorate([
    __param(0, IInstantiationService)
], NotebookCellOutlineDataSourceReferenceCollection);
export const INotebookCellOutlineDataSourceFactory = createDecorator('INotebookCellOutlineDataSourceFactory');
let NotebookCellOutlineDataSourceFactory = class NotebookCellOutlineDataSourceFactory {
    constructor(instantiationService) {
        this._data = instantiationService.createInstance(NotebookCellOutlineDataSourceReferenceCollection);
    }
    getOrCreate(editor) {
        return this._data.acquire(editor.getId(), editor);
    }
};
NotebookCellOutlineDataSourceFactory = __decorate([
    __param(0, IInstantiationService)
], NotebookCellOutlineDataSourceFactory);
export { NotebookCellOutlineDataSourceFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvbm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZUZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFtQixNQUFNLHlDQUF5QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV2SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUvRSxJQUFNLGdEQUFnRCxHQUF0RCxNQUFNLGdEQUFpRCxTQUFRLG1CQUFrRDtJQUNoSCxZQUFvRCxvQkFBMkM7UUFDOUYsS0FBSyxFQUFFLENBQUM7UUFEMkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUUvRixDQUFDO0lBQ2tCLHNCQUFzQixDQUFDLElBQVksRUFBRSxNQUF1QjtRQUM5RSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUNrQix1QkFBdUIsQ0FBQyxJQUFZLEVBQUUsTUFBcUM7UUFDN0YsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBVkssZ0RBQWdEO0lBQ3hDLFdBQUEscUJBQXFCLENBQUE7R0FEN0IsZ0RBQWdELENBVXJEO0FBRUQsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsZUFBZSxDQUF3Qyx1Q0FBdUMsQ0FBQyxDQUFDO0FBTTlJLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQW9DO0lBRWhELFlBQW1DLG9CQUEyQztRQUM3RSxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFRCxXQUFXLENBQUMsTUFBdUI7UUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNELENBQUE7QUFUWSxvQ0FBb0M7SUFFbkMsV0FBQSxxQkFBcUIsQ0FBQTtHQUZ0QixvQ0FBb0MsQ0FTaEQifQ==