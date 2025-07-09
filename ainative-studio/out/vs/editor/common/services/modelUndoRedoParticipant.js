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
import { IModelService } from './model.js';
import { ITextModelService } from './resolverService.js';
import { Disposable, dispose } from '../../../base/common/lifecycle.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { MultiModelEditStackElement } from '../model/editStack.js';
let ModelUndoRedoParticipant = class ModelUndoRedoParticipant extends Disposable {
    constructor(_modelService, _textModelService, _undoRedoService) {
        super();
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._undoRedoService = _undoRedoService;
        this._register(this._modelService.onModelRemoved((model) => {
            // a model will get disposed, so let's check if the undo redo stack is maintained
            const elements = this._undoRedoService.getElements(model.uri);
            if (elements.past.length === 0 && elements.future.length === 0) {
                return;
            }
            for (const element of elements.past) {
                if (element instanceof MultiModelEditStackElement) {
                    element.setDelegate(this);
                }
            }
            for (const element of elements.future) {
                if (element instanceof MultiModelEditStackElement) {
                    element.setDelegate(this);
                }
            }
        }));
    }
    prepareUndoRedo(element) {
        // Load all the needed text models
        const missingModels = element.getMissingModels();
        if (missingModels.length === 0) {
            // All models are available!
            return Disposable.None;
        }
        const disposablesPromises = missingModels.map(async (uri) => {
            try {
                const reference = await this._textModelService.createModelReference(uri);
                return reference;
            }
            catch (err) {
                // This model could not be loaded, maybe it was deleted in the meantime?
                return Disposable.None;
            }
        });
        return Promise.all(disposablesPromises).then(disposables => {
            return {
                dispose: () => dispose(disposables)
            };
        });
    }
};
ModelUndoRedoParticipant = __decorate([
    __param(0, IModelService),
    __param(1, ITextModelService),
    __param(2, IUndoRedoService)
], ModelUndoRedoParticipant);
export { ModelUndoRedoParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxVbmRvUmVkb1BhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbW9kZWxVbmRvUmVkb1BhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDM0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqRixPQUFPLEVBQXFCLDBCQUEwQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0UsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBQ3ZELFlBQ2lDLGFBQTRCLEVBQ3hCLGlCQUFvQyxFQUNyQyxnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFKd0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDeEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNyQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBR3JFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMxRCxpRkFBaUY7WUFDakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hFLE9BQU87WUFDUixDQUFDO1lBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3JDLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7b0JBQ25ELE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7b0JBQ25ELE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxlQUFlLENBQUMsT0FBbUM7UUFDekQsa0NBQWtDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2pELElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyw0QkFBNEI7WUFDNUIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzNELElBQUksQ0FBQztnQkFDSixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekUsT0FBb0IsU0FBUyxDQUFDO1lBQy9CLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLHdFQUF3RTtnQkFDeEUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUMxRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO2FBQ25DLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBbERZLHdCQUF3QjtJQUVsQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLHdCQUF3QixDQWtEcEMifQ==