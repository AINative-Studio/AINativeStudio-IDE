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
var MergeEditor_1, MergeEditorLayoutStore_1;
import { reset } from '../../../../../base/browser/dom.js';
import { SerializableGrid } from '../../../../../base/browser/ui/grid/grid.js';
import { Color } from '../../../../../base/common/color.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, thenIfNotDisposed, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, observableValue, transaction } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import './media/mergeEditor.css';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { AbstractTextEditor } from '../../../../browser/parts/editor/textEditor.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { applyTextEditorOptions } from '../../../../common/editor/editorOptions.js';
import { readTransientState, writeTransientState } from '../../../codeEditor/browser/toggleWordWrap.js';
import { MergeEditorInput } from '../mergeEditorInput.js';
import { deepMerge, PersistentStore } from '../utils.js';
import { BaseCodeEditorView } from './editors/baseCodeEditorView.js';
import { ScrollSynchronizer } from './scrollSynchronizer.js';
import { MergeEditorViewModel } from './viewModel.js';
import { ViewZoneComputer } from './viewZones.js';
import { ctxIsMergeEditor, ctxMergeBaseUri, ctxMergeEditorLayout, ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop, ctxMergeEditorShowNonConflictingChanges, ctxMergeResultUri } from '../../common/mergeEditor.js';
import { settingsSashBorder } from '../../../preferences/common/settingsEditorColorRegistry.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import './colors.js';
import { InputCodeEditorView } from './editors/inputCodeEditorView.js';
import { ResultCodeEditorView } from './editors/resultCodeEditorView.js';
let MergeEditor = class MergeEditor extends AbstractTextEditor {
    static { MergeEditor_1 = this; }
    static { this.ID = 'mergeEditor'; }
    get viewModel() {
        return this._viewModel;
    }
    get inputModel() {
        return this._inputModel;
    }
    get model() {
        return this.inputModel.get()?.model;
    }
    constructor(group, instantiation, contextKeyService, telemetryService, storageService, themeService, textResourceConfigurationService, editorService, editorGroupService, fileService, _codeEditorService) {
        super(MergeEditor_1.ID, group, telemetryService, instantiation, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
        this.contextKeyService = contextKeyService;
        this._codeEditorService = _codeEditorService;
        this._sessionDisposables = new DisposableStore();
        this._viewModel = observableValue(this, undefined);
        this._grid = this._register(new MutableDisposable());
        this.input1View = this._register(this.instantiationService.createInstance(InputCodeEditorView, 1, this._viewModel));
        this.baseView = observableValue(this, undefined);
        this.baseViewOptions = observableValue(this, undefined);
        this.input2View = this._register(this.instantiationService.createInstance(InputCodeEditorView, 2, this._viewModel));
        this.inputResultView = this._register(this.instantiationService.createInstance(ResultCodeEditorView, this._viewModel));
        this._layoutMode = this.instantiationService.createInstance(MergeEditorLayoutStore);
        this._layoutModeObs = observableValue(this, this._layoutMode.value);
        this._ctxIsMergeEditor = ctxIsMergeEditor.bindTo(this.contextKeyService);
        this._ctxUsesColumnLayout = ctxMergeEditorLayout.bindTo(this.contextKeyService);
        this._ctxShowBase = ctxMergeEditorShowBase.bindTo(this.contextKeyService);
        this._ctxShowBaseAtTop = ctxMergeEditorShowBaseAtTop.bindTo(this.contextKeyService);
        this._ctxResultUri = ctxMergeResultUri.bindTo(this.contextKeyService);
        this._ctxBaseUri = ctxMergeBaseUri.bindTo(this.contextKeyService);
        this._ctxShowNonConflictingChanges = ctxMergeEditorShowNonConflictingChanges.bindTo(this.contextKeyService);
        this._inputModel = observableValue(this, undefined);
        this.viewZoneComputer = new ViewZoneComputer(this.input1View.editor, this.input2View.editor, this.inputResultView.editor);
        this.scrollSynchronizer = this._register(new ScrollSynchronizer(this._viewModel, this.input1View, this.input2View, this.baseView, this.inputResultView, this._layoutModeObs));
        // #region layout constraints
        this._onDidChangeSizeConstraints = new Emitter();
        this.onDidChangeSizeConstraints = this._onDidChangeSizeConstraints.event;
        this.baseViewDisposables = this._register(new DisposableStore());
        this.showNonConflictingChangesStore = this.instantiationService.createInstance((PersistentStore), 'mergeEditor/showNonConflictingChanges');
        this.showNonConflictingChanges = observableValue(this, this.showNonConflictingChangesStore.get() ?? false);
    }
    dispose() {
        this._sessionDisposables.dispose();
        this._ctxIsMergeEditor.reset();
        this._ctxUsesColumnLayout.reset();
        this._ctxShowNonConflictingChanges.reset();
        super.dispose();
    }
    get minimumWidth() {
        return this._layoutMode.value.kind === 'mixed'
            ? this.input1View.view.minimumWidth + this.input2View.view.minimumWidth
            : this.input1View.view.minimumWidth + this.input2View.view.minimumWidth + this.inputResultView.view.minimumWidth;
    }
    // #endregion
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('mergeEditor', "Text Merge Editor");
    }
    createEditorControl(parent, initialOptions) {
        this.rootHtmlElement = parent;
        parent.classList.add('merge-editor');
        this.applyLayout(this._layoutMode.value);
        this.applyOptions(initialOptions);
    }
    updateEditorControlOptions(options) {
        this.applyOptions(options);
    }
    applyOptions(options) {
        const inputOptions = deepMerge(options, {
            minimap: { enabled: false },
            glyphMargin: false,
            lineNumbersMinChars: 2
        });
        const readOnlyInputOptions = deepMerge(inputOptions, {
            readOnly: true,
            readOnlyMessage: undefined
        });
        this.input1View.updateOptions(readOnlyInputOptions);
        this.input2View.updateOptions(readOnlyInputOptions);
        this.baseViewOptions.set({ ...this.input2View.editor.getRawOptions() }, undefined);
        this.inputResultView.updateOptions(inputOptions);
    }
    getMainControl() {
        return this.inputResultView.editor;
    }
    layout(dimension) {
        this._grid.value?.layout(dimension.width, dimension.height);
    }
    async setInput(input, options, context, token) {
        if (!(input instanceof MergeEditorInput)) {
            throw new BugIndicatingError('ONLY MergeEditorInput is supported');
        }
        await super.setInput(input, options, context, token);
        this._sessionDisposables.clear();
        transaction(tx => {
            this._viewModel.set(undefined, tx);
            this._inputModel.set(undefined, tx);
        });
        const inputModel = await input.resolve();
        const model = inputModel.model;
        const viewModel = this.instantiationService.createInstance(MergeEditorViewModel, model, this.input1View, this.input2View, this.inputResultView, this.baseView, this.showNonConflictingChanges);
        model.telemetry.reportMergeEditorOpened({
            combinableConflictCount: model.combinableConflictCount,
            conflictCount: model.conflictCount,
            baseTop: this._layoutModeObs.get().showBaseAtTop,
            baseVisible: this._layoutModeObs.get().showBase,
            isColumnView: this._layoutModeObs.get().kind === 'columns',
        });
        transaction(tx => {
            this._viewModel.set(viewModel, tx);
            this._inputModel.set(inputModel, tx);
        });
        this._sessionDisposables.add(viewModel);
        // Set/unset context keys based on input
        this._ctxResultUri.set(inputModel.resultUri.toString());
        this._ctxBaseUri.set(model.base.uri.toString());
        this._sessionDisposables.add(toDisposable(() => {
            this._ctxBaseUri.reset();
            this._ctxResultUri.reset();
        }));
        // Set the view zones before restoring view state!
        // Otherwise scrolling will be off
        this._sessionDisposables.add(autorunWithStore((reader, store) => {
            /** @description update alignment view zones */
            const baseView = this.baseView.read(reader);
            this.inputResultView.editor.changeViewZones(resultViewZoneAccessor => {
                const layout = this._layoutModeObs.read(reader);
                const shouldAlignResult = layout.kind === 'columns';
                const shouldAlignBase = layout.kind === 'mixed' && !layout.showBaseAtTop;
                this.input1View.editor.changeViewZones(input1ViewZoneAccessor => {
                    this.input2View.editor.changeViewZones(input2ViewZoneAccessor => {
                        if (baseView) {
                            baseView.editor.changeViewZones(baseViewZoneAccessor => {
                                store.add(this.setViewZones(reader, viewModel, this.input1View.editor, input1ViewZoneAccessor, this.input2View.editor, input2ViewZoneAccessor, baseView.editor, baseViewZoneAccessor, shouldAlignBase, this.inputResultView.editor, resultViewZoneAccessor, shouldAlignResult));
                            });
                        }
                        else {
                            store.add(this.setViewZones(reader, viewModel, this.input1View.editor, input1ViewZoneAccessor, this.input2View.editor, input2ViewZoneAccessor, undefined, undefined, false, this.inputResultView.editor, resultViewZoneAccessor, shouldAlignResult));
                        }
                    });
                });
            });
            this.scrollSynchronizer.updateScrolling();
        }));
        const viewState = this.loadEditorViewState(input, context);
        if (viewState) {
            this._applyViewState(viewState);
        }
        else {
            this._sessionDisposables.add(thenIfNotDisposed(model.onInitialized, () => {
                const firstConflict = model.modifiedBaseRanges.get().find(r => r.isConflicting);
                if (!firstConflict) {
                    return;
                }
                this.input1View.editor.revealLineInCenter(firstConflict.input1Range.startLineNumber);
                transaction(tx => {
                    /** @description setActiveModifiedBaseRange */
                    viewModel.setActiveModifiedBaseRange(firstConflict, tx);
                });
            }));
        }
        // word wrap special case - sync transient state from result model to input[1|2] models
        const mirrorWordWrapTransientState = (candidate) => {
            const candidateState = readTransientState(candidate, this._codeEditorService);
            writeTransientState(model.input2.textModel, candidateState, this._codeEditorService);
            writeTransientState(model.input1.textModel, candidateState, this._codeEditorService);
            writeTransientState(model.resultTextModel, candidateState, this._codeEditorService);
            const baseTextModel = this.baseView.get()?.editor.getModel();
            if (baseTextModel) {
                writeTransientState(baseTextModel, candidateState, this._codeEditorService);
            }
        };
        this._sessionDisposables.add(this._codeEditorService.onDidChangeTransientModelProperty(candidate => {
            mirrorWordWrapTransientState(candidate);
        }));
        mirrorWordWrapTransientState(this.inputResultView.editor.getModel());
        // detect when base, input1, and input2 become empty and replace THIS editor with its result editor
        // TODO@jrieken@hediet this needs a better/cleaner solution
        // https://github.com/microsoft/vscode/issues/155940
        const that = this;
        this._sessionDisposables.add(new class {
            constructor() {
                this._disposable = new DisposableStore();
                for (const model of this.baseInput1Input2()) {
                    this._disposable.add(model.onDidChangeContent(() => this._checkBaseInput1Input2AllEmpty()));
                }
            }
            dispose() {
                this._disposable.dispose();
            }
            *baseInput1Input2() {
                yield model.base;
                yield model.input1.textModel;
                yield model.input2.textModel;
            }
            _checkBaseInput1Input2AllEmpty() {
                for (const model of this.baseInput1Input2()) {
                    if (model.getValueLength() > 0) {
                        return;
                    }
                }
                // all empty -> replace this editor with a normal editor for result
                that.editorService.replaceEditors([{ editor: input, replacement: { resource: input.result, options: { preserveFocus: true } }, forceReplaceDirty: true }], that.group);
            }
        });
    }
    setViewZones(reader, viewModel, input1Editor, input1ViewZoneAccessor, input2Editor, input2ViewZoneAccessor, baseEditor, baseViewZoneAccessor, shouldAlignBase, resultEditor, resultViewZoneAccessor, shouldAlignResult) {
        const input1ViewZoneIds = [];
        const input2ViewZoneIds = [];
        const baseViewZoneIds = [];
        const resultViewZoneIds = [];
        const viewZones = this.viewZoneComputer.computeViewZones(reader, viewModel, {
            codeLensesVisible: true,
            showNonConflictingChanges: this.showNonConflictingChanges.read(reader),
            shouldAlignBase,
            shouldAlignResult,
        });
        const disposableStore = new DisposableStore();
        if (baseViewZoneAccessor) {
            for (const v of viewZones.baseViewZones) {
                v.create(baseViewZoneAccessor, baseViewZoneIds, disposableStore);
            }
        }
        for (const v of viewZones.resultViewZones) {
            v.create(resultViewZoneAccessor, resultViewZoneIds, disposableStore);
        }
        for (const v of viewZones.input1ViewZones) {
            v.create(input1ViewZoneAccessor, input1ViewZoneIds, disposableStore);
        }
        for (const v of viewZones.input2ViewZones) {
            v.create(input2ViewZoneAccessor, input2ViewZoneIds, disposableStore);
        }
        disposableStore.add({
            dispose: () => {
                input1Editor.changeViewZones(a => {
                    for (const zone of input1ViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                input2Editor.changeViewZones(a => {
                    for (const zone of input2ViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                baseEditor?.changeViewZones(a => {
                    for (const zone of baseViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                resultEditor.changeViewZones(a => {
                    for (const zone of resultViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
            }
        });
        return disposableStore;
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            applyTextEditorOptions(options, this.inputResultView.editor, 0 /* ScrollType.Smooth */);
        }
    }
    clearInput() {
        super.clearInput();
        this._sessionDisposables.clear();
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            editor.setModel(null);
        }
    }
    focus() {
        super.focus();
        (this.getControl() ?? this.inputResultView.editor).focus();
    }
    hasFocus() {
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            if (editor.hasTextFocus()) {
                return true;
            }
        }
        return super.hasFocus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            if (visible) {
                editor.onVisible();
            }
            else {
                editor.onHide();
            }
        }
        this._ctxIsMergeEditor.set(visible);
    }
    // ---- interact with "outside world" via`getControl`, `scopedContextKeyService`: we only expose the result-editor keep the others internal
    getControl() {
        return this.inputResultView.editor;
    }
    get scopedContextKeyService() {
        const control = this.getControl();
        return control?.invokeWithinContext(accessor => accessor.get(IContextKeyService));
    }
    // --- layout
    toggleBase() {
        this.setLayout({
            ...this._layoutMode.value,
            showBase: !this._layoutMode.value.showBase
        });
    }
    toggleShowBaseTop() {
        const showBaseTop = this._layoutMode.value.showBase && this._layoutMode.value.showBaseAtTop;
        this.setLayout({
            ...this._layoutMode.value,
            showBaseAtTop: true,
            showBase: !showBaseTop,
        });
    }
    toggleShowBaseCenter() {
        const showBaseCenter = this._layoutMode.value.showBase && !this._layoutMode.value.showBaseAtTop;
        this.setLayout({
            ...this._layoutMode.value,
            showBaseAtTop: false,
            showBase: !showBaseCenter,
        });
    }
    setLayoutKind(kind) {
        this.setLayout({
            ...this._layoutMode.value,
            kind
        });
    }
    setLayout(newLayout) {
        const value = this._layoutMode.value;
        if (JSON.stringify(value) === JSON.stringify(newLayout)) {
            return;
        }
        this.model?.telemetry.reportLayoutChange({
            baseTop: newLayout.showBaseAtTop,
            baseVisible: newLayout.showBase,
            isColumnView: newLayout.kind === 'columns',
        });
        this.applyLayout(newLayout);
    }
    applyLayout(layout) {
        transaction(tx => {
            /** @description applyLayout */
            if (layout.showBase && !this.baseView.get()) {
                this.baseViewDisposables.clear();
                const baseView = this.baseViewDisposables.add(this.instantiationService.createInstance(BaseCodeEditorView, this.viewModel));
                this.baseViewDisposables.add(autorun(reader => {
                    /** @description Update base view options */
                    const options = this.baseViewOptions.read(reader);
                    if (options) {
                        baseView.updateOptions(options);
                    }
                }));
                this.baseView.set(baseView, tx);
            }
            else if (!layout.showBase && this.baseView.get()) {
                this.baseView.set(undefined, tx);
                this.baseViewDisposables.clear();
            }
            if (layout.kind === 'mixed') {
                this.setGrid([
                    layout.showBaseAtTop && layout.showBase ? {
                        size: 38,
                        data: this.baseView.get().view
                    } : undefined,
                    {
                        size: 38,
                        groups: [
                            { data: this.input1View.view },
                            !layout.showBaseAtTop && layout.showBase ? { data: this.baseView.get().view } : undefined,
                            { data: this.input2View.view }
                        ].filter(isDefined)
                    },
                    {
                        size: 62,
                        data: this.inputResultView.view
                    },
                ].filter(isDefined));
            }
            else if (layout.kind === 'columns') {
                this.setGrid([
                    layout.showBase ? {
                        size: 40,
                        data: this.baseView.get().view
                    } : undefined,
                    {
                        size: 60,
                        groups: [{ data: this.input1View.view }, { data: this.inputResultView.view }, { data: this.input2View.view }]
                    },
                ].filter(isDefined));
            }
            this._layoutMode.value = layout;
            this._ctxUsesColumnLayout.set(layout.kind);
            this._ctxShowBase.set(layout.showBase);
            this._ctxShowBaseAtTop.set(layout.showBaseAtTop);
            this._onDidChangeSizeConstraints.fire();
            this._layoutModeObs.set(layout, tx);
        });
    }
    setGrid(descriptor) {
        let width = -1;
        let height = -1;
        if (this._grid.value) {
            width = this._grid.value.width;
            height = this._grid.value.height;
        }
        this._grid.value = SerializableGrid.from({
            orientation: 0 /* Orientation.VERTICAL */,
            size: 100,
            groups: descriptor,
        }, {
            styles: { separatorBorder: this.theme.getColor(settingsSashBorder) ?? Color.transparent },
            proportionalLayout: true
        });
        reset(this.rootHtmlElement, this._grid.value.element);
        // Only call layout after the elements have been added to the DOM,
        // so that they have a defined size.
        if (width !== -1) {
            this._grid.value.layout(width, height);
        }
    }
    _applyViewState(state) {
        if (!state) {
            return;
        }
        this.inputResultView.editor.restoreViewState(state);
        if (state.input1State) {
            this.input1View.editor.restoreViewState(state.input1State);
        }
        if (state.input2State) {
            this.input2View.editor.restoreViewState(state.input2State);
        }
        if (state.focusIndex >= 0) {
            [this.input1View.editor, this.input2View.editor, this.inputResultView.editor][state.focusIndex].focus();
        }
    }
    computeEditorViewState(resource) {
        if (!isEqual(this.inputModel.get()?.resultUri, resource)) {
            return undefined;
        }
        const result = this.inputResultView.editor.saveViewState();
        if (!result) {
            return undefined;
        }
        const input1State = this.input1View.editor.saveViewState() ?? undefined;
        const input2State = this.input2View.editor.saveViewState() ?? undefined;
        const focusIndex = [this.input1View.editor, this.input2View.editor, this.inputResultView.editor].findIndex(editor => editor.hasWidgetFocus());
        return { ...result, input1State, input2State, focusIndex };
    }
    tracksEditorViewState(input) {
        return input instanceof MergeEditorInput;
    }
    toggleShowNonConflictingChanges() {
        this.showNonConflictingChanges.set(!this.showNonConflictingChanges.get(), undefined);
        this.showNonConflictingChangesStore.set(this.showNonConflictingChanges.get());
        this._ctxShowNonConflictingChanges.set(this.showNonConflictingChanges.get());
    }
};
MergeEditor = MergeEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IThemeService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IFileService),
    __param(10, ICodeEditorService)
], MergeEditor);
export { MergeEditor };
// TODO use PersistentStore
let MergeEditorLayoutStore = class MergeEditorLayoutStore {
    static { MergeEditorLayoutStore_1 = this; }
    static { this._key = 'mergeEditor/layout'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        this._value = { kind: 'mixed', showBase: false, showBaseAtTop: true };
        const value = _storageService.get(MergeEditorLayoutStore_1._key, 0 /* StorageScope.PROFILE */, 'mixed');
        if (value === 'mixed' || value === 'columns') {
            this._value = { kind: value, showBase: false, showBaseAtTop: true };
        }
        else if (value) {
            try {
                this._value = JSON.parse(value);
            }
            catch (e) {
                onUnexpectedError(e);
            }
        }
    }
    get value() {
        return this._value;
    }
    set value(value) {
        if (this._value !== value) {
            this._value = value;
            this._storageService.store(MergeEditorLayoutStore_1._key, JSON.stringify(this._value), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
};
MergeEditorLayoutStore = MergeEditorLayoutStore_1 = __decorate([
    __param(0, IStorageService)
], MergeEditorLayoutStore);
let MergeEditorOpenHandlerContribution = class MergeEditorOpenHandlerContribution extends Disposable {
    constructor(_editorService, codeEditorService) {
        super();
        this._editorService = _editorService;
        this._store.add(codeEditorService.registerCodeEditorOpenHandler(this.openCodeEditorFromMergeEditor.bind(this)));
    }
    async openCodeEditorFromMergeEditor(input, _source, sideBySide) {
        const activePane = this._editorService.activeEditorPane;
        if (!sideBySide
            && input.options
            && activePane instanceof MergeEditor
            && activePane.getControl()
            && activePane.input instanceof MergeEditorInput
            && isEqual(input.resource, activePane.input.result)) {
            // Special: stay inside the merge editor when it is active and when the input
            // targets the result editor of the merge editor.
            const targetEditor = activePane.getControl();
            applyTextEditorOptions(input.options, targetEditor, 0 /* ScrollType.Smooth */);
            return targetEditor;
        }
        // cannot handle this
        return null;
    }
};
MergeEditorOpenHandlerContribution = __decorate([
    __param(0, IEditorService),
    __param(1, ICodeEditorService)
], MergeEditorOpenHandlerContribution);
export { MergeEditorOpenHandlerContribution };
let MergeEditorResolverContribution = class MergeEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.mergeEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        const mergeEditorInputFactory = (mergeEditor) => {
            return {
                editor: instantiationService.createInstance(MergeEditorInput, mergeEditor.base.resource, {
                    uri: mergeEditor.input1.resource,
                    title: mergeEditor.input1.label ?? basename(mergeEditor.input1.resource),
                    description: mergeEditor.input1.description ?? '',
                    detail: mergeEditor.input1.detail
                }, {
                    uri: mergeEditor.input2.resource,
                    title: mergeEditor.input2.label ?? basename(mergeEditor.input2.resource),
                    description: mergeEditor.input2.description ?? '',
                    detail: mergeEditor.input2.detail
                }, mergeEditor.result.resource)
            };
        };
        this._register(editorResolverService.registerEditor(`*`, {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createMergeEditorInput: mergeEditorInputFactory
        }));
    }
};
MergeEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], MergeEditorResolverContribution);
export { MergeEditorResolverContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L21lcmdlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWEsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFtQyxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBR2hILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkosT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE9BQU8seUJBQXlCLENBQUM7QUFFakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFJakcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDdkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFB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