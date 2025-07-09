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
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { getBaseLayerHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegate2.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import * as arrays from '../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellation } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType, isDefined } from '../../../../base/common/types.js';
import './renameWidget.css';
import * as domFontInfo from '../../../browser/config/domFontInfo.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { NewSymbolNameTag, NewSymbolNameTriggerKind } from '../../../common/languages.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getListStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorWidgetBackground, inputBackground, inputBorder, inputForeground, quickInputListFocusBackground, quickInputListFocusForeground, widgetBorder, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
/** for debugging */
const _sticky = false;
export const CONTEXT_RENAME_INPUT_VISIBLE = new RawContextKey('renameInputVisible', false, nls.localize('renameInputVisible', "Whether the rename input widget is visible"));
export const CONTEXT_RENAME_INPUT_FOCUSED = new RawContextKey('renameInputFocused', false, nls.localize('renameInputFocused', "Whether the rename input widget is focused"));
let RenameWidget = class RenameWidget {
    constructor(_editor, _acceptKeybindings, _themeService, _keybindingService, contextKeyService, _logService) {
        this._editor = _editor;
        this._acceptKeybindings = _acceptKeybindings;
        this._themeService = _themeService;
        this._keybindingService = _keybindingService;
        this._logService = _logService;
        // implement IContentWidget
        this.allowEditorOverflow = true;
        this._disposables = new DisposableStore();
        this._visibleContextKey = CONTEXT_RENAME_INPUT_VISIBLE.bindTo(contextKeyService);
        this._isEditingRenameCandidate = false;
        this._nRenameSuggestionsInvocations = 0;
        this._hadAutomaticRenameSuggestionsInvocation = false;
        this._candidates = new Set();
        this._beforeFirstInputFieldEditSW = new StopWatch();
        this._inputWithButton = new InputWithButton();
        this._disposables.add(this._inputWithButton);
        this._editor.addContentWidget(this);
        this._disposables.add(this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        this._disposables.add(_themeService.onDidColorThemeChange(this._updateStyles, this));
    }
    dispose() {
        this._disposables.dispose();
        this._editor.removeContentWidget(this);
    }
    getId() {
        return '__renameInputWidget';
    }
    getDomNode() {
        if (!this._domNode) {
            this._domNode = document.createElement('div');
            this._domNode.className = 'monaco-editor rename-box';
            this._domNode.appendChild(this._inputWithButton.domNode);
            this._renameCandidateListView = this._disposables.add(new RenameCandidateListView(this._domNode, {
                fontInfo: this._editor.getOption(52 /* EditorOption.fontInfo */),
                onFocusChange: (newSymbolName) => {
                    this._inputWithButton.input.value = newSymbolName;
                    this._isEditingRenameCandidate = false; // @ulugbekna: reset
                },
                onSelectionChange: () => {
                    this._isEditingRenameCandidate = false; // @ulugbekna: because user picked a rename suggestion
                    this.acceptInput(false); // we don't allow preview with mouse click for now
                }
            }));
            this._disposables.add(this._inputWithButton.onDidInputChange(() => {
                if (this._renameCandidateListView?.focusedCandidate !== undefined) {
                    this._isEditingRenameCandidate = true;
                }
                this._timeBeforeFirstInputFieldEdit ??= this._beforeFirstInputFieldEditSW.elapsed();
                if (this._renameCandidateProvidersCts?.token.isCancellationRequested === false) {
                    this._renameCandidateProvidersCts.cancel();
                }
                this._renameCandidateListView?.clearFocus();
            }));
            this._label = document.createElement('div');
            this._label.className = 'rename-label';
            this._domNode.appendChild(this._label);
            this._updateFont();
            this._updateStyles(this._themeService.getColorTheme());
        }
        return this._domNode;
    }
    _updateStyles(theme) {
        if (!this._domNode) {
            return;
        }
        const widgetShadowColor = theme.getColor(widgetShadow);
        const widgetBorderColor = theme.getColor(widgetBorder);
        this._domNode.style.backgroundColor = String(theme.getColor(editorWidgetBackground) ?? '');
        this._domNode.style.boxShadow = widgetShadowColor ? ` 0 0 8px 2px ${widgetShadowColor}` : '';
        this._domNode.style.border = widgetBorderColor ? `1px solid ${widgetBorderColor}` : '';
        this._domNode.style.color = String(theme.getColor(inputForeground) ?? '');
        const border = theme.getColor(inputBorder);
        this._inputWithButton.domNode.style.backgroundColor = String(theme.getColor(inputBackground) ?? '');
        this._inputWithButton.input.style.backgroundColor = String(theme.getColor(inputBackground) ?? '');
        this._inputWithButton.domNode.style.borderWidth = border ? '1px' : '0px';
        this._inputWithButton.domNode.style.borderStyle = border ? 'solid' : 'none';
        this._inputWithButton.domNode.style.borderColor = border?.toString() ?? 'none';
    }
    _updateFont() {
        if (this._domNode === undefined) {
            return;
        }
        assertType(this._label !== undefined, 'RenameWidget#_updateFont: _label must not be undefined given _domNode is defined');
        this._editor.applyFontInfo(this._inputWithButton.input);
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._label.style.fontSize = `${this._computeLabelFontSize(fontInfo.fontSize)}px`;
    }
    _computeLabelFontSize(editorFontSize) {
        return editorFontSize * 0.8;
    }
    getPosition() {
        if (!this._visible) {
            return null;
        }
        if (!this._editor.hasModel() || // @ulugbekna: shouldn't happen
            !this._editor.getDomNode() // @ulugbekna: can happen during tests based on suggestWidget's similar predicate check
        ) {
            return null;
        }
        const bodyBox = dom.getClientArea(this.getDomNode().ownerDocument.body);
        const editorBox = dom.getDomNodePagePosition(this._editor.getDomNode());
        const cursorBoxTop = this._getTopForPosition();
        this._nPxAvailableAbove = cursorBoxTop + editorBox.top;
        this._nPxAvailableBelow = bodyBox.height - this._nPxAvailableAbove;
        const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
        const { totalHeight: candidateViewHeight } = RenameCandidateView.getLayoutInfo({ lineHeight });
        const positionPreference = this._nPxAvailableBelow > candidateViewHeight * 6 /* approximate # of candidates to fit in (inclusive of rename input box & rename label) */
            ? [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */]
            : [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */];
        return {
            position: this._position,
            preference: positionPreference,
        };
    }
    beforeRender() {
        const [accept, preview] = this._acceptKeybindings;
        this._label.innerText = nls.localize({ key: 'label', comment: ['placeholders are keybindings, e.g "F2 to Rename, Shift+F2 to Preview"'] }, "{0} to Rename, {1} to Preview", this._keybindingService.lookupKeybinding(accept)?.getLabel(), this._keybindingService.lookupKeybinding(preview)?.getLabel());
        this._domNode.style.minWidth = `200px`; // to prevent from widening when candidates come in
        return null;
    }
    afterRender(position) {
        // FIXME@ulugbekna: commenting trace log out until we start unmounting the widget from editor properly - https://github.com/microsoft/vscode/issues/226975
        // this._trace('invoking afterRender, position: ', position ? 'not null' : 'null');
        if (position === null) {
            // cancel rename when input widget isn't rendered anymore
            this.cancelInput(true, 'afterRender (because position is null)');
            return;
        }
        if (!this._editor.hasModel() || // shouldn't happen
            !this._editor.getDomNode() // can happen during tests based on suggestWidget's similar predicate check
        ) {
            return;
        }
        assertType(this._renameCandidateListView);
        assertType(this._nPxAvailableAbove !== undefined);
        assertType(this._nPxAvailableBelow !== undefined);
        const inputBoxHeight = dom.getTotalHeight(this._inputWithButton.domNode);
        const labelHeight = dom.getTotalHeight(this._label);
        let totalHeightAvailable;
        if (position === 2 /* ContentWidgetPositionPreference.BELOW */) {
            totalHeightAvailable = this._nPxAvailableBelow;
        }
        else {
            totalHeightAvailable = this._nPxAvailableAbove;
        }
        this._renameCandidateListView.layout({
            height: totalHeightAvailable - labelHeight - inputBoxHeight,
            width: dom.getTotalWidth(this._inputWithButton.domNode),
        });
    }
    acceptInput(wantsPreview) {
        this._trace(`invoking acceptInput`);
        this._currentAcceptInput?.(wantsPreview);
    }
    cancelInput(focusEditor, caller) {
        // this._trace(`invoking cancelInput, caller: ${caller}, _currentCancelInput: ${this._currentAcceptInput ? 'not undefined' : 'undefined'}`);
        this._currentCancelInput?.(focusEditor);
    }
    focusNextRenameSuggestion() {
        if (!this._renameCandidateListView?.focusNext()) {
            this._inputWithButton.input.value = this._currentName;
        }
    }
    focusPreviousRenameSuggestion() {
        if (!this._renameCandidateListView?.focusPrevious()) {
            this._inputWithButton.input.value = this._currentName;
        }
    }
    /**
     * @param requestRenameCandidates is `undefined` when there are no rename suggestion providers
     */
    getInput(where, currentName, supportPreview, requestRenameCandidates, cts) {
        const { start: selectionStart, end: selectionEnd } = this._getSelection(where, currentName);
        this._renameCts = cts;
        const disposeOnDone = new DisposableStore();
        this._nRenameSuggestionsInvocations = 0;
        this._hadAutomaticRenameSuggestionsInvocation = false;
        if (requestRenameCandidates === undefined) {
            this._inputWithButton.button.style.display = 'none';
        }
        else {
            this._inputWithButton.button.style.display = 'flex';
            this._requestRenameCandidatesOnce = requestRenameCandidates;
            this._requestRenameCandidates(currentName, false);
            disposeOnDone.add(dom.addDisposableListener(this._inputWithButton.button, 'click', () => this._requestRenameCandidates(currentName, true)));
            disposeOnDone.add(dom.addDisposableListener(this._inputWithButton.button, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                if (keyEvent.equals(3 /* KeyCode.Enter */) || keyEvent.equals(10 /* KeyCode.Space */)) {
                    keyEvent.stopPropagation();
                    keyEvent.preventDefault();
                    this._requestRenameCandidates(currentName, true);
                }
            }));
        }
        this._isEditingRenameCandidate = false;
        this._domNode.classList.toggle('preview', supportPreview);
        this._position = new Position(where.startLineNumber, where.startColumn);
        this._currentName = currentName;
        this._inputWithButton.input.value = currentName;
        this._inputWithButton.input.setAttribute('selectionStart', selectionStart.toString());
        this._inputWithButton.input.setAttribute('selectionEnd', selectionEnd.toString());
        this._inputWithButton.input.size = Math.max((where.endColumn - where.startColumn) * 1.1, 20); // determines width
        this._beforeFirstInputFieldEditSW.reset();
        disposeOnDone.add(toDisposable(() => {
            this._renameCts = undefined;
            cts.dispose(true);
        })); // @ulugbekna: this may result in `this.cancelInput` being called twice, but it should be safe since we set it to undefined after 1st call
        disposeOnDone.add(toDisposable(() => {
            if (this._renameCandidateProvidersCts !== undefined) {
                this._renameCandidateProvidersCts.dispose(true);
                this._renameCandidateProvidersCts = undefined;
            }
        }));
        disposeOnDone.add(toDisposable(() => this._candidates.clear()));
        const inputResult = new DeferredPromise();
        inputResult.p.finally(() => {
            disposeOnDone.dispose();
            this._hide();
        });
        this._currentCancelInput = (focusEditor) => {
            this._trace('invoking _currentCancelInput');
            this._currentAcceptInput = undefined;
            this._currentCancelInput = undefined;
            // fixme session cleanup
            this._renameCandidateListView?.clearCandidates();
            inputResult.complete(focusEditor);
            return true;
        };
        this._currentAcceptInput = (wantsPreview) => {
            this._trace('invoking _currentAcceptInput');
            assertType(this._renameCandidateListView !== undefined);
            const nRenameSuggestions = this._renameCandidateListView.nCandidates;
            let newName;
            let source;
            const focusedCandidate = this._renameCandidateListView.focusedCandidate;
            if (focusedCandidate !== undefined) {
                this._trace('using new name from renameSuggestion');
                newName = focusedCandidate;
                source = { k: 'renameSuggestion' };
            }
            else {
                this._trace('using new name from inputField');
                newName = this._inputWithButton.input.value;
                source = this._isEditingRenameCandidate ? { k: 'userEditedRenameSuggestion' } : { k: 'inputField' };
            }
            if (newName === currentName || newName.trim().length === 0 /* is just whitespace */) {
                this.cancelInput(true, '_currentAcceptInput (because newName === value || newName.trim().length === 0)');
                return;
            }
            this._currentAcceptInput = undefined;
            this._currentCancelInput = undefined;
            this._renameCandidateListView.clearCandidates();
            // fixme session cleanup
            inputResult.complete({
                newName,
                wantsPreview: supportPreview && wantsPreview,
                stats: {
                    source,
                    nRenameSuggestions,
                    timeBeforeFirstInputFieldEdit: this._timeBeforeFirstInputFieldEdit,
                    nRenameSuggestionsInvocations: this._nRenameSuggestionsInvocations,
                    hadAutomaticRenameSuggestionsInvocation: this._hadAutomaticRenameSuggestionsInvocation,
                }
            });
        };
        disposeOnDone.add(cts.token.onCancellationRequested(() => this.cancelInput(true, 'cts.token.onCancellationRequested')));
        if (!_sticky) {
            disposeOnDone.add(this._editor.onDidBlurEditorWidget(() => this.cancelInput(!this._domNode?.ownerDocument.hasFocus(), 'editor.onDidBlurEditorWidget')));
        }
        this._show();
        return inputResult.p;
    }
    _requestRenameCandidates(currentName, isManuallyTriggered) {
        if (this._requestRenameCandidatesOnce === undefined) {
            return;
        }
        if (this._renameCandidateProvidersCts !== undefined) {
            this._renameCandidateProvidersCts.dispose(true);
        }
        assertType(this._renameCts);
        if (this._inputWithButton.buttonState !== 'stop') {
            this._renameCandidateProvidersCts = new CancellationTokenSource();
            const triggerKind = isManuallyTriggered ? NewSymbolNameTriggerKind.Invoke : NewSymbolNameTriggerKind.Automatic;
            const candidates = this._requestRenameCandidatesOnce(triggerKind, this._renameCandidateProvidersCts.token);
            if (candidates.length === 0) {
                this._inputWithButton.setSparkleButton();
                return;
            }
            if (!isManuallyTriggered) {
                this._hadAutomaticRenameSuggestionsInvocation = true;
            }
            this._nRenameSuggestionsInvocations += 1;
            this._inputWithButton.setStopButton();
            this._updateRenameCandidates(candidates, currentName, this._renameCts.token);
        }
    }
    /**
     * This allows selecting only part of the symbol name in the input field based on the selection in the editor
     */
    _getSelection(where, currentName) {
        assertType(this._editor.hasModel());
        const selection = this._editor.getSelection();
        let start = 0;
        let end = currentName.length;
        if (!Range.isEmpty(selection) && !Range.spansMultipleLines(selection) && Range.containsRange(where, selection)) {
            start = Math.max(0, selection.startColumn - where.startColumn);
            end = Math.min(where.endColumn, selection.endColumn) - where.startColumn;
        }
        return { start, end };
    }
    _show() {
        this._trace('invoking _show');
        this._editor.revealLineInCenterIfOutsideViewport(this._position.lineNumber, 0 /* ScrollType.Smooth */);
        this._visible = true;
        this._visibleContextKey.set(true);
        this._editor.layoutContentWidget(this);
        // TODO@ulugbekna: could this be simply run in `afterRender`?
        setTimeout(() => {
            this._inputWithButton.input.focus();
            this._inputWithButton.input.setSelectionRange(parseInt(this._inputWithButton.input.getAttribute('selectionStart')), parseInt(this._inputWithButton.input.getAttribute('selectionEnd')));
        }, 100);
    }
    async _updateRenameCandidates(candidates, currentName, token) {
        const trace = (...args) => this._trace('_updateRenameCandidates', ...args);
        trace('start');
        const namesListResults = await raceCancellation(Promise.allSettled(candidates), token);
        this._inputWithButton.setSparkleButton();
        if (namesListResults === undefined) {
            trace('returning early - received updateRenameCandidates results - undefined');
            return;
        }
        const newNames = namesListResults.flatMap(namesListResult => namesListResult.status === 'fulfilled' && isDefined(namesListResult.value)
            ? namesListResult.value
            : []);
        trace(`received updateRenameCandidates results - total (unfiltered) ${newNames.length} candidates.`);
        // deduplicate and filter out the current value
        const distinctNames = arrays.distinct(newNames, v => v.newSymbolName);
        trace(`distinct candidates - ${distinctNames.length} candidates.`);
        const validDistinctNames = distinctNames.filter(({ newSymbolName }) => newSymbolName.trim().length > 0 && newSymbolName !== this._inputWithButton.input.value && newSymbolName !== currentName && !this._candidates.has(newSymbolName));
        trace(`valid distinct candidates - ${newNames.length} candidates.`);
        validDistinctNames.forEach(n => this._candidates.add(n.newSymbolName));
        if (validDistinctNames.length < 1) {
            trace('returning early - no valid distinct candidates');
            return;
        }
        // show the candidates
        trace('setting candidates');
        this._renameCandidateListView.setCandidates(validDistinctNames);
        // ask editor to re-layout given that the widget is now of a different size after rendering rename candidates
        trace('asking editor to re-layout');
        this._editor.layoutContentWidget(this);
    }
    _hide() {
        this._trace('invoked _hide');
        this._visible = false;
        this._visibleContextKey.reset();
        this._editor.layoutContentWidget(this);
    }
    _getTopForPosition() {
        const visibleRanges = this._editor.getVisibleRanges();
        let firstLineInViewport;
        if (visibleRanges.length > 0) {
            firstLineInViewport = visibleRanges[0].startLineNumber;
        }
        else {
            this._logService.warn('RenameWidget#_getTopForPosition: this should not happen - visibleRanges is empty');
            firstLineInViewport = Math.max(1, this._position.lineNumber - 5); // @ulugbekna: fallback to current line minus 5
        }
        return this._editor.getTopForLineNumber(this._position.lineNumber) - this._editor.getTopForLineNumber(firstLineInViewport);
    }
    _trace(...args) {
        this._logService.trace('RenameWidget', ...args);
    }
};
RenameWidget = __decorate([
    __param(2, IThemeService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, ILogService)
], RenameWidget);
export { RenameWidget };
class RenameCandidateListView {
    // FIXME@ulugbekna: rewrite using event emitters
    constructor(parent, opts) {
        this._disposables = new DisposableStore();
        this._availableHeight = 0;
        this._minimumWidth = 0;
        this._lineHeight = opts.fontInfo.lineHeight;
        this._typicalHalfwidthCharacterWidth = opts.fontInfo.typicalHalfwidthCharacterWidth;
        this._listContainer = document.createElement('div');
        this._listContainer.className = 'rename-box rename-candidate-list-container';
        parent.appendChild(this._listContainer);
        this._listWidget = RenameCandidateListView._createListWidget(this._listContainer, this._candidateViewHeight, opts.fontInfo);
        this._listWidget.onDidChangeFocus(e => {
            if (e.elements.length === 1) {
                opts.onFocusChange(e.elements[0].newSymbolName);
            }
        }, this._disposables);
        this._listWidget.onDidChangeSelection(e => {
            if (e.elements.length === 1) {
                opts.onSelectionChange();
            }
        }, this._disposables);
        this._disposables.add(this._listWidget.onDidBlur(e => {
            this._listWidget.setFocus([]);
        }));
        this._listWidget.style(getListStyles({
            listInactiveFocusForeground: quickInputListFocusForeground,
            listInactiveFocusBackground: quickInputListFocusBackground,
        }));
    }
    dispose() {
        this._listWidget.dispose();
        this._disposables.dispose();
    }
    // height - max height allowed by parent element
    layout({ height, width }) {
        this._availableHeight = height;
        this._minimumWidth = width;
    }
    setCandidates(candidates) {
        // insert candidates into list widget
        this._listWidget.splice(0, 0, candidates);
        // adjust list widget layout
        const height = this._pickListHeight(this._listWidget.length);
        const width = this._pickListWidth(candidates);
        this._listWidget.layout(height, width);
        // adjust list container layout
        this._listContainer.style.height = `${height}px`;
        this._listContainer.style.width = `${width}px`;
        aria.status(nls.localize('renameSuggestionsReceivedAria', "Received {0} rename suggestions", candidates.length));
    }
    clearCandidates() {
        this._listContainer.style.height = '0px';
        this._listContainer.style.width = '0px';
        this._listWidget.splice(0, this._listWidget.length, []);
    }
    get nCandidates() {
        return this._listWidget.length;
    }
    get focusedCandidate() {
        if (this._listWidget.length === 0) {
            return;
        }
        const selectedElement = this._listWidget.getSelectedElements()[0];
        if (selectedElement !== undefined) {
            return selectedElement.newSymbolName;
        }
        const focusedElement = this._listWidget.getFocusedElements()[0];
        if (focusedElement !== undefined) {
            return focusedElement.newSymbolName;
        }
        return;
    }
    focusNext() {
        if (this._listWidget.length === 0) {
            return false;
        }
        const focusedIxs = this._listWidget.getFocus();
        if (focusedIxs.length === 0) {
            this._listWidget.focusFirst();
            this._listWidget.reveal(0);
            return true;
        }
        else {
            if (focusedIxs[0] === this._listWidget.length - 1) {
                this._listWidget.setFocus([]);
                this._listWidget.reveal(0); // @ulugbekna: without this, it seems like focused element is obstructed
                return false;
            }
            else {
                this._listWidget.focusNext();
                const focused = this._listWidget.getFocus()[0];
                this._listWidget.reveal(focused);
                return true;
            }
        }
    }
    /**
     * @returns true if focus is moved to previous element
     */
    focusPrevious() {
        if (this._listWidget.length === 0) {
            return false;
        }
        const focusedIxs = this._listWidget.getFocus();
        if (focusedIxs.length === 0) {
            this._listWidget.focusLast();
            const focused = this._listWidget.getFocus()[0];
            this._listWidget.reveal(focused);
            return true;
        }
        else {
            if (focusedIxs[0] === 0) {
                this._listWidget.setFocus([]);
                return false;
            }
            else {
                this._listWidget.focusPrevious();
                const focused = this._listWidget.getFocus()[0];
                this._listWidget.reveal(focused);
                return true;
            }
        }
    }
    clearFocus() {
        this._listWidget.setFocus([]);
    }
    get _candidateViewHeight() {
        const { totalHeight } = RenameCandidateView.getLayoutInfo({ lineHeight: this._lineHeight });
        return totalHeight;
    }
    _pickListHeight(nCandidates) {
        const heightToFitAllCandidates = this._candidateViewHeight * nCandidates;
        const MAX_N_CANDIDATES = 7; // @ulugbekna: max # of candidates we want to show at once
        const height = Math.min(heightToFitAllCandidates, this._availableHeight, this._candidateViewHeight * MAX_N_CANDIDATES);
        return height;
    }
    _pickListWidth(candidates) {
        const longestCandidateWidth = Math.ceil(Math.max(...candidates.map(c => c.newSymbolName.length)) * this._typicalHalfwidthCharacterWidth);
        const width = Math.max(this._minimumWidth, 4 /* padding */ + 16 /* sparkle icon */ + 5 /* margin-left */ + longestCandidateWidth + 10 /* (possibly visible) scrollbar width */ // TODO@ulugbekna: approximate calc - clean this up
        );
        return width;
    }
    static _createListWidget(container, candidateViewHeight, fontInfo) {
        const virtualDelegate = new class {
            getTemplateId(element) {
                return 'candidate';
            }
            getHeight(element) {
                return candidateViewHeight;
            }
        };
        const renderer = new class {
            constructor() {
                this.templateId = 'candidate';
            }
            renderTemplate(container) {
                return new RenameCandidateView(container, fontInfo);
            }
            renderElement(candidate, index, templateData) {
                templateData.populate(candidate);
            }
            disposeTemplate(templateData) {
                templateData.dispose();
            }
        };
        return new List('NewSymbolNameCandidates', container, virtualDelegate, [renderer], {
            keyboardSupport: false, // @ulugbekna: because we handle keyboard events through proper commands & keybinding service, see `rename.ts`
            mouseSupport: true,
            multipleSelectionSupport: false,
        });
    }
}
class InputWithButton {
    constructor() {
        this._buttonHoverContent = '';
        this._onDidInputChange = new Emitter();
        this.onDidInputChange = this._onDidInputChange.event;
        this._disposables = new DisposableStore();
    }
    get domNode() {
        if (!this._domNode) {
            this._domNode = document.createElement('div');
            this._domNode.className = 'rename-input-with-button';
            this._domNode.style.display = 'flex';
            this._domNode.style.flexDirection = 'row';
            this._domNode.style.alignItems = 'center';
            this._inputNode = document.createElement('input');
            this._inputNode.className = 'rename-input';
            this._inputNode.type = 'text';
            this._inputNode.style.border = 'none';
            this._inputNode.setAttribute('aria-label', nls.localize('renameAriaLabel', "Rename input. Type new name and press Enter to commit."));
            this._domNode.appendChild(this._inputNode);
            this._buttonNode = document.createElement('div');
            this._buttonNode.className = 'rename-suggestions-button';
            this._buttonNode.setAttribute('tabindex', '0');
            this._buttonGenHoverText = nls.localize('generateRenameSuggestionsButton', "Generate new name suggestions");
            this._buttonCancelHoverText = nls.localize('cancelRenameSuggestionsButton', "Cancel");
            this._buttonHoverContent = this._buttonGenHoverText;
            this._disposables.add(getBaseLayerHoverDelegate().setupDelayedHover(this._buttonNode, () => ({
                content: this._buttonHoverContent,
                appearance: {
                    showPointer: true,
                    compact: true,
                }
            })));
            this._domNode.appendChild(this._buttonNode);
            // notify if selection changes to cancel request to rename-suggestion providers
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.INPUT, () => this._onDidInputChange.fire()));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                if (keyEvent.keyCode === 15 /* KeyCode.LeftArrow */ || keyEvent.keyCode === 17 /* KeyCode.RightArrow */) {
                    this._onDidInputChange.fire();
                }
            }));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.CLICK, () => this._onDidInputChange.fire()));
            // focus "container" border instead of input box
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.FOCUS, () => {
                this.domNode.style.outlineWidth = '1px';
                this.domNode.style.outlineStyle = 'solid';
                this.domNode.style.outlineOffset = '-1px';
                this.domNode.style.outlineColor = 'var(--vscode-focusBorder)';
            }));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.BLUR, () => {
                this.domNode.style.outline = 'none';
            }));
        }
        return this._domNode;
    }
    get input() {
        assertType(this._inputNode);
        return this._inputNode;
    }
    get button() {
        assertType(this._buttonNode);
        return this._buttonNode;
    }
    get buttonState() {
        return this._buttonState;
    }
    setSparkleButton() {
        this._buttonState = 'sparkle';
        this._sparkleIcon ??= renderIcon(Codicon.sparkle);
        dom.clearNode(this.button);
        this.button.appendChild(this._sparkleIcon);
        this.button.setAttribute('aria-label', 'Generating new name suggestions');
        this._buttonHoverContent = this._buttonGenHoverText;
        this.input.focus();
    }
    setStopButton() {
        this._buttonState = 'stop';
        this._stopIcon ??= renderIcon(Codicon.stopCircle);
        dom.clearNode(this.button);
        this.button.appendChild(this._stopIcon);
        this.button.setAttribute('aria-label', 'Cancel generating new name suggestions');
        this._buttonHoverContent = this._buttonCancelHoverText;
        this.input.focus();
    }
    dispose() {
        this._disposables.dispose();
    }
}
class RenameCandidateView {
    static { this._PADDING = 2; }
    constructor(parent, fontInfo) {
        this._domNode = document.createElement('div');
        this._domNode.className = 'rename-box rename-candidate';
        this._domNode.style.display = `flex`;
        this._domNode.style.columnGap = `5px`;
        this._domNode.style.alignItems = `center`;
        this._domNode.style.height = `${fontInfo.lineHeight}px`;
        this._domNode.style.padding = `${RenameCandidateView._PADDING}px`;
        // @ulugbekna: needed to keep space when the `icon.style.display` is set to `none`
        const iconContainer = document.createElement('div');
        iconContainer.style.display = `flex`;
        iconContainer.style.alignItems = `center`;
        iconContainer.style.width = iconContainer.style.height = `${fontInfo.lineHeight * 0.8}px`;
        this._domNode.appendChild(iconContainer);
        this._icon = renderIcon(Codicon.sparkle);
        this._icon.style.display = `none`;
        iconContainer.appendChild(this._icon);
        this._label = document.createElement('div');
        domFontInfo.applyFontInfo(this._label, fontInfo);
        this._domNode.appendChild(this._label);
        parent.appendChild(this._domNode);
    }
    populate(value) {
        this._updateIcon(value);
        this._updateLabel(value);
    }
    _updateIcon(value) {
        const isAIGenerated = !!value.tags?.includes(NewSymbolNameTag.AIGenerated);
        this._icon.style.display = isAIGenerated ? 'inherit' : 'none';
    }
    _updateLabel(value) {
        this._label.innerText = value.newSymbolName;
    }
    static getLayoutInfo({ lineHeight }) {
        const totalHeight = lineHeight + RenameCandidateView._PADDING * 2 /* top & bottom padding */;
        return { totalHeight };
    }
    dispose() {
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3JlbmFtZS9icm93c2VyL3JlbmFtZVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxLQUFLLFdBQVcsTUFB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