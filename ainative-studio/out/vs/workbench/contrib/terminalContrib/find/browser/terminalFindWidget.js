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
import * as dom from '../../../../../base/browser/dom.js';
import { SimpleFindWidget } from '../../../codeEditor/browser/find/simpleFindWidget.js';
import { IContextMenuService, IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Event } from '../../../../../base/common/event.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { TerminalClipboardContribution } from '../../clipboard/browser/terminal.clipboard.contribution.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { createTextInputActions } from '../../../../browser/actions/textInputActions.js';
const TERMINAL_FIND_WIDGET_INITIAL_WIDTH = 419;
let TerminalFindWidget = class TerminalFindWidget extends SimpleFindWidget {
    constructor(_instance, clipboardService, configurationService, contextKeyService, contextMenuService, contextViewService, hoverService, keybindingService, themeService) {
        super({
            showCommonFindToggles: true,
            checkImeCompletionState: true,
            showResultCount: true,
            initialWidth: TERMINAL_FIND_WIDGET_INITIAL_WIDTH,
            enableSash: true,
            appendCaseSensitiveActionId: "workbench.action.terminal.toggleFindCaseSensitive" /* TerminalFindCommandId.ToggleFindCaseSensitive */,
            appendRegexActionId: "workbench.action.terminal.toggleFindRegex" /* TerminalFindCommandId.ToggleFindRegex */,
            appendWholeWordsActionId: "workbench.action.terminal.toggleFindWholeWord" /* TerminalFindCommandId.ToggleFindWholeWord */,
            previousMatchActionId: "workbench.action.terminal.findPrevious" /* TerminalFindCommandId.FindPrevious */,
            nextMatchActionId: "workbench.action.terminal.findNext" /* TerminalFindCommandId.FindNext */,
            closeWidgetActionId: "workbench.action.terminal.hideFind" /* TerminalFindCommandId.FindHide */,
            type: 'Terminal',
            matchesLimit: 20000 /* XtermTerminalConstants.SearchHighlightLimit */
        }, contextViewService, contextKeyService, hoverService, keybindingService);
        this._instance = _instance;
        this._register(this.state.onFindReplaceStateChange(() => {
            this.show();
        }));
        this._findInputFocused = TerminalContextKeys.findInputFocus.bindTo(contextKeyService);
        this._findWidgetFocused = TerminalContextKeys.findFocus.bindTo(contextKeyService);
        this._findWidgetVisible = TerminalContextKeys.findVisible.bindTo(contextKeyService);
        const innerDom = this.getDomNode().firstChild;
        if (innerDom) {
            this._register(dom.addDisposableListener(innerDom, 'mousedown', (event) => {
                event.stopPropagation();
            }));
            this._register(dom.addDisposableListener(innerDom, 'contextmenu', (event) => {
                event.stopPropagation();
            }));
        }
        const findInputDomNode = this.getFindInputDomNode();
        this._register(dom.addDisposableListener(findInputDomNode, 'contextmenu', (event) => {
            const targetWindow = dom.getWindow(findInputDomNode);
            const standardEvent = new StandardMouseEvent(targetWindow, event);
            const actions = createTextInputActions(clipboardService);
            contextMenuService.showContextMenu({
                getAnchor: () => standardEvent,
                getActions: () => actions,
                getActionsContext: () => event.target,
            });
            event.stopPropagation();
        }));
        this._register(themeService.onDidColorThemeChange(() => {
            if (this.isVisible()) {
                this.find(true, true);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.colorCustomizations') && this.isVisible()) {
                this.find(true, true);
            }
        }));
        this.updateResultCount();
    }
    find(previous, update) {
        const xterm = this._instance.xterm;
        if (!xterm) {
            return;
        }
        if (previous) {
            this._findPreviousWithEvent(xterm, this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue(), incremental: update });
        }
        else {
            this._findNextWithEvent(xterm, this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
        }
    }
    reveal() {
        const initialInput = this._instance.hasSelection() && !this._instance.selection.includes('\n') ? this._instance.selection : undefined;
        const inputValue = initialInput ?? this.inputValue;
        const xterm = this._instance.xterm;
        if (xterm && inputValue && inputValue !== '') {
            // trigger highlight all matches
            this._findPreviousWithEvent(xterm, inputValue, { incremental: true, regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() }).then(foundMatch => {
                this.updateButtons(foundMatch);
                this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            });
        }
        this.updateButtons(false);
        super.reveal(inputValue);
        this._findWidgetVisible.set(true);
    }
    show() {
        const initialInput = this._instance.hasSelection() && !this._instance.selection.includes('\n') ? this._instance.selection : undefined;
        super.show(initialInput);
        this._findWidgetVisible.set(true);
    }
    hide() {
        super.hide();
        this._findWidgetVisible.reset();
        this._instance.focus(true);
        this._instance.xterm?.clearSearchDecorations();
    }
    async _getResultCount() {
        return this._instance.xterm?.findResult;
    }
    _onInputChanged() {
        // Ignore input changes for now
        const xterm = this._instance.xterm;
        if (xterm) {
            this._findPreviousWithEvent(xterm, this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue(), incremental: true }).then(foundMatch => {
                this.updateButtons(foundMatch);
            });
        }
        return false;
    }
    _onFocusTrackerFocus() {
        if ('overrideCopyOnSelection' in this._instance) {
            this._overrideCopyOnSelectionDisposable = TerminalClipboardContribution.get(this._instance)?.overrideCopyOnSelection(false);
        }
        this._findWidgetFocused.set(true);
    }
    _onFocusTrackerBlur() {
        this._overrideCopyOnSelectionDisposable?.dispose();
        this._instance.xterm?.clearActiveSearchDecoration();
        this._findWidgetFocused.reset();
    }
    _onFindInputFocusTrackerFocus() {
        this._findInputFocused.set(true);
    }
    _onFindInputFocusTrackerBlur() {
        this._findInputFocused.reset();
    }
    findFirst() {
        const instance = this._instance;
        if (instance.hasSelection()) {
            instance.clearSelection();
        }
        const xterm = instance.xterm;
        if (xterm) {
            this._findPreviousWithEvent(xterm, this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
        }
    }
    async _findNextWithEvent(xterm, term, options) {
        return xterm.findNext(term, options).then(foundMatch => {
            this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            return foundMatch;
        });
    }
    async _findPreviousWithEvent(xterm, term, options) {
        return xterm.findPrevious(term, options).then(foundMatch => {
            this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            return foundMatch;
        });
    }
};
TerminalFindWidget = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IContextViewService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IThemeService)
], TerminalFindWidget);
export { TerminalFindWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxGaW5kV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9maW5kL2Jyb3dzZXIvdGVybWluYWxGaW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdEgsT0FBTyxFQUFFLGtCQUFrQixFQUFlLE1BQU0seURBQXlELENBQUM7QUFFMUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFekYsTUFBTSxrQ0FB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