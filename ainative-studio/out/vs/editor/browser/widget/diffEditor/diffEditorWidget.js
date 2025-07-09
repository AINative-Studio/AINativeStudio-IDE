var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, h } from '../../../../base/browser/dom.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedDisposable, disposableObservableValue, observableFromEvent, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction } from '../../../../base/common/observable.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorType } from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { StableEditorScrollState } from '../../stableEditorScroll.js';
import { CodeEditorWidget } from '../codeEditor/codeEditorWidget.js';
import { AccessibleDiffViewer, AccessibleDiffViewerModelFromEditors } from './components/accessibleDiffViewer.js';
import { DiffEditorDecorations } from './components/diffEditorDecorations.js';
import { DiffEditorEditors } from './components/diffEditorEditors.js';
import { DiffEditorSash, SashLayout } from './components/diffEditorSash.js';
import { DiffEditorViewZones } from './components/diffEditorViewZones/diffEditorViewZones.js';
import { DelegatingEditor } from './delegatingEditorImpl.js';
import { DiffEditorOptions } from './diffEditorOptions.js';
import { DiffEditorViewModel } from './diffEditorViewModel.js';
import { DiffEditorGutter } from './features/gutterFeature.js';
import { HideUnchangedRegionsFeature } from './features/hideUnchangedRegionsFeature.js';
import { MovedBlocksLinesFeature } from './features/movedBlocksLinesFeature.js';
import { OverviewRulerFeature } from './features/overviewRulerFeature.js';
import { RevertButtonsFeature } from './features/revertButtonsFeature.js';
import './style.css';
import { ObservableElementSizeObserver, RefCounted, applyStyle, applyViewZones, translatePosition } from './utils.js';
let DiffEditorWidget = class DiffEditorWidget extends DelegatingEditor {
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH; }
    get onDidContentSizeChange() { return this._editors.onDidContentSizeChange; }
    get collapseUnchangedRegions() { return this._options.hideUnchangedRegions.get(); }
    constructor(_domElement, options, codeEditorWidgetOptions, _parentContextKeyService, _parentInstantiationService, codeEditorService, _accessibilitySignalService, _editorProgressService) {
        super();
        this._domElement = _domElement;
        this._parentContextKeyService = _parentContextKeyService;
        this._parentInstantiationService = _parentInstantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._editorProgressService = _editorProgressService;
        this.elements = h('div.monaco-diff-editor.side-by-side', { style: { position: 'relative', height: '100%' } }, [
            h('div.editor.original@original', { style: { position: 'absolute', height: '100%', } }),
            h('div.editor.modified@modified', { style: { position: 'absolute', height: '100%', } }),
            h('div.accessibleDiffViewer@accessibleDiffViewer', { style: { position: 'absolute', height: '100%' } }),
        ]);
        this._diffModelSrc = this._register(disposableObservableValue(this, undefined));
        this._diffModel = derived(this, reader => this._diffModelSrc.read(reader)?.object);
        this.onDidChangeModel = Event.fromObservableLight(this._diffModel);
        this._contextKeyService = this._register(this._parentContextKeyService.createScoped(this._domElement));
        this._instantiationService = this._register(this._parentInstantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._boundarySashes = observableValue(this, undefined);
        this._accessibleDiffViewerShouldBeVisible = observableValue(this, false);
        this._accessibleDiffViewerVisible = derived(this, reader => this._options.onlyShowAccessibleDiffViewer.read(reader)
            ? true
            : this._accessibleDiffViewerShouldBeVisible.read(reader));
        this._movedBlocksLinesPart = observableValue(this, undefined);
        this._layoutInfo = derived(this, reader => {
            const fullWidth = this._rootSizeObserver.width.read(reader);
            const fullHeight = this._rootSizeObserver.height.read(reader);
            if (this._rootSizeObserver.automaticLayout) {
                this.elements.root.style.height = '100%';
            }
            else {
                this.elements.root.style.height = fullHeight + 'px';
            }
            const sash = this._sash.read(reader);
            const gutter = this._gutter.read(reader);
            const gutterWidth = gutter?.width.read(reader) ?? 0;
            const overviewRulerPartWidth = this._overviewRulerPart.read(reader)?.width ?? 0;
            let originalLeft, originalWidth, modifiedLeft, modifiedWidth, gutterLeft;
            const sideBySide = !!sash;
            if (sideBySide) {
                const sashLeft = sash.sashLeft.read(reader);
                const movedBlocksLinesWidth = this._movedBlocksLinesPart.read(reader)?.width.read(reader) ?? 0;
                originalLeft = 0;
                originalWidth = sashLeft - gutterWidth - movedBlocksLinesWidth;
                gutterLeft = sashLeft - gutterWidth;
                modifiedLeft = sashLeft;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            else {
                gutterLeft = 0;
                const shouldHideOriginalLineNumbers = this._options.inlineViewHideOriginalLineNumbers.read(reader);
                originalLeft = gutterWidth;
                if (shouldHideOriginalLineNumbers) {
                    originalWidth = 0;
                }
                else {
                    originalWidth = Math.max(5, this._editors.originalObs.layoutInfoDecorationsLeft.read(reader));
                }
                modifiedLeft = gutterWidth + originalWidth;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            this.elements.original.style.left = originalLeft + 'px';
            this.elements.original.style.width = originalWidth + 'px';
            this._editors.original.layout({ width: originalWidth, height: fullHeight }, true);
            gutter?.layout(gutterLeft);
            this.elements.modified.style.left = modifiedLeft + 'px';
            this.elements.modified.style.width = modifiedWidth + 'px';
            this._editors.modified.layout({ width: modifiedWidth, height: fullHeight }, true);
            return {
                modifiedEditor: this._editors.modified.getLayoutInfo(),
                originalEditor: this._editors.original.getLayoutInfo(),
            };
        });
        this._diffValue = this._diffModel.map((m, r) => m?.diff.read(r));
        this.onDidUpdateDiff = Event.fromObservableLight(this._diffValue);
        codeEditorService.willCreateDiffEditor();
        this._contextKeyService.createKey('isInDiffEditor', true);
        this._domElement.appendChild(this.elements.root);
        this._register(toDisposable(() => this.elements.root.remove()));
        this._rootSizeObserver = this._register(new ObservableElementSizeObserver(this.elements.root, options.dimension));
        this._rootSizeObserver.setAutomaticLayout(options.automaticLayout ?? false);
        this._options = this._instantiationService.createInstance(DiffEditorOptions, options);
        this._register(autorun(reader => {
            this._options.setWidth(this._rootSizeObserver.width.read(reader));
        }));
        this._contextKeyService.createKey(EditorContextKeys.isEmbeddedDiffEditor.key, false);
        this._register(bindContextKey(EditorContextKeys.isEmbeddedDiffEditor, this._contextKeyService, reader => this._options.isInEmbeddedEditor.read(reader)));
        this._register(bindContextKey(EditorContextKeys.comparingMovedCode, this._contextKeyService, reader => !!this._diffModel.read(reader)?.movedTextToCompare.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached, this._contextKeyService, reader => this._options.couldShowInlineViewBecauseOfSize.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorInlineMode, this._contextKeyService, reader => !this._options.renderSideBySide.read(reader)));
        this._register(bindContextKey(EditorContextKeys.hasChanges, this._contextKeyService, reader => (this._diffModel.read(reader)?.diff.read(reader)?.mappings.length ?? 0) > 0));
        this._editors = this._register(this._instantiationService.createInstance(DiffEditorEditors, this.elements.original, this.elements.modified, this._options, codeEditorWidgetOptions, (i, c, o, o2) => this._createInnerEditor(i, c, o, o2)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalWritable, this._contextKeyService, reader => this._options.originalEditable.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedWritable, this._contextKeyService, reader => !this._options.readOnly.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalUri, this._contextKeyService, reader => this._diffModel.read(reader)?.model.original.uri.toString() ?? ''));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedUri, this._contextKeyService, reader => this._diffModel.read(reader)?.model.modified.uri.toString() ?? ''));
        this._overviewRulerPart = derivedDisposable(this, reader => !this._options.renderOverviewRuler.read(reader)
            ? undefined
            : this._instantiationService.createInstance(readHotReloadableExport(OverviewRulerFeature, reader), this._editors, this.elements.root, this._diffModel, this._rootSizeObserver.width, this._rootSizeObserver.height, this._layoutInfo.map(i => i.modifiedEditor))).recomputeInitiallyAndOnChange(this._store);
        const dimensions = {
            height: this._rootSizeObserver.height,
            width: this._rootSizeObserver.width.map((w, reader) => w - (this._overviewRulerPart.read(reader)?.width ?? 0)),
        };
        this._sashLayout = new SashLayout(this._options, dimensions);
        this._sash = derivedDisposable(this, reader => {
            const showSash = this._options.renderSideBySide.read(reader);
            this.elements.root.classList.toggle('side-by-side', showSash);
            return !showSash ? undefined : new DiffEditorSash(this.elements.root, dimensions, this._options.enableSplitViewResizing, this._boundarySashes, this._sashLayout.sashLeft, () => this._sashLayout.resetSash());
        }).recomputeInitiallyAndOnChange(this._store);
        const unchangedRangesFeature = derivedDisposable(this, reader => /** @description UnchangedRangesFeature */ this._instantiationService.createInstance(readHotReloadableExport(HideUnchangedRegionsFeature, reader), this._editors, this._diffModel, this._options)).recomputeInitiallyAndOnChange(this._store);
        derivedDisposable(this, reader => /** @description DiffEditorDecorations */ this._instantiationService.createInstance(readHotReloadableExport(DiffEditorDecorations, reader), this._editors, this._diffModel, this._options, this)).recomputeInitiallyAndOnChange(this._store);
        const origViewZoneIdsToIgnore = new Set();
        const modViewZoneIdsToIgnore = new Set();
        let isUpdatingViewZones = false;
        const viewZoneManager = derivedDisposable(this, reader => /** @description ViewZoneManager */ this._instantiationService.createInstance(readHotReloadableExport(DiffEditorViewZones, reader), getWindow(this._domElement), this._editors, this._diffModel, this._options, this, () => isUpdatingViewZones || unchangedRangesFeature.get().isUpdatingHiddenAreas, origViewZoneIdsToIgnore, modViewZoneIdsToIgnore)).recomputeInitiallyAndOnChange(this._store);
        const originalViewZones = derived(this, (reader) => {
            const orig = viewZoneManager.read(reader).viewZones.read(reader).orig;
            const orig2 = unchangedRangesFeature.read(reader).viewZones.read(reader).origViewZones;
            return orig.concat(orig2);
        });
        const modifiedViewZones = derived(this, (reader) => {
            const mod = viewZoneManager.read(reader).viewZones.read(reader).mod;
            const mod2 = unchangedRangesFeature.read(reader).viewZones.read(reader).modViewZones;
            return mod.concat(mod2);
        });
        this._register(applyViewZones(this._editors.original, originalViewZones, isUpdatingOrigViewZones => {
            isUpdatingViewZones = isUpdatingOrigViewZones;
        }, origViewZoneIdsToIgnore));
        let scrollState;
        this._register(applyViewZones(this._editors.modified, modifiedViewZones, isUpdatingModViewZones => {
            isUpdatingViewZones = isUpdatingModViewZones;
            if (isUpdatingViewZones) {
                scrollState = StableEditorScrollState.capture(this._editors.modified);
            }
            else {
                scrollState?.restore(this._editors.modified);
                scrollState = undefined;
            }
        }, modViewZoneIdsToIgnore));
        this._accessibleDiffViewer = derivedDisposable(this, reader => this._instantiationService.createInstance(readHotReloadableExport(AccessibleDiffViewer, reader), this.elements.accessibleDiffViewer, this._accessibleDiffViewerVisible, (visible, tx) => this._accessibleDiffViewerShouldBeVisible.set(visible, tx), this._options.onlyShowAccessibleDiffViewer.map(v => !v), this._rootSizeObserver.width, this._rootSizeObserver.height, this._diffModel.map((m, r) => m?.diff.read(r)?.mappings.map(m => m.lineRangeMapping)), new AccessibleDiffViewerModelFromEditors(this._editors))).recomputeInitiallyAndOnChange(this._store);
        const visibility = this._accessibleDiffViewerVisible.map(v => v ? 'hidden' : 'visible');
        this._register(applyStyle(this.elements.modified, { visibility }));
        this._register(applyStyle(this.elements.original, { visibility }));
        this._createDiffEditorContributions();
        codeEditorService.addDiffEditor(this);
        this._gutter = derivedDisposable(this, reader => {
            return this._options.shouldRenderGutterMenu.read(reader)
                ? this._instantiationService.createInstance(readHotReloadableExport(DiffEditorGutter, reader), this.elements.root, this._diffModel, this._editors, this._options, this._sashLayout, this._boundarySashes)
                : undefined;
        });
        this._register(recomputeInitiallyAndOnChange(this._layoutInfo));
        derivedDisposable(this, reader => /** @description MovedBlocksLinesPart */ new (readHotReloadableExport(MovedBlocksLinesFeature, reader))(this.elements.root, this._diffModel, this._layoutInfo.map(i => i.originalEditor), this._layoutInfo.map(i => i.modifiedEditor), this._editors)).recomputeInitiallyAndOnChange(this._store, value => {
            // This is to break the layout info <-> moved blocks lines part dependency cycle.
            this._movedBlocksLinesPart.set(value, undefined);
        });
        this._register(Event.runAndSubscribe(this._editors.modified.onDidChangeCursorPosition, e => this._handleCursorPositionChange(e, true)));
        this._register(Event.runAndSubscribe(this._editors.original.onDidChangeCursorPosition, e => this._handleCursorPositionChange(e, false)));
        const isInitializingDiff = this._diffModel.map(this, (m, reader) => {
            /** @isInitializingDiff isDiffUpToDate */
            if (!m) {
                return undefined;
            }
            return m.diff.read(reader) === undefined && !m.isDiffUpToDate.read(reader);
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description DiffEditorWidgetHelper.ShowProgress */
            if (isInitializingDiff.read(reader) === true) {
                const r = this._editorProgressService.show(true, 1000);
                store.add(toDisposable(() => r.done()));
            }
        }));
        this._register(autorunWithStore((reader, store) => {
            store.add(new (readHotReloadableExport(RevertButtonsFeature, reader))(this._editors, this._diffModel, this._options, this));
        }));
        this._register(autorunWithStore((reader, store) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return;
            }
            for (const m of [model.model.original, model.model.modified]) {
                store.add(m.onWillDispose(e => {
                    onUnexpectedError(new BugIndicatingError('TextModel got disposed before DiffEditorWidget model got reset'));
                    this.setModel(null);
                }));
            }
        }));
        this._register(autorun(reader => {
            this._options.setModel(this._diffModel.read(reader));
        }));
    }
    getViewWidth() {
        return this._rootSizeObserver.width.get();
    }
    getContentHeight() {
        return this._editors.modified.getContentHeight();
    }
    _createInnerEditor(instantiationService, container, options, editorWidgetOptions) {
        const editor = instantiationService.createInstance(CodeEditorWidget, container, options, editorWidgetOptions);
        return editor;
    }
    _createDiffEditorContributions() {
        const contributions = EditorExtensionsRegistry.getDiffEditorContributions();
        for (const desc of contributions) {
            try {
                this._register(this._instantiationService.createInstance(desc.ctor, this));
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
    }
    get _targetEditor() { return this._editors.modified; }
    getEditorType() { return EditorType.IDiffEditor; }
    onVisible() {
        // TODO: Only compute diffs when diff editor is visible
        this._editors.original.onVisible();
        this._editors.modified.onVisible();
    }
    onHide() {
        this._editors.original.onHide();
        this._editors.modified.onHide();
    }
    layout(dimension) {
        this._rootSizeObserver.observe(dimension);
    }
    hasTextFocus() { return this._editors.original.hasTextFocus() || this._editors.modified.hasTextFocus(); }
    saveViewState() {
        const originalViewState = this._editors.original.saveViewState();
        const modifiedViewState = this._editors.modified.saveViewState();
        return {
            original: originalViewState,
            modified: modifiedViewState,
            modelState: this._diffModel.get()?.serializeState(),
        };
    }
    restoreViewState(s) {
        if (s && s.original && s.modified) {
            const diffEditorState = s;
            this._editors.original.restoreViewState(diffEditorState.original);
            this._editors.modified.restoreViewState(diffEditorState.modified);
            if (diffEditorState.modelState) {
                this._diffModel.get()?.restoreSerializedState(diffEditorState.modelState);
            }
        }
    }
    handleInitialized() {
        this._editors.original.handleInitialized();
        this._editors.modified.handleInitialized();
    }
    createViewModel(model) {
        return this._instantiationService.createInstance(DiffEditorViewModel, model, this._options);
    }
    getModel() { return this._diffModel.get()?.model ?? null; }
    setModel(model) {
        const vm = !model ? null
            : ('model' in model) ? RefCounted.create(model).createNewRef(this)
                : RefCounted.create(this.createViewModel(model), this);
        this.setDiffModel(vm);
    }
    setDiffModel(viewModel, tx) {
        const currentModel = this._diffModel.get();
        if (!viewModel && currentModel) {
            // Transitioning from a model to no-model
            this._accessibleDiffViewer.get().close();
        }
        if (this._diffModel.get() !== viewModel?.object) {
            subtransaction(tx, tx => {
                const vm = viewModel?.object;
                /** @description DiffEditorWidget.setModel */
                observableFromEvent.batchEventsGlobally(tx, () => {
                    this._editors.original.setModel(vm ? vm.model.original : null);
                    this._editors.modified.setModel(vm ? vm.model.modified : null);
                });
                const prevValueRef = this._diffModelSrc.get()?.createNewRef(this);
                this._diffModelSrc.set(viewModel?.createNewRef(this), tx);
                setTimeout(() => {
                    // async, so that this runs after the transaction finished.
                    // TODO: use the transaction to schedule disposal
                    prevValueRef?.dispose();
                }, 0);
            });
        }
    }
    /**
     * @param changedOptions Only has values for top-level options that have actually changed.
     */
    updateOptions(changedOptions) {
        this._options.updateOptions(changedOptions);
    }
    getDomNode() { return this.elements.root; }
    getContainerDomNode() { return this._domElement; }
    getOriginalEditor() { return this._editors.original; }
    getModifiedEditor() { return this._editors.modified; }
    setBoundarySashes(sashes) {
        this._boundarySashes.set(sashes, undefined);
    }
    get ignoreTrimWhitespace() { return this._options.ignoreTrimWhitespace.get(); }
    get maxComputationTime() { return this._options.maxComputationTimeMs.get(); }
    get renderSideBySide() { return this._options.renderSideBySide.get(); }
    /**
     * @deprecated Use `this.getDiffComputationResult().changes2` instead.
     */
    getLineChanges() {
        const diffState = this._diffModel.get()?.diff.get();
        if (!diffState) {
            return null;
        }
        return toLineChanges(diffState);
    }
    getDiffComputationResult() {
        const diffState = this._diffModel.get()?.diff.get();
        if (!diffState) {
            return null;
        }
        return {
            changes: this.getLineChanges(),
            changes2: diffState.mappings.map(m => m.lineRangeMapping),
            identical: diffState.identical,
            quitEarly: diffState.quitEarly,
        };
    }
    revert(diff) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        this._editors.modified.executeEdits('diffEditor', [
            {
                range: diff.modified.toExclusiveRange(),
                text: model.model.original.getValueInRange(diff.original.toExclusiveRange())
            }
        ]);
    }
    revertRangeMappings(diffs) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        const changes = diffs.map(c => ({
            range: c.modifiedRange,
            text: model.model.original.getValueInRange(c.originalRange)
        }));
        this._editors.modified.executeEdits('diffEditor', changes);
    }
    _goTo(diff) {
        this._editors.modified.setPosition(new Position(diff.lineRangeMapping.modified.startLineNumber, 1));
        this._editors.modified.revealRangeInCenter(diff.lineRangeMapping.modified.toExclusiveRange());
    }
    goToDiff(target) {
        const diffs = this._diffModel.get()?.diff.get()?.mappings;
        if (!diffs || diffs.length === 0) {
            return;
        }
        const curLineNumber = this._editors.modified.getPosition().lineNumber;
        let diff;
        if (target === 'next') {
            diff = diffs.find(d => d.lineRangeMapping.modified.startLineNumber > curLineNumber) ?? diffs[0];
        }
        else {
            diff = findLast(diffs, d => d.lineRangeMapping.modified.startLineNumber < curLineNumber) ?? diffs[diffs.length - 1];
        }
        this._goTo(diff);
        if (diff.lineRangeMapping.modified.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'diffEditor.goToDiff' });
        }
        else if (diff.lineRangeMapping.original.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'diffEditor.goToDiff' });
        }
        else if (diff) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, { source: 'diffEditor.goToDiff' });
        }
    }
    revealFirstDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        // wait for the diff computation to finish
        this.waitForDiff().then(() => {
            const diffs = diffModel.diff.get()?.mappings;
            if (!diffs || diffs.length === 0) {
                return;
            }
            this._goTo(diffs[0]);
        });
    }
    accessibleDiffViewerNext() { this._accessibleDiffViewer.get().next(); }
    accessibleDiffViewerPrev() { this._accessibleDiffViewer.get().prev(); }
    async waitForDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        await diffModel.waitForDiff();
    }
    mapToOtherSide() {
        const isModifiedFocus = this._editors.modified.hasWidgetFocus();
        const source = isModifiedFocus ? this._editors.modified : this._editors.original;
        const destination = isModifiedFocus ? this._editors.original : this._editors.modified;
        let destinationSelection;
        const sourceSelection = source.getSelection();
        if (sourceSelection) {
            const mappings = this._diffModel.get()?.diff.get()?.mappings.map(m => isModifiedFocus ? m.lineRangeMapping.flip() : m.lineRangeMapping);
            if (mappings) {
                const newRange1 = translatePosition(sourceSelection.getStartPosition(), mappings);
                const newRange2 = translatePosition(sourceSelection.getEndPosition(), mappings);
                destinationSelection = Range.plusRange(newRange1, newRange2);
            }
        }
        return { destination, destinationSelection };
    }
    switchSide() {
        const { destination, destinationSelection } = this.mapToOtherSide();
        destination.focus();
        if (destinationSelection) {
            destination.setSelection(destinationSelection);
        }
    }
    exitCompareMove() {
        const model = this._diffModel.get();
        if (!model) {
            return;
        }
        model.movedTextToCompare.set(undefined, undefined);
    }
    collapseAllUnchangedRegions() {
        const unchangedRegions = this._diffModel.get()?.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction(tx => {
            for (const region of unchangedRegions) {
                region.collapseAll(tx);
            }
        });
    }
    showAllUnchangedRegions() {
        const unchangedRegions = this._diffModel.get()?.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction(tx => {
            for (const region of unchangedRegions) {
                region.showAll(tx);
            }
        });
    }
    _handleCursorPositionChange(e, isModifiedEditor) {
        if (e?.reason === 3 /* CursorChangeReason.Explicit */) {
            const diff = this._diffModel.get()?.diff.get()?.mappings.find(m => isModifiedEditor ? m.lineRangeMapping.modified.contains(e.position.lineNumber) : m.lineRangeMapping.original.contains(e.position.lineNumber));
            if (diff?.lineRangeMapping.modified.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'diffEditor.cursorPositionChanged' });
            }
            else if (diff?.lineRangeMapping.original.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'diffEditor.cursorPositionChanged' });
            }
            else if (diff) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, { source: 'diffEditor.cursorPositionChanged' });
            }
        }
    }
};
DiffEditorWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, IAccessibilitySignalService),
    __param(7, IEditorProgressService)
], DiffEditorWidget);
export { DiffEditorWidget };
export function toLineChanges(state) {
    return state.mappings.map(x => {
        const m = x.lineRangeMapping;
        let originalStartLineNumber;
        let originalEndLineNumber;
        let modifiedStartLineNumber;
        let modifiedEndLineNumber;
        let innerChanges = m.innerChanges;
        if (m.original.isEmpty) {
            // Insertion
            originalStartLineNumber = m.original.startLineNumber - 1;
            originalEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            originalStartLineNumber = m.original.startLineNumber;
            originalEndLineNumber = m.original.endLineNumberExclusive - 1;
        }
        if (m.modified.isEmpty) {
            // Deletion
            modifiedStartLineNumber = m.modified.startLineNumber - 1;
            modifiedEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            modifiedStartLineNumber = m.modified.startLineNumber;
            modifiedEndLineNumber = m.modified.endLineNumberExclusive - 1;
        }
        return {
            originalStartLineNumber,
            originalEndLineNumber,
            modifiedStartLineNumber,
            modifiedEndLineNumber,
            charChanges: innerChanges?.map(m => ({
                originalStartLineNumber: m.originalRange.startLineNumber,
                originalStartColumn: m.originalRange.startColumn,
                originalEndLineNumber: m.originalRange.endLineNumber,
                originalEndColumn: m.originalRange.endColumn,
                modifiedStartLineNumber: m.modifiedRange.startLineNumber,
                modifiedStartColumn: m.modifiedRange.startColumn,
                modifiedEndLineNumber: m.modifiedRange.endLineNumber,
                modifiedEndColumn: m.modifiedRange.endColumn,
            }))
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kaWZmRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUE2QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdFEsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1FQUFtRSxDQUFD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