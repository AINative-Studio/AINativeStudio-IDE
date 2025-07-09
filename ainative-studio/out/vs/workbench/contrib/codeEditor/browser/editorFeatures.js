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
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { getEditorFeatures } from '../../../../editor/common/editorFeatures.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
let EditorFeaturesInstantiator = class EditorFeaturesInstantiator extends Disposable {
    static { this.ID = 'workbench.contrib.editorFeaturesInstantiator'; }
    constructor(codeEditorService, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._instantiated = false;
        this._register(codeEditorService.onWillCreateCodeEditor(() => this._instantiate()));
        this._register(codeEditorService.onWillCreateDiffEditor(() => this._instantiate()));
        if (codeEditorService.listCodeEditors().length > 0 || codeEditorService.listDiffEditors().length > 0) {
            this._instantiate();
        }
    }
    _instantiate() {
        if (this._instantiated) {
            return;
        }
        this._instantiated = true;
        // Instantiate all editor features
        const editorFeatures = getEditorFeatures();
        for (const feature of editorFeatures) {
            try {
                const instance = this._instantiationService.createInstance(feature);
                if (typeof instance.dispose === 'function') {
                    this._register(instance);
                }
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
    }
};
EditorFeaturesInstantiator = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IInstantiationService)
], EditorFeaturesInstantiator);
registerWorkbenchContribution2(EditorFeaturesInstantiator.ID, EditorFeaturesInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2VkaXRvckZlYXR1cmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFMUgsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO2FBRWxDLE9BQUUsR0FBRyw4Q0FBOEMsQUFBakQsQ0FBa0Q7SUFJcEUsWUFDcUIsaUJBQXFDLEVBQ2xDLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUZnQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSjdFLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBUTdCLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEYsSUFBSSxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0RyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZO1FBQ25CLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFFMUIsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxPQUFxQixRQUFTLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFlLFFBQVMsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDOztBQXJDSSwwQkFBMEI7SUFPN0IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0dBUmxCLDBCQUEwQixDQXNDL0I7QUFFRCw4QkFBOEIsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsMEJBQTBCLHNDQUE4QixDQUFDIn0=