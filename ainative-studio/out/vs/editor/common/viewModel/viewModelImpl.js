/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ArrayQueue } from '../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import * as strings from '../../../base/common/strings.js';
import { EDITOR_FONT_DEFAULTS, filterValidationDecorations } from '../config/editorOptions.js';
import { CursorsController } from '../cursor/cursor.js';
import { CursorConfiguration } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import * as textModelEvents from '../textModelEvents.js';
import { TokenizationRegistry } from '../languages.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { tokenizeLineToHTML } from '../languages/textToHtmlTokenizer.js';
import * as viewEvents from '../viewEvents.js';
import { ViewLayout } from '../viewLayout/viewLayout.js';
import { MinimapTokensColorTracker } from './minimapTokensColorTracker.js';
import { MinimapLinesRenderingData, OverviewRulerDecorationsGroup, ViewLineRenderingData } from '../viewModel.js';
import { ViewModelDecorations } from './viewModelDecorations.js';
import { FocusChangedEvent, HiddenAreasChangedEvent, ModelContentChangedEvent, ModelDecorationsChangedEvent, ModelLanguageChangedEvent, ModelLanguageConfigurationChangedEvent, ModelOptionsChangedEvent, ModelTokensChangedEvent, ReadOnlyEditAttemptEvent, ScrollChangedEvent, ViewModelEventDispatcher, ViewZonesChangedEvent, WidgetFocusChangedEvent } from '../viewModelEventDispatcher.js';
import { ViewModelLinesFromModelAsIs, ViewModelLinesFromProjectedModel } from './viewModelLines.js';
import { GlyphMarginLanesModel } from './glyphLanesModel.js';
const USE_IDENTITY_LINES_COLLECTION = true;
export class ViewModel extends Disposable {
    constructor(editorId, configuration, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, scheduleAtNextAnimationFrame, languageConfigurationService, _themeService, _attachedView, _transactionalTarget) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._themeService = _themeService;
        this._attachedView = _attachedView;
        this._transactionalTarget = _transactionalTarget;
        this.hiddenAreasModel = new HiddenAreasModel();
        this.previousHiddenAreas = [];
        this._editorId = editorId;
        this._configuration = configuration;
        this.model = model;
        this._eventDispatcher = new ViewModelEventDispatcher();
        this.onEvent = this._eventDispatcher.onEvent;
        this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
        this._updateConfigurationViewLineCount = this._register(new RunOnceScheduler(() => this._updateConfigurationViewLineCountNow(), 0));
        this._hasFocus = false;
        this._viewportStart = ViewportStart.create(this.model);
        this.glyphLanes = new GlyphMarginLanesModel(0);
        if (USE_IDENTITY_LINES_COLLECTION && this.model.isTooLargeForTokenization()) {
            this._lines = new ViewModelLinesFromModelAsIs(this.model);
        }
        else {
            const options = this._configuration.options;
            const fontInfo = options.get(52 /* EditorOption.fontInfo */);
            const wrappingStrategy = options.get(144 /* EditorOption.wrappingStrategy */);
            const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
            const wrappingIndent = options.get(143 /* EditorOption.wrappingIndent */);
            const wordBreak = options.get(134 /* EditorOption.wordBreak */);
            this._lines = new ViewModelLinesFromProjectedModel(this._editorId, this.model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, this.model.getOptions().tabSize, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        }
        this.coordinatesConverter = this._lines.createCoordinatesConverter();
        this._cursor = this._register(new CursorsController(model, this, this.coordinatesConverter, this.cursorConfig));
        this.viewLayout = this._register(new ViewLayout(this._configuration, this.getLineCount(), scheduleAtNextAnimationFrame));
        this._register(this.viewLayout.onDidScroll((e) => {
            if (e.scrollTopChanged) {
                this._handleVisibleLinesChanged();
            }
            if (e.scrollTopChanged) {
                this._viewportStart.invalidate();
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewScrollChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ScrollChangedEvent(e.oldScrollWidth, e.oldScrollLeft, e.oldScrollHeight, e.oldScrollTop, e.scrollWidth, e.scrollLeft, e.scrollHeight, e.scrollTop));
        }));
        this._register(this.viewLayout.onDidContentSizeChange((e) => {
            this._eventDispatcher.emitOutgoingEvent(e);
        }));
        this._decorations = new ViewModelDecorations(this._editorId, this.model, this._configuration, this._lines, this.coordinatesConverter);
        this._registerModelEvents();
        this._register(this._configuration.onDidChangeFast((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                this._onConfigurationChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        }));
        this._register(MinimapTokensColorTracker.getInstance().onDidChange(() => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensColorsChangedEvent());
        }));
        this._register(this._themeService.onDidColorThemeChange((theme) => {
            this._invalidateDecorationsColorCache();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewThemeChangedEvent(theme));
        }));
        this._updateConfigurationViewLineCountNow();
    }
    dispose() {
        // First remove listeners, as disposing the lines might end up sending
        // model decoration changed events ... and we no longer care about them ...
        super.dispose();
        this._decorations.dispose();
        this._lines.dispose();
        this._viewportStart.dispose();
        this._eventDispatcher.dispose();
    }
    createLineBreaksComputer() {
        return this._lines.createLineBreaksComputer();
    }
    addViewEventHandler(eventHandler) {
        this._eventDispatcher.addViewEventHandler(eventHandler);
    }
    removeViewEventHandler(eventHandler) {
        this._eventDispatcher.removeViewEventHandler(eventHandler);
    }
    _updateConfigurationViewLineCountNow() {
        this._configuration.setViewLineCount(this._lines.getViewLineCount());
    }
    getModelVisibleRanges() {
        const linesViewportData = this.viewLayout.getLinesViewportData();
        const viewVisibleRange = new Range(linesViewportData.startLineNumber, this.getLineMinColumn(linesViewportData.startLineNumber), linesViewportData.endLineNumber, this.getLineMaxColumn(linesViewportData.endLineNumber));
        const modelVisibleRanges = this._toModelVisibleRanges(viewVisibleRange);
        return modelVisibleRanges;
    }
    visibleLinesStabilized() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, true);
    }
    _handleVisibleLinesChanged() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, false);
    }
    setHasFocus(hasFocus) {
        this._hasFocus = hasFocus;
        this._cursor.setHasFocus(hasFocus);
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewFocusChangedEvent(hasFocus));
        this._eventDispatcher.emitOutgoingEvent(new FocusChangedEvent(!hasFocus, hasFocus));
    }
    setHasWidgetFocus(hasWidgetFocus) {
        this._eventDispatcher.emitOutgoingEvent(new WidgetFocusChangedEvent(!hasWidgetFocus, hasWidgetFocus));
    }
    onCompositionStart() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionStartEvent());
    }
    onCompositionEnd() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionEndEvent());
    }
    _captureStableViewport() {
        // We might need to restore the current start view range, so save it (if available)
        // But only if the scroll position is not at the top of the file
        if (this._viewportStart.isValid && this.viewLayout.getCurrentScrollTop() > 0) {
            const previousViewportStartViewPosition = new Position(this._viewportStart.viewLineNumber, this.getLineMinColumn(this._viewportStart.viewLineNumber));
            const previousViewportStartModelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(previousViewportStartViewPosition);
            return new StableViewport(previousViewportStartModelPosition, this._viewportStart.startLineDelta);
        }
        return new StableViewport(null, 0);
    }
    _onConfigurationChanged(eventsCollector, e) {
        const stableViewport = this._captureStableViewport();
        const options = this._configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const wrappingStrategy = options.get(144 /* EditorOption.wrappingStrategy */);
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const wrappingIndent = options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = options.get(134 /* EditorOption.wordBreak */);
        if (this._lines.setWrappingSettings(fontInfo, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak)) {
            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
            this._cursor.onLineMappingChanged(eventsCollector);
            this._decorations.onLineMappingChanged();
            this.viewLayout.onFlushed(this.getLineCount());
            this._updateConfigurationViewLineCount.schedule();
        }
        if (e.hasChanged(96 /* EditorOption.readOnly */)) {
            // Must read again all decorations due to readOnly filtering
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        if (e.hasChanged(103 /* EditorOption.renderValidationDecorations */)) {
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        eventsCollector.emitViewEvent(new viewEvents.ViewConfigurationChangedEvent(e));
        this.viewLayout.onConfigurationChanged(e);
        stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
        if (CursorConfiguration.shouldRecreate(e)) {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
        }
    }
    _registerModelEvents() {
        this._register(this.model.onDidChangeContentOrInjectedText((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                let hadOtherModelChange = false;
                let hadModelLineChangeThatChangedLineMapping = false;
                const changes = (e instanceof textModelEvents.InternalModelContentChangeEvent ? e.rawContentChangedEvent.changes : e.changes);
                const versionId = (e instanceof textModelEvents.InternalModelContentChangeEvent ? e.rawContentChangedEvent.versionId : null);
                // Do a first pass to compute line mappings, and a second pass to actually interpret them
                const lineBreaksComputer = this._lines.createLineBreaksComputer();
                for (const change of changes) {
                    switch (change.changeType) {
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            for (let lineIdx = 0; lineIdx < change.detail.length; lineIdx++) {
                                const line = change.detail[lineIdx];
                                let injectedText = change.injectedTexts[lineIdx];
                                if (injectedText) {
                                    injectedText = injectedText.filter(element => (!element.ownerId || element.ownerId === this._editorId));
                                }
                                lineBreaksComputer.addRequest(line, injectedText, null);
                            }
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            let injectedText = null;
                            if (change.injectedText) {
                                injectedText = change.injectedText.filter(element => (!element.ownerId || element.ownerId === this._editorId));
                            }
                            lineBreaksComputer.addRequest(change.detail, injectedText, null);
                            break;
                        }
                    }
                }
                const lineBreaks = lineBreaksComputer.finalize();
                const lineBreakQueue = new ArrayQueue(lineBreaks);
                for (const change of changes) {
                    switch (change.changeType) {
                        case 1 /* textModelEvents.RawContentChangedType.Flush */: {
                            this._lines.onModelFlushed();
                            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                            this._decorations.reset();
                            this.viewLayout.onFlushed(this.getLineCount());
                            hadOtherModelChange = true;
                            break;
                        }
                        case 3 /* textModelEvents.RawContentChangedType.LinesDeleted */: {
                            const linesDeletedEvent = this._lines.onModelLinesDeleted(versionId, change.fromLineNumber, change.toLineNumber);
                            if (linesDeletedEvent !== null) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            const insertedLineBreaks = lineBreakQueue.takeCount(change.detail.length);
                            const linesInsertedEvent = this._lines.onModelLinesInserted(versionId, change.fromLineNumber, change.toLineNumber, insertedLineBreaks);
                            if (linesInsertedEvent !== null) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            const changedLineBreakData = lineBreakQueue.dequeue();
                            const [lineMappingChanged, linesChangedEvent, linesInsertedEvent, linesDeletedEvent] = this._lines.onModelLineChanged(versionId, change.lineNumber, changedLineBreakData);
                            hadModelLineChangeThatChangedLineMapping = lineMappingChanged;
                            if (linesChangedEvent) {
                                eventsCollector.emitViewEvent(linesChangedEvent);
                            }
                            if (linesInsertedEvent) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            if (linesDeletedEvent) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            break;
                        }
                        case 5 /* textModelEvents.RawContentChangedType.EOLChanged */: {
                            // Nothing to do. The new version will be accepted below
                            break;
                        }
                    }
                }
                if (versionId !== null) {
                    this._lines.acceptVersionId(versionId);
                }
                this.viewLayout.onHeightMaybeChanged();
                if (!hadOtherModelChange && hadModelLineChangeThatChangedLineMapping) {
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                }
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            // Update the configuration and reset the centered view line
            const viewportStartWasValid = this._viewportStart.isValid;
            this._viewportStart.invalidate();
            this._configuration.setModelLineCount(this.model.getLineCount());
            this._updateConfigurationViewLineCountNow();
            // Recover viewport
            if (!this._hasFocus && this.model.getAttachedEditorCount() >= 2 && viewportStartWasValid) {
                const modelRange = this.model._getTrackedRange(this._viewportStart.modelTrackedRange);
                if (modelRange) {
                    const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelRange.getStartPosition());
                    const viewPositionTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
                    this.viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStart.startLineDelta }, 1 /* ScrollType.Immediate */);
                }
            }
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                if (e instanceof textModelEvents.InternalModelContentChangeEvent) {
                    eventsCollector.emitOutgoingEvent(new ModelContentChangedEvent(e.contentChangedEvent));
                }
                this._cursor.onModelContentChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            this._handleVisibleLinesChanged();
        }));
        this._register(this.model.onDidChangeTokens((e) => {
            const viewRanges = [];
            for (let j = 0, lenJ = e.ranges.length; j < lenJ; j++) {
                const modelRange = e.ranges[j];
                const viewStartLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.fromLineNumber, 1)).lineNumber;
                const viewEndLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.toLineNumber, this.model.getLineMaxColumn(modelRange.toLineNumber))).lineNumber;
                viewRanges[j] = {
                    fromLineNumber: viewStartLineNumber,
                    toLineNumber: viewEndLineNumber
                };
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensChangedEvent(viewRanges));
            this._eventDispatcher.emitOutgoingEvent(new ModelTokensChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguageConfiguration((e) => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewLanguageConfigurationEvent());
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageConfigurationChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguage((e) => {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageChangedEvent(e));
        }));
        this._register(this.model.onDidChangeOptions((e) => {
            // A tab size change causes a line mapping changed event => all view parts will repaint OK, no further event needed here
            if (this._lines.setTabSize(this.model.getOptions().tabSize)) {
                try {
                    const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                    eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                    this.viewLayout.onFlushed(this.getLineCount());
                }
                finally {
                    this._eventDispatcher.endEmitViewEvents();
                }
                this._updateConfigurationViewLineCount.schedule();
            }
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelOptionsChangedEvent(e));
        }));
        this._register(this.model.onDidChangeDecorations((e) => {
            this._decorations.onModelDecorationsChanged();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewDecorationsChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ModelDecorationsChangedEvent(e));
        }));
    }
    /**
     * @param forceUpdate If true, the hidden areas will be updated even if the new ranges are the same as the previous ranges.
     * This is because the model might have changed, which resets the hidden areas, but not the last cached value.
     * This needs a better fix in the future.
    */
    setHiddenAreas(ranges, source, forceUpdate) {
        this.hiddenAreasModel.setHiddenAreas(source, ranges);
        const mergedRanges = this.hiddenAreasModel.getMergedRanges();
        if (mergedRanges === this.previousHiddenAreas && !forceUpdate) {
            return;
        }
        this.previousHiddenAreas = mergedRanges;
        const stableViewport = this._captureStableViewport();
        let lineMappingChanged = false;
        try {
            const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
            lineMappingChanged = this._lines.setHiddenAreas(mergedRanges);
            if (lineMappingChanged) {
                eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                this._cursor.onLineMappingChanged(eventsCollector);
                this._decorations.onLineMappingChanged();
                this.viewLayout.onFlushed(this.getLineCount());
                this.viewLayout.onHeightMaybeChanged();
            }
            const firstModelLineInViewPort = stableViewport.viewportStartModelPosition?.lineNumber;
            const firstModelLineIsHidden = firstModelLineInViewPort && mergedRanges.some(range => range.startLineNumber <= firstModelLineInViewPort && firstModelLineInViewPort <= range.endLineNumber);
            if (!firstModelLineIsHidden) {
                stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
            }
        }
        finally {
            this._eventDispatcher.endEmitViewEvents();
        }
        this._updateConfigurationViewLineCount.schedule();
        if (lineMappingChanged) {
            this._eventDispatcher.emitOutgoingEvent(new HiddenAreasChangedEvent());
        }
    }
    getVisibleRangesPlusViewportAboveBelow() {
        const layoutInfo = this._configuration.options.get(151 /* EditorOption.layoutInfo */);
        const lineHeight = this._configuration.options.get(68 /* EditorOption.lineHeight */);
        const linesAround = Math.max(20, Math.round(layoutInfo.height / lineHeight));
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = Math.max(1, partialData.completelyVisibleStartLineNumber - linesAround);
        const endViewLineNumber = Math.min(this.getLineCount(), partialData.completelyVisibleEndLineNumber + linesAround);
        return this._toModelVisibleRanges(new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber)));
    }
    getVisibleRanges() {
        const visibleViewRange = this.getCompletelyVisibleViewRange();
        return this._toModelVisibleRanges(visibleViewRange);
    }
    getHiddenAreas() {
        return this._lines.getHiddenAreas();
    }
    _toModelVisibleRanges(visibleViewRange) {
        const visibleRange = this.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        const hiddenAreas = this._lines.getHiddenAreas();
        if (hiddenAreas.length === 0) {
            return [visibleRange];
        }
        const result = [];
        let resultLen = 0;
        let startLineNumber = visibleRange.startLineNumber;
        let startColumn = visibleRange.startColumn;
        const endLineNumber = visibleRange.endLineNumber;
        const endColumn = visibleRange.endColumn;
        for (let i = 0, len = hiddenAreas.length; i < len; i++) {
            const hiddenStartLineNumber = hiddenAreas[i].startLineNumber;
            const hiddenEndLineNumber = hiddenAreas[i].endLineNumber;
            if (hiddenEndLineNumber < startLineNumber) {
                continue;
            }
            if (hiddenStartLineNumber > endLineNumber) {
                continue;
            }
            if (startLineNumber < hiddenStartLineNumber) {
                result[resultLen++] = new Range(startLineNumber, startColumn, hiddenStartLineNumber - 1, this.model.getLineMaxColumn(hiddenStartLineNumber - 1));
            }
            startLineNumber = hiddenEndLineNumber + 1;
            startColumn = 1;
        }
        if (startLineNumber < endLineNumber || (startLineNumber === endLineNumber && startColumn < endColumn)) {
            result[resultLen++] = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
        }
        return result;
    }
    getCompletelyVisibleViewRange() {
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    getCompletelyVisibleViewRangeAtScrollTop(scrollTop) {
        const partialData = this.viewLayout.getLinesViewportDataAtScrollTop(scrollTop);
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    saveState() {
        const compatViewState = this.viewLayout.saveState();
        const scrollTop = compatViewState.scrollTop;
        const firstViewLineNumber = this.viewLayout.getLineNumberAtVerticalOffset(scrollTop);
        const firstPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(firstViewLineNumber, this.getLineMinColumn(firstViewLineNumber)));
        const firstPositionDeltaTop = this.viewLayout.getVerticalOffsetForLineNumber(firstViewLineNumber) - scrollTop;
        return {
            scrollLeft: compatViewState.scrollLeft,
            firstPosition: firstPosition,
            firstPositionDeltaTop: firstPositionDeltaTop
        };
    }
    reduceRestoreState(state) {
        if (typeof state.firstPosition === 'undefined') {
            // This is a view state serialized by an older version
            return this._reduceRestoreStateCompatibility(state);
        }
        const modelPosition = this.model.validatePosition(state.firstPosition);
        const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        const scrollTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber) - state.firstPositionDeltaTop;
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: scrollTop
        };
    }
    _reduceRestoreStateCompatibility(state) {
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: state.scrollTopWithoutViewZones
        };
    }
    getTabSize() {
        return this.model.getOptions().tabSize;
    }
    getLineCount() {
        return this._lines.getViewLineCount();
    }
    /**
     * Gives a hint that a lot of requests are about to come in for these line numbers.
     */
    setViewport(startLineNumber, endLineNumber, centeredLineNumber) {
        this._viewportStart.update(this, startLineNumber);
    }
    getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber) {
        return this._lines.getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber);
    }
    getLinesIndentGuides(startLineNumber, endLineNumber) {
        return this._lines.getViewLinesIndentGuides(startLineNumber, endLineNumber);
    }
    getBracketGuidesInRangeByLine(startLineNumber, endLineNumber, activePosition, options) {
        return this._lines.getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition, options);
    }
    getLineContent(lineNumber) {
        return this._lines.getViewLineContent(lineNumber);
    }
    getLineLength(lineNumber) {
        return this._lines.getViewLineLength(lineNumber);
    }
    getLineMinColumn(lineNumber) {
        return this._lines.getViewLineMinColumn(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        return this._lines.getViewLineMaxColumn(lineNumber);
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 1;
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 2;
    }
    getMinimapDecorationsInRange(range) {
        return this._decorations.getMinimapDecorationsInRange(range);
    }
    getDecorationsInViewport(visibleRange) {
        return this._decorations.getDecorationsViewportData(visibleRange).decorations;
    }
    getInjectedTextAt(viewPosition) {
        return this._lines.getInjectedTextAt(viewPosition);
    }
    getViewportViewLineRenderingData(visibleRange, lineNumber) {
        const allInlineDecorations = this._decorations.getDecorationsViewportData(visibleRange).inlineDecorations;
        const inlineDecorations = allInlineDecorations[lineNumber - visibleRange.startLineNumber];
        return this._getViewLineRenderingData(lineNumber, inlineDecorations);
    }
    getViewLineRenderingData(lineNumber) {
        const inlineDecorations = this._decorations.getInlineDecorationsOnLine(lineNumber);
        return this._getViewLineRenderingData(lineNumber, inlineDecorations);
    }
    _getViewLineRenderingData(lineNumber, inlineDecorations) {
        const mightContainRTL = this.model.mightContainRTL();
        const mightContainNonBasicASCII = this.model.mightContainNonBasicASCII();
        const tabSize = this.getTabSize();
        const lineData = this._lines.getViewLineData(lineNumber);
        if (lineData.inlineDecorations) {
            inlineDecorations = [
                ...inlineDecorations,
                ...lineData.inlineDecorations.map(d => d.toInlineDecoration(lineNumber))
            ];
        }
        return new ViewLineRenderingData(lineData.minColumn, lineData.maxColumn, lineData.content, lineData.continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, lineData.tokens, inlineDecorations, tabSize, lineData.startVisibleColumn);
    }
    getViewLineData(lineNumber) {
        return this._lines.getViewLineData(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        const result = this._lines.getViewLinesData(startLineNumber, endLineNumber, needed);
        return new MinimapLinesRenderingData(this.getTabSize(), result);
    }
    getAllOverviewRulerDecorations(theme) {
        const decorations = this.model.getOverviewRulerDecorations(this._editorId, filterValidationDecorations(this._configuration.options));
        const result = new OverviewRulerDecorations();
        for (const decoration of decorations) {
            const decorationOptions = decoration.options;
            const opts = decorationOptions.overviewRuler;
            if (!opts) {
                continue;
            }
            const lane = opts.position;
            if (lane === 0) {
                continue;
            }
            const color = opts.getColor(theme.value);
            const viewStartLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.startLineNumber, decoration.range.startColumn);
            const viewEndLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.endLineNumber, decoration.range.endColumn);
            result.accept(color, decorationOptions.zIndex, viewStartLineNumber, viewEndLineNumber, lane);
        }
        return result.asArray;
    }
    _invalidateDecorationsColorCache() {
        const decorations = this.model.getOverviewRulerDecorations();
        for (const decoration of decorations) {
            const opts1 = decoration.options.overviewRuler;
            opts1?.invalidateCachedColor();
            const opts2 = decoration.options.minimap;
            opts2?.invalidateCachedColor();
        }
    }
    getValueInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueInRange(modelRange, eol);
    }
    getValueLengthInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueLengthInRange(modelRange, eol);
    }
    modifyPosition(position, offset) {
        const modelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(position);
        const resultModelPosition = this.model.modifyPosition(modelPosition, offset);
        return this.coordinatesConverter.convertModelPositionToViewPosition(resultModelPosition);
    }
    deduceModelPositionRelativeToViewPosition(viewAnchorPosition, deltaOffset, lineFeedCnt) {
        const modelAnchor = this.coordinatesConverter.convertViewPositionToModelPosition(viewAnchorPosition);
        if (this.model.getEOL().length === 2) {
            // This model uses CRLF, so the delta must take that into account
            if (deltaOffset < 0) {
                deltaOffset -= lineFeedCnt;
            }
            else {
                deltaOffset += lineFeedCnt;
            }
        }
        const modelAnchorOffset = this.model.getOffsetAt(modelAnchor);
        const resultOffset = modelAnchorOffset + deltaOffset;
        return this.model.getPositionAt(resultOffset);
    }
    getPlainTextToCopy(modelRanges, emptySelectionClipboard, forceCRLF) {
        const newLineCharacter = forceCRLF ? '\r\n' : this.model.getEOL();
        modelRanges = modelRanges.slice(0);
        modelRanges.sort(Range.compareRangesUsingStarts);
        let hasEmptyRange = false;
        let hasNonEmptyRange = false;
        for (const range of modelRanges) {
            if (range.isEmpty()) {
                hasEmptyRange = true;
            }
            else {
                hasNonEmptyRange = true;
            }
        }
        if (!hasNonEmptyRange) {
            // all ranges are empty
            if (!emptySelectionClipboard) {
                return '';
            }
            const modelLineNumbers = modelRanges.map((r) => r.startLineNumber);
            let result = '';
            for (let i = 0; i < modelLineNumbers.length; i++) {
                if (i > 0 && modelLineNumbers[i - 1] === modelLineNumbers[i]) {
                    continue;
                }
                result += this.model.getLineContent(modelLineNumbers[i]) + newLineCharacter;
            }
            return result;
        }
        if (hasEmptyRange && emptySelectionClipboard) {
            // mixed empty selections and non-empty selections
            const result = [];
            let prevModelLineNumber = 0;
            for (const modelRange of modelRanges) {
                const modelLineNumber = modelRange.startLineNumber;
                if (modelRange.isEmpty()) {
                    if (modelLineNumber !== prevModelLineNumber) {
                        result.push(this.model.getLineContent(modelLineNumber));
                    }
                }
                else {
                    result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
                }
                prevModelLineNumber = modelLineNumber;
            }
            return result.length === 1 ? result[0] : result;
        }
        const result = [];
        for (const modelRange of modelRanges) {
            if (!modelRange.isEmpty()) {
                result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
            }
        }
        return result.length === 1 ? result[0] : result;
    }
    getRichTextToCopy(modelRanges, emptySelectionClipboard) {
        const languageId = this.model.getLanguageId();
        if (languageId === PLAINTEXT_LANGUAGE_ID) {
            return null;
        }
        if (modelRanges.length !== 1) {
            // no multiple selection support at this time
            return null;
        }
        let range = modelRanges[0];
        if (range.isEmpty()) {
            if (!emptySelectionClipboard) {
                // nothing to copy
                return null;
            }
            const lineNumber = range.startLineNumber;
            range = new Range(lineNumber, this.model.getLineMinColumn(lineNumber), lineNumber, this.model.getLineMaxColumn(lineNumber));
        }
        const fontInfo = this._configuration.options.get(52 /* EditorOption.fontInfo */);
        const colorMap = this._getColorMap();
        const hasBadChars = (/[:;\\\/<>]/.test(fontInfo.fontFamily));
        const useDefaultFontFamily = (hasBadChars || fontInfo.fontFamily === EDITOR_FONT_DEFAULTS.fontFamily);
        let fontFamily;
        if (useDefaultFontFamily) {
            fontFamily = EDITOR_FONT_DEFAULTS.fontFamily;
        }
        else {
            fontFamily = fontInfo.fontFamily;
            fontFamily = fontFamily.replace(/"/g, '\'');
            const hasQuotesOrIsList = /[,']/.test(fontFamily);
            if (!hasQuotesOrIsList) {
                const needsQuotes = /[+ ]/.test(fontFamily);
                if (needsQuotes) {
                    fontFamily = `'${fontFamily}'`;
                }
            }
            fontFamily = `${fontFamily}, ${EDITOR_FONT_DEFAULTS.fontFamily}`;
        }
        return {
            mode: languageId,
            html: (`<div style="`
                + `color: ${colorMap[1 /* ColorId.DefaultForeground */]};`
                + `background-color: ${colorMap[2 /* ColorId.DefaultBackground */]};`
                + `font-family: ${fontFamily};`
                + `font-weight: ${fontInfo.fontWeight};`
                + `font-size: ${fontInfo.fontSize}px;`
                + `line-height: ${fontInfo.lineHeight}px;`
                + `white-space: pre;`
                + `">`
                + this._getHTMLToCopy(range, colorMap)
                + '</div>')
        };
    }
    _getHTMLToCopy(modelRange, colorMap) {
        const startLineNumber = modelRange.startLineNumber;
        const startColumn = modelRange.startColumn;
        const endLineNumber = modelRange.endLineNumber;
        const endColumn = modelRange.endColumn;
        const tabSize = this.getTabSize();
        let result = '';
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineTokens = this.model.tokenization.getLineTokens(lineNumber);
            const lineContent = lineTokens.getLineContent();
            const startOffset = (lineNumber === startLineNumber ? startColumn - 1 : 0);
            const endOffset = (lineNumber === endLineNumber ? endColumn - 1 : lineContent.length);
            if (lineContent === '') {
                result += '<br>';
            }
            else {
                result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, tabSize, platform.isWindows);
            }
        }
        return result;
    }
    _getColorMap() {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = ['#000000'];
        if (colorMap) {
            for (let i = 1, len = colorMap.length; i < len; i++) {
                result[i] = Color.Format.CSS.formatHex(colorMap[i]);
            }
        }
        return result;
    }
    //#region cursor operations
    getPrimaryCursorState() {
        return this._cursor.getPrimaryCursorState();
    }
    getLastAddedCursorIndex() {
        return this._cursor.getLastAddedCursorIndex();
    }
    getCursorStates() {
        return this._cursor.getCursorStates();
    }
    setCursorStates(source, reason, states) {
        return this._withViewEventsCollector(eventsCollector => this._cursor.setStates(eventsCollector, source, reason, states));
    }
    getCursorColumnSelectData() {
        return this._cursor.getCursorColumnSelectData();
    }
    getCursorAutoClosedCharacters() {
        return this._cursor.getAutoClosedCharacters();
    }
    setCursorColumnSelectData(columnSelectData) {
        this._cursor.setCursorColumnSelectData(columnSelectData);
    }
    getPrevEditOperationType() {
        return this._cursor.getPrevEditOperationType();
    }
    setPrevEditOperationType(type) {
        this._cursor.setPrevEditOperationType(type);
    }
    getSelection() {
        return this._cursor.getSelection();
    }
    getSelections() {
        return this._cursor.getSelections();
    }
    getPosition() {
        return this._cursor.getPrimaryCursorState().modelState.position;
    }
    setSelections(source, selections, reason = 0 /* CursorChangeReason.NotSet */) {
        this._withViewEventsCollector(eventsCollector => this._cursor.setSelections(eventsCollector, source, selections, reason));
    }
    saveCursorState() {
        return this._cursor.saveState();
    }
    restoreCursorState(states) {
        this._withViewEventsCollector(eventsCollector => this._cursor.restoreState(eventsCollector, states));
    }
    _executeCursorEdit(callback) {
        if (this._cursor.context.cursorConfig.readOnly) {
            // we cannot edit when read only...
            this._eventDispatcher.emitOutgoingEvent(new ReadOnlyEditAttemptEvent());
            return;
        }
        this._withViewEventsCollector(callback);
    }
    executeEdits(source, edits, cursorStateComputer) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeEdits(eventsCollector, source, edits, cursorStateComputer));
    }
    startComposition() {
        this._executeCursorEdit(eventsCollector => this._cursor.startComposition(eventsCollector));
    }
    endComposition(source) {
        this._executeCursorEdit(eventsCollector => this._cursor.endComposition(eventsCollector, source));
    }
    type(text, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.type(eventsCollector, text, source));
    }
    compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.compositionType(eventsCollector, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source));
    }
    paste(text, pasteOnNewLine, multicursorText, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.paste(eventsCollector, text, pasteOnNewLine, multicursorText, source));
    }
    cut(source) {
        this._executeCursorEdit(eventsCollector => this._cursor.cut(eventsCollector, source));
    }
    executeCommand(command, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeCommand(eventsCollector, command, source));
    }
    executeCommands(commands, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeCommands(eventsCollector, commands, source));
    }
    revealAllCursors(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector(eventsCollector => this._cursor.revealAll(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealPrimaryCursor(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector(eventsCollector => this._cursor.revealPrimary(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealTopMostCursor(source) {
        const viewPosition = this._cursor.getTopMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealBottomMostCursor(source) {
        const viewPosition = this._cursor.getBottomMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealRange(source, revealHorizontal, viewRange, verticalType, scrollType) {
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, verticalType, revealHorizontal, scrollType)));
    }
    //#endregion
    //#region viewLayout
    changeWhitespace(callback) {
        const hadAChange = this.viewLayout.changeWhitespace(callback);
        if (hadAChange) {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewZonesChangedEvent());
            this._eventDispatcher.emitOutgoingEvent(new ViewZonesChangedEvent());
        }
    }
    //#endregion
    _withViewEventsCollector(callback) {
        return this._transactionalTarget.batchChanges(() => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                return callback(eventsCollector);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        });
    }
    batchEvents(callback) {
        this._withViewEventsCollector(() => { callback(); });
    }
    normalizePosition(position, affinity) {
        return this._lines.normalizePosition(position, affinity);
    }
    /**
     * Gets the column at which indentation stops at a given line.
     * @internal
    */
    getLineIndentColumn(lineNumber) {
        return this._lines.getLineIndentColumn(lineNumber);
    }
}
class ViewportStart {
    static create(model) {
        const viewportStartLineTrackedRange = model._setTrackedRange(null, new Range(1, 1, 1, 1), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        return new ViewportStart(model, 1, false, viewportStartLineTrackedRange, 0);
    }
    get viewLineNumber() {
        return this._viewLineNumber;
    }
    get isValid() {
        return this._isValid;
    }
    get modelTrackedRange() {
        return this._modelTrackedRange;
    }
    get startLineDelta() {
        return this._startLineDelta;
    }
    constructor(_model, _viewLineNumber, _isValid, _modelTrackedRange, _startLineDelta) {
        this._model = _model;
        this._viewLineNumber = _viewLineNumber;
        this._isValid = _isValid;
        this._modelTrackedRange = _modelTrackedRange;
        this._startLineDelta = _startLineDelta;
    }
    dispose() {
        this._model._setTrackedRange(this._modelTrackedRange, null, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
    }
    update(viewModel, startLineNumber) {
        const position = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(startLineNumber, viewModel.getLineMinColumn(startLineNumber)));
        const viewportStartLineTrackedRange = viewModel.model._setTrackedRange(this._modelTrackedRange, new Range(position.lineNumber, position.column, position.lineNumber, position.column), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        const viewportStartLineTop = viewModel.viewLayout.getVerticalOffsetForLineNumber(startLineNumber);
        const scrollTop = viewModel.viewLayout.getCurrentScrollTop();
        this._viewLineNumber = startLineNumber;
        this._isValid = true;
        this._modelTrackedRange = viewportStartLineTrackedRange;
        this._startLineDelta = scrollTop - viewportStartLineTop;
    }
    invalidate() {
        this._isValid = false;
    }
}
class OverviewRulerDecorations {
    constructor() {
        this._asMap = Object.create(null);
        this.asArray = [];
    }
    accept(color, zIndex, startLineNumber, endLineNumber, lane) {
        const prevGroup = this._asMap[color];
        if (prevGroup) {
            const prevData = prevGroup.data;
            const prevLane = prevData[prevData.length - 3];
            const prevEndLineNumber = prevData[prevData.length - 1];
            if (prevLane === lane && prevEndLineNumber + 1 >= startLineNumber) {
                // merge into prev
                if (endLineNumber > prevEndLineNumber) {
                    prevData[prevData.length - 1] = endLineNumber;
                }
                return;
            }
            // push
            prevData.push(lane, startLineNumber, endLineNumber);
        }
        else {
            const group = new OverviewRulerDecorationsGroup(color, zIndex, [lane, startLineNumber, endLineNumber]);
            this._asMap[color] = group;
            this.asArray.push(group);
        }
    }
}
class HiddenAreasModel {
    constructor() {
        this.hiddenAreas = new Map();
        this.shouldRecompute = false;
        this.ranges = [];
    }
    setHiddenAreas(source, ranges) {
        const existing = this.hiddenAreas.get(source);
        if (existing && rangeArraysEqual(existing, ranges)) {
            return;
        }
        this.hiddenAreas.set(source, ranges);
        this.shouldRecompute = true;
    }
    /**
     * The returned array is immutable.
    */
    getMergedRanges() {
        if (!this.shouldRecompute) {
            return this.ranges;
        }
        this.shouldRecompute = false;
        const newRanges = Array.from(this.hiddenAreas.values()).reduce((r, hiddenAreas) => mergeLineRangeArray(r, hiddenAreas), []);
        if (rangeArraysEqual(this.ranges, newRanges)) {
            return this.ranges;
        }
        this.ranges = newRanges;
        return this.ranges;
    }
}
function mergeLineRangeArray(arr1, arr2) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const item1 = arr1[i];
        const item2 = arr2[j];
        if (item1.endLineNumber < item2.startLineNumber - 1) {
            result.push(arr1[i++]);
        }
        else if (item2.endLineNumber < item1.startLineNumber - 1) {
            result.push(arr2[j++]);
        }
        else {
            const startLineNumber = Math.min(item1.startLineNumber, item2.startLineNumber);
            const endLineNumber = Math.max(item1.endLineNumber, item2.endLineNumber);
            result.push(new Range(startLineNumber, 1, endLineNumber, 1));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i++]);
    }
    while (j < arr2.length) {
        result.push(arr2[j++]);
    }
    return result;
}
function rangeArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (!arr1[i].equalsRange(arr2[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Maintain a stable viewport by trying to keep the first line in the viewport constant.
 */
class StableViewport {
    constructor(viewportStartModelPosition, startLineDelta) {
        this.viewportStartModelPosition = viewportStartModelPosition;
        this.startLineDelta = startLineDelta;
    }
    recoverViewportStart(coordinatesConverter, viewLayout) {
        if (!this.viewportStartModelPosition) {
            return;
        }
        const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(this.viewportStartModelPosition);
        const viewPositionTop = viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
        viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this.startLineDelta }, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC92aWV3TW9kZWxJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQTJDLG9CQUFvQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUF5RSxNQUFNLG9CQUFvQixDQUFDO0FBRWhJLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFPekMsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUd2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV6RSxPQUFPLEtBQUssVUFBVSxNQUFNLGtC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