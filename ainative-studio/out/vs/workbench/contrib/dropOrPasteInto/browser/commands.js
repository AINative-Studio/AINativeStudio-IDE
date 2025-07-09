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
import { toAction } from '../../../../base/common/actions.js';
import { CopyPasteController, pasteAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController, dropAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { localize } from '../../../../nls.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
let DropOrPasteIntoCommands = class DropOrPasteIntoCommands {
    static { this.ID = 'workbench.contrib.dropOrPasteInto'; }
    constructor(_preferencesService) {
        this._preferencesService = _preferencesService;
        CopyPasteController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredPasteAction',
            label: localize('configureDefaultPaste.label', 'Configure preferred paste action...'),
            run: () => this.configurePreferredPasteAction()
        }));
        DropIntoEditorController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredDropAction',
            label: localize('configureDefaultDrop.label', 'Configure preferred drop action...'),
            run: () => this.configurePreferredDropAction()
        }));
    }
    configurePreferredPasteAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: pasteAsPreferenceConfig, edit: true }
        });
    }
    configurePreferredDropAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: dropAsPreferenceConfig, edit: true }
        });
    }
};
DropOrPasteIntoCommands = __decorate([
    __param(0, IPreferencesService)
], DropOrPasteIntoCommands);
export { DropOrPasteIntoCommands };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3pJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVuRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjthQUNyQixPQUFFLEdBQUcsbUNBQW1DLEFBQXRDLENBQXVDO0lBRXZELFlBQ3VDLG1CQUF3QztRQUF4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRTlFLG1CQUFtQixDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQztZQUN0RCxFQUFFLEVBQUUsZ0RBQWdEO1lBQ3BELEtBQUssRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUscUNBQXFDLENBQUM7WUFDckYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtTQUMvQyxDQUFDLENBQUMsQ0FBQztRQUVKLHdCQUF3QixDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQztZQUMzRCxFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsb0NBQW9DLENBQUM7WUFDbkYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtTQUM5QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyw2QkFBNkI7UUFDcEMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUM7WUFDaEQsVUFBVSxFQUFFLElBQUk7WUFDaEIsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7U0FDM0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLDRCQUE0QjtRQUNuQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNoRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtTQUMxRCxDQUFDLENBQUM7SUFDSixDQUFDOztBQS9CVyx1QkFBdUI7SUFJakMsV0FBQSxtQkFBbUIsQ0FBQTtHQUpULHVCQUF1QixDQWdDbkMifQ==