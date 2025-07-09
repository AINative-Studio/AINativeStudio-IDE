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
var TestingDecorations_1, TestMessageDecoration_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { clamp } from '../../../../base/common/numbers.js';
import { autorun } from '../../../../base/common/observable.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { count, truncateMiddle } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { overviewRulerError, overviewRulerInfo } from '../../../../editor/common/core/editorColorRegistry.js';
import { Position } from '../../../../editor/common/core/position.js';
import { GlyphMarginLane, OverviewRulerLane } from '../../../../editor/common/model.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorLineNumberContextMenu, GutterActionsRegistry } from '../../codeEditor/browser/editorLineNumberMenu.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { labelForTestInState } from '../common/constants.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService } from '../common/testProfileService.js';
import { LiveTestResult } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, getContextForTestItem, simplifyTestsToExecute, testsInFile } from '../common/testService.js';
import { ITestingDecorationsService, TestDecorations } from '../common/testingDecorations.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState, maxPriority } from '../common/testingStates.js';
import { buildTestUri, parseTestUri } from '../common/testingUri.js';
import { getTestItemContextOverlay } from './explorerProjections/testItemContextOverlay.js';
import { testingDebugAllIcon, testingDebugIcon, testingRunAllIcon, testingRunIcon, testingStatesToIcons } from './icons.js';
import { renderTestMessageAsText } from './testMessageColorizer.js';
import { MessageSubject } from './testResultsView/testResultsSubject.js';
import { TestingOutputPeekController } from './testingOutputPeek.js';
const MAX_INLINE_MESSAGE_LENGTH = 128;
const MAX_TESTS_IN_SUBMENU = 30;
const GLYPH_MARGIN_LANE = GlyphMarginLane.Center;
function isOriginalInDiffEditor(codeEditorService, codeEditor) {
    const diffEditors = codeEditorService.listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.getOriginalEditor() === codeEditor) {
            return true;
        }
    }
    return false;
}
/** Value for saved decorations, providing fast accessors for the hot 'syncDecorations' path */
class CachedDecorations {
    constructor() {
        this.runByIdKey = new Map();
    }
    get size() {
        return this.runByIdKey.size;
    }
    /** Gets a test run decoration that contains exactly the given test IDs */
    getForExactTests(testIds) {
        const key = testIds.sort().join('\0\0');
        return this.runByIdKey.get(key);
    }
    /** Adds a new test run decroation */
    addTest(d) {
        const key = d.testIds.sort().join('\0\0');
        this.runByIdKey.set(key, d);
    }
    /** Finds an extension by VS Code event ID */
    getById(decorationId) {
        for (const d of this.runByIdKey.values()) {
            if (d.id === decorationId) {
                return d;
            }
        }
        return undefined;
    }
    /** Iterate over all decorations */
    *[Symbol.iterator]() {
        for (const d of this.runByIdKey.values()) {
            yield d;
        }
    }
}
let TestingDecorationService = class TestingDecorationService extends Disposable {
    constructor(codeEditorService, configurationService, testService, results, instantiationService, modelService) {
        super();
        this.configurationService = configurationService;
        this.testService = testService;
        this.results = results;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.generation = 0;
        this.changeEmitter = new Emitter();
        this.decorationCache = new ResourceMap();
        /**
         * List of messages that should be hidden because an editor changed their
         * underlying ranges. I think this is good enough, because:
         *  - Message decorations are never shown across reloads; this does not
         *    need to persist
         *  - Message instances are stable for any completed test results for
         *    the duration of the session.
         */
        this.invalidatedMessages = new WeakSet();
        /** @inheritdoc */
        this.onDidChange = this.changeEmitter.event;
        codeEditorService.registerDecorationType('test-message-decoration', TestMessageDecoration.decorationId, {}, undefined);
        this._register(modelService.onModelRemoved(e => this.decorationCache.delete(e.uri)));
        const debounceInvalidate = this._register(new RunOnceScheduler(() => this.invalidate(), 100));
        // If ranges were updated in the document, mark that we should explicitly
        // sync decorations to the published lines, since we assume that everything
        // is up to date. This prevents issues, as in #138632, #138835, #138922.
        this._register(this.testService.onWillProcessDiff(diff => {
            for (const entry of diff) {
                if (entry.op !== 2 /* TestDiffOpType.DocumentSynced */) {
                    continue;
                }
                const rec = this.decorationCache.get(entry.uri);
                if (rec) {
                    rec.rangeUpdateVersionId = entry.docv;
                }
            }
            if (!debounceInvalidate.isScheduled()) {
                debounceInvalidate.schedule();
            }
        }));
        this._register(Event.any(this.results.onResultsChanged, this.results.onTestChanged, this.testService.excluded.onTestExclusionsChanged, Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration("testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */)))(() => {
            if (!debounceInvalidate.isScheduled()) {
                debounceInvalidate.schedule();
            }
        }));
        this._register(GutterActionsRegistry.registerGutterActionsGenerator((context, result) => {
            const model = context.editor.getModel();
            const testingDecorations = TestingDecorations.get(context.editor);
            if (!model || !testingDecorations?.currentUri) {
                return;
            }
            const currentDecorations = this.syncDecorations(testingDecorations.currentUri);
            if (!currentDecorations.size) {
                return;
            }
            const modelDecorations = model.getLinesDecorations(context.lineNumber, context.lineNumber);
            for (const { id } of modelDecorations) {
                const decoration = currentDecorations.getById(id);
                if (decoration) {
                    const { object: actions } = decoration.getContextMenuActions();
                    for (const action of actions) {
                        result.push(action, '1_testing');
                    }
                }
            }
        }));
    }
    /** @inheritdoc */
    invalidateResultMessage(message) {
        this.invalidatedMessages.add(message);
        this.invalidate();
    }
    /** @inheritdoc */
    syncDecorations(resource) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return new CachedDecorations();
        }
        const cached = this.decorationCache.get(resource);
        if (cached && cached.generation === this.generation && (cached.rangeUpdateVersionId === undefined || cached.rangeUpdateVersionId !== model.getVersionId())) {
            return cached.value;
        }
        return this.applyDecorations(model);
    }
    /** @inheritdoc */
    getDecoratedTestPosition(resource, testId) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return undefined;
        }
        const decoration = Iterable.find(this.syncDecorations(resource), v => v instanceof RunTestDecoration && v.isForTest(testId));
        if (!decoration) {
            return undefined;
        }
        // decoration is collapsed, so the range is meaningless; only position matters.
        return model.getDecorationRange(decoration.id)?.getStartPosition();
    }
    invalidate() {
        this.generation++;
        this.changeEmitter.fire();
    }
    /**
     * Sets whether alternate actions are shown for the model.
     */
    updateDecorationsAlternateAction(resource, isAlt) {
        const model = this.modelService.getModel(resource);
        const cached = this.decorationCache.get(resource);
        if (!model || !cached || cached.isAlt === isAlt) {
            return;
        }
        cached.isAlt = isAlt;
        model.changeDecorations(accessor => {
            for (const decoration of cached.value) {
                if (decoration instanceof RunTestDecoration && decoration.editorDecoration.alternate) {
                    accessor.changeDecorationOptions(decoration.id, isAlt ? decoration.editorDecoration.alternate : decoration.editorDecoration.options);
                }
            }
        });
    }
    /**
     * Applies the current set of test decorations to the given text model.
     */
    applyDecorations(model) {
        const gutterEnabled = getTestingConfiguration(this.configurationService, "testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */);
        const cached = this.decorationCache.get(model.uri);
        const testRangesUpdated = cached?.rangeUpdateVersionId === model.getVersionId();
        const lastDecorations = cached?.value ?? new CachedDecorations();
        const newDecorations = model.changeDecorations(accessor => {
            const newDecorations = new CachedDecorations();
            const runDecorations = new TestDecorations();
            for (const test of this.testService.collection.getNodeByUrl(model.uri)) {
                if (!test.item.range) {
                    continue;
                }
                const stateLookup = this.results.getStateById(test.item.extId);
                const line = test.item.range.startLineNumber;
                runDecorations.push({ line, id: '', test, resultItem: stateLookup?.[1] });
            }
            for (const [line, tests] of runDecorations.lines()) {
                const multi = tests.length > 1;
                let existing = lastDecorations.getForExactTests(tests.map(t => t.test.item.extId));
                // see comment in the constructor for what's going on here
                if (existing && testRangesUpdated && model.getDecorationRange(existing.id)?.startLineNumber !== line) {
                    existing = undefined;
                }
                if (existing) {
                    if (existing.replaceOptions(tests, gutterEnabled)) {
                        accessor.changeDecorationOptions(existing.id, existing.editorDecoration.options);
                    }
                    newDecorations.addTest(existing);
                }
                else {
                    newDecorations.addTest(multi
                        ? this.instantiationService.createInstance(MultiRunTestDecoration, tests, gutterEnabled, model)
                        : this.instantiationService.createInstance(RunSingleTestDecoration, tests[0].test, tests[0].resultItem, model, gutterEnabled));
                }
            }
            const saveFromRemoval = new Set();
            for (const decoration of newDecorations) {
                if (decoration.id === '') {
                    decoration.id = accessor.addDecoration(decoration.editorDecoration.range, decoration.editorDecoration.options);
                }
                else {
                    saveFromRemoval.add(decoration.id);
                }
            }
            for (const decoration of lastDecorations) {
                if (!saveFromRemoval.has(decoration.id)) {
                    accessor.removeDecoration(decoration.id);
                }
            }
            this.decorationCache.set(model.uri, {
                generation: this.generation,
                rangeUpdateVersionId: cached?.rangeUpdateVersionId,
                value: newDecorations,
            });
            return newDecorations;
        });
        return newDecorations || lastDecorations;
    }
};
TestingDecorationService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IConfigurationService),
    __param(2, ITestService),
    __param(3, ITestResultService),
    __param(4, IInstantiationService),
    __param(5, IModelService)
], TestingDecorationService);
export { TestingDecorationService };
let TestingDecorations = class TestingDecorations extends Disposable {
    static { TestingDecorations_1 = this; }
    /**
     * Results invalidated by editor changes.
     */
    static { this.invalidatedTests = new WeakSet(); }
    /**
     * Gets the decorations associated with the given code editor.
     */
    static get(editor) {
        return editor.getContribution("editor.contrib.testingDecorations" /* Testing.DecorationsContributionId */);
    }
    get currentUri() { return this._currentUri; }
    constructor(editor, codeEditorService, testService, decorations, uriIdentityService, results, configurationService, instantiationService) {
        super();
        this.editor = editor;
        this.codeEditorService = codeEditorService;
        this.testService = testService;
        this.decorations = decorations;
        this.uriIdentityService = uriIdentityService;
        this.results = results;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.expectedWidget = this._register(new MutableDisposable());
        this.actualWidget = this._register(new MutableDisposable());
        this.errorContentWidgets = this._register(new DisposableMap());
        this.loggedMessageDecorations = new Map();
        codeEditorService.registerDecorationType('test-message-decoration', TestMessageDecoration.decorationId, {}, undefined, editor);
        this.attachModel(editor.getModel()?.uri);
        this._register(decorations.onDidChange(() => {
            if (this._currentUri) {
                decorations.syncDecorations(this._currentUri);
            }
        }));
        this._register(Event.any(this.results.onResultsChanged, editor.onDidChangeModel, Event.filter(this.results.onTestChanged, c => c.reason === 2 /* TestResultItemChangeReason.NewMessage */), this.testService.showInlineOutput.onDidChange)(() => this.applyResults()));
        const win = dom.getWindow(editor.getDomNode());
        this._register(dom.addDisposableListener(win, 'keydown', e => {
            if (new StandardKeyboardEvent(e).keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, true);
            }
        }));
        this._register(dom.addDisposableListener(win, 'keyup', e => {
            if (new StandardKeyboardEvent(e).keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(dom.addDisposableListener(win, 'blur', () => {
            if (this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(this.editor.onKeyUp(e => {
            if (e.keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(this.editor.onDidChangeModel(e => this.attachModel(e.newModelUrl || undefined)));
        this._register(this.editor.onMouseDown(e => {
            if (e.target.position && this.currentUri) {
                const modelDecorations = editor.getModel()?.getLineDecorations(e.target.position.lineNumber) ?? [];
                if (!modelDecorations.length) {
                    return;
                }
                const cache = decorations.syncDecorations(this.currentUri);
                for (const { id } of modelDecorations) {
                    if (cache.getById(id)?.click(e)) {
                        e.event.stopPropagation();
                        return;
                    }
                }
            }
        }));
        this._register(Event.accumulate(this.editor.onDidChangeModelContent, 0, this._store)(evts => {
            const model = editor.getModel();
            if (!this._currentUri || !model) {
                return;
            }
            let changed = false;
            for (const [message, deco] of this.loggedMessageDecorations) {
                // invalidate decorations if either the line they're on was changed,
                // or if the range of the test was changed. The range of the test is
                // not always present, so check bo.
                const invalidate = evts.some(e => e.changes.some(c => c.range.startLineNumber <= deco.line && c.range.endLineNumber >= deco.line
                    || (deco.resultItem?.item.range && deco.resultItem.item.range.startLineNumber <= c.range.startLineNumber && deco.resultItem.item.range.endLineNumber >= c.range.endLineNumber)));
                if (invalidate) {
                    changed = true;
                    TestingDecorations_1.invalidatedTests.add(deco.resultItem || message);
                }
            }
            if (changed) {
                this.applyResults();
            }
        }));
        const updateFontFamilyVar = () => {
            this.editor.getContainerDomNode().style.setProperty('--testMessageDecorationFontFamily', editor.getOption(51 /* EditorOption.fontFamily */));
            this.editor.getContainerDomNode().style.setProperty('--testMessageDecorationFontSize', `${editor.getOption(54 /* EditorOption.fontSize */)}px`);
        };
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(51 /* EditorOption.fontFamily */)) {
                updateFontFamilyVar();
            }
        }));
        updateFontFamilyVar();
    }
    attachModel(uri) {
        switch (uri && parseTestUri(uri)?.type) {
            case 4 /* TestUriType.ResultExpectedOutput */:
                this.expectedWidget.value = new ExpectedLensContentWidget(this.editor);
                this.actualWidget.clear();
                break;
            case 3 /* TestUriType.ResultActualOutput */:
                this.expectedWidget.clear();
                this.actualWidget.value = new ActualLensContentWidget(this.editor);
                break;
            default:
                this.expectedWidget.clear();
                this.actualWidget.clear();
        }
        if (isOriginalInDiffEditor(this.codeEditorService, this.editor)) {
            uri = undefined;
        }
        this._currentUri = uri;
        if (!uri) {
            return;
        }
        this.decorations.syncDecorations(uri);
        (async () => {
            for await (const _test of testsInFile(this.testService, this.uriIdentityService, uri, false)) {
                // consume the iterator so that all tests in the file get expanded. Or
                // at least until the URI changes. If new items are requested, changes
                // will be trigged in the `onDidProcessDiff` callback.
                if (this._currentUri !== uri) {
                    break;
                }
            }
        })();
    }
    applyResults() {
        const model = this.editor.getModel();
        if (!model) {
            return this.clearResults();
        }
        const uriStr = model.uri.toString();
        const seenLines = new Set();
        this.applyResultsContentWidgets(uriStr, seenLines);
        this.applyResultsLoggedMessages(uriStr, seenLines);
    }
    clearResults() {
        this.errorContentWidgets.clearAndDisposeAll();
    }
    isMessageInvalidated(message) {
        return TestingDecorations_1.invalidatedTests.has(message);
    }
    applyResultsContentWidgets(uriStr, seenLines) {
        const seen = new Set();
        if (getTestingConfiguration(this.configurationService, "testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */)) {
            this.results.results.forEach(lastResult => this.applyContentWidgetsFromResult(lastResult, uriStr, seen, seenLines));
        }
        else if (this.results.results.length) {
            this.applyContentWidgetsFromResult(this.results.results[0], uriStr, seen, seenLines);
        }
        for (const message of this.errorContentWidgets.keys()) {
            if (!seen.has(message)) {
                this.errorContentWidgets.deleteAndDispose(message);
            }
        }
    }
    applyContentWidgetsFromResult(lastResult, uriStr, seen, seenLines) {
        for (const test of lastResult.tests) {
            if (TestingDecorations_1.invalidatedTests.has(test)) {
                continue;
            }
            for (let taskId = 0; taskId < test.tasks.length; taskId++) {
                const state = test.tasks[taskId];
                // push error decorations first so they take precedence over normal output
                for (let i = 0; i < state.messages.length; i++) {
                    const m = state.messages[i];
                    if (m.type !== 0 /* TestMessageType.Error */ || this.isMessageInvalidated(m)) {
                        continue;
                    }
                    const line = m.location?.uri.toString() === uriStr
                        ? m.location.range.startLineNumber
                        : m.stackTrace && mapFindFirst(m.stackTrace, (f) => f.position && f.uri?.toString() === uriStr ? f.position.lineNumber : undefined);
                    if (line === undefined || seenLines.has(line)) {
                        continue;
                    }
                    seenLines.add(line);
                    let deco = this.errorContentWidgets.get(m);
                    if (!deco) {
                        const lineLength = this.editor.getModel()?.getLineLength(line) ?? 100;
                        deco = this.instantiationService.createInstance(TestErrorContentWidget, this.editor, new Position(line, lineLength + 1), m, test, buildTestUri({
                            type: 3 /* TestUriType.ResultActualOutput */,
                            messageIndex: i,
                            taskIndex: taskId,
                            resultId: lastResult.id,
                            testExtId: test.item.extId,
                        }));
                        this.errorContentWidgets.set(m, deco);
                    }
                    seen.add(m);
                }
            }
        }
    }
    applyResultsLoggedMessages(uriStr, messageLines) {
        this.editor.changeDecorations(accessor => {
            const seen = new Set();
            if (getTestingConfiguration(this.configurationService, "testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */)) {
                this.results.results.forEach(r => this.applyLoggedMessageFromResult(r, uriStr, seen, messageLines, accessor));
            }
            else if (this.results.results.length) {
                this.applyLoggedMessageFromResult(this.results.results[0], uriStr, seen, messageLines, accessor);
            }
            for (const [message, { id }] of this.loggedMessageDecorations) {
                if (!seen.has(message)) {
                    accessor.removeDecoration(id);
                }
            }
        });
    }
    applyLoggedMessageFromResult(lastResult, uriStr, seen, messageLines, accessor) {
        if (!this.testService.showInlineOutput.value || !(lastResult instanceof LiveTestResult)) {
            return;
        }
        const tryAdd = (resultItem, m, uri) => {
            if (this.isMessageInvalidated(m) || m.location?.uri.toString() !== uriStr) {
                return;
            }
            seen.add(m);
            const line = m.location.range.startLineNumber;
            if (messageLines.has(line) || this.loggedMessageDecorations.has(m)) {
                return;
            }
            const deco = this.instantiationService.createInstance(TestMessageDecoration, m, uri, this.editor.getModel());
            messageLines.add(line);
            const id = accessor.addDecoration(deco.editorDecoration.range, deco.editorDecoration.options);
            this.loggedMessageDecorations.set(m, { id, line, resultItem });
        };
        for (const test of lastResult.tests) {
            if (TestingDecorations_1.invalidatedTests.has(test)) {
                continue;
            }
            for (let taskId = 0; taskId < test.tasks.length; taskId++) {
                const state = test.tasks[taskId];
                for (let i = state.messages.length - 1; i >= 0; i--) {
                    const m = state.messages[i];
                    if (m.type === 1 /* TestMessageType.Output */) {
                        tryAdd(test, m, buildTestUri({
                            type: 3 /* TestUriType.ResultActualOutput */,
                            messageIndex: i,
                            taskIndex: taskId,
                            resultId: lastResult.id,
                            testExtId: test.item.extId,
                        }));
                    }
                }
            }
        }
        for (const task of lastResult.tasks) {
            for (const m of task.otherMessages) {
                tryAdd(undefined, m);
            }
        }
    }
};
TestingDecorations = TestingDecorations_1 = __decorate([
    __param(1, ICodeEditorService),
    __param(2, ITestService),
    __param(3, ITestingDecorationsService),
    __param(4, IUriIdentityService),
    __param(5, ITestResultService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService)
], TestingDecorations);
export { TestingDecorations };
const collapseRange = (originalRange) => ({
    startLineNumber: originalRange.startLineNumber,
    endLineNumber: originalRange.startLineNumber,
    startColumn: originalRange.startColumn,
    endColumn: originalRange.startColumn,
});
const createRunTestDecoration = (tests, states, visible, defaultGutterAction) => {
    const range = tests[0]?.item.range;
    if (!range) {
        throw new Error('Test decorations can only be created for tests with a range');
    }
    if (!visible) {
        return {
            range: collapseRange(range),
            options: { isWholeLine: true, description: 'run-test-decoration' },
        };
    }
    let computedState = 0 /* TestResultState.Unset */;
    const hoverMessageParts = [];
    let testIdWithMessages;
    let retired = false;
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const resultItem = states[i];
        const state = resultItem?.computedState ?? 0 /* TestResultState.Unset */;
        if (hoverMessageParts.length < 10) {
            hoverMessageParts.push(labelForTestInState(test.item.label, state));
        }
        computedState = maxPriority(computedState, state);
        retired = retired || !!resultItem?.retired;
        if (!testIdWithMessages && resultItem?.tasks.some(t => t.messages.length)) {
            testIdWithMessages = test.item.extId;
        }
    }
    const hasMultipleTests = tests.length > 1 || tests[0].children.size > 0;
    const primaryIcon = computedState === 0 /* TestResultState.Unset */
        ? (hasMultipleTests ? testingRunAllIcon : testingRunIcon)
        : testingStatesToIcons.get(computedState);
    const alternateIcon = defaultGutterAction === "debug" /* DefaultGutterClickAction.Debug */
        ? (hasMultipleTests ? testingRunAllIcon : testingRunIcon)
        : (hasMultipleTests ? testingDebugAllIcon : testingDebugIcon);
    let hoverMessage;
    let glyphMarginClassName = 'testing-run-glyph';
    if (retired) {
        glyphMarginClassName += ' retired';
    }
    const defaultOptions = {
        description: 'run-test-decoration',
        showIfCollapsed: true,
        get hoverMessage() {
            if (!hoverMessage) {
                const building = hoverMessage = new MarkdownString('', true).appendText(hoverMessageParts.join(', ') + '.');
                if (testIdWithMessages) {
                    const args = encodeURIComponent(JSON.stringify([testIdWithMessages]));
                    building.appendMarkdown(` [${localize('peekTestOutout', 'Peek Test Output')}](command:vscode.peekTestError?${args})`);
                }
            }
            return hoverMessage;
        },
        glyphMargin: { position: GLYPH_MARGIN_LANE },
        glyphMarginClassName: `${ThemeIcon.asClassName(primaryIcon)} ${glyphMarginClassName}`,
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 10000,
    };
    const alternateOptions = {
        ...defaultOptions,
        glyphMarginClassName: `${ThemeIcon.asClassName(alternateIcon)} ${glyphMarginClassName}`,
    };
    return {
        range: collapseRange(range),
        options: defaultOptions,
        alternate: alternateOptions,
    };
};
var LensContentWidgetVars;
(function (LensContentWidgetVars) {
    LensContentWidgetVars["FontFamily"] = "testingDiffLensFontFamily";
    LensContentWidgetVars["FontFeatures"] = "testingDiffLensFontFeatures";
})(LensContentWidgetVars || (LensContentWidgetVars = {}));
class TitleLensContentWidget {
    constructor(editor) {
        this.editor = editor;
        /** @inheritdoc */
        this.allowEditorOverflow = false;
        /** @inheritdoc */
        this.suppressMouseDown = true;
        this._domNode = dom.$('span');
        queueMicrotask(() => {
            this.applyStyling();
            this.editor.addContentWidget(this);
        });
    }
    applyStyling() {
        let fontSize = this.editor.getOption(19 /* EditorOption.codeLensFontSize */);
        let height;
        if (!fontSize || fontSize < 5) {
            fontSize = (this.editor.getOption(54 /* EditorOption.fontSize */) * .9) | 0;
            height = this.editor.getOption(68 /* EditorOption.lineHeight */);
        }
        else {
            height = (fontSize * Math.max(1.3, this.editor.getOption(68 /* EditorOption.lineHeight */) / this.editor.getOption(54 /* EditorOption.fontSize */))) | 0;
        }
        const editorFontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        const node = this._domNode;
        node.classList.add('testing-diff-lens-widget');
        node.textContent = this.getText();
        node.style.lineHeight = `${height}px`;
        node.style.fontSize = `${fontSize}px`;
        node.style.fontFamily = `var(--${"testingDiffLensFontFamily" /* LensContentWidgetVars.FontFamily */})`;
        node.style.fontFeatureSettings = `var(--${"testingDiffLensFontFeatures" /* LensContentWidgetVars.FontFeatures */})`;
        const containerStyle = this.editor.getContainerDomNode().style;
        containerStyle.setProperty("testingDiffLensFontFamily" /* LensContentWidgetVars.FontFamily */, this.editor.getOption(18 /* EditorOption.codeLensFontFamily */) ?? 'inherit');
        containerStyle.setProperty("testingDiffLensFontFeatures" /* LensContentWidgetVars.FontFeatures */, editorFontInfo.fontFeatureSettings);
        this.editor.changeViewZones(accessor => {
            if (this.viewZoneId) {
                accessor.removeZone(this.viewZoneId);
            }
            this.viewZoneId = accessor.addZone({
                afterLineNumber: 0,
                afterColumn: 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                domNode: document.createElement('div'),
                heightInPx: 20,
            });
        });
    }
    /** @inheritdoc */
    getDomNode() {
        return this._domNode;
    }
    /** @inheritdoc */
    dispose() {
        this.editor.changeViewZones(accessor => {
            if (this.viewZoneId) {
                accessor.removeZone(this.viewZoneId);
            }
        });
        this.editor.removeContentWidget(this);
    }
    /** @inheritdoc */
    getPosition() {
        return {
            position: { column: 0, lineNumber: 0 },
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
}
class ExpectedLensContentWidget extends TitleLensContentWidget {
    getId() {
        return 'expectedTestingLens';
    }
    getText() {
        return localize('expected.title', 'Expected');
    }
}
class ActualLensContentWidget extends TitleLensContentWidget {
    getId() {
        return 'actualTestingLens';
    }
    getText() {
        return localize('actual.title', 'Actual');
    }
}
let RunTestDecoration = class RunTestDecoration {
    get line() {
        return this.editorDecoration.range.startLineNumber;
    }
    get testIds() {
        return this.tests.map(t => t.test.item.extId);
    }
    constructor(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService) {
        this.tests = tests;
        this.visible = visible;
        this.model = model;
        this.codeEditorService = codeEditorService;
        this.testService = testService;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.testProfileService = testProfileService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        /** @inheritdoc */
        this.id = '';
        this.displayedStates = tests.map(t => t.resultItem?.computedState);
        this.editorDecoration = createRunTestDecoration(tests.map(t => t.test), tests.map(t => t.resultItem), visible, getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */));
        this.editorDecoration.options.glyphMarginHoverMessage = new MarkdownString().appendText(this.getGutterLabel());
    }
    /** @inheritdoc */
    click(e) {
        if (e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */
            || e.target.detail.glyphMarginLane !== GLYPH_MARGIN_LANE
            // handled by editor gutter context menu
            || e.event.rightButton
            || isMacintosh && e.event.leftButton && e.event.ctrlKey) {
            return false;
        }
        const alternateAction = e.event.altKey;
        switch (getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */)) {
            case "contextMenu" /* DefaultGutterClickAction.ContextMenu */:
                this.showContextMenu(e);
                break;
            case "debug" /* DefaultGutterClickAction.Debug */:
                this.runWith(alternateAction ? 2 /* TestRunProfileBitset.Run */ : 4 /* TestRunProfileBitset.Debug */);
                break;
            case "runWithCoverage" /* DefaultGutterClickAction.Coverage */:
                this.runWith(alternateAction ? 4 /* TestRunProfileBitset.Debug */ : 8 /* TestRunProfileBitset.Coverage */);
                break;
            case "run" /* DefaultGutterClickAction.Run */:
            default:
                this.runWith(alternateAction ? 4 /* TestRunProfileBitset.Debug */ : 2 /* TestRunProfileBitset.Run */);
                break;
        }
        return true;
    }
    /**
     * Updates the decoration to match the new set of tests.
     * @returns true if options were changed, false otherwise
     */
    replaceOptions(newTests, visible) {
        const displayedStates = newTests.map(t => t.resultItem?.computedState);
        if (visible === this.visible && equals(this.displayedStates, displayedStates)) {
            return false;
        }
        this.tests = newTests;
        this.displayedStates = displayedStates;
        this.visible = visible;
        const { options, alternate } = createRunTestDecoration(newTests.map(t => t.test), newTests.map(t => t.resultItem), visible, getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */));
        this.editorDecoration.options = options;
        this.editorDecoration.alternate = alternate;
        this.editorDecoration.options.glyphMarginHoverMessage = new MarkdownString().appendText(this.getGutterLabel());
        return true;
    }
    /**
     * Gets whether this decoration serves as the run button for the given test ID.
     */
    isForTest(testId) {
        return this.tests.some(t => t.test.item.extId === testId);
    }
    runWith(profile) {
        return this.testService.runTests({
            tests: simplifyTestsToExecute(this.testService.collection, this.tests.map(({ test }) => test)),
            group: profile,
        });
    }
    showContextMenu(e) {
        const editor = this.codeEditorService.listCodeEditors().find(e => e.getModel() === this.model);
        editor?.getContribution(EditorLineNumberContextMenu.ID)?.show(e);
    }
    getGutterLabel() {
        switch (getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */)) {
            case "contextMenu" /* DefaultGutterClickAction.ContextMenu */:
                return localize('testing.gutterMsg.contextMenu', 'Click for test options');
            case "debug" /* DefaultGutterClickAction.Debug */:
                return localize('testing.gutterMsg.debug', 'Click to debug tests, right click for more options');
            case "runWithCoverage" /* DefaultGutterClickAction.Coverage */:
                return localize('testing.gutterMsg.coverage', 'Click to run tests with coverage, right click for more options');
            case "run" /* DefaultGutterClickAction.Run */:
            default:
                return localize('testing.gutterMsg.run', 'Click to run tests, right click for more options');
        }
    }
    /**
     * Gets context menu actions relevant for a singel test.
     */
    getTestContextMenuActions(test, resultItem) {
        const testActions = [];
        const capabilities = this.testProfileService.capabilitiesForTest(test.item);
        [
            { bitset: 2 /* TestRunProfileBitset.Run */, label: localize('run test', 'Run Test') },
            { bitset: 4 /* TestRunProfileBitset.Debug */, label: localize('debug test', 'Debug Test') },
            { bitset: 8 /* TestRunProfileBitset.Coverage */, label: localize('coverage test', 'Run with Coverage') },
        ].forEach(({ bitset, label }) => {
            if (capabilities & bitset) {
                testActions.push(new Action(`testing.gutter.${bitset}`, label, undefined, undefined, () => this.testService.runTests({ group: bitset, tests: [test] })));
            }
        });
        if (capabilities & 16 /* TestRunProfileBitset.HasNonDefaultProfile */) {
            testActions.push(new Action('testing.runUsing', localize('testing.runUsing', 'Execute Using Profile...'), undefined, undefined, async () => {
                const profile = await this.commandService.executeCommand('vscode.pickTestProfile', { onlyForTest: test });
                if (!profile) {
                    return;
                }
                this.testService.runResolvedTests({
                    group: profile.group,
                    targets: [{
                            profileId: profile.profileId,
                            controllerId: profile.controllerId,
                            testIds: [test.item.extId]
                        }]
                });
            }));
        }
        if (resultItem && isFailedState(resultItem.computedState)) {
            testActions.push(new Action('testing.gutter.peekFailure', localize('peek failure', 'Peek Error'), undefined, undefined, () => this.commandService.executeCommand('vscode.peekTestError', test.item.extId)));
        }
        testActions.push(new Action('testing.gutter.reveal', localize('reveal test', 'Reveal in Test Explorer'), undefined, undefined, () => this.commandService.executeCommand('_revealTestInExplorer', test.item.extId)));
        const contributed = this.getContributedTestActions(test, capabilities);
        return { object: Separator.join(testActions, contributed), dispose() { testActions.forEach(a => a.dispose()); } };
    }
    getContributedTestActions(test, capabilities) {
        const contextOverlay = this.contextKeyService.createOverlay(getTestItemContextOverlay(test, capabilities));
        const arg = getContextForTestItem(this.testService.collection, test.item.extId);
        const menu = this.menuService.getMenuActions(MenuId.TestItemGutter, contextOverlay, { shouldForwardArgs: true, arg });
        return getFlatContextMenuActions(menu);
    }
};
RunTestDecoration = __decorate([
    __param(3, ICodeEditorService),
    __param(4, ITestService),
    __param(5, IContextMenuService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, ITestProfileService),
    __param(9, IContextKeyService),
    __param(10, IMenuService)
], RunTestDecoration);
let MultiRunTestDecoration = class MultiRunTestDecoration extends RunTestDecoration {
    constructor(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService, quickInputService) {
        super(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService);
        this.quickInputService = quickInputService;
    }
    getContextMenuActions() {
        const disposable = new DisposableStore();
        const allActions = [];
        [
            { bitset: 2 /* TestRunProfileBitset.Run */, label: localize('run all test', 'Run All Tests') },
            { bitset: 8 /* TestRunProfileBitset.Coverage */, label: localize('run all test with coverage', 'Run All Tests with Coverage') },
            { bitset: 4 /* TestRunProfileBitset.Debug */, label: localize('debug all test', 'Debug All Tests') },
        ].forEach(({ bitset, label }, i) => {
            const canRun = this.tests.some(({ test }) => this.testProfileService.capabilitiesForTest(test.item) & bitset);
            if (canRun) {
                allActions.push(new Action(`testing.gutter.run${i}`, label, undefined, undefined, () => this.runWith(bitset)));
            }
        });
        disposable.add(toDisposable(() => allActions.forEach(a => a.dispose())));
        const testItems = this.tests.map((testItem) => ({
            currentLabel: testItem.test.item.label,
            testItem,
            parent: TestId.fromString(testItem.test.item.extId).parentId,
        }));
        const getLabelConflicts = (tests) => {
            const labelCount = new Map();
            for (const test of tests) {
                labelCount.set(test.currentLabel, (labelCount.get(test.currentLabel) || 0) + 1);
            }
            return tests.filter(e => labelCount.get(e.currentLabel) > 1);
        };
        let conflicts, hasParent = true;
        while ((conflicts = getLabelConflicts(testItems)).length && hasParent) {
            for (const conflict of conflicts) {
                if (conflict.parent) {
                    const parent = this.testService.collection.getNodeById(conflict.parent.toString());
                    conflict.currentLabel = parent?.item.label + ' > ' + conflict.currentLabel;
                    conflict.parent = conflict.parent.parentId;
                }
                else {
                    hasParent = false;
                }
            }
        }
        testItems.sort((a, b) => {
            const ai = a.testItem.test.item;
            const bi = b.testItem.test.item;
            return (ai.sortText || ai.label).localeCompare(bi.sortText || bi.label);
        });
        let testSubmenus = testItems.map(({ currentLabel, testItem }) => {
            const actions = this.getTestContextMenuActions(testItem.test, testItem.resultItem);
            disposable.add(actions);
            let label = stripIcons(currentLabel);
            const lf = label.indexOf('\n');
            if (lf !== -1) {
                label = label.slice(0, lf);
            }
            return new SubmenuAction(testItem.test.item.extId, label, actions.object);
        });
        const overflow = testSubmenus.length - MAX_TESTS_IN_SUBMENU;
        if (overflow > 0) {
            testSubmenus = testSubmenus.slice(0, MAX_TESTS_IN_SUBMENU);
            testSubmenus.push(new Action('testing.gutter.overflow', localize('testOverflowItems', '{0} more tests...', overflow), undefined, undefined, () => this.pickAndRun(testItems)));
        }
        return { object: Separator.join(allActions, testSubmenus), dispose: () => disposable.dispose() };
    }
    async pickAndRun(testItems) {
        const doPick = (items, title) => new Promise(resolve => {
            const disposables = new DisposableStore();
            const pick = disposables.add(this.quickInputService.createQuickPick());
            pick.placeholder = title;
            pick.items = items;
            disposables.add(pick.onDidHide(() => {
                resolve(undefined);
                disposables.dispose();
            }));
            disposables.add(pick.onDidAccept(() => {
                resolve(pick.selectedItems[0]);
                disposables.dispose();
            }));
            pick.show();
        });
        const item = await doPick(testItems.map(({ currentLabel, testItem }) => ({ label: currentLabel, test: testItem.test, result: testItem.resultItem })), localize('selectTestToRun', 'Select a test to run'));
        if (!item) {
            return;
        }
        const actions = this.getTestContextMenuActions(item.test, item.result);
        try {
            (await doPick(actions.object, item.label))?.run();
        }
        finally {
            actions.dispose();
        }
    }
};
MultiRunTestDecoration = __decorate([
    __param(3, ICodeEditorService),
    __param(4, ITestService),
    __param(5, IContextMenuService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, ITestProfileService),
    __param(9, IContextKeyService),
    __param(10, IMenuService),
    __param(11, IQuickInputService)
], MultiRunTestDecoration);
let RunSingleTestDecoration = class RunSingleTestDecoration extends RunTestDecoration {
    constructor(test, resultItem, model, visible, codeEditorService, testService, commandService, contextMenuService, configurationService, testProfiles, contextKeyService, menuService) {
        super([{ test, resultItem }], visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfiles, contextKeyService, menuService);
    }
    getContextMenuActions() {
        return this.getTestContextMenuActions(this.tests[0].test, this.tests[0].resultItem);
    }
};
RunSingleTestDecoration = __decorate([
    __param(4, ICodeEditorService),
    __param(5, ITestService),
    __param(6, ICommandService),
    __param(7, IContextMenuService),
    __param(8, IConfigurationService),
    __param(9, ITestProfileService),
    __param(10, IContextKeyService),
    __param(11, IMenuService)
], RunSingleTestDecoration);
const lineBreakRe = /\r?\n\s*/g;
let TestMessageDecoration = class TestMessageDecoration {
    static { TestMessageDecoration_1 = this; }
    static { this.inlineClassName = 'test-message-inline-content'; }
    static { this.decorationId = `testmessage-${generateUuid()}`; }
    constructor(testMessage, messageUri, textModel, peekOpener, editorService) {
        this.testMessage = testMessage;
        this.messageUri = messageUri;
        this.peekOpener = peekOpener;
        this.id = '';
        this.contentIdClass = `test-message-inline-content-id${generateUuid()}`;
        const location = testMessage.location;
        this.line = clamp(location.range.startLineNumber, 0, textModel.getLineCount());
        const severity = testMessage.type;
        const message = testMessage.message;
        const options = editorService.resolveDecorationOptions(TestMessageDecoration_1.decorationId, true);
        options.hoverMessage = typeof message === 'string' ? new MarkdownString().appendText(message) : message;
        options.zIndex = 10; // todo: in spite of the z-index, this appears behind gitlens
        options.className = `testing-inline-message-severity-${severity}`;
        options.isWholeLine = true;
        options.stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
        options.collapseOnReplaceEdit = true;
        let inlineText = renderTestMessageAsText(message).replace(lineBreakRe, ' ');
        if (inlineText.length > MAX_INLINE_MESSAGE_LENGTH) {
            inlineText = inlineText.slice(0, MAX_INLINE_MESSAGE_LENGTH - 1) + '…';
        }
        options.after = {
            content: inlineText,
            inlineClassName: `test-message-inline-content test-message-inline-content-s${severity} ${this.contentIdClass} ${messageUri ? 'test-message-inline-content-clickable' : ''}`
        };
        options.showIfCollapsed = true;
        const rulerColor = severity === 0 /* TestMessageType.Error */
            ? overviewRulerError
            : overviewRulerInfo;
        if (rulerColor) {
            options.overviewRuler = { color: themeColorFromId(rulerColor), position: OverviewRulerLane.Right };
        }
        const lineLength = textModel.getLineLength(this.line);
        const column = lineLength ? (lineLength + 1) : location.range.endColumn;
        this.editorDecoration = {
            options,
            range: {
                startLineNumber: this.line,
                startColumn: column,
                endColumn: column,
                endLineNumber: this.line,
            }
        };
    }
    click(e) {
        if (e.event.rightButton) {
            return false;
        }
        if (!this.messageUri) {
            return false;
        }
        if (e.target.element?.className.includes(this.contentIdClass)) {
            this.peekOpener.peekUri(this.messageUri);
        }
        return false;
    }
    getContextMenuActions() {
        return { object: [], dispose: () => { } };
    }
};
TestMessageDecoration = TestMessageDecoration_1 = __decorate([
    __param(3, ITestingPeekOpener),
    __param(4, ICodeEditorService)
], TestMessageDecoration);
const ERROR_CONTENT_WIDGET_HEIGHT = 20;
let TestErrorContentWidget = class TestErrorContentWidget extends Disposable {
    get line() {
        return this.position.lineNumber;
    }
    constructor(editor, position, message, resultItem, uri, peekOpener) {
        super();
        this.editor = editor;
        this.position = position;
        this.message = message;
        this.resultItem = resultItem;
        this.peekOpener = peekOpener;
        this.id = generateUuid();
        /** @inheritdoc */
        this.allowEditorOverflow = false;
        this.node = dom.h('div.test-error-content-widget', [
            dom.h('div.inner@inner', [
                dom.h('div.arrow@arrow'),
                dom.h(`span${ThemeIcon.asCSSSelector(testingStatesToIcons.get(4 /* TestResultState.Failed */))}`),
                dom.h('span.content@name'),
            ]),
        ]);
        const setMarginTop = () => {
            const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
            this.node.root.style.marginTop = (lineHeight - ERROR_CONTENT_WIDGET_HEIGHT) / 2 + 'px';
        };
        setMarginTop();
        this._register(editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
                setMarginTop();
            }
        }));
        let text;
        if (message.expected !== undefined && message.actual !== undefined) {
            text = `${truncateMiddle(message.actual.replace(/\s+/g, ' '), 30)} != ${truncateMiddle(message.expected.replace(/\s+/g, ' '), 30)}`;
        }
        else {
            const msg = renderStringAsPlaintext(message.message);
            const lf = msg.indexOf('\n');
            text = lf === -1 ? msg : msg.slice(0, lf);
        }
        this.node.root.addEventListener('click', e => {
            this.peekOpener.peekUri(uri);
            e.preventDefault();
        });
        const ctrl = TestingOutputPeekController.get(editor);
        if (ctrl) {
            this._register(autorun(reader => {
                const subject = ctrl.subject.read(reader);
                const isCurrent = subject instanceof MessageSubject && subject.message === message;
                this.node.root.classList.toggle('is-current', isCurrent);
            }));
        }
        this.node.name.innerText = text || 'Test Failed';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '15');
        svg.setAttribute('height', '10');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('viewBox', '0 0 15 10');
        const leftArrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        leftArrow.setAttribute('d', 'M15 0 L10 0 L0 5 L10 10 L15 10 Z');
        svg.append(leftArrow);
        this.node.arrow.appendChild(svg);
        this._register(editor.onDidChangeModelContent(e => {
            for (const c of e.changes) {
                if (c.range.startLineNumber > this.line) {
                    continue;
                }
                if (c.range.startLineNumber <= this.line && c.range.endLineNumber >= this.line
                    || (resultItem.item.range && resultItem.item.range.startLineNumber <= c.range.startLineNumber && resultItem.item.range.endLineNumber >= c.range.endLineNumber)) {
                    TestingDecorations.invalidatedTests.add(this.resultItem);
                    this.dispose(); // todo
                }
                const adjust = count(c.text, '\n') - (c.range.endLineNumber - c.range.startLineNumber);
                if (adjust !== 0) {
                    this.position = this.position.delta(adjust);
                    this.editor.layoutContentWidget(this);
                }
            }
        }));
        editor.addContentWidget(this);
        this._register(toDisposable(() => editor.removeContentWidget(this)));
    }
    getId() {
        return this.id;
    }
    getDomNode() {
        return this.node.root;
    }
    getPosition() {
        return {
            position: this.position,
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    afterRender(_position, coordinate) {
        if (coordinate) {
            const { verticalScrollbarWidth } = this.editor.getLayoutInfo();
            const scrollWidth = this.editor.getScrollWidth();
            this.node.inner.style.maxWidth = `${scrollWidth - verticalScrollbarWidth - coordinate.left - 20}px`;
        }
    }
};
TestErrorContentWidget = __decorate([
    __param(5, ITestingPeekOpener)
], TestErrorContentWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWMsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0ksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVB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