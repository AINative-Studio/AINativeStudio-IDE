/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './simpleFindWidget.css';
import * as nls from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import { Delayer } from '../../../../../base/common/async.js';
import { FindReplaceState } from '../../../../../editor/contrib/find/browser/findState.js';
import { SimpleButton, findPreviousMatchIcon, findNextMatchIcon, NLS_NO_RESULTS, NLS_MATCHES_LOCATION } from '../../../../../editor/contrib/find/browser/findWidget.js';
import { ContextScopedFindInput } from '../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { widgetClose } from '../../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import * as strings from '../../../../../base/common/strings.js';
import { showHistoryKeybindingHint } from '../../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { defaultInputBoxStyles, defaultToggleStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { Sash } from '../../../../../base/browser/ui/sash/sash.js';
import { registerColor } from '../../../../../platform/theme/common/colorRegistry.js';
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', "Previous Match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', "Next Match");
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', "Close");
const SIMPLE_FIND_WIDGET_INITIAL_WIDTH = 310;
const MATCHES_COUNT_WIDTH = 73;
export class SimpleFindWidget extends Widget {
    constructor(options, contextViewService, contextKeyService, hoverService, _keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this._isVisible = false;
        this._foundMatch = false;
        this._width = 0;
        this.state = this._register(new FindReplaceState());
        this._matchesLimit = options.matchesLimit ?? Number.MAX_SAFE_INTEGER;
        this._findInput = this._register(new ContextScopedFindInput(null, contextViewService, {
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    new RegExp(value);
                    return null;
                }
                catch (e) {
                    this._foundMatch = false;
                    this.updateButtons(this._foundMatch);
                    return { content: e.message };
                }
            },
            showCommonFindToggles: options.showCommonFindToggles,
            appendCaseSensitiveLabel: options.appendCaseSensitiveActionId ? this._getKeybinding(options.appendCaseSensitiveActionId) : undefined,
            appendRegexLabel: options.appendRegexActionId ? this._getKeybinding(options.appendRegexActionId) : undefined,
            appendWholeWordsLabel: options.appendWholeWordsActionId ? this._getKeybinding(options.appendWholeWordsActionId) : undefined,
            showHistoryHint: () => showHistoryKeybindingHint(_keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles
        }, contextKeyService));
        // Find History with update delayer
        this._updateHistoryDelayer = this._register(new Delayer(500));
        this._register(this._findInput.onInput(async (e) => {
            if (!options.checkImeCompletionState || !this._findInput.isImeSessionInProgress) {
                this._foundMatch = this._onInputChanged();
                if (options.showResultCount) {
                    await this.updateResultCount();
                }
                this.updateButtons(this._foundMatch);
                this.focusFindBox();
                this._delayedUpdateHistory();
            }
        }));
        this._findInput.setRegex(!!this.state.isRegex);
        this._findInput.setCaseSensitive(!!this.state.matchCase);
        this._findInput.setWholeWords(!!this.state.wholeWord);
        this._register(this._findInput.onDidOptionChange(() => {
            this.state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive()
            }, true);
        }));
        this._register(this.state.onFindReplaceStateChange(() => {
            this._findInput.setRegex(this.state.isRegex);
            this._findInput.setWholeWords(this.state.wholeWord);
            this._findInput.setCaseSensitive(this.state.matchCase);
            this.findFirst();
        }));
        this.prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL + (options.previousMatchActionId ? this._getKeybinding(options.previousMatchActionId) : ''),
            icon: findPreviousMatchIcon,
            onTrigger: () => {
                this.find(true);
            }
        }, hoverService));
        this.nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL + (options.nextMatchActionId ? this._getKeybinding(options.nextMatchActionId) : ''),
            icon: findNextMatchIcon,
            onTrigger: () => {
                this.find(false);
            }
        }, hoverService));
        const closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL + (options.closeWidgetActionId ? this._getKeybinding(options.closeWidgetActionId) : ''),
            icon: widgetClose,
            onTrigger: () => {
                this.hide();
            }
        }, hoverService));
        this._innerDomNode = document.createElement('div');
        this._innerDomNode.classList.add('simple-find-part');
        this._innerDomNode.appendChild(this._findInput.domNode);
        this._innerDomNode.appendChild(this.prevBtn.domNode);
        this._innerDomNode.appendChild(this.nextBtn.domNode);
        this._innerDomNode.appendChild(closeBtn.domNode);
        // _domNode wraps _innerDomNode, ensuring that
        this._domNode = document.createElement('div');
        this._domNode.classList.add('simple-find-part-wrapper');
        this._domNode.appendChild(this._innerDomNode);
        this.onkeyup(this._innerDomNode, e => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
                e.preventDefault();
                return;
            }
        });
        this._focusTracker = this._register(dom.trackFocus(this._innerDomNode));
        this._register(this._focusTracker.onDidFocus(this._onFocusTrackerFocus.bind(this)));
        this._register(this._focusTracker.onDidBlur(this._onFocusTrackerBlur.bind(this)));
        this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
        this._register(this._findInputFocusTracker.onDidFocus(this._onFindInputFocusTrackerFocus.bind(this)));
        this._register(this._findInputFocusTracker.onDidBlur(this._onFindInputFocusTrackerBlur.bind(this)));
        this._register(dom.addDisposableListener(this._innerDomNode, 'click', (event) => {
            event.stopPropagation();
        }));
        if (options?.showResultCount) {
            this._domNode.classList.add('result-count');
            this._matchesCount = document.createElement('div');
            this._matchesCount.className = 'matchesCount';
            this._findInput.domNode.insertAdjacentElement('afterend', this._matchesCount);
            this._register(this._findInput.onDidChange(async () => {
                await this.updateResultCount();
            }));
            this._register(this._findInput.onDidOptionChange(async () => {
                this._foundMatch = this._onInputChanged();
                await this.updateResultCount();
                this.focusFindBox();
                this._delayedUpdateHistory();
            }));
        }
        let initialMinWidth = options?.initialWidth;
        if (initialMinWidth) {
            initialMinWidth = initialMinWidth < SIMPLE_FIND_WIDGET_INITIAL_WIDTH ? SIMPLE_FIND_WIDGET_INITIAL_WIDTH : initialMinWidth;
            this._domNode.style.width = `${initialMinWidth}px`;
        }
        if (options?.enableSash) {
            const _initialMinWidth = initialMinWidth ?? SIMPLE_FIND_WIDGET_INITIAL_WIDTH;
            let originalWidth = _initialMinWidth;
            // sash
            const resizeSash = this._register(new Sash(this._innerDomNode, this, { orientation: 0 /* Orientation.VERTICAL */, size: 1 }));
            this._register(resizeSash.onDidStart(() => {
                originalWidth = parseFloat(dom.getComputedStyle(this._domNode).width);
            }));
            this._register(resizeSash.onDidChange((e) => {
                const width = originalWidth + e.startX - e.currentX;
                if (width < _initialMinWidth) {
                    return;
                }
                this._domNode.style.width = `${width}px`;
            }));
            this._register(resizeSash.onDidReset(e => {
                const currentWidth = parseFloat(dom.getComputedStyle(this._domNode).width);
                if (currentWidth === _initialMinWidth) {
                    this._domNode.style.width = '100%';
                }
                else {
                    this._domNode.style.width = `${_initialMinWidth}px`;
                }
            }));
        }
    }
    getVerticalSashLeft(_sash) {
        return 0;
    }
    get inputValue() {
        return this._findInput.getValue();
    }
    get focusTracker() {
        return this._focusTracker;
    }
    _getKeybinding(actionId) {
        const kb = this._keybindingService?.lookupKeybinding(actionId);
        if (!kb) {
            return '';
        }
        return ` (${kb.getLabel()})`;
    }
    dispose() {
        super.dispose();
        this._domNode?.remove();
    }
    isVisible() {
        return this._isVisible;
    }
    getDomNode() {
        return this._domNode;
    }
    getFindInputDomNode() {
        return this._findInput.domNode;
    }
    reveal(initialInput, animated = true) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (this._isVisible) {
            this._findInput.select();
            return;
        }
        this._isVisible = true;
        this.updateResultCount();
        this.layout();
        setTimeout(() => {
            this._innerDomNode.classList.toggle('suppress-transition', !animated);
            this._innerDomNode.classList.add('visible', 'visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'false');
            this._findInput.select();
            if (!animated) {
                setTimeout(() => {
                    this._innerDomNode.classList.remove('suppress-transition');
                }, 0);
            }
        }, 0);
    }
    show(initialInput) {
        if (initialInput && !this._isVisible) {
            this._findInput.setValue(initialInput);
        }
        this._isVisible = true;
        this.layout();
        setTimeout(() => {
            this._innerDomNode.classList.add('visible', 'visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'false');
        }, 0);
    }
    hide(animated = true) {
        if (this._isVisible) {
            this._innerDomNode.classList.toggle('suppress-transition', !animated);
            this._innerDomNode.classList.remove('visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'true');
            // Need to delay toggling visibility until after Transition, then visibility hidden - removes from tabIndex list
            setTimeout(() => {
                this._isVisible = false;
                this.updateButtons(this._foundMatch);
                this._innerDomNode.classList.remove('visible', 'suppress-transition');
            }, animated ? 200 : 0);
        }
    }
    layout(width = this._width) {
        this._width = width;
        if (!this._isVisible) {
            return;
        }
        if (this._matchesCount) {
            let reducedFindWidget = false;
            if (SIMPLE_FIND_WIDGET_INITIAL_WIDTH + MATCHES_COUNT_WIDTH + 28 >= width) {
                reducedFindWidget = true;
            }
            this._innerDomNode.classList.toggle('reduced-find-widget', reducedFindWidget);
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this));
    }
    _updateHistory() {
        this._findInput.inputBox.addToHistory();
    }
    _getRegexValue() {
        return this._findInput.getRegex();
    }
    _getWholeWordValue() {
        return this._findInput.getWholeWords();
    }
    _getCaseSensitiveValue() {
        return this._findInput.getCaseSensitive();
    }
    updateButtons(foundMatch) {
        const hasInput = this.inputValue.length > 0;
        this.prevBtn.setEnabled(this._isVisible && hasInput && foundMatch);
        this.nextBtn.setEnabled(this._isVisible && hasInput && foundMatch);
    }
    focusFindBox() {
        // Focus back onto the find box, which
        // requires focusing onto the next button first
        this.nextBtn.focus();
        this._findInput.inputBox.focus();
    }
    async updateResultCount() {
        if (!this._matchesCount) {
            this.updateButtons(this._foundMatch);
            return;
        }
        const count = await this._getResultCount();
        this._matchesCount.innerText = '';
        const showRedOutline = (this.inputValue.length > 0 && count?.resultCount === 0);
        this._matchesCount.classList.toggle('no-results', showRedOutline);
        let label = '';
        if (count?.resultCount) {
            let matchesCount = String(count.resultCount);
            if (count.resultCount >= this._matchesLimit) {
                matchesCount += '+';
            }
            let matchesPosition = String(count.resultIndex + 1);
            if (matchesPosition === '0') {
                matchesPosition = '?';
            }
            label = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
        }
        else {
            label = NLS_NO_RESULTS;
        }
        status(this._announceSearchResults(label, this.inputValue));
        this._matchesCount.appendChild(document.createTextNode(label));
        this._foundMatch = !!count && count.resultCount > 0;
        this.updateButtons(this._foundMatch);
    }
    changeState(state) {
        this.state.change(state, false);
    }
    _announceSearchResults(label, searchString) {
        if (!searchString) {
            return nls.localize('ariaSearchNoInput', "Enter search input");
        }
        if (label === NLS_NO_RESULTS) {
            return searchString === ''
                ? nls.localize('ariaSearchNoResultEmpty', "{0} found", label)
                : nls.localize('ariaSearchNoResult', "{0} found for '{1}'", label, searchString);
        }
        return nls.localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", label, searchString);
    }
}
export const simpleFindWidgetSashBorder = registerColor('simpleFindWidget.sashBorder', { dark: '#454545', light: '#C8C8C8', hcDark: '#6FC3DF', hcLight: '#0F4A85' }, nls.localize('simpleFindWidget.sashBorder', 'Border color of the sash border.'));
registerThemingParticipant((theme, collector) => {
    const resizeBorderBackground = theme.getColor(simpleFindWidgetSashBorder);
    collector.addRule(`.monaco-workbench .simple-find-part .monaco-sash { background-color: ${resizeBorderBackground}; border-color: ${resizeBorderBackground} }`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRmluZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZmluZC9zaW1wbGVGaW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHlEQUF5RCxDQUFDO0FBRWpILE9BQU8sRUFBRSxZQUFZLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHeEssT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUM7QUFFakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDbkgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BILE9BQU8sRUFBd0QsSUFBSSxFQUFF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