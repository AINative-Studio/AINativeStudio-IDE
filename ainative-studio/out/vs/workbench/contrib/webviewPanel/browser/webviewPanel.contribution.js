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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { HideWebViewEditorFindCommand, ReloadWebviewAction, ShowWebViewEditorFindWidgetAction, WebViewEditorFindNextCommand, WebViewEditorFindPreviousCommand } from './webviewCommands.js';
import { WebviewEditor } from './webviewEditor.js';
import { WebviewInput } from './webviewEditorInput.js';
import { WebviewEditorInputSerializer } from './webviewEditorInputSerializer.js';
import { IWebviewWorkbenchService, WebviewEditorService } from './webviewWorkbenchService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
(Registry.as(EditorExtensions.EditorPane)).registerEditorPane(EditorPaneDescriptor.create(WebviewEditor, WebviewEditor.ID, localize('webview.editor.label', "webview editor")), [new SyncDescriptor(WebviewInput)]);
let WebviewPanelContribution = class WebviewPanelContribution extends Disposable {
    static { this.ID = 'workbench.contrib.webviewPanel'; }
    constructor(editorService, editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        this._register(editorService.onWillOpenEditor(e => {
            const group = editorGroupService.getGroup(e.groupId);
            if (group) {
                this.onEditorOpening(e.editor, group);
            }
        }));
    }
    onEditorOpening(editor, group) {
        if (!(editor instanceof WebviewInput) || editor.typeId !== WebviewInput.typeId) {
            return;
        }
        if (group.contains(editor)) {
            return;
        }
        let previousGroup;
        const groups = this.editorGroupService.groups;
        for (const group of groups) {
            if (group.contains(editor)) {
                previousGroup = group;
                break;
            }
        }
        if (!previousGroup) {
            return;
        }
        previousGroup.closeEditor(editor);
    }
};
WebviewPanelContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService)
], WebviewPanelContribution);
registerWorkbenchContribution2(WebviewPanelContribution.ID, WebviewPanelContribution, 1 /* WorkbenchPhase.BlockStartup */);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(WebviewEditorInputSerializer.ID, WebviewEditorInputSerializer);
registerSingleton(IWebviewWorkbenchService, WebviewEditorService, 1 /* InstantiationType.Delayed */);
registerAction2(ShowWebViewEditorFindWidgetAction);
registerAction2(HideWebViewEditorFindCommand);
registerAction2(WebViewEditorFindNextCommand);
registerAction2(WebViewEditorFindPreviousCommand);
registerAction2(ReloadWebviewAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1BhbmVsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3UGFuZWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFDO0FBRXJGLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsbUJBQW1CLEVBQUUsaUNBQWlDLEVBQUUsNEJBQTRCLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUM1TCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZELE9BQU8sRUFB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