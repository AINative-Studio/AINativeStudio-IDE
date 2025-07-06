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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2VsZWN0cm9uLXNhbmRib3gvd2Vidmlld0VsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxD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