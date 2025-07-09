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
var BrowserDialogHandler_1;
import { localize } from '../../../../nls.js';
import { AbstractDialogHandler } from '../../../../platform/dialogs/common/dialogs.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import Severity from '../../../../base/common/severity.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { fromNow } from '../../../../base/common/date.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MarkdownRenderer, openLinkFromMarkdown } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
let BrowserDialogHandler = class BrowserDialogHandler extends AbstractDialogHandler {
    static { BrowserDialogHandler_1 = this; }
    static { this.ALLOWABLE_COMMANDS = [
        'copy',
        'cut',
        'editor.action.selectAll',
        'editor.action.clipboardCopyAction',
        'editor.action.clipboardCutAction',
        'editor.action.clipboardPasteAction'
    ]; }
    constructor(logService, layoutService, keybindingService, instantiationService, productService, clipboardService, openerService) {
        super();
        this.logService = logService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.productService = productService;
        this.clipboardService = clipboardService;
        this.openerService = openerService;
        this.markdownRenderer = instantiationService.createInstance(MarkdownRenderer, {});
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { button, checkboxChecked } = await this.doShow(prompt.type, prompt.message, buttons, prompt.detail, prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */, prompt.checkbox, undefined, typeof prompt?.custom === 'object' ? prompt.custom : undefined);
        return this.getPromptResult(prompt, button, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { button, checkboxChecked } = await this.doShow(confirmation.type ?? 'question', confirmation.message, buttons, confirmation.detail, buttons.length - 1, confirmation.checkbox, undefined, typeof confirmation?.custom === 'object' ? confirmation.custom : undefined);
        return { confirmed: button === 0, checkboxChecked };
    }
    async input(input) {
        this.logService.trace('DialogService#input', input.message);
        const buttons = this.getInputButtons(input);
        const { button, checkboxChecked, values } = await this.doShow(input.type ?? 'question', input.message, buttons, input.detail, buttons.length - 1, input?.checkbox, input.inputs, typeof input.custom === 'object' ? input.custom : undefined);
        return { confirmed: button === 0, checkboxChecked, values };
    }
    async about() {
        const detailString = (useAgo) => {
            return localize('aboutDetail', "Version: {0}\nCommit: {1}\nDate: {2}\nBrowser: {3}", this.productService.version || 'Unknown', this.productService.commit || 'Unknown', this.productService.date ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}` : 'Unknown', navigator.userAgent);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { button } = await this.doShow(Severity.Info, this.productService.nameLong, [
            localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
            localize('ok', "OK")
        ], detail, 1);
        if (button === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
    async doShow(type, message, buttons, detail, cancelId, checkbox, inputs, customOptions) {
        const dialogDisposables = new DisposableStore();
        const renderBody = customOptions ? (parent) => {
            parent.classList.add(...(customOptions.classes || []));
            customOptions.markdownDetails?.forEach(markdownDetail => {
                const result = this.markdownRenderer.render(markdownDetail.markdown, {
                    actionHandler: {
                        callback: link => {
                            if (markdownDetail.dismissOnLinkClick) {
                                dialog.dispose();
                            }
                            return openLinkFromMarkdown(this.openerService, link, markdownDetail.markdown.isTrusted, true /* skip URL validation to prevent another dialog from showing which is unsupported */);
                        },
                        disposables: dialogDisposables
                    }
                });
                parent.appendChild(result.element);
                result.element.classList.add(...(markdownDetail.classes || []));
                dialogDisposables.add(result);
            });
        } : undefined;
        const dialog = new Dialog(this.layoutService.activeContainer, message, buttons, createWorkbenchDialogOptions({
            detail,
            cancelId,
            type: this.getDialogType(type),
            renderBody,
            icon: customOptions?.icon,
            disableCloseAction: customOptions?.disableCloseAction,
            buttonDetails: customOptions?.buttonDetails,
            checkboxLabel: checkbox?.label,
            checkboxChecked: checkbox?.checked,
            inputs
        }, this.keybindingService, this.layoutService, BrowserDialogHandler_1.ALLOWABLE_COMMANDS));
        dialogDisposables.add(dialog);
        const result = await dialog.show();
        dialogDisposables.dispose();
        return result;
    }
};
BrowserDialogHandler = BrowserDialogHandler_1 = __decorate([
    __param(0, ILogService),
    __param(1, ILayoutService),
    __param(2, IKeybindingService),
    __param(3, IInstantiationService),
    __param(4, IProductService),
    __param(5, IClipboardService),
    __param(6, IOpenerService)
], BrowserDialogHandler);
export { BrowserDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9kaWFsb2dzL2RpYWxvZ0hhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQTRHLHFCQUFxQixFQUEyQyxNQUFNLGdEQUFnRCxDQUFDO0FBQzFPLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBaUIsTUFBTSw4Q0FBOEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN4SSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFdkYs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