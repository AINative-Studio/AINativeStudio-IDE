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
import { localize } from '../../../../nls.js';
import { fromNow } from '../../../../base/common/date.js';
import { isLinuxSnap } from '../../../../base/common/platform.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { AbstractDialogHandler } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let NativeDialogHandler = class NativeDialogHandler extends AbstractDialogHandler {
    constructor(logService, nativeHostService, productService, clipboardService) {
        super();
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.productService = productService;
        this.clipboardService = clipboardService;
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(prompt.type),
            title: prompt.title,
            message: prompt.message,
            detail: prompt.detail,
            buttons,
            cancelId: prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */,
            checkboxLabel: prompt.checkbox?.label,
            checkboxChecked: prompt.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        return this.getPromptResult(prompt, response, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(confirmation.type) ?? 'question',
            title: confirmation.title,
            message: confirmation.message,
            detail: confirmation.detail,
            buttons,
            cancelId: buttons.length - 1,
            checkboxLabel: confirmation.checkbox?.label,
            checkboxChecked: confirmation.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        return { confirmed: response === 0, checkboxChecked };
    }
    input() {
        throw new Error('Unsupported'); // we have no native API for password dialogs in Electron
    }
    async about() {
        let version = this.productService.version;
        if (this.productService.target) {
            version = `${version} (${this.productService.target} setup)`;
        }
        else if (this.productService.darwinUniversalAssetId) {
            version = `${version} (Universal)`;
        }
        const osProps = await this.nativeHostService.getOSProperties();
        const detailString = (useAgo) => {
            return localize({ key: 'aboutDetail', comment: ['Electron, Chromium, Node.js and V8 are product names that need no translation'] }, "VSCode Version: {0}\nVoid Version: {1}\nCommit: {2}\nDate: {3}\nElectron: {4}\nElectronBuildId: {5}\nChromium: {6}\nNode.js: {7}\nV8: {8}\nOS: {9}", version, this.productService.voidVersion || 'Unknown', // Void added this
            this.productService.commit || 'Unknown', this.productService.date ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}` : 'Unknown', process.versions['electron'], process.versions['microsoft-build'], process.versions['chrome'], process.versions['node'], process.versions['v8'], `${osProps.type} ${osProps.arch} ${osProps.release}${isLinuxSnap ? ' snap' : ''}`);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { response } = await this.nativeHostService.showMessageBox({
            type: 'info',
            message: this.productService.nameLong,
            detail: `\n${detail}`,
            buttons: [
                localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
                localize('okButton', "OK")
            ],
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        if (response === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
};
NativeDialogHandler = __decorate([
    __param(0, ILogService),
    __param(1, INativeHostService),
    __param(2, IProductService),
    __param(3, IClipboardService)
], NativeDialogHandler);
export { NativeDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9wYXJ0cy9kaWFsb2dzL2RpYWxvZ0hhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFtRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLHFCQUFxQjtJQUU3RCxZQUMrQixVQUF1QixFQUNoQixpQkFBcUMsRUFDeEMsY0FBK0IsRUFDN0IsZ0JBQW1DO1FBRXZFLEtBQUssRUFBRSxDQUFDO1FBTHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDaEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDN0IscUJBQWdC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