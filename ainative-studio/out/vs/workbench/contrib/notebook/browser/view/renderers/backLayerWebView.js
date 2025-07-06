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
var BackLayerWebView_1;
import { getWindow } from '../../../../../../base/browser/dom.js';
import { coalesce } from '../../../../../../base/common/arrays.js';
import { DeferredPromise, runWhenGlobalIdle } from '../../../../../../base/common/async.js';
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { FileAccess, Schemas, matchesScheme, matchesSomeScheme } from '../../../../../../base/common/network.js';
import { equals } from '../../../../../../base/common/objects.js';
import * as osPath from '../../../../../../base/common/path.js';
import { isMacintosh, isWeb } from '../../../../../../base/common/platform.js';
import { dirname, extname, isEqual, joinPath } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as UUID from '../../../../../../base/common/uuid.js';
import { TokenizationRegistry } from '../../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../../../editor/common/languages/supports/tokenization.js';
import { tokenizeToString } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import * as nls from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { editorFindMatch, editorFindMatchHighlight } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../../platform/workspace/common/workspaceTrust.js';
import { CellEditState } from '../../notebookBrowser.js';
import { NOTEBOOK_WEBVIEW_BOUNDARY } from '../notebookCellList.js';
import { preloadsScriptStr } from './webviewPreloads.js';
import { transformWebviewThemeVars } from './webviewThemeMapping.js';
import { MarkupCellViewModel } from '../../viewModel/markupCellViewModel.js';
import { CellUri } from '../../../common/notebookCommon.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IWebviewService, WebviewOriginStore } from '../../../../webview/browser/webview.js';
import { WebviewWindowDragMonitor } from '../../../../webview/browser/webviewWindowDragMonitor.js';
import { asWebviewUri, webviewGenericCspSource } from '../../../../webview/common/webview.js';
import { IEditorGroupsService } from '../../../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { IPathService } from '../../../../../services/path/common/pathService.js';
const LINE_COLUMN_REGEX = /:([\d]+)(?::([\d]+))?$/;
const LineQueryRegex = /line=(\d+)$/;
const FRAGMENT_REGEX = /^(.*)#([^#]*)$/;
let BackLayerWebView = class BackLayerWebView extends Themable {
    static { BackLayerWebView_1 = this; }
    static getOriginStore(storageService) {
        this._originStore ??= new WebviewOriginStore('notebook.backlayerWebview.origins', storageService);
        return this._originStore;
    }
    constructor(notebookEditor, id, notebookViewType, documentUri, options, rendererMessaging, webviewService, openerService, notebookService, contextService, environmentService, fileDialogService, fileService, contextMenuService, contextKeyService, workspaceTrustManagementService, configurationService, languageService, workspaceContextService, editorGroupService, storageService, pathService, notebookLogService, themeService, telemetryService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this.id = id;
        this.notebookViewType = notebookViewType;
        this.documentUri = documentUri;
        this.options = options;
        this.rendererMessaging = rendererMessaging;
        this.webviewService = webviewService;
        this.openerService = openerService;
        this.notebookService = notebookService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.fileDialogService = fileDialogService;
        this.fileService = fileService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.workspaceContextService = workspaceContextService;
        this.editorGroupService = editorGroupService;
        this.storageService = storageService;
        this.pathService = pathService;
        this.notebookLogService = notebookLogService;
        this.telemetryService = telemetryService;
        this.webview = undefined;
        this.insetMapping = new Map();
        this.pendingWebviewIdleCreationRequest = new Map();
        this.pendingWebviewIdleInsetMapping = new Map();
        this.reversedPendingWebviewIdleInsetMapping = new Map();
        this.markupPreviewMapping = new Map();
        this.hiddenInsetMapping = new Set();
        this.reversedInsetMapping = new Map();
        this.localResourceRootsCache = undefined;
        this._onMessage = this._register(new Emitter());
        this._preloadsCache = new Set();
        this.onMessage = this._onMessage.event;
        this._disposed = false;
        this.firstInit = true;
        this.nonce = UUID.generateUuid();
        this._logRendererDebugMessage('Creating backlayer webview for notebook');
        this.element = document.createElement('div');
        this.element.style.height = '1400px';
        this.element.style.position = 'absolute';
        if (rendererMessaging) {
            this._register(rendererMessaging);
            rendererMessaging.receiveMessageHandler = (rendererId, message) => {
                if (!this.webview || this._disposed) {
                    return Promise.resolve(false);
                }
                this._sendMessageToWebview({
                    __vscode_notebook_message: true,
                    type: 'customRendererMessage',
                    rendererId: rendererId,
                    message: message
                });
                return Promise.resolve(true);
            };
        }
        this._register(workspaceTrustManagementService.onDidChangeTrust(e => {
            const baseUrl = this.asWebviewUri(this.getNotebookBaseUri(), undefined);
            const htmlContent = this.generateContent(baseUrl.toString());
            this.webview?.setHtml(htmlContent);
        }));
        this._register(TokenizationRegistry.onDidChange(() => {
            this._sendMessageToWebview({
                type: 'tokenizedStylesChanged',
                css: getTokenizationCss(),
            });
        }));
    }
    updateOptions(options) {
        this.options = options;
        this._updateStyles();
        this._updateOptions();
    }
    _logRendererDebugMessage(msg) {
        this.notebookLogService.debug('BacklayerWebview', `${this.documentUri} (${this.id}) - ${msg}`);
    }
    _updateStyles() {
        this._sendMessageToWebview({
            type: 'notebookStyles',
            styles: this._generateStyles()
        });
    }
    _updateOptions() {
        this._sendMessageToWebview({
            type: 'notebookOptions',
            options: {
                dragAndDropEnabled: this.options.dragAndDropEnabled
            },
            renderOptions: {
                lineLimit: this.options.outputLineLimit,
                outputScrolling: this.options.outputScrolling,
                outputWordWrap: this.options.outputWordWrap,
                linkifyFilePaths: this.options.outputLinkifyFilePaths,
                minimalError: this.options.minimalError
            }
        });
    }
    _generateStyles() {
        return {
            'notebook-output-left-margin': `${this.options.leftMargin + this.options.runGutter}px`,
            'notebook-output-width': `calc(100% - ${this.options.leftMargin + this.options.rightMargin + this.options.runGutter}px)`,
            'notebook-output-node-padding': `${this.options.outputNodePadding}px`,
            'notebook-run-gutter': `${this.options.runGutter}px`,
            'notebook-preview-node-padding': `${this.options.previewNodePadding}px`,
            'notebook-markdown-left-margin': `${this.options.markdownLeftMargin}px`,
            'notebook-output-node-left-padding': `${this.options.outputNodeLeftPadding}px`,
            'notebook-markdown-min-height': `${this.options.previewNodePadding * 2}px`,
            'notebook-markup-font-size': typeof this.options.markupFontSize === 'number' && this.options.markupFontSize > 0 ? `${this.options.markupFontSize}px` : `calc(${this.options.fontSize}px * 1.2)`,
            'notebook-markdown-line-height': typeof this.options.markdownLineHeight === 'number' && this.options.markdownLineHeight > 0 ? `${this.options.markdownLineHeight}px` : `normal`,
            'notebook-cell-output-font-size': `${this.options.outputFontSize || this.options.fontSize}px`,
            'notebook-cell-output-line-height': `${this.options.outputLineHeight}px`,
            'notebook-cell-output-max-height': `${this.options.outputLineHeight * this.options.outputLineLimit + 2}px`,
            'notebook-cell-output-font-family': this.options.outputFontFamily || this.options.fontFamily,
            'notebook-cell-markup-empty-content': nls.localize('notebook.emptyMarkdownPlaceholder', "Empty markdown cell, double-click or press enter to edit."),
            'notebook-cell-renderer-not-found-error': nls.localize({
                key: 'notebook.error.rendererNotFound',
                comment: ['$0 is a placeholder for the mime type']
            }, "No renderer found for '$0'"),
            'notebook-cell-renderer-fallbacks-exhausted': nls.localize({
                key: 'notebook.error.rendererFallbacksExhausted',
                comment: ['$0 is a placeholder for the mime type']
            }, "Could not render content for '$0'"),
            'notebook-markup-font-family': this.options.markupFontFamily,
        };
    }
    generateContent(baseUrl) {
        const renderersData = this.getRendererData();
        const preloadsData = this.getStaticPreloadsData();
        const renderOptions = {
            lineLimit: this.options.outputLineLimit,
            outputScrolling: this.options.outputScrolling,
            outputWordWrap: this.options.outputWordWrap,
            linkifyFilePaths: this.options.outputLinkifyFilePaths,
            minimalError: this.options.minimalError
        };
        const preloadScript = preloadsScriptStr({
            ...this.options,
            tokenizationCss: getTokenizationCss(),
        }, { dragAndDropEnabled: this.options.dragAndDropEnabled }, renderOptions, renderersData, preloadsData, this.workspaceTrustManagementService.isWorkspaceTrusted(), this.nonce);
        const enableCsp = this.configurationService.getValue('notebook.experimental.enableCsp');
        const currentHighlight = this.getColor(editorFindMatch);
        const findMatchHighlight = this.getColor(editorFindMatchHighlight);
        return /* html */ `
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<base href="${baseUrl}/" />
				${enableCsp ?
            `<meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					script-src ${webviewGenericCspSource} 'unsafe-inline' 'unsafe-eval';
					style-src ${webviewGenericCspSource} 'unsafe-inline';
					img-src ${webviewGenericCspSource} https: http: data:;
					font-src ${webviewGenericCspSource} https:;
					connect-src https:;
					child-src https: data:;
				">` : ''}
				<style nonce="${this.nonce}">
					::highlight(find-highlight) {
						background-color: var(--vscode-editor-findMatchBackground, ${findMatchHighlight});
					}

					::highlight(current-find-highlight) {
						background-color: var(--vscode-editor-findMatchHighlightBackground, ${currentHighlight});
					}

					#container .cell_container {
						width: 100%;
					}

					#container .output_container {
						width: 100%;
					}

					#container .cell_container.nb-insertHighlight div.output_container div.output {
						background-color: var(--vscode-diffEditor-insertedLineBackground, var(--vscode-diffEditor-insertedTextBackground));
					}

					#container > div > div > div.output {
						font-size: var(--notebook-cell-output-font-size);
						width: var(--notebook-output-width);
						margin-left: var(--notebook-output-left-margin);
						background-color: var(--theme-notebook-output-background);
						padding-top: var(--notebook-output-node-padding);
						padding-right: var(--notebook-output-node-padding);
						padding-bottom: var(--notebook-output-node-padding);
						padding-left: var(--notebook-output-node-left-padding);
						box-sizing: border-box;
						border-top: none;
					}

					/* markdown */
					#container div.preview {
						width: 100%;
						padding-right: var(--notebook-preview-node-padding);
						padding-left: var(--notebook-markdown-left-margin);
						padding-top: var(--notebook-preview-node-padding);
						padding-bottom: var(--notebook-preview-node-padding);

						box-sizing: border-box;
						white-space: nowrap;
						overflow: hidden;
						white-space: initial;

						font-size: var(--notebook-markup-font-size);
						line-height: var(--notebook-markdown-line-height);
						color: var(--theme-ui-foreground);
						font-family: var(--notebook-markup-font-family);
					}

					#container div.preview.draggable {
						user-select: none;
						-webkit-user-select: none;
						-ms-user-select: none;
						cursor: grab;
					}

					#container div.preview.selected {
						background: var(--theme-notebook-cell-selected-background);
					}

					#container div.preview.dragging {
						background-color: var(--theme-background);
						opacity: 0.5 !important;
					}

					.monaco-workbench.vs-dark .notebookOverlay .cell.markdown .latex img,
					.monaco-workbench.vs-dark .notebookOverlay .cell.markdown .latex-block img {
						filter: brightness(0) invert(1)
					}

					#container .markup > div.nb-symbolHighlight {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .markup > div.nb-insertHighlight {
						background-color: var(--vscode-diffEditor-insertedLineBackground, var(--vscode-diffEditor-insertedTextBackground));
					}

					#container .nb-symbolHighlight .output_container .output {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .markup > div.nb-multiCellHighlight {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .nb-multiCellHighlight .output_container .output {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .nb-chatGenerationHighlight .output_container .output {
						background-color: var(--vscode-notebook-selectedCellBackground);
					}

					#container > div.nb-cellDeleted .output_container {
						background-color: var(--theme-notebook-diff-removed-background);
					}

					#container > div.nb-cellAdded .output_container {
						background-color: var(--theme-notebook-diff-inserted-background);
					}

					#container > div > div:not(.preview) > div {
						overflow-x: auto;
					}

					#container .no-renderer-error {
						color: var(--vscode-editorError-foreground);
					}

					body {
						padding: 0px;
						height: 100%;
						width: 100%;
					}

					table, thead, tr, th, td, tbody {
						border: none;
						border-color: transparent;
						border-spacing: 0;
						border-collapse: collapse;
					}

					table, th, tr {
						vertical-align: middle;
						text-align: right;
					}

					thead {
						font-weight: bold;
						background-color: rgba(130, 130, 130, 0.16);
					}

					th, td {
						padding: 4px 8px;
					}

					tr:nth-child(even) {
						background-color: rgba(130, 130, 130, 0.08);
					}

					tbody th {
						font-weight: normal;
					}

					.find-match {
						background-color: var(--vscode-editor-findMatchHighlightBackground);
					}

					.current-find-match {
						background-color: var(--vscode-editor-findMatchBackground);
					}

					#_defaultColorPalatte {
						color: var(--vscode-editor-findMatchHighlightBackground);
						background-color: var(--vscode-editor-findMatchBackground);
					}
				</style>
			</head>
			<body style="overflow: hidden;">
				<div id='findStart' tabIndex=-1></div>
				<div id='container' class="widgetarea" style="position: absolute;width:100%;top: 0px"></div>
				<div id="_defaultColorPalatte"></div>
				<script type="module">${preloadScript}</script>
			</body>
		</html>`;
    }
    getRendererData() {
        return this.notebookService.getRenderers().map((renderer) => {
            const entrypoint = {
                extends: renderer.entrypoint.extends,
                path: this.asWebviewUri(renderer.entrypoint.path, renderer.extensionLocation).toString()
            };
            return {
                id: renderer.id,
                entrypoint,
                mimeTypes: renderer.mimeTypes,
                messaging: renderer.messaging !== "never" /* RendererMessagingSpec.Never */ && !!this.rendererMessaging,
                isBuiltin: renderer.isBuiltin
            };
        });
    }
    getStaticPreloadsData() {
        return Array.from(this.notebookService.getStaticPreloads(this.notebookViewType), preload => {
            return { entrypoint: this.asWebviewUri(preload.entrypoint, preload.extensionLocation).toString().toString() };
        });
    }
    asWebviewUri(uri, fromExtension) {
        return asWebviewUri(uri, fromExtension?.scheme === Schemas.vscodeRemote ? { isRemote: true, authority: fromExtension.authority } : undefined);
    }
    postKernelMessage(message) {
        this._sendMessageToWebview({
            __vscode_notebook_message: true,
            type: 'customKernelMessage',
            message,
        });
    }
    resolveOutputId(id) {
        const output = this.reversedInsetMapping.get(id);
        if (!output) {
            return;
        }
        const cellInfo = this.insetMapping.get(output).cellInfo;
        return { cellInfo, output };
    }
    isResolved() {
        return !!this.webview;
    }
    createWebview(targetWindow) {
        const baseUrl = this.asWebviewUri(this.getNotebookBaseUri(), undefined);
        const htmlContent = this.generateContent(baseUrl.toString());
        return this._initialize(htmlContent, targetWindow);
    }
    getNotebookBaseUri() {
        if (this.documentUri.scheme === Schemas.untitled) {
            const folder = this.workspaceContextService.getWorkspaceFolder(this.documentUri);
            if (folder) {
                return folder.uri;
            }
            const folders = this.workspaceContextService.getWorkspace().folders;
            if (folders.length) {
                return folders[0].uri;
            }
        }
        return dirname(this.documentUri);
    }
    getBuiltinLocalResourceRoots() {
        // Python notebooks assume that requirejs is a global.
        // For all other notebooks, they need to provide their own loader.
        if (!this.documentUri.path.toLowerCase().endsWith('.ipynb')) {
            return [];
        }
        if (isWeb) {
            return []; // script is inlined
        }
        return [
            dirname(FileAccess.asFileUri('vs/nls.js')),
        ];
    }
    _initialize(content, targetWindow) {
        if (!getWindow(this.element).document.body.contains(this.element)) {
            throw new Error('Element is already detached from the DOM tree');
        }
        this.webview = this._createInset(this.webviewService, content);
        this.webview.mountTo(this.element, targetWindow);
        this._register(this.webview);
        this._register(new WebviewWindowDragMonitor(targetWindow, () => this.webview));
        const initializePromise = new DeferredPromise();
        this._register(this.webview.onFatalError(e => {
            initializePromise.error(new Error(`Could not initialize webview: ${e.message}}`));
        }));
        this._register(this.webview.onMessage(async (message) => {
            const data = message.message;
            if (this._disposed) {
                return;
            }
            if (!data.__vscode_notebook_message) {
                return;
            }
            switch (data.type) {
                case 'initialized': {
                    initializePromise.complete();
                    this.initializeWebViewState();
                    break;
                }
                case 'initializedMarkup': {
                    if (this.initializeMarkupPromise?.requestId === data.requestId) {
                        this.initializeMarkupPromise?.p.complete();
                        this.initializeMarkupPromise = undefined;
                    }
                    break;
                }
                case 'dimension': {
                    for (const update of data.updates) {
                        const height = update.height;
                        if (update.isOutput) {
                            const resolvedResult = this.resolveOutputId(update.id);
                            if (resolvedResult) {
                                const { cellInfo, output } = resolvedResult;
                                this.notebookEditor.updateOutputHeight(cellInfo, output, height, !!update.init, 'webview#dimension');
                                this.notebookEditor.scheduleOutputHeightAck(cellInfo, update.id, height);
                            }
                            else if (update.init) {
                                // might be idle render request's ack
                                const outputRequest = this.reversedPendingWebviewIdleInsetMapping.get(update.id);
                                if (outputRequest) {
                                    const inset = this.pendingWebviewIdleInsetMapping.get(outputRequest);
                                    // clear the pending mapping
                                    this.pendingWebviewIdleCreationRequest.delete(outputRequest);
                                    this.pendingWebviewIdleCreationRequest.delete(outputRequest);
                                    const cellInfo = inset.cellInfo;
                                    this.reversedInsetMapping.set(update.id, outputRequest);
                                    this.insetMapping.set(outputRequest, inset);
                                    this.notebookEditor.updateOutputHeight(cellInfo, outputRequest, height, !!update.init, 'webview#dimension');
                                    this.notebookEditor.scheduleOutputHeightAck(cellInfo, update.id, height);
                                }
                                this.reversedPendingWebviewIdleInsetMapping.delete(update.id);
                            }
                            {
                                if (!update.init) {
                                    continue;
                                }
                                const output = this.reversedInsetMapping.get(update.id);
                                if (!output) {
                                    continue;
                                }
                                const inset = this.insetMapping.get(output);
                                inset.initialized = true;
                            }
                        }
                        else {
                            this.notebookEditor.updateMarkupCellHeight(update.id, height, !!update.init);
                        }
                    }
                    break;
                }
                case 'mouseenter': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsHovered = true;
                        }
                    }
                    break;
                }
                case 'mouseleave': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsHovered = false;
                        }
                    }
                    break;
                }
                case 'outputFocus': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsFocused = true;
                            this.notebookEditor.focusNotebookCell(latestCell, 'output', { outputId: resolvedResult.output.model.outputId, skipReveal: true, outputWebviewFocused: true });
                        }
                    }
                    break;
                }
                case 'outputBlur': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsFocused = false;
                            latestCell.inputInOutputIsFocused = false;
                        }
                    }
                    break;
                }
                case 'scroll-ack': {
                    // const date = new Date();
                    // const top = data.data.top;
                    // console.log('ack top ', top, ' version: ', data.version, ' - ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
                    break;
                }
                case 'scroll-to-reveal': {
                    this.notebookEditor.setScrollTop(data.scrollTop - NOTEBOOK_WEBVIEW_BOUNDARY);
                    break;
                }
                case 'did-scroll-wheel': {
                    this.notebookEditor.triggerScroll({
                        ...data.payload,
                        preventDefault: () => { },
                        stopPropagation: () => { }
                    });
                    break;
                }
                case 'focus-editor': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        if (data.focusNext) {
                            this.notebookEditor.focusNextNotebookCell(cell, 'editor');
                        }
                        else {
                            await this.notebookEditor.focusNotebookCell(cell, 'editor');
                        }
                    }
                    break;
                }
                case 'clicked-data-url': {
                    this._onDidClickDataLink(data);
                    break;
                }
                case 'clicked-link': {
                    if (matchesScheme(data.href, Schemas.command)) {
                        const uri = URI.parse(data.href);
                        if (uri.path === 'workbench.action.openLargeOutput') {
                            const outputId = uri.query;
                            const group = this.editorGroupService.activeGroup;
                            if (group) {
                                if (group.activeEditor) {
                                    group.pinEditor(group.activeEditor);
                                }
                            }
                            this.openerService.open(CellUri.generateCellOutputUriWithId(this.documentUri, outputId));
                            return;
                        }
                        if (uri.path === 'cellOutput.enableScrolling') {
                            const outputId = uri.query;
                            const cell = this.reversedInsetMapping.get(outputId);
                            if (cell) {
                                this.telemetryService.publicLog2('workbenchActionExecuted', { id: 'notebook.cell.toggleOutputScrolling', from: 'inlineLink' });
                                cell.cellViewModel.outputsViewModels.forEach((vm) => {
                                    if (vm.model.metadata) {
                                        vm.model.metadata['scrollable'] = true;
                                        vm.resetRenderer();
                                    }
                                });
                            }
                            return;
                        }
                        // We allow a very limited set of commands
                        this.openerService.open(data.href, {
                            fromUserGesture: true,
                            fromWorkspace: true,
                            allowCommands: [
                                'github-issues.authNow',
                                'workbench.extensions.search',
                                'workbench.action.openSettings',
                                '_notebook.selectKernel',
                                // TODO@rebornix explore open output channel with name command
                                'jupyter.viewOutput',
                                'jupyter.createPythonEnvAndSelectController',
                            ],
                        });
                        return;
                    }
                    if (matchesSomeScheme(data.href, Schemas.http, Schemas.https, Schemas.mailto)) {
                        this.openerService.open(data.href, { fromUserGesture: true, fromWorkspace: true });
                    }
                    else if (matchesScheme(data.href, Schemas.vscodeNotebookCell)) {
                        const uri = URI.parse(data.href);
                        await this._handleNotebookCellResource(uri);
                    }
                    else if (!/^[\w\-]+:/.test(data.href)) {
                        // Uri without scheme, such as a file path
                        await this._handleResourceOpening(tryDecodeURIComponent(data.href));
                    }
                    else {
                        // uri with scheme
                        if (osPath.isAbsolute(data.href)) {
                            this._openUri(URI.file(data.href));
                        }
                        else {
                            this._openUri(URI.parse(data.href));
                        }
                    }
                    break;
                }
                case 'customKernelMessage': {
                    this._onMessage.fire({ message: data.message });
                    break;
                }
                case 'customRendererMessage': {
                    this.rendererMessaging?.postMessage(data.rendererId, data.message);
                    break;
                }
                case 'clickMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        if (data.shiftKey || (isMacintosh ? data.metaKey : data.ctrlKey)) {
                            // Modify selection
                            this.notebookEditor.toggleNotebookCellSelection(cell, /* fromPrevious */ data.shiftKey);
                        }
                        else {
                            // Normal click
                            await this.notebookEditor.focusNotebookCell(cell, 'container', { skipReveal: true });
                        }
                    }
                    break;
                }
                case 'contextMenuMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        // Focus the cell first
                        await this.notebookEditor.focusNotebookCell(cell, 'container', { skipReveal: true });
                        // Then show the context menu
                        const webviewRect = this.element.getBoundingClientRect();
                        this.contextMenuService.showContextMenu({
                            menuId: MenuId.NotebookCellTitle,
                            contextKeyService: this.contextKeyService,
                            getAnchor: () => ({
                                x: webviewRect.x + data.clientX,
                                y: webviewRect.y + data.clientY
                            })
                        });
                    }
                    break;
                }
                case 'toggleMarkupPreview': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell && !this.notebookEditor.creationOptions.isReadOnly) {
                        this.notebookEditor.setMarkupCellEditState(data.cellId, CellEditState.Editing);
                        await this.notebookEditor.focusNotebookCell(cell, 'editor', { skipReveal: true });
                    }
                    break;
                }
                case 'mouseEnterMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.cellIsHovered = true;
                    }
                    break;
                }
                case 'mouseLeaveMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.cellIsHovered = false;
                    }
                    break;
                }
                case 'cell-drag-start': {
                    this.notebookEditor.didStartDragMarkupCell(data.cellId, data);
                    break;
                }
                case 'cell-drag': {
                    this.notebookEditor.didDragMarkupCell(data.cellId, data);
                    break;
                }
                case 'cell-drop': {
                    this.notebookEditor.didDropMarkupCell(data.cellId, {
                        dragOffsetY: data.dragOffsetY,
                        ctrlKey: data.ctrlKey,
                        altKey: data.altKey,
                    });
                    break;
                }
                case 'cell-drag-end': {
                    this.notebookEditor.didEndDragMarkupCell(data.cellId);
                    break;
                }
                case 'renderedMarkup': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.renderedHtml = data.html;
                    }
                    this._handleHighlightCodeBlock(data.codeBlocks);
                    break;
                }
                case 'renderedCellOutput': {
                    this._handleHighlightCodeBlock(data.codeBlocks);
                    break;
                }
                case 'outputResized': {
                    this.notebookEditor.didResizeOutput(data.cellId);
                    break;
                }
                case 'getOutputItem': {
                    const resolvedResult = this.resolveOutputId(data.outputId);
                    const output = resolvedResult?.output.model.outputs.find(output => output.mime === data.mime);
                    this._sendMessageToWebview({
                        type: 'returnOutputItem',
                        requestId: data.requestId,
                        output: output ? { mime: output.mime, valueBytes: output.data.buffer } : undefined,
                    });
                    break;
                }
                case 'logRendererDebugMessage': {
                    this._logRendererDebugMessage(`${data.message}${data.data ? ' ' + JSON.stringify(data.data, null, 4) : ''}`);
                    break;
                }
                case 'notebookPerformanceMessage': {
                    this.notebookEditor.updatePerformanceMetadata(data.cellId, data.executionId, data.duration, data.rendererId);
                    if (data.outputSize && data.rendererId === 'vscode.builtin-renderer') {
                        this._sendPerformanceData(data.outputSize, data.duration);
                    }
                    break;
                }
                case 'outputInputFocus': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.inputInOutputIsFocused = data.inputFocused;
                        }
                    }
                    this.notebookEditor.didFocusOutputInputChange(data.inputFocused);
                }
            }
        }));
        return initializePromise.p;
    }
    _sendPerformanceData(outputSize, renderTime) {
        const telemetryData = {
            outputSize,
            renderTime
        };
        this.telemetryService.publicLog2('NotebookCellOutputRender', telemetryData);
    }
    _handleNotebookCellResource(uri) {
        const notebookResource = uri.path.length > 0 ? uri : this.documentUri;
        const lineMatch = /(?:^|&)line=([^&]+)/.exec(uri.query);
        let editorOptions = undefined;
        if (lineMatch) {
            const parsedLineNumber = parseInt(lineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                const lineNumber = parsedLineNumber;
                editorOptions = {
                    selection: { startLineNumber: lineNumber, startColumn: 1 }
                };
            }
        }
        const executionMatch = /(?:^|&)execution_count=([^&]+)/.exec(uri.query);
        if (executionMatch) {
            const executionCount = parseInt(executionMatch[1], 10);
            if (!isNaN(executionCount)) {
                const notebookModel = this.notebookService.getNotebookTextModel(notebookResource);
                // multiple cells with the same execution count can exist if the kernel is restarted
                // so look for the most recently added cell with the matching execution count.
                // Somewhat more likely to be correct in notebooks, an much more likely for the interactive window
                const cell = notebookModel?.cells.slice().reverse().find(cell => {
                    return cell.internalMetadata.executionOrder === executionCount;
                });
                if (cell?.uri) {
                    return this.openerService.open(cell.uri, {
                        fromUserGesture: true,
                        fromWorkspace: true,
                        editorOptions: editorOptions
                    });
                }
            }
        }
        // URLs built by the jupyter extension put the line query param in the fragment
        // They also have the cell fragment pre-calculated
        const fragmentLineMatch = /\?line=(\d+)$/.exec(uri.fragment);
        if (fragmentLineMatch) {
            const parsedLineNumber = parseInt(fragmentLineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                const lineNumber = parsedLineNumber + 1;
                const fragment = uri.fragment.substring(0, fragmentLineMatch.index);
                // open the uri with selection
                const editorOptions = {
                    selection: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 }
                };
                return this.openerService.open(notebookResource.with({ fragment }), {
                    fromUserGesture: true,
                    fromWorkspace: true,
                    editorOptions: editorOptions
                });
            }
        }
        return this.openerService.open(notebookResource, { fromUserGesture: true, fromWorkspace: true });
    }
    async _handleResourceOpening(href) {
        let linkToOpen = undefined;
        let fragment = undefined;
        // Separate out the fragment so that the subsequent calls
        // to URI.joinPath() don't URL encode it. This allows opening
        // links with both paths and fragments.
        const hrefWithFragment = FRAGMENT_REGEX.exec(href);
        if (hrefWithFragment) {
            href = hrefWithFragment[1];
            fragment = hrefWithFragment[2];
        }
        if (href.startsWith('/')) {
            linkToOpen = await this.pathService.fileURI(href);
            const folders = this.workspaceContextService.getWorkspace().folders;
            if (folders.length) {
                linkToOpen = linkToOpen.with({
                    scheme: folders[0].uri.scheme,
                    authority: folders[0].uri.authority
                });
            }
        }
        else if (href.startsWith('~')) {
            const userHome = await this.pathService.userHome();
            if (userHome) {
                linkToOpen = URI.joinPath(userHome, href.substring(2));
            }
        }
        else {
            if (this.documentUri.scheme === Schemas.untitled) {
                const folders = this.workspaceContextService.getWorkspace().folders;
                if (!folders.length) {
                    return;
                }
                linkToOpen = URI.joinPath(folders[0].uri, href);
            }
            else {
                // Resolve relative to notebook document
                linkToOpen = URI.joinPath(dirname(this.documentUri), href);
            }
        }
        if (linkToOpen) {
            // Re-attach fragment now that we have the full file path.
            if (fragment) {
                linkToOpen = linkToOpen.with({ fragment });
            }
            this._openUri(linkToOpen);
        }
    }
    _openUri(uri) {
        let lineNumber = undefined;
        let column = undefined;
        const lineCol = LINE_COLUMN_REGEX.exec(uri.path);
        if (lineCol) {
            uri = uri.with({
                path: uri.path.slice(0, lineCol.index),
                fragment: `L${lineCol[0].slice(1)}`
            });
            lineNumber = parseInt(lineCol[1], 10);
            column = parseInt(lineCol[2], 10);
        }
        //#region error renderer migration, remove once done
        const lineMatch = LineQueryRegex.exec(uri.query);
        if (lineMatch) {
            const parsedLineNumber = parseInt(lineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                lineNumber = parsedLineNumber + 1;
                column = 1;
                uri = uri.with({ fragment: `L${lineNumber}` });
            }
        }
        uri = uri.with({
            query: null
        });
        //#endregion
        let match = undefined;
        for (const group of this.editorGroupService.groups) {
            const editorInput = group.editors.find(editor => editor.resource && isEqual(editor.resource, uri, true));
            if (editorInput) {
                match = { group, editor: editorInput };
                break;
            }
        }
        if (match) {
            const selection = lineNumber !== undefined && column !== undefined ? { startLineNumber: lineNumber, startColumn: column } : undefined;
            const textEditorOptions = { selection: selection };
            match.group.openEditor(match.editor, selection ? textEditorOptions : undefined);
        }
        else {
            this.openerService.open(uri, { fromUserGesture: true, fromWorkspace: true });
        }
    }
    _handleHighlightCodeBlock(codeBlocks) {
        for (const { id, value, lang } of codeBlocks) {
            // The language id may be a language aliases (e.g.js instead of javascript)
            const languageId = this.languageService.getLanguageIdByLanguageName(lang);
            if (!languageId) {
                continue;
            }
            tokenizeToString(this.languageService, value, languageId).then((html) => {
                if (this._disposed) {
                    return;
                }
                this._sendMessageToWebview({
                    type: 'tokenizedCodeBlock',
                    html,
                    codeBlockId: id
                });
            });
        }
    }
    async _onDidClickDataLink(event) {
        if (typeof event.data !== 'string') {
            return;
        }
        const [splitStart, splitData] = event.data.split(';base64,');
        if (!splitData || !splitStart) {
            return;
        }
        const defaultDir = extname(this.documentUri) === '.interactive' ?
            this.workspaceContextService.getWorkspace().folders[0]?.uri ?? await this.fileDialogService.defaultFilePath() :
            dirname(this.documentUri);
        let defaultName;
        if (event.downloadName) {
            defaultName = event.downloadName;
        }
        else {
            const mimeType = splitStart.replace(/^data:/, '');
            const candidateExtension = mimeType && getExtensionForMimeType(mimeType);
            defaultName = candidateExtension ? `download${candidateExtension}` : 'download';
        }
        const defaultUri = joinPath(defaultDir, defaultName);
        const newFileUri = await this.fileDialogService.showSaveDialog({
            defaultUri
        });
        if (!newFileUri) {
            return;
        }
        const buff = decodeBase64(splitData);
        await this.fileService.writeFile(newFileUri, buff);
        await this.openerService.open(newFileUri);
    }
    _createInset(webviewService, content) {
        this.localResourceRootsCache = this._getResourceRootsCache();
        const webview = webviewService.createWebviewElement({
            origin: BackLayerWebView_1.getOriginStore(this.storageService).getOrigin(this.notebookViewType, undefined),
            title: nls.localize('webview title', "Notebook webview content"),
            options: {
                purpose: "notebookRenderer" /* WebviewContentPurpose.NotebookRenderer */,
                enableFindWidget: false,
                transformCssVariables: transformWebviewThemeVars,
            },
            contentOptions: {
                allowMultipleAPIAcquire: true,
                allowScripts: true,
                localResourceRoots: this.localResourceRootsCache,
            },
            extension: undefined,
            providedViewType: 'notebook.output'
        });
        webview.setHtml(content);
        webview.setContextKeyService(this.contextKeyService);
        return webview;
    }
    _getResourceRootsCache() {
        const workspaceFolders = this.contextService.getWorkspace().folders.map(x => x.uri);
        const notebookDir = this.getNotebookBaseUri();
        return [
            this.notebookService.getNotebookProviderResourceRoots(),
            this.notebookService.getRenderers().map(x => dirname(x.entrypoint.path)),
            ...Array.from(this.notebookService.getStaticPreloads(this.notebookViewType), x => [
                dirname(x.entrypoint),
                ...x.localResourceRoots,
            ]),
            workspaceFolders,
            notebookDir,
            this.getBuiltinLocalResourceRoots()
        ].flat();
    }
    initializeWebViewState() {
        this._preloadsCache.clear();
        if (this._currentKernel) {
            this._updatePreloadsFromKernel(this._currentKernel);
        }
        for (const [output, inset] of this.insetMapping.entries()) {
            this._sendMessageToWebview({ ...inset.cachedCreation, initiallyHidden: this.hiddenInsetMapping.has(output) });
        }
        if (this.initializeMarkupPromise?.isFirstInit) {
            // On first run the contents have already been initialized so we don't need to init them again
            // no op
        }
        else {
            const mdCells = [...this.markupPreviewMapping.values()];
            this.markupPreviewMapping.clear();
            this.initializeMarkup(mdCells);
        }
        this._updateStyles();
        this._updateOptions();
    }
    shouldUpdateInset(cell, output, cellTop, outputOffset) {
        if (this._disposed) {
            return false;
        }
        if ('isOutputCollapsed' in cell && cell.isOutputCollapsed) {
            return false;
        }
        if (this.hiddenInsetMapping.has(output)) {
            return true;
        }
        const outputCache = this.insetMapping.get(output);
        if (!outputCache) {
            return false;
        }
        if (outputOffset === outputCache.cachedCreation.outputOffset && cellTop === outputCache.cachedCreation.cellTop) {
            return false;
        }
        return true;
    }
    ackHeight(updates) {
        this._sendMessageToWebview({
            type: 'ack-dimension',
            updates
        });
    }
    updateScrollTops(outputRequests, markupPreviews) {
        if (this._disposed) {
            return;
        }
        const widgets = coalesce(outputRequests.map((request) => {
            const outputCache = this.insetMapping.get(request.output);
            if (!outputCache) {
                return;
            }
            if (!request.forceDisplay && !this.shouldUpdateInset(request.cell, request.output, request.cellTop, request.outputOffset)) {
                return;
            }
            const id = outputCache.outputId;
            outputCache.cachedCreation.cellTop = request.cellTop;
            outputCache.cachedCreation.outputOffset = request.outputOffset;
            this.hiddenInsetMapping.delete(request.output);
            return {
                cellId: request.cell.id,
                outputId: id,
                cellTop: request.cellTop,
                outputOffset: request.outputOffset,
                forceDisplay: request.forceDisplay,
            };
        }));
        if (!widgets.length && !markupPreviews.length) {
            return;
        }
        this._sendMessageToWebview({
            type: 'view-scroll',
            widgets: widgets,
            markupCells: markupPreviews,
        });
    }
    async createMarkupPreview(initialization) {
        if (this._disposed) {
            return;
        }
        if (this.markupPreviewMapping.has(initialization.cellId)) {
            console.error('Trying to create markup preview that already exists');
            return;
        }
        this.markupPreviewMapping.set(initialization.cellId, initialization);
        this._sendMessageToWebview({
            type: 'createMarkupCell',
            cell: initialization
        });
    }
    async showMarkupPreview(newContent) {
        if (this._disposed) {
            return;
        }
        const entry = this.markupPreviewMapping.get(newContent.cellId);
        if (!entry) {
            return this.createMarkupPreview(newContent);
        }
        const sameContent = newContent.content === entry.content;
        const sameMetadata = (equals(newContent.metadata, entry.metadata));
        if (!sameContent || !sameMetadata || !entry.visible) {
            this._sendMessageToWebview({
                type: 'showMarkupCell',
                id: newContent.cellId,
                handle: newContent.cellHandle,
                // If the content has not changed, we still want to make sure the
                // preview is visible but don't need to send anything over
                content: sameContent ? undefined : newContent.content,
                top: newContent.offset,
                metadata: sameMetadata ? undefined : newContent.metadata
            });
        }
        entry.metadata = newContent.metadata;
        entry.content = newContent.content;
        entry.offset = newContent.offset;
        entry.visible = true;
    }
    async hideMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        const cellsToHide = [];
        for (const cellId of cellIds) {
            const entry = this.markupPreviewMapping.get(cellId);
            if (entry) {
                if (entry.visible) {
                    cellsToHide.push(cellId);
                    entry.visible = false;
                }
            }
        }
        if (cellsToHide.length) {
            this._sendMessageToWebview({
                type: 'hideMarkupCells',
                ids: cellsToHide
            });
        }
    }
    async unhideMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        const toUnhide = [];
        for (const cellId of cellIds) {
            const entry = this.markupPreviewMapping.get(cellId);
            if (entry) {
                if (!entry.visible) {
                    entry.visible = true;
                    toUnhide.push(cellId);
                }
            }
            else {
                console.error(`Trying to unhide a preview that does not exist: ${cellId}`);
            }
        }
        this._sendMessageToWebview({
            type: 'unhideMarkupCells',
            ids: toUnhide,
        });
    }
    async deleteMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        for (const id of cellIds) {
            if (!this.markupPreviewMapping.has(id)) {
                console.error(`Trying to delete a preview that does not exist: ${id}`);
            }
            this.markupPreviewMapping.delete(id);
        }
        if (cellIds.length) {
            this._sendMessageToWebview({
                type: 'deleteMarkupCell',
                ids: cellIds
            });
        }
    }
    async updateMarkupPreviewSelections(selectedCellsIds) {
        if (this._disposed) {
            return;
        }
        this._sendMessageToWebview({
            type: 'updateSelectedMarkupCells',
            selectedCellIds: selectedCellsIds.filter(id => this.markupPreviewMapping.has(id)),
        });
    }
    async initializeMarkup(cells) {
        if (this._disposed) {
            return;
        }
        this.initializeMarkupPromise?.p.complete();
        const requestId = UUID.generateUuid();
        this.initializeMarkupPromise = { p: new DeferredPromise(), requestId, isFirstInit: this.firstInit };
        this.firstInit = false;
        for (const cell of cells) {
            this.markupPreviewMapping.set(cell.cellId, cell);
        }
        this._sendMessageToWebview({
            type: 'initializeMarkup',
            cells,
            requestId,
        });
        return this.initializeMarkupPromise.p.p;
    }
    /**
     * Validate if cached inset is out of date and require a rerender
     * Note that it doesn't account for output content change.
     */
    _cachedInsetEqual(cachedInset, content) {
        if (content.type === 1 /* RenderOutputType.Extension */) {
            // Use a new renderer
            return cachedInset.renderer?.id === content.renderer.id;
        }
        else {
            // The new renderer is the default HTML renderer
            return cachedInset.cachedCreation.type === 'html';
        }
    }
    requestCreateOutputWhenWebviewIdle(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        if (this.insetMapping.has(content.source)) {
            return;
        }
        if (this.pendingWebviewIdleCreationRequest.has(content.source)) {
            return;
        }
        if (this.pendingWebviewIdleInsetMapping.has(content.source)) {
            // handled in renderer process, waiting for webview to process it when idle
            return;
        }
        this.pendingWebviewIdleCreationRequest.set(content.source, runWhenGlobalIdle(() => {
            const { message, renderer, transfer: transferable } = this._createOutputCreationMessage(cellInfo, content, cellTop, offset, true, true);
            this._sendMessageToWebview(message, transferable);
            this.pendingWebviewIdleInsetMapping.set(content.source, { outputId: message.outputId, versionId: content.source.model.versionId, cellInfo: cellInfo, renderer, cachedCreation: message });
            this.reversedPendingWebviewIdleInsetMapping.set(message.outputId, content.source);
            this.pendingWebviewIdleCreationRequest.delete(content.source);
        }));
    }
    createOutput(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        const cachedInset = this.insetMapping.get(content.source);
        // we now request to render the output immediately, so we can remove the pending request
        // dispose the pending request in renderer process if it exists
        this.pendingWebviewIdleCreationRequest.get(content.source)?.dispose();
        this.pendingWebviewIdleCreationRequest.delete(content.source);
        // if request has already been sent out, we then remove it from the pending mapping
        this.pendingWebviewIdleInsetMapping.delete(content.source);
        if (cachedInset) {
            this.reversedPendingWebviewIdleInsetMapping.delete(cachedInset.outputId);
        }
        if (cachedInset && this._cachedInsetEqual(cachedInset, content)) {
            this.hiddenInsetMapping.delete(content.source);
            this._sendMessageToWebview({
                type: 'showOutput',
                cellId: cachedInset.cellInfo.cellId,
                outputId: cachedInset.outputId,
                cellTop: cellTop,
                outputOffset: offset
            });
            return;
        }
        // create new output
        const { message, renderer, transfer: transferable } = this._createOutputCreationMessage(cellInfo, content, cellTop, offset, false, false);
        this._sendMessageToWebview(message, transferable);
        this.insetMapping.set(content.source, { outputId: message.outputId, versionId: content.source.model.versionId, cellInfo: cellInfo, renderer, cachedCreation: message });
        this.hiddenInsetMapping.delete(content.source);
        this.reversedInsetMapping.set(message.outputId, content.source);
    }
    createMetadata(output, mimeType) {
        if (mimeType.startsWith('image')) {
            const buffer = output.outputs.find(out => out.mime === 'text/plain')?.data.buffer;
            if (buffer?.length && buffer?.length > 0) {
                const altText = new TextDecoder().decode(buffer);
                return { ...output.metadata, vscode_altText: altText };
            }
        }
        return output.metadata;
    }
    _createOutputCreationMessage(cellInfo, content, cellTop, offset, createOnIdle, initiallyHidden) {
        const messageBase = {
            type: 'html',
            executionId: cellInfo.executionId,
            cellId: cellInfo.cellId,
            cellTop: cellTop,
            outputOffset: offset,
            left: 0,
            requiredPreloads: [],
            createOnIdle: createOnIdle
        };
        const transfer = [];
        let message;
        let renderer;
        if (content.type === 1 /* RenderOutputType.Extension */) {
            const output = content.source.model;
            renderer = content.renderer;
            const first = output.outputs.find(op => op.mime === content.mimeType);
            const metadata = this.createMetadata(output, content.mimeType);
            const valueBytes = copyBufferIfNeeded(first.data.buffer, transfer);
            message = {
                ...messageBase,
                outputId: output.outputId,
                rendererId: content.renderer.id,
                content: {
                    type: 1 /* RenderOutputType.Extension */,
                    outputId: output.outputId,
                    metadata: metadata,
                    output: {
                        mime: first.mime,
                        valueBytes,
                    },
                    allOutputs: output.outputs.map(output => ({ mime: output.mime })),
                },
                initiallyHidden: initiallyHidden
            };
        }
        else {
            message = {
                ...messageBase,
                outputId: UUID.generateUuid(),
                content: {
                    type: content.type,
                    htmlContent: content.htmlContent,
                },
                initiallyHidden: initiallyHidden
            };
        }
        return {
            message,
            renderer,
            transfer,
        };
    }
    updateOutput(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        if (!this.insetMapping.has(content.source)) {
            this.createOutput(cellInfo, content, cellTop, offset);
            return;
        }
        const outputCache = this.insetMapping.get(content.source);
        if (outputCache.versionId === content.source.model.versionId) {
            // already sent this output version to the renderer
            return;
        }
        this.hiddenInsetMapping.delete(content.source);
        let updatedContent = undefined;
        const transfer = [];
        if (content.type === 1 /* RenderOutputType.Extension */) {
            const output = content.source.model;
            const firstBuffer = output.outputs.find(op => op.mime === content.mimeType);
            const appenededData = output.appendedSinceVersion(outputCache.versionId, content.mimeType);
            const appended = appenededData ? { valueBytes: appenededData.buffer, previousVersion: outputCache.versionId } : undefined;
            const valueBytes = copyBufferIfNeeded(firstBuffer.data.buffer, transfer);
            updatedContent = {
                type: 1 /* RenderOutputType.Extension */,
                outputId: outputCache.outputId,
                metadata: output.metadata,
                output: {
                    mime: content.mimeType,
                    valueBytes,
                    appended: appended
                },
                allOutputs: output.outputs.map(output => ({ mime: output.mime }))
            };
        }
        this._sendMessageToWebview({
            type: 'showOutput',
            cellId: outputCache.cellInfo.cellId,
            outputId: outputCache.outputId,
            cellTop: cellTop,
            outputOffset: offset,
            content: updatedContent
        }, transfer);
        outputCache.versionId = content.source.model.versionId;
        return;
    }
    async copyImage(output) {
        this._sendMessageToWebview({
            type: 'copyImage',
            outputId: output.model.outputId,
            altOutputId: output.model.alternativeOutputId
        });
    }
    removeInsets(outputs) {
        if (this._disposed) {
            return;
        }
        for (const output of outputs) {
            const outputCache = this.insetMapping.get(output);
            if (!outputCache) {
                continue;
            }
            const id = outputCache.outputId;
            this._sendMessageToWebview({
                type: 'clearOutput',
                rendererId: outputCache.cachedCreation.rendererId,
                cellUri: outputCache.cellInfo.cellUri.toString(),
                outputId: id,
                cellId: outputCache.cellInfo.cellId
            });
            this.insetMapping.delete(output);
            this.pendingWebviewIdleCreationRequest.get(output)?.dispose();
            this.pendingWebviewIdleCreationRequest.delete(output);
            this.pendingWebviewIdleInsetMapping.delete(output);
            this.reversedPendingWebviewIdleInsetMapping.delete(id);
            this.reversedInsetMapping.delete(id);
        }
    }
    hideInset(output) {
        if (this._disposed) {
            return;
        }
        const outputCache = this.insetMapping.get(output);
        if (!outputCache) {
            return;
        }
        this.hiddenInsetMapping.add(output);
        this._sendMessageToWebview({
            type: 'hideOutput',
            outputId: outputCache.outputId,
            cellId: outputCache.cellInfo.cellId,
        });
    }
    focusWebview() {
        if (this._disposed) {
            return;
        }
        this.webview?.focus();
    }
    selectOutputContents(cell) {
        if (this._disposed) {
            return;
        }
        const output = cell.outputsViewModels.find(o => o.model.outputId === cell.focusedOutputId);
        const outputId = output ? this.insetMapping.get(output)?.outputId : undefined;
        this._sendMessageToWebview({
            type: 'select-output-contents',
            cellOrOutputId: outputId || cell.id
        });
    }
    selectInputContents(cell) {
        if (this._disposed) {
            return;
        }
        const output = cell.outputsViewModels.find(o => o.model.outputId === cell.focusedOutputId);
        const outputId = output ? this.insetMapping.get(output)?.outputId : undefined;
        this._sendMessageToWebview({
            type: 'select-input-contents',
            cellOrOutputId: outputId || cell.id
        });
    }
    focusOutput(cellOrOutputId, alternateId, viewFocused) {
        if (this._disposed) {
            return;
        }
        if (!viewFocused) {
            this.webview?.focus();
        }
        this._sendMessageToWebview({
            type: 'focus-output',
            cellOrOutputId: cellOrOutputId,
            alternateId: alternateId
        });
    }
    blurOutput() {
        if (this._disposed) {
            return;
        }
        this._sendMessageToWebview({
            type: 'blur-output'
        });
    }
    async find(query, options) {
        if (query === '') {
            this._sendMessageToWebview({
                type: 'findStop',
                ownerID: options.ownerID
            });
            return [];
        }
        const p = new Promise(resolve => {
            const sub = this.webview?.onMessage(e => {
                if (e.message.type === 'didFind') {
                    resolve(e.message.matches);
                    sub?.dispose();
                }
            });
        });
        this._sendMessageToWebview({
            type: 'find',
            query: query,
            options
        });
        const ret = await p;
        return ret;
    }
    findStop(ownerID) {
        this._sendMessageToWebview({
            type: 'findStop',
            ownerID
        });
    }
    async findHighlightCurrent(index, ownerID) {
        const p = new Promise(resolve => {
            const sub = this.webview?.onMessage(e => {
                if (e.message.type === 'didFindHighlightCurrent') {
                    resolve(e.message.offset);
                    sub?.dispose();
                }
            });
        });
        this._sendMessageToWebview({
            type: 'findHighlightCurrent',
            index,
            ownerID
        });
        const ret = await p;
        return ret;
    }
    async findUnHighlightCurrent(index, ownerID) {
        this._sendMessageToWebview({
            type: 'findUnHighlightCurrent',
            index,
            ownerID
        });
    }
    deltaCellOutputContainerClassNames(cellId, added, removed) {
        this._sendMessageToWebview({
            type: 'decorations',
            cellId,
            addedClassNames: added,
            removedClassNames: removed
        });
    }
    deltaMarkupPreviewClassNames(cellId, added, removed) {
        if (this.markupPreviewMapping.get(cellId)) {
            this._sendMessageToWebview({
                type: 'markupDecorations',
                cellId,
                addedClassNames: added,
                removedClassNames: removed
            });
        }
    }
    updateOutputRenderers() {
        if (!this.webview) {
            return;
        }
        const renderersData = this.getRendererData();
        this.localResourceRootsCache = this._getResourceRootsCache();
        const mixedResourceRoots = [
            ...(this.localResourceRootsCache || []),
            ...(this._currentKernel ? [this._currentKernel.localResourceRoot] : []),
        ];
        this.webview.localResourcesRoot = mixedResourceRoots;
        this._sendMessageToWebview({
            type: 'updateRenderers',
            rendererData: renderersData
        });
    }
    async updateKernelPreloads(kernel) {
        if (this._disposed || kernel === this._currentKernel) {
            return;
        }
        const previousKernel = this._currentKernel;
        this._currentKernel = kernel;
        if (previousKernel && previousKernel.preloadUris.length > 0) {
            this.webview?.reload(); // preloads will be restored after reload
        }
        else if (kernel) {
            this._updatePreloadsFromKernel(kernel);
        }
    }
    _updatePreloadsFromKernel(kernel) {
        const resources = [];
        for (const preload of kernel.preloadUris) {
            const uri = this.environmentService.isExtensionDevelopment && (preload.scheme === 'http' || preload.scheme === 'https')
                ? preload : this.asWebviewUri(preload, undefined);
            if (!this._preloadsCache.has(uri.toString())) {
                resources.push({ uri: uri.toString(), originalUri: preload.toString() });
                this._preloadsCache.add(uri.toString());
            }
        }
        if (!resources.length) {
            return;
        }
        this._updatePreloads(resources);
    }
    _updatePreloads(resources) {
        if (!this.webview) {
            return;
        }
        const mixedResourceRoots = [
            ...(this.localResourceRootsCache || []),
            ...(this._currentKernel ? [this._currentKernel.localResourceRoot] : []),
        ];
        this.webview.localResourcesRoot = mixedResourceRoots;
        this._sendMessageToWebview({
            type: 'preload',
            resources: resources,
        });
    }
    _sendMessageToWebview(message, transfer) {
        if (this._disposed) {
            return;
        }
        this.webview?.postMessage(message, transfer);
    }
    dispose() {
        this._disposed = true;
        this.webview?.dispose();
        this.webview = undefined;
        this.notebookEditor = null;
        this.insetMapping.clear();
        this.pendingWebviewIdleCreationRequest.clear();
        super.dispose();
    }
};
BackLayerWebView = BackLayerWebView_1 = __decorate([
    __param(6, IWebviewService),
    __param(7, IOpenerService),
    __param(8, INotebookService),
    __param(9, IWorkspaceContextService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IFileDialogService),
    __param(12, IFileService),
    __param(13, IContextMenuService),
    __param(14, IContextKeyService),
    __param(15, IWorkspaceTrustManagementService),
    __param(16, IConfigurationService),
    __param(17, ILanguageService),
    __param(18, IWorkspaceContextService),
    __param(19, IEditorGroupsService),
    __param(20, IStorageService),
    __param(21, IPathService),
    __param(22, INotebookLoggingService),
    __param(23, IThemeService),
    __param(24, ITelemetryService)
], BackLayerWebView);
export { BackLayerWebView };
function copyBufferIfNeeded(buffer, transfer) {
    if (buffer.byteLength === buffer.buffer.byteLength) {
        // No copy needed but we can't transfer either
        return buffer;
    }
    else {
        // The buffer is smaller than its backing array buffer.
        // Create a copy to avoid sending the entire array buffer.
        const valueBytes = new Uint8Array(buffer);
        transfer.push(valueBytes.buffer);
        return valueBytes;
    }
}
function getTokenizationCss() {
    const colorMap = TokenizationRegistry.getColorMap();
    const tokenizationCss = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
    return tokenizationCss;
}
function tryDecodeURIComponent(uri) {
    try {
        return decodeURIComponent(uri);
    }
    catch {
        return uri;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja0xheWVyV2ViVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9yZW5kZXJlcnMvYmFja0xheWVyV2ViVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBSWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxLQUFLLElBQUksTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RCxPQUFP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