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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WebviewThemeDataProvider } from './themeing.js';
import { WebviewElement } from './webviewElement.js';
import { OverlayWebview } from './overlayWebview.js';
let WebviewService = class WebviewService extends Disposable {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._webviews = new Set();
        this._onDidChangeActiveWebview = this._register(new Emitter());
        this.onDidChangeActiveWebview = this._onDidChangeActiveWebview.event;
        this._webviewThemeDataProvider = this._instantiationService.createInstance(WebviewThemeDataProvider);
    }
    get activeWebview() { return this._activeWebview; }
    _updateActiveWebview(value) {
        if (value !== this._activeWebview) {
            this._activeWebview = value;
            this._onDidChangeActiveWebview.fire(value);
        }
    }
    get webviews() {
        return this._webviews.values();
    }
    createWebviewElement(initInfo) {
        const webview = this._instantiationService.createInstance(WebviewElement, initInfo, this._webviewThemeDataProvider);
        this.registerNewWebview(webview);
        return webview;
    }
    createWebviewOverlay(initInfo) {
        const webview = this._instantiationService.createInstance(OverlayWebview, initInfo);
        this.registerNewWebview(webview);
        return webview;
    }
    registerNewWebview(webview) {
        this._webviews.add(webview);
        const store = new DisposableStore();
        store.add(webview.onDidFocus(() => {
            this._updateActiveWebview(webview);
        }));
        const onBlur = () => {
            if (this._activeWebview === webview) {
                this._updateActiveWebview(undefined);
            }
        };
        store.add(webview.onDidBlur(onBlur));
        store.add(webview.onDidDispose(() => {
            onBlur();
            store.dispose();
            this._webviews.delete(webview);
        }));
    }
};
WebviewService = __decorate([
    __param(0, IInstantiationService)
], WebviewService);
export { WebviewService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3dlYnZpZXdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUV6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTlDLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBSzdDLFlBQ3dCLHFCQUErRDtRQUV0RixLQUFLLEVBQUUsQ0FBQztRQUZrQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBaUIvRSxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVksQ0FBQztRQU12Qiw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QixDQUFDLENBQUM7UUFDakYsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztRQXJCL0UsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBSUQsSUFBVyxhQUFhLEtBQUssT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUVsRCxvQkFBb0IsQ0FBQyxLQUEyQjtRQUN2RCxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDNUIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUlELElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUtELG9CQUFvQixDQUFDLFFBQXlCO1FBQzdDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNwSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQXlCO1FBQzdDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqQyxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRVMsa0JBQWtCLENBQUMsT0FBaUI7UUFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ25DLE1BQU0sRUFBRSxDQUFDO1lBQ1QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQTtBQWxFWSxjQUFjO0lBTXhCLFdBQUEscUJBQXFCLENBQUE7R0FOWCxjQUFjLENBa0UxQiJ9