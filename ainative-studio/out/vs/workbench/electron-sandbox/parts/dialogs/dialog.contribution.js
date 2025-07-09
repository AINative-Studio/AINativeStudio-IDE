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
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { BrowserDialogHandler } from '../../../browser/parts/dialogs/dialogHandler.js';
import { NativeDialogHandler } from './dialogHandler.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let DialogHandlerContribution = class DialogHandlerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.dialogHandler'; }
    constructor(configurationService, dialogService, logService, layoutService, keybindingService, instantiationService, productService, clipboardService, nativeHostService, openerService) {
        super();
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.browserImpl = new Lazy(() => new BrowserDialogHandler(logService, layoutService, keybindingService, instantiationService, productService, clipboardService, openerService));
        this.nativeImpl = new Lazy(() => new NativeDialogHandler(logService, nativeHostService, productService, clipboardService));
        this.model = this.dialogService.model;
        this._register(this.model.onWillShowDialog(() => {
            if (!this.currentDialog) {
                this.processDialogs();
            }
        }));
        this.processDialogs();
    }
    async processDialogs() {
        while (this.model.dialogs.length) {
            this.currentDialog = this.model.dialogs[0];
            let result = undefined;
            try {
                // Confirm
                if (this.currentDialog.args.confirmArgs) {
                    const args = this.currentDialog.args.confirmArgs;
                    result = (this.useCustomDialog || args?.confirmation.custom) ?
                        await this.browserImpl.value.confirm(args.confirmation) :
                        await this.nativeImpl.value.confirm(args.confirmation);
                }
                // Input (custom only)
                else if (this.currentDialog.args.inputArgs) {
                    const args = this.currentDialog.args.inputArgs;
                    result = await this.browserImpl.value.input(args.input);
                }
                // Prompt
                else if (this.currentDialog.args.promptArgs) {
                    const args = this.currentDialog.args.promptArgs;
                    result = (this.useCustomDialog || args?.prompt.custom) ?
                        await this.browserImpl.value.prompt(args.prompt) :
                        await this.nativeImpl.value.prompt(args.prompt);
                }
                // About
                else {
                    if (this.useCustomDialog) {
                        await this.browserImpl.value.about();
                    }
                    else {
                        await this.nativeImpl.value.about();
                    }
                }
            }
            catch (error) {
                result = error;
            }
            this.currentDialog.close(result);
            this.currentDialog = undefined;
        }
    }
    get useCustomDialog() {
        return this.configurationService.getValue('window.dialogStyle') === 'custom';
    }
};
DialogHandlerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IDialogService),
    __param(2, ILogService),
    __param(3, ILayoutService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IProductService),
    __param(7, IClipboardService),
    __param(8, INativeHostService),
    __param(9, IOpenerService)
], DialogHandlerContribution);
export { DialogHandlerContribution };
registerWorkbenchContribution2(DialogHandlerContribution.ID, DialogHandlerContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9wYXJ0cy9kaWFsb2dzL2RpYWxvZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFpQyxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFMUgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1B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