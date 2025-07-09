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
import { getWindow } from '../../../base/browser/dom.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { reviveWebviewContentOptions } from './mainThreadWebviews.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IWebviewService } from '../../contrib/webview/browser/webview.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
// todo@jrieken move these things back into something like contrib/insets
class EditorWebviewZone {
    // suppressMouseDown?: boolean | undefined;
    // heightInPx?: number | undefined;
    // minWidthInPx?: number | undefined;
    // marginDomNode?: HTMLElement | null | undefined;
    // onDomNodeTop?: ((top: number) => void) | undefined;
    // onComputedHeight?: ((height: number) => void) | undefined;
    constructor(editor, line, height, webview) {
        this.editor = editor;
        this.line = line;
        this.height = height;
        this.webview = webview;
        this.domNode = document.createElement('div');
        this.domNode.style.zIndex = '10'; // without this, the webview is not interactive
        this.afterLineNumber = line;
        this.afterColumn = 1;
        this.heightInLines = height;
        editor.changeViewZones(accessor => this._id = accessor.addZone(this));
        webview.mountTo(this.domNode, getWindow(editor.getDomNode()));
    }
    dispose() {
        this.editor.changeViewZones(accessor => this._id && accessor.removeZone(this._id));
    }
}
let MainThreadEditorInsets = class MainThreadEditorInsets {
    constructor(context, _editorService, _webviewService) {
        this._editorService = _editorService;
        this._webviewService = _webviewService;
        this._disposables = new DisposableStore();
        this._insets = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostEditorInsets);
    }
    dispose() {
        this._disposables.dispose();
    }
    async $createEditorInset(handle, id, uri, line, height, options, extensionId, extensionLocation) {
        let editor;
        id = id.substr(0, id.indexOf(',')); //todo@jrieken HACK
        for (const candidate of this._editorService.listCodeEditors()) {
            if (candidate.getId() === id && candidate.hasModel() && isEqual(candidate.getModel().uri, URI.revive(uri))) {
                editor = candidate;
                break;
            }
        }
        if (!editor) {
            setTimeout(() => this._proxy.$onDidDispose(handle));
            return;
        }
        const disposables = new DisposableStore();
        const webview = this._webviewService.createWebviewElement({
            title: undefined,
            options: {
                enableFindWidget: false,
            },
            contentOptions: reviveWebviewContentOptions(options),
            extension: { id: extensionId, location: URI.revive(extensionLocation) }
        });
        const webviewZone = new EditorWebviewZone(editor, line, height, webview);
        const remove = () => {
            disposables.dispose();
            this._proxy.$onDidDispose(handle);
            this._insets.delete(handle);
        };
        disposables.add(editor.onDidChangeModel(remove));
        disposables.add(editor.onDidDispose(remove));
        disposables.add(webviewZone);
        disposables.add(webview);
        disposables.add(webview.onMessage(msg => this._proxy.$onDidReceiveMessage(handle, msg.message)));
        this._insets.set(handle, webviewZone);
    }
    $disposeEditorInset(handle) {
        const inset = this.getInset(handle);
        this._insets.delete(handle);
        inset.dispose();
    }
    $setHtml(handle, value) {
        const inset = this.getInset(handle);
        inset.webview.setHtml(value);
    }
    $setOptions(handle, options) {
        const inset = this.getInset(handle);
        inset.webview.contentOptions = reviveWebviewContentOptions(options);
    }
    async $postMessage(handle, value) {
        const inset = this.getInset(handle);
        inset.webview.postMessage(value);
        return true;
    }
    getInset(handle) {
        const inset = this._insets.get(handle);
        if (!inset) {
            throw new Error('Unknown inset');
        }
        return inset;
    }
};
MainThreadEditorInsets = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEditorInsets),
    __param(1, ICodeEditorService),
    __param(2, IWebviewService)
], MainThreadEditorInsets);
export { MainThreadEditorInsets };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvZGVJbnNldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDb2RlSW5zZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFFakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFM0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBb0QsV0FBVyxFQUErQixNQUFNLCtCQUErQixDQUFDO0FBQzNKLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sMENBQTBDLENBQUM7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBRTdHLHlFQUF5RTtBQUN6RSxNQUFNLGlCQUFpQjtJQVF0QiwyQ0FBMkM7SUFDM0MsbUNBQW1DO0lBQ25DLHFDQUFxQztJQUNyQyxrREFBa0Q7SUFDbEQsc0RBQXNEO0lBQ3RELDZEQUE2RDtJQUU3RCxZQUNVLE1BQXlCLEVBQ3pCLElBQVksRUFDWixNQUFjLEVBQ2QsT0FBd0I7UUFIeEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7UUFDekIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxZQUFPLEdBQVAsT0FBTyxD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