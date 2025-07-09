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
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export const IVoidModelService = createDecorator('voidVoidModelService');
let VoidModelService = class VoidModelService extends Disposable {
    static { this.ID = 'voidVoidModelService'; }
    constructor(_textModelService, _textFileService) {
        super();
        this._textModelService = _textModelService;
        this._textFileService = _textFileService;
        this._modelRefOfURI = {};
        this.saveModel = async (uri) => {
            await this._textFileService.save(uri, {
                skipSaveParticipants: true // avoid triggering extensions etc (if they reformat the page, it will add another item to the undo stack)
            });
        };
        this.initializeModel = async (uri) => {
            try {
                if (uri.fsPath in this._modelRefOfURI)
                    return;
                const editorModelRef = await this._textModelService.createModelReference(uri);
                // Keep a strong reference to prevent disposal
                this._modelRefOfURI[uri.fsPath] = editorModelRef;
            }
            catch (e) {
                console.log('InitializeModel error:', e);
            }
        };
        this.getModelFromFsPath = (fsPath) => {
            const editorModelRef = this._modelRefOfURI[fsPath];
            if (!editorModelRef) {
                return { model: null, editorModel: null };
            }
            const model = editorModelRef.object.textEditorModel;
            if (!model) {
                return { model: null, editorModel: editorModelRef.object };
            }
            return { model, editorModel: editorModelRef.object };
        };
        this.getModel = (uri) => {
            return this.getModelFromFsPath(uri.fsPath);
        };
        this.getModelSafe = async (uri) => {
            if (!(uri.fsPath in this._modelRefOfURI))
                await this.initializeModel(uri);
            return this.getModel(uri);
        };
    }
    dispose() {
        super.dispose();
        for (const ref of Object.values(this._modelRefOfURI)) {
            ref.dispose(); // release reference to allow disposal
        }
    }
};
VoidModelService = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService)
], VoidModelService);
registerSingleton(IVoidModelService, VoidModelService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi92b2lkTW9kZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQztBQUc5RSxPQUFPLEVBQTRCLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDcEgsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQWlCbEYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixzQkFBc0IsQ0FBQyxDQUFDO0FBRTVGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTthQUV4QixPQUFFLEdBQUcsc0JBQXNCLEFBQXpCLENBQTBCO0lBRzVDLFlBQ29CLGlCQUFxRCxFQUN0RCxnQkFBbUQ7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFINEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNyQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBSnJELG1CQUFjLEdBQXlELEVBQUUsQ0FBQztRQVMzRixjQUFTLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQzlCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JDLG9CQUFvQixFQUFFLElBQUksQ0FBQywwR0FBMEc7YUFDckksQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBRUQsb0JBQWUsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDO2dCQUNKLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYztvQkFBRSxPQUFPO2dCQUM5QyxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUUsOENBQThDO2dCQUM5QyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxjQUFjLENBQUM7WUFDbEQsQ0FBQztZQUNELE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsdUJBQWtCLEdBQUcsQ0FBQyxNQUFjLEVBQWlCLEVBQUU7WUFDdEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMzQyxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7WUFFcEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUQsQ0FBQztZQUVELE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0RCxDQUFDLENBQUM7UUFFRixhQUFRLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRTtZQUN2QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsQ0FBQyxDQUFBO1FBR0QsaUJBQVksR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUEwQixFQUFFO1lBQ3pELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFBRSxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTNCLENBQUMsQ0FBQztJQTVDRixDQUFDO0lBOENRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3RELEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQztRQUN0RCxDQUFDO0lBQ0YsQ0FBQzs7QUE3REksZ0JBQWdCO0lBTW5CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQVBiLGdCQUFnQixDQThEckI7QUFFRCxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0Isa0NBQTBCLENBQUMifQ==