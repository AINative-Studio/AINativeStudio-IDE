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
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { AccessibilityHelpAction } from './accessibleViewActions.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { CommentAccessibilityHelpNLS } from '../../comments/browser/commentsAccessibility.js';
import { CommentContextKeys } from '../../comments/common/commentContextKeys.js';
import { NEW_UNTITLED_FILE_COMMAND_ID } from '../../files/browser/fileConstants.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ctxHasEditorModification, ctxHasRequestInProgress } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export class EditorAccessibilityHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(90, 'editor', async (accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const accessibleViewService = accessor.get(IAccessibleViewService);
            const instantiationService = accessor.get(IInstantiationService);
            const commandService = accessor.get(ICommandService);
            let codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
            if (!codeEditor) {
                await commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
                codeEditor = codeEditorService.getActiveCodeEditor();
            }
            accessibleViewService.show(instantiationService.createInstance(EditorAccessibilityHelpProvider, codeEditor));
        }));
    }
}
let EditorAccessibilityHelpProvider = class EditorAccessibilityHelpProvider extends Disposable {
    onClose() {
        this._editor.focus();
    }
    constructor(_editor, _keybindingService, _contextKeyService, accessibilityService, _configurationService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.accessibilityService = accessibilityService;
        this._configurationService = _configurationService;
        this.id = "editor" /* AccessibleViewProviderId.Editor */;
        this.options = { type: "help" /* AccessibleViewType.Help */, readMoreUrl: 'https://go.microsoft.com/fwlink/?linkid=851010' };
        this.verbositySettingKey = "accessibility.verbosity.editor" /* AccessibilityVerbositySettingId.Editor */;
    }
    provideContent() {
        const options = this._editor.getOptions();
        const content = [];
        if (options.get(63 /* EditorOption.inDiffEditor */)) {
            if (options.get(96 /* EditorOption.readOnly */)) {
                content.push(AccessibilityHelpNLS.readonlyDiffEditor);
            }
            else {
                content.push(AccessibilityHelpNLS.editableDiffEditor);
            }
        }
        else {
            if (options.get(96 /* EditorOption.readOnly */)) {
                content.push(AccessibilityHelpNLS.readonlyEditor);
            }
            else {
                content.push(AccessibilityHelpNLS.editableEditor);
            }
        }
        if (this.accessibilityService.isScreenReaderOptimized() && this._configurationService.getValue('accessibility.windowTitleOptimized')) {
            content.push(AccessibilityHelpNLS.defaultWindowTitleIncludesEditorState);
        }
        else {
            content.push(AccessibilityHelpNLS.defaultWindowTitleExcludingEditorState);
        }
        content.push(AccessibilityHelpNLS.toolbar);
        const chatEditInfo = getChatEditInfo(this._keybindingService, this._contextKeyService, this._editor);
        if (chatEditInfo) {
            content.push(chatEditInfo);
        }
        content.push(AccessibilityHelpNLS.listSignalSounds);
        content.push(AccessibilityHelpNLS.listAlerts);
        const chatCommandInfo = getChatCommandInfo(this._keybindingService, this._contextKeyService);
        if (chatCommandInfo) {
            content.push(chatCommandInfo);
        }
        const commentCommandInfo = getCommentCommandInfo(this._keybindingService, this._contextKeyService, this._editor);
        if (commentCommandInfo) {
            content.push(commentCommandInfo);
        }
        content.push(AccessibilityHelpNLS.suggestActions);
        content.push(AccessibilityHelpNLS.acceptSuggestAction);
        content.push(AccessibilityHelpNLS.toggleSuggestionFocus);
        if (options.get(120 /* EditorOption.stickyScroll */).enabled) {
            content.push(AccessibilityHelpNLS.stickScroll);
        }
        if (options.get(150 /* EditorOption.tabFocusMode */)) {
            content.push(AccessibilityHelpNLS.tabFocusModeOnMsg);
        }
        else {
            content.push(AccessibilityHelpNLS.tabFocusModeOffMsg);
        }
        content.push(AccessibilityHelpNLS.codeFolding);
        content.push(AccessibilityHelpNLS.intellisense);
        content.push(AccessibilityHelpNLS.showOrFocusHover);
        content.push(AccessibilityHelpNLS.goToSymbol);
        content.push(AccessibilityHelpNLS.startDebugging);
        content.push(AccessibilityHelpNLS.setBreakpoint);
        content.push(AccessibilityHelpNLS.debugExecuteSelection);
        content.push(AccessibilityHelpNLS.addToWatch);
        return content.join('\n');
    }
};
EditorAccessibilityHelpProvider = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextKeyService),
    __param(3, IAccessibilityService),
    __param(4, IConfigurationService)
], EditorAccessibilityHelpProvider);
export function getCommentCommandInfo(keybindingService, contextKeyService, editor) {
    const editorContext = contextKeyService.getContext(editor.getDomNode());
    if (editorContext.getValue(CommentContextKeys.activeEditorHasCommentingRange.key)) {
        return [CommentAccessibilityHelpNLS.intro, CommentAccessibilityHelpNLS.addComment, CommentAccessibilityHelpNLS.nextCommentThread, CommentAccessibilityHelpNLS.previousCommentThread, CommentAccessibilityHelpNLS.nextRange, CommentAccessibilityHelpNLS.previousRange].join('\n');
    }
    return;
}
export function getChatCommandInfo(keybindingService, contextKeyService) {
    if (ChatContextKeys.enabled.getValue(contextKeyService)) {
        return [AccessibilityHelpNLS.quickChat, AccessibilityHelpNLS.startInlineChat].join('\n');
    }
    return;
}
export function getChatEditInfo(keybindingService, contextKeyService, editor) {
    const editorContext = contextKeyService.getContext(editor.getDomNode());
    if (editorContext.getValue(ctxHasEditorModification.key)) {
        return AccessibilityHelpNLS.chatEditorModification + '\n' + AccessibilityHelpNLS.chatEditActions;
    }
    else if (editorContext.getValue(ctxHasRequestInProgress.key)) {
        return AccessibilityHelpNLS.chatEditorRequestInProgress;
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2VkaXRvckFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxzQkFBc0IsRUFBd0csTUFBTSw4REFBOEQsQ0FBQztBQUU1TSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNu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