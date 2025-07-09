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
import electron from 'electron';
import { Queue } from '../../../base/common/async.js';
import { hash } from '../../../base/common/hash.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { normalizeNFC } from '../../../base/common/normalization.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { massageMessageBoxOptions } from '../common/dialogs.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { WORKSPACE_FILTER } from '../../workspace/common/workspace.js';
export const IDialogMainService = createDecorator('dialogMainService');
let DialogMainService = class DialogMainService {
    constructor(logService, productService) {
        this.logService = logService;
        this.productService = productService;
        this.windowFileDialogLocks = new Map();
        this.windowDialogQueues = new Map();
        this.noWindowDialogueQueue = new Queue();
    }
    pickFileFolder(options, window) {
        return this.doPick({ ...options, pickFolders: true, pickFiles: true, title: localize('open', "Open") }, window);
    }
    pickFolder(options, window) {
        return this.doPick({ ...options, pickFolders: true, title: localize('openFolder', "Open Folder") }, window);
    }
    pickFile(options, window) {
        return this.doPick({ ...options, pickFiles: true, title: localize('openFile', "Open File") }, window);
    }
    pickWorkspace(options, window) {
        const title = localize('openWorkspaceTitle', "Open Workspace from File");
        const buttonLabel = mnemonicButtonLabel(localize({ key: 'openWorkspace', comment: ['&& denotes a mnemonic'] }, "&&Open")).withMnemonic;
        const filters = WORKSPACE_FILTER;
        return this.doPick({ ...options, pickFiles: true, title, filters, buttonLabel }, window);
    }
    async doPick(options, window) {
        // Ensure dialog options
        const dialogOptions = {
            title: options.title,
            buttonLabel: options.buttonLabel,
            filters: options.filters,
            defaultPath: options.defaultPath
        };
        // Ensure properties
        if (typeof options.pickFiles === 'boolean' || typeof options.pickFolders === 'boolean') {
            dialogOptions.properties = undefined; // let it override based on the booleans
            if (options.pickFiles && options.pickFolders) {
                dialogOptions.properties = ['multiSelections', 'openDirectory', 'openFile', 'createDirectory'];
            }
        }
        if (!dialogOptions.properties) {
            dialogOptions.properties = ['multiSelections', options.pickFolders ? 'openDirectory' : 'openFile', 'createDirectory'];
        }
        if (isMacintosh) {
            dialogOptions.properties.push('treatPackageAsDirectory'); // always drill into .app files
        }
        // Show Dialog
        const result = await this.showOpenDialog(dialogOptions, (window || electron.BrowserWindow.getFocusedWindow()) ?? undefined);
        if (result && result.filePaths && result.filePaths.length > 0) {
            return result.filePaths;
        }
        return undefined;
    }
    getWindowDialogQueue(window) {
        // Queue message box requests per window so that one can show
        // after the other.
        if (window) {
            let windowDialogQueue = this.windowDialogQueues.get(window.id);
            if (!windowDialogQueue) {
                windowDialogQueue = new Queue();
                this.windowDialogQueues.set(window.id, windowDialogQueue);
            }
            return windowDialogQueue;
        }
        else {
            return this.noWindowDialogueQueue;
        }
    }
    showMessageBox(rawOptions, window) {
        return this.getWindowDialogQueue(window).queue(async () => {
            const { options, buttonIndeces } = massageMessageBoxOptions(rawOptions, this.productService);
            let result = undefined;
            if (window) {
                result = await electron.dialog.showMessageBox(window, options);
            }
            else {
                result = await electron.dialog.showMessageBox(options);
            }
            return {
                response: buttonIndeces[result.response],
                checkboxChecked: result.checkboxChecked
            };
        });
    }
    async showSaveDialog(options, window) {
        // Prevent duplicates of the same dialog queueing at the same time
        const fileDialogLock = this.acquireFileDialogLock(options, window);
        if (!fileDialogLock) {
            this.logService.error('[DialogMainService]: file save dialog is already or will be showing for the window with the same configuration');
            return { canceled: true, filePath: '' };
        }
        try {
            return await this.getWindowDialogQueue(window).queue(async () => {
                let result;
                if (window) {
                    result = await electron.dialog.showSaveDialog(window, options);
                }
                else {
                    result = await electron.dialog.showSaveDialog(options);
                }
                result.filePath = this.normalizePath(result.filePath);
                return result;
            });
        }
        finally {
            dispose(fileDialogLock);
        }
    }
    normalizePath(path) {
        if (path && isMacintosh) {
            path = normalizeNFC(path); // macOS only: normalize paths to NFC form
        }
        return path;
    }
    normalizePaths(paths) {
        return paths.map(path => this.normalizePath(path));
    }
    async showOpenDialog(options, window) {
        // Ensure the path exists (if provided)
        if (options.defaultPath) {
            const pathExists = await Promises.exists(options.defaultPath);
            if (!pathExists) {
                options.defaultPath = undefined;
            }
        }
        // Prevent duplicates of the same dialog queueing at the same time
        const fileDialogLock = this.acquireFileDialogLock(options, window);
        if (!fileDialogLock) {
            this.logService.error('[DialogMainService]: file open dialog is already or will be showing for the window with the same configuration');
            return { canceled: true, filePaths: [] };
        }
        try {
            return await this.getWindowDialogQueue(window).queue(async () => {
                let result;
                if (window) {
                    result = await electron.dialog.showOpenDialog(window, options);
                }
                else {
                    result = await electron.dialog.showOpenDialog(options);
                }
                result.filePaths = this.normalizePaths(result.filePaths);
                return result;
            });
        }
        finally {
            dispose(fileDialogLock);
        }
    }
    acquireFileDialogLock(options, window) {
        // If no window is provided, allow as many dialogs as
        // needed since we consider them not modal per window
        if (!window) {
            return Disposable.None;
        }
        // If a window is provided, only allow a single dialog
        // at the same time because dialogs are modal and we
        // do not want to open one dialog after the other
        // (https://github.com/microsoft/vscode/issues/114432)
        // we figure this out by `hashing` the configuration
        // options for the dialog to prevent duplicates
        this.logService.trace('[DialogMainService]: request to acquire file dialog lock', options);
        let windowFileDialogLocks = this.windowFileDialogLocks.get(window.id);
        if (!windowFileDialogLocks) {
            windowFileDialogLocks = new Set();
            this.windowFileDialogLocks.set(window.id, windowFileDialogLocks);
        }
        const optionsHash = hash(options);
        if (windowFileDialogLocks.has(optionsHash)) {
            return undefined; // prevent duplicates, return
        }
        this.logService.trace('[DialogMainService]: new file dialog lock created', options);
        windowFileDialogLocks.add(optionsHash);
        return toDisposable(() => {
            this.logService.trace('[DialogMainService]: file dialog lock disposed', options);
            windowFileDialogLocks?.delete(optionsHash);
            // If the window has no more dialog locks, delete it from the set of locks
            if (windowFileDialogLocks?.size === 0) {
                this.windowFileDialogLocks.delete(window.id);
            }
        });
    }
};
DialogMainService = __decorate([
    __param(0, ILogService),
    __param(1, IProductService)
], DialogMainService);
export { DialogMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhbG9ncy9lbGVjdHJvbi1tYWluL2RpYWxvZ01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQTRCLHdCQUF3QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdkUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixt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