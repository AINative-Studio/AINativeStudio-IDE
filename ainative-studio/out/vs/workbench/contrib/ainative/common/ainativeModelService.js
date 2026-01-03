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
export const IAINativeModelService = createDecorator('voidAINativeModelService');
let AINativeModelService = class AINativeModelService extends Disposable {
    static { this.ID = 'voidAINativeModelService'; }
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
AINativeModelService = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService)
], AINativeModelService);
registerSingleton(IAINativeModelService, AINativeModelService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVNb2RlbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haW5hdGl2ZU1vZGVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUM7QUFHOUUsT0FBTyxFQUE0QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFpQmxGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0IsMEJBQTBCLENBQUMsQ0FBQztBQUV4RyxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7YUFFNUIsT0FBRSxHQUFHLDBCQUEwQixBQUE3QixDQUE4QjtJQUdoRCxZQUNvQixpQkFBcUQsRUFDdEQsZ0JBQW1EO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBSDRCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUpyRCxtQkFBYyxHQUF5RCxFQUFFLENBQUM7UUFTM0YsY0FBUyxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUM5QixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNyQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsMEdBQTBHO2FBQ3JJLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQTtRQUVELG9CQUFlLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQztnQkFDSixJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWM7b0JBQUUsT0FBTztnQkFDOUMsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzlFLDhDQUE4QztnQkFDOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDO1lBQ2xELENBQUM7WUFDRCxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLHVCQUFrQixHQUFHLENBQUMsTUFBYyxFQUFpQixFQUFFO1lBQ3RELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDM0MsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1lBRXBELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVELENBQUM7WUFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdEQsQ0FBQyxDQUFDO1FBRUYsYUFBUSxHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLENBQUMsQ0FBQTtRQUdELGlCQUFZLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBMEIsRUFBRTtZQUN6RCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQUUsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUUzQixDQUFDLENBQUM7SUE1Q0YsQ0FBQztJQThDUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7UUFDdEQsQ0FBQztJQUNGLENBQUM7O0FBN0RJLG9CQUFvQjtJQU12QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZ0JBQWdCLENBQUE7R0FQYixvQkFBb0IsQ0E4RHpCO0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLGtDQUEwQixDQUFDIn0=