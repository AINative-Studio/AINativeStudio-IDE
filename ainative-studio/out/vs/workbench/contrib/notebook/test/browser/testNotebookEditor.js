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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL3Rlc3ROb3RlYm9va0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDeEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFD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