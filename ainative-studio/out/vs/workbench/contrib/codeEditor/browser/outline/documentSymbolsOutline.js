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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IOutlineService, } from '../../../../services/outline/browser/outline.js';
import { Extensions as WorkbenchExtensions } from '../../../../common/contributions.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { DocumentSymbolComparator, DocumentSymbolAccessibilityProvider, DocumentSymbolRenderer, DocumentSymbolFilter, DocumentSymbolGroupRenderer, DocumentSymbolIdentityProvider, DocumentSymbolNavigationLabelProvider, DocumentSymbolVirtualDelegate, DocumentSymbolDragAndDrop } from './documentSymbolsTree.js';
import { isCodeEditor, isDiffEditor } from '../../../../../editor/browser/editorBrowser.js';
import { OutlineGroup, OutlineElement, OutlineModel, TreeElement, IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { raceCancellation, TimeoutTimer, timeout, Barrier } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { localize } from '../../../../../nls.js';
import { IMarkerDecorationsService } from '../../../../../editor/common/services/markerDecorations.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
let DocumentSymbolBreadcrumbsSource = class DocumentSymbolBreadcrumbsSource {
    constructor(_editor, _textResourceConfigurationService) {
        this._editor = _editor;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._breadcrumbs = [];
    }
    getBreadcrumbElements() {
        return this._breadcrumbs;
    }
    clear() {
        this._breadcrumbs = [];
    }
    update(model, position) {
        const newElements = this._computeBreadcrumbs(model, position);
        this._breadcrumbs = newElements;
    }
    _computeBreadcrumbs(model, position) {
        let item = model.getItemEnclosingPosition(position);
        if (!item) {
            return [];
        }
        const chain = [];
        while (item) {
            chain.push(item);
            const parent = item.parent;
            if (parent instanceof OutlineModel) {
                break;
            }
            if (parent instanceof OutlineGroup && parent.parent && parent.parent.children.size === 1) {
                break;
            }
            item = parent;
        }
        const result = [];
        for (let i = chain.length - 1; i >= 0; i--) {
            const element = chain[i];
            if (this._isFiltered(element)) {
                break;
            }
            result.push(element);
        }
        if (result.length === 0) {
            return [];
        }
        return result;
    }
    _isFiltered(element) {
        if (!(element instanceof OutlineElement)) {
            return false;
        }
        const key = `breadcrumbs.${DocumentSymbolFilter.kindToConfigName[element.symbol.kind]}`;
        let uri;
        if (this._editor && this._editor.getModel()) {
            const model = this._editor.getModel();
            uri = model.uri;
        }
        return !this._textResourceConfigurationService.getValue(uri, key);
    }
};
DocumentSymbolBreadcrumbsSource = __decorate([
    __param(1, ITextResourceConfigurationService)
], DocumentSymbolBreadcrumbsSource);
let DocumentSymbolsOutline = class DocumentSymbolsOutline {
    get activeElement() {
        const posistion = this._editor.getPosition();
        if (!posistion || !this._outlineModel) {
            return undefined;
        }
        else {
            return this._outlineModel.getItemEnclosingPosition(posistion);
        }
    }
    constructor(_editor, target, firstLoadBarrier, _languageFeaturesService, _codeEditorService, _outlineModelService, _configurationService, _markerDecorationsService, textResourceConfigurationService, instantiationService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._codeEditorService = _codeEditorService;
        this._outlineModelService = _outlineModelService;
        this._configurationService = _configurationService;
        this._markerDecorationsService = _markerDecorationsService;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._outlineDisposables = new DisposableStore();
        this.outlineKind = 'documentSymbols';
        this._breadcrumbsDataSource = new DocumentSymbolBreadcrumbsSource(_editor, textResourceConfigurationService);
        const delegate = new DocumentSymbolVirtualDelegate();
        const renderers = [new DocumentSymbolGroupRenderer(), instantiationService.createInstance(DocumentSymbolRenderer, true, target)];
        const treeDataSource = {
            getChildren: (parent) => {
                if (parent instanceof OutlineElement || parent instanceof OutlineGroup) {
                    return parent.children.values();
                }
                if (parent === this && this._outlineModel) {
                    return this._outlineModel.children.values();
                }
                return [];
            }
        };
        const comparator = new DocumentSymbolComparator();
        const initialState = textResourceConfigurationService.getValue(_editor.getModel()?.uri, "outline.collapseItems" /* OutlineConfigKeys.collapseItems */);
        const options = {
            collapseByDefault: target === 2 /* OutlineTarget.Breadcrumbs */ || (target === 1 /* OutlineTarget.OutlinePane */ && initialState === "alwaysCollapse" /* OutlineConfigCollapseItemsValues.Collapsed */),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            identityProvider: new DocumentSymbolIdentityProvider(),
            keyboardNavigationLabelProvider: new DocumentSymbolNavigationLabelProvider(),
            accessibilityProvider: new DocumentSymbolAccessibilityProvider(localize('document', "Document Symbols")),
            filter: target === 1 /* OutlineTarget.OutlinePane */
                ? instantiationService.createInstance(DocumentSymbolFilter, 'outline')
                : target === 2 /* OutlineTarget.Breadcrumbs */
                    ? instantiationService.createInstance(DocumentSymbolFilter, 'breadcrumbs')
                    : undefined,
            dnd: instantiationService.createInstance(DocumentSymbolDragAndDrop),
        };
        this.config = {
            breadcrumbsDataSource: this._breadcrumbsDataSource,
            delegate,
            renderers,
            treeDataSource,
            comparator,
            options,
            quickPickDataSource: { getQuickPickElements: () => { throw new Error('not implemented'); } }
        };
        // update as language, model, providers changes
        this._disposables.add(_languageFeaturesService.documentSymbolProvider.onDidChange(_ => this._createOutline()));
        this._disposables.add(this._editor.onDidChangeModel(_ => this._createOutline()));
        this._disposables.add(this._editor.onDidChangeModelLanguage(_ => this._createOutline()));
        // update soon'ish as model content change
        const updateSoon = new TimeoutTimer();
        this._disposables.add(updateSoon);
        this._disposables.add(this._editor.onDidChangeModelContent(event => {
            const model = this._editor.getModel();
            if (model) {
                const timeout = _outlineModelService.getDebounceValue(model);
                updateSoon.cancelAndSet(() => this._createOutline(event), timeout);
            }
        }));
        // stop when editor dies
        this._disposables.add(this._editor.onDidDispose(() => this._outlineDisposables.clear()));
        // initial load
        this._createOutline().finally(() => firstLoadBarrier.open());
    }
    dispose() {
        this._disposables.dispose();
        this._outlineDisposables.dispose();
    }
    get isEmpty() {
        return !this._outlineModel || TreeElement.empty(this._outlineModel);
    }
    get uri() {
        return this._outlineModel?.uri;
    }
    async reveal(entry, options, sideBySide, select) {
        const model = OutlineModel.get(entry);
        if (!model || !(entry instanceof OutlineElement)) {
            return;
        }
        await this._codeEditorService.openCodeEditor({
            resource: model.uri,
            options: {
                ...options,
                selection: select ? entry.symbol.range : Range.collapseToStart(entry.symbol.selectionRange),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
            }
        }, this._editor, sideBySide);
    }
    preview(entry) {
        if (!(entry instanceof OutlineElement)) {
            return Disposable.None;
        }
        const { symbol } = entry;
        this._editor.revealRangeInCenterIfOutsideViewport(symbol.range, 0 /* ScrollType.Smooth */);
        const decorationsCollection = this._editor.createDecorationsCollection([{
                range: symbol.range,
                options: {
                    description: 'document-symbols-outline-range-highlight',
                    className: 'rangeHighlight',
                    isWholeLine: true
                }
            }]);
        return toDisposable(() => decorationsCollection.clear());
    }
    captureViewState() {
        const viewState = this._editor.saveViewState();
        return toDisposable(() => {
            if (viewState) {
                this._editor.restoreViewState(viewState);
            }
        });
    }
    async _createOutline(contentChangeEvent) {
        this._outlineDisposables.clear();
        if (!contentChangeEvent) {
            this._setOutlineModel(undefined);
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const buffer = this._editor.getModel();
        if (!this._languageFeaturesService.documentSymbolProvider.has(buffer)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const versionIdThen = buffer.getVersionId();
        const timeoutTimer = new TimeoutTimer();
        this._outlineDisposables.add(timeoutTimer);
        this._outlineDisposables.add(toDisposable(() => cts.dispose(true)));
        try {
            const model = await this._outlineModelService.getOrCreate(buffer, cts.token);
            if (cts.token.isCancellationRequested) {
                // cancelled -> do nothing
                return;
            }
            if (TreeElement.empty(model) || !this._editor.hasModel()) {
                // empty -> no outline elements
                this._setOutlineModel(model);
                return;
            }
            // heuristic: when the symbols-to-lines ratio changes by 50% between edits
            // wait a little (and hope that the next change isn't as drastic).
            if (contentChangeEvent && this._outlineModel && buffer.getLineCount() >= 25) {
                const newSize = TreeElement.size(model);
                const newLength = buffer.getValueLength();
                const newRatio = newSize / newLength;
                const oldSize = TreeElement.size(this._outlineModel);
                const oldLength = newLength - contentChangeEvent.changes.reduce((prev, value) => prev + value.rangeLength, 0);
                const oldRatio = oldSize / oldLength;
                if (newRatio <= oldRatio * 0.5 || newRatio >= oldRatio * 1.5) {
                    // wait for a better state and ignore current model when more
                    // typing has happened
                    const value = await raceCancellation(timeout(2000).then(() => true), cts.token, false);
                    if (!value) {
                        return;
                    }
                }
            }
            // feature: show markers with outline element
            this._applyMarkersToOutline(model);
            this._outlineDisposables.add(this._markerDecorationsService.onDidChangeMarker(textModel => {
                if (isEqual(model.uri, textModel.uri)) {
                    this._applyMarkersToOutline(model);
                    this._onDidChange.fire({});
                }
            }));
            this._outlineDisposables.add(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */) || e.affectsConfiguration('problems.visibility')) {
                    const problem = this._configurationService.getValue('problems.visibility');
                    const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
                    if (!problem || !config) {
                        model.updateMarker([]);
                    }
                    else {
                        this._applyMarkersToOutline(model);
                    }
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('outline')) {
                    // outline filtering, problems on/off
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('breadcrumbs') && this._editor.hasModel()) {
                    // breadcrumbs filtering
                    this._breadcrumbsDataSource.update(model, this._editor.getPosition());
                    this._onDidChange.fire({});
                }
            }));
            // feature: toggle icons
            this._outlineDisposables.add(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("outline.icons" /* OutlineConfigKeys.icons */)) {
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('outline')) {
                    this._onDidChange.fire({});
                }
            }));
            // feature: update active when cursor changes
            this._outlineDisposables.add(this._editor.onDidChangeCursorPosition(_ => {
                timeoutTimer.cancelAndSet(() => {
                    if (!buffer.isDisposed() && versionIdThen === buffer.getVersionId() && this._editor.hasModel()) {
                        this._breadcrumbsDataSource.update(model, this._editor.getPosition());
                        this._onDidChange.fire({ affectOnlyActiveElement: true });
                    }
                }, 150);
            }));
            // update properties, send event
            this._setOutlineModel(model);
        }
        catch (err) {
            this._setOutlineModel(undefined);
            onUnexpectedError(err);
        }
    }
    _applyMarkersToOutline(model) {
        const problem = this._configurationService.getValue('problems.visibility');
        const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
        if (!model || !problem || !config) {
            return;
        }
        const markers = [];
        for (const [range, marker] of this._markerDecorationsService.getLiveMarkers(model.uri)) {
            if (marker.severity === MarkerSeverity.Error || marker.severity === MarkerSeverity.Warning) {
                markers.push({ ...range, severity: marker.severity });
            }
        }
        model.updateMarker(markers);
    }
    _setOutlineModel(model) {
        const position = this._editor.getPosition();
        if (!position || !model) {
            this._outlineModel = undefined;
            this._breadcrumbsDataSource.clear();
        }
        else {
            if (!this._outlineModel?.merge(model)) {
                this._outlineModel = model;
            }
            this._breadcrumbsDataSource.update(model, position);
        }
        this._onDidChange.fire({});
    }
};
DocumentSymbolsOutline = __decorate([
    __param(3, ILanguageFeaturesService),
    __param(4, ICodeEditorService),
    __param(5, IOutlineModelService),
    __param(6, IConfigurationService),
    __param(7, IMarkerDecorationsService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IInstantiationService)
], DocumentSymbolsOutline);
let DocumentSymbolsOutlineCreator = class DocumentSymbolsOutlineCreator {
    constructor(outlineService) {
        const reg = outlineService.registerOutlineCreator(this);
        this.dispose = () => reg.dispose();
    }
    matches(candidate) {
        const ctrl = candidate.getControl();
        return isCodeEditor(ctrl) || isDiffEditor(ctrl);
    }
    async createOutline(pane, target, _token) {
        const control = pane.getControl();
        let editor;
        if (isCodeEditor(control)) {
            editor = control;
        }
        else if (isDiffEditor(control)) {
            editor = control.getModifiedEditor();
        }
        if (!editor) {
            return undefined;
        }
        const firstLoadBarrier = new Barrier();
        const result = editor.invokeWithinContext(accessor => accessor.get(IInstantiationService).createInstance(DocumentSymbolsOutline, editor, target, firstLoadBarrier));
        await firstLoadBarrier.wait();
        return result;
    }
};
DocumentSymbolsOutlineCreator = __decorate([
    __param(0, IOutlineService)
], DocumentSymbolsOutlineCreator);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DocumentSymbolsOutlineCreator, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzT3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvb3V0bGluZS9kb2N1bWVudFN5bWJvbHNPdXRsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqSCxPQUFPLEVBQTJHLGVBQWUsR0FBeUQsTUFBTSxpREFBaUQsQ0FBQztBQUNsUCxPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUcvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUNBQW1DLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsOEJBQThCLEVBQUUscUNBQXFDLEVBQUUsNkJBQTZCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNyVCxPQUFPLEVBQWUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQWtCLG9CQUFvQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDdEwsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFN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