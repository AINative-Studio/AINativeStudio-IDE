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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nQ29kZUVkaXRvckludGVncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG1DQUFtQyxDQUFDO0FBRTNDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xLLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUE4QixNQUFNLG9GQUFvRixDQUFDO0FBQ3RKLE9BQU8sRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxNQUFNLCtGQUErRixDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSwwQkFBMEIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBRXBLLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFB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