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
var SimpleSuggestWidget_1;
import './media/suggest.css';
import * as dom from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { getAriaId, SimpleSuggestWidgetItemRenderer } from './simpleSuggestWidgetRenderer.js';
import { createCancelablePromise, disposableTimeout, TimeoutTimer } from '../../../../base/common/async.js';
import { Emitter, PauseableEmitter } from '../../../../base/common/event.js';
import { MutableDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SuggestWidgetStatus } from '../../../../editor/contrib/suggest/browser/suggestWidgetStatus.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { canExpandCompletionItem, SimpleSuggestDetailsOverlay, SimpleSuggestDetailsWidget } from './simpleSuggestWidgetDetails.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import * as strings from '../../../../base/common/strings.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
const $ = dom.$;
var State;
(function (State) {
    State[State["Hidden"] = 0] = "Hidden";
    State[State["Loading"] = 1] = "Loading";
    State[State["Empty"] = 2] = "Empty";
    State[State["Open"] = 3] = "Open";
    State[State["Frozen"] = 4] = "Frozen";
    State[State["Details"] = 5] = "Details";
})(State || (State = {}));
var WidgetPositionPreference;
(function (WidgetPositionPreference) {
    WidgetPositionPreference[WidgetPositionPreference["Above"] = 0] = "Above";
    WidgetPositionPreference[WidgetPositionPreference["Below"] = 1] = "Below";
})(WidgetPositionPreference || (WidgetPositionPreference = {}));
export const SimpleSuggestContext = {
    HasFocusedSuggestion: new RawContextKey('simpleSuggestWidgetHasFocusedSuggestion', false, localize('simpleSuggestWidgetHasFocusedSuggestion', "Whether any simple suggestion is focused")),
    HasNavigated: new RawContextKey('simpleSuggestWidgetHasNavigated', false, localize('simpleSuggestWidgetHasNavigated', "Whether the simple suggestion widget has been navigated downwards")),
};
let SimpleSuggestWidget = class SimpleSuggestWidget extends Disposable {
    static { SimpleSuggestWidget_1 = this; }
    static { this.LOADING_MESSAGE = localize('suggestWidget.loading', "Loading..."); }
    static { this.NO_SUGGESTIONS_MESSAGE = localize('suggestWidget.noSuggestions', "No suggestions."); }
    get list() { return this._list; }
    constructor(_container, _persistedSize, _options, _getFontInfo, _onDidFontConfigurationChange, _getAdvancedExplainModeDetails, _instantiationService, _configurationService, _storageService, _contextKeyService) {
        super();
        this._container = _container;
        this._persistedSize = _persistedSize;
        this._options = _options;
        this._getFontInfo = _getFontInfo;
        this._onDidFontConfigurationChange = _onDidFontConfigurationChange;
        this._getAdvancedExplainModeDetails = _getAdvancedExplainModeDetails;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._state = 0 /* State.Hidden */;
        this._forceRenderingAbove = false;
        this._explainMode = false;
        this._pendingShowDetails = this._register(new MutableDisposable());
        this._pendingLayout = this._register(new MutableDisposable());
        this._ignoreFocusEvents = false;
        this._showTimeout = this._register(new TimeoutTimer());
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidShow = this._register(new Emitter());
        this.onDidShow = this._onDidShow.event;
        this._onDidFocus = new PauseableEmitter();
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlurDetails = this._register(new Emitter());
        this.onDidBlurDetails = this._onDidBlurDetails.event;
        this.element = this._register(new ResizableHTMLElement());
        this.element.domNode.classList.add('workbench-suggest-widget');
        this._container.appendChild(this.element.domNode);
        this._ctxSuggestWidgetHasFocusedSuggestion = SimpleSuggestContext.HasFocusedSuggestion.bindTo(_contextKeyService);
        this._ctxSuggestWidgetHasBeenNavigated = SimpleSuggestContext.HasNavigated.bindTo(_contextKeyService);
        class ResizeState {
            constructor(persistedSize, currentSize, persistHeight = false, persistWidth = false) {
                this.persistedSize = persistedSize;
                this.currentSize = currentSize;
                this.persistHeight = persistHeight;
                this.persistWidth = persistWidth;
            }
        }
        let state;
        this._register(this.element.onDidWillResize(() => {
            // this._preferenceLocked = true;
            state = new ResizeState(this._persistedSize.restore(), this.element.size);
        }));
        this._register(this.element.onDidResize(e => {
            this._resize(e.dimension.width, e.dimension.height);
            if (state) {
                state.persistHeight = state.persistHeight || !!e.north || !!e.south;
                state.persistWidth = state.persistWidth || !!e.east || !!e.west;
            }
            if (!e.done) {
                return;
            }
            if (state) {
                // only store width or height value that have changed and also
                // only store changes that are above a certain threshold
                const { itemHeight, defaultSize } = this._getLayoutInfo();
                const threshold = Math.round(itemHeight / 2);
                let { width, height } = this.element.size;
                if (!state.persistHeight || Math.abs(state.currentSize.height - height) <= threshold) {
                    height = state.persistedSize?.height ?? defaultSize.height;
                }
                if (!state.persistWidth || Math.abs(state.currentSize.width - width) <= threshold) {
                    width = state.persistedSize?.width ?? defaultSize.width;
                }
                this._persistedSize.store(new dom.Dimension(width, height));
            }
            // reset working state
            // this._preferenceLocked = false;
            state = undefined;
        }));
        const applyIconStyle = () => this.element.domNode.classList.toggle('no-icons', !_configurationService.getValue('editor.suggest.showIcons'));
        applyIconStyle();
        const renderer = this._instantiationService.createInstance(SimpleSuggestWidgetItemRenderer, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.bind(this));
        this._register(renderer);
        this._listElement = dom.append(this.element.domNode, $('.tree'));
        this._list = this._register(new List('SuggestWidget', this._listElement, {
            getHeight: () => this._getLayoutInfo().itemHeight,
            getTemplateId: () => 'suggestion'
        }, [renderer], {
            alwaysConsumeMouseWheel: true,
            useShadows: false,
            mouseSupport: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getRole: () => 'listitem',
                getWidgetAriaLabel: () => localize('suggest', "Suggest"),
                getWidgetRole: () => 'listbox',
                getAriaLabel: (item) => {
                    let label = item.textLabel;
                    const kindLabel = item.completion.kindLabel ?? '';
                    if (typeof item.completion.label !== 'string') {
                        const { detail, description } = item.completion.label;
                        if (detail && description) {
                            label = localize('label.full', '{0}{1}, {2} {3}', label, detail, description, kindLabel);
                        }
                        else if (detail) {
                            label = localize('label.detail', '{0}{1} {2}', label, detail, kindLabel);
                        }
                        else if (description) {
                            label = localize('label.desc', '{0}, {1} {2}', label, description, kindLabel);
                        }
                    }
                    else {
                        label = localize('label', '{0}, {1}', label, kindLabel);
                    }
                    const { documentation, detail } = item.completion;
                    const docs = strings.format('{0}{1}', detail || '', documentation ? (typeof documentation === 'string' ? documentation : documentation.value) : '');
                    return localize('ariaCurrenttSuggestionReadDetails', "{0}, docs: {1}", label, docs);
                },
            }
        }));
        this._register(this._list.onDidChangeFocus(e => {
            if (e.indexes.length && e.indexes[0] !== 0) {
                this._ctxSuggestWidgetHasBeenNavigated.set(true);
            }
        }));
        this._messageElement = dom.append(this.element.domNode, dom.$('.message'));
        const details = this._register(_instantiationService.createInstance(SimpleSuggestDetailsWidget, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.bind(this), this._getAdvancedExplainModeDetails.bind(this)));
        this._register(details.onDidClose(() => this.toggleDetails()));
        this._details = this._register(new SimpleSuggestDetailsOverlay(details, this._listElement));
        this._register(dom.addDisposableListener(this._details.widget.domNode, 'blur', (e) => this._onDidBlurDetails.fire(e)));
        if (_options.statusBarMenuId && _options.showStatusBarSettingId && _configurationService.getValue(_options.showStatusBarSettingId)) {
            this._status = this._register(_instantiationService.createInstance(SuggestWidgetStatus, this.element.domNode, _options.statusBarMenuId));
            this.element.domNode.classList.toggle('with-status-bar', true);
        }
        this._register(this._list.onMouseDown(e => this._onListMouseDownOrTap(e)));
        this._register(this._list.onTap(e => this._onListMouseDownOrTap(e)));
        this._register(this._list.onDidChangeFocus(e => this._onListFocus(e)));
        this._register(this._list.onDidChangeSelection(e => this._onListSelection(e)));
        this._register(this._onDidFontConfigurationChange(() => {
            if (this._completionModel) {
                this._list.splice(0, this._completionModel.items.length, this._completionModel.items);
            }
        }));
        this._register(_configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.suggest.showIcons')) {
                applyIconStyle();
            }
            if (_options.statusBarMenuId && _options.showStatusBarSettingId && e.affectsConfiguration(_options.showStatusBarSettingId)) {
                const showStatusBar = _configurationService.getValue(_options.showStatusBarSettingId);
                if (showStatusBar && !this._status) {
                    this._status = this._register(_instantiationService.createInstance(SuggestWidgetStatus, this.element.domNode, _options.statusBarMenuId));
                    this._status.show();
                }
                else if (showStatusBar && this._status) {
                    this._status.show();
                }
                else if (this._status) {
                    this._status.element.remove();
                    this._status.dispose();
                    this._status = undefined;
                    this._layout(undefined);
                }
                this.element.domNode.classList.toggle('with-status-bar', showStatusBar);
            }
        }));
    }
    _onListFocus(e) {
        if (this._ignoreFocusEvents) {
            return;
        }
        if (this._state === 5 /* State.Details */) {
            // This can happen when focus is in the details-panel and when
            // arrow keys are pressed to select next/prev items
            this._setState(3 /* State.Open */);
        }
        if (!e.elements.length) {
            if (this._currentSuggestionDetails) {
                this._currentSuggestionDetails.cancel();
                this._currentSuggestionDetails = undefined;
                this._focusedItem = undefined;
                this._ctxSuggestWidgetHasFocusedSuggestion.set(false);
            }
            this._clearAriaActiveDescendant();
            return;
        }
        if (!this._completionModel) {
            return;
        }
        this._ctxSuggestWidgetHasFocusedSuggestion.set(true);
        const item = e.elements[0];
        const index = e.indexes[0];
        if (item !== this._focusedItem) {
            this._currentSuggestionDetails?.cancel();
            this._currentSuggestionDetails = undefined;
            this._focusedItem = item;
            this._list.reveal(index);
            const id = getAriaId(index);
            const node = dom.getActiveWindow().document.activeElement;
            if (node && id) {
                node.setAttribute('aria-haspopup', 'true');
                node.setAttribute('aria-autocomplete', 'list');
                node.setAttribute('aria-activedescendant', id);
            }
            else {
                this._clearAriaActiveDescendant();
            }
            this._currentSuggestionDetails = createCancelablePromise(async (token) => {
                const loading = disposableTimeout(() => {
                    if (this._isDetailsVisible()) {
                        this._showDetails(true, false);
                    }
                }, 250);
                const sub = token.onCancellationRequested(() => loading.dispose());
                try {
                    return await Promise.resolve();
                }
                finally {
                    loading.dispose();
                    sub.dispose();
                }
            });
            this._currentSuggestionDetails.then(() => {
                if (index >= this._list.length || item !== this._list.element(index)) {
                    return;
                }
                // item can have extra information, so re-render
                this._ignoreFocusEvents = true;
                this._list.splice(index, 1, [item]);
                this._list.setFocus([index]);
                this._ignoreFocusEvents = false;
                if (this._isDetailsVisible()) {
                    this._showDetails(false, false);
                }
                else {
                    this.element.domNode.classList.remove('docs-side');
                }
            }).catch();
        }
        // emit an event
        this._onDidFocus.fire({ item, index, model: this._completionModel });
    }
    _clearAriaActiveDescendant() {
        const node = dom.getActiveWindow().document.activeElement;
        if (!node) {
            return;
        }
        node.setAttribute('aria-haspopup', 'false');
        node.setAttribute('aria-autocomplete', 'both');
        node.removeAttribute('aria-activedescendant');
    }
    setCompletionModel(completionModel) {
        this._completionModel = completionModel;
    }
    hasCompletions() {
        return this._completionModel?.items.length !== 0;
    }
    resetWidgetSize() {
        this._persistedSize.reset();
    }
    showSuggestions(selectionIndex, isFrozen, isAuto, cursorPosition) {
        this._cursorPosition = cursorPosition;
        // this._contentWidget.setPosition(this.editor.getPosition());
        // this._loadingTimeout?.dispose();
        // this._currentSuggestionDetails?.cancel();
        // this._currentSuggestionDetails = undefined;
        if (isFrozen && this._state !== 2 /* State.Empty */ && this._state !== 0 /* State.Hidden */) {
            this._setState(4 /* State.Frozen */);
            return;
        }
        const visibleCount = this._completionModel?.items.length ?? 0;
        const isEmpty = visibleCount === 0;
        // this._ctxSuggestWidgetMultipleSuggestions.set(visibleCount > 1);
        if (isEmpty) {
            this._setState(isAuto ? 0 /* State.Hidden */ : 2 /* State.Empty */);
            this._completionModel = undefined;
            return;
        }
        // this._focusedItem = undefined;
        // calling list.splice triggers focus event which this widget forwards. That can lead to
        // suggestions being cancelled and the widget being cleared (and hidden). All this happens
        // before revealing and focusing is done which means revealing and focusing will fail when
        // they get run.
        // this._onDidFocus.pause();
        // this._onDidSelect.pause();
        try {
            this._list.splice(0, this._list.length, this._completionModel?.items ?? []);
            this._setState(isFrozen ? 4 /* State.Frozen */ : 3 /* State.Open */);
            this._list.reveal(selectionIndex, 0);
            this._list.setFocus([selectionIndex]);
            // this._list.setFocus(noFocus ? [] : [selectionIndex]);
        }
        finally {
            // this._onDidFocus.resume();
            // this._onDidSelect.resume();
        }
        this._pendingLayout.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.element.domNode), () => {
            this._pendingLayout.clear();
            this._layout(this.element.size);
            // Reset focus border
            // this._details.widget.domNode.classList.remove('focused');
        });
        this._afterRender();
    }
    setLineContext(lineContext) {
        if (this._completionModel) {
            this._completionModel.lineContext = lineContext;
        }
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        this.element.domNode.classList.toggle('frozen', state === 4 /* State.Frozen */);
        this.element.domNode.classList.remove('message');
        switch (state) {
            case 0 /* State.Hidden */:
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.hide(this._listElement);
                dom.hide(this._messageElement);
                dom.hide(this.element.domNode);
                this._details.hide(true);
                this._status?.hide();
                // this._contentWidget.hide();
                // this._ctxSuggestWidgetVisible.reset();
                // this._ctxSuggestWidgetMultipleSuggestions.reset();
                this._ctxSuggestWidgetHasFocusedSuggestion.reset();
                this._showTimeout.cancel();
                this.element.domNode.classList.remove('visible');
                this._list.splice(0, this._list.length);
                this._focusedItem = undefined;
                this._cappedHeight = undefined;
                this._explainMode = false;
                break;
            case 1 /* State.Loading */:
                this.element.domNode.classList.add('message');
                this._messageElement.textContent = SimpleSuggestWidget_1.LOADING_MESSAGE;
                dom.hide(this._listElement);
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                break;
            case 2 /* State.Empty */:
                this.element.domNode.classList.add('message');
                this._messageElement.textContent = SimpleSuggestWidget_1.NO_SUGGESTIONS_MESSAGE;
                dom.hide(this._listElement);
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                status(SimpleSuggestWidget_1.NO_SUGGESTIONS_MESSAGE);
                break;
            case 3 /* State.Open */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._show();
                break;
            case 4 /* State.Frozen */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._show();
                break;
            case 5 /* State.Details */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._details.show();
                this._show();
                break;
        }
    }
    _showListAndStatus() {
        if (this._status) {
            dom.show(this._listElement, this._status.element);
        }
        else {
            dom.show(this._listElement);
        }
    }
    _show() {
        // this._layout(this._persistedSize.restore());
        // dom.show(this.element.domNode);
        // this._onDidShow.fire();
        this._status?.show();
        // this._contentWidget.show();
        dom.show(this.element.domNode);
        this._layout(this._persistedSize.restore());
        // this._ctxSuggestWidgetVisible.set(true);
        this._onDidShow.fire(this);
        this._showTimeout.cancelAndSet(() => {
            this.element.domNode.classList.add('visible');
        }, 100);
    }
    toggleDetailsFocus() {
        if (this._state === 5 /* State.Details */) {
            // Should return the focus to the list item.
            this._list.setFocus(this._list.getFocus());
            this._setState(3 /* State.Open */);
        }
        else if (this._state === 3 /* State.Open */) {
            this._setState(5 /* State.Details */);
            if (!this._isDetailsVisible()) {
                this.toggleDetails(true);
            }
            else {
                this._details.widget.focus();
            }
        }
    }
    toggleDetails(focused = false) {
        if (this._isDetailsVisible()) {
            // hide details widget
            this._pendingShowDetails.clear();
            // this._ctxSuggestWidgetDetailsVisible.set(false);
            this._setDetailsVisible(false);
            this._details.hide();
            this.element.domNode.classList.remove('shows-details');
        }
        else if ((canExpandCompletionItem(this._list.getFocusedElements()[0]) || this._explainMode) && (this._state === 3 /* State.Open */ || this._state === 5 /* State.Details */ || this._state === 4 /* State.Frozen */)) {
            // show details widget (iff possible)
            // this._ctxSuggestWidgetDetailsVisible.set(true);
            this._setDetailsVisible(true);
            this._showDetails(false, focused);
        }
    }
    _showDetails(loading, focused) {
        this._pendingShowDetails.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.element.domNode), () => {
            this._pendingShowDetails.clear();
            this._details.show();
            let didFocusDetails = false;
            if (loading) {
                this._details.widget.renderLoading();
            }
            else {
                this._details.widget.renderItem(this._list.getFocusedElements()[0], this._explainMode);
            }
            if (!this._details.widget.isEmpty) {
                this._positionDetails();
                this.element.domNode.classList.add('shows-details');
                if (focused) {
                    this._details.widget.focus();
                    didFocusDetails = true;
                }
            }
            else {
                this._details.hide();
            }
            if (!didFocusDetails) {
                // this.editor.focus();
            }
        });
    }
    toggleExplainMode() {
        if (this._list.getFocusedElements()[0]) {
            this._explainMode = !this._explainMode;
            if (!this._isDetailsVisible()) {
                this.toggleDetails();
            }
            else {
                this._showDetails(false, false);
            }
        }
    }
    hide() {
        this._pendingLayout.clear();
        this._pendingShowDetails.clear();
        // this._loadingTimeout?.dispose();
        this._ctxSuggestWidgetHasBeenNavigated.reset();
        this._setState(0 /* State.Hidden */);
        this._onDidHide.fire(this);
        dom.hide(this.element.domNode);
        this.element.clearSashHoverState();
        // ensure that a reasonable widget height is persisted so that
        // accidential "resize-to-single-items" cases aren't happening
        const dim = this._persistedSize.restore();
        const minPersistedHeight = Math.ceil(this._getLayoutInfo().itemHeight * 4.3);
        if (dim && dim.height < minPersistedHeight) {
            this._persistedSize.store(dim.with(undefined, minPersistedHeight));
        }
    }
    _layout(size) {
        if (!this._cursorPosition) {
            return;
        }
        // if (!this.editor.hasModel()) {
        // 	return;
        // }
        // if (!this.editor.getDomNode()) {
        // 	// happens when running tests
        // 	return;
        // }
        const bodyBox = dom.getClientArea(this._container.ownerDocument.body);
        const info = this._getLayoutInfo();
        if (!size) {
            size = info.defaultSize;
        }
        let height = size.height;
        let width = size.width;
        // status bar
        if (this._status) {
            this._status.element.style.height = `${info.itemHeight}px`;
        }
        // if (this._state === State.Empty || this._state === State.Loading) {
        // 	// showing a message only
        // 	height = info.itemHeight + info.borderHeight;
        // 	width = info.defaultSize.width / 2;
        // 	this.element.enableSashes(false, false, false, false);
        // 	this.element.minSize = this.element.maxSize = new dom.Dimension(width, height);
        // 	this._contentWidget.setPreference(ContentWidgetPositionPreference.BELOW);
        // } else {
        // showing items
        // width math
        const maxWidth = bodyBox.width - info.borderHeight - 2 * info.horizontalPadding;
        if (width > maxWidth) {
            width = maxWidth;
        }
        const preferredWidth = this._completionModel ? this._completionModel.stats.pLabelLen * info.typicalHalfwidthCharacterWidth : width;
        // height math
        const fullHeight = info.statusBarHeight + this._list.contentHeight + this._messageElement.clientHeight + info.borderHeight;
        const minHeight = info.itemHeight + info.statusBarHeight;
        // const editorBox = dom.getDomNodePagePosition(this.editor.getDomNode());
        // const cursorBox = this.editor.getScrolledVisiblePosition(this.editor.getPosition());
        const editorBox = dom.getDomNodePagePosition(this._container);
        const cursorBox = this._cursorPosition; //this.editor.getScrolledVisiblePosition(this.editor.getPosition());
        const cursorBottom = editorBox.top + cursorBox.top + cursorBox.height;
        const maxHeightBelow = Math.min(bodyBox.height - cursorBottom - info.verticalPadding, fullHeight);
        const availableSpaceAbove = editorBox.top + cursorBox.top - info.verticalPadding;
        const maxHeightAbove = Math.min(availableSpaceAbove, fullHeight);
        let maxHeight = Math.min(Math.max(maxHeightAbove, maxHeightBelow) + info.borderHeight, fullHeight);
        if (height === this._cappedHeight?.capped) {
            // Restore the old (wanted) height when the current
            // height is capped to fit
            height = this._cappedHeight.wanted;
        }
        if (height < minHeight) {
            height = minHeight;
        }
        if (height > maxHeight) {
            height = maxHeight;
        }
        const forceRenderingAboveRequiredSpace = 150;
        if (height > maxHeightBelow || (this._forceRenderingAbove && availableSpaceAbove > forceRenderingAboveRequiredSpace)) {
            this._preference = 0 /* WidgetPositionPreference.Above */;
            this.element.enableSashes(true, true, false, false);
            maxHeight = maxHeightAbove;
        }
        else {
            this._preference = 1 /* WidgetPositionPreference.Below */;
            this.element.enableSashes(false, true, true, false);
            maxHeight = maxHeightBelow;
        }
        this.element.preferredSize = new dom.Dimension(preferredWidth, info.defaultSize.height);
        this.element.maxSize = new dom.Dimension(maxWidth, maxHeight);
        this.element.minSize = new dom.Dimension(220, minHeight);
        // Know when the height was capped to fit and remember
        // the wanted height for later. This is required when going
        // left to widen suggestions.
        this._cappedHeight = height === fullHeight
            ? { wanted: this._cappedHeight?.wanted ?? size.height, capped: height }
            : undefined;
        // }
        this.element.domNode.style.left = `${this._cursorPosition.left}px`;
        if (this._preference === 0 /* WidgetPositionPreference.Above */) {
            this.element.domNode.style.top = `${this._cursorPosition.top - height - info.borderHeight}px`;
        }
        else {
            this.element.domNode.style.top = `${this._cursorPosition.top + this._cursorPosition.height}px`;
        }
        this._resize(width, height);
    }
    _afterRender() {
        // if (position === null) {
        // 	if (this._isDetailsVisible()) {
        // 		this._details.hide(); //todo@jrieken soft-hide
        // 	}
        // 	return;
        // }
        if (this._state === 2 /* State.Empty */ || this._state === 1 /* State.Loading */) {
            // no special positioning when widget isn't showing list
            return;
        }
        if (this._isDetailsVisible() && !this._details.widget.isEmpty) {
            this._details.show();
        }
        this._positionDetails();
    }
    _resize(width, height) {
        const { width: maxWidth, height: maxHeight } = this.element.maxSize;
        width = Math.min(maxWidth, width);
        if (maxHeight) {
            height = Math.min(maxHeight, height);
        }
        const { statusBarHeight } = this._getLayoutInfo();
        this._list.layout(height - statusBarHeight, width);
        this._listElement.style.height = `${height - statusBarHeight}px`;
        this._listElement.style.width = `${width}px`;
        this.element.layout(height, width);
        if (this._cursorPosition && this._preference === 0 /* WidgetPositionPreference.Above */) {
            this.element.domNode.style.top = `${this._cursorPosition.top - height}px`;
        }
        this._positionDetails();
    }
    _positionDetails() {
        if (this._isDetailsVisible()) {
            this._details.placeAtAnchor(this.element.domNode);
        }
    }
    _getLayoutInfo() {
        const fontInfo = this._getFontInfo();
        const itemHeight = clamp(fontInfo.lineHeight, 8, 1000);
        const statusBarHeight = !this._options.statusBarMenuId || !this._options.showStatusBarSettingId || !this._configurationService.getValue(this._options.showStatusBarSettingId) || this._state === 2 /* State.Empty */ || this._state === 1 /* State.Loading */ ? 0 : itemHeight;
        const borderWidth = this._details.widget.borderWidth;
        const borderHeight = 2 * borderWidth;
        return {
            itemHeight,
            statusBarHeight,
            borderWidth,
            borderHeight,
            typicalHalfwidthCharacterWidth: 10,
            verticalPadding: 22,
            horizontalPadding: 14,
            defaultSize: new dom.Dimension(430, statusBarHeight + 12 * itemHeight + borderHeight)
        };
    }
    _onListMouseDownOrTap(e) {
        if (typeof e.element === 'undefined' || typeof e.index === 'undefined') {
            return;
        }
        // prevent stealing browser focus from the terminal
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        this._select(e.element, e.index);
    }
    _onListSelection(e) {
        if (e.elements.length) {
            this._select(e.elements[0], e.indexes[0]);
        }
    }
    _select(item, index) {
        const completionModel = this._completionModel;
        if (completionModel) {
            this._onDidSelect.fire({ item, index, model: completionModel });
        }
    }
    selectNext() {
        this._list.focusNext(1, true);
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectNextPage() {
        this._list.focusNextPage();
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectPrevious() {
        this._list.focusPrevious(1, true);
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectPreviousPage() {
        this._list.focusPreviousPage();
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    getFocusedItem() {
        if (this._completionModel) {
            return {
                item: this._list.getFocusedElements()[0],
                index: this._list.getFocus()[0],
                model: this._completionModel
            };
        }
        return undefined;
    }
    _isDetailsVisible() {
        return this._storageService.getBoolean('expandSuggestionDocs', 0 /* StorageScope.PROFILE */, false);
    }
    _setDetailsVisible(value) {
        this._storageService.store('expandSuggestionDocs', value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    forceRenderingAbove() {
        if (!this._forceRenderingAbove) {
            this._forceRenderingAbove = true;
            this._layout(this._persistedSize.restore());
        }
    }
    stopForceRenderingAbove() {
        this._forceRenderingAbove = false;
    }
};
SimpleSuggestWidget = SimpleSuggestWidget_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IConfigurationService),
    __param(8, IStorageService),
    __param(9, IContextKeyService)
], SimpleSuggestWidget);
export { SimpleSuggestWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3VnZ2VzdC9icm93c2VyL3NpbXBsZVN1Z2dlc3RXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSwrQkFBK0IsRUFBcUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqSSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUV4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlH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