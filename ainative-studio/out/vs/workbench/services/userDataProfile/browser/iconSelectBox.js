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
var WorkbenchIconSelectBox_1;
import { IconSelectBox } from '../../../../base/browser/ui/icons/iconSelectBox.js';
import * as dom from '../../../../base/browser/dom.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
export const WorkbenchIconSelectBoxFocusContextKey = new RawContextKey('iconSelectBoxFocus', true);
export const WorkbenchIconSelectBoxInputFocusContextKey = new RawContextKey('iconSelectBoxInputFocus', true);
export const WorkbenchIconSelectBoxInputEmptyContextKey = new RawContextKey('iconSelectBoxInputEmpty', true);
let WorkbenchIconSelectBox = class WorkbenchIconSelectBox extends IconSelectBox {
    static { WorkbenchIconSelectBox_1 = this; }
    static getFocusedWidget() {
        return WorkbenchIconSelectBox_1.focusedWidget;
    }
    constructor(options, contextKeyService) {
        super(options);
        this.contextKeyService = this._register(contextKeyService.createScoped(this.domNode));
        WorkbenchIconSelectBoxFocusContextKey.bindTo(this.contextKeyService);
        this.inputFocusContextKey = WorkbenchIconSelectBoxInputFocusContextKey.bindTo(this.contextKeyService);
        this.inputEmptyContextKey = WorkbenchIconSelectBoxInputEmptyContextKey.bindTo(this.contextKeyService);
        if (this.inputBox) {
            const focusTracker = this._register(dom.trackFocus(this.inputBox.inputElement));
            this._register(focusTracker.onDidFocus(() => this.inputFocusContextKey.set(true)));
            this._register(focusTracker.onDidBlur(() => this.inputFocusContextKey.set(false)));
            this._register(this.inputBox.onDidChange(() => this.inputEmptyContextKey.set(this.inputBox?.value.length === 0)));
        }
    }
    focus() {
        super.focus();
        WorkbenchIconSelectBox_1.focusedWidget = this;
    }
};
WorkbenchIconSelectBox = WorkbenchIconSelectBox_1 = __decorate([
    __param(1, IContextKeyService)
], WorkbenchIconSelectBox);
export { WorkbenchIconSelectBox };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 16 /* KeyCode.UpArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusPreviousRow();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 18 /* KeyCode.DownArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusNextRow();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchIconSelectBoxFocusContextKey, ContextKeyExpr.or(WorkbenchIconSelectBoxInputEmptyContextKey, WorkbenchIconSelectBoxInputFocusContextKey.toNegated())),
    primary: 17 /* KeyCode.RightArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusNext();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchIconSelectBoxFocusContextKey, ContextKeyExpr.or(WorkbenchIconSelectBoxInputEmptyContextKey, WorkbenchIconSelectBoxInputFocusContextKey.toNegated())),
    primary: 15 /* KeyCode.LeftArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusPrevious();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.selectFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 3 /* KeyCode.Enter */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.setSelection(selectBox.getFocus()[0]);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvaWNvblNlbGVjdEJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUF5QixhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUxRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBRXRILE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUFHLElBQUksYUFBYSxDQUFVLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzVHLE1BQU0sQ0FBQyxNQUFNLDBDQUEwQyxHQUFHLElBQUksYUFBYSxDQUFVLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3RILE1BQU0sQ0FBQyxNQUFNLDBDQUEwQyxHQUFHLElBQUksYUFBYSxDQUFVLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO0FBRS9HLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsYUFBYTs7SUFHeEQsTUFBTSxDQUFDLGdCQUFnQjtRQUN0QixPQUFPLHdCQUFzQixDQUFDLGFBQWEsQ0FBQztJQUM3QyxDQUFDO0lBTUQsWUFDQyxPQUE4QixFQUNWLGlCQUFxQztRQUV6RCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENB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