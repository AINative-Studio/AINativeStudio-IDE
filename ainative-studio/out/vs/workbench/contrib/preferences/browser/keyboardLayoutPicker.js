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
import * as nls from '../../../../nls.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { parseKeyboardLayoutDescription, areKeyboardLayoutsEqual, getKeyboardLayoutId, IKeyboardLayoutService } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { KEYBOARD_LAYOUT_OPEN_PICKER } from '../common/preferences.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
let KeyboardLayoutPickerContribution = class KeyboardLayoutPickerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.keyboardLayoutPicker'; }
    constructor(keyboardLayoutService, statusbarService) {
        super();
        this.keyboardLayoutService = keyboardLayoutService;
        this.statusbarService = statusbarService;
        this.pickerElement = this._register(new MutableDisposable());
        const name = nls.localize('status.workbench.keyboardLayout', "Keyboard Layout");
        const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
        if (layout) {
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            const text = nls.localize('keyboardLayout', "Layout: {0}", layoutInfo.label);
            this.pickerElement.value = this.statusbarService.addEntry({
                name,
                text,
                ariaLabel: text,
                command: KEYBOARD_LAYOUT_OPEN_PICKER
            }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
        }
        this._register(this.keyboardLayoutService.onDidChangeKeyboardLayout(() => {
            const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            if (this.pickerElement.value) {
                const text = nls.localize('keyboardLayout', "Layout: {0}", layoutInfo.label);
                this.pickerElement.value.update({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER
                });
            }
            else {
                const text = nls.localize('keyboardLayout', "Layout: {0}", layoutInfo.label);
                this.pickerElement.value = this.statusbarService.addEntry({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER
                }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
            }
        }));
    }
};
KeyboardLayoutPickerContribution = __decorate([
    __param(0, IKeyboardLayoutService),
    __param(1, IStatusbarService)
], KeyboardLayoutPickerContribution);
export { KeyboardLayoutPickerContribution };
registerWorkbenchContribution2(KeyboardLayoutPickerContribution.ID, KeyboardLayoutPickerContribution, 1 /* WorkbenchPhase.BlockStartup */);
const DEFAULT_CONTENT = [
    `// ${nls.localize('displayLanguage', 'Defines the keyboard layout used in VS Code in the browser environment.')}`,
    `// ${nls.localize('doc', 'Open VS Code and run "Developer: Inspect Key Mappings (JSON)" from Command Palette.')}`,
    ``,
    `// Once you have the keyboard layout info, please paste it below.`,
    '\n'
].join('\n');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: KEYBOARD_LAYOUT_OPEN_PICKER,
            title: nls.localize2('keyboard.chooseLayout', "Change Keyboard Layout"),
            f1: true
        });
    }
    async run(accessor) {
        const keyboardLayoutService = accessor.get(IKeyboardLayoutService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const environmentService = accessor.get(IEnvironmentService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const layouts = keyboardLayoutService.getAllKeyboardLayouts();
        const currentLayout = keyboardLayoutService.getCurrentKeyboardLayout();
        const layoutConfig = configurationService.getValue('keyboard.layout');
        const isAutoDetect = layoutConfig === 'autodetect';
        const picks = layouts.map(layout => {
            const picked = !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout);
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            return {
                layout: layout,
                label: [layoutInfo.label, (layout && layout.isUserKeyboardLayout) ? '(User configured layout)' : ''].join(' '),
                id: layout.text || layout.lang || layout.layout,
                description: layoutInfo.description + (picked ? ' (Current layout)' : ''),
                picked: !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout)
            };
        }).sort((a, b) => {
            return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0);
        });
        if (picks.length > 0) {
            const platform = isMacintosh ? 'Mac' : isWindows ? 'Win' : 'Linux';
            picks.unshift({ type: 'separator', label: nls.localize('layoutPicks', "Keyboard Layouts ({0})", platform) });
        }
        const configureKeyboardLayout = { label: nls.localize('configureKeyboardLayout', "Configure Keyboard Layout") };
        picks.unshift(configureKeyboardLayout);
        // Offer to "Auto Detect"
        const autoDetectMode = {
            label: nls.localize('autoDetect', "Auto Detect"),
            description: isAutoDetect ? `Current: ${parseKeyboardLayoutDescription(currentLayout).label}` : undefined,
            picked: isAutoDetect ? true : undefined
        };
        picks.unshift(autoDetectMode);
        const pick = await quickInputService.pick(picks, { placeHolder: nls.localize('pickKeyboardLayout', "Select Keyboard Layout"), matchOnDescription: true });
        if (!pick) {
            return;
        }
        if (pick === autoDetectMode) {
            // set keymap service to auto mode
            configurationService.updateValue('keyboard.layout', 'autodetect');
            return;
        }
        if (pick === configureKeyboardLayout) {
            const file = environmentService.keyboardLayoutResource;
            await fileService.stat(file).then(undefined, () => {
                return fileService.createFile(file, VSBuffer.fromString(DEFAULT_CONTENT));
            }).then((stat) => {
                if (!stat) {
                    return undefined;
                }
                return editorService.openEditor({
                    resource: stat.resource,
                    languageId: 'jsonc',
                    options: { pinned: true }
                });
            }, (error) => {
                throw new Error(nls.localize('fail.createSettings', "Unable to create '{0}' ({1}).", file.toString(), error));
            });
            return Promise.resolve();
        }
        configurationService.updateValue('keyboard.layout', getKeyboardLayoutId(pick.layout));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9rZXlib2FyZExheW91dFBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBc0IsaUJBQWlCLEVBQTJCLE1BQU0sa0RBQWtELENBQUM7QUFDbEksT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBdUIsTUFBTSw4REFBOEQsQ0FBQztBQUN6TSxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQWtCLGtCQUFrQixFQUFrQixNQUFNLHNEQUFzRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixP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