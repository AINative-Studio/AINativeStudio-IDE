/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { NotImplementedError } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../../../platform/clipboard/test/common/testClipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { IListService, ListService } from '../../../../../platform/list/browser/listService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
import { IWorkspaceTrustRequestService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { CellFocusMode } from '../../browser/notebookBrowser.js';
import { NotebookCellStatusBarService } from '../../browser/services/notebookCellStatusBarServiceImpl.js';
import { ListViewInfoAccessor, NotebookCellList } from '../../browser/view/notebookCellList.js';
import { NotebookEventDispatcher } from '../../browser/viewModel/eventDispatcher.js';
import { NotebookViewModel } from '../../browser/viewModel/notebookViewModelImpl.js';
import { ViewContext } from '../../browser/viewModel/viewContext.js';
import { NotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { INotebookCellStatusBarService } from '../../common/notebookCellStatusBarService.js';
import { CellUri, NotebookCellExecutionState, SelectionStateType } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { NotebookOptions } from '../../browser/notebookOptions.js';
import { TextModelResolverService } from '../../../../services/textmodelResolver/common/textModelResolverService.js';
import { TestLayoutService } from '../../../../test/browser/workbenchTestServices.js';
import { TestStorageService, TestWorkspaceTrustRequestService } from '../../../../test/common/workbenchTestServices.js';
import { FontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { EditorFontLigatures, EditorFontVariations } from '../../../../../editor/common/config/editorOptions.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { TestCodeEditorService } from '../../../../../editor/test/browser/editorTestServices.js';
import { INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory } from '../../browser/viewModel/notebookOutlineDataSourceFactory.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory } from '../../browser/viewModel/notebookOutlineEntryFactory.js';
import { IOutlineService } from '../../../../services/outline/browser/outline.js';
export class TestCell extends NotebookCellTextModel {
    constructor(viewType, handle, source, language, cellKind, outputs, languageService) {
        super(CellUri.generate(URI.parse('test:///fake/notebook'), handle), handle, source, language, Mimes.text, cellKind, outputs, undefined, undefined, undefined, { transientCellMetadata: {}, transientDocumentMetadata: {}, transientOutputs: false, cellContentMetadata: {} }, languageService);
        this.viewType = viewType;
        this.source = source;
    }
}
export class NotebookEditorTestModel extends EditorModel {
    get viewType() {
        return this._notebook.viewType;
    }
    get resource() {
        return this._notebook.uri;
    }
    get notebook() {
        return this._notebook;
    }
    constructor(_notebook) {
        super();
        this._notebook = _notebook;
        this._dirty = false;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this.onDidChangeOrphaned = Event.None;
        this.onDidChangeReadonly = Event.None;
        this.onDidRevertUntitled = Event.None;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        if (_notebook && _notebook.onDidChangeContent) {
            this._register(_notebook.onDidChangeContent(() => {
                this._dirty = true;
                this._onDidChangeDirty.fire();
                this._onDidChangeContent.fire();
            }));
        }
    }
    isReadonly() {
        return false;
    }
    isOrphaned() {
        return false;
    }
    hasAssociatedFilePath() {
        return false;
    }
    isDirty() {
        return this._dirty;
    }
    get hasErrorState() {
        return false;
    }
    isModified() {
        return this._dirty;
    }
    getNotebook() {
        return this._notebook;
    }
    async load() {
        return this;
    }
    async save() {
        if (this._notebook) {
            this._dirty = false;
            this._onDidChangeDirty.fire();
            this._onDidSave.fire({});
            // todo, flush all states
            return true;
        }
        return false;
    }
    saveAs() {
        throw new NotImplementedError();
    }
    revert() {
        throw new NotImplementedError();
    }
}
export function setupInstantiationService(disposables) {
    const instantiationService = disposables.add(new TestInstantiationService());
    const testThemeService = new TestThemeService();
    instantiationService.stub(ILanguageService, disposables.add(new LanguageService()));
    instantiationService.stub(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
    instantiationService.stub(IConfigurationService, new TestConfigurationService());
    instantiationService.stub(IThemeService, testThemeService);
    instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
    instantiationService.stub(IModelService, disposables.add(instantiationService.createInstance(ModelService)));
    instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
    instantiationService.stub(IContextKeyService, disposables.add(instantiationService.createInstance(ContextKeyService)));
    instantiationService.stub(IListService, disposables.add(instantiationService.createInstance(ListService)));
    instantiationService.stub(ILayoutService, new TestLayoutService());
    instantiationService.stub(ILogService, new NullLogService());
    instantiationService.stub(IClipboardService, TestClipboardService);
    instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
    instantiationService.stub(IWorkspaceTrustRequestService, disposables.add(new TestWorkspaceTrustRequestService(true)));
    instantiationService.stub(INotebookExecutionStateService, new TestNotebookExecutionStateService());
    instantiationService.stub(IKeybindingService, new MockKeybindingService());
    instantiationService.stub(INotebookCellStatusBarService, disposables.add(new NotebookCellStatusBarService()));
    instantiationService.stub(ICodeEditorService, disposables.add(new TestCodeEditorService(testThemeService)));
    instantiationService.stub(IOutlineService, new class extends mock() {
        registerOutlineCreator() { return { dispose() { } }; }
    });
    instantiationService.stub(INotebookCellOutlineDataSourceFactory, instantiationService.createInstance(NotebookCellOutlineDataSourceFactory));
    instantiationService.stub(INotebookOutlineEntryFactory, instantiationService.createInstance(NotebookOutlineEntryFactory));
    instantiationService.stub(ILanguageDetectionService, new class MockLanguageDetectionService {
        isEnabledForLanguage(languageId) {
            return false;
        }
        async detectLanguage(resource, supportedLangs) {
            return undefined;
        }
    });
    return instantiationService;
}
function _createTestNotebookEditor(instantiationService, disposables, cells) {
    const viewType = 'notebook';
    const notebook = disposables.add(instantiationService.createInstance(NotebookTextModel, viewType, URI.parse('test://test'), cells.map((cell) => {
        return {
            source: cell[0],
            mime: undefined,
            language: cell[1],
            cellKind: cell[2],
            outputs: cell[3] ?? [],
            metadata: cell[4]
        };
    }), {}, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false }));
    const model = disposables.add(new NotebookEditorTestModel(notebook));
    const notebookOptions = disposables.add(new NotebookOptions(mainWindow, false, undefined, instantiationService.get(IConfigurationService), instantiationService.get(INotebookExecutionStateService), instantiationService.get(ICodeEditorService)));
    const baseCellEditorOptions = new class extends mock() {
    };
    const viewContext = new ViewContext(notebookOptions, disposables.add(new NotebookEventDispatcher()), () => baseCellEditorOptions);
    const viewModel = disposables.add(instantiationService.createInstance(NotebookViewModel, viewType, model.notebook, viewContext, null, { isReadOnly: false }));
    const cellList = disposables.add(createNotebookCellList(instantiationService, disposables, viewContext));
    cellList.attachViewModel(viewModel);
    const listViewInfoAccessor = disposables.add(new ListViewInfoAccessor(cellList));
    let visibleRanges = [{ start: 0, end: 100 }];
    const id = Date.now().toString();
    const notebookEditor = new class extends mock() {
        constructor() {
            super(...arguments);
            this.notebookOptions = notebookOptions;
            this.onDidChangeModel = new Emitter().event;
            this.onDidChangeCellState = new Emitter().event;
            this.textModel = viewModel.notebookDocument;
            this.onDidChangeVisibleRanges = Event.None;
        }
        // eslint-disable-next-line local/code-must-use-super-dispose
        dispose() {
            viewModel.dispose();
        }
        getViewModel() {
            return viewModel;
        }
        hasModel() {
            return !!viewModel;
        }
        getLength() { return viewModel.length; }
        getFocus() { return viewModel.getFocus(); }
        getSelections() { return viewModel.getSelections(); }
        setFocus(focus) {
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: focus,
                selections: viewModel.getSelections()
            });
        }
        setSelections(selections) {
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: viewModel.getFocus(),
                selections: selections
            });
        }
        getViewIndexByModelIndex(index) { return listViewInfoAccessor.getViewIndex(viewModel.viewCells[index]); }
        getCellRangeFromViewRange(startIndex, endIndex) { return listViewInfoAccessor.getCellRangeFromViewRange(startIndex, endIndex); }
        revealCellRangeInView() { }
        setHiddenAreas(_ranges) {
            return cellList.setHiddenAreas(_ranges, true);
        }
        getActiveCell() {
            const elements = cellList.getFocusedElements();
            if (elements && elements.length) {
                return elements[0];
            }
            return undefined;
        }
        hasOutputTextSelection() {
            return false;
        }
        changeModelDecorations() { return null; }
        focusElement() { }
        setCellEditorSelection() { }
        async revealRangeInCenterIfOutsideViewportAsync() { }
        async layoutNotebookCell() { }
        async createOutput() { }
        async removeInset() { }
        async focusNotebookCell(cell, focusItem) {
            cell.focusMode = focusItem === 'editor' ? CellFocusMode.Editor
                : focusItem === 'output' ? CellFocusMode.Output
                    : CellFocusMode.Container;
        }
        cellAt(index) { return viewModel.cellAt(index); }
        getCellIndex(cell) { return viewModel.getCellIndex(cell); }
        getCellsInRange(range) { return viewModel.getCellsInRange(range); }
        getCellByHandle(handle) { return viewModel.getCellByHandle(handle); }
        getNextVisibleCellIndex(index) { return viewModel.getNextVisibleCellIndex(index); }
        getControl() { return this; }
        get onDidChangeSelection() { return viewModel.onDidChangeSelection; }
        get onDidChangeOptions() { return viewModel.onDidChangeOptions; }
        get onDidChangeViewCells() { return viewModel.onDidChangeViewCells; }
        async find(query, options) {
            const findMatches = viewModel.find(query, options).filter(match => match.length > 0);
            return findMatches;
        }
        deltaCellDecorations() { return []; }
        get visibleRanges() {
            return visibleRanges;
        }
        set visibleRanges(_ranges) {
            visibleRanges = _ranges;
        }
        getId() { return id; }
        setScrollTop(scrollTop) {
            cellList.scrollTop = scrollTop;
        }
        get scrollTop() {
            return cellList.scrollTop;
        }
        getLayoutInfo() {
            return {
                width: 0,
                height: 0,
                scrollHeight: cellList.getScrollHeight(),
                fontInfo: new FontInfo({
                    pixelRatio: 1,
                    fontFamily: 'mockFont',
                    fontWeight: 'normal',
                    fontSize: 14,
                    fontFeatureSettings: EditorFontLigatures.OFF,
                    fontVariationSettings: EditorFontVariations.OFF,
                    lineHeight: 19,
                    letterSpacing: 1.5,
                    isMonospace: true,
                    typicalHalfwidthCharacterWidth: 10,
                    typicalFullwidthCharacterWidth: 20,
                    canUseHalfwidthRightwardsArrow: true,
                    spaceWidth: 10,
                    middotWidth: 10,
                    wsmiddotWidth: 10,
                    maxDigitWidth: 10,
                }, true),
                stickyHeight: 0
            };
        }
    };
    return { editor: notebookEditor, viewModel };
}
export function createTestNotebookEditor(instantiationService, disposables, cells) {
    return _createTestNotebookEditor(instantiationService, disposables, cells);
}
export async function withTestNotebookDiffModel(originalCells, modifiedCells, callback) {
    const disposables = new DisposableStore();
    const instantiationService = setupInstantiationService(disposables);
    const originalNotebook = createTestNotebookEditor(instantiationService, disposables, originalCells);
    const modifiedNotebook = createTestNotebookEditor(instantiationService, disposables, modifiedCells);
    const originalResource = new class extends mock() {
        get notebook() {
            return originalNotebook.viewModel.notebookDocument;
        }
        get resource() {
            return originalNotebook.viewModel.notebookDocument.uri;
        }
    };
    const modifiedResource = new class extends mock() {
        get notebook() {
            return modifiedNotebook.viewModel.notebookDocument;
        }
        get resource() {
            return modifiedNotebook.viewModel.notebookDocument.uri;
        }
    };
    const model = new class extends mock() {
        get original() {
            return originalResource;
        }
        get modified() {
            return modifiedResource;
        }
    };
    const res = await callback(model, disposables, instantiationService);
    if (res instanceof Promise) {
        res.finally(() => {
            originalNotebook.editor.dispose();
            originalNotebook.viewModel.notebookDocument.dispose();
            originalNotebook.viewModel.dispose();
            modifiedNotebook.editor.dispose();
            modifiedNotebook.viewModel.notebookDocument.dispose();
            modifiedNotebook.viewModel.dispose();
            disposables.dispose();
        });
    }
    else {
        originalNotebook.editor.dispose();
        originalNotebook.viewModel.notebookDocument.dispose();
        originalNotebook.viewModel.dispose();
        modifiedNotebook.editor.dispose();
        modifiedNotebook.viewModel.notebookDocument.dispose();
        modifiedNotebook.viewModel.dispose();
        disposables.dispose();
    }
    return res;
}
export async function withTestNotebook(cells, callback, accessor) {
    const disposables = new DisposableStore();
    const instantiationService = accessor ?? setupInstantiationService(disposables);
    const notebookEditor = _createTestNotebookEditor(instantiationService, disposables, cells);
    return runWithFakedTimers({ useFakeTimers: true }, async () => {
        const res = await callback(notebookEditor.editor, notebookEditor.viewModel, disposables, instantiationService);
        if (res instanceof Promise) {
            res.finally(() => {
                notebookEditor.editor.dispose();
                notebookEditor.viewModel.dispose();
                notebookEditor.editor.textModel.dispose();
                disposables.dispose();
            });
        }
        else {
            notebookEditor.editor.dispose();
            notebookEditor.viewModel.dispose();
            notebookEditor.editor.textModel.dispose();
            disposables.dispose();
        }
        return res;
    });
}
export function createNotebookCellList(instantiationService, disposables, viewContext) {
    const delegate = {
        getHeight(element) { return element.getHeight(17); },
        getTemplateId() { return 'template'; }
    };
    const baseCellRenderTemplate = new class extends mock() {
    };
    const renderer = {
        templateId: 'template',
        renderTemplate() { return baseCellRenderTemplate; },
        renderElement() { },
        disposeTemplate() { }
    };
    const notebookOptions = !!viewContext ? viewContext.notebookOptions
        : disposables.add(new NotebookOptions(mainWindow, false, undefined, instantiationService.get(IConfigurationService), instantiationService.get(INotebookExecutionStateService), instantiationService.get(ICodeEditorService)));
    const cellList = disposables.add(instantiationService.createInstance(NotebookCellList, 'NotebookCellList', DOM.$('container'), notebookOptions, delegate, [renderer], instantiationService.get(IContextKeyService), {
        supportDynamicHeights: true,
        multipleSelectionSupport: true,
    }));
    return cellList;
}
export function valueBytesFromString(value) {
    return VSBuffer.fromString(value);
}
class TestCellExecution {
    constructor(notebook, cellHandle, onComplete) {
        this.notebook = notebook;
        this.cellHandle = cellHandle;
        this.onComplete = onComplete;
        this.state = NotebookCellExecutionState.Unconfirmed;
        this.didPause = false;
        this.isPaused = false;
    }
    confirm() {
    }
    update(updates) {
    }
    complete(complete) {
        this.onComplete();
    }
}
export class TestNotebookExecutionStateService {
    constructor() {
        this._executions = new ResourceMap();
        this.onDidChangeExecution = new Emitter().event;
        this.onDidChangeLastRunFailState = new Emitter().event;
    }
    forceCancelNotebookExecutions(notebookUri) {
    }
    getCellExecutionsForNotebook(notebook) {
        return [];
    }
    getCellExecution(cellUri) {
        return this._executions.get(cellUri);
    }
    createCellExecution(notebook, cellHandle) {
        const onComplete = () => this._executions.delete(CellUri.generate(notebook, cellHandle));
        const exe = new TestCellExecution(notebook, cellHandle, onComplete);
        this._executions.set(CellUri.generate(notebook, cellHandle), exe);
        return exe;
    }
    getCellExecutionsByHandleForNotebook(notebook) {
        return;
    }
    getLastFailedCellForNotebook(notebook) {
        return;
    }
    getLastCompletedCellForNotebook(notebook) {
        return;
    }
    getExecution(notebook) {
        return;
    }
    createExecution(notebook) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci90ZXN0Tm90ZWJvb2tFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FB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