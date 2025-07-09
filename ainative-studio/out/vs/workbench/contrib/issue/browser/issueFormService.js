var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeInnerHtml } from '../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier, ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import product from '../../../../platform/product/common/product.js';
import { AuxiliaryWindowMode, IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import BaseHtml from './issueReporterPage.js';
import { IssueWebReporter } from './issueReporterService.js';
import './media/issueReporter.css';
let IssueFormService = class IssueFormService {
    constructor(instantiationService, auxiliaryWindowService, menuService, contextKeyService, logService, dialogService, hostService) {
        this.instantiationService = instantiationService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.issueReporterWindow = null;
        this.extensionIdentifierSet = new ExtensionIdentifierSet();
        this.arch = '';
        this.release = '';
        this.type = '';
    }
    async openReporter(data) {
        if (this.hasToReload(data)) {
            return;
        }
        await this.openAuxIssueReporter(data);
        if (this.issueReporterWindow) {
            const issueReporter = this.instantiationService.createInstance(IssueWebReporter, false, data, { type: this.type, arch: this.arch, release: this.release }, product, this.issueReporterWindow);
            issueReporter.render();
        }
    }
    async openAuxIssueReporter(data, bounds) {
        let issueReporterBounds = { width: 700, height: 800 };
        // Center Issue Reporter Window based on bounds from native host service
        if (bounds && bounds.x && bounds.y) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            issueReporterBounds = { ...issueReporterBounds, x: centerX - 350, y: centerY - 400 };
        }
        const disposables = new DisposableStore();
        // Auxiliary Window
        const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open({ mode: AuxiliaryWindowMode.Normal, bounds: issueReporterBounds, nativeTitlebar: true, disableFullscreen: true }));
        const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
        if (auxiliaryWindow) {
            await auxiliaryWindow.whenStylesHaveLoaded;
            auxiliaryWindow.window.document.title = 'Issue Reporter';
            auxiliaryWindow.window.document.body.classList.add('issue-reporter-body', 'monaco-workbench', platformClass);
            // custom issue reporter wrapper
            const div = document.createElement('div');
            div.classList.add('monaco-workbench');
            // removes preset monaco-workbench
            auxiliaryWindow.container.remove();
            auxiliaryWindow.window.document.body.appendChild(div);
            safeInnerHtml(div, BaseHtml());
            this.issueReporterWindow = auxiliaryWindow.window;
        }
        else {
            console.error('Failed to open auxiliary window');
            disposables.dispose();
        }
        // handle closing issue reporter
        this.issueReporterWindow?.addEventListener('beforeunload', () => {
            auxiliaryWindow.window.close();
            disposables.dispose();
            this.issueReporterWindow = null;
        });
    }
    async sendReporterMenu(extensionId) {
        const menu = this.menuService.createMenu(MenuId.IssueReporter, this.contextKeyService);
        // render menu and dispose
        const actions = menu.getActions({ renderShortTitle: true }).flatMap(entry => entry[1]);
        for (const action of actions) {
            try {
                if (action.item && 'source' in action.item && action.item.source?.id.toLowerCase() === extensionId.toLowerCase()) {
                    this.extensionIdentifierSet.add(extensionId.toLowerCase());
                    await action.run();
                }
            }
            catch (error) {
                console.error(error);
            }
        }
        if (!this.extensionIdentifierSet.has(extensionId)) {
            // send undefined to indicate no action was taken
            return undefined;
        }
        // we found the extension, now we clean up the menu and remove it from the set. This is to ensure that we do duplicate extension identifiers
        this.extensionIdentifierSet.delete(new ExtensionIdentifier(extensionId));
        menu.dispose();
        const result = this.currentData;
        // reset current data.
        this.currentData = undefined;
        return result ?? undefined;
    }
    //#region used by issue reporter
    async closeReporter() {
        this.issueReporterWindow?.close();
    }
    async reloadWithExtensionsDisabled() {
        if (this.issueReporterWindow) {
            try {
                await this.hostService.reload({ disableExtensions: true });
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async showConfirmCloseDialog() {
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('confirmCloseIssueReporter', "Your input will not be saved. Are you sure you want to close this window?"),
            buttons: [
                {
                    label: localize({ key: 'yes', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
                    run: () => {
                        this.closeReporter();
                        this.issueReporterWindow = null;
                    }
                },
                {
                    label: localize('cancel', "Cancel"),
                    run: () => { }
                }
            ]
        });
    }
    async showClipboardDialog() {
        let result = false;
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('issueReporterWriteToClipboard', "There is too much data to send to GitHub directly. The data will be copied to the clipboard, please paste it into the GitHub issue page that is opened."),
            buttons: [
                {
                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    run: () => { result = true; }
                },
                {
                    label: localize('cancel', "Cancel"),
                    run: () => { result = false; }
                }
            ]
        });
        return result;
    }
    hasToReload(data) {
        if (data.extensionId && this.extensionIdentifierSet.has(data.extensionId)) {
            this.currentData = data;
            this.issueReporterWindow?.focus();
            return true;
        }
        if (this.issueReporterWindow) {
            this.issueReporterWindow.focus();
            return true;
        }
        return false;
    }
};
IssueFormService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IAuxiliaryWindowService),
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, ILogService),
    __param(5, IDialogService),
    __param(6, IHostService)
], IssueFormService);
export { IssueFormService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVGb3JtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9icm93c2VyL2lzc3VlRm9ybVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUM7QUFFckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHVCQUF1QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDbkksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXRFLE9BQU8sUUFBUSxNQUFNLHdCQUF3QixD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