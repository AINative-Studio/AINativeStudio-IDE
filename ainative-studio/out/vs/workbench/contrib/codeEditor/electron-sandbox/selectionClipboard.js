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
var SelectionClipboard_1;
import * as nls from '../../../../nls.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { registerEditorContribution, EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { SelectionClipboardContributionID } from '../browser/selectionClipboard.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { addDisposableListener, onDidRegisterWindow } from '../../../../base/browser/dom.js';
let SelectionClipboard = class SelectionClipboard extends Disposable {
    static { SelectionClipboard_1 = this; }
    static { this.SELECTION_LENGTH_LIMIT = 65536; }
    constructor(editor, clipboardService) {
        super();
        if (platform.isLinux) {
            let isEnabled = editor.getOption(112 /* EditorOption.selectionClipboard */);
            this._register(editor.onDidChangeConfiguration((e) => {
                if (e.hasChanged(112 /* EditorOption.selectionClipboard */)) {
                    isEnabled = editor.getOption(112 /* EditorOption.selectionClipboard */);
                }
            }));
            const setSelectionToClipboard = this._register(new RunOnceScheduler(() => {
                if (!editor.hasModel()) {
                    return;
                }
                const model = editor.getModel();
                let selections = editor.getSelections();
                selections = selections.slice(0);
                selections.sort(Range.compareRangesUsingStarts);
                let resultLength = 0;
                for (const sel of selections) {
                    if (sel.isEmpty()) {
                        // Only write if all cursors have selection
                        return;
                    }
                    resultLength += model.getValueLengthInRange(sel);
                }
                if (resultLength > SelectionClipboard_1.SELECTION_LENGTH_LIMIT) {
                    // This is a large selection!
                    // => do not write it to the selection clipboard
                    return;
                }
                const result = [];
                for (const sel of selections) {
                    result.push(model.getValueInRange(sel, 0 /* EndOfLinePreference.TextDefined */));
                }
                const textToCopy = result.join(model.getEOL());
                clipboardService.writeText(textToCopy, 'selection');
            }, 100));
            this._register(editor.onDidChangeCursorSelection((e) => {
                if (!isEnabled) {
                    return;
                }
                if (e.source === 'restoreState') {
                    // do not set selection to clipboard if this selection change
                    // was caused by restoring editors...
                    return;
                }
                setSelectionToClipboard.schedule();
            }));
        }
    }
    dispose() {
        super.dispose();
    }
};
SelectionClipboard = SelectionClipboard_1 = __decorate([
    __param(1, IClipboardService)
], SelectionClipboard);
export { SelectionClipboard };
let LinuxSelectionClipboardPastePreventer = class LinuxSelectionClipboardPastePreventer extends Disposable {
    static { this.ID = 'workbench.contrib.linuxSelectionClipboardPastePreventer'; }
    constructor(configurationService) {
        super();
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window.document, 'mouseup', e => {
                if (e.button === 1) {
                    // middle button
                    const config = configurationService.getValue('editor');
                    if (!config.selectionClipboard) {
                        // selection clipboard is disabled
                        // try to stop the upcoming paste
                        e.preventDefault();
                    }
                }
            }));
        }, { window: mainWindow, disposables: this._store }));
    }
};
LinuxSelectionClipboardPastePreventer = __decorate([
    __param(0, IConfigurationService)
], LinuxSelectionClipboardPastePreventer);
class PasteSelectionClipboardAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.selectionClipboardPaste',
            label: nls.localize2('actions.pasteSelectionClipboard', "Paste Selection Clipboard"),
            precondition: EditorContextKeys.writable
        });
    }
    async run(accessor, editor, args) {
        const clipboardService = accessor.get(IClipboardService);
        // read selection clipboard
        const text = await clipboardService.readText('selection');
        editor.trigger('keyboard', "paste" /* Handler.Paste */, {
            text: text,
            pasteOnNewLine: false,
            multicursorText: null
        });
    }
}
registerEditorContribution(SelectionClipboardContributionID, SelectionClipboard, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to listen to selection change events
if (platform.isLinux) {
    registerWorkbenchContribution2(LinuxSelectionClipboardPastePreventer.ID, LinuxSelectionClipboardPastePreventer, 2 /* WorkbenchPhase.BlockRestore */); // eager because it listens to mouse-up events globally
    registerEditorAction(PasteSelectionClipboardAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uQ2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvZWxlY3Ryb24tc2FuZGJveC9zZWxlY3Rpb25DbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLFlBQVksRUFBb0Isb0JBQW9CLEVBQW1DLE1BQU0sZ0RBQWdELENBQUM7QUFHbkwsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BGLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFD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