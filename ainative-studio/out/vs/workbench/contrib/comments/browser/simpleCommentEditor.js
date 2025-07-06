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
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
// Allowed Editor Contributions:
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { EditorDictation } from '../../codeEditor/browser/dictation/editorDictation.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { clamp } from '../../../../base/common/numbers.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { PlaceholderTextContribution } from '../../../../editor/contrib/placeholderText/browser/placeholderTextContribution.js';
export const ctxCommentEditorFocused = new RawContextKey('commentEditorFocused', false);
export const MIN_EDITOR_HEIGHT = 5 * 18;
export const MAX_EDITOR_HEIGHT = 25 * 18;
let SimpleCommentEditor = class SimpleCommentEditor extends CodeEditorWidget {
    constructor(domElement, options, scopedContextKeyService, parentThread, instantiationService, codeEditorService, commandService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        const codeEditorWidgetOptions = {
            contributions: [
                { id: MenuPreventer.ID, ctor: MenuPreventer, instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */ },
                { id: ContextMenuController.ID, ctor: ContextMenuController, instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */ },
                { id: SuggestController.ID, ctor: SuggestController, instantiation: 0 /* EditorContributionInstantiation.Eager */ },
                { id: SnippetController2.ID, ctor: SnippetController2, instantiation: 4 /* EditorContributionInstantiation.Lazy */ },
                { id: TabCompletionController.ID, ctor: TabCompletionController, instantiation: 0 /* EditorContributionInstantiation.Eager */ }, // eager because it needs to define a context key
                { id: EditorDictation.ID, ctor: EditorDictation, instantiation: 4 /* EditorContributionInstantiation.Lazy */ },
                ...EditorExtensionsRegistry.getSomeEditorContributions([
                    CopyPasteController.ID,
                    DropIntoEditorController.ID,
                    LinkDetector.ID,
                    MessageController.ID,
                    ContentHoverController.ID,
                    GlyphHoverController.ID,
                    SelectionClipboardContributionID,
                    InlineCompletionsController.ID,
                    CodeActionController.ID,
                    PlaceholderTextContribution.ID
                ])
            ],
            contextMenuId: MenuId.SimpleEditorContext
        };
        super(domElement, options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, scopedContextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        this._commentEditorFocused = ctxCommentEditorFocused.bindTo(scopedContextKeyService);
        this._commentEditorEmpty = CommentContextKeys.commentIsEmpty.bindTo(scopedContextKeyService);
        this._commentEditorEmpty.set(!this.getModel()?.getValueLength());
        this._parentThread = parentThread;
        this._register(this.onDidFocusEditorWidget(_ => this._commentEditorFocused.set(true)));
        this._register(this.onDidChangeModelContent(e => this._commentEditorEmpty.set(!this.getModel()?.getValueLength())));
        this._register(this.onDidBlurEditorWidget(_ => this._commentEditorFocused.reset()));
    }
    getParentThread() {
        return this._parentThread;
    }
    _getActions() {
        return EditorExtensionsRegistry.getEditorActions();
    }
    updateOptions(newOptions) {
        const withLineNumberRemoved = { ...newOptions, lineNumbers: 'off' };
        super.updateOptions(withLineNumberRemoved);
    }
    static getEditorOptions(configurationService) {
        return {
            wordWrap: 'on',
            glyphMargin: false,
            lineNumbers: 'off',
            folding: false,
            selectOnLineNumbers: false,
            scrollbar: {
                vertical: 'visible',
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false
            },
            overviewRulerLanes: 2,
            lineDecorationsWidth: 0,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            fixedOverflowWidgets: true,
            acceptSuggestionOnEnter: 'smart',
            minimap: {
                enabled: false
            },
            dropIntoEditor: { enabled: true },
            autoClosingBrackets: configurationService.getValue('editor.autoClosingBrackets'),
            quickSuggestions: false,
            accessibilitySupport: configurationService.getValue('editor.accessibilitySupport'),
            fontFamily: configurationService.getValue('editor.fontFamily'),
            fontSize: configurationService.getValue('editor.fontSize'),
        };
    }
};
SimpleCommentEditor = __decorate([
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, ICommandService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], SimpleCommentEditor);
export { SimpleCommentEditor };
export function calculateEditorHeight(parentEditor, editor, currentHeight) {
    const layoutInfo = editor.getLayoutInfo();
    const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
    const contentHeight = (editor._getViewModel()?.getLineCount() * lineHeight); // Can't just call getContentHeight() because it returns an incorrect, large, value when the editor is first created.
    if ((contentHeight > layoutInfo.height) ||
        (contentHeight < layoutInfo.height && currentHeight > MIN_EDITOR_HEIGHT)) {
        const linesToAdd = Math.ceil((contentHeight - layoutInfo.height) / lineHeight);
        const proposedHeight = layoutInfo.height + (lineHeight * linesToAdd);
        return clamp(proposedHeight, MIN_EDITOR_HEIGHT, clamp(parentEditor.getLayoutInfo().height - 90, MIN_EDITOR_HEIGHT, MAX_EDITOR_HEIGHT));
    }
    return currentHeight;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tbWVudEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvc2ltcGxlQ29tbWVudEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQWlELHdCQUF3QixFQUFrQyxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pLLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSxrRUFBa0UsQ0FBQztBQUM5SCxPQUFPLEVBQXNCLGFBQWEsRUFBZSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVuRixnQ0FBZ0M7QUFDaEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFC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