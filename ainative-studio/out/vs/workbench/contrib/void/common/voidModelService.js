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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRNb2RlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFDO0FBRzlFLE9BQU8sRUFBNEIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBaUJsRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLHNCQUFzQixDQUFDLENBQUM7QUFFNUYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO2FBRXhCLE9BQUUsR0FBRyxzQkFBc0IsQUFBekIsQ0FBMEI7SUFHNUMsWUFDb0IsaUJBQXFELEVBQ3RELGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQUg0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3JDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFKckQsbUJBQWMsR0FBeUQsRUFBRSxDQUFDO1FBUzNGLGNBQVMsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUIsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDckMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLDBHQUEwRzthQUNySSxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCxvQkFBZSxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUM7Z0JBQ0osSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjO29CQUFFLE9BQU87Z0JBQzlDLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5RSw4Q0FBOEM7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLGNBQWMsQ0FBQztZQUNsRCxDQUFDO1lBQ0QsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDVixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRix1QkFBa0IsR0FBRyxDQUFDLE1BQWMsRUFBaUIsRUFBRTtZQUN0RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDckIsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO1lBQzNDLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUVwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1RCxDQUFDO1lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3RELENBQUMsQ0FBQztRQUVGLGFBQVEsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxDQUFDLENBQUE7UUFHRCxpQkFBWSxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQTBCLEVBQUU7WUFDekQsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUFFLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFM0IsQ0FBQyxDQUFDO0lBNUNGLENBQUM7SUE4Q1EsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEQsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsc0NBQXNDO1FBQ3RELENBQUM7SUFDRixDQUFDOztBQTdESSxnQkFBZ0I7SUFNbkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGdCQUFnQixDQUFBO0dBUGIsZ0JBQWdCLENBOERyQjtBQUVELGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixrQ0FBMEIsQ0FBQyJ9