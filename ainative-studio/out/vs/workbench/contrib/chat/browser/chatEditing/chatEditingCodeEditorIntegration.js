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
var ChatEditingCodeEditorIntegration_1, DiffHunkWidget_1;
import '../media/chatEditorController.css';
import { getTotalWidth } from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableFromEvent, observableValue } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { observableCodeEditor } from '../../../../../editor/browser/observableCodeEditor.js';
import { AccessibleDiffViewer } from '../../../../../editor/browser/widget/diffEditor/components/accessibleDiffViewer.js';
import { RenderOptions, LineSource, renderLines } from '../../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { diffAddDecoration, diffWholeLineAddDecoration, diffDeleteDecoration } from '../../../../../editor/browser/widget/diffEditor/registrations.contribution.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { InlineDecoration } from '../../../../../editor/common/viewModel.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isDiffEditorInput } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { overviewRulerModifiedForeground, minimapGutterModifiedBackground, overviewRulerAddedForeground, minimapGutterAddedBackground, overviewRulerDeletedForeground, minimapGutterDeletedBackground } from '../../../scm/common/quickDiff.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { isTextDiffEditorForEntry } from './chatEditing.js';
import { ChatAgentLocation } from '../../common/constants.js';
let ChatEditingCodeEditorIntegration = class ChatEditingCodeEditorIntegration {
    static { ChatEditingCodeEditorIntegration_1 = this; }
    static { this._diffLineDecorationData = ModelDecorationOptions.register({ description: 'diff-line-decoration' }); }
    constructor(_entry, _editor, documentDiffInfo, _chatAgentService, _editorService, _accessibilitySignalsService, instantiationService) {
        this._entry = _entry;
        this._editor = _editor;
        this._chatAgentService = _chatAgentService;
        this._editorService = _editorService;
        this._accessibilitySignalsService = _accessibilitySignalsService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store = new DisposableStore();
        this._diffHunksRenderStore = this._store.add(new DisposableStore());
        this._diffHunkWidgets = [];
        this._viewZones = [];
        this._accessibleDiffViewVisible = observableValue(this, false);
        this._diffLineDecorations = _editor.createDecorationsCollection();
        const codeEditorObs = observableCodeEditor(_editor);
        this._diffLineDecorations = this._editor.createDecorationsCollection(); // tracks the line range w/o visuals (used for navigate)
        this._diffVisualDecorations = this._editor.createDecorationsCollection(); // tracks the real diff with character level inserts
        const enabledObs = derived(r => {
            if (!isEqual(codeEditorObs.model.read(r)?.uri, documentDiffInfo.read(r).modifiedModel.uri)) {
                return false;
            }
            if (this._editor.getOption(63 /* EditorOption.inDiffEditor */) && !instantiationService.invokeFunction(isTextDiffEditorForEntry, _entry, this._editor)) {
                return false;
            }
            return true;
        });
        // update decorations
        this._store.add(autorun(r => {
            if (!enabledObs.read(r)) {
                this._diffLineDecorations.clear();
                return;
            }
            const data = [];
            const diff = documentDiffInfo.read(r);
            for (const diffEntry of diff.changes) {
                data.push({
                    range: diffEntry.modified.toInclusiveRange() ?? new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                    options: ChatEditingCodeEditorIntegration_1._diffLineDecorationData
                });
            }
            this._diffLineDecorations.set(data);
        }));
        // INIT current index when: enabled, not streaming anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun(r => {
            if (enabledObs.read(r)
                && !_entry.isCurrentlyBeingModifiedBy.read(r)
                && lastModifyingRequestId !== _entry.lastModifyingRequestId
                && !documentDiffInfo.read(r).identical) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                const position = _editor.getPosition() ?? new Position(1, 1);
                const ranges = this._diffLineDecorations.getRanges();
                let initialIndex = ranges.findIndex(r => r.containsPosition(position));
                if (initialIndex < 0) {
                    initialIndex = 0;
                    for (; initialIndex < ranges.length - 1; initialIndex++) {
                        const range = ranges[initialIndex];
                        if (range.endLineNumber >= position.lineNumber) {
                            break;
                        }
                    }
                }
                this._currentIndex.set(initialIndex, undefined);
                _editor.revealRange(ranges[initialIndex]);
            }
        }));
        // render diff decorations
        this._store.add(autorun(r => {
            if (!enabledObs.read(r)) {
                this._clearDiffRendering();
                return;
            }
            // done: render diff
            if (!_entry.isCurrentlyBeingModifiedBy.read(r)) {
                // Add diff decoration to the UI (unless in diff editor)
                if (!this._editor.getOption(63 /* EditorOption.inDiffEditor */)) {
                    codeEditorObs.getOption(52 /* EditorOption.fontInfo */).read(r);
                    codeEditorObs.getOption(68 /* EditorOption.lineHeight */).read(r);
                    const reviewMode = _entry.reviewMode.read(r);
                    const diff = documentDiffInfo.read(r);
                    this._updateDiffRendering(diff, reviewMode);
                }
                else {
                    this._clearDiffRendering();
                }
            }
        }));
        // accessibility: signals while cursor changes
        this._store.add(autorun(r => {
            const position = codeEditorObs.positions.read(r)?.at(0);
            if (!position || !enabledObs.read(r)) {
                return;
            }
            const diff = documentDiffInfo.read(r);
            const mapping = diff.changes.find(m => m.modified.contains(position.lineNumber) || m.modified.isEmpty && m.modified.startLineNumber === position.lineNumber);
            if (mapping?.modified.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
            else if (mapping?.original.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
            else if (mapping) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineModified, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
        }));
        // accessibility: diff view
        this._store.add(autorunWithStore((r, store) => {
            const visible = this._accessibleDiffViewVisible.read(r);
            if (!visible || !enabledObs.read(r)) {
                return;
            }
            const accessibleDiffWidget = new AccessibleDiffViewContainer();
            _editor.addOverlayWidget(accessibleDiffWidget);
            store.add(toDisposable(() => _editor.removeOverlayWidget(accessibleDiffWidget)));
            store.add(instantiationService.createInstance(AccessibleDiffViewer, accessibleDiffWidget.getDomNode(), enabledObs, (visible, tx) => this._accessibleDiffViewVisible.set(visible, tx), constObservable(true), codeEditorObs.layoutInfo.map((v, r) => v.width), codeEditorObs.layoutInfo.map((v, r) => v.height), documentDiffInfo.map(diff => diff.changes.slice()), instantiationService.createInstance(AccessibleDiffViewerModel, documentDiffInfo, _editor)));
        }));
        // ---- readonly while streaming
        let actualOptions;
        const restoreActualOptions = () => {
            if (actualOptions !== undefined) {
                this._editor.updateOptions(actualOptions);
                actualOptions = undefined;
            }
        };
        this._store.add(toDisposable(restoreActualOptions));
        const renderAsBeingModified = derived(this, r => {
            return enabledObs.read(r) && Boolean(_entry.isCurrentlyBeingModifiedBy.read(r));
        });
        this._store.add(autorun(r => {
            const value = renderAsBeingModified.read(r);
            if (value) {
                actualOptions ??= {
                    readOnly: this._editor.getOption(96 /* EditorOption.readOnly */),
                    stickyScroll: this._editor.getOption(120 /* EditorOption.stickyScroll */),
                    codeLens: this._editor.getOption(17 /* EditorOption.codeLens */),
                    guides: this._editor.getOption(16 /* EditorOption.guides */)
                };
                this._editor.updateOptions({
                    readOnly: true,
                    stickyScroll: { enabled: false },
                    codeLens: false,
                    guides: { indentation: false, bracketPairs: false }
                });
            }
            else {
                restoreActualOptions();
            }
        }));
    }
    dispose() {
        this._clear();
        this._store.dispose();
    }
    _clear() {
        this._diffLineDecorations.clear();
        this._clearDiffRendering();
        this._currentIndex.set(-1, undefined);
    }
    // ---- diff rendering logic
    _clearDiffRendering() {
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
        });
        this._viewZones = [];
        this._diffHunksRenderStore.clear();
        this._diffVisualDecorations.clear();
    }
    _updateDiffRendering(diff, reviewMode) {
        const chatDiffAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        });
        const chatDiffWholeLineAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffWholeLineAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const createOverviewDecoration = (overviewRulerColor, minimapColor) => {
            return ModelDecorationOptions.createDynamic({
                description: 'chat-editing-decoration',
                overviewRuler: { color: themeColorFromId(overviewRulerColor), position: OverviewRulerLane.Left },
                minimap: { color: themeColorFromId(minimapColor), position: 2 /* MinimapPosition.Gutter */ },
            });
        };
        const modifiedDecoration = createOverviewDecoration(overviewRulerModifiedForeground, minimapGutterModifiedBackground);
        const addedDecoration = createOverviewDecoration(overviewRulerAddedForeground, minimapGutterAddedBackground);
        const deletedDecoration = createOverviewDecoration(overviewRulerDeletedForeground, minimapGutterDeletedBackground);
        this._diffHunksRenderStore.clear();
        this._diffHunkWidgets.length = 0;
        const diffHunkDecorations = [];
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
            this._viewZones = [];
            const modifiedVisualDecorations = [];
            const mightContainNonBasicASCII = diff.originalModel.mightContainNonBasicASCII();
            const mightContainRTL = diff.originalModel.mightContainRTL();
            const renderOptions = RenderOptions.fromEditor(this._editor);
            const editorLineCount = this._editor.getModel()?.getLineCount();
            for (const diffEntry of diff.changes) {
                const originalRange = diffEntry.original;
                diff.originalModel.tokenization.forceTokenization(Math.max(1, originalRange.endLineNumberExclusive - 1));
                const source = new LineSource(originalRange.mapToLineArray(l => diff.originalModel.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                const decorations = [];
                if (reviewMode) {
                    for (const i of diffEntry.innerChanges || []) {
                        decorations.push(new InlineDecoration(i.originalRange.delta(-(diffEntry.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        // If the original range is empty, the start line number is 1 and the new range spans the entire file, don't draw an Added decoration
                        if (!(i.originalRange.isEmpty() && i.originalRange.startLineNumber === 1 && i.modifiedRange.endLineNumber === editorLineCount) && !i.modifiedRange.isEmpty()) {
                            modifiedVisualDecorations.push({
                                range: i.modifiedRange, options: chatDiffAddDecoration
                            });
                        }
                    }
                }
                // Render an added decoration but don't also render a deleted decoration for newly inserted content at the start of the file
                // Note, this is a workaround for the `LineRange.isEmpty()` in diffEntry.original being `false` for newly inserted content
                const isCreatedContent = decorations.length === 1 && decorations[0].range.isEmpty() && diffEntry.original.startLineNumber === 1;
                if (!diffEntry.modified.isEmpty && !(isCreatedContent && (diffEntry.modified.endLineNumberExclusive - 1) === editorLineCount)) {
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: chatDiffWholeLineAddDecoration
                    });
                }
                if (diffEntry.original.isEmpty) {
                    // insertion
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: addedDecoration
                    });
                }
                else if (diffEntry.modified.isEmpty) {
                    // deletion
                    modifiedVisualDecorations.push({
                        range: new Range(diffEntry.modified.startLineNumber - 1, 1, diffEntry.modified.startLineNumber, 1),
                        options: deletedDecoration
                    });
                }
                else {
                    // modification
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: modifiedDecoration
                    });
                }
                if (reviewMode) {
                    const domNode = document.createElement('div');
                    domNode.className = 'chat-editing-original-zone view-lines line-delete monaco-mouse-cursor-text';
                    const result = renderLines(source, renderOptions, decorations, domNode);
                    if (!isCreatedContent) {
                        const viewZoneData = {
                            afterLineNumber: diffEntry.modified.startLineNumber - 1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2 // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        this._viewZones.push(viewZoneChangeAccessor.addZone(viewZoneData));
                    }
                    // Add content widget for each diff change
                    const widget = this._editor.invokeWithinContext(accessor => {
                        const instaService = accessor.get(IInstantiationService);
                        return instaService.createInstance(DiffHunkWidget, diff, diffEntry, this._editor.getModel().getVersionId(), this._editor, isCreatedContent ? 0 : result.heightInLines);
                    });
                    widget.layout(diffEntry.modified.startLineNumber);
                    this._diffHunkWidgets.push(widget);
                    diffHunkDecorations.push({
                        range: diffEntry.modified.toInclusiveRange() ?? new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                        options: {
                            description: 'diff-hunk-widget',
                            stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */
                        }
                    });
                }
            }
            this._diffVisualDecorations.set(modifiedVisualDecorations);
        });
        const diffHunkDecoCollection = this._editor.createDecorationsCollection(diffHunkDecorations);
        this._diffHunksRenderStore.add(toDisposable(() => {
            dispose(this._diffHunkWidgets);
            this._diffHunkWidgets.length = 0;
            diffHunkDecoCollection.clear();
        }));
        const positionObs = observableFromEvent(this._editor.onDidChangeCursorPosition, _ => this._editor.getPosition());
        const activeWidgetIdx = derived(r => {
            const position = positionObs.read(r);
            if (!position) {
                return -1;
            }
            const idx = diffHunkDecoCollection.getRanges().findIndex(r => r.containsPosition(position));
            return idx;
        });
        const toggleWidget = (activeWidget) => {
            const positionIdx = activeWidgetIdx.get();
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                widget.toggle(widget === activeWidget || i === positionIdx);
            }
        };
        this._diffHunksRenderStore.add(autorun(r => {
            // reveal when cursor inside
            const idx = activeWidgetIdx.read(r);
            const widget = this._diffHunkWidgets[idx];
            toggleWidget(widget);
        }));
        this._diffHunksRenderStore.add(this._editor.onMouseMove(e => {
            // reveal when hovering over
            if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
                const id = e.target.detail;
                const widget = this._diffHunkWidgets.find(w => w.getId() === id);
                toggleWidget(widget);
            }
            else if (e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
                const zone = e.target.detail;
                const idx = this._viewZones.findIndex(id => id === zone.viewZoneId);
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else if (e.target.position) {
                const { position } = e.target;
                const idx = diffHunkDecoCollection.getRanges().findIndex(r => r.containsPosition(position));
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else {
                toggleWidget(undefined);
            }
        }));
        this._diffHunksRenderStore.add(Event.any(this._editor.onDidScrollChange, this._editor.onDidLayoutChange)(() => {
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                const range = diffHunkDecoCollection.getRange(i);
                if (range) {
                    widget.layout(range?.startLineNumber);
                }
                else {
                    widget.dispose();
                }
            }
        }));
    }
    enableAccessibleDiffView() {
        this._accessibleDiffViewVisible.set(true, undefined);
    }
    // ---- navigation logic
    reveal(firstOrLast) {
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        const index = firstOrLast ? 0 : decorations.length - 1;
        const range = decorations.at(index);
        if (range) {
            this._editor.setPosition(range.getStartPosition());
            this._editor.revealRange(range);
            this._editor.focus();
            this._currentIndex.set(index, undefined);
        }
    }
    next(wrap) {
        return this._reveal(true, !wrap);
    }
    previous(wrap) {
        return this._reveal(false, !wrap);
    }
    _reveal(next, strict) {
        const position = this._editor.getPosition();
        if (!position) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        if (decorations.length === 0) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        let newIndex = -1;
        for (let i = 0; i < decorations.length; i++) {
            const range = decorations[i];
            if (range.containsPosition(position)) {
                newIndex = i + (next ? 1 : -1);
                break;
            }
            else if (Position.isBefore(position, range.getStartPosition())) {
                newIndex = next ? i : i - 1;
                break;
            }
        }
        if (strict && (newIndex < 0 || newIndex >= decorations.length)) {
            // NO change
            return false;
        }
        newIndex = (newIndex + decorations.length) % decorations.length;
        this._currentIndex.set(newIndex, undefined);
        const targetRange = decorations[newIndex];
        const targetPosition = next ? targetRange.getStartPosition() : targetRange.getEndPosition();
        this._editor.setPosition(targetPosition);
        this._editor.revealPositionInCenter(targetPosition);
        this._editor.focus();
        return true;
    }
    // --- hunks
    _findClosestWidget() {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const lineRelativeTop = this._editor.getTopForLineNumber(this._editor.getPosition().lineNumber) - this._editor.getScrollTop();
        let closestWidget;
        let closestDistance = Number.MAX_VALUE;
        for (const widget of this._diffHunkWidgets) {
            const widgetTop = widget.getPosition()?.preference?.top;
            if (widgetTop !== undefined) {
                const distance = Math.abs(widgetTop - lineRelativeTop);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestWidget = widget;
                }
            }
        }
        return closestWidget;
    }
    rejectNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            closestWidget.reject();
            this.next(true);
        }
    }
    acceptNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            closestWidget.accept();
            this.next(true);
        }
    }
    async toggleDiff(widget) {
        if (!this._editor.hasModel()) {
            return;
        }
        let selection = this._editor.getSelection();
        if (widget instanceof DiffHunkWidget) {
            const lineNumber = widget.getStartLineNumber();
            const position = lineNumber ? new Position(lineNumber, 1) : undefined;
            if (position && !selection.containsPosition(position)) {
                selection = Selection.fromPositions(position);
            }
        }
        const isDiffEditor = this._editor.getOption(63 /* EditorOption.inDiffEditor */);
        if (isDiffEditor) {
            // normal EDITOR
            await this._editorService.openEditor({
                resource: this._entry.modifiedURI,
                options: {
                    selection,
                    selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */
                }
            });
        }
        else {
            // DIFF editor
            const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
            const diffEditor = await this._editorService.openEditor({
                original: { resource: this._entry.originalURI, options: { selection: undefined } },
                modified: { resource: this._entry.modifiedURI, options: { selection } },
                label: defaultAgentName
                    ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                    : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI))
            });
            if (diffEditor && diffEditor.input) {
                // this is needed, passing the selection doesn't seem to work
                diffEditor.getControl()?.setSelection(selection);
                // close diff editor when entry is decided
                const d = autorun(r => {
                    const state = this._entry.state.read(r);
                    if (state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */) {
                        d.dispose();
                        const editorIdents = [];
                        for (const candidate of this._editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                            if (isDiffEditorInput(candidate.editor)
                                && isEqual(candidate.editor.original.resource, this._entry.originalURI)
                                && isEqual(candidate.editor.modified.resource, this._entry.modifiedURI)) {
                                editorIdents.push(candidate);
                            }
                        }
                        this._editorService.closeEditors(editorIdents);
                    }
                });
            }
        }
    }
};
ChatEditingCodeEditorIntegration = ChatEditingCodeEditorIntegration_1 = __decorate([
    __param(3, IChatAgentService),
    __param(4, IEditorService),
    __param(5, IAccessibilitySignalService),
    __param(6, IInstantiationService)
], ChatEditingCodeEditorIntegration);
export { ChatEditingCodeEditorIntegration };
let DiffHunkWidget = class DiffHunkWidget {
    static { DiffHunkWidget_1 = this; }
    static { this._idPool = 0; }
    constructor(_diffInfo, _change, _versionId, _editor, _lineDelta, instaService) {
        this._diffInfo = _diffInfo;
        this._change = _change;
        this._versionId = _versionId;
        this._editor = _editor;
        this._lineDelta = _lineDelta;
        this._id = `diff-change-widget-${DiffHunkWidget_1._idPool++}`;
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.className = 'chat-diff-change-content-widget';
        const toolbar = instaService.createInstance(MenuWorkbenchToolBar, this._domNode, MenuId.ChatEditingEditorHunk, {
            telemetrySource: 'chatEditingEditorHunk',
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: { primaryGroup: () => true, },
            menuOptions: {
                renderShortTitle: true,
                arg: this,
            },
        });
        this._store.add(toolbar);
        this._store.add(toolbar.actionRunner.onWillRun(_ => _editor.focus()));
        this._editor.addOverlayWidget(this);
    }
    dispose() {
        this._store.dispose();
        this._editor.removeOverlayWidget(this);
    }
    getId() {
        return this._id;
    }
    layout(startLineNumber) {
        const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
        const { contentLeft, contentWidth, verticalScrollbarWidth } = this._editor.getLayoutInfo();
        const scrollTop = this._editor.getScrollTop();
        this._position = {
            stackOridinal: 1,
            preference: {
                top: this._editor.getTopForLineNumber(startLineNumber) - scrollTop - (lineHeight * this._lineDelta),
                left: contentLeft + contentWidth - (2 * verticalScrollbarWidth + getTotalWidth(this._domNode))
            }
        };
        this._editor.layoutOverlayWidget(this);
        this._lastStartLineNumber = startLineNumber;
    }
    toggle(show) {
        this._domNode.classList.toggle('hover', show);
        if (this._lastStartLineNumber) {
            this.layout(this._lastStartLineNumber);
        }
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position ?? null;
    }
    getStartLineNumber() {
        return this._lastStartLineNumber;
    }
    // ---
    async reject() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return await this._diffInfo.undo(this._change);
    }
    async accept() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return this._diffInfo.keep(this._change);
    }
};
DiffHunkWidget = DiffHunkWidget_1 = __decorate([
    __param(5, IInstantiationService)
], DiffHunkWidget);
class AccessibleDiffViewContainer {
    constructor() {
        this._domNode = document.createElement('div');
        this._domNode.className = 'accessible-diff-view';
        this._domNode.style.width = '100%';
        this._domNode.style.position = 'absolute';
    }
    getId() {
        return 'chatEdits.accessibleDiffView';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: { top: 0, left: 0 },
            stackOridinal: 1
        };
    }
}
class AccessibleDiffViewerModel {
    constructor(_documentDiffInfo, _editor) {
        this._documentDiffInfo = _documentDiffInfo;
        this._editor = _editor;
    }
    getOriginalModel() {
        return this._documentDiffInfo.get().originalModel;
    }
    getOriginalOptions() {
        return this._editor.getOptions();
    }
    originalReveal(range) {
        const changes = this._documentDiffInfo.get().changes;
        const idx = changes.findIndex(value => value.original.intersect(LineRange.fromRange(range)));
        if (idx >= 0) {
            range = changes[idx].modified.toInclusiveRange() ?? range;
        }
        this.modifiedReveal(range);
    }
    getModifiedModel() {
        return this._editor.getModel();
    }
    getModifiedOptions() {
        return this._editor.getOptions();
    }
    modifiedReveal(range) {
        if (range) {
            this._editor.revealRange(range);
            this._editor.setSelection(range);
        }
        this._editor.focus();
    }
    modifiedSetSelection(range) {
        this._editor.setSelection(range);
    }
    modifiedFocus() {
        this._editor.focus();
    }
    getModifiedPosition() {
        return this._editor.getPosition() ?? undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sbUNBQW1DLENBQUM7QUFFM0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEssT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQThCLE1BQU0sb0ZBQW9GLENBQUM7QUFDdEosT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0ZBQStGLENBQUM7QUFDdkosT0FBTyxFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFFcEssT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFN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