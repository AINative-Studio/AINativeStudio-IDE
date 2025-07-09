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
var TestingOutputPeekController_1;
import * as dom from '../../../../base/browser/dom.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Color } from '../../../../base/common/color.js';
import { Event } from '../../../../base/common/event.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, disposableObservableValue, observableValue } from '../../../../base/common/observable.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IPeekViewService, PeekViewWidget, peekViewTitleForeground, peekViewTitleInfoForeground } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { fillInActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { MutableObservableValue, staticObservableValue } from '../common/observableValue.js';
import { StoredValue } from '../common/storedValue.js';
import { resultItemParents } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState } from '../common/testingStates.js';
import { buildTestUri, parseTestUri } from '../common/testingUri.js';
import { renderTestMessageAsText } from './testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, inspectSubjectHasStack, mapFindTestMessage } from './testResultsView/testResultsSubject.js';
import { TestResultsViewContent } from './testResultsView/testResultsViewContent.js';
import { testingMessagePeekBorder, testingPeekBorder, testingPeekHeaderBackground, testingPeekMessageHeaderBackground } from './theme.js';
/** Iterates through every message in every result */
function* allMessages([result]) {
    if (!result) {
        return;
    }
    for (const test of result.tests) {
        for (let taskIndex = 0; taskIndex < test.tasks.length; taskIndex++) {
            const messages = test.tasks[taskIndex].messages;
            for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
                if (messages[messageIndex].type === 0 /* TestMessageType.Error */) {
                    yield { result, test, taskIndex, messageIndex };
                }
            }
        }
    }
}
function messageItReferenceToUri({ result, test, taskIndex, messageIndex }) {
    return buildTestUri({
        type: 2 /* TestUriType.ResultMessage */,
        resultId: result.id,
        testExtId: test.item.extId,
        taskIndex,
        messageIndex,
    });
}
let TestingPeekOpener = class TestingPeekOpener extends Disposable {
    constructor(configuration, editorService, codeEditorService, testResults, testService, storageService, viewsService, commandService, notificationService) {
        super();
        this.configuration = configuration;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.testResults = testResults;
        this.testService = testService;
        this.storageService = storageService;
        this.viewsService = viewsService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        /** @inheritdoc */
        this.historyVisible = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'testHistoryVisibleInPeek',
            scope: 0 /* StorageScope.PROFILE */,
            target: 0 /* StorageTarget.USER */,
        }, this.storageService), false));
        this._register(testResults.onTestChanged(this.openPeekOnFailure, this));
    }
    /** @inheritdoc */
    async open() {
        let uri;
        const active = this.editorService.activeTextEditorControl;
        if (isCodeEditor(active) && active.getModel()?.uri) {
            const modelUri = active.getModel()?.uri;
            if (modelUri) {
                uri = await this.getFileCandidateMessage(modelUri, active.getPosition());
            }
        }
        if (!uri) {
            uri = this.lastUri;
        }
        if (!uri) {
            uri = this.getAnyCandidateMessage();
        }
        if (!uri) {
            return false;
        }
        return this.showPeekFromUri(uri);
    }
    /** @inheritdoc */
    tryPeekFirstError(result, test, options) {
        const candidate = this.getFailedCandidateMessage(test);
        if (!candidate) {
            return false;
        }
        this.showPeekFromUri({
            type: 2 /* TestUriType.ResultMessage */,
            documentUri: candidate.location.uri,
            taskIndex: candidate.taskId,
            messageIndex: candidate.index,
            resultId: result.id,
            testExtId: test.item.extId,
        }, undefined, { selection: candidate.location.range, selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */, ...options });
        return true;
    }
    /** @inheritdoc */
    peekUri(uri, options = {}) {
        const parsed = parseTestUri(uri);
        const result = parsed && this.testResults.getResult(parsed.resultId);
        if (!parsed || !result || !('testExtId' in parsed)) {
            return false;
        }
        if (!('messageIndex' in parsed)) {
            return false;
        }
        const message = result.getStateById(parsed.testExtId)?.tasks[parsed.taskIndex].messages[parsed.messageIndex];
        if (!message?.location) {
            return false;
        }
        this.showPeekFromUri({
            type: 2 /* TestUriType.ResultMessage */,
            documentUri: message.location.uri,
            taskIndex: parsed.taskIndex,
            messageIndex: parsed.messageIndex,
            resultId: result.id,
            testExtId: parsed.testExtId,
        }, options.inEditor, { selection: message.location.range, ...options.options });
        return true;
    }
    /** @inheritdoc */
    closeAllPeeks() {
        for (const editor of this.codeEditorService.listCodeEditors()) {
            TestingOutputPeekController.get(editor)?.removePeek();
        }
    }
    openCurrentInEditor() {
        const current = this.getActiveControl();
        if (!current) {
            return;
        }
        const options = { pinned: false, revealIfOpened: true };
        if (current instanceof TaskSubject || current instanceof TestOutputSubject) {
            this.editorService.openEditor({ resource: current.outputUri, options });
            return;
        }
        if (current instanceof TestOutputSubject) {
            this.editorService.openEditor({ resource: current.outputUri, options });
            return;
        }
        const message = current.message;
        if (current.isDiffable) {
            this.editorService.openEditor({
                original: { resource: current.expectedUri },
                modified: { resource: current.actualUri },
                options,
            });
        }
        else if (typeof message.message === 'string') {
            this.editorService.openEditor({ resource: current.messageUri, options });
        }
        else {
            this.commandService.executeCommand('markdown.showPreview', current.messageUri).catch(err => {
                this.notificationService.error(localize('testing.markdownPeekError', 'Could not open markdown preview: {0}.\n\nPlease make sure the markdown extension is enabled.', err.message));
            });
        }
    }
    getActiveControl() {
        const editor = getPeekedEditorFromFocus(this.codeEditorService);
        const controller = editor && TestingOutputPeekController.get(editor);
        return controller?.subject.get() ?? this.viewsService.getActiveViewWithId("workbench.panel.testResults.view" /* Testing.ResultsViewId */)?.subject;
    }
    /** @inheritdoc */
    async showPeekFromUri(uri, editor, options) {
        if (isCodeEditor(editor)) {
            this.lastUri = uri;
            TestingOutputPeekController.get(editor)?.show(buildTestUri(this.lastUri));
            return true;
        }
        const pane = await this.editorService.openEditor({
            resource: uri.documentUri,
            options: { revealIfOpened: true, ...options }
        });
        const control = pane?.getControl();
        if (!isCodeEditor(control)) {
            return false;
        }
        this.lastUri = uri;
        TestingOutputPeekController.get(control)?.show(buildTestUri(this.lastUri));
        return true;
    }
    /**
     * Opens the peek view on a test failure, based on user preferences.
     */
    openPeekOnFailure(evt) {
        if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */) {
            return;
        }
        const candidate = this.getFailedCandidateMessage(evt.item);
        if (!candidate) {
            return;
        }
        if (evt.result.request.continuous && !getTestingConfiguration(this.configuration, "testing.automaticallyOpenPeekViewDuringAutoRun" /* TestingConfigKeys.AutoOpenPeekViewDuringContinuousRun */)) {
            return;
        }
        const editors = this.codeEditorService.listCodeEditors();
        const cfg = getTestingConfiguration(this.configuration, "testing.automaticallyOpenPeekView" /* TestingConfigKeys.AutoOpenPeekView */);
        // don't show the peek if the user asked to only auto-open peeks for visible tests,
        // and this test is not in any of the editors' models.
        switch (cfg) {
            case "failureInVisibleDocument" /* AutoOpenPeekViewWhen.FailureVisible */: {
                const visibleEditors = this.editorService.visibleTextEditorControls;
                const editorUris = new Set(visibleEditors.filter(isCodeEditor).map(e => e.getModel()?.uri.toString()));
                if (!Iterable.some(resultItemParents(evt.result, evt.item), i => i.item.uri && editorUris.has(i.item.uri.toString()))) {
                    return;
                }
                break; //continue
            }
            case "failureAnywhere" /* AutoOpenPeekViewWhen.FailureAnywhere */:
                break; //continue
            default:
                return; // never show
        }
        const controllers = editors.map(TestingOutputPeekController.get);
        if (controllers.some(c => c?.subject.get())) {
            return;
        }
        this.tryPeekFirstError(evt.result, evt.item);
    }
    /**
     * Gets the message closest to the given position from a test in the file.
     */
    async getFileCandidateMessage(uri, position) {
        let best;
        let bestDistance = Infinity;
        // Get all tests for the document. In those, find one that has a test
        // message closest to the cursor position.
        const demandedUriStr = uri.toString();
        for (const test of this.testService.collection.all) {
            const result = this.testResults.getStateById(test.item.extId);
            if (!result) {
                continue;
            }
            mapFindTestMessage(result[1], (_task, message, messageIndex, taskIndex) => {
                if (message.type !== 0 /* TestMessageType.Error */ || !message.location || message.location.uri.toString() !== demandedUriStr) {
                    return;
                }
                const distance = position ? Math.abs(position.lineNumber - message.location.range.startLineNumber) : 0;
                if (!best || distance <= bestDistance) {
                    bestDistance = distance;
                    best = {
                        type: 2 /* TestUriType.ResultMessage */,
                        testExtId: result[1].item.extId,
                        resultId: result[0].id,
                        taskIndex,
                        messageIndex,
                        documentUri: uri,
                    };
                }
            });
        }
        return best;
    }
    /**
     * Gets any possible still-relevant message from the results.
     */
    getAnyCandidateMessage() {
        const seen = new Set();
        for (const result of this.testResults.results) {
            for (const test of result.tests) {
                if (seen.has(test.item.extId)) {
                    continue;
                }
                seen.add(test.item.extId);
                const found = mapFindTestMessage(test, (task, message, messageIndex, taskIndex) => (message.location && {
                    type: 2 /* TestUriType.ResultMessage */,
                    testExtId: test.item.extId,
                    resultId: result.id,
                    taskIndex,
                    messageIndex,
                    documentUri: message.location.uri,
                }));
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    /**
     * Gets the first failed message that can be displayed from the result.
     */
    getFailedCandidateMessage(test) {
        const fallbackLocation = test.item.uri && test.item.range
            ? { uri: test.item.uri, range: test.item.range }
            : undefined;
        let best;
        mapFindTestMessage(test, (task, message, messageIndex, taskId) => {
            const location = message.location || fallbackLocation;
            if (!isFailedState(task.state) || !location) {
                return;
            }
            if (best && message.type !== 0 /* TestMessageType.Error */) {
                return;
            }
            best = { taskId, index: messageIndex, message, location };
        });
        return best;
    }
};
TestingPeekOpener = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, ICodeEditorService),
    __param(3, ITestResultService),
    __param(4, ITestService),
    __param(5, IStorageService),
    __param(6, IViewsService),
    __param(7, ICommandService),
    __param(8, INotificationService)
], TestingPeekOpener);
export { TestingPeekOpener };
/**
 * Adds output/message peek functionality to code editors.
 */
let TestingOutputPeekController = TestingOutputPeekController_1 = class TestingOutputPeekController extends Disposable {
    /**
     * Gets the controller associated with the given code editor.
     */
    static get(editor) {
        return editor.getContribution("editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */);
    }
    constructor(editor, codeEditorService, instantiationService, testResults, contextKeyService) {
        super();
        this.editor = editor;
        this.codeEditorService = codeEditorService;
        this.instantiationService = instantiationService;
        this.testResults = testResults;
        /**
         * Currently-shown peek view.
         */
        this.peek = this._register(disposableObservableValue('TestingOutputPeek', undefined));
        /**
         * Gets the currently display subject. Undefined if the peek is not open.
         */
        this.subject = derived(reader => this.peek.read(reader)?.current.read(reader));
        this.visible = TestingContextKeys.isPeekVisible.bindTo(contextKeyService);
        this._register(editor.onDidChangeModel(() => this.peek.set(undefined, undefined)));
        this._register(testResults.onResultsChanged(this.closePeekOnCertainResultEvents, this));
        this._register(testResults.onTestChanged(this.closePeekOnTestChange, this));
    }
    /**
     * Shows a peek for the message in the editor.
     */
    async show(uri) {
        const subject = this.retrieveTest(uri);
        if (subject) {
            this.showSubject(subject);
        }
    }
    /**
     * Shows a peek for the existing inspect subject.
     */
    async showSubject(subject) {
        if (!this.peek.get()) {
            const peek = this.instantiationService.createInstance(TestResultsPeek, this.editor);
            this.peek.set(peek, undefined);
            peek.onDidClose(() => {
                this.visible.set(false);
                this.peek.set(undefined, undefined);
            });
            this.visible.set(true);
            peek.create();
        }
        if (subject instanceof MessageSubject) {
            alert(renderTestMessageAsText(subject.message.message));
        }
        this.peek.get().setModel(subject);
    }
    async openAndShow(uri) {
        const subject = this.retrieveTest(uri);
        if (!subject) {
            return;
        }
        if (!subject.revealLocation || subject.revealLocation.uri.toString() === this.editor.getModel()?.uri.toString()) {
            return this.show(uri);
        }
        const otherEditor = await this.codeEditorService.openCodeEditor({
            resource: subject.revealLocation.uri,
            options: { pinned: false, revealIfOpened: true }
        }, this.editor);
        if (otherEditor) {
            TestingOutputPeekController_1.get(otherEditor)?.removePeek();
            return TestingOutputPeekController_1.get(otherEditor)?.show(uri);
        }
    }
    /**
     * Disposes the peek view, if any.
     */
    removePeek() {
        this.peek.set(undefined, undefined);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.peek.get()?.collapseStack();
    }
    /**
     * Shows the next message in the peek, if possible.
     */
    next() {
        const subject = this.peek.get()?.current.get();
        if (!subject) {
            return;
        }
        let first;
        let found = false;
        for (const m of allMessages(this.testResults.results)) {
            first ??= m;
            if (subject instanceof TaskSubject && m.result.id === subject.result.id) {
                found = true; // open the first message found in the current result
            }
            if (found) {
                this.openAndShow(messageItReferenceToUri(m));
                return;
            }
            if (subject instanceof TestOutputSubject && subject.test.item.extId === m.test.item.extId && subject.taskIndex === m.taskIndex && subject.result.id === m.result.id) {
                found = true;
            }
            if (subject instanceof MessageSubject && subject.test.extId === m.test.item.extId && subject.messageIndex === m.messageIndex && subject.taskIndex === m.taskIndex && subject.result.id === m.result.id) {
                found = true;
            }
        }
        if (first) {
            this.openAndShow(messageItReferenceToUri(first));
        }
    }
    /**
     * Shows the previous message in the peek, if possible.
     */
    previous() {
        const subject = this.subject.get();
        if (!subject) {
            return;
        }
        let previous; // pointer to the last message
        let previousLockedIn = false; // whether the last message was verified as previous to the current subject
        let last; // overall last message
        for (const m of allMessages(this.testResults.results)) {
            last = m;
            if (!previousLockedIn) {
                if (subject instanceof TaskSubject) {
                    if (m.result.id === subject.result.id) {
                        previousLockedIn = true;
                    }
                    continue;
                }
                if (subject instanceof TestOutputSubject) {
                    if (m.test.item.extId === subject.test.item.extId && m.result.id === subject.result.id && m.taskIndex === subject.taskIndex) {
                        previousLockedIn = true;
                    }
                    continue;
                }
                if (subject.test.extId === m.test.item.extId && subject.messageIndex === m.messageIndex && subject.taskIndex === m.taskIndex && subject.result.id === m.result.id) {
                    previousLockedIn = true;
                    continue;
                }
                previous = m;
            }
        }
        const target = previous || last;
        if (target) {
            this.openAndShow(messageItReferenceToUri(target));
        }
    }
    /**
     * Removes the peek view if it's being displayed on the given test ID.
     */
    removeIfPeekingForTest(testId) {
        const c = this.subject.get();
        if (c && c instanceof MessageSubject && c.test.extId === testId) {
            this.peek.set(undefined, undefined);
        }
    }
    /**
     * If the test we're currently showing has its state change to something
     * else, then clear the peek.
     */
    closePeekOnTestChange(evt) {
        if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */ || evt.previousState === evt.item.ownComputedState) {
            return;
        }
        this.removeIfPeekingForTest(evt.item.item.extId);
    }
    closePeekOnCertainResultEvents(evt) {
        if ('started' in evt) {
            this.peek.set(undefined, undefined); // close peek when runs start
        }
        if ('removed' in evt && this.testResults.results.length === 0) {
            this.peek.set(undefined, undefined); // close the peek if results are cleared
        }
    }
    retrieveTest(uri) {
        const parts = parseTestUri(uri);
        if (!parts) {
            return undefined;
        }
        const result = this.testResults.results.find(r => r.id === parts.resultId);
        if (!result) {
            return;
        }
        if (parts.type === 0 /* TestUriType.TaskOutput */) {
            return new TaskSubject(result, parts.taskIndex);
        }
        if (parts.type === 1 /* TestUriType.TestOutput */) {
            const test = result.getStateById(parts.testExtId);
            if (!test) {
                return;
            }
            return new TestOutputSubject(result, parts.taskIndex, test);
        }
        const { testExtId, taskIndex, messageIndex } = parts;
        const test = result?.getStateById(testExtId);
        if (!test || !test.tasks[parts.taskIndex]) {
            return;
        }
        return new MessageSubject(result, test, taskIndex, messageIndex);
    }
};
TestingOutputPeekController = TestingOutputPeekController_1 = __decorate([
    __param(1, ICodeEditorService),
    __param(2, IInstantiationService),
    __param(3, ITestResultService),
    __param(4, IContextKeyService)
], TestingOutputPeekController);
export { TestingOutputPeekController };
let TestResultsPeek = class TestResultsPeek extends PeekViewWidget {
    constructor(editor, themeService, peekViewService, testingPeek, contextKeyService, menuService, instantiationService, modelService, codeEditorService, uriIdentityService) {
        super(editor, { showFrame: true, frameWidth: 1, showArrow: true, isResizeable: true, isAccessible: true, className: 'test-output-peek' }, instantiationService);
        this.themeService = themeService;
        this.testingPeek = testingPeek;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.modelService = modelService;
        this.codeEditorService = codeEditorService;
        this.uriIdentityService = uriIdentityService;
        this.current = observableValue('testPeekCurrent', undefined);
        this.resizeOnNextContentHeightUpdate = false;
        this._disposables.add(themeService.onDidColorThemeChange(this.applyTheme, this));
        peekViewService.addExclusiveWidget(editor, this);
    }
    _getMaximumHeightInLines() {
        const defaultMaxHeight = super._getMaximumHeightInLines();
        const contentHeight = this.content?.contentHeight;
        if (!contentHeight) { // undefined or 0
            return defaultMaxHeight;
        }
        if (this.testingPeek.historyVisible.value) { // don't cap height with the history split
            return defaultMaxHeight;
        }
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        // 41 is experimentally determined to be the overhead of the peek view itself
        // to avoid showing scrollbars by default in its content.
        const basePeekOverhead = 41;
        return Math.min(defaultMaxHeight || Infinity, (contentHeight + basePeekOverhead) / lineHeight + 1);
    }
    applyTheme() {
        const theme = this.themeService.getColorTheme();
        const current = this.current.get();
        const isError = current instanceof MessageSubject && current.message.type === 0 /* TestMessageType.Error */;
        const borderColor = (isError ? theme.getColor(testingPeekBorder) : theme.getColor(testingMessagePeekBorder)) || Color.transparent;
        const headerBg = (isError ? theme.getColor(testingPeekHeaderBackground) : theme.getColor(testingPeekMessageHeaderBackground)) || Color.transparent;
        const editorBg = theme.getColor(editorBackground);
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: editorBg && headerBg ? headerBg.makeOpaque(editorBg) : headerBg,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground)
        });
    }
    _fillContainer(container) {
        if (!this.scopedContextKeyService) {
            this.scopedContextKeyService = this._disposables.add(this.contextKeyService.createScoped(container));
            TestingContextKeys.isInPeek.bindTo(this.scopedContextKeyService).set(true);
            const instaService = this._disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            this.content = this._disposables.add(instaService.createInstance(TestResultsViewContent, this.editor, { historyVisible: this.testingPeek.historyVisible, showRevealLocationOnMessages: false, locationForProgress: "workbench.panel.testResults.view" /* Testing.ResultsViewId */ }));
            this._disposables.add(this.content.onClose(() => {
                TestingOutputPeekController.get(this.editor)?.removePeek();
            }));
        }
        super._fillContainer(container);
    }
    _fillHead(container) {
        super._fillHead(container);
        const menuContextKeyService = this._disposables.add(this.contextKeyService.createScoped(container));
        this._disposables.add(bindContextKey(TestingContextKeys.peekHasStack, menuContextKeyService, reader => inspectSubjectHasStack(this.current.read(reader))));
        const menu = this.menuService.createMenu(MenuId.TestPeekTitle, menuContextKeyService);
        const actionBar = this._actionbarWidget;
        this._disposables.add(menu.onDidChange(() => {
            actions.length = 0;
            fillInActionBarActions(menu.getActions(), actions);
            while (actionBar.getAction(1)) {
                actionBar.pull(0); // remove all but the view's default "close" button
            }
            actionBar.push(actions, { label: false, icon: true, index: 0 });
        }));
        const actions = [];
        fillInActionBarActions(menu.getActions(), actions);
        actionBar.push(actions, { label: false, icon: true, index: 0 });
    }
    _fillBody(containerElement) {
        this.content.fillBody(containerElement);
        // Resize on height updates for a short time to allow any heights made
        // by editor contributions to come into effect before.
        const contentHeightSettleTimer = this._disposables.add(new RunOnceScheduler(() => {
            this.resizeOnNextContentHeightUpdate = false;
        }, 500));
        this._disposables.add(this.content.onDidChangeContentHeight(height => {
            if (!this.resizeOnNextContentHeightUpdate || !height) {
                return;
            }
            const displayed = this._getMaximumHeightInLines();
            if (displayed) {
                this._relayout(Math.min(displayed, this.getVisibleEditorLines() / 2), true);
                if (!contentHeightSettleTimer.isScheduled()) {
                    contentHeightSettleTimer.schedule();
                }
            }
        }));
        this._disposables.add(this.content.onDidRequestReveal(sub => {
            TestingOutputPeekController.get(this.editor)?.show(sub instanceof MessageSubject
                ? sub.messageUri
                : sub.outputUri);
        }));
    }
    /**
     * Updates the test to be shown.
     */
    setModel(subject) {
        if (subject instanceof TaskSubject || subject instanceof TestOutputSubject) {
            this.current.set(subject, undefined);
            return this.showInPlace(subject);
        }
        const previous = this.current;
        const revealLocation = subject.revealLocation?.range.getStartPosition();
        if (!revealLocation && !previous) {
            return Promise.resolve();
        }
        this.current.set(subject, undefined);
        if (!revealLocation) {
            return this.showInPlace(subject);
        }
        this.resizeOnNextContentHeightUpdate = true;
        this.show(revealLocation, 10); // 10 is just a random number, we resize once content is available
        this.editor.revealRangeNearTopIfOutsideViewport(Range.fromPositions(revealLocation), 0 /* ScrollType.Smooth */);
        return this.showInPlace(subject);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.content.collapseStack();
    }
    getVisibleEditorLines() {
        // note that we don't use the view ranges because we don't want to get
        // thrown off by large wrapping lines. Being approximate here is okay.
        return Math.round(this.editor.getDomNode().clientHeight / this.editor.getOption(68 /* EditorOption.lineHeight */));
    }
    /**
     * Shows a message in-place without showing or changing the peek location.
     * This is mostly used if peeking a message without a location.
     */
    async showInPlace(subject) {
        if (subject instanceof MessageSubject) {
            const message = subject.message;
            this.setTitle(firstLine(renderTestMessageAsText(message.message)), stripIcons(subject.test.label));
        }
        else {
            this.setTitle(localize('testOutputTitle', 'Test Output'));
        }
        this.applyTheme();
        await this.content.reveal({ subject, preserveFocus: false });
    }
    /** @override */
    _doLayoutBody(height, width) {
        super._doLayoutBody(height, width);
        this.content.onLayoutBody(height, width);
    }
    /** @override */
    _onWidth(width) {
        super._onWidth(width);
        if (this.dimension) {
            this.dimension = new dom.Dimension(width, this.dimension.height);
        }
        this.content.onWidth(width);
    }
};
TestResultsPeek = __decorate([
    __param(1, IThemeService),
    __param(2, IPeekViewService),
    __param(3, ITestingPeekOpener),
    __param(4, IContextKeyService),
    __param(5, IMenuService),
    __param(6, IInstantiationService),
    __param(7, ITextModelService),
    __param(8, ICodeEditorService),
    __param(9, IUriIdentityService)
], TestResultsPeek);
let TestResultsView = class TestResultsView extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, resultService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.resultService = resultService;
        this.content = new Lazy(() => this._register(this.instantiationService.createInstance(TestResultsViewContent, undefined, {
            historyVisible: staticObservableValue(true),
            showRevealLocationOnMessages: true,
            locationForProgress: "workbench.view.testing" /* Testing.ExplorerViewId */,
        })));
    }
    get subject() {
        return this.content.rawValue?.current;
    }
    showLatestRun(preserveFocus = false) {
        const result = this.resultService.results.find(r => r.tasks.length);
        if (!result) {
            return;
        }
        this.content.rawValue?.reveal({ preserveFocus, subject: new TaskSubject(result, 0) });
    }
    renderBody(container) {
        super.renderBody(container);
        // Avoid rendering into the body until it's attached the DOM, as it can
        // result in rendering issues in the terminal (#194156)
        if (this.isBodyVisible()) {
            this.renderContent(container);
        }
        else {
            this._register(Event.once(Event.filter(this.onDidChangeBodyVisibility, Boolean))(() => this.renderContent(container)));
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.content.rawValue?.onLayoutBody(height, width);
    }
    renderContent(container) {
        const content = this.content.value;
        content.fillBody(container);
        this._register(content.onDidRequestReveal(subject => content.reveal({ preserveFocus: true, subject })));
        const [lastResult] = this.resultService.results;
        if (lastResult && lastResult.tasks.length) {
            content.reveal({ preserveFocus: true, subject: new TaskSubject(lastResult, 0) });
        }
    }
};
TestResultsView = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, ITestResultService)
], TestResultsView);
export { TestResultsView };
const firstLine = (str) => {
    const index = str.indexOf('\n');
    return index === -1 ? str : str.slice(0, index);
};
function getOuterEditorFromDiffEditor(codeEditorService) {
    const diffEditors = codeEditorService.listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.hasTextFocus() && diffEditor instanceof EmbeddedDiffEditorWidget) {
            return diffEditor.getParentEditor();
        }
    }
    return null;
}
export class CloseTestPeek extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeTestPeek',
            title: localize2('close', 'Close'),
            icon: Codicon.close,
            precondition: ContextKeyExpr.or(TestingContextKeys.isInPeek, TestingContextKeys.isPeekVisible),
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 101,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek')
            }
        });
    }
    runEditorCommand(accessor, editor) {
        const parent = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        TestingOutputPeekController.get(parent ?? editor)?.removePeek();
    }
}
const navWhen = ContextKeyExpr.and(EditorContextKeys.focus, TestingContextKeys.isPeekVisible);
/**
 * Gets the appropriate editor for peeking based on the currently focused editor.
 */
const getPeekedEditorFromFocus = (codeEditorService) => {
    const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
    return editor && getPeekedEditor(codeEditorService, editor);
};
/**
 * Gets the editor where the peek may be shown, bubbling upwards if the given
 * editor is embedded (i.e. inside a peek already).
 */
const getPeekedEditor = (codeEditorService, editor) => {
    if (TestingOutputPeekController.get(editor)?.subject.get()) {
        return editor;
    }
    if (editor instanceof EmbeddedCodeEditorWidget) {
        return editor.getParentEditor();
    }
    const outer = getOuterEditorFromDiffEditor(codeEditorService);
    if (outer) {
        return outer;
    }
    return editor;
};
export class GoToNextMessageAction extends Action2 {
    static { this.ID = 'testing.goToNextMessage'; }
    constructor() {
        super({
            id: GoToNextMessageAction.ID,
            f1: true,
            title: localize2('testing.goToNextMessage', 'Go to Next Test Failure'),
            metadata: {
                description: localize2('testing.goToNextMessage.description', 'Shows the next failure message in your file')
            },
            icon: Codicon.arrowDown,
            category: Categories.Test,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                when: navWhen,
            },
            menu: [{
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 2,
                }, {
                    id: MenuId.CommandPalette,
                    when: navWhen
                }],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.next();
        }
    }
}
export class GoToPreviousMessageAction extends Action2 {
    static { this.ID = 'testing.goToPreviousMessage'; }
    constructor() {
        super({
            id: GoToPreviousMessageAction.ID,
            f1: true,
            title: localize2('testing.goToPreviousMessage', 'Go to Previous Test Failure'),
            metadata: {
                description: localize2('testing.goToPreviousMessage.description', 'Shows the previous failure message in your file')
            },
            icon: Codicon.arrowUp,
            category: Categories.Test,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                when: navWhen
            },
            menu: [{
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 1,
                }, {
                    id: MenuId.CommandPalette,
                    when: navWhen
                }],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.previous();
        }
    }
}
export class CollapsePeekStack extends Action2 {
    static { this.ID = 'testing.collapsePeekStack'; }
    constructor() {
        super({
            id: CollapsePeekStack.ID,
            title: localize2('testing.collapsePeekStack', 'Collapse Stack Frames'),
            icon: Codicon.collapseAll,
            category: Categories.Test,
            menu: [{
                    id: MenuId.TestPeekTitle,
                    when: TestingContextKeys.peekHasStack,
                    group: 'navigation',
                    order: 4,
                }],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.collapseStack();
        }
    }
}
export class OpenMessageInEditorAction extends Action2 {
    static { this.ID = 'testing.openMessageInEditor'; }
    constructor() {
        super({
            id: OpenMessageInEditorAction.ID,
            f1: false,
            title: localize2('testing.openMessageInEditor', 'Open in Editor'),
            icon: Codicon.goToFile,
            category: Categories.Test,
            menu: [{ id: MenuId.TestPeekTitle }],
        });
    }
    run(accessor) {
        accessor.get(ITestingPeekOpener).openCurrentInEditor();
    }
}
export class ToggleTestingPeekHistory extends Action2 {
    static { this.ID = 'testing.toggleTestingPeekHistory'; }
    constructor() {
        super({
            id: ToggleTestingPeekHistory.ID,
            f1: true,
            title: localize2('testing.toggleTestingPeekHistory', 'Toggle Test History in Peek'),
            metadata: {
                description: localize2('testing.toggleTestingPeekHistory.description', 'Shows or hides the history of test runs in the peek view')
            },
            icon: Codicon.history,
            category: Categories.Test,
            menu: [{
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 3,
                }],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 38 /* KeyCode.KeyH */,
                when: TestingContextKeys.isPeekVisible.isEqualTo(true),
            },
        });
    }
    run(accessor) {
        const opener = accessor.get(ITestingPeekOpener);
        opener.historyVisible.value = !opener.historyVisible.value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ091dHB1dFBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmdPdXRwdXRQZWVrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU1RyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBF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