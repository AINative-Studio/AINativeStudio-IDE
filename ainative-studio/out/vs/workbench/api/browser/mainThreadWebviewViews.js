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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { reviveWebviewExtension } from './mainThreadWebviews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { IWebviewViewService } from '../../contrib/webviewView/browser/webviewViewService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
let MainThreadWebviewsViews = class MainThreadWebviewsViews extends Disposable {
    constructor(context, mainThreadWebviews, _telemetryService, _webviewViewService) {
        super();
        this.mainThreadWebviews = mainThreadWebviews;
        this._telemetryService = _telemetryService;
        this._webviewViewService = _webviewViewService;
        this._webviewViews = this._register(new DisposableMap());
        this._webviewViewProviders = this._register(new DisposableMap());
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewViews);
    }
    $setWebviewViewTitle(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.title = value;
    }
    $setWebviewViewDescription(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.description = value;
    }
    $setWebviewViewBadge(handle, badge) {
        const webviewView = this.getWebviewView(handle);
        webviewView.badge = badge;
    }
    $show(handle, preserveFocus) {
        const webviewView = this.getWebviewView(handle);
        webviewView.show(preserveFocus);
    }
    $registerWebviewViewProvider(extensionData, viewType, options) {
        if (this._webviewViewProviders.has(viewType)) {
            throw new Error(`View provider for ${viewType} already registered`);
        }
        const extension = reviveWebviewExtension(extensionData);
        const registration = this._webviewViewService.register(viewType, {
            resolve: async (webviewView, cancellation) => {
                const handle = generateUuid();
                this._webviewViews.set(handle, webviewView);
                this.mainThreadWebviews.addWebview(handle, webviewView.webview, { serializeBuffersForPostMessage: options.serializeBuffersForPostMessage });
                let state = undefined;
                if (webviewView.webview.state) {
                    try {
                        state = JSON.parse(webviewView.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewView.webview.state);
                    }
                }
                webviewView.webview.extension = extension;
                if (options) {
                    webviewView.webview.options = options;
                }
                webviewView.onDidChangeVisibility(visible => {
                    this._proxy.$onDidChangeWebviewViewVisibility(handle, visible);
                });
                webviewView.onDispose(() => {
                    this._proxy.$disposeWebviewView(handle);
                    this._webviewViews.deleteAndDispose(handle);
                });
                this._telemetryService.publicLog2('webviews:createWebviewView', {
                    extensionId: extension.id.value,
                    id: viewType,
                });
                try {
                    await this._proxy.$resolveWebviewView(handle, viewType, webviewView.title, state, cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewView.webview.setHtml(this.mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            }
        });
        this._webviewViewProviders.set(viewType, registration);
    }
    $unregisterWebviewViewProvider(viewType) {
        if (!this._webviewViewProviders.has(viewType)) {
            throw new Error(`No view provider for ${viewType} registered`);
        }
        this._webviewViewProviders.deleteAndDispose(viewType);
    }
    getWebviewView(handle) {
        const webviewView = this._webviewViews.get(handle);
        if (!webviewView) {
            throw new Error('unknown webview view');
        }
        return webviewView;
    }
};
MainThreadWebviewsViews = __decorate([
    __param(2, ITelemetryService),
    __param(3, IWebviewViewService)
], MainThreadWebviewsViews);
export { MainThreadWebviewsViews };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdlYnZpZXdWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQXNCLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckYsT0FBTyxLQUFLLGVBQWUsTUFBTSwrQkFBK0IsQ0FBQztBQUVqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQWUsTUFBTSx5REFBeUQsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUk3RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFPdEQsWUFDQyxPQUF3QixFQUNQLGtCQUFzQyxFQUNwQyxpQkFBcUQsRUFDbkQsbUJBQXlEO1FBRTlFLEtBQUssRUFBRSxDQUFDO1FBSlMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2xDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFQOUQsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1QixDQUFDLENBQUM7UUFDekUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBVSxDQUFDLENBQUM7UUFV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