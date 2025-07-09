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
var KeybindingsEditorInput_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { OS } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { KeybindingsEditorModel } from './keybindingsEditorModel.js';
const KeybindingsEditorIcon = registerIcon('keybindings-editor-label-icon', Codicon.keyboard, nls.localize('keybindingsEditorLabelIcon', 'Icon of the keybindings editor label.'));
let KeybindingsEditorInput = class KeybindingsEditorInput extends EditorInput {
    static { KeybindingsEditorInput_1 = this; }
    static { this.ID = 'workbench.input.keybindings'; }
    constructor(instantiationService) {
        super();
        this.searchOptions = null;
        this.resource = undefined;
        this.keybindingsModel = instantiationService.createInstance(KeybindingsEditorModel, OS);
    }
    get typeId() {
        return KeybindingsEditorInput_1.ID;
    }
    getName() {
        return nls.localize('keybindingsInputName', "Keyboard Shortcuts");
    }
    getIcon() {
        return KeybindingsEditorIcon;
    }
    async resolve() {
        return this.keybindingsModel;
    }
    matches(otherInput) {
        return otherInput instanceof KeybindingsEditorInput_1;
    }
    dispose() {
        this.keybindingsModel.dispose();
        super.dispose();
    }
};
KeybindingsEditorInput = KeybindingsEditorInput_1 = __decorate([
    __param(0, IInstantiationService)
], KeybindingsEditorInput);
export { KeybindingsEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvYnJvd3Nlci9rZXliaW5kaW5nc0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXpELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQVFyRSxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsdUNBQXVDLENBQUMsQ0FBQyxDQUFDO0FBRTVLLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsV0FBVzs7YUFFdEMsT0FBRSxHQUFXLDZCQUE2QixBQUF4QyxDQUF5QztJQU8zRCxZQUFtQyxvQkFBMkM7UUFDN0UsS0FBSyxFQUFFLENBQUM7UUFMVCxrQkFBYSxHQUEyQyxJQUFJLENBQUM7UUFFcEQsYUFBUSxHQUFHLFNBQVMsQ0FBQztRQUs3QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxJQUFhLE1BQU07UUFDbEIsT0FBTyx3QkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8scUJBQXFCLENBQUM7SUFDOUIsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFFUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsT0FBTyxVQUFVLFlBQVksd0JBQXNCLENBQUM7SUFDckQsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFaEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7O0FBdkNXLHNCQUFzQjtJQVNyQixXQUFBLHFCQUFxQixDQUFBO0dBVHRCLHNCQUFzQixDQXdDbEMifQ==