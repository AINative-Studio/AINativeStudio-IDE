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
import { Delayer } from '../../../../base/common/async.js';
import { Schemas } from '../../../../base/common/network.js';
import { consumeStream } from '../../../../base/common/stream.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { WebviewElement } from '../browser/webviewElement.js';
import { WindowIgnoreMenuShortcutsManager } from './windowIgnoreMenuShortcutsManager.js';
/**
 * Webview backed by an iframe but that uses Electron APIs to power the webview.
 */
let ElectronWebviewElement = class ElectronWebviewElement extends WebviewElement {
    get platform() { return 'electron'; }
    constructor(initInfo, webviewThemeDataProvider, contextMenuService, tunnelService, fileService, environmentService, remoteAuthorityResolverService, logService, configurationService, mainProcessService, notificationService, _nativeHostService, instantiationService, accessibilityService) {
        super(initInfo, webviewThemeDataProvider, configurationService, contextMenuService, notificationService, environmentService, fileService, logService, remoteAuthorityResolverService, tunnelService, instantiationService, accessibilityService);
        this._nativeHostService = _nativeHostService;
        this._findStarted = false;
        this._iframeDelayer = this._register(new Delayer(200));
        this._webviewKeyboardHandler = new WindowIgnoreMenuShortcutsManager(configurationService, mainProcessService, _nativeHostService);
        this._webviewMainService = ProxyChannel.toService(mainProcessService.getChannel('webview'));
        if (initInfo.options.enableFindWidget) {
            this._register(this.onDidHtmlChange((newContent) => {
                if (this._findStarted && this._cachedHtmlContent !== newContent) {
                    this.stopFind(false);
                    this._cachedHtmlContent = newContent;
                }
            }));
            this._register(this._webviewMainService.onFoundInFrame((result) => {
                this._hasFindResult.fire(result.matches > 0);
            }));
        }
    }
    dispose() {
        // Make sure keyboard handler knows it closed (#71800)
        this._webviewKeyboardHandler.didBlur();
        super.dispose();
    }
    webviewContentEndpoint(iframeId) {
        return `${Schemas.vscodeWebview}://${iframeId}`;
    }
    streamToBuffer(stream) {
        // Join buffers from stream without using the Node.js backing pool.
        // This lets us transfer the resulting buffer to the webview.
        return consumeStream(stream, (buffers) => {
            const totalLength = buffers.reduce((prev, curr) => prev + curr.byteLength, 0);
            const ret = new ArrayBuffer(totalLength);
            const view = new Uint8Array(ret);
            let offset = 0;
            for (const element of buffers) {
                view.set(element.buffer, offset);
                offset += element.byteLength;
            }
            return ret;
        });
    }
    /**
     * Webviews expose a stateful find API.
     * Successive calls to find will move forward or backward through onFindResults
     * depending on the supplied options.
     *
     * @param value The string to search for. Empty strings are ignored.
     */
    find(value, previous) {
        if (!this.element) {
            return;
        }
        if (!this._findStarted) {
            this.updateFind(value);
        }
        else {
            // continuing the find, so set findNext to false
            const options = { forward: !previous, findNext: false, matchCase: false };
            this._webviewMainService.findInFrame({ windowId: this._nativeHostService.windowId }, this.id, value, options);
        }
    }
    updateFind(value) {
        if (!value || !this.element) {
            return;
        }
        // FindNext must be true for a first request
        const options = {
            forward: true,
            findNext: true,
            matchCase: false
        };
        this._iframeDelayer.trigger(() => {
            this._findStarted = true;
            this._webviewMainService.findInFrame({ windowId: this._nativeHostService.windowId }, this.id, value, options);
        });
    }
    stopFind(keepSelection) {
        if (!this.element) {
            return;
        }
        this._iframeDelayer.cancel();
        this._findStarted = false;
        this._webviewMainService.stopFindInFrame({ windowId: this._nativeHostService.windowId }, this.id, {
            keepSelection
        });
        this._onDidStopFind.fire();
    }
    handleFocusChange(isFocused) {
        super.handleFocusChange(isFocused);
        if (isFocused) {
            this._webviewKeyboardHandler.didFocus();
        }
        else {
            this._webviewKeyboardHandler.didBlur();
        }
    }
};
ElectronWebviewElement = __decorate([
    __param(2, IContextMenuService),
    __param(3, ITunnelService),
    __param(4, IFileService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IRemoteAuthorityResolverService),
    __param(7, ILogService),
    __param(8, IConfigurationService),
    __param(9, IMainProcessService),
    __param(10, INotificationService),
    __param(11, INativeHostService),
    __param(12, IInstantiationService),
    __param(13, IAccessibilityService)
], ElectronWebviewElement);
export { ElectronWebviewElement };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9lbGVjdHJvbi1zYW5kYm94L3dlYnZpZXdFbGVtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMs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