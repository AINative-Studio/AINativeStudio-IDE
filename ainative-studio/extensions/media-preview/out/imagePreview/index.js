"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewManager = void 0;
exports.registerImagePreviewSupport = registerImagePreviewSupport;
const vscode = __importStar(require("vscode"));
const mediaPreview_1 = require("../mediaPreview");
const dom_1 = require("../util/dom");
const sizeStatusBarEntry_1 = require("./sizeStatusBarEntry");
const zoomStatusBarEntry_1 = require("./zoomStatusBarEntry");
class PreviewManager {
    constructor(extensionRoot, sizeStatusBarEntry, binarySizeStatusBarEntry, zoomStatusBarEntry) {
        this.extensionRoot = extensionRoot;
        this.sizeStatusBarEntry = sizeStatusBarEntry;
        this.binarySizeStatusBarEntry = binarySizeStatusBarEntry;
        this.zoomStatusBarEntry = zoomStatusBarEntry;
        this._previews = new Set();
    }
    async openCustomDocument(uri) {
        return { uri, dispose: () => { } };
    }
    async resolveCustomEditor(document, webviewEditor) {
        const preview = new ImagePreview(this.extensionRoot, document.uri, webviewEditor, this.sizeStatusBarEntry, this.binarySizeStatusBarEntry, this.zoomStatusBarEntry);
        this._previews.add(preview);
        this.setActivePreview(preview);
        webviewEditor.onDidDispose(() => { this._previews.delete(preview); });
        webviewEditor.onDidChangeViewState(() => {
            if (webviewEditor.active) {
                this.setActivePreview(preview);
            }
            else if (this._activePreview === preview && !webviewEditor.active) {
                this.setActivePreview(undefined);
            }
        });
    }
    get activePreview() { return this._activePreview; }
    setActivePreview(value) {
        this._activePreview = value;
    }
}
exports.PreviewManager = PreviewManager;
PreviewManager.viewType = 'imagePreview.previewEditor';
class ImagePreview extends mediaPreview_1.MediaPreview {
    constructor(extensionRoot, resource, webviewEditor, sizeStatusBarEntry, binarySizeStatusBarEntry, zoomStatusBarEntry) {
        super(extensionRoot, resource, webviewEditor, binarySizeStatusBarEntry);
        this.extensionRoot = extensionRoot;
        this.sizeStatusBarEntry = sizeStatusBarEntry;
        this.zoomStatusBarEntry = zoomStatusBarEntry;
        this.emptyPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42gEFAPr/AP///wAI/AL+Sr4t6gAAAABJRU5ErkJggg==';
        this._register(webviewEditor.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'size': {
                    this._imageSize = message.value;
                    this.updateState();
                    break;
                }
                case 'zoom': {
                    this._imageZoom = message.value;
                    this.updateState();
                    break;
                }
                case 'reopen-as-text': {
                    (0, mediaPreview_1.reopenAsText)(resource, webviewEditor.viewColumn);
                    break;
                }
            }
        }));
        this._register(zoomStatusBarEntry.onDidChangeScale(e => {
            if (this.previewState === 2 /* PreviewState.Active */) {
                this.webviewEditor.webview.postMessage({ type: 'setScale', scale: e.scale });
            }
        }));
        this._register(webviewEditor.onDidChangeViewState(() => {
            this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
        }));
        this._register(webviewEditor.onDidDispose(() => {
            if (this.previewState === 2 /* PreviewState.Active */) {
                this.sizeStatusBarEntry.hide(this);
                this.zoomStatusBarEntry.hide(this);
            }
            this.previewState = 0 /* PreviewState.Disposed */;
        }));
        this.updateBinarySize();
        this.render();
        this.updateState();
    }
    dispose() {
        super.dispose();
        this.sizeStatusBarEntry.hide(this);
        this.zoomStatusBarEntry.hide(this);
    }
    zoomIn() {
        if (this.previewState === 2 /* PreviewState.Active */) {
            this.webviewEditor.webview.postMessage({ type: 'zoomIn' });
        }
    }
    zoomOut() {
        if (this.previewState === 2 /* PreviewState.Active */) {
            this.webviewEditor.webview.postMessage({ type: 'zoomOut' });
        }
    }
    copyImage() {
        if (this.previewState === 2 /* PreviewState.Active */) {
            this.webviewEditor.reveal();
            this.webviewEditor.webview.postMessage({ type: 'copyImage' });
        }
    }
    updateState() {
        super.updateState();
        if (this.previewState === 0 /* PreviewState.Disposed */) {
            return;
        }
        if (this.webviewEditor.active) {
            this.sizeStatusBarEntry.show(this, this._imageSize || '');
            this.zoomStatusBarEntry.show(this, this._imageZoom || 'fit');
        }
        else {
            this.sizeStatusBarEntry.hide(this);
            this.zoomStatusBarEntry.hide(this);
        }
    }
    async render() {
        await super.render();
        this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
    }
    async getWebviewContents() {
        const version = Date.now().toString();
        const settings = {
            src: await this.getResourcePath(this.webviewEditor, this.resource, version),
        };
        const nonce = (0, dom_1.getNonce)();
        const cspSource = this.webviewEditor.webview.cspSource;
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">

	<!-- Disable pinch zooming -->
	<meta name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">

	<title>Image Preview</title>

	<link rel="stylesheet" href="${(0, dom_1.escapeAttribute)(this.extensionResource('media', 'imagePreview.css'))}" type="text/css" media="screen" nonce="${nonce}">

	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${cspSource}; connect-src ${cspSource}; script-src 'nonce-${nonce}'; style-src ${cspSource} 'nonce-${nonce}';">
	<meta id="image-preview-settings" data-settings="${(0, dom_1.escapeAttribute)(JSON.stringify(settings))}">
</head>
<body class="container image scale-to-fit loading" data-vscode-context='{ "preventDefaultContextMenuItems": true }'>
	<div class="loading-indicator"></div>
	<div class="image-load-error">
		<p>${vscode.l10n.t("An error occurred while loading the image.")}</p>
		<a href="#" class="open-file-link">${vscode.l10n.t("Open file using VS Code's standard text/binary editor?")}</a>
	</div>
	<script src="${(0, dom_1.escapeAttribute)(this.extensionResource('media', 'imagePreview.js'))}" nonce="${nonce}"></script>
</body>
</html>`;
    }
    async getResourcePath(webviewEditor, resource, version) {
        if (resource.scheme === 'git') {
            const stat = await vscode.workspace.fs.stat(resource);
            if (stat.size === 0) {
                return this.emptyPngDataUri;
            }
        }
        // Avoid adding cache busting if there is already a query string
        if (resource.query) {
            return webviewEditor.webview.asWebviewUri(resource).toString();
        }
        return webviewEditor.webview.asWebviewUri(resource).with({ query: `version=${version}` }).toString();
    }
    extensionResource(...parts) {
        return this.webviewEditor.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionRoot, ...parts));
    }
}
function registerImagePreviewSupport(context, binarySizeStatusBarEntry) {
    const disposables = [];
    const sizeStatusBarEntry = new sizeStatusBarEntry_1.SizeStatusBarEntry();
    disposables.push(sizeStatusBarEntry);
    const zoomStatusBarEntry = new zoomStatusBarEntry_1.ZoomStatusBarEntry();
    disposables.push(zoomStatusBarEntry);
    const previewManager = new PreviewManager(context.extensionUri, sizeStatusBarEntry, binarySizeStatusBarEntry, zoomStatusBarEntry);
    disposables.push(vscode.window.registerCustomEditorProvider(PreviewManager.viewType, previewManager, {
        supportsMultipleEditorsPerDocument: true,
    }));
    disposables.push(vscode.commands.registerCommand('imagePreview.zoomIn', () => {
        previewManager.activePreview?.zoomIn();
    }));
    disposables.push(vscode.commands.registerCommand('imagePreview.zoomOut', () => {
        previewManager.activePreview?.zoomOut();
    }));
    disposables.push(vscode.commands.registerCommand('imagePreview.copyImage', () => {
        previewManager.activePreview?.copyImage();
    }));
    return vscode.Disposable.from(...disposables);
}
//# sourceMappingURL=index.js.map