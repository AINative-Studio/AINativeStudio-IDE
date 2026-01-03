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
exports.DynamicMarkdownPreview = exports.StaticMarkdownPreview = exports.PreviewDocumentVersion = void 0;
const vscode = __importStar(require("vscode"));
const uri = __importStar(require("vscode-uri"));
const dispose_1 = require("../util/dispose");
const file_1 = require("../util/file");
const url_1 = require("../util/url");
const scrolling_1 = require("./scrolling");
const topmostLineMonitor_1 = require("./topmostLineMonitor");
class PreviewDocumentVersion {
    constructor(document) {
        this.resource = document.uri;
        this._version = document.version;
    }
    equals(other) {
        return this.resource.fsPath === other.resource.fsPath
            && this._version === other._version;
    }
}
exports.PreviewDocumentVersion = PreviewDocumentVersion;
class MarkdownPreview extends dispose_1.Disposable {
    constructor(webview, resource, startingScroll, _delegate, _contentProvider, _previewConfigurations, _logger, _contributionProvider, _opener) {
        super();
        this._delegate = _delegate;
        this._contentProvider = _contentProvider;
        this._previewConfigurations = _previewConfigurations;
        this._logger = _logger;
        this._contributionProvider = _contributionProvider;
        this._opener = _opener;
        this._disposed = false;
        this._delay = 300;
        this._firstUpdate = true;
        this._isScrolling = false;
        this._imageInfo = [];
        this._fileWatchersBySrc = new Map();
        this._onScrollEmitter = this._register(new vscode.EventEmitter());
        this.onScroll = this._onScrollEmitter.event;
        this._disposeCts = this._register(new vscode.CancellationTokenSource());
        this._webviewPanel = webview;
        this._resource = resource;
        switch (startingScroll?.type) {
            case 'line':
                if (!isNaN(startingScroll.line)) {
                    this._line = startingScroll.line;
                }
                break;
            case 'fragment':
                this._scrollToFragment = startingScroll.fragment;
                break;
        }
        this._register(_contributionProvider.onContributionsChanged(() => {
            setTimeout(() => this.refresh(true), 0);
        }));
        this._register(vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isPreviewOf(event.document.uri)) {
                this.refresh();
            }
        }));
        this._register(vscode.workspace.onDidOpenTextDocument(document => {
            if (this.isPreviewOf(document.uri)) {
                this.refresh();
            }
        }));
        const watcher = this._register(vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(resource, '*')));
        this._register(watcher.onDidChange(uri => {
            if (this.isPreviewOf(uri)) {
                // Only use the file system event when VS Code does not already know about the file
                if (!vscode.workspace.textDocuments.some(doc => doc.uri.toString() === uri.toString())) {
                    this.refresh();
                }
            }
        }));
        this._register(this._webviewPanel.webview.onDidReceiveMessage((e) => {
            if (e.source !== this._resource.toString()) {
                return;
            }
            switch (e.type) {
                case 'cacheImageSizes':
                    this._imageInfo = e.imageData;
                    break;
                case 'revealLine':
                    this._onDidScrollPreview(e.line);
                    break;
                case 'didClick':
                    this._onDidClickPreview(e.line);
                    break;
                case 'openLink':
                    this._onDidClickPreviewLink(e.href);
                    break;
                case 'showPreviewSecuritySelector':
                    vscode.commands.executeCommand('markdown.showPreviewSecuritySelector', e.source);
                    break;
                case 'previewStyleLoadError':
                    vscode.window.showWarningMessage(vscode.l10n.t("Could not load 'markdown.styles': {0}", e.unloadedStyles.join(', ')));
                    break;
            }
        }));
        this.refresh();
    }
    dispose() {
        this._disposeCts.cancel();
        super.dispose();
        this._disposed = true;
        clearTimeout(this._throttleTimer);
        for (const entry of this._fileWatchersBySrc.values()) {
            entry.dispose();
        }
        this._fileWatchersBySrc.clear();
    }
    get resource() {
        return this._resource;
    }
    get state() {
        return {
            resource: this._resource.toString(),
            line: this._line,
            fragment: this._scrollToFragment,
            ...this._delegate.getAdditionalState(),
        };
    }
    /**
     * The first call immediately refreshes the preview,
     * calls happening shortly thereafter are debounced.
    */
    refresh(forceUpdate = false) {
        // Schedule update if none is pending
        if (!this._throttleTimer) {
            if (this._firstUpdate) {
                this._updatePreview(true);
            }
            else {
                this._throttleTimer = setTimeout(() => this._updatePreview(forceUpdate), this._delay);
            }
        }
        this._firstUpdate = false;
    }
    isPreviewOf(resource) {
        return this._resource.fsPath === resource.fsPath;
    }
    postMessage(msg) {
        if (!this._disposed) {
            this._webviewPanel.webview.postMessage(msg);
        }
    }
    scrollTo(topLine) {
        if (this._disposed) {
            return;
        }
        if (this._isScrolling) {
            this._isScrolling = false;
            return;
        }
        this._logger.trace('MarkdownPreview', 'updateForView', { markdownFile: this._resource });
        this._line = topLine;
        this.postMessage({
            type: 'updateView',
            line: topLine,
            source: this._resource.toString()
        });
    }
    async _updatePreview(forceUpdate) {
        clearTimeout(this._throttleTimer);
        this._throttleTimer = undefined;
        if (this._disposed) {
            return;
        }
        let document;
        try {
            document = await vscode.workspace.openTextDocument(this._resource);
        }
        catch {
            if (!this._disposed) {
                await this._showFileNotFoundError();
            }
            return;
        }
        if (this._disposed) {
            return;
        }
        const pendingVersion = new PreviewDocumentVersion(document);
        if (!forceUpdate && this._currentVersion?.equals(pendingVersion)) {
            if (this._line) {
                this.scrollTo(this._line);
            }
            return;
        }
        const shouldReloadPage = forceUpdate || !this._currentVersion || this._currentVersion.resource.toString() !== pendingVersion.resource.toString() || !this._webviewPanel.visible;
        this._currentVersion = pendingVersion;
        let selectedLine = undefined;
        for (const editor of vscode.window.visibleTextEditors) {
            if (this.isPreviewOf(editor.document.uri)) {
                selectedLine = editor.selection.active.line;
                break;
            }
        }
        const content = await (shouldReloadPage
            ? this._contentProvider.renderDocument(document, this, this._previewConfigurations, this._line, selectedLine, this.state, this._imageInfo, this._disposeCts.token)
            : this._contentProvider.renderBody(document, this));
        // Another call to `doUpdate` may have happened.
        // Make sure we are still updating for the correct document
        if (this._currentVersion?.equals(pendingVersion)) {
            this._updateWebviewContent(content.html, shouldReloadPage);
            this._updateImageWatchers(content.containingImages);
        }
    }
    _onDidScrollPreview(line) {
        this._line = line;
        this._onScrollEmitter.fire({ line: this._line, uri: this._resource });
        const config = this._previewConfigurations.loadAndCacheConfiguration(this._resource);
        if (!config.scrollEditorWithPreview) {
            return;
        }
        for (const editor of vscode.window.visibleTextEditors) {
            if (!this.isPreviewOf(editor.document.uri)) {
                continue;
            }
            this._isScrolling = true;
            (0, scrolling_1.scrollEditorToLine)(line, editor);
        }
    }
    async _onDidClickPreview(line) {
        // fix #82457, find currently opened but unfocused source tab
        await vscode.commands.executeCommand('markdown.showSource');
        const revealLineInEditor = (editor) => {
            const position = new vscode.Position(line, 0);
            const newSelection = new vscode.Selection(position, position);
            editor.selection = newSelection;
            editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        };
        for (const visibleEditor of vscode.window.visibleTextEditors) {
            if (this.isPreviewOf(visibleEditor.document.uri)) {
                const editor = await vscode.window.showTextDocument(visibleEditor.document, visibleEditor.viewColumn);
                revealLineInEditor(editor);
                return;
            }
        }
        await vscode.workspace.openTextDocument(this._resource)
            .then(vscode.window.showTextDocument)
            .then((editor) => {
            revealLineInEditor(editor);
        }, () => {
            vscode.window.showErrorMessage(vscode.l10n.t('Could not open {0}', this._resource.toString()));
        });
    }
    async _showFileNotFoundError() {
        this._webviewPanel.webview.html = this._contentProvider.renderFileNotFoundDocument(this._resource);
    }
    _updateWebviewContent(html, reloadPage) {
        if (this._disposed) {
            return;
        }
        if (this._delegate.getTitle) {
            this._webviewPanel.title = this._delegate.getTitle(this._resource);
        }
        this._webviewPanel.webview.options = this._getWebviewOptions();
        if (reloadPage) {
            this._webviewPanel.webview.html = html;
        }
        else {
            this.postMessage({
                type: 'updateContent',
                content: html,
                source: this._resource.toString(),
            });
        }
    }
    _updateImageWatchers(srcs) {
        // Delete stale file watchers.
        for (const [src, watcher] of this._fileWatchersBySrc) {
            if (!srcs.has(src)) {
                watcher.dispose();
                this._fileWatchersBySrc.delete(src);
            }
        }
        // Create new file watchers.
        const root = vscode.Uri.joinPath(this._resource, '../');
        for (const src of srcs) {
            const uri = (0, url_1.urlToUri)(src, root);
            if (uri && !MarkdownPreview._unwatchedImageSchemes.has(uri.scheme) && !this._fileWatchersBySrc.has(src)) {
                const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(uri, '*'));
                watcher.onDidChange(() => {
                    this.refresh(true);
                });
                this._fileWatchersBySrc.set(src, watcher);
            }
        }
    }
    _getWebviewOptions() {
        return {
            enableScripts: true,
            enableForms: false,
            localResourceRoots: this._getLocalResourceRoots()
        };
    }
    _getLocalResourceRoots() {
        const baseRoots = Array.from(this._contributionProvider.contributions.previewResourceRoots);
        const folder = vscode.workspace.getWorkspaceFolder(this._resource);
        if (folder) {
            const workspaceRoots = vscode.workspace.workspaceFolders?.map(folder => folder.uri);
            if (workspaceRoots) {
                baseRoots.push(...workspaceRoots);
            }
        }
        else {
            baseRoots.push(uri.Utils.dirname(this._resource));
        }
        return baseRoots;
    }
    async _onDidClickPreviewLink(href) {
        const config = vscode.workspace.getConfiguration('markdown', this.resource);
        const openLinks = config.get('preview.openMarkdownLinks', 'inPreview');
        if (openLinks === 'inPreview') {
            const resolved = await this._opener.resolveDocumentLink(href, this.resource);
            if (resolved.kind === 'file') {
                try {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.from(resolved.uri));
                    if ((0, file_1.isMarkdownFile)(doc)) {
                        return this._delegate.openPreviewLinkToMarkdownFile(doc.uri, resolved.fragment ? decodeURIComponent(resolved.fragment) : undefined);
                    }
                }
                catch {
                    // Noop
                }
            }
        }
        return this._opener.openDocumentLink(href, this.resource);
    }
    //#region WebviewResourceProvider
    asWebviewUri(resource) {
        return this._webviewPanel.webview.asWebviewUri(resource);
    }
    get cspSource() {
        return this._webviewPanel.webview.cspSource;
    }
}
MarkdownPreview._unwatchedImageSchemes = new Set(['https', 'http', 'data']);
class StaticMarkdownPreview extends dispose_1.Disposable {
    static revive(resource, webview, contentProvider, previewConfigurations, topmostLineMonitor, logger, contributionProvider, opener, scrollLine) {
        return new StaticMarkdownPreview(webview, resource, contentProvider, previewConfigurations, topmostLineMonitor, logger, contributionProvider, opener, scrollLine);
    }
    constructor(_webviewPanel, resource, contentProvider, _previewConfigurations, topmostLineMonitor, logger, contributionProvider, opener, scrollLine) {
        super();
        this._webviewPanel = _webviewPanel;
        this._previewConfigurations = _previewConfigurations;
        this._onDispose = this._register(new vscode.EventEmitter());
        this.onDispose = this._onDispose.event;
        this._onDidChangeViewState = this._register(new vscode.EventEmitter());
        this.onDidChangeViewState = this._onDidChangeViewState.event;
        const topScrollLocation = scrollLine ? new scrolling_1.StartingScrollLine(scrollLine) : undefined;
        this._preview = this._register(new MarkdownPreview(this._webviewPanel, resource, topScrollLocation, {
            getAdditionalState: () => { return {}; },
            openPreviewLinkToMarkdownFile: (markdownLink, fragment) => {
                return vscode.commands.executeCommand('vscode.openWith', markdownLink.with({
                    fragment
                }), StaticMarkdownPreview.customEditorViewType, this._webviewPanel.viewColumn);
            }
        }, contentProvider, _previewConfigurations, logger, contributionProvider, opener));
        this._register(this._webviewPanel.onDidDispose(() => {
            this.dispose();
        }));
        this._register(this._webviewPanel.onDidChangeViewState(e => {
            this._onDidChangeViewState.fire(e);
        }));
        this._register(this._preview.onScroll((scrollInfo) => {
            topmostLineMonitor.setPreviousStaticEditorLine(scrollInfo);
        }));
        this._register(topmostLineMonitor.onDidChanged(event => {
            if (this._preview.isPreviewOf(event.resource)) {
                this._preview.scrollTo(event.line);
            }
        }));
    }
    copyImage(id) {
        this._webviewPanel.reveal();
        this._preview.postMessage({
            type: 'copyImage',
            source: this.resource.toString(),
            id: id
        });
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
    matchesResource(_otherResource, _otherPosition, _otherLocked) {
        return false;
    }
    refresh() {
        this._preview.refresh(true);
    }
    updateConfiguration() {
        if (this._previewConfigurations.hasConfigurationChanged(this._preview.resource)) {
            this.refresh();
        }
    }
    get resource() {
        return this._preview.resource;
    }
    get resourceColumn() {
        return this._webviewPanel.viewColumn || vscode.ViewColumn.One;
    }
}
exports.StaticMarkdownPreview = StaticMarkdownPreview;
StaticMarkdownPreview.customEditorViewType = 'vscode.markdown.preview.editor';
class DynamicMarkdownPreview extends dispose_1.Disposable {
    static revive(input, webview, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider, opener) {
        webview.iconPath = contentProvider.iconPath;
        return new DynamicMarkdownPreview(webview, input, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider, opener);
    }
    static create(input, previewColumn, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider, opener) {
        const webview = vscode.window.createWebviewPanel(DynamicMarkdownPreview.viewType, DynamicMarkdownPreview._getPreviewTitle(input.resource, input.locked), previewColumn, { enableFindWidget: true, });
        webview.iconPath = contentProvider.iconPath;
        return new DynamicMarkdownPreview(webview, input, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider, opener);
    }
    constructor(webview, input, _contentProvider, _previewConfigurations, _logger, _topmostLineMonitor, _contributionProvider, _opener) {
        super();
        this._contentProvider = _contentProvider;
        this._previewConfigurations = _previewConfigurations;
        this._logger = _logger;
        this._topmostLineMonitor = _topmostLineMonitor;
        this._contributionProvider = _contributionProvider;
        this._opener = _opener;
        this._onDisposeEmitter = this._register(new vscode.EventEmitter());
        this.onDispose = this._onDisposeEmitter.event;
        this._onDidChangeViewStateEmitter = this._register(new vscode.EventEmitter());
        this.onDidChangeViewState = this._onDidChangeViewStateEmitter.event;
        this._webviewPanel = webview;
        this._resourceColumn = input.resourceColumn;
        this._locked = input.locked;
        this._preview = this._createPreview(input.resource, typeof input.line === 'number' ? new scrolling_1.StartingScrollLine(input.line) : undefined);
        this._register(webview.onDidDispose(() => { this.dispose(); }));
        this._register(this._webviewPanel.onDidChangeViewState(e => {
            this._onDidChangeViewStateEmitter.fire(e);
        }));
        this._register(this._topmostLineMonitor.onDidChanged(event => {
            if (this._preview.isPreviewOf(event.resource)) {
                this._preview.scrollTo(event.line);
            }
        }));
        this._register(vscode.window.onDidChangeTextEditorSelection(event => {
            if (this._preview.isPreviewOf(event.textEditor.document.uri)) {
                this._preview.postMessage({
                    type: 'onDidChangeTextEditorSelection',
                    line: event.selections[0].active.line,
                    source: this._preview.resource.toString()
                });
            }
        }));
        this._register(vscode.window.onDidChangeActiveTextEditor(editor => {
            // Only allow previewing normal text editors which have a viewColumn: See #101514
            if (typeof editor?.viewColumn === 'undefined') {
                return;
            }
            if ((0, file_1.isMarkdownFile)(editor.document) && !this._locked && !this._preview.isPreviewOf(editor.document.uri)) {
                const line = (0, topmostLineMonitor_1.getVisibleLine)(editor);
                this.update(editor.document.uri, line ? new scrolling_1.StartingScrollLine(line) : undefined);
            }
        }));
    }
    copyImage(id) {
        this._webviewPanel.reveal();
        this._preview.postMessage({
            type: 'copyImage',
            source: this.resource.toString(),
            id: id
        });
    }
    dispose() {
        this._preview.dispose();
        this._webviewPanel.dispose();
        this._onDisposeEmitter.fire();
        this._onDisposeEmitter.dispose();
        super.dispose();
    }
    get resource() {
        return this._preview.resource;
    }
    get resourceColumn() {
        return this._resourceColumn;
    }
    reveal(viewColumn) {
        this._webviewPanel.reveal(viewColumn);
    }
    refresh() {
        this._preview.refresh(true);
    }
    updateConfiguration() {
        if (this._previewConfigurations.hasConfigurationChanged(this._preview.resource)) {
            this.refresh();
        }
    }
    update(newResource, scrollLocation) {
        if (this._preview.isPreviewOf(newResource)) {
            switch (scrollLocation?.type) {
                case 'line':
                    this._preview.scrollTo(scrollLocation.line);
                    return;
                case 'fragment':
                    // Workaround. For fragments, just reload the entire preview
                    break;
                default:
                    return;
            }
        }
        this._preview.dispose();
        this._preview = this._createPreview(newResource, scrollLocation);
    }
    toggleLock() {
        this._locked = !this._locked;
        this._webviewPanel.title = DynamicMarkdownPreview._getPreviewTitle(this._preview.resource, this._locked);
    }
    static _getPreviewTitle(resource, locked) {
        const resourceLabel = uri.Utils.basename(resource);
        return locked
            ? vscode.l10n.t('[Preview] {0}', resourceLabel)
            : vscode.l10n.t('Preview {0}', resourceLabel);
    }
    get position() {
        return this._webviewPanel.viewColumn;
    }
    matchesResource(otherResource, otherPosition, otherLocked) {
        if (this.position !== otherPosition) {
            return false;
        }
        if (this._locked) {
            return otherLocked && this._preview.isPreviewOf(otherResource);
        }
        else {
            return !otherLocked;
        }
    }
    matches(otherPreview) {
        return this.matchesResource(otherPreview._preview.resource, otherPreview.position, otherPreview._locked);
    }
    _createPreview(resource, startingScroll) {
        return new MarkdownPreview(this._webviewPanel, resource, startingScroll, {
            getTitle: (resource) => DynamicMarkdownPreview._getPreviewTitle(resource, this._locked),
            getAdditionalState: () => {
                return {
                    resourceColumn: this.resourceColumn,
                    locked: this._locked,
                };
            },
            openPreviewLinkToMarkdownFile: (link, fragment) => {
                this.update(link, fragment ? new scrolling_1.StartingScrollFragment(fragment) : undefined);
            }
        }, this._contentProvider, this._previewConfigurations, this._logger, this._contributionProvider, this._opener);
    }
}
exports.DynamicMarkdownPreview = DynamicMarkdownPreview;
DynamicMarkdownPreview.viewType = 'markdown.preview';
//# sourceMappingURL=preview.js.map