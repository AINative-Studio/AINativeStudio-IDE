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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvbWVyZ2VFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQW1DLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHaEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2SixPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekksT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyx5QkFBeUIsQ0FBQztBQUVqQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUlqRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUN2SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFl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