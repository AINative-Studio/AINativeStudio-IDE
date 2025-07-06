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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2RpYWxvZ3MvZGlhbG9nSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBNEcscUJBQXFCLEVBQTJDLE1BQU0sZ0RBQWdELENBQUM7QUFDMU8sT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFpQixNQUFNLDhDQUE4QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3hJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV2RixJ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