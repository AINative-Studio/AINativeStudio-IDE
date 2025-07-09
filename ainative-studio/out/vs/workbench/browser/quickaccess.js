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
import { localize } from '../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../platform/keybinding/common/keybinding.js';
import { IQuickInputService } from '../../platform/quickinput/common/quickInput.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { getIEditor } from '../../editor/browser/editorBrowser.js';
import { IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../services/editor/common/editorService.js';
export const inQuickPickContextKeyValue = 'inQuickOpen';
export const InQuickPickContextKey = new RawContextKey(inQuickPickContextKeyValue, false, localize('inQuickOpen', "Whether keyboard focus is inside the quick open control"));
export const inQuickPickContext = ContextKeyExpr.has(inQuickPickContextKeyValue);
export const defaultQuickAccessContextKeyValue = 'inFilesPicker';
export const defaultQuickAccessContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(defaultQuickAccessContextKeyValue));
export function getQuickNavigateHandler(id, next) {
    return accessor => {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(id);
        const quickNavigate = { keybindings: keys };
        quickInputService.navigate(!!next, quickNavigate);
    };
}
let PickerEditorState = class PickerEditorState extends Disposable {
    constructor(editorService, editorGroupsService) {
        super();
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        this._editorViewState = undefined;
        this.openedTransientEditors = new Set(); // editors that were opened between set and restore
    }
    set() {
        if (this._editorViewState) {
            return; // return early if already done
        }
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditorPane) {
            this._editorViewState = {
                group: activeEditorPane.group,
                editor: activeEditorPane.input,
                state: getIEditor(activeEditorPane.getControl())?.saveViewState() ?? undefined,
            };
        }
    }
    /**
     * Open a transient editor such that it may be closed when the state is restored.
     * Note that, when the state is restored, if the editor is no longer transient, it will not be closed.
     */
    async openTransientEditor(editor, group) {
        editor.options = { ...editor.options, transient: true };
        const editorPane = await this.editorService.openEditor(editor, group);
        if (editorPane?.input && editorPane.input !== this._editorViewState?.editor && editorPane.group.isTransient(editorPane.input)) {
            this.openedTransientEditors.add(editorPane.input);
        }
        return editorPane;
    }
    async restore() {
        if (this._editorViewState) {
            for (const editor of this.openedTransientEditors) {
                if (editor.isDirty()) {
                    continue;
                }
                for (const group of this.editorGroupsService.groups) {
                    if (group.isTransient(editor)) {
                        await group.closeEditor(editor, { preserveFocus: true });
                    }
                }
            }
            await this._editorViewState.group.openEditor(this._editorViewState.editor, {
                viewState: this._editorViewState.state,
                preserveFocus: true // important to not close the picker as a result
            });
            this.reset();
        }
    }
    reset() {
        this._editorViewState = undefined;
        this.openedTransientEditors.clear();
    }
    dispose() {
        super.dispose();
        this.reset();
    }
};
PickerEditorState = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService)
], PickerEditorState);
export { PickerEditorState };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2thY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcXVpY2thY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFJbkUsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RHLE9BQU8sRUFBNEMsY0FBYyxFQUFtQixNQUFNLDRDQUE0QyxDQUFDO0FBR3ZJLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGFBQWEsQ0FBQztBQUN4RCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSwwQkFBMEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSx5REFBeUQsQ0FBQyxDQUFDLENBQUM7QUFDdkwsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBRWpGLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FBQztBQUNqRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFr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