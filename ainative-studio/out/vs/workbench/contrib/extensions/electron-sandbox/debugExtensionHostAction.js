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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IDebugService } from '../../debug/common/debug.js';
import { RuntimeExtensionsEditor } from './runtimeExtensionsEditor.js';
export class DebugExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.debugExtensionHost',
            title: { value: nls.localize('debugExtensionHost', "Start Debugging Extension Host In New Window"), original: 'Start Debugging Extension Host In New Window' },
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
            menu: {
                id: MenuId.EditorTitle,
                when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID),
                group: 'navigation',
            }
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const extensionService = accessor.get(IExtensionService);
        const productService = accessor.get(IProductService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, false).then(async (inspectPorts) => {
            if (inspectPorts.length === 0) {
                const res = await dialogService.confirm({
                    message: nls.localize('restart1', "Debug Extensions"),
                    detail: nls.localize('restart2', "In order to debug extensions a restart is required. Do you want to restart '{0}' now?", productService.nameLong),
                    primaryButton: nls.localize({ key: 'restart3', comment: ['&& denotes a mnemonic'] }, "&&Restart")
                });
                if (res.confirmed) {
                    await nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
                return;
            }
            if (inspectPorts.length > 1) {
                // TODO
                console.warn(`There are multiple extension hosts available for debugging. Picking the first one...`);
            }
            const s = instantiationService.createInstance(Storage);
            s.storeDebugOnNewWindow(inspectPorts[0].port);
            hostService.openWindow();
        });
    }
}
let Storage = class Storage {
    constructor(_storageService) {
        this._storageService = _storageService;
    }
    storeDebugOnNewWindow(targetPort) {
        this._storageService.store('debugExtensionHost.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteDebugPortIfSet() {
        const port = this._storageService.getNumber('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
};
Storage = __decorate([
    __param(0, IStorageService)
], Storage);
let DebugExtensionsContribution = class DebugExtensionsContribution extends Disposable {
    constructor(_debugService, _instantiationService, _progressService) {
        super();
        this._debugService = _debugService;
        this._instantiationService = _instantiationService;
        const storage = this._instantiationService.createInstance(Storage);
        const port = storage.getAndDeleteDebugPortIfSet();
        if (port !== undefined) {
            _progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize('debugExtensionHost.progress', "Attaching Debugger To Extension Host"),
            }, async (p) => {
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                await this._debugService.startDebugging(undefined, {
                    type: 'node',
                    name: nls.localize('debugExtensionHost.launch.name', "Attach Extension Host"),
                    request: 'attach',
                    port,
                    trace: true,
                    // resolve source maps everywhere:
                    resolveSourceMapLocations: null,
                    // announces sources eagerly for the loaded scripts view:
                    eagerSources: true,
                    // source maps of published VS Code are on the CDN and can take a while to load
                    timeouts: {
                        sourceMapMinPause: 30_000,
                        sourceMapCumulativePause: 300_000,
                    },
                });
            });
        }
    }
};
DebugExtensionsContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IInstantiationService),
    __param(2, IProgressService)
], DebugExtensionsContribution);
export { DebugExtensionsContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHRlbnNpb25Ib3N0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2RlYnVnRXh0ZW5zaW9uSG9zdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFB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