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
var GotoDefinitionAtPositionEditorContribution_1;
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import './goToDefinitionAtPosition.css';
import { EditorState } from '../../../editorState/browser/editorState.js';
import { registerEditorContribution } from '../../../../browser/editorExtensions.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { ClickLinkGesture } from './clickLinkGesture.js';
import { PeekContext } from '../../../peekView/browser/peekView.js';
import * as nls from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { DefinitionAction } from '../goToCommands.js';
import { getDefinitionsAtPosition } from '../goToSymbol.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { ModelDecorationInjectedTextOptions } from '../../../../common/model/textModel.js';
let GotoDefinitionAtPositionEditorContribution = class GotoDefinitionAtPositionEditorContribution {
    static { GotoDefinitionAtPositionEditorContribution_1 = this; }
    static { this.ID = 'editor.contrib.gotodefinitionatposition'; }
    static { this.MAX_SOURCE_PREVIEW_LINES = 8; }
    constructor(editor, textModelResolverService, languageService, languageFeaturesService) {
        this.textModelResolverService = textModelResolverService;
        this.languageService = languageService;
        this.languageFeaturesService = languageFeaturesService;
        this.toUnhook = new DisposableStore();
        this.toUnhookForKeyboard = new DisposableStore();
        this.currentWordAtPosition = null;
        this.previousPromise = null;
        this.editor = editor;
        this.linkDecorations = this.editor.createDecorationsCollection();
        const linkGesture = new ClickLinkGesture(editor);
        this.toUnhook.add(linkGesture);
        this.toUnhook.add(linkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this.startFindDefinitionFromMouse(mouseEvent, keyboardEvent ?? undefined);
        }));
        this.toUnhook.add(linkGesture.onExecute((mouseEvent) => {
            if (this.isEnabled(mouseEvent)) {
                this.gotoDefinition(mouseEvent.target.position, mouseEvent.hasSideBySideModifier)
                    .catch((error) => {
                    onUnexpectedError(error);
                })
                    .finally(() => {
                    this.removeLinkDecorations();
                });
            }
        }));
        this.toUnhook.add(linkGesture.onCancel(() => {
            this.removeLinkDecorations();
            this.currentWordAtPosition = null;
        }));
    }
    static get(editor) {
        return editor.getContribution(GotoDefinitionAtPositionEditorContribution_1.ID);
    }
    async startFindDefinitionFromCursor(position) {
        // For issue: https://github.com/microsoft/vscode/issues/46257
        // equivalent to mouse move with meta/ctrl key
        // First find the definition and add decorations
        // to the editor to be shown with the content hover widget
        await this.startFindDefinition(position);
        // Add listeners for editor cursor move and key down events
        // Dismiss the "extended" editor decorations when the user hides
        // the hover widget. There is no event for the widget itself so these
        // serve as a best effort. After removing the link decorations, the hover
        // widget is clean and will only show declarations per next request.
        this.toUnhookForKeyboard.add(this.editor.onDidChangeCursorPosition(() => {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            this.toUnhookForKeyboard.clear();
        }));
        this.toUnhookForKeyboard.add(this.editor.onKeyDown((e) => {
            if (e) {
                this.currentWordAtPosition = null;
                this.removeLinkDecorations();
                this.toUnhookForKeyboard.clear();
            }
        }));
    }
    startFindDefinitionFromMouse(mouseEvent, withKey) {
        // check if we are active and on a content widget
        if (mouseEvent.target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && this.linkDecorations.length > 0) {
            return;
        }
        if (!this.editor.hasModel() || !this.isEnabled(mouseEvent, withKey)) {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            return;
        }
        const position = mouseEvent.target.position;
        this.startFindDefinition(position);
    }
    async startFindDefinition(position) {
        // Dispose listeners for updating decorations when using keyboard to show definition hover
        this.toUnhookForKeyboard.clear();
        // Find word at mouse position
        const word = position ? this.editor.getModel()?.getWordAtPosition(position) : null;
        if (!word) {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            return;
        }
        // Return early if word at position is still the same
        if (this.currentWordAtPosition && this.currentWordAtPosition.startColumn === word.startColumn && this.currentWordAtPosition.endColumn === word.endColumn && this.currentWordAtPosition.word === word.word) {
            return;
        }
        this.currentWordAtPosition = word;
        // Find definition and decorate word if found
        const state = new EditorState(this.editor, 4 /* CodeEditorStateFlag.Position */ | 1 /* CodeEditorStateFlag.Value */ | 2 /* CodeEditorStateFlag.Selection */ | 8 /* CodeEditorStateFlag.Scroll */);
        if (this.previousPromise) {
            this.previousPromise.cancel();
            this.previousPromise = null;
        }
        this.previousPromise = createCancelablePromise(token => this.findDefinition(position, token));
        let results;
        try {
            results = await this.previousPromise;
        }
        catch (error) {
            onUnexpectedError(error);
            return;
        }
        if (!results || !results.length || !state.validate(this.editor)) {
            this.removeLinkDecorations();
            return;
        }
        const linkRange = results[0].originSelectionRange
            ? Range.lift(results[0].originSelectionRange)
            : new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        // Multiple results
        if (results.length > 1) {
            let combinedRange = linkRange;
            for (const { originSelectionRange } of results) {
                if (originSelectionRange) {
                    combinedRange = Range.plusRange(combinedRange, originSelectionRange);
                }
            }
            this.addDecoration(combinedRange, new MarkdownString().appendText(nls.localize('multipleResults', "Click to show {0} definitions.", results.length)));
        }
        else {
            // Single result
            const result = results[0];
            if (!result.uri) {
                return;
            }
            return this.textModelResolverService.createModelReference(result.uri).then(ref => {
                if (!ref.object || !ref.object.textEditorModel) {
                    ref.dispose();
                    return;
                }
                const { object: { textEditorModel } } = ref;
                const { startLineNumber } = result.range;
                if (startLineNumber < 1 || startLineNumber > textEditorModel.getLineCount()) {
                    // invalid range
                    ref.dispose();
                    return;
                }
                const previewValue = this.getPreviewValue(textEditorModel, startLineNumber, result);
                const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(textEditorModel.uri);
                this.addDecoration(linkRange, previewValue ? new MarkdownString().appendCodeblock(languageId ? languageId : '', previewValue) : undefined);
                ref.dispose();
            });
        }
    }
    getPreviewValue(textEditorModel, startLineNumber, result) {
        let rangeToUse = result.range;
        const numberOfLinesInRange = rangeToUse.endLineNumber - rangeToUse.startLineNumber;
        if (numberOfLinesInRange >= GotoDefinitionAtPositionEditorContribution_1.MAX_SOURCE_PREVIEW_LINES) {
            rangeToUse = this.getPreviewRangeBasedOnIndentation(textEditorModel, startLineNumber);
        }
        rangeToUse = textEditorModel.validateRange(rangeToUse);
        const previewValue = this.stripIndentationFromPreviewRange(textEditorModel, startLineNumber, rangeToUse);
        return previewValue;
    }
    stripIndentationFromPreviewRange(textEditorModel, startLineNumber, previewRange) {
        const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumber);
        let minIndent = startIndent;
        for (let endLineNumber = startLineNumber + 1; endLineNumber < previewRange.endLineNumber; endLineNumber++) {
            const endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumber);
            minIndent = Math.min(minIndent, endIndent);
        }
        const previewValue = textEditorModel.getValueInRange(previewRange).replace(new RegExp(`^\\s{${minIndent - 1}}`, 'gm'), '').trim();
        return previewValue;
    }
    getPreviewRangeBasedOnIndentation(textEditorModel, startLineNumber) {
        const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumber);
        const maxLineNumber = Math.min(textEditorModel.getLineCount(), startLineNumber + GotoDefinitionAtPositionEditorContribution_1.MAX_SOURCE_PREVIEW_LINES);
        let endLineNumber = startLineNumber + 1;
        for (; endLineNumber < maxLineNumber; endLineNumber++) {
            const endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumber);
            if (startIndent === endIndent) {
                break;
            }
        }
        return new Range(startLineNumber, 1, endLineNumber + 1, 1);
    }
    addDecoration(range, hoverMessage) {
        const newDecorations = {
            range: range,
            options: {
                description: 'goto-definition-link',
                inlineClassName: 'goto-definition-link',
                hoverMessage
            }
        };
        this.linkDecorations.set([newDecorations]);
    }
    removeLinkDecorations() {
        this.linkDecorations.clear();
    }
    isEnabled(mouseEvent, withKey) {
        return this.editor.hasModel()
            && mouseEvent.isLeftClick
            && mouseEvent.isNoneOrSingleMouseDown
            && mouseEvent.target.type === 6 /* MouseTargetType.CONTENT_TEXT */
            && !(mouseEvent.target.detail.injectedText?.options instanceof ModelDecorationInjectedTextOptions)
            && (mouseEvent.hasTriggerModifier || (withKey ? withKey.keyCodeIsTriggerKey : false))
            && this.languageFeaturesService.definitionProvider.has(this.editor.getModel());
    }
    findDefinition(position, token) {
        const model = this.editor.getModel();
        if (!model) {
            return Promise.resolve(null);
        }
        return getDefinitionsAtPosition(this.languageFeaturesService.definitionProvider, model, position, false, token);
    }
    gotoDefinition(position, openToSide) {
        this.editor.setPosition(position);
        return this.editor.invokeWithinContext((accessor) => {
            const canPeek = !openToSide && this.editor.getOption(93 /* EditorOption.definitionLinkOpensInPeek */) && !this.isInPeekEditor(accessor);
            const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
            return action.run(accessor);
        });
    }
    isInPeekEditor(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        return PeekContext.inPeekEditor.getValue(contextKeyService);
    }
    dispose() {
        this.toUnhook.dispose();
        this.toUnhookForKeyboard.dispose();
    }
};
GotoDefinitionAtPositionEditorContribution = GotoDefinitionAtPositionEditorContribution_1 = __decorate([
    __param(1, ITextModelService),
    __param(2, ILanguageService),
    __param(3, ILanguageFeaturesService)
], GotoDefinitionAtPositionEditorContribution);
export { GotoDefinitionAtPositionEditorContribution };
registerEditorContribution(GotoDefinitionAtPositionEditorContribution.ID, GotoDefinitionAtPositionEditorContribution, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0RlZmluaXRpb25BdFBvc2l0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9saW5rL2dvVG9EZWZpbml0aW9uQXRQb3NpdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWpHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQXVCLFdBQVcsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRS9GLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd0SCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUErQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFD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