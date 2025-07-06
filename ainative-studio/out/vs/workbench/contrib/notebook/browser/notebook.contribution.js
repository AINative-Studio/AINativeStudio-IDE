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
var NotebookContribution_1;
import { Schemas } from '../../../../base/common/network.js';
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { NotebookEditor } from './notebookEditor.js';
import { NotebookEditorInput } from '../common/notebookEditorInput.js';
import { INotebookService } from '../common/notebookService.js';
import { NotebookService } from './services/notebookServiceImpl.js';
import { CellKind, CellUri, NotebookWorkingCopyTypeIdentifier, NotebookSetting, NotebookCellsChangeType, NotebookMetadataUri } from '../common/notebookCommon.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { INotebookEditorModelResolverService } from '../common/notebookEditorModelResolverService.js';
import { NotebookDiffEditorInput } from '../common/notebookDiffEditorInput.js';
import { NotebookTextDiffEditor } from './diff/notebookDiffEditor.js';
import { INotebookEditorWorkerService } from '../common/services/notebookWorkerService.js';
import { NotebookEditorWorkerServiceImpl } from './services/notebookWorkerServiceImpl.js';
import { INotebookCellStatusBarService } from '../common/notebookCellStatusBarService.js';
import { NotebookCellStatusBarService } from './services/notebookCellStatusBarServiceImpl.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { NotebookEditorWidgetService } from './services/notebookEditorServiceImpl.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Event } from '../../../../base/common/event.js';
import { getFormattedOutputJSON, getStreamOutputData } from './diff/diffElementViewModel.js';
import { NotebookModelResolverServiceImpl } from '../common/notebookEditorModelResolverServiceImpl.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../common/notebookKernelService.js';
import { NotebookKernelService } from './services/notebookKernelServiceImpl.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkingCopyEditorService } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { NotebookRendererMessagingService } from './services/notebookRendererMessagingServiceImpl.js';
import { INotebookRendererMessagingService } from '../common/notebookRendererMessagingService.js';
import { INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory } from './viewModel/notebookOutlineDataSourceFactory.js';
// Editor Controller
import './controller/coreActions.js';
import './controller/insertCellActions.js';
import './controller/executeActions.js';
import './controller/sectionActions.js';
import './controller/layoutActions.js';
import './controller/editActions.js';
import './controller/cellOutputActions.js';
import './controller/apiActions.js';
import './controller/foldingController.js';
import './controller/chat/notebook.chat.contribution.js';
import './controller/variablesActions.js';
// Editor Contribution
import './contrib/editorHint/emptyCellEditorHint.js';
import './contrib/clipboard/notebookClipboard.js';
import './contrib/find/notebookFind.js';
import './contrib/format/formatting.js';
import './contrib/saveParticipants/saveParticipants.js';
import './contrib/gettingStarted/notebookGettingStarted.js';
import './contrib/layout/layoutActions.js';
import './contrib/marker/markerProvider.js';
import './contrib/navigation/arrow.js';
import './contrib/outline/notebookOutline.js';
import './contrib/profile/notebookProfile.js';
import './contrib/cellStatusBar/statusBarProviders.js';
import './contrib/cellStatusBar/contributedStatusBarItemController.js';
import './contrib/cellStatusBar/executionStatusBarItemController.js';
import './contrib/editorStatusBar/editorStatusBar.js';
import './contrib/undoRedo/notebookUndoRedo.js';
import './contrib/cellCommands/cellCommands.js';
import './contrib/viewportWarmup/viewportWarmup.js';
import './contrib/troubleshoot/layout.js';
import './contrib/debug/notebookBreakpoints.js';
import './contrib/debug/notebookCellPausing.js';
import './contrib/debug/notebookDebugDecorations.js';
import './contrib/execute/executionEditorProgress.js';
import './contrib/kernelDetection/notebookKernelDetection.js';
import './contrib/cellDiagnostics/cellDiagnostics.js';
import './contrib/multicursor/notebookMulticursor.js';
import './contrib/multicursor/notebookSelectionHighlight.js';
import './contrib/notebookVariables/notebookInlineVariables.js';
// Diff Editor Contribution
import './diff/notebookDiffActions.js';
// Services
import { editorOptionsRegistry } from '../../../../editor/common/config/editorOptions.js';
import { NotebookExecutionStateService } from './services/notebookExecutionStateServiceImpl.js';
import { NotebookExecutionService } from './services/notebookExecutionServiceImpl.js';
import { INotebookExecutionService } from '../common/notebookExecutionService.js';
import { INotebookKeymapService } from '../common/notebookKeymapService.js';
import { NotebookKeymapService } from './services/notebookKeymapServiceImpl.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { INotebookExecutionStateService } from '../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { COMMENTEDITOR_DECORATION_KEY } from '../../comments/browser/commentReply.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { NotebookKernelHistoryService } from './services/notebookKernelHistoryServiceImpl.js';
import { INotebookLoggingService } from '../common/notebookLoggingService.js';
import { NotebookLoggingService } from './services/notebookLoggingServiceImpl.js';
import product from '../../../../platform/product/common/product.js';
import { NotebookVariables } from './contrib/notebookVariables/notebookVariables.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { NotebookAccessibilityHelp } from './notebookAccessibilityHelp.js';
import { NotebookAccessibleView } from './notebookAccessibleView.js';
import { DefaultFormatter } from '../../format/browser/formatActionsMultiple.js';
import { NotebookMultiTextDiffEditor } from './diff/notebookMultiDiffEditor.js';
import { NotebookMultiDiffEditorInput } from './diff/notebookMultiDiffEditorInput.js';
import { getFormattedMetadataJSON } from '../common/model/notebookCellTextModel.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory } from './viewModel/notebookOutlineEntryFactory.js';
import { getFormattedNotebookMetadataJSON } from '../common/model/notebookMetadataTextModel.js';
/*--------------------------------------------------------------------------------------------- */
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookEditor, NotebookEditor.ID, 'Notebook Editor'), [
    new SyncDescriptor(NotebookEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookTextDiffEditor, NotebookTextDiffEditor.ID, 'Notebook Diff Editor'), [
    new SyncDescriptor(NotebookDiffEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookMultiTextDiffEditor, NotebookMultiTextDiffEditor.ID, 'Notebook Diff Editor'), [
    new SyncDescriptor(NotebookMultiDiffEditorInput)
]);
let NotebookDiffEditorSerializer = class NotebookDiffEditorSerializer {
    constructor(_configurationService) {
        this._configurationService = _configurationService;
    }
    canSerialize() {
        return true;
    }
    serialize(input) {
        assertType(input instanceof NotebookDiffEditorInput);
        return JSON.stringify({
            resource: input.resource,
            originalResource: input.original.resource,
            name: input.getName(),
            originalName: input.original.getName(),
            textDiffName: input.getName(),
            viewType: input.viewType,
        });
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, originalResource, name, viewType } = data;
        if (!data || !URI.isUri(resource) || !URI.isUri(originalResource) || typeof name !== 'string' || typeof viewType !== 'string') {
            return undefined;
        }
        if (this._configurationService.getValue('notebook.experimental.enableNewDiffEditor')) {
            return NotebookMultiDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
        else {
            return NotebookDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
    }
    static canResolveBackup(editorInput, backupResource) {
        return false;
    }
};
NotebookDiffEditorSerializer = __decorate([
    __param(0, IConfigurationService)
], NotebookDiffEditorSerializer);
class NotebookEditorSerializer {
    canSerialize(input) {
        return input.typeId === NotebookEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof NotebookEditorInput);
        const data = {
            resource: input.resource,
            preferredResource: input.preferredResource,
            viewType: input.viewType,
            options: input.options
        };
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, preferredResource, viewType, options } = data;
        if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
            return undefined;
        }
        const input = NotebookEditorInput.getOrCreate(instantiationService, resource, preferredResource, viewType, options);
        return input;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookEditorInput.ID, NotebookEditorSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookDiffEditorInput.ID, NotebookDiffEditorSerializer);
let NotebookContribution = class NotebookContribution extends Disposable {
    static { NotebookContribution_1 = this; }
    static { this.ID = 'workbench.contrib.notebook'; }
    constructor(undoRedoService, configurationService, codeEditorService) {
        super();
        this.codeEditorService = codeEditorService;
        this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
        // Watch for changes to undoRedoPerCell setting
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.undoRedoPerCell)) {
                this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
            }
        }));
        // register comment decoration
        this.codeEditorService.registerDecorationType('comment-controller', COMMENTEDITOR_DECORATION_KEY, {});
    }
    // Add or remove the cell undo redo comparison key based on the user setting
    updateCellUndoRedoComparisonKey(configurationService, undoRedoService) {
        const undoRedoPerCell = configurationService.getValue(NotebookSetting.undoRedoPerCell);
        if (!undoRedoPerCell) {
            // Add comparison key to map cell => main document
            if (!this._uriComparisonKeyComputer) {
                this._uriComparisonKeyComputer = undoRedoService.registerUriComparisonKeyComputer(CellUri.scheme, {
                    getComparisonKey: (uri) => {
                        if (undoRedoPerCell) {
                            return uri.toString();
                        }
                        return NotebookContribution_1._getCellUndoRedoComparisonKey(uri);
                    }
                });
            }
        }
        else {
            // Dispose comparison key
            this._uriComparisonKeyComputer?.dispose();
            this._uriComparisonKeyComputer = undefined;
        }
    }
    static _getCellUndoRedoComparisonKey(uri) {
        const data = CellUri.parse(uri);
        if (!data) {
            return uri.toString();
        }
        return data.notebook.toString();
    }
    dispose() {
        super.dispose();
        this._uriComparisonKeyComputer?.dispose();
    }
};
NotebookContribution = NotebookContribution_1 = __decorate([
    __param(0, IUndoRedoService),
    __param(1, IConfigurationService),
    __param(2, ICodeEditorService)
], NotebookContribution);
export { NotebookContribution };
let CellContentProvider = class CellContentProvider {
    static { this.ID = 'workbench.contrib.cellContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._registration = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
    }
    dispose() {
        this._registration.dispose();
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parse(resource);
        // const data = parseCellUri(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        if (!ref.object.isResolved()) {
            return null;
        }
        for (const cell of ref.object.notebook.cells) {
            if (cell.uri.toString() === resource.toString()) {
                const bufferFactory = {
                    create: (defaultEOL) => {
                        const newEOL = (defaultEOL === 2 /* DefaultEndOfLine.CRLF */ ? '\r\n' : '\n');
                        cell.textBuffer.setEOL(newEOL);
                        return { textBuffer: cell.textBuffer, disposable: Disposable.None };
                    },
                    getFirstLineText: (limit) => {
                        return cell.textBuffer.getLineContent(1).substring(0, limit);
                    }
                };
                const languageId = this._languageService.getLanguageIdByLanguageName(cell.language);
                const languageSelection = languageId ? this._languageService.createById(languageId) : (cell.cellKind === CellKind.Markup ? this._languageService.createById('markdown') : this._languageService.createByFilepathOrFirstLine(resource, cell.textBuffer.getLineContent(1)));
                result = this._modelService.createModel(bufferFactory, languageSelection, resource);
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = Event.any(result.onWillDispose, ref.object.notebook.onWillDispose)(() => {
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
CellContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, INotebookEditorModelResolverService)
], CellContentProvider);
let CellInfoContentProvider = class CellInfoContentProvider {
    static { this.ID = 'workbench.contrib.cellInfoContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this)
        }));
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellOutput, {
            provideTextContent: this.provideOutputTextContent.bind(this)
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/'
            }
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellOutput,
            formatting: {
                label: '${path} (output)',
                separator: '/'
            }
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellMetadata);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        for (const cell of ref.object.notebook.cells) {
            if (cell.handle === data.handle) {
                const cellIndex = ref.object.notebook.cells.indexOf(cell);
                const metadataSource = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                result = this._modelService.createModel(metadataSource, mode, resource);
                this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent(e => {
                    if (result && e.rawEvents.some(event => (event.kind === NotebookCellsChangeType.ChangeCellMetadata || event.kind === NotebookCellsChangeType.ChangeCellLanguage) && event.index === cellIndex)) {
                        const value = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                        if (result.getValue() !== value) {
                            result.setValue(value);
                        }
                    }
                })));
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
    parseStreamOutput(op) {
        if (!op) {
            return;
        }
        const streamOutputData = getStreamOutputData(op.outputs);
        if (streamOutputData) {
            return {
                content: streamOutputData,
                mode: this._languageService.createById(PLAINTEXT_LANGUAGE_ID)
            };
        }
        return;
    }
    _getResult(data, cell) {
        let result = undefined;
        const mode = this._languageService.createById('json');
        const op = cell.outputs.find(op => op.outputId === data.outputId || op.alternativeOutputId === data.outputId);
        const streamOutputData = this.parseStreamOutput(op);
        if (streamOutputData) {
            result = streamOutputData;
            return result;
        }
        const obj = cell.outputs.map(output => ({
            metadata: output.metadata,
            outputItems: output.outputs.map(opit => ({
                mimeType: opit.mime,
                data: opit.data.toString()
            }))
        }));
        const outputSource = toFormattedString(obj, {});
        result = {
            content: outputSource,
            mode
        };
        return result;
    }
    async provideOutputsTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellOutput);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find(cell => cell.handle === data.handle);
        if (!cell) {
            ref.dispose();
            return null;
        }
        const mode = this._languageService.createById('json');
        const model = this._modelService.createModel(getFormattedOutputJSON(cell.outputs || []), mode, resource, true);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            model.setValue(getFormattedOutputJSON(cell.outputs || []));
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
    async provideOutputTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellOutputUri(resource);
        if (!data) {
            return this.provideOutputsTextContent(resource);
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find(cell => !!cell.outputs.find(op => op.outputId === data.outputId || op.alternativeOutputId === data.outputId));
        if (!cell) {
            ref.dispose();
            return null;
        }
        const result = this._getResult(data, cell);
        if (!result) {
            ref.dispose();
            return null;
        }
        const model = this._modelService.createModel(result.content, result.mode, resource);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            const newResult = this._getResult(data, cell);
            if (!newResult) {
                return;
            }
            model.setValue(newResult.content);
            model.setLanguage(newResult.mode.languageId);
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
};
CellInfoContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], CellInfoContentProvider);
let NotebookMetadataContentProvider = class NotebookMetadataContentProvider {
    static { this.ID = 'workbench.contrib.notebookMetadataContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this)
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/'
            }
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = NotebookMetadataUri.parse(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        const metadataSource = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
        result = this._modelService.createModel(metadataSource, mode, resource);
        if (!result) {
            ref.dispose();
            return null;
        }
        this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent(e => {
            if (result && e.rawEvents.some(event => (event.kind === NotebookCellsChangeType.ChangeCellContent || event.kind === NotebookCellsChangeType.ChangeDocumentMetadata || event.kind === NotebookCellsChangeType.ModelChange))) {
                const value = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
                if (result.getValue() !== value) {
                    result.setValue(value);
                }
            }
        })));
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
NotebookMetadataContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], NotebookMetadataContentProvider);
class RegisterSchemasContribution extends Disposable {
    static { this.ID = 'workbench.contrib.registerCellSchemas'; }
    constructor() {
        super();
        this.registerMetadataSchemas();
    }
    registerMetadataSchemas() {
        const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
        const metadataSchema = {
            properties: {
                ['language']: {
                    type: 'string',
                    description: 'The language for the cell'
                }
            },
            // patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        jsonRegistry.registerSchema('vscode://schemas/notebook/cellmetadata', metadataSchema);
    }
}
let NotebookEditorManager = class NotebookEditorManager {
    static { this.ID = 'workbench.contrib.notebookEditorManager'; }
    constructor(_editorService, _notebookEditorModelService, editorGroups) {
        this._editorService = _editorService;
        this._notebookEditorModelService = _notebookEditorModelService;
        this._disposables = new DisposableStore();
        this._disposables.add(Event.debounce(this._notebookEditorModelService.onDidChangeDirty, (last, current) => !last ? [current] : [...last, current], 100)(this._openMissingDirtyNotebookEditors, this));
        // CLOSE editors when we are about to open conflicting notebooks
        this._disposables.add(_notebookEditorModelService.onWillFailWithConflict(e => {
            for (const group of editorGroups.groups) {
                const conflictInputs = group.editors.filter(input => input instanceof NotebookEditorInput && input.viewType !== e.viewType && isEqual(input.resource, e.resource));
                const p = group.closeEditors(conflictInputs);
                e.waitUntil(p);
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _openMissingDirtyNotebookEditors(models) {
        const result = [];
        for (const model of models) {
            if (model.isDirty() && !this._editorService.isOpened({ resource: model.resource, typeId: NotebookEditorInput.ID, editorId: model.viewType }) && extname(model.resource) !== '.interactive') {
                result.push({
                    resource: model.resource,
                    options: { inactive: true, preserveFocus: true, pinned: true, override: model.viewType }
                });
            }
        }
        if (result.length > 0) {
            this._editorService.openEditors(result);
        }
    }
};
NotebookEditorManager = __decorate([
    __param(0, IEditorService),
    __param(1, INotebookEditorModelResolverService),
    __param(2, IEditorGroupsService)
], NotebookEditorManager);
let SimpleNotebookWorkingCopyEditorHandler = class SimpleNotebookWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.simpleNotebookWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _extensionService, _notebookService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyEditorService = _workingCopyEditorService;
        this._extensionService = _extensionService;
        this._notebookService = _notebookService;
        this._installHandler();
    }
    async handles(workingCopy) {
        const viewType = this.handlesSync(workingCopy);
        if (!viewType) {
            return false;
        }
        return this._notebookService.canResolve(viewType);
    }
    handlesSync(workingCopy) {
        const viewType = this._getViewType(workingCopy);
        if (!viewType || viewType === 'interactive') {
            return undefined;
        }
        return viewType;
    }
    isOpen(workingCopy, editor) {
        if (!this.handlesSync(workingCopy)) {
            return false;
        }
        return editor instanceof NotebookEditorInput && editor.viewType === this._getViewType(workingCopy) && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return NotebookEditorInput.getOrCreate(this._instantiationService, workingCopy.resource, undefined, this._getViewType(workingCopy));
    }
    async _installHandler() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        this._register(this._workingCopyEditorService.registerHandler(this));
    }
    _getViewType(workingCopy) {
        const notebookType = NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
        if (notebookType && notebookType.viewType === notebookType.notebookType) {
            return notebookType?.viewType;
        }
        return undefined;
    }
};
SimpleNotebookWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService),
    __param(3, INotebookService)
], SimpleNotebookWorkingCopyEditorHandler);
let NotebookLanguageSelectorScoreRefine = class NotebookLanguageSelectorScoreRefine {
    static { this.ID = 'workbench.contrib.notebookLanguageSelectorScoreRefine'; }
    constructor(_notebookService, languageFeaturesService) {
        this._notebookService = _notebookService;
        languageFeaturesService.setNotebookTypeResolver(this._getNotebookInfo.bind(this));
    }
    _getNotebookInfo(uri) {
        const cellUri = CellUri.parse(uri);
        if (!cellUri) {
            return undefined;
        }
        const notebook = this._notebookService.getNotebookTextModel(cellUri.notebook);
        if (!notebook) {
            return undefined;
        }
        return {
            uri: notebook.uri,
            type: notebook.viewType
        };
    }
};
NotebookLanguageSelectorScoreRefine = __decorate([
    __param(0, INotebookService),
    __param(1, ILanguageFeaturesService)
], NotebookLanguageSelectorScoreRefine);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(NotebookContribution.ID, NotebookContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellContentProvider.ID, CellContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellInfoContentProvider.ID, CellInfoContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookMetadataContentProvider.ID, NotebookMetadataContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(RegisterSchemasContribution.ID, RegisterSchemasContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookEditorManager.ID, NotebookEditorManager, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(NotebookLanguageSelectorScoreRefine.ID, NotebookLanguageSelectorScoreRefine, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(SimpleNotebookWorkingCopyEditorHandler.ID, SimpleNotebookWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookVariables, 4 /* LifecyclePhase.Eventually */);
AccessibleViewRegistry.register(new NotebookAccessibleView());
AccessibleViewRegistry.register(new NotebookAccessibilityHelp());
registerSingleton(INotebookService, NotebookService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorWorkerService, NotebookEditorWorkerServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorModelResolverService, NotebookModelResolverServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellStatusBarService, NotebookCellStatusBarService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorService, NotebookEditorWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelService, NotebookKernelService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelHistoryService, NotebookKernelHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionService, NotebookExecutionService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionStateService, NotebookExecutionStateService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookRendererMessagingService, NotebookRendererMessagingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKeymapService, NotebookKeymapService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookLoggingService, NotebookLoggingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, 1 /* InstantiationType.Delayed */);
const schemas = {};
function isConfigurationPropertySchema(x) {
    return (typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined');
}
for (const editorOption of editorOptionsRegistry) {
    const schema = editorOption.schema;
    if (schema) {
        if (isConfigurationPropertySchema(schema)) {
            schemas[`editor.${editorOption.name}`] = schema;
        }
        else {
            for (const key in schema) {
                if (Object.hasOwnProperty.call(schema, key)) {
                    schemas[key] = schema[key];
                }
            }
        }
    }
}
const editorOptionsCustomizationSchema = {
    description: nls.localize('notebook.editorOptions.experimentalCustomization', 'Settings for code editors used in notebooks. This can be used to customize most editor.* settings.'),
    default: {},
    allOf: [
        {
            properties: schemas,
        }
        // , {
        // 	patternProperties: {
        // 		'^\\[.*\\]$': {
        // 			type: 'object',
        // 			default: {},
        // 			properties: schemas
        // 		}
        // 	}
        // }
    ],
    tags: ['notebookLayout']
};
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'notebook',
    order: 100,
    title: nls.localize('notebookConfigurationTitle', "Notebook"),
    type: 'object',
    properties: {
        [NotebookSetting.displayOrder]: {
            description: nls.localize('notebook.displayOrder.description', "Priority list for output mime types"),
            type: 'array',
            items: {
                type: 'string'
            },
            default: []
        },
        [NotebookSetting.cellToolbarLocation]: {
            description: nls.localize('notebook.cellToolbarLocation.description', "Where the cell toolbar should be shown, or whether it should be hidden."),
            type: 'object',
            additionalProperties: {
                markdownDescription: nls.localize('notebook.cellToolbarLocation.viewType', "Configure the cell toolbar position for for specific file types"),
                type: 'string',
                enum: ['left', 'right', 'hidden']
            },
            default: {
                'default': 'right'
            },
            tags: ['notebookLayout']
        },
        [NotebookSetting.showCellStatusBar]: {
            description: nls.localize('notebook.showCellStatusbar.description', "Whether the cell status bar should be shown."),
            type: 'string',
            enum: ['hidden', 'visible', 'visibleAfterExecute'],
            enumDescriptions: [
                nls.localize('notebook.showCellStatusbar.hidden.description', "The cell Status bar is always hidden."),
                nls.localize('notebook.showCellStatusbar.visible.description', "The cell Status bar is always visible."),
                nls.localize('notebook.showCellStatusbar.visibleAfterExecute.description', "The cell Status bar is hidden until the cell has executed. Then it becomes visible to show the execution status.")
            ],
            default: 'visible',
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellExecutionTimeVerbosity]: {
            description: nls.localize('notebook.cellExecutionTimeVerbosity.description', "Controls the verbosity of the cell execution time in the cell status bar."),
            type: 'string',
            enum: ['default', 'verbose'],
            enumDescriptions: [
                nls.localize('notebook.cellExecutionTimeVerbosity.default.description', "The cell execution duration is visible, with advanced information in the hover tooltip."),
                nls.localize('notebook.cellExecutionTimeVerbosity.verbose.description', "The cell last execution timestamp and duration are visible, with advanced information in the hover tooltip.")
            ],
            default: 'default',
            tags: ['notebookLayout']
        },
        [NotebookSetting.textDiffEditorPreview]: {
            description: nls.localize('notebook.diff.enablePreview.description', "Whether to use the enhanced text diff editor for notebook."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.diffOverviewRuler]: {
            description: nls.localize('notebook.diff.enableOverviewRuler.description', "Whether to render the overview ruler in the diff editor for notebook."),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellToolbarVisibility]: {
            markdownDescription: nls.localize('notebook.cellToolbarVisibility.description', "Whether the cell toolbar should appear on hover or click."),
            type: 'string',
            enum: ['hover', 'click'],
            default: 'click',
            tags: ['notebookLayout']
        },
        [NotebookSetting.undoRedoPerCell]: {
            description: nls.localize('notebook.undoRedoPerCell.description', "Whether to use separate undo/redo stack for each cell."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.compactView]: {
            description: nls.localize('notebook.compactView.description', "Control whether the notebook editor should be rendered in a compact form. For example, when turned on, it will decrease the left margin width."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.focusIndicator]: {
            description: nls.localize('notebook.focusIndicator.description', "Controls where the focus indicator is rendered, either along the cell borders or on the left gutter."),
            type: 'string',
            enum: ['border', 'gutter'],
            default: 'gutter',
            tags: ['notebookLayout']
        },
        [NotebookSetting.insertToolbarLocation]: {
            description: nls.localize('notebook.insertToolbarPosition.description', "Control where the insert cell actions should appear."),
            type: 'string',
            enum: ['betweenCells', 'notebookToolbar', 'both', 'hidden'],
            enumDescriptions: [
                nls.localize('insertToolbarLocation.betweenCells', "A toolbar that appears on hover between cells."),
                nls.localize('insertToolbarLocation.notebookToolbar', "The toolbar at the top of the notebook editor."),
                nls.localize('insertToolbarLocation.both', "Both toolbars."),
                nls.localize('insertToolbarLocation.hidden', "The insert actions don't appear anywhere."),
            ],
            default: 'both',
            tags: ['notebookLayout']
        },
        [NotebookSetting.globalToolbar]: {
            description: nls.localize('notebook.globalToolbar.description', "Control whether to render a global toolbar inside the notebook editor."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.stickyScrollEnabled]: {
            description: nls.localize('notebook.stickyScrollEnabled.description', "Experimental. Control whether to render notebook Sticky Scroll headers in the notebook editor."),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.stickyScrollMode]: {
            description: nls.localize('notebook.stickyScrollMode.description', "Control whether nested sticky lines appear to stack flat or indented."),
            type: 'string',
            enum: ['flat', 'indented'],
            enumDescriptions: [
                nls.localize('notebook.stickyScrollMode.flat', "Nested sticky lines appear flat."),
                nls.localize('notebook.stickyScrollMode.indented', "Nested sticky lines appear indented."),
            ],
            default: 'indented',
            tags: ['notebookLayout']
        },
        [NotebookSetting.consolidatedOutputButton]: {
            description: nls.localize('notebook.consolidatedOutputButton.description', "Control whether outputs action should be rendered in the output toolbar."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.showFoldingControls]: {
            description: nls.localize('notebook.showFoldingControls.description', "Controls when the Markdown header folding arrow is shown."),
            type: 'string',
            enum: ['always', 'never', 'mouseover'],
            enumDescriptions: [
                nls.localize('showFoldingControls.always', "The folding controls are always visible."),
                nls.localize('showFoldingControls.never', "Never show the folding controls and reduce the gutter size."),
                nls.localize('showFoldingControls.mouseover', "The folding controls are visible only on mouseover."),
            ],
            default: 'mouseover',
            tags: ['notebookLayout']
        },
        [NotebookSetting.dragAndDropEnabled]: {
            description: nls.localize('notebook.dragAndDrop.description', "Control whether the notebook editor should allow moving cells through drag and drop."),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.consolidatedRunButton]: {
            description: nls.localize('notebook.consolidatedRunButton.description', "Control whether extra actions are shown in a dropdown next to the run button."),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.globalToolbarShowLabel]: {
            description: nls.localize('notebook.globalToolbarShowLabel', "Control whether the actions on the notebook toolbar should render label or not."),
            type: 'string',
            enum: ['always', 'never', 'dynamic'],
            default: 'always',
            tags: ['notebookLayout']
        },
        [NotebookSetting.textOutputLineLimit]: {
            markdownDescription: nls.localize('notebook.textOutputLineLimit', "Controls how many lines of text are displayed in a text output. If {0} is enabled, this setting is used to determine the scroll height of the output.", '`#notebook.output.scrolling#`'),
            type: 'number',
            default: 30,
            tags: ['notebookLayout', 'notebookOutputLayout'],
            minimum: 1,
        },
        [NotebookSetting.LinkifyOutputFilePaths]: {
            description: nls.localize('notebook.disableOutputFilePathLinks', "Control whether to disable filepath links in the output of notebook cells."),
            type: 'boolean',
            default: true,
            tags: ['notebookOutputLayout']
        },
        [NotebookSetting.minimalErrorRendering]: {
            description: nls.localize('notebook.minimalErrorRendering', "Control whether to render error output in a minimal style."),
            type: 'boolean',
            default: false,
            tags: ['notebookOutputLayout']
        },
        [NotebookSetting.markupFontSize]: {
            markdownDescription: nls.localize('notebook.markup.fontSize', "Controls the font size in pixels of rendered markup in notebooks. When set to {0}, 120% of {1} is used.", '`0`', '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout']
        },
        [NotebookSetting.markdownLineHeight]: {
            markdownDescription: nls.localize('notebook.markdown.lineHeight', "Controls the line height in pixels of markdown cells in notebooks. When set to {0}, {1} will be used", '`0`', '`normal`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellEditorOptionsCustomizations]: editorOptionsCustomizationSchema,
        [NotebookSetting.interactiveWindowCollapseCodeCells]: {
            markdownDescription: nls.localize('notebook.interactiveWindow.collapseCodeCells', "Controls whether code cells in the interactive window are collapsed by default."),
            type: 'string',
            enum: ['always', 'never', 'fromEditor'],
            default: 'fromEditor'
        },
        [NotebookSetting.outputLineHeight]: {
            markdownDescription: nls.localize('notebook.outputLineHeight', "Line height of the output text within notebook cells.\n - When set to 0, editor line height is used.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values."),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputFontSize]: {
            markdownDescription: nls.localize('notebook.outputFontSize', "Font size for the output text within notebook cells. When set to 0, {0} is used.", '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputFontFamily]: {
            markdownDescription: nls.localize('notebook.outputFontFamily', "The font family of the output text within notebook cells. When set to empty, the {0} is used.", '`#editor.fontFamily#`'),
            type: 'string',
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputScrolling]: {
            markdownDescription: nls.localize('notebook.outputScrolling', "Initially render notebook outputs in a scrollable region when longer than the limit."),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: typeof product.quality === 'string' && product.quality !== 'stable' // only enable as default in insiders
        },
        [NotebookSetting.outputWordWrap]: {
            markdownDescription: nls.localize('notebook.outputWordWrap', "Controls whether the lines in output should wrap."),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: false
        },
        [NotebookSetting.defaultFormatter]: {
            description: nls.localize('notebookFormatter.default', "Defines a default notebook formatter which takes precedence over all other formatter settings. Must be the identifier of an extension contributing a formatter."),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFormatter.extensionIds,
            enumItemLabels: DefaultFormatter.extensionItemLabels,
            markdownEnumDescriptions: DefaultFormatter.extensionDescriptions
        },
        [NotebookSetting.formatOnSave]: {
            markdownDescription: nls.localize('notebook.formatOnSave', "Format a notebook on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.", '`#files.autoSave#`'),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false
        },
        [NotebookSetting.insertFinalNewline]: {
            markdownDescription: nls.localize('notebook.insertFinalNewline', "When enabled, insert a final new line into the end of code cells when saving a notebook."),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false
        },
        [NotebookSetting.formatOnCellExecution]: {
            markdownDescription: nls.localize('notebook.formatOnCellExecution', "Format a notebook cell upon execution. A formatter must be available."),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.confirmDeleteRunningCell]: {
            markdownDescription: nls.localize('notebook.confirmDeleteRunningCell', "Control whether a confirmation prompt is required to delete a running cell."),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.findFilters]: {
            markdownDescription: nls.localize('notebook.findFilters', "Customize the Find Widget behavior for searching within notebook cells. When both markup source and markup preview are enabled, the Find Widget will search either the source code or preview based on the current state of the cell."),
            type: 'object',
            properties: {
                markupSource: {
                    type: 'boolean',
                    default: true
                },
                markupPreview: {
                    type: 'boolean',
                    default: true
                },
                codeSource: {
                    type: 'boolean',
                    default: true
                },
                codeOutput: {
                    type: 'boolean',
                    default: true
                }
            },
            default: {
                markupSource: true,
                markupPreview: true,
                codeSource: true,
                codeOutput: true
            },
            tags: ['notebookLayout']
        },
        [NotebookSetting.remoteSaving]: {
            markdownDescription: nls.localize('notebook.remoteSaving', "Enables the incremental saving of notebooks between processes and across Remote connections. When enabled, only the changes to the notebook are sent to the extension host, improving performance for large notebooks and slow network connections."),
            type: 'boolean',
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
            tags: ['experimental']
        },
        [NotebookSetting.scrollToRevealCell]: {
            markdownDescription: nls.localize('notebook.scrolling.revealNextCellOnExecute.description', "How far to scroll when revealing the next cell upon running {0}.", 'notebook.cell.executeAndSelectBelow'),
            type: 'string',
            enum: ['fullCell', 'firstLine', 'none'],
            markdownEnumDescriptions: [
                nls.localize('notebook.scrolling.revealNextCellOnExecute.fullCell.description', 'Scroll to fully reveal the next cell.'),
                nls.localize('notebook.scrolling.revealNextCellOnExecute.firstLine.description', 'Scroll to reveal the first line of the next cell.'),
                nls.localize('notebook.scrolling.revealNextCellOnExecute.none.description', 'Do not scroll.'),
            ],
            default: 'fullCell'
        },
        [NotebookSetting.cellGenerate]: {
            markdownDescription: nls.localize('notebook.cellGenerate', "Enable experimental generate action to create code cell with inline chat enabled."),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.notebookVariablesView]: {
            markdownDescription: nls.localize('notebook.VariablesView.description', "Enable the experimental notebook variables view within the debug panel."),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.notebookInlineValues]: {
            markdownDescription: nls.localize('notebook.inlineValues.description', "Control whether to show inline values within notebook code cells after cell execution. Values will remain until the cell is edited, re-executed, or explicitly cleared via the Clear All Outputs toolbar button or the `Notebook: Clear Inline Values` command."),
            type: 'string',
            enum: ['on', 'auto', 'off'],
            enumDescriptions: [
                nls.localize('notebook.inlineValues.on', "Always show inline values, with a regex fallback if no inline value provider is registered. Note: There may be a performance impact in larger cells if the fallback is used."),
                nls.localize('notebook.inlineValues.auto', "Show inline values only when an inline value provider is registered."),
                nls.localize('notebook.inlineValues.off', "Never show inline values."),
            ],
            default: 'off'
        },
        [NotebookSetting.cellFailureDiagnostics]: {
            markdownDescription: nls.localize('notebook.cellFailureDiagnostics', "Show available diagnostics for cell failures."),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.outputBackupSizeLimit]: {
            markdownDescription: nls.localize('notebook.backup.sizeLimit', "The limit of notebook output size in kilobytes (KB) where notebook files will no longer be backed up for hot reload. Use 0 for unlimited."),
            type: 'number',
            default: 10000
        },
        [NotebookSetting.multiCursor]: {
            markdownDescription: nls.localize('notebook.multiCursor.enabled', "Experimental. Enables a limited set of multi cursor controls across multiple cells in the notebook editor. Currently supported are core editor actions (typing/cut/copy/paste/composition) and a limited subset of editor commands."),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.markupFontFamily]: {
            markdownDescription: nls.localize('notebook.markup.fontFamily', "Controls the font family of rendered markup in notebooks. When left blank, this will fall back to the default workbench font family."),
            type: 'string',
            default: '',
            tags: ['notebookLayout']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9vay5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQWUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkcsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3JILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBd0QsTUFBTSxvRUFBb0UsQ0FBQztBQUN0SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBMkUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5TCxPQUFPLEVBQTZDLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQWdDLGlDQUFpQyxFQUFFLGVBQWUsRUFBc0IsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwTixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUE2QixVQUFVLElBQUksY0FBYyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFFOUksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBNkIseUJBQXlCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN4SSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEcsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFOUksb0JBQW9CO0FBQ3BCLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLG1DQUFtQyxDQUFDO0FBQzNDLE9BQU8saURBQWlELENBQUM7QUFDekQsT0FBTyxrQ0FBa0MsQ0FBQztBQUUxQyxzQkFBc0I7QUFDdEIsT0FBTyw2Q0FBNkMsQ0FBQztBQUNyRCxPQUFPLDBDQUEwQyxDQUFDO0FBQ2xELE9BQU8sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sb0RBQW9ELENBQUM7QUFDNUQsT0FBTyxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxzQ0FBc0MsQ0FBQztBQUM5QyxPQUFPLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLDZEQUE2RCxDQUFDO0FBQ3JFLE9BQU8sOENBQThDLENBQUM7QUFDdEQsT0FBTyx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyw2Q0FBNkMsQ0FBQztBQUNyRCxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8scURBQXFELENBQUM7QUFDN0QsT0FBTyx3REFBd0QsQ0FBQztBQUVoRSwyQkFBMkI7QUFDM0IsT0FBTywrQkFBK0IsQ0FBQztBQUV2QyxXQUFXO0FBQ1gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFbEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEYsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUM7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDOUcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFaEcsa0dBQWtHO0FBRWxHLFFBQVEsQ0FBQyxFQUFFLENBQXNCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxNQUFNLENBQzFCLGNBQWMsRUFDZCxjQUFjLENBQUMsRUFBRSxFQUNqQixpQkFBaUIsQ0FDakIsRUFDRDtJQUNDLElBQUksY0FBYyxDQUFDLG1CQUFtQixDQUFDO0NBQ3ZDLENBQ0QsQ0FBQztBQUVGLFFBQVEsQ0FBQyxFQUFFLENBQXNCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxNQUFNLENBQzFCLHNCQUFzQixFQUN0QixzQkFBc0IsQ0FBQyxFQUFFLEVBQ3pCLHNCQUFzQixDQUN0QixFQUNEO0lBQ0MsSUFBSSxjQUFjLENBQUMsdUJBQXVCLENBQUM7Q0FDM0MsQ0FDRCxDQUFDO0FBRUYsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQy9FLG9CQUFvQixDQUFDLE1BQU0sQ0FDMUIsMkJBQTJCLEVBQzNCLDJCQUEyQixDQUFDLEVBQUUsRUFDOUIsc0JBQXNCLENBQ3RCLEVBQ0Q7SUFDQyxJQUFJLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQztDQUNoRCxDQUNELENBQUM7QUFFRixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQUNqQyxZQUFvRCxxQkFBNEM7UUFBNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtJQUFJLENBQUM7SUFDckcsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFrQjtRQUMzQixVQUFVLENBQUMsS0FBSyxZQUFZLHVCQUF1QixDQUFDLENBQUM7UUFDckQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3JCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVE7WUFDekMsSUFBSSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDckIsWUFBWSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQ3RDLFlBQVksRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQzdCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtTQUN4QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsV0FBVyxDQUFDLG9CQUEyQyxFQUFFLEdBQVc7UUFFbkUsTUFBTSxJQUFJLEdBQVMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDNUQsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9ILE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLENBQUMsRUFBRSxDQUFDO1lBQ3RGLE9BQU8sNEJBQTRCLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3pILENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEgsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBd0IsRUFBRSxjQUFtQjtRQUNwRSxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FFRCxDQUFBO0FBeENLLDRCQUE0QjtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0dBRDdCLDRCQUE0QixDQXdDakM7QUFFRCxNQUFNLHdCQUF3QjtJQUM3QixZQUFZLENBQUMsS0FBa0I7UUFDOUIsT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBQ0QsU0FBUyxDQUFDLEtBQWtCO1FBQzNCLFVBQVUsQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQztRQUNqRCxNQUFNLElBQUksR0FBaUM7WUFDMUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7WUFDMUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztTQUN0QixDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFDRCxXQUFXLENBQUMsb0JBQTJDLEVBQUUsR0FBVztRQUNuRSxNQUFNLElBQUksR0FBaUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDaEUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkUsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BILE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsd0JBQXdCLENBQzNGLG1CQUFtQixDQUFDLEVBQUUsRUFDdEIsd0JBQXdCLENBQ3hCLENBQUM7QUFFRixRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyx3QkFBd0IsQ0FDM0YsdUJBQXVCLENBQUMsRUFBRSxFQUMxQiw0QkFBNEIsQ0FDNUIsQ0FBQztBQUVLLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFFbkMsT0FBRSxHQUFHLDRCQUE0QixBQUEvQixDQUFnQztJQUlsRCxZQUNtQixlQUFpQyxFQUM1QixvQkFBMkMsRUFDN0IsaUJBQXFDO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBRjZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFJMUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTVFLCtDQUErQztRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDN0UsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFRCw0RUFBNEU7SUFDcEUsK0JBQStCLENBQUMsb0JBQTJDLEVBQUUsZUFBaUM7UUFDckgsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFVLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVoRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsa0RBQWtEO1lBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLHlCQUF5QixHQUFHLGVBQWUsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUNqRyxnQkFBZ0IsRUFBRSxDQUFDLEdBQVEsRUFBVSxFQUFFO3dCQUN0QyxJQUFJLGVBQWUsRUFBRSxDQUFDOzRCQUNyQixPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFDdkIsQ0FBQzt3QkFDRCxPQUFPLHNCQUFvQixDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoRSxDQUFDO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLHlCQUF5QjtZQUN6QixJQUFJLENBQUMseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLHlCQUF5QixHQUFHLFNBQVMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxHQUFRO1FBQ3BELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDM0MsQ0FBQzs7QUE3RFcsb0JBQW9CO0lBTzlCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0dBVFIsb0JBQW9CLENBOERoQzs7QUFFRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjthQUVSLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMkM7SUFJN0QsWUFDb0IsZ0JBQW1DLEVBQ3RCLGFBQTRCLEVBQ3pCLGdCQUFrQyxFQUNmLDZCQUFrRTtRQUZ4RixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ2Ysa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFxQztRQUV4SCxJQUFJLENBQUMsYUFBYSxHQUFHLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUUsSUFBSSxNQUFNLEdBQXNCLElBQUksQ0FBQztRQUVyQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLGFBQWEsR0FBdUI7b0JBQ3pDLE1BQU0sRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO3dCQUN0QixNQUFNLE1BQU0sR0FBRyxDQUFDLFVBQVUsa0NBQTBCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JFLElBQUksQ0FBQyxVQUEwQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDaEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBeUIsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNwRixDQUFDO29CQUNELGdCQUFnQixFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUU7d0JBQ25DLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDOUQsQ0FBQztpQkFDRCxDQUFDO2dCQUNGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3BGLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFRLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FDdEMsYUFBYSxFQUNiLGlCQUFpQixFQUNqQixRQUFRLENBQ1IsQ0FBQztnQkFDRixNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFO1lBQ3BGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDOztBQXZFSSxtQkFBbUI7SUFPdEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxtQ0FBbUMsQ0FBQTtHQVZoQyxtQkFBbUIsQ0F3RXhCO0FBRUQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7YUFFWixPQUFFLEdBQUcsMkNBQTJDLEFBQTlDLENBQStDO0lBSWpFLFlBQ29CLGdCQUFtQyxFQUN2QyxhQUE2QyxFQUMxQyxnQkFBbUQsRUFDdEQsYUFBNkMsRUFDdkIsNkJBQW1GO1FBSHhGLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDckMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDTixrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQXFDO1FBUHhHLGlCQUFZLEdBQWtCLEVBQUUsQ0FBQztRQVNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLEVBQUU7WUFDNUcsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDOUQsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUU7WUFDMUcsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDNUQsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQzNELE1BQU0sRUFBRSxPQUFPLENBQUMsMEJBQTBCO1lBQzFDLFVBQVUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixTQUFTLEVBQUUsR0FBRzthQUNkO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQzNELE1BQU0sRUFBRSxPQUFPLENBQUMsd0JBQXdCO1lBQ3hDLFVBQVUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsa0JBQWtCO2dCQUN6QixTQUFTLEVBQUUsR0FBRzthQUNkO1NBQ0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxRQUFhO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVFLElBQUksTUFBTSxHQUFzQixJQUFJLENBQUM7UUFFckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNoSixNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQ3RDLGNBQWMsRUFDZCxJQUFJLEVBQ0osUUFBUSxDQUNSLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDakYsSUFBSSxNQUFNLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQzt3QkFDaE0sTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN2SSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxLQUFLLEVBQUUsQ0FBQzs0QkFDakMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDeEIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDTCxNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUN0QyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2YsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxFQUFnQjtRQUN6QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDVCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsbUJBQW1CLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPO2dCQUNOLE9BQU8sRUFBRSxnQkFBZ0I7Z0JBQ3pCLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDO2FBQzdELENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztJQUNSLENBQUM7SUFFTyxVQUFVLENBQUMsSUFHbEIsRUFBRSxJQUFXO1FBQ2IsSUFBSSxNQUFNLEdBQThELFNBQVMsQ0FBQztRQUVsRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUcsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQztZQUMxQixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLFdBQVcsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO2FBQzFCLENBQUMsQ0FBQztTQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sR0FBRztZQUNSLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUk7U0FDSixDQUFDO1FBRUYsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsS0FBSyxDQUFDLHlCQUF5QixDQUFDLFFBQWE7UUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9HLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsc0JBQXNCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUMxSCxLQUFLLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLHdCQUF3QixDQUFDLFFBQWE7UUFDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsbUJBQW1CLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFMUosSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsc0JBQXNCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUMxSCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUU5QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU87WUFDUixDQUFDO1lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2YsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7O0FBM05JLHVCQUF1QjtJQU8xQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsbUNBQW1DLENBQUE7R0FYaEMsdUJBQXVCLENBNE41QjtBQUVELElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQStCO2FBQ3BCLE9BQUUsR0FBRyxtREFBbUQsQUFBdEQsQ0FBdUQ7SUFJekUsWUFDb0IsZ0JBQW1DLEVBQ3ZDLGFBQTZDLEVBQzFDLGdCQUFtRCxFQUN0RCxhQUE2QyxFQUN2Qiw2QkFBbUY7UUFIeEYsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNOLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBcUM7UUFQeEcsaUJBQVksR0FBa0IsRUFBRSxDQUFDO1FBU2pELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRTtZQUN4RyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUM5RCxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7WUFDM0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxzQkFBc0I7WUFDdEMsVUFBVSxFQUFFO2dCQUNYLEtBQUssRUFBRSxvQkFBb0I7Z0JBQzNCLFNBQVMsRUFBRSxHQUFHO2FBQ2Q7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLFFBQWE7UUFDN0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25FLElBQUksTUFBTSxHQUFzQixJQUFJLENBQUM7UUFFckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sY0FBYyxHQUFHLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RKLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FDdEMsY0FBYyxFQUNkLElBQUksRUFDSixRQUFRLENBQ1IsQ0FBQztRQUVGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakYsSUFBSSxNQUFNLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxzQkFBc0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDNU4sTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzdJLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUNqQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVMLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQ3RDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQzs7QUF6RUksK0JBQStCO0lBTWxDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxtQ0FBbUMsQ0FBQTtHQVZoQywrQkFBK0IsQ0EwRXBDO0FBRUQsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO2FBRW5DLE9BQUUsR0FBRyx1Q0FBdUMsQ0FBQztJQUU3RDtRQUNDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsRUFBRSxDQUE0QixjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM3RixNQUFNLGNBQWMsR0FBZ0I7WUFDbkMsVUFBVSxFQUFFO2dCQUNYLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2IsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLDJCQUEyQjtpQkFDeEM7YUFDRDtZQUNELG9EQUFvRDtZQUNwRCxvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYSxFQUFFLElBQUk7U0FDbkIsQ0FBQztRQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsd0NBQXdDLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdkYsQ0FBQzs7QUFHRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjthQUVWLE9BQUUsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNkM7SUFJL0QsWUFDaUIsY0FBK0MsRUFDMUIsMkJBQWlGLEVBQ2hHLFlBQWtDO1FBRnZCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUNULGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBcUM7UUFKdEcsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBU3JELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQ25DLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxnQkFBZ0IsRUFDakQsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxPQUFPLENBQUMsRUFDekQsR0FBRyxDQUNILENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFaEQsZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzVFLEtBQUssTUFBTSxLQUFLLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN6QyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25LLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQzdDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLGdDQUFnQyxDQUFDLE1BQXNDO1FBQzlFLE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUM7UUFDMUMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDNUwsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7b0JBQ3hCLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFO2lCQUN4RixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0YsQ0FBQzs7QUE5Q0kscUJBQXFCO0lBT3hCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxXQUFBLG9CQUFvQixDQUFBO0dBVGpCLHFCQUFxQixDQStDMUI7QUFFRCxJQUFNLHNDQUFzQyxHQUE1QyxNQUFNLHNDQUF1QyxTQUFRLFVBQVU7YUFFOUMsT0FBRSxHQUFHLDBEQUEwRCxBQUE3RCxDQUE4RDtJQUVoRixZQUN5QyxxQkFBNEMsRUFDeEMseUJBQW9ELEVBQzVELGlCQUFvQyxFQUNyQyxnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFMZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUN4Qyw4QkFBeUIsR0FBekIseUJBQXlCLENBQTJCO1FBQzVELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUlyRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBbUM7UUFDaEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVPLFdBQVcsQ0FBQyxXQUFtQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQzdDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQW1DLEVBQUUsTUFBbUI7UUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLE1BQU0sWUFBWSxtQkFBbUIsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RKLENBQUM7SUFFRCxZQUFZLENBQUMsV0FBbUM7UUFDL0MsT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFFLENBQUMsQ0FBQztJQUN0SSxDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWU7UUFDNUIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztRQUVqRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU8sWUFBWSxDQUFDLFdBQW1DO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakYsSUFBSSxZQUFZLElBQUksWUFBWSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekUsT0FBTyxZQUFZLEVBQUUsUUFBUSxDQUFDO1FBQy9CLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDOztBQXpESSxzQ0FBc0M7SUFLekMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQVJiLHNDQUFzQyxDQTBEM0M7QUFFRCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFtQzthQUV4QixPQUFFLEdBQUcsdURBQXVELEFBQTFELENBQTJEO0lBRTdFLFlBQ29DLGdCQUFrQyxFQUMzQyx1QkFBaUQ7UUFEeEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUdyRSx1QkFBdUIsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEdBQVE7UUFDaEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTztZQUNOLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztZQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVE7U0FDdkIsQ0FBQztJQUNILENBQUM7O0FBeEJJLG1DQUFtQztJQUt0QyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsd0JBQXdCLENBQUE7R0FOckIsbUNBQW1DLENBeUJ4QztBQUVELE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkgsOEJBQThCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLG9CQUFvQixzQ0FBOEIsQ0FBQztBQUMzRyw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLHNDQUE4QixDQUFDO0FBQ3pHLDhCQUE4QixDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSx1QkFBdUIsc0NBQThCLENBQUM7QUFDakgsOEJBQThCLENBQUMsK0JBQStCLENBQUMsRUFBRSxFQUFFLCtCQUErQixzQ0FBOEIsQ0FBQztBQUNqSSw4QkFBOEIsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsMkJBQTJCLHNDQUE4QixDQUFDO0FBQ3pILDhCQUE4QixDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxxQkFBcUIsc0NBQThCLENBQUM7QUFDN0csOEJBQThCLENBQUMsbUNBQW1DLENBQUMsRUFBRSxFQUFFLG1DQUFtQyxzQ0FBOEIsQ0FBQztBQUN6SSw4QkFBOEIsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLEVBQUUsc0NBQXNDLHNDQUE4QixDQUFDO0FBQy9JLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLGlCQUFpQixvQ0FBNEIsQ0FBQztBQUUzRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUM7QUFDOUQsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUkseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO0FBRWpFLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLGVBQWUsb0NBQTRCLENBQUM7QUFDaEYsaUJBQWlCLENBQUMsNEJBQTRCLEVBQUUsK0JBQStCLG9DQUE0QixDQUFDO0FBQzVHLGlCQUFpQixDQUFDLG1DQUFtQyxFQUFFLGdDQUFnQyxvQ0FBNEIsQ0FBQztBQUNwSCxpQkFBaUIsQ0FBQyw2QkFBNkIsRUFBRSw0QkFBNEIsb0NBQTRCLENBQUM7QUFDMUcsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsMkJBQTJCLG9DQUE0QixDQUFDO0FBQ2xHLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixvQ0FBNEIsQ0FBQztBQUM1RixpQkFBaUIsQ0FBQyw2QkFBNkIsRUFBRSw0QkFBNEIsb0NBQTRCLENBQUM7QUFDMUcsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsd0JBQXdCLG9DQUE0QixDQUFDO0FBQ2xHLGlCQUFpQixDQUFDLDhCQUE4QixFQUFFLDZCQUE2QixvQ0FBNEIsQ0FBQztBQUM1RyxpQkFBaUIsQ0FBQyxpQ0FBaUMsRUFBRSxnQ0FBZ0Msb0NBQTRCLENBQUM7QUFDbEgsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFDO0FBQzVGLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixvQ0FBNEIsQ0FBQztBQUM5RixpQkFBaUIsQ0FBQyxxQ0FBcUMsRUFBRSxvQ0FBb0Msb0NBQTRCLENBQUM7QUFDMUgsaUJBQWlCLENBQUMsNEJBQTRCLEVBQUUsMkJBQTJCLG9DQUE0QixDQUFDO0FBRXhHLE1BQU0sT0FBTyxHQUFtQixFQUFFLENBQUM7QUFDbkMsU0FBUyw2QkFBNkIsQ0FBQyxDQUFrRjtJQUN4SCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxPQUFPLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLENBQUM7QUFDMUUsQ0FBQztBQUNELEtBQUssTUFBTSxZQUFZLElBQUkscUJBQXFCLEVBQUUsQ0FBQztJQUNsRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBQ25DLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixJQUFJLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxDQUFDLFVBQVUsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ2pELENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLGdDQUFnQyxHQUFpQztJQUN0RSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRSxvR0FBb0csQ0FBQztJQUNuTCxPQUFPLEVBQUUsRUFBRTtJQUNYLEtBQUssRUFBRTtRQUNOO1lBQ0MsVUFBVSxFQUFFLE9BQU87U0FDbkI7UUFDRCxNQUFNO1FBQ04sd0JBQXdCO1FBQ3hCLG9CQUFvQjtRQUNwQixxQkFBcUI7UUFDckIsa0JBQWtCO1FBQ2xCLHlCQUF5QjtRQUN6QixNQUFNO1FBQ04sS0FBSztRQUNMLElBQUk7S0FDSjtJQUNELElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO0NBQ3hCLENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1RixxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQzdELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUscUNBQXFDLENBQUM7WUFDckcsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7YUFDZDtZQUNELE9BQU8sRUFBRSxFQUFFO1NBQ1g7UUFDRCxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO1lBQ3RDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLHlFQUF5RSxDQUFDO1lBQ2hKLElBQUksRUFBRSxRQUFRO1lBQ2Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsaUVBQWlFLENBQUM7Z0JBQzdJLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDO2FBQ2pDO1lBQ0QsT0FBTyxFQUFFO2dCQUNSLFNBQVMsRUFBRSxPQUFPO2FBQ2xCO1lBQ0QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDhDQUE4QyxDQUFDO1lBQ25ILElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQztZQUNsRCxnQkFBZ0IsRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSx1Q0FBdUMsQ0FBQztnQkFDdEcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnREFBZ0QsRUFBRSx3Q0FBd0MsQ0FBQztnQkFDeEcsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0REFBNEQsRUFBRSxrSEFBa0gsQ0FBQzthQUFDO1lBQ2hNLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsMEJBQTBCLENBQUMsRUFBRTtZQUM3QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSwyRUFBMkUsQ0FBQztZQUN6SixJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7WUFDNUIsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUUseUZBQXlGLENBQUM7Z0JBQ2xLLEdBQUcsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUUsNkdBQTZHLENBQUM7YUFBQztZQUN4TCxPQUFPLEVBQUUsU0FBUztZQUNsQixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUNBQXlDLEVBQUUsNERBQTRELENBQUM7WUFDbEksSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUNwQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSx1RUFBdUUsQ0FBQztZQUNuSixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsMkRBQTJELENBQUM7WUFDNUksSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsd0RBQXdELENBQUM7WUFDM0gsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDOUIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsZ0pBQWdKLENBQUM7WUFDL00sSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDakMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsc0dBQXNHLENBQUM7WUFDeEssSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRTtZQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxzREFBc0QsQ0FBQztZQUMvSCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQzNELGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLGdEQUFnRCxDQUFDO2dCQUNwRyxHQUFHLENBQUMsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLGdEQUFnRCxDQUFDO2dCQUN2RyxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGdCQUFnQixDQUFDO2dCQUM1RCxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDJDQUEyQyxDQUFDO2FBQ3pGO1lBQ0QsT0FBTyxFQUFFLE1BQU07WUFDZixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ2hDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLHdFQUF3RSxDQUFDO1lBQ3pJLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMENBQTBDLEVBQUUsZ0dBQWdHLENBQUM7WUFDdkssSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSx1RUFBdUUsQ0FBQztZQUMzSSxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7WUFDMUIsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsa0NBQWtDLENBQUM7Z0JBQ2xGLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsc0NBQXNDLENBQUM7YUFDMUY7WUFDRCxPQUFPLEVBQUUsVUFBVTtZQUNuQixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLEVBQUU7WUFDM0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0NBQStDLEVBQUUsMEVBQTBFLENBQUM7WUFDdEosSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRTtZQUN0QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSwyREFBMkQsQ0FBQztZQUNsSSxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDO1lBQ3RDLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBDQUEwQyxDQUFDO2dCQUN0RixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDZEQUE2RCxDQUFDO2dCQUN4RyxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLHFEQUFxRCxDQUFDO2FBQ3BHO1lBQ0QsT0FBTyxFQUFFLFdBQVc7WUFDcEIsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3JDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLHNGQUFzRixDQUFDO1lBQ3JKLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsK0VBQStFLENBQUM7WUFDeEosSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRTtZQUN6QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxpRkFBaUYsQ0FBQztZQUMvSSxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRTtZQUN0QyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHVKQUF1SixFQUFFLCtCQUErQixDQUFDO1lBQzNQLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQztZQUNoRCxPQUFPLEVBQUUsQ0FBQztTQUNWO1FBQ0QsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRTtZQUN6QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw0RUFBNEUsQ0FBQztZQUM5SSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLENBQUMsc0JBQXNCLENBQUM7U0FDOUI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDREQUE0RCxDQUFDO1lBQ3pILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxJQUFJLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztTQUM5QjtRQUNELENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUseUdBQXlHLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixDQUFDO1lBQ3RNLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLENBQUM7WUFDVixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDckMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxzR0FBc0csRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDO1lBQzVMLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLENBQUM7WUFDVixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLCtCQUErQixDQUFDLEVBQUUsZ0NBQWdDO1FBQ25GLENBQUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLEVBQUU7WUFDckQsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRSxpRkFBaUYsQ0FBQztZQUNwSyxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDO1lBQ3ZDLE9BQU8sRUFBRSxZQUFZO1NBQ3JCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBQQUEwUCxDQUFDO1lBQzFULElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLENBQUM7WUFDVixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQztTQUNoRDtRQUNELENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsa0ZBQWtGLEVBQUUscUJBQXFCLENBQUM7WUFDdkssSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQztZQUNWLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO1NBQ2hEO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLCtGQUErRixFQUFFLHVCQUF1QixDQUFDO1lBQ3hMLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUM7U0FDaEQ7UUFDRCxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUNsQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHNGQUFzRixDQUFDO1lBQ3JKLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUM7WUFDaEQsT0FBTyxFQUFFLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMscUNBQXFDO1NBQ2xIO1FBQ0QsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtREFBbUQsQ0FBQztZQUNqSCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO1lBQ2hELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25DLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlLQUFpSyxDQUFDO1lBQ3pOLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7WUFDeEIsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsWUFBWTtZQUNuQyxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsbUJBQW1CO1lBQ3BELHdCQUF3QixFQUFFLGdCQUFnQixDQUFDLHFCQUFxQjtTQUNoRTtRQUNELENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQy9CLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsNExBQTRMLEVBQUUsb0JBQW9CLENBQUM7WUFDOVEsSUFBSSxFQUFFLFNBQVM7WUFDZixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4QixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsRUFBRTtZQUNyQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDBGQUEwRixDQUFDO1lBQzVKLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7WUFDeEIsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx1RUFBdUUsQ0FBQztZQUM1SSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO1lBQzNDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsNkVBQTZFLENBQUM7WUFDckosSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDOUIsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx1T0FBdU8sQ0FBQztZQUNsUyxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxZQUFZLEVBQUU7b0JBQ2IsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsYUFBYSxFQUFFO29CQUNkLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJO2lCQUNiO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsSUFBSTtpQkFDYjtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLElBQUk7aUJBQ2I7YUFDRDtZQUNELE9BQU8sRUFBRTtnQkFDUixZQUFZLEVBQUUsSUFBSTtnQkFDbEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixVQUFVLEVBQUUsSUFBSTthQUNoQjtZQUNELElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxxUEFBcVAsQ0FBQztZQUNqVCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLHFDQUFxQztZQUNuSCxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUM7U0FDdEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3JDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0RBQXdELEVBQUUsa0VBQWtFLEVBQUUscUNBQXFDLENBQUM7WUFDdE0sSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUN2Qyx3QkFBd0IsRUFBRTtnQkFDekIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpRUFBaUUsRUFBRSx1Q0FBdUMsQ0FBQztnQkFDeEgsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrRUFBa0UsRUFBRSxtREFBbUQsQ0FBQztnQkFDckksR0FBRyxDQUFDLFFBQVEsQ0FBQyw2REFBNkQsRUFBRSxnQkFBZ0IsQ0FBQzthQUM3RjtZQUNELE9BQU8sRUFBRSxVQUFVO1NBQ25CO1FBQ0QsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtRkFBbUYsQ0FBQztZQUMvSSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUseUVBQXlFLENBQUM7WUFDbEosSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsRUFBRTtZQUN2QyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGlRQUFpUSxDQUFDO1lBQ3pVLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUM7WUFDM0IsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsOEtBQThLLENBQUM7Z0JBQ3hOLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsc0VBQXNFLENBQUM7Z0JBQ2xILEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsMkJBQTJCLENBQUM7YUFDdEU7WUFDRCxPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRTtZQUN6QyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLCtDQUErQyxDQUFDO1lBQ3JILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwySUFBMkksQ0FBQztZQUMzTSxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHFPQUFxTyxDQUFDO1lBQ3hTLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDbkMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxzSUFBc0ksQ0FBQztZQUN2TSxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7S0FDRDtDQUNELENBQUMsQ0FBQyJ9