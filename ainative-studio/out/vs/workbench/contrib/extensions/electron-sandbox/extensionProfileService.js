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
import { disposableWindowInterval } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { ProfileSessionState } from './runtimeExtensionsEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionHostProfiler } from '../../../services/extensions/electron-sandbox/extensionHostProfiler.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
let ExtensionHostProfileService = class ExtensionHostProfileService extends Disposable {
    get state() { return this._state; }
    get lastProfile() { return this._profile; }
    constructor(_extensionService, _editorService, _instantiationService, _nativeHostService, _dialogService, _statusbarService, _productService) {
        super();
        this._extensionService = _extensionService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._nativeHostService = _nativeHostService;
        this._dialogService = _dialogService;
        this._statusbarService = _statusbarService;
        this._productService = _productService;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this._onDidChangeLastProfile = this._register(new Emitter());
        this.onDidChangeLastProfile = this._onDidChangeLastProfile.event;
        this._unresponsiveProfiles = new ExtensionIdentifierMap();
        this._state = ProfileSessionState.None;
        this.profilingStatusBarIndicatorLabelUpdater = this._register(new MutableDisposable());
        this._profile = null;
        this._profileSession = null;
        this._setState(ProfileSessionState.None);
        CommandsRegistry.registerCommand('workbench.action.extensionHostProfiler.stop', () => {
            this.stopProfiling();
            this._editorService.openEditor(RuntimeExtensionsInput.instance, { pinned: true });
        });
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        if (this._state === ProfileSessionState.Running) {
            this.updateProfilingStatusBarIndicator(true);
        }
        else if (this._state === ProfileSessionState.Stopping) {
            this.updateProfilingStatusBarIndicator(false);
        }
        this._onDidChangeState.fire(undefined);
    }
    updateProfilingStatusBarIndicator(visible) {
        this.profilingStatusBarIndicatorLabelUpdater.clear();
        if (visible) {
            const indicator = {
                name: nls.localize('status.profiler', "Extension Profiler"),
                text: nls.localize('profilingExtensionHost', "Profiling Extension Host"),
                showProgress: true,
                ariaLabel: nls.localize('profilingExtensionHost', "Profiling Extension Host"),
                tooltip: nls.localize('selectAndStartDebug', "Click to stop profiling."),
                command: 'workbench.action.extensionHostProfiler.stop'
            };
            const timeStarted = Date.now();
            const handle = disposableWindowInterval(mainWindow, () => {
                this.profilingStatusBarIndicator?.update({ ...indicator, text: nls.localize('profilingExtensionHostTime', "Profiling Extension Host ({0} sec)", Math.round((new Date().getTime() - timeStarted) / 1000)), });
            }, 1000);
            this.profilingStatusBarIndicatorLabelUpdater.value = handle;
            if (!this.profilingStatusBarIndicator) {
                this.profilingStatusBarIndicator = this._statusbarService.addEntry(indicator, 'status.profiler', 1 /* StatusbarAlignment.RIGHT */);
            }
            else {
                this.profilingStatusBarIndicator.update(indicator);
            }
        }
        else {
            if (this.profilingStatusBarIndicator) {
                this.profilingStatusBarIndicator.dispose();
                this.profilingStatusBarIndicator = undefined;
            }
        }
    }
    async startProfiling() {
        if (this._state !== ProfileSessionState.None) {
            return null;
        }
        const inspectPorts = await this._extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, true);
        if (inspectPorts.length === 0) {
            return this._dialogService.confirm({
                type: 'info',
                message: nls.localize('restart1', "Profile Extensions"),
                detail: nls.localize('restart2', "In order to profile extensions a restart is required. Do you want to restart '{0}' now?", this._productService.nameLong),
                primaryButton: nls.localize({ key: 'restart3', comment: ['&& denotes a mnemonic'] }, "&&Restart")
            }).then(res => {
                if (res.confirmed) {
                    this._nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
            });
        }
        if (inspectPorts.length > 1) {
            // TODO
            console.warn(`There are multiple extension hosts available for profiling. Picking the first one...`);
        }
        this._setState(ProfileSessionState.Starting);
        return this._instantiationService.createInstance(ExtensionHostProfiler, inspectPorts[0].host, inspectPorts[0].port).start().then((value) => {
            this._profileSession = value;
            this._setState(ProfileSessionState.Running);
        }, (err) => {
            onUnexpectedError(err);
            this._setState(ProfileSessionState.None);
        });
    }
    stopProfiling() {
        if (this._state !== ProfileSessionState.Running || !this._profileSession) {
            return;
        }
        this._setState(ProfileSessionState.Stopping);
        this._profileSession.stop().then((result) => {
            this._setLastProfile(result);
            this._setState(ProfileSessionState.None);
        }, (err) => {
            onUnexpectedError(err);
            this._setState(ProfileSessionState.None);
        });
        this._profileSession = null;
    }
    _setLastProfile(profile) {
        this._profile = profile;
        this.lastProfileSavedTo = undefined;
        this._onDidChangeLastProfile.fire(undefined);
    }
    getUnresponsiveProfile(extensionId) {
        return this._unresponsiveProfiles.get(extensionId);
    }
    setUnresponsiveProfile(extensionId, profile) {
        this._unresponsiveProfiles.set(extensionId, profile);
        this._setLastProfile(profile);
    }
};
ExtensionHostProfileService = __decorate([
    __param(0, IExtensionService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, INativeHostService),
    __param(4, IDialogService),
    __param(5, IStatusbarService),
    __param(6, IProductService)
], ExtensionHostProfileService);
export { ExtensionHostProfileService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUHJvZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvblByb2ZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQXVCLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8s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