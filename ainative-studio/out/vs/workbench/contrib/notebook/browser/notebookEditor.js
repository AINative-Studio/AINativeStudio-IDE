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
var NotebookEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { toAction } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ByteSize, IFileService, TooLargeFileOperationError } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, createEditorOpenError, createTooLargeFileError, isEditorOpenError } from '../../../common/editor.js';
import { SELECT_KERNEL_ID } from './controller/coreActions.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { NotebooKernelActionViewItem } from './viewParts/notebookKernelView.js';
import { CellKind, NOTEBOOK_EDITOR_ID, NotebookWorkingCopyTypeIdentifier } from '../common/notebookCommon.js';
import { NotebookEditorInput } from '../common/notebookEditorInput.js';
import { NotebookPerfMarks } from '../common/notebookPerformance.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { InstallRecommendedExtensionAction } from '../../extensions/browser/extensionsActions.js';
import { INotebookService } from '../common/notebookService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
const NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'NotebookEditorViewState';
let NotebookEditor = class NotebookEditor extends EditorPane {
    static { NotebookEditor_1 = this; }
    static { this.ID = NOTEBOOK_EDITOR_ID; }
    get onDidFocus() { return this._onDidFocusWidget.event; }
    get onDidBlur() { return this._onDidBlurWidget.event; }
    constructor(group, telemetryService, themeService, _instantiationService, storageService, _editorService, _editorGroupService, _notebookWidgetService, _contextKeyService, _fileService, configurationService, _editorProgressService, _notebookService, _extensionsWorkbenchService, _workingCopyBackupService, logService, _preferencesService) {
        super(NotebookEditor_1.ID, group, telemetryService, themeService, storageService);
        this._instantiationService = _instantiationService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._notebookWidgetService = _notebookWidgetService;
        this._contextKeyService = _contextKeyService;
        this._fileService = _fileService;
        this._editorProgressService = _editorProgressService;
        this._notebookService = _notebookService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._workingCopyBackupService = _workingCopyBackupService;
        this.logService = logService;
        this._preferencesService = _preferencesService;
        this._groupListener = this._register(new DisposableStore());
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._widget = { value: undefined };
        this._inputListener = this._register(new MutableDisposable());
        // override onDidFocus and onDidBlur to be based on the NotebookEditorWidget element
        this._onDidFocusWidget = this._register(new Emitter());
        this._onDidBlurWidget = this._register(new Emitter());
        this._onDidChangeModel = this._register(new Emitter());
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this._editorMemento = this.getEditorMemento(_editorGroupService, configurationService, NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY);
        this._register(this._fileService.onDidChangeFileSystemProviderCapabilities(e => this._onDidChangeFileSystemProvider(e.scheme)));
        this._register(this._fileService.onDidChangeFileSystemProviderRegistrations(e => this._onDidChangeFileSystemProvider(e.scheme)));
    }
    _onDidChangeFileSystemProvider(scheme) {
        if (this.input instanceof NotebookEditorInput && this.input.resource?.scheme === scheme) {
            this._updateReadonly(this.input);
        }
    }
    _onDidChangeInputCapabilities(input) {
        if (this.input === input) {
            this._updateReadonly(input);
        }
    }
    _updateReadonly(input) {
        this._widget.value?.setOptions({ isReadOnly: !!input.isReadonly() });
    }
    get textModel() {
        return this._widget.value?.textModel;
    }
    get minimumWidth() { return 220; }
    get maximumWidth() { return Number.POSITIVE_INFINITY; }
    // these setters need to exist because this extends from EditorPane
    set minimumWidth(value) { }
    set maximumWidth(value) { }
    //#region Editor Core
    get scopedContextKeyService() {
        return this._widget.value?.scopedContextKeyService;
    }
    createEditor(parent) {
        this._rootElement = DOM.append(parent, DOM.$('.notebook-editor'));
        this._rootElement.id = `notebook-editor-element-${generateUuid()}`;
    }
    getActionViewItem(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            // this is being disposed by the consumer
            return this._register(this._instantiationService.createInstance(NotebooKernelActionViewItem, action, this, options));
        }
        return undefined;
    }
    getControl() {
        return this._widget.value;
    }
    setVisible(visible) {
        super.setVisible(visible);
        if (!visible) {
            this._widget.value?.onWillHide();
        }
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this._groupListener.clear();
        this._groupListener.add(this.group.onWillCloseEditor(e => this._saveEditorViewState(e.editor)));
        this._groupListener.add(this.group.onDidModelChange(() => {
            if (this._editorGroupService.activeGroup !== this.group) {
                this._widget?.value?.updateEditorFocus();
            }
        }));
        if (!visible) {
            this._saveEditorViewState(this.input);
            if (this.input && this._widget.value) {
                // the widget is not transfered to other editor inputs
                this._widget.value.onWillHide();
            }
        }
    }
    focus() {
        super.focus();
        this._widget.value?.focus();
    }
    hasFocus() {
        const value = this._widget.value;
        if (!value) {
            return false;
        }
        return !!value && (DOM.isAncestorOfActiveElement(value.getDomNode() || DOM.isAncestorOfActiveElement(value.getOverflowContainerDomNode())));
    }
    async setInput(input, options, context, token, noRetry) {
        try {
            let perfMarksCaptured = false;
            const fileOpenMonitor = timeout(10000);
            fileOpenMonitor.then(() => {
                perfMarksCaptured = true;
                this._handlePerfMark(perf, input);
            });
            const perf = new NotebookPerfMarks();
            perf.mark('startTime');
            this._inputListener.value = input.onDidChangeCapabilities(() => this._onDidChangeInputCapabilities(input));
            this._widgetDisposableStore.clear();
            // there currently is a widget which we still own so
            // we need to hide it before getting a new widget
            this._widget.value?.onWillHide();
            this._widget = this._instantiationService.invokeFunction(this._notebookWidgetService.retrieveWidget, this.group.id, input, undefined, this._pagePosition?.dimension, this.window);
            if (this._rootElement && this._widget.value.getDomNode()) {
                this._rootElement.setAttribute('aria-flowto', this._widget.value.getDomNode().id || '');
                DOM.setParentFlowTo(this._widget.value.getDomNode(), this._rootElement);
            }
            this._widgetDisposableStore.add(this._widget.value.onDidChangeModel(() => this._onDidChangeModel.fire()));
            this._widgetDisposableStore.add(this._widget.value.onDidChangeActiveCell(() => this._onDidChangeSelection.fire({ reason: 2 /* EditorPaneSelectionChangeReason.USER */ })));
            if (this._pagePosition) {
                this._widget.value.layout(this._pagePosition.dimension, this._rootElement, this._pagePosition.position);
            }
            // only now `setInput` and yield/await. this is AFTER the actual widget is ready. This is very important
            // so that others synchronously receive a notebook editor with the correct widget being set
            await super.setInput(input, options, context, token);
            const model = await input.resolve(options, perf);
            perf.mark('inputLoaded');
            // Check for cancellation
            if (token.isCancellationRequested) {
                return undefined;
            }
            // The widget has been taken away again. This can happen when the tab has been closed while
            // loading was in progress, in particular when open the same resource as different view type.
            // When this happen, retry once
            if (!this._widget.value) {
                if (noRetry) {
                    return undefined;
                }
                return this.setInput(input, options, context, token, true);
            }
            if (model === null) {
                const knownProvider = this._notebookService.getViewTypeProvider(input.viewType);
                if (!knownProvider) {
                    throw new Error(localize('fail.noEditor', "Cannot open resource with notebook editor type '{0}', please check if you have the right extension installed and enabled.", input.viewType));
                }
                await this._extensionsWorkbenchService.whenInitialized;
                const extensionInfo = this._extensionsWorkbenchService.local.find(e => e.identifier.id === knownProvider);
                throw createEditorOpenError(new Error(localize('fail.noEditor.extensionMissing', "Cannot open resource with notebook editor type '{0}', please check if you have the right extension installed and enabled.", input.viewType)), [
                    toAction({
                        id: 'workbench.notebook.action.installOrEnableMissing', label: extensionInfo
                            ? localize('notebookOpenEnableMissingViewType', "Enable extension for '{0}'", input.viewType)
                            : localize('notebookOpenInstallMissingViewType', "Install extension for '{0}'", input.viewType),
                        run: async () => {
                            const d = this._notebookService.onAddViewType(viewType => {
                                if (viewType === input.viewType) {
                                    // serializer is registered, try to open again
                                    this._editorService.openEditor({ resource: input.resource });
                                    d.dispose();
                                }
                            });
                            const extensionInfo = this._extensionsWorkbenchService.local.find(e => e.identifier.id === knownProvider);
                            try {
                                if (extensionInfo) {
                                    await this._extensionsWorkbenchService.setEnablement(extensionInfo, extensionInfo.enablementState === 10 /* EnablementState.DisabledWorkspace */ ? 12 /* EnablementState.EnabledWorkspace */ : 11 /* EnablementState.EnabledGlobally */);
                                }
                                else {
                                    await this._instantiationService.createInstance(InstallRecommendedExtensionAction, knownProvider).run();
                                }
                            }
                            catch (ex) {
                                this.logService.error(`Failed to install or enable extension ${knownProvider}`, ex);
                                d.dispose();
                            }
                        }
                    }),
                    toAction({
                        id: 'workbench.notebook.action.openAsText', label: localize('notebookOpenAsText', "Open As Text"), run: async () => {
                            const backup = await this._workingCopyBackupService.resolve({ resource: input.resource, typeId: NotebookWorkingCopyTypeIdentifier.create(input.viewType) });
                            if (backup) {
                                // with a backup present, we must resort to opening the backup contents
                                // as untitled text file to not show the wrong data to the user
                                const contents = await streamToBuffer(backup.value);
                                this._editorService.openEditor({ resource: undefined, contents: contents.toString() });
                            }
                            else {
                                // without a backup present, we can open the original resource
                                this._editorService.openEditor({ resource: input.resource, options: { override: DEFAULT_EDITOR_ASSOCIATION.id, pinned: true } });
                            }
                        }
                    })
                ], { allowDialog: true });
            }
            this._widgetDisposableStore.add(model.notebook.onDidChangeContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
            const viewState = options?.viewState ?? this._loadNotebookEditorViewState(input);
            // We might be moving the notebook widget between groups, and these services are tied to the group
            this._widget.value.setParentContextKeyService(this._contextKeyService);
            this._widget.value.setEditorProgressService(this._editorProgressService);
            await this._widget.value.setModel(model.notebook, viewState, perf);
            const isReadOnly = !!input.isReadonly();
            await this._widget.value.setOptions({ ...options, isReadOnly });
            this._widgetDisposableStore.add(this._widget.value.onDidFocusWidget(() => this._onDidFocusWidget.fire()));
            this._widgetDisposableStore.add(this._widget.value.onDidBlurWidget(() => this._onDidBlurWidget.fire()));
            this._widgetDisposableStore.add(this._editorGroupService.createEditorDropTarget(this._widget.value.getDomNode(), {
                containsGroup: (group) => this.group.id === group.id
            }));
            this._widgetDisposableStore.add(this._widget.value.onDidScroll(() => { this._onDidChangeScroll.fire(); }));
            perf.mark('editorLoaded');
            fileOpenMonitor.cancel();
            if (perfMarksCaptured) {
                return;
            }
            this._handlePerfMark(perf, input, model.notebook);
            this._onDidChangeControl.fire();
        }
        catch (e) {
            this.logService.warn('NotebookEditorWidget#setInput failed', e);
            if (isEditorOpenError(e)) {
                throw e;
            }
            // Handle case where a file is too large to open without confirmation
            if (e.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
                let message;
                if (e instanceof TooLargeFileOperationError) {
                    message = localize('notebookTooLargeForHeapErrorWithSize', "The notebook is not displayed in the notebook editor because it is very large ({0}).", ByteSize.formatSize(e.size));
                }
                else {
                    message = localize('notebookTooLargeForHeapErrorWithoutSize', "The notebook is not displayed in the notebook editor because it is very large.");
                }
                throw createTooLargeFileError(this.group, input, options, message, this._preferencesService);
            }
            const error = createEditorOpenError(e instanceof Error ? e : new Error((e ? e.message : '')), [
                toAction({
                    id: 'workbench.notebook.action.openInTextEditor', label: localize('notebookOpenInTextEditor', "Open in Text Editor"), run: async () => {
                        const activeEditorPane = this._editorService.activeEditorPane;
                        if (!activeEditorPane) {
                            return;
                        }
                        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
                        if (!activeEditorResource) {
                            return;
                        }
                        if (activeEditorResource.toString() === input.resource?.toString()) {
                            // Replace the current editor with the text editor
                            return this._editorService.openEditor({
                                resource: activeEditorResource,
                                options: {
                                    override: DEFAULT_EDITOR_ASSOCIATION.id,
                                    pinned: true // new file gets pinned by default
                                }
                            });
                        }
                        return;
                    }
                })
            ], { allowDialog: true });
            throw error;
        }
    }
    _handlePerfMark(perf, input, notebook) {
        const perfMarks = perf.value;
        const startTime = perfMarks['startTime'];
        const extensionActivated = perfMarks['extensionActivated'];
        const inputLoaded = perfMarks['inputLoaded'];
        const webviewCommLoaded = perfMarks['webviewCommLoaded'];
        const customMarkdownLoaded = perfMarks['customMarkdownLoaded'];
        const editorLoaded = perfMarks['editorLoaded'];
        let extensionActivationTimespan = -1;
        let inputLoadingTimespan = -1;
        let webviewCommLoadingTimespan = -1;
        let customMarkdownLoadingTimespan = -1;
        let editorLoadingTimespan = -1;
        if (startTime !== undefined && extensionActivated !== undefined) {
            extensionActivationTimespan = extensionActivated - startTime;
            if (inputLoaded !== undefined) {
                inputLoadingTimespan = inputLoaded - extensionActivated;
            }
            if (webviewCommLoaded !== undefined) {
                webviewCommLoadingTimespan = webviewCommLoaded - extensionActivated;
            }
            if (customMarkdownLoaded !== undefined) {
                customMarkdownLoadingTimespan = customMarkdownLoaded - startTime;
            }
            if (editorLoaded !== undefined) {
                editorLoadingTimespan = editorLoaded - startTime;
            }
        }
        // Notebook information
        let codeCellCount = undefined;
        let mdCellCount = undefined;
        let outputCount = undefined;
        let outputBytes = undefined;
        let codeLength = undefined;
        let markdownLength = undefined;
        let notebookStatsLoaded = undefined;
        if (notebook) {
            const stopWatch = new StopWatch();
            for (const cell of notebook.cells) {
                if (cell.cellKind === CellKind.Code) {
                    codeCellCount = (codeCellCount || 0) + 1;
                    codeLength = (codeLength || 0) + cell.getTextLength();
                    outputCount = (outputCount || 0) + cell.outputs.length;
                    outputBytes = (outputBytes || 0) + cell.outputs.reduce((prev, cur) => prev + cur.outputs.reduce((size, item) => size + item.data.byteLength, 0), 0);
                }
                else {
                    mdCellCount = (mdCellCount || 0) + 1;
                    markdownLength = (codeLength || 0) + cell.getTextLength();
                }
            }
            notebookStatsLoaded = stopWatch.elapsed();
        }
        this.logService.trace(`[NotebookEditor] open notebook perf ${notebook?.uri.toString() ?? ''} - extensionActivation: ${extensionActivationTimespan}, inputLoad: ${inputLoadingTimespan}, webviewComm: ${webviewCommLoadingTimespan}, customMarkdown: ${customMarkdownLoadingTimespan}, editorLoad: ${editorLoadingTimespan}`);
        this.telemetryService.publicLog2('notebook/editorOpenPerf', {
            scheme: input.resource.scheme,
            ext: extname(input.resource),
            viewType: input.viewType,
            extensionActivated: extensionActivationTimespan,
            inputLoaded: inputLoadingTimespan,
            webviewCommLoaded: webviewCommLoadingTimespan,
            customMarkdownLoaded: customMarkdownLoadingTimespan,
            editorLoaded: editorLoadingTimespan,
            codeCellCount,
            mdCellCount,
            outputCount,
            outputBytes,
            codeLength,
            markdownLength,
            notebookStatsLoaded
        });
    }
    clearInput() {
        this._inputListener.clear();
        if (this._widget.value) {
            this._saveEditorViewState(this.input);
            this._widget.value.onWillHide();
        }
        super.clearInput();
    }
    setOptions(options) {
        this._widget.value?.setOptions(options);
        super.setOptions(options);
    }
    saveState() {
        this._saveEditorViewState(this.input);
        super.saveState();
    }
    getViewState() {
        const input = this.input;
        if (!(input instanceof NotebookEditorInput)) {
            return undefined;
        }
        this._saveEditorViewState(input);
        return this._loadNotebookEditorViewState(input);
    }
    getSelection() {
        if (this._widget.value) {
            const activeCell = this._widget.value.getActiveCell();
            if (activeCell) {
                const cellUri = activeCell.uri;
                return new NotebookEditorSelection(cellUri, activeCell.getSelections());
            }
        }
        return undefined;
    }
    getScrollPosition() {
        const widget = this.getControl();
        if (!widget) {
            throw new Error('Notebook widget has not yet been initialized');
        }
        return {
            scrollTop: widget.scrollTop,
            scrollLeft: 0,
        };
    }
    setScrollPosition(scrollPosition) {
        const editor = this.getControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        editor.setScrollTop(scrollPosition.scrollTop);
    }
    _saveEditorViewState(input) {
        if (this._widget.value && input instanceof NotebookEditorInput) {
            if (this._widget.value.isDisposed) {
                return;
            }
            const state = this._widget.value.getEditorViewState();
            this._editorMemento.saveEditorState(this.group, input.resource, state);
        }
    }
    _loadNotebookEditorViewState(input) {
        const result = this._editorMemento.loadEditorState(this.group, input.resource);
        if (result) {
            return result;
        }
        // when we don't have a view state for the group/input-tuple then we try to use an existing
        // editor for the same resource.
        for (const group of this._editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group.activeEditorPane !== this && group.activeEditorPane instanceof NotebookEditor_1 && group.activeEditor?.matches(input)) {
                return group.activeEditorPane._widget.value?.getEditorViewState();
            }
        }
        return;
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        this._pagePosition = { dimension, position };
        if (!this._widget.value || !(this.input instanceof NotebookEditorInput)) {
            return;
        }
        if (this.input.resource.toString() !== this.textModel?.uri.toString() && this._widget.value?.hasModel()) {
            // input and widget mismatch
            // this happens when
            // 1. open document A, pin the document
            // 2. open document B
            // 3. close document B
            // 4. a layout is triggered
            return;
        }
        if (this.isVisible()) {
            this._widget.value.layout(dimension, this._rootElement, position);
        }
    }
};
NotebookEditor = NotebookEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IEditorGroupsService),
    __param(7, INotebookEditorService),
    __param(8, IContextKeyService),
    __param(9, IFileService),
    __param(10, ITextResourceConfigurationService),
    __param(11, IEditorProgressService),
    __param(12, INotebookService),
    __param(13, IExtensionsWorkbenchService),
    __param(14, IWorkingCopyBackupService),
    __param(15, ILogService),
    __param(16, IPreferencesService)
], NotebookEditor);
export { NotebookEditor };
class NotebookEditorSelection {
    constructor(cellUri, selections) {
        this.cellUri = cellUri;
        this.selections = selections;
    }
    compare(other) {
        if (!(other instanceof NotebookEditorSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (isEqual(this.cellUri, other.cellUri)) {
            return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
        }
        return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
    restore(options) {
        const notebookOptions = {
            cellOptions: {
                resource: this.cellUri,
                options: {
                    selection: this.selections[0]
                }
            }
        };
        Object.assign(notebookOptions, options);
        return notebookOptions;
    }
    log() {
        return this.cellUri.fragment;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxRQUFRLEVBQTJDLFlBQVksRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVB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