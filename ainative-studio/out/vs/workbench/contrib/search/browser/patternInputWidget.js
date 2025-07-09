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
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import * as nls from '../../../../nls.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
let PatternInputWidget = class PatternInputWidget extends Widget {
    static { this.OPTION_CHANGE = 'optionChange'; }
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super();
        this.contextViewProvider = contextViewProvider;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this._onSubmit = this._register(new Emitter());
        this.onSubmit = this._onSubmit.event;
        this._onCancel = this._register(new Emitter());
        this.onCancel = this._onCancel.event;
        options = {
            ...{
                ariaLabel: nls.localize('defaultLabel', "input")
            },
            ...options,
        };
        this.width = options.width ?? 100;
        this.render(options);
        parent.appendChild(this.domNode);
    }
    dispose() {
        super.dispose();
        this.inputFocusTracker?.dispose();
    }
    setWidth(newWidth) {
        this.width = newWidth;
        this.contextViewProvider.layout();
        this.setInputWidth();
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        if (this.inputBox.value !== value) {
            this.inputBox.value = value;
        }
    }
    select() {
        this.inputBox.select();
    }
    focus() {
        this.inputBox.focus();
    }
    inputHasFocus() {
        return this.inputBox.hasFocus();
    }
    setInputWidth() {
        this.inputBox.width = this.width - this.getSubcontrolsWidth() - 2; // 2 for input box border
    }
    getSubcontrolsWidth() {
        return 0;
    }
    getHistory() {
        return this.inputBox.getHistory();
    }
    clearHistory() {
        this.inputBox.clearHistory();
    }
    prependHistory(history) {
        this.inputBox.prependHistory(history);
    }
    clear() {
        this.setValue('');
    }
    onSearchSubmit() {
        this.inputBox.addToHistory();
    }
    showNextTerm() {
        this.inputBox.showNextValue();
    }
    showPreviousTerm() {
        this.inputBox.showPreviousValue();
    }
    render(options) {
        this.domNode = document.createElement('div');
        this.domNode.classList.add('monaco-findInput');
        const history = options.history || [];
        this.inputBox = new ContextScopedHistoryInputBox(this.domNode, this.contextViewProvider, {
            placeholder: options.placeholder,
            showPlaceholderOnFocus: options.showPlaceholderOnFocus,
            tooltip: options.tooltip,
            ariaLabel: options.ariaLabel,
            validationOptions: {
                validation: undefined
            },
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            inputBoxStyles: options.inputBoxStyles
        }, this.contextKeyService);
        this._register(this.inputBox.onDidChange(() => this._onSubmit.fire(true)));
        this.inputFocusTracker = dom.trackFocus(this.inputBox.inputElement);
        this.onkeyup(this.inputBox.inputElement, (keyboardEvent) => this.onInputKeyUp(keyboardEvent));
        const controls = document.createElement('div');
        controls.className = 'controls';
        this.renderSubcontrols(controls);
        this.domNode.appendChild(controls);
        this.setInputWidth();
    }
    renderSubcontrols(_controlsDiv) {
    }
    onInputKeyUp(keyboardEvent) {
        switch (keyboardEvent.keyCode) {
            case 3 /* KeyCode.Enter */:
                this.onSearchSubmit();
                this._onSubmit.fire(false);
                return;
            case 9 /* KeyCode.Escape */:
                this._onCancel.fire();
                return;
        }
    }
};
PatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], PatternInputWidget);
export { PatternInputWidget };
let IncludePatternInputWidget = class IncludePatternInputWidget extends PatternInputWidget {
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService);
        this._onChangeSearchInEditorsBoxEmitter = this._register(new Emitter());
        this.onChangeSearchInEditorsBox = this._onChangeSearchInEditorsBoxEmitter.event;
    }
    dispose() {
        super.dispose();
        this.useSearchInEditorsBox.dispose();
    }
    onlySearchInOpenEditors() {
        return this.useSearchInEditorsBox.checked;
    }
    setOnlySearchInOpenEditors(value) {
        this.useSearchInEditorsBox.checked = value;
        this._onChangeSearchInEditorsBoxEmitter.fire();
    }
    getSubcontrolsWidth() {
        return super.getSubcontrolsWidth() + this.useSearchInEditorsBox.width();
    }
    renderSubcontrols(controlsDiv) {
        this.useSearchInEditorsBox = this._register(new Toggle({
            icon: Codicon.book,
            title: nls.localize('onlySearchInOpenEditors', "Search only in Open Editors"),
            isChecked: false,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles
        }));
        this._register(this.useSearchInEditorsBox.onChange(viaKeyboard => {
            this._onChangeSearchInEditorsBoxEmitter.fire();
            if (!viaKeyboard) {
                this.inputBox.focus();
            }
        }));
        controlsDiv.appendChild(this.useSearchInEditorsBox.domNode);
        super.renderSubcontrols(controlsDiv);
    }
};
IncludePatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], IncludePatternInputWidget);
export { IncludePatternInputWidget };
let ExcludePatternInputWidget = class ExcludePatternInputWidget extends PatternInputWidget {
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService);
        this._onChangeIgnoreBoxEmitter = this._register(new Emitter());
        this.onChangeIgnoreBox = this._onChangeIgnoreBoxEmitter.event;
    }
    dispose() {
        super.dispose();
        this.useExcludesAndIgnoreFilesBox.dispose();
    }
    useExcludesAndIgnoreFiles() {
        return this.useExcludesAndIgnoreFilesBox.checked;
    }
    setUseExcludesAndIgnoreFiles(value) {
        this.useExcludesAndIgnoreFilesBox.checked = value;
        this._onChangeIgnoreBoxEmitter.fire();
    }
    getSubcontrolsWidth() {
        return super.getSubcontrolsWidth() + this.useExcludesAndIgnoreFilesBox.width();
    }
    renderSubcontrols(controlsDiv) {
        this.useExcludesAndIgnoreFilesBox = this._register(new Toggle({
            icon: Codicon.exclude,
            actionClassName: 'useExcludesAndIgnoreFiles',
            title: nls.localize('useExcludesAndIgnoreFilesDescription', "Use Exclude Settings and Ignore Files"),
            isChecked: true,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles
        }));
        this._register(this.useExcludesAndIgnoreFilesBox.onChange(viaKeyboard => {
            this._onChangeIgnoreBoxEmitter.fire();
            if (!viaKeyboard) {
                this.inputBox.focus();
            }
        }));
        controlsDiv.appendChild(this.useExcludesAndIgnoreFilesBox.domNode);
        super.renderSubcontrols(controlsDiv);
    }
};
ExcludePatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], ExcludePatternInputWidget);
export { ExcludePatternInputWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0dGVybklucHV0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3BhdHRlcm5JbnB1dFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQXdCLE1BQU0sa0NBQWtDLENBQUM7QUFFakYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNsSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQVk3RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLE1BQU07YUFFdEMsa0JBQWEsR0FBVyxjQUFjLEFBQXpCLENBQTBCO0lBZTlDLFlBQVksTUFB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