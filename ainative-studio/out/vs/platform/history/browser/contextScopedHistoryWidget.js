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
import { FindInput } from '../../../base/browser/ui/findinput/findInput.js';
import { ReplaceInput } from '../../../base/browser/ui/findinput/replaceInput.js';
import { HistoryInputBox } from '../../../base/browser/ui/inputbox/inputBox.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
import { localize } from '../../../nls.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { isActiveElement } from '../../../base/browser/dom.js';
export const historyNavigationVisible = new RawContextKey('suggestWidgetVisible', false, localize('suggestWidgetVisible', "Whether suggestion are visible"));
const HistoryNavigationWidgetFocusContext = 'historyNavigationWidgetFocus';
const HistoryNavigationForwardsEnablementContext = 'historyNavigationForwardsEnabled';
const HistoryNavigationBackwardsEnablementContext = 'historyNavigationBackwardsEnabled';
let lastFocusedWidget = undefined;
const widgets = [];
export function registerAndCreateHistoryNavigationContext(scopedContextKeyService, widget) {
    if (widgets.includes(widget)) {
        throw new Error('Cannot register the same widget multiple times');
    }
    widgets.push(widget);
    const disposableStore = new DisposableStore();
    const historyNavigationWidgetFocus = new RawContextKey(HistoryNavigationWidgetFocusContext, false).bindTo(scopedContextKeyService);
    const historyNavigationForwardsEnablement = new RawContextKey(HistoryNavigationForwardsEnablementContext, true).bindTo(scopedContextKeyService);
    const historyNavigationBackwardsEnablement = new RawContextKey(HistoryNavigationBackwardsEnablementContext, true).bindTo(scopedContextKeyService);
    const onDidFocus = () => {
        historyNavigationWidgetFocus.set(true);
        lastFocusedWidget = widget;
    };
    const onDidBlur = () => {
        historyNavigationWidgetFocus.set(false);
        if (lastFocusedWidget === widget) {
            lastFocusedWidget = undefined;
        }
    };
    // Check for currently being focused
    if (isActiveElement(widget.element)) {
        onDidFocus();
    }
    disposableStore.add(widget.onDidFocus(() => onDidFocus()));
    disposableStore.add(widget.onDidBlur(() => onDidBlur()));
    disposableStore.add(toDisposable(() => {
        widgets.splice(widgets.indexOf(widget), 1);
        onDidBlur();
    }));
    return {
        historyNavigationForwardsEnablement,
        historyNavigationBackwardsEnablement,
        dispose() {
            disposableStore.dispose();
        }
    };
}
let ContextScopedHistoryInputBox = class ContextScopedHistoryInputBox extends HistoryInputBox {
    constructor(container, contextViewProvider, options, contextKeyService) {
        super(container, contextViewProvider, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this));
    }
};
ContextScopedHistoryInputBox = __decorate([
    __param(3, IContextKeyService)
], ContextScopedHistoryInputBox);
export { ContextScopedHistoryInputBox };
let ContextScopedFindInput = class ContextScopedFindInput extends FindInput {
    constructor(container, contextViewProvider, options, contextKeyService) {
        super(container, contextViewProvider, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.inputBox.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this.inputBox));
    }
};
ContextScopedFindInput = __decorate([
    __param(3, IContextKeyService)
], ContextScopedFindInput);
export { ContextScopedFindInput };
let ContextScopedReplaceInput = class ContextScopedReplaceInput extends ReplaceInput {
    constructor(container, contextViewProvider, options, contextKeyService, showReplaceOptions = false) {
        super(container, contextViewProvider, showReplaceOptions, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.inputBox.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this.inputBox));
    }
};
ContextScopedReplaceInput = __decorate([
    __param(3, IContextKeyService)
], ContextScopedReplaceInput);
export { ContextScopedReplaceInput };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'history.showPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetFocusContext), ContextKeyExpr.equals(HistoryNavigationBackwardsEnablementContext, true), ContextKeyExpr.not('isComposing'), historyNavigationVisible.isEqualTo(false)),
    primary: 16 /* KeyCode.UpArrow */,
    secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
    handler: (accessor) => {
        lastFocusedWidget?.showPreviousValue();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'history.showNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetFocusContext), ContextKeyExpr.equals(HistoryNavigationForwardsEnablementContext, true), ContextKeyExpr.not('isComposing'), historyNavigationVisible.isEqualTo(false)),
    primary: 18 /* KeyCode.DownArrow */,
    secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
    handler: (accessor) => {
        lastFocusedWidget?.showNextValue();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dFNjb3BlZEhpc3RvcnlXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaGlzdG9yeS9icm93c2VyL2NvbnRleHRTY29wZWRIaXN0b3J5V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxTQUFTLEVBQXFCLE1BQU0saURBQWlELENBQUM7QUFDL0YsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZUFBZSxFQUF3QixNQUFNLCtDQUErQyxDQUFDO0FBRXRHLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkgsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUvRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztBQUV0SyxNQUFNLG1DQUFtQyxHQUFHLDhCQUE4QixDQUFDO0FBQzNFLE1BQU0sMENBQTBDLEdBQUcsa0NBQWtDLENBQUM7QUFDdEYsTUFBTSwyQ0FBMkMsR0FBRyxtQ0FBbUMsQ0FBQztBQU94RixJQUFJLGlCQUFpQixHQUF5QyxTQUFTLENBQUM7QUFDeEUsTUFBTSxPQUFP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