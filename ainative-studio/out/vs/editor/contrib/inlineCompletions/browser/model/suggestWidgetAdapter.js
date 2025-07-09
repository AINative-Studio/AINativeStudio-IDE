/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { findFirstMax } from '../../../../../base/common/arraysFind.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { SelectedSuggestionInfo } from '../../../../common/languages.js';
import { singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { SnippetParser } from '../../../snippet/browser/snippetParser.js';
import { SnippetSession } from '../../../snippet/browser/snippetSession.js';
import { SuggestController } from '../../../suggest/browser/suggestController.js';
import { observableFromEvent } from '../../../../../base/common/observable.js';
export class SuggestWidgetAdaptor extends Disposable {
    get selectedItem() {
        return this._currentSuggestItemInfo;
    }
    constructor(editor, suggestControllerPreselector, onWillAccept) {
        super();
        this.editor = editor;
        this.suggestControllerPreselector = suggestControllerPreselector;
        this.onWillAccept = onWillAccept;
        this.isSuggestWidgetVisible = false;
        this.isShiftKeyPressed = false;
        this._isActive = false;
        this._currentSuggestItemInfo = undefined;
        this._onDidSelectedItemChange = this._register(new Emitter());
        this.onDidSelectedItemChange = this._onDidSelectedItemChange.event;
        // See the command acceptAlternativeSelectedSuggestion that is bound to shift+tab
        this._register(editor.onKeyDown(e => {
            if (e.shiftKey && !this.isShiftKeyPressed) {
                this.isShiftKeyPressed = true;
                this.update(this._isActive);
            }
        }));
        this._register(editor.onKeyUp(e => {
            if (e.shiftKey && this.isShiftKeyPressed) {
                this.isShiftKeyPressed = false;
                this.update(this._isActive);
            }
        }));
        const suggestController = SuggestController.get(this.editor);
        if (suggestController) {
            this._register(suggestController.registerSelector({
                priority: 100,
                select: (model, pos, suggestItems) => {
                    const textModel = this.editor.getModel();
                    if (!textModel) {
                        // Should not happen
                        return -1;
                    }
                    const i = this.suggestControllerPreselector();
                    const itemToPreselect = i ? singleTextRemoveCommonPrefix(i, textModel) : undefined;
                    if (!itemToPreselect) {
                        return -1;
                    }
                    const position = Position.lift(pos);
                    const candidates = suggestItems
                        .map((suggestItem, index) => {
                        const suggestItemInfo = SuggestItemInfo.fromSuggestion(suggestController, textModel, position, suggestItem, this.isShiftKeyPressed);
                        const suggestItemTextEdit = singleTextRemoveCommonPrefix(suggestItemInfo.toSingleTextEdit(), textModel);
                        const valid = singleTextEditAugments(itemToPreselect, suggestItemTextEdit);
                        return { index, valid, prefixLength: suggestItemTextEdit.text.length, suggestItem };
                    })
                        .filter(item => item && item.valid && item.prefixLength > 0);
                    const result = findFirstMax(candidates, compareBy(s => s.prefixLength, numberComparator));
                    return result ? result.index : -1;
                }
            }));
            let isBoundToSuggestWidget = false;
            const bindToSuggestWidget = () => {
                if (isBoundToSuggestWidget) {
                    return;
                }
                isBoundToSuggestWidget = true;
                this._register(suggestController.widget.value.onDidShow(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
                this._register(suggestController.widget.value.onDidHide(() => {
                    this.isSuggestWidgetVisible = false;
                    this.update(false);
                }));
                this._register(suggestController.widget.value.onDidFocus(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
            };
            this._register(Event.once(suggestController.model.onDidTrigger)(e => {
                bindToSuggestWidget();
            }));
            this._register(suggestController.onWillInsertSuggestItem(e => {
                const position = this.editor.getPosition();
                const model = this.editor.getModel();
                if (!position || !model) {
                    return undefined;
                }
                const suggestItemInfo = SuggestItemInfo.fromSuggestion(suggestController, model, position, e.item, this.isShiftKeyPressed);
                this.onWillAccept(suggestItemInfo);
            }));
        }
        this.update(this._isActive);
    }
    update(newActive) {
        const newInlineCompletion = this.getSuggestItemInfo();
        if (this._isActive !== newActive || !suggestItemInfoEquals(this._currentSuggestItemInfo, newInlineCompletion)) {
            this._isActive = newActive;
            this._currentSuggestItemInfo = newInlineCompletion;
            this._onDidSelectedItemChange.fire();
        }
    }
    getSuggestItemInfo() {
        const suggestController = SuggestController.get(this.editor);
        if (!suggestController || !this.isSuggestWidgetVisible) {
            return undefined;
        }
        const focusedItem = suggestController.widget.value.getFocusedItem();
        const position = this.editor.getPosition();
        const model = this.editor.getModel();
        if (!focusedItem || !position || !model) {
            return undefined;
        }
        return SuggestItemInfo.fromSuggestion(suggestController, model, position, focusedItem.item, this.isShiftKeyPressed);
    }
    stopForceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        suggestController?.stopForceRenderingAbove();
    }
    forceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        suggestController?.forceRenderingAbove();
    }
}
export class SuggestItemInfo {
    static fromSuggestion(suggestController, model, position, item, toggleMode) {
        let { insertText } = item.completion;
        let isSnippetText = false;
        if (item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */) {
            const snippet = new SnippetParser().parse(insertText);
            if (snippet.children.length < 100) {
                // Adjust whitespace is expensive.
                SnippetSession.adjustWhitespace(model, position, true, snippet);
            }
            insertText = snippet.toString();
            isSnippetText = true;
        }
        const info = suggestController.getOverwriteInfo(item, toggleMode);
        return new SuggestItemInfo(Range.fromPositions(position.delta(0, -info.overwriteBefore), position.delta(0, Math.max(info.overwriteAfter, 0))), insertText, item.completion.kind, isSnippetText);
    }
    constructor(range, insertText, completionItemKind, isSnippetText) {
        this.range = range;
        this.insertText = insertText;
        this.completionItemKind = completionItemKind;
        this.isSnippetText = isSnippetText;
    }
    equals(other) {
        return this.range.equalsRange(other.range)
            && this.insertText === other.insertText
            && this.completionItemKind === other.completionItemKind
            && this.isSnippetText === other.isSnippetText;
    }
    toSelectedSuggestionInfo() {
        return new SelectedSuggestionInfo(this.range, this.insertText, this.completionItemKind, this.isSnippetText);
    }
    toSingleTextEdit() {
        return new SingleTextEdit(this.range, this.insertText);
    }
}
function suggestItemInfoEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return a.equals(b);
}
export class ObservableSuggestWidgetAdapter extends Disposable {
    constructor(_editorObs, _handleSuggestAccepted, _suggestControllerPreselector) {
        super();
        this._editorObs = _editorObs;
        this._handleSuggestAccepted = _handleSuggestAccepted;
        this._suggestControllerPreselector = _suggestControllerPreselector;
        this._suggestWidgetAdaptor = this._register(new SuggestWidgetAdaptor(this._editorObs.editor, () => {
            this._editorObs.forceUpdate();
            return this._suggestControllerPreselector();
        }, (item) => this._editorObs.forceUpdate(_tx => {
            /** @description InlineCompletionsController.handleSuggestAccepted */
            this._handleSuggestAccepted(item);
        })));
        this.selectedItem = observableFromEvent(this, cb => this._suggestWidgetAdaptor.onDidSelectedItemChange(() => {
            this._editorObs.forceUpdate(_tx => cb(undefined));
        }), () => this._suggestWidgetAdaptor.selectedItem);
    }
    stopForceRenderingAbove() {
        this._suggestWidgetAdaptor.stopForceRenderingAbove();
    }
    forceRenderingAbove() {
        this._suggestWidgetAdaptor.forceRenderingAbove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldEFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9zdWdnZXN0V2lkZ2V0QWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBb0Qsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUzSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRS9FLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBS25ELElBQVcsWUFB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