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
var MainThreadTextEditors_1;
import { illegalArgument } from '../../../base/common/errors.js';
import { dispose, DisposableStore } from '../../../base/common/lifecycle.js';
import { equals as objectEquals } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { EditorActivation, EditorResolution, isTextEditorDiffInformationEqual } from '../../../platform/editor/common/editor.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { editorGroupToColumn, columnToEditorGroup } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { getCodeEditor } from '../../../editor/browser/editorBrowser.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IQuickDiffModelService } from '../../contrib/scm/browser/quickDiffModel.js';
import { autorun, constObservable, derived, derivedOpts, observableFromEvent } from '../../../base/common/observable.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { isITextModel } from '../../../editor/common/model.js';
import { equals } from '../../../base/common/arrays.js';
import { Event } from '../../../base/common/event.js';
let MainThreadTextEditors = class MainThreadTextEditors {
    static { MainThreadTextEditors_1 = this; }
    static { this.INSTANCE_COUNT = 0; }
    constructor(_editorLocator, extHostContext, _codeEditorService, _editorService, _editorGroupService, _configurationService, _quickDiffModelService, _uriIdentityService) {
        this._editorLocator = _editorLocator;
        this._codeEditorService = _codeEditorService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._configurationService = _configurationService;
        this._quickDiffModelService = _quickDiffModelService;
        this._uriIdentityService = _uriIdentityService;
        this._toDispose = new DisposableStore();
        this._instanceId = String(++MainThreadTextEditors_1.INSTANCE_COUNT);
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditors);
        this._textEditorsListenersMap = Object.create(null);
        this._editorPositionData = null;
        this._toDispose.add(this._editorService.onDidVisibleEditorsChange(() => this._updateActiveAndVisibleTextEditors()));
        this._toDispose.add(this._editorGroupService.onDidRemoveGroup(() => this._updateActiveAndVisibleTextEditors()));
        this._toDispose.add(this._editorGroupService.onDidMoveGroup(() => this._updateActiveAndVisibleTextEditors()));
        this._registeredDecorationTypes = Object.create(null);
    }
    dispose() {
        Object.keys(this._textEditorsListenersMap).forEach((editorId) => {
            dispose(this._textEditorsListenersMap[editorId]);
        });
        this._textEditorsListenersMap = Object.create(null);
        this._toDispose.dispose();
        for (const decorationType in this._registeredDecorationTypes) {
            this._codeEditorService.removeDecorationType(decorationType);
        }
        this._registeredDecorationTypes = Object.create(null);
    }
    handleTextEditorAdded(textEditor) {
        const id = textEditor.getId();
        const toDispose = [];
        toDispose.push(textEditor.onPropertiesChanged((data) => {
            this._proxy.$acceptEditorPropertiesChanged(id, data);
        }));
        const diffInformationObs = this._getTextEditorDiffInformation(textEditor, toDispose);
        toDispose.push(autorun(reader => {
            const diffInformation = diffInformationObs.read(reader);
            this._proxy.$acceptEditorDiffInformation(id, diffInformation);
        }));
        this._textEditorsListenersMap[id] = toDispose;
    }
    handleTextEditorRemoved(id) {
        dispose(this._textEditorsListenersMap[id]);
        delete this._textEditorsListenersMap[id];
    }
    _updateActiveAndVisibleTextEditors() {
        // editor columns
        const editorPositionData = this._getTextEditorPositionData();
        if (!objectEquals(this._editorPositionData, editorPositionData)) {
            this._editorPositionData = editorPositionData;
            this._proxy.$acceptEditorPositionData(this._editorPositionData);
        }
    }
    _getTextEditorPositionData() {
        const result = Object.create(null);
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const id = this._editorLocator.findTextEditorIdFor(editorPane);
            if (id) {
                result[id] = editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        return result;
    }
    _getTextEditorDiffInformation(textEditor, toDispose) {
        const codeEditor = textEditor.getCodeEditor();
        if (!codeEditor) {
            return constObservable(undefined);
        }
        // Check if the TextModel belongs to a DiffEditor
        const [diffEditor] = this._codeEditorService.listDiffEditors()
            .filter(d => d.getOriginalEditor().getId() === codeEditor.getId() ||
            d.getModifiedEditor().getId() === codeEditor.getId());
        const editorModelObs = diffEditor
            ? observableFromEvent(this, diffEditor.onDidChangeModel, () => diffEditor.getModel())
            : observableFromEvent(this, codeEditor.onDidChangeModel, () => codeEditor.getModel());
        const editorChangesObs = derived(reader => {
            const editorModel = editorModelObs.read(reader);
            if (!editorModel) {
                return constObservable(undefined);
            }
            const editorModelUri = isITextModel(editorModel)
                ? editorModel.uri
                : editorModel.modified.uri;
            // TextEditor
            if (isITextModel(editorModel)) {
                const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(editorModelUri);
                if (!quickDiffModelRef) {
                    return constObservable(undefined);
                }
                toDispose.push(quickDiffModelRef);
                return observableFromEvent(this, quickDiffModelRef.object.onDidChange, () => {
                    return quickDiffModelRef.object.getQuickDiffResults()
                        .map(result => ({
                        original: result.original,
                        modified: result.modified,
                        changes: result.changes2
                    }));
                });
            }
            // DirtyDiffModel - we create a dirty diff model for diff editor so that
            // we can provide multiple "original resources" to diff with the modified
            // resource.
            const diffAlgorithm = this._configurationService.getValue('diffEditor.diffAlgorithm');
            const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(editorModelUri, { algorithm: diffAlgorithm });
            if (!quickDiffModelRef) {
                return constObservable(undefined);
            }
            toDispose.push(quickDiffModelRef);
            return observableFromEvent(Event.any(quickDiffModelRef.object.onDidChange, diffEditor.onDidUpdateDiff), () => {
                const quickDiffInformation = quickDiffModelRef.object.getQuickDiffResults()
                    .map(result => ({
                    original: result.original,
                    modified: result.modified,
                    changes: result.changes2
                }));
                const diffChanges = diffEditor.getDiffComputationResult()?.changes2 ?? [];
                const diffInformation = [{
                        original: editorModel.original.uri,
                        modified: editorModel.modified.uri,
                        changes: diffChanges.map(change => change)
                    }];
                return [...quickDiffInformation, ...diffInformation];
            });
        });
        return derivedOpts({
            owner: this,
            equalsFn: (diff1, diff2) => equals(diff1, diff2, (a, b) => isTextEditorDiffInformationEqual(this._uriIdentityService, a, b))
        }, reader => {
            const editorModel = editorModelObs.read(reader);
            const editorChanges = editorChangesObs.read(reader).read(reader);
            if (!editorModel || !editorChanges) {
                return undefined;
            }
            const documentVersion = isITextModel(editorModel)
                ? editorModel.getVersionId()
                : editorModel.modified.getVersionId();
            return editorChanges.map(change => {
                const changes = change.changes
                    .map(change => [
                    change.original.startLineNumber,
                    change.original.endLineNumberExclusive,
                    change.modified.startLineNumber,
                    change.modified.endLineNumberExclusive
                ]);
                return {
                    documentVersion,
                    original: change.original,
                    modified: change.modified,
                    changes
                };
            });
        });
    }
    // --- from extension host process
    async $tryShowTextDocument(resource, options) {
        const uri = URI.revive(resource);
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.pinned,
            selection: options.selection,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
            override: EditorResolution.EXCLUSIVE_ONLY
        };
        const input = {
            resource: uri,
            options: editorOptions
        };
        const editor = await this._editorService.openEditor(input, columnToEditorGroup(this._editorGroupService, this._configurationService, options.position));
        if (!editor) {
            return undefined;
        }
        // Composite editors are made up of many editors so we return the active one at the time of opening
        const editorControl = editor.getControl();
        const codeEditor = getCodeEditor(editorControl);
        return codeEditor ? this._editorLocator.getIdOfCodeEditor(codeEditor) : undefined;
    }
    async $tryShowEditor(id, position) {
        const mainThreadEditor = this._editorLocator.getEditor(id);
        if (mainThreadEditor) {
            const model = mainThreadEditor.getModel();
            await this._editorService.openEditor({
                resource: model.uri,
                options: { preserveFocus: false }
            }, columnToEditorGroup(this._editorGroupService, this._configurationService, position));
            return;
        }
    }
    async $tryHideEditor(id) {
        const mainThreadEditor = this._editorLocator.getEditor(id);
        if (mainThreadEditor) {
            const editorPanes = this._editorService.visibleEditorPanes;
            for (const editorPane of editorPanes) {
                if (mainThreadEditor.matches(editorPane)) {
                    await editorPane.group.closeEditor(editorPane.input);
                    return;
                }
            }
        }
    }
    $trySetSelections(id, selections) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setSelections(selections);
        return Promise.resolve(undefined);
    }
    $trySetDecorations(id, key, ranges) {
        key = `${this._instanceId}-${key}`;
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setDecorations(key, ranges);
        return Promise.resolve(undefined);
    }
    $trySetDecorationsFast(id, key, ranges) {
        key = `${this._instanceId}-${key}`;
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setDecorationsFast(key, ranges);
        return Promise.resolve(undefined);
    }
    $tryRevealRange(id, range, revealType) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.revealRange(range, revealType);
        return Promise.resolve();
    }
    $trySetOptions(id, options) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setConfiguration(options);
        return Promise.resolve(undefined);
    }
    $tryApplyEdits(id, modelVersionId, edits, opts) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        return Promise.resolve(editor.applyEdits(modelVersionId, edits, opts));
    }
    $tryInsertSnippet(id, modelVersionId, template, ranges, opts) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        return Promise.resolve(editor.insertSnippet(modelVersionId, template, ranges, opts));
    }
    $registerTextEditorDecorationType(extensionId, key, options) {
        key = `${this._instanceId}-${key}`;
        this._registeredDecorationTypes[key] = true;
        this._codeEditorService.registerDecorationType(`exthost-api-${extensionId}`, key, options);
    }
    $removeTextEditorDecorationType(key) {
        key = `${this._instanceId}-${key}`;
        delete this._registeredDecorationTypes[key];
        this._codeEditorService.removeDecorationType(key);
    }
    $getDiffInformation(id) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(new Error('No such TextEditor'));
        }
        const codeEditor = editor.getCodeEditor();
        if (!codeEditor) {
            return Promise.reject(new Error('No such CodeEditor'));
        }
        const codeEditorId = codeEditor.getId();
        const diffEditors = this._codeEditorService.listDiffEditors();
        const [diffEditor] = diffEditors.filter(d => d.getOriginalEditor().getId() === codeEditorId || d.getModifiedEditor().getId() === codeEditorId);
        if (diffEditor) {
            return Promise.resolve(diffEditor.getLineChanges() || []);
        }
        if (!codeEditor.hasModel()) {
            return Promise.resolve([]);
        }
        const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(codeEditor.getModel().uri);
        if (!quickDiffModelRef) {
            return Promise.resolve([]);
        }
        try {
            const scmQuickDiff = quickDiffModelRef.object.quickDiffs.find(quickDiff => quickDiff.isSCM);
            const scmQuickDiffChanges = quickDiffModelRef.object.changes.filter(change => change.label === scmQuickDiff?.label);
            return Promise.resolve(scmQuickDiffChanges.map(change => change.change) ?? []);
        }
        finally {
            quickDiffModelRef.dispose();
        }
    }
};
MainThreadTextEditors = MainThreadTextEditors_1 = __decorate([
    __param(2, ICodeEditorService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, IConfigurationService),
    __param(6, IQuickDiffModelService),
    __param(7, IUriIdentityService)
], MainThreadTextEditors);
export { MainThreadTextEditors };
// --- commands
CommandsRegistry.registerCommand('_workbench.revertAllDirty', async function (accessor) {
    const environmentService = accessor.get(IEnvironmentService);
    if (!environmentService.extensionTestsLocationURI) {
        throw new Error('Command is only available when running extension tests.');
    }
    const workingCopyService = accessor.get(IWorkingCopyService);
    for (const workingCopy of workingCopyService.dirtyWorkingCopies) {
        await workingCopy.revert({ soft: true });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFlLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFLM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUE0QyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBOEIsZ0NBQWdDLEVBQXFCLE1BQU0sMkNBQTJDLENBQUM7QUFHMU4sT0FBTyxFQUFFLGNBQWMsRUFBa00sTUFBTSwrQkFBK0IsQ0FBQztBQUMvUCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQXFCLE1BQU0sbURBQW1ELENBQUM7QUFDaEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBSzlGLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSwwQ0FB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