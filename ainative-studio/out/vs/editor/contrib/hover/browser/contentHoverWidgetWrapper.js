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
import * as dom from '../../../../base/browser/dom.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { HoverOperation } from './hoverOperation.js';
import { HoverParticipantRegistry, HoverRangeAnchor } from './hoverTypes.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ContentHoverWidget } from './contentHoverWidget.js';
import { ContentHoverComputer } from './contentHoverComputer.js';
import { ContentHoverResult } from './contentHoverTypes.js';
import { Emitter } from '../../../../base/common/event.js';
import { RenderedContentHover } from './contentHoverRendered.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let ContentHoverWidgetWrapper = class ContentHoverWidgetWrapper extends Disposable {
    constructor(_editor, _instantiationService, _keybindingService, _hoverService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._currentResult = null;
        this._renderedContentHover = this._register(new MutableDisposable());
        this._onContentsChanged = this._register(new Emitter());
        this.onContentsChanged = this._onContentsChanged.event;
        this._contentHoverWidget = this._register(this._instantiationService.createInstance(ContentHoverWidget, this._editor));
        this._participants = this._initializeHoverParticipants();
        this._hoverOperation = this._register(new HoverOperation(this._editor, new ContentHoverComputer(this._editor, this._participants)));
        this._registerListeners();
    }
    _initializeHoverParticipants() {
        const participants = [];
        for (const participant of HoverParticipantRegistry.getAll()) {
            const participantInstance = this._instantiationService.createInstance(participant, this._editor);
            participants.push(participantInstance);
        }
        participants.sort((p1, p2) => p1.hoverOrdinal - p2.hoverOrdinal);
        this._register(this._contentHoverWidget.onDidResize(() => {
            this._participants.forEach(participant => participant.handleResize?.());
        }));
        this._register(this._contentHoverWidget.onDidScroll((e) => {
            this._participants.forEach(participant => participant.handleScroll?.(e));
        }));
        return participants;
    }
    _registerListeners() {
        this._register(this._hoverOperation.onResult((result) => {
            const messages = (result.hasLoadingMessage ? this._addLoadingMessage(result) : result.value);
            this._withResult(new ContentHoverResult(messages, result.isComplete, result.options));
        }));
        const contentHoverWidgetNode = this._contentHoverWidget.getDomNode();
        this._register(dom.addStandardDisposableListener(contentHoverWidgetNode, 'keydown', (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
            }
        }));
        this._register(dom.addStandardDisposableListener(contentHoverWidgetNode, 'mouseleave', (e) => {
            this._onMouseLeave(e);
        }));
        this._register(TokenizationRegistry.onDidChange(() => {
            if (this._contentHoverWidget.position && this._currentResult) {
                this._setCurrentResult(this._currentResult); // render again
            }
        }));
    }
    /**
     * Returns true if the hover shows now or will show.
     */
    _startShowingOrUpdateHover(anchor, mode, source, focus, mouseEvent) {
        const contentHoverIsVisible = this._contentHoverWidget.position && this._currentResult;
        if (!contentHoverIsVisible) {
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
                return true;
            }
            return false;
        }
        const isHoverSticky = this._editor.getOption(62 /* EditorOption.hover */).sticky;
        const isMouseGettingCloser = mouseEvent && this._contentHoverWidget.isMouseGettingCloser(mouseEvent.event.posx, mouseEvent.event.posy);
        const isHoverStickyAndIsMouseGettingCloser = isHoverSticky && isMouseGettingCloser;
        // The mouse is getting closer to the hover, so we will keep the hover untouched
        // But we will kick off a hover update at the new anchor, insisting on keeping the hover visible.
        if (isHoverStickyAndIsMouseGettingCloser) {
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, true);
            }
            return true;
        }
        // If mouse is not getting closer and anchor not defined, hide the hover
        if (!anchor) {
            this._setCurrentResult(null);
            return false;
        }
        // If mouse if not getting closer and anchor is defined, and the new anchor is the same as the previous anchor
        const currentAnchorEqualsPreviousAnchor = this._currentResult && this._currentResult.options.anchor.equals(anchor);
        if (currentAnchorEqualsPreviousAnchor) {
            return true;
        }
        // If mouse if not getting closer and anchor is defined, and the new anchor is not compatible with the previous anchor
        const currentAnchorCompatibleWithPreviousAnchor = this._currentResult && anchor.canAdoptVisibleHover(this._currentResult.options.anchor, this._contentHoverWidget.position);
        if (!currentAnchorCompatibleWithPreviousAnchor) {
            this._setCurrentResult(null);
            this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
            return true;
        }
        // We aren't getting any closer to the hover, so we will filter existing results
        // and keep those which also apply to the new anchor.
        if (this._currentResult) {
            this._setCurrentResult(this._currentResult.filter(anchor));
        }
        this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
        return true;
    }
    _startHoverOperationIfNecessary(anchor, mode, source, shouldFocus, insistOnKeepingHoverVisible) {
        const currentAnchorEqualToPreviousHover = this._hoverOperation.options && this._hoverOperation.options.anchor.equals(anchor);
        if (currentAnchorEqualToPreviousHover) {
            return;
        }
        this._hoverOperation.cancel();
        const contentHoverComputerOptions = {
            anchor,
            source,
            shouldFocus,
            insistOnKeepingHoverVisible
        };
        this._hoverOperation.start(mode, contentHoverComputerOptions);
    }
    _setCurrentResult(hoverResult) {
        let currentHoverResult = hoverResult;
        const currentResultEqualToPreviousResult = this._currentResult === currentHoverResult;
        if (currentResultEqualToPreviousResult) {
            return;
        }
        const currentHoverResultIsEmpty = currentHoverResult && currentHoverResult.hoverParts.length === 0;
        if (currentHoverResultIsEmpty) {
            currentHoverResult = null;
        }
        this._currentResult = currentHoverResult;
        if (this._currentResult) {
            this._showHover(this._currentResult);
        }
        else {
            this._hideHover();
        }
    }
    _addLoadingMessage(hoverResult) {
        for (const participant of this._participants) {
            if (!participant.createLoadingMessage) {
                continue;
            }
            const loadingMessage = participant.createLoadingMessage(hoverResult.options.anchor);
            if (!loadingMessage) {
                continue;
            }
            return hoverResult.value.slice(0).concat([loadingMessage]);
        }
        return hoverResult.value;
    }
    _withResult(hoverResult) {
        const previousHoverIsVisibleWithCompleteResult = this._contentHoverWidget.position && this._currentResult && this._currentResult.isComplete;
        if (!previousHoverIsVisibleWithCompleteResult) {
            this._setCurrentResult(hoverResult);
        }
        // The hover is visible with a previous complete result.
        const isCurrentHoverResultComplete = hoverResult.isComplete;
        if (!isCurrentHoverResultComplete) {
            // Instead of rendering the new partial result, we wait for the result to be complete.
            return;
        }
        const currentHoverResultIsEmpty = hoverResult.hoverParts.length === 0;
        const insistOnKeepingPreviousHoverVisible = hoverResult.options.insistOnKeepingHoverVisible;
        const shouldKeepPreviousHoverVisible = currentHoverResultIsEmpty && insistOnKeepingPreviousHoverVisible;
        if (shouldKeepPreviousHoverVisible) {
            // The hover would now hide normally, so we'll keep the previous messages
            return;
        }
        this._setCurrentResult(hoverResult);
    }
    _showHover(hoverResult) {
        const context = this._getHoverContext();
        this._renderedContentHover.value = new RenderedContentHover(this._editor, hoverResult, this._participants, context, this._keybindingService, this._hoverService);
        if (this._renderedContentHover.value.domNodeHasChildren) {
            this._contentHoverWidget.show(this._renderedContentHover.value);
        }
        else {
            this._renderedContentHover.clear();
        }
    }
    _hideHover() {
        this._contentHoverWidget.hide();
        this._participants.forEach(participant => participant.handleHide?.());
    }
    _getHoverContext() {
        const hide = () => {
            this.hide();
        };
        const onContentsChanged = () => {
            this._onContentsChanged.fire();
            this._contentHoverWidget.onContentsChanged();
        };
        const setMinimumDimensions = (dimensions) => {
            this._contentHoverWidget.setMinimumDimensions(dimensions);
        };
        const focus = () => this.focus();
        return { hide, onContentsChanged, setMinimumDimensions, focus };
    }
    showsOrWillShow(mouseEvent) {
        const isContentWidgetResizing = this._contentHoverWidget.isResizing;
        if (isContentWidgetResizing) {
            return true;
        }
        const anchorCandidates = this._findHoverAnchorCandidates(mouseEvent);
        const anchorCandidatesExist = anchorCandidates.length > 0;
        if (!anchorCandidatesExist) {
            return this._startShowingOrUpdateHover(null, 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
        }
        const anchor = anchorCandidates[0];
        return this._startShowingOrUpdateHover(anchor, 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
    }
    _findHoverAnchorCandidates(mouseEvent) {
        const anchorCandidates = [];
        for (const participant of this._participants) {
            if (!participant.suggestHoverAnchor) {
                continue;
            }
            const anchor = participant.suggestHoverAnchor(mouseEvent);
            if (!anchor) {
                continue;
            }
            anchorCandidates.push(anchor);
        }
        const target = mouseEvent.target;
        switch (target.type) {
            case 6 /* MouseTargetType.CONTENT_TEXT */: {
                anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
                break;
            }
            case 7 /* MouseTargetType.CONTENT_EMPTY */: {
                const epsilon = this._editor.getOption(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth / 2;
                // Let hover kick in even when the mouse is technically in the empty area after a line, given the distance is small enough
                const mouseIsWithinLinesAndCloseToHover = !target.detail.isAfterLines
                    && typeof target.detail.horizontalDistanceToText === 'number'
                    && target.detail.horizontalDistanceToText < epsilon;
                if (!mouseIsWithinLinesAndCloseToHover) {
                    break;
                }
                anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
                break;
            }
        }
        anchorCandidates.sort((a, b) => b.priority - a.priority);
        return anchorCandidates;
    }
    _onMouseLeave(e) {
        const editorDomNode = this._editor.getDomNode();
        const isMousePositionOutsideOfEditor = !editorDomNode || !isMousePositionWithinElement(editorDomNode, e.x, e.y);
        if (isMousePositionOutsideOfEditor) {
            this.hide();
        }
    }
    startShowingAtRange(range, mode, source, focus) {
        this._startShowingOrUpdateHover(new HoverRangeAnchor(0, range, undefined, undefined), mode, source, focus, null);
    }
    getWidgetContent() {
        const node = this._contentHoverWidget.getDomNode();
        if (!node.textContent) {
            return undefined;
        }
        return node.textContent;
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        this._renderedContentHover.value?.updateHoverVerbosityLevel(action, index, focus);
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._renderedContentHover.value?.doesHoverAtIndexSupportVerbosityAction(index, action) ?? false;
    }
    getAccessibleWidgetContent() {
        return this._renderedContentHover.value?.getAccessibleWidgetContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._renderedContentHover.value?.getAccessibleWidgetContentAtIndex(index);
    }
    focusedHoverPartIndex() {
        return this._renderedContentHover.value?.focusedHoverPartIndex ?? -1;
    }
    containsNode(node) {
        return (node ? this._contentHoverWidget.getDomNode().contains(node) : false);
    }
    focus() {
        const hoverPartsCount = this._renderedContentHover.value?.hoverPartsCount;
        if (hoverPartsCount === 1) {
            this.focusHoverPartWithIndex(0);
            return;
        }
        this._contentHoverWidget.focus();
    }
    focusHoverPartWithIndex(index) {
        this._renderedContentHover.value?.focusHoverPartWithIndex(index);
    }
    scrollUp() {
        this._contentHoverWidget.scrollUp();
    }
    scrollDown() {
        this._contentHoverWidget.scrollDown();
    }
    scrollLeft() {
        this._contentHoverWidget.scrollLeft();
    }
    scrollRight() {
        this._contentHoverWidget.scrollRight();
    }
    pageUp() {
        this._contentHoverWidget.pageUp();
    }
    pageDown() {
        this._contentHoverWidget.pageDown();
    }
    goToTop() {
        this._contentHoverWidget.goToTop();
    }
    goToBottom() {
        this._contentHoverWidget.goToBottom();
    }
    hide() {
        this._hoverOperation.cancel();
        this._setCurrentResult(null);
    }
    getDomNode() {
        return this._contentHoverWidget.getDomNode();
    }
    get isColorPickerVisible() {
        return this._renderedContentHover.value?.isColorPickerVisible() ?? false;
    }
    get isVisibleFromKeyboard() {
        return this._contentHoverWidget.isVisibleFromKeyboard;
    }
    get isVisible() {
        return this._contentHoverWidget.isVisible;
    }
    get isFocused() {
        return this._contentHoverWidget.isFocused;
    }
    get isResizing() {
        return this._contentHoverWidget.isResizing;
    }
    get widget() {
        return this._contentHoverWidget;
    }
};
ContentHoverWidgetWrapper = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService),
    __param(3, IHoverService)
], ContentHoverWidgetWrapper);
export { ContentHoverWidgetWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyV2lkZ2V0V3JhcHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2NvbnRlbnRIb3ZlcldpZGdldFdyYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBaUQsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRyxPQUFPLEVBQWUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQTBFLE1BQU0saUJBQWlCLENBQUM7QUFDbEssT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUErQixNQUFNLDJCQUEyQixDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFckUs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