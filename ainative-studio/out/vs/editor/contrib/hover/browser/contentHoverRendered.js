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
var RenderedContentHover_1, RenderedContentHoverParts_1;
import { RenderedHoverParts } from './hoverTypes.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { EditorHoverStatusBar } from './contentHoverStatusBar.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as dom from '../../../../base/browser/dom.js';
import { MarkdownHoverParticipant } from './markdownHoverParticipant.js';
import { HoverColorPickerParticipant } from '../../colorPicker/browser/hoverColorPicker/hoverColorPickerParticipant.js';
import { localize } from '../../../../nls.js';
import { InlayHintsHover } from '../../inlayHints/browser/inlayHintsHover.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let RenderedContentHover = RenderedContentHover_1 = class RenderedContentHover extends Disposable {
    constructor(editor, hoverResult, participants, context, keybindingService, hoverService) {
        super();
        const parts = hoverResult.hoverParts;
        this._renderedHoverParts = this._register(new RenderedContentHoverParts(editor, participants, parts, context, keybindingService, hoverService));
        const contentHoverComputerOptions = hoverResult.options;
        const anchor = contentHoverComputerOptions.anchor;
        const { showAtPosition, showAtSecondaryPosition } = RenderedContentHover_1.computeHoverPositions(editor, anchor.range, parts);
        this.shouldAppearBeforeContent = parts.some(m => m.isBeforeContent);
        this.showAtPosition = showAtPosition;
        this.showAtSecondaryPosition = showAtSecondaryPosition;
        this.initialMousePosX = anchor.initialMousePosX;
        this.initialMousePosY = anchor.initialMousePosY;
        this.shouldFocus = contentHoverComputerOptions.shouldFocus;
        this.source = contentHoverComputerOptions.source;
    }
    get domNode() {
        return this._renderedHoverParts.domNode;
    }
    get domNodeHasChildren() {
        return this._renderedHoverParts.domNodeHasChildren;
    }
    get focusedHoverPartIndex() {
        return this._renderedHoverParts.focusedHoverPartIndex;
    }
    get hoverPartsCount() {
        return this._renderedHoverParts.hoverPartsCount;
    }
    focusHoverPartWithIndex(index) {
        this._renderedHoverParts.focusHoverPartWithIndex(index);
    }
    getAccessibleWidgetContent() {
        return this._renderedHoverParts.getAccessibleContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._renderedHoverParts.getAccessibleHoverContentAtIndex(index);
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        this._renderedHoverParts.updateHoverVerbosityLevel(action, index, focus);
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._renderedHoverParts.doesHoverAtIndexSupportVerbosityAction(index, action);
    }
    isColorPickerVisible() {
        return this._renderedHoverParts.isColorPickerVisible();
    }
    static computeHoverPositions(editor, anchorRange, hoverParts) {
        let startColumnBoundary = 1;
        if (editor.hasModel()) {
            // Ensure the range is on the current view line
            const viewModel = editor._getViewModel();
            const coordinatesConverter = viewModel.coordinatesConverter;
            const anchorViewRange = coordinatesConverter.convertModelRangeToViewRange(anchorRange);
            const anchorViewMinColumn = viewModel.getLineMinColumn(anchorViewRange.startLineNumber);
            const anchorViewRangeStart = new Position(anchorViewRange.startLineNumber, anchorViewMinColumn);
            startColumnBoundary = coordinatesConverter.convertViewPositionToModelPosition(anchorViewRangeStart).column;
        }
        // The anchor range is always on a single line
        const anchorStartLineNumber = anchorRange.startLineNumber;
        let secondaryPositionColumn = anchorRange.startColumn;
        let forceShowAtRange;
        for (const hoverPart of hoverParts) {
            const hoverPartRange = hoverPart.range;
            const hoverPartRangeOnAnchorStartLine = hoverPartRange.startLineNumber === anchorStartLineNumber;
            const hoverPartRangeOnAnchorEndLine = hoverPartRange.endLineNumber === anchorStartLineNumber;
            const hoverPartRangeIsOnAnchorLine = hoverPartRangeOnAnchorStartLine && hoverPartRangeOnAnchorEndLine;
            if (hoverPartRangeIsOnAnchorLine) {
                // this message has a range that is completely sitting on the line of the anchor
                const hoverPartStartColumn = hoverPartRange.startColumn;
                const minSecondaryPositionColumn = Math.min(secondaryPositionColumn, hoverPartStartColumn);
                secondaryPositionColumn = Math.max(minSecondaryPositionColumn, startColumnBoundary);
            }
            if (hoverPart.forceShowAtRange) {
                forceShowAtRange = hoverPartRange;
            }
        }
        let showAtPosition;
        let showAtSecondaryPosition;
        if (forceShowAtRange) {
            const forceShowAtPosition = forceShowAtRange.getStartPosition();
            showAtPosition = forceShowAtPosition;
            showAtSecondaryPosition = forceShowAtPosition;
        }
        else {
            showAtPosition = anchorRange.getStartPosition();
            showAtSecondaryPosition = new Position(anchorStartLineNumber, secondaryPositionColumn);
        }
        return {
            showAtPosition,
            showAtSecondaryPosition,
        };
    }
};
RenderedContentHover = RenderedContentHover_1 = __decorate([
    __param(4, IKeybindingService),
    __param(5, IHoverService)
], RenderedContentHover);
export { RenderedContentHover };
class RenderedStatusBar {
    constructor(fragment, _statusBar) {
        this._statusBar = _statusBar;
        fragment.appendChild(this._statusBar.hoverElement);
    }
    get hoverElement() {
        return this._statusBar.hoverElement;
    }
    get actions() {
        return this._statusBar.actions;
    }
    dispose() {
        this._statusBar.dispose();
    }
}
let RenderedContentHoverParts = class RenderedContentHoverParts extends Disposable {
    static { RenderedContentHoverParts_1 = this; }
    static { this._DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'content-hover-highlight',
        className: 'hoverHighlight'
    }); }
    constructor(editor, participants, hoverParts, context, keybindingService, hoverService) {
        super();
        this._renderedParts = [];
        this._focusedHoverPartIndex = -1;
        this._context = context;
        this._fragment = document.createDocumentFragment();
        this._register(this._renderParts(participants, hoverParts, context, keybindingService, hoverService));
        this._register(this._registerListenersOnRenderedParts());
        this._register(this._createEditorDecorations(editor, hoverParts));
        this._updateMarkdownAndColorParticipantInfo(participants);
    }
    _createEditorDecorations(editor, hoverParts) {
        if (hoverParts.length === 0) {
            return Disposable.None;
        }
        let highlightRange = hoverParts[0].range;
        for (const hoverPart of hoverParts) {
            const hoverPartRange = hoverPart.range;
            highlightRange = Range.plusRange(highlightRange, hoverPartRange);
        }
        const highlightDecoration = editor.createDecorationsCollection();
        highlightDecoration.set([{
                range: highlightRange,
                options: RenderedContentHoverParts_1._DECORATION_OPTIONS
            }]);
        return toDisposable(() => {
            highlightDecoration.clear();
        });
    }
    _renderParts(participants, hoverParts, hoverContext, keybindingService, hoverService) {
        const statusBar = new EditorHoverStatusBar(keybindingService, hoverService);
        const hoverRenderingContext = {
            fragment: this._fragment,
            statusBar,
            ...hoverContext
        };
        const disposables = new DisposableStore();
        disposables.add(statusBar);
        for (const participant of participants) {
            const renderedHoverParts = this._renderHoverPartsForParticipant(hoverParts, participant, hoverRenderingContext);
            disposables.add(renderedHoverParts);
            for (const renderedHoverPart of renderedHoverParts.renderedHoverParts) {
                this._renderedParts.push({
                    type: 'hoverPart',
                    participant,
                    hoverPart: renderedHoverPart.hoverPart,
                    hoverElement: renderedHoverPart.hoverElement,
                });
            }
        }
        const renderedStatusBar = this._renderStatusBar(this._fragment, statusBar);
        if (renderedStatusBar) {
            disposables.add(renderedStatusBar);
            this._renderedParts.push({
                type: 'statusBar',
                hoverElement: renderedStatusBar.hoverElement,
                actions: renderedStatusBar.actions,
            });
        }
        return disposables;
    }
    _renderHoverPartsForParticipant(hoverParts, participant, hoverRenderingContext) {
        const hoverPartsForParticipant = hoverParts.filter(hoverPart => hoverPart.owner === participant);
        const hasHoverPartsForParticipant = hoverPartsForParticipant.length > 0;
        if (!hasHoverPartsForParticipant) {
            return new RenderedHoverParts([]);
        }
        return participant.renderHoverParts(hoverRenderingContext, hoverPartsForParticipant);
    }
    _renderStatusBar(fragment, statusBar) {
        if (!statusBar.hasContent) {
            return undefined;
        }
        return new RenderedStatusBar(fragment, statusBar);
    }
    _registerListenersOnRenderedParts() {
        const disposables = new DisposableStore();
        this._renderedParts.forEach((renderedPart, index) => {
            const element = renderedPart.hoverElement;
            element.tabIndex = 0;
            disposables.add(dom.addDisposableListener(element, dom.EventType.FOCUS_IN, (event) => {
                event.stopPropagation();
                this._focusedHoverPartIndex = index;
            }));
            disposables.add(dom.addDisposableListener(element, dom.EventType.FOCUS_OUT, (event) => {
                event.stopPropagation();
                this._focusedHoverPartIndex = -1;
            }));
        });
        return disposables;
    }
    _updateMarkdownAndColorParticipantInfo(participants) {
        const markdownHoverParticipant = participants.find(p => {
            return (p instanceof MarkdownHoverParticipant) && !(p instanceof InlayHintsHover);
        });
        if (markdownHoverParticipant) {
            this._markdownHoverParticipant = markdownHoverParticipant;
        }
        this._colorHoverParticipant = participants.find(p => p instanceof HoverColorPickerParticipant);
    }
    focusHoverPartWithIndex(index) {
        if (index < 0 || index >= this._renderedParts.length) {
            return;
        }
        this._renderedParts[index].hoverElement.focus();
    }
    getAccessibleContent() {
        const content = [];
        for (let i = 0; i < this._renderedParts.length; i++) {
            content.push(this.getAccessibleHoverContentAtIndex(i));
        }
        return content.join('\n\n');
    }
    getAccessibleHoverContentAtIndex(index) {
        const renderedPart = this._renderedParts[index];
        if (!renderedPart) {
            return '';
        }
        if (renderedPart.type === 'statusBar') {
            const statusBarDescription = [localize('hoverAccessibilityStatusBar', "This is a hover status bar.")];
            for (const action of renderedPart.actions) {
                const keybinding = action.actionKeybindingLabel;
                if (keybinding) {
                    statusBarDescription.push(localize('hoverAccessibilityStatusBarActionWithKeybinding', "It has an action with label {0} and keybinding {1}.", action.actionLabel, keybinding));
                }
                else {
                    statusBarDescription.push(localize('hoverAccessibilityStatusBarActionWithoutKeybinding', "It has an action with label {0}.", action.actionLabel));
                }
            }
            return statusBarDescription.join('\n');
        }
        return renderedPart.participant.getAccessibleContent(renderedPart.hoverPart);
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        if (!this._markdownHoverParticipant) {
            return;
        }
        let rangeOfIndicesToUpdate;
        if (index >= 0) {
            rangeOfIndicesToUpdate = { start: index, endExclusive: index + 1 };
        }
        else {
            rangeOfIndicesToUpdate = this._findRangeOfMarkdownHoverParts(this._markdownHoverParticipant);
        }
        for (let i = rangeOfIndicesToUpdate.start; i < rangeOfIndicesToUpdate.endExclusive; i++) {
            const normalizedMarkdownHoverIndex = this._normalizedIndexToMarkdownHoverIndexRange(this._markdownHoverParticipant, i);
            if (normalizedMarkdownHoverIndex === undefined) {
                continue;
            }
            const renderedPart = await this._markdownHoverParticipant.updateMarkdownHoverVerbosityLevel(action, normalizedMarkdownHoverIndex);
            if (!renderedPart) {
                continue;
            }
            this._renderedParts[i] = {
                type: 'hoverPart',
                participant: this._markdownHoverParticipant,
                hoverPart: renderedPart.hoverPart,
                hoverElement: renderedPart.hoverElement,
            };
        }
        if (focus) {
            if (index >= 0) {
                this.focusHoverPartWithIndex(index);
            }
            else {
                this._context.focus();
            }
        }
        this._context.onContentsChanged();
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        if (!this._markdownHoverParticipant) {
            return false;
        }
        const normalizedMarkdownHoverIndex = this._normalizedIndexToMarkdownHoverIndexRange(this._markdownHoverParticipant, index);
        if (normalizedMarkdownHoverIndex === undefined) {
            return false;
        }
        return this._markdownHoverParticipant.doesMarkdownHoverAtIndexSupportVerbosityAction(normalizedMarkdownHoverIndex, action);
    }
    isColorPickerVisible() {
        return this._colorHoverParticipant?.isColorPickerVisible() ?? false;
    }
    _normalizedIndexToMarkdownHoverIndexRange(markdownHoverParticipant, index) {
        const renderedPart = this._renderedParts[index];
        if (!renderedPart || renderedPart.type !== 'hoverPart') {
            return undefined;
        }
        const isHoverPartMarkdownHover = renderedPart.participant === markdownHoverParticipant;
        if (!isHoverPartMarkdownHover) {
            return undefined;
        }
        const firstIndexOfMarkdownHovers = this._renderedParts.findIndex(renderedPart => renderedPart.type === 'hoverPart'
            && renderedPart.participant === markdownHoverParticipant);
        if (firstIndexOfMarkdownHovers === -1) {
            throw new BugIndicatingError();
        }
        return index - firstIndexOfMarkdownHovers;
    }
    _findRangeOfMarkdownHoverParts(markdownHoverParticipant) {
        const copiedRenderedParts = this._renderedParts.slice();
        const firstIndexOfMarkdownHovers = copiedRenderedParts.findIndex(renderedPart => renderedPart.type === 'hoverPart' && renderedPart.participant === markdownHoverParticipant);
        const inversedLastIndexOfMarkdownHovers = copiedRenderedParts.reverse().findIndex(renderedPart => renderedPart.type === 'hoverPart' && renderedPart.participant === markdownHoverParticipant);
        const lastIndexOfMarkdownHovers = inversedLastIndexOfMarkdownHovers >= 0 ? copiedRenderedParts.length - inversedLastIndexOfMarkdownHovers : inversedLastIndexOfMarkdownHovers;
        return { start: firstIndexOfMarkdownHovers, endExclusive: lastIndexOfMarkdownHovers + 1 };
    }
    get domNode() {
        return this._fragment;
    }
    get domNodeHasChildren() {
        return this._fragment.hasChildNodes();
    }
    get focusedHoverPartIndex() {
        return this._focusedHoverPartIndex;
    }
    get hoverPartsCount() {
        return this._renderedParts.length;
    }
};
RenderedContentHoverParts = RenderedContentHoverParts_1 = __decorate([
    __param(4, IKeybindingService),
    __param(5, IHoverService)
], RenderedContentHoverParts);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyUmVuZGVyZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9jb250ZW50SG92ZXJSZW5kZXJlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUE0RyxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9KLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRWxFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUN4SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUdyRSxJQUFNLG9CQUFvQiw0QkFBMUIs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