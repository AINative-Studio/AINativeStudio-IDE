/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE } from '../../webview/browser/webview.js';
import { WebviewEditor } from './webviewEditor.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const webviewActiveContextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', WebviewEditor.ID), EditorContextKeys.focus.toNegated() /* https://github.com/microsoft/vscode/issues/58668 */);
export class ShowWebViewEditorFindWidgetAction extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.showFind'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.showFind', "Show find"); }
    constructor() {
        super({
            id: ShowWebViewEditorFindWidgetAction.ID,
            title: ShowWebViewEditorFindWidgetAction.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED),
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.showFind();
    }
}
export class HideWebViewEditorFindCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.hideFind'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.hideFind', "Stop find"); }
    constructor() {
        super({
            id: HideWebViewEditorFindCommand.ID,
            title: HideWebViewEditorFindCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE),
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.hideFind();
    }
}
export class WebViewEditorFindNextCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.findNext'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.findNext', 'Find next'); }
    constructor() {
        super({
            id: WebViewEditorFindNextCommand.ID,
            title: WebViewEditorFindNextCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.runFindAction(false);
    }
}
export class WebViewEditorFindPreviousCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.findPrevious'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.findPrevious', 'Find previous'); }
    constructor() {
        super({
            id: WebViewEditorFindPreviousCommand.ID,
            title: WebViewEditorFindPreviousCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.runFindAction(true);
    }
}
export class ReloadWebviewAction extends Action2 {
    static { this.ID = 'workbench.action.webview.reloadWebviewAction'; }
    static { this.LABEL = nls.localize2('refreshWebviewLabel', "Reload Webviews"); }
    constructor() {
        super({
            id: ReloadWebviewAction.ID,
            title: ReloadWebviewAction.LABEL,
            category: Categories.Developer,
            menu: [{
                    id: MenuId.CommandPalette
                }]
        });
    }
    async run(accessor) {
        const webviewService = accessor.get(IWebviewService);
        for (const webview of webviewService.webviews) {
            webview.reload();
        }
    }
}
function getActiveWebviewEditor(accessor) {
    const editorService = accessor.get(IEditorService);
    const activeEditor = editorService.activeEditor;
    return activeEditor instanceof WebviewInput ? activeEditor.webview : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLDhDQUE4QyxFQUFFLDhDQUE4QyxFQUFFLDhDQUE4QyxFQUFZLE1BQU0sa0NBQWtDLENBQUM7QUFDN04sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsc0RBQXNELENBQUUsQ0FBQztBQUU3TSxNQUFNLE9BQU8saUNBQWtDLFNBQVEsT0FBTzthQUN0QyxPQUFFLEdBQUcsc0NBQXNDLENBQUM7YUFDNUMsVUFBSyxHQUFHLEdBQUcsQ0FB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