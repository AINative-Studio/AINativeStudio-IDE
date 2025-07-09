/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { RedoCommand, SelectAllCommand, UndoCommand } from '../../../../editor/browser/editorExtensions.js';
import { CopyAction, CutAction, PasteAction } from '../../../../editor/contrib/clipboard/browser/clipboard.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IWebviewService } from './webview.js';
import { WebviewInput } from '../../webviewPanel/browser/webviewEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const PRIORITY = 100;
function overrideCommandForWebview(command, f) {
    command?.addImplementation(PRIORITY, 'webview', accessor => {
        const webviewService = accessor.get(IWebviewService);
        const webview = webviewService.activeWebview;
        if (webview?.isFocused) {
            f(webview);
            return true;
        }
        // When focused in a custom menu try to fallback to the active webview
        // This is needed for context menu actions and the menubar
        if (getActiveElement()?.classList.contains('action-menu-item')) {
            const editorService = accessor.get(IEditorService);
            if (editorService.activeEditor instanceof WebviewInput) {
                f(editorService.activeEditor.webview);
                return true;
            }
        }
        return false;
    });
}
overrideCommandForWebview(UndoCommand, webview => webview.undo());
overrideCommandForWebview(RedoCommand, webview => webview.redo());
overrideCommandForWebview(SelectAllCommand, webview => webview.selectAll());
overrideCommandForWebview(CopyAction, webview => webview.copy());
overrideCommandForWebview(PasteAction, webview => webview.paste());
overrideCommandForWebview(CutAction, webview => webview.cut());
export const PreventDefaultContextMenuItemsContextKeyName = 'preventDefaultContextMenuItems';
if (CutAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: CutAction.id,
            title: nls.localize('cut', "Cut"),
        },
        group: '5_cutcopypaste',
        order: 1,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
if (CopyAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: CopyAction.id,
            title: nls.localize('copy', "Copy"),
        },
        group: '5_cutcopypaste',
        order: 2,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
if (PasteAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: PasteAction.id,
            title: nls.localize('paste', "Paste"),
        },
        group: '5_cutcopypaste',
        order: 3,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3dlYnZpZXcuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBZ0IsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9HLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBWSxNQUFNLGNBQWMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBR2xGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQztBQUVyQixTQUFTLHlCQUF5QixDQUFDLE9BQWlDLEVBQUUsQ0FBOEI7SUFDbkcsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQUU7UUFDMUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNyRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsYUFBYSxD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