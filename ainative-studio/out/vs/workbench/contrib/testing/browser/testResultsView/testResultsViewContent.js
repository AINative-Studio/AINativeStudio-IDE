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
var TestResultsViewContent_1;
import * as dom from '../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Sizing, SplitView } from '../../../../../base/browser/ui/splitview/splitview.js';
import { findAsync } from '../../../../../base/common/arrays.js';
import { Limiter } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event, Relay } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { FloatingClickMenu } from '../../../../../platform/actions/browser/floatingMenu.js';
import { createActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { CallStackFrame, CallStackWidget, CustomStackFrame } from '../../../debug/browser/callStackWidget.js';
import { capabilityContextKeys, ITestProfileService } from '../../common/testProfileService.js';
import { LiveTestResult } from '../../common/testResult.js';
import { ITestService } from '../../common/testService.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
import * as icons from '../icons.js';
import { DiffContentProvider, MarkdownTestMessagePeek, PlainTextMessagePeek, TerminalMessagePeek } from './testResultsOutput.js';
import { equalsSubject, getSubjectTestItem, MessageSubject, TaskSubject, TestOutputSubject } from './testResultsSubject.js';
import { OutputPeekTree } from './testResultsTree.js';
import './testResultsViewContent.css';
var SubView;
(function (SubView) {
    SubView[SubView["Diff"] = 0] = "Diff";
    SubView[SubView["History"] = 1] = "History";
})(SubView || (SubView = {}));
let MessageStackFrame = class MessageStackFrame extends CustomStackFrame {
    constructor(message, followup, subject, instantiationService, contextKeyService, profileService) {
        super();
        this.message = message;
        this.followup = followup;
        this.subject = subject;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.profileService = profileService;
        this.height = observableValue('MessageStackFrame.height', 100);
        this.icon = icons.testingViewIcon;
        this.label = subject instanceof MessageSubject
            ? subject.test.label
            : subject instanceof TestOutputSubject
                ? subject.test.item.label
                : subject.result.name;
    }
    render(container) {
        this.message.style.visibility = 'visible';
        container.appendChild(this.message);
        return toDisposable(() => this.message.remove());
    }
    renderActions(container) {
        const store = new DisposableStore();
        container.appendChild(this.followup.domNode);
        store.add(toDisposable(() => this.followup.domNode.remove()));
        const test = getSubjectTestItem(this.subject);
        const capabilities = test && this.profileService.capabilitiesForTest(test);
        let contextKeyService;
        if (capabilities) {
            contextKeyService = this.contextKeyService.createOverlay(capabilityContextKeys(capabilities));
        }
        else {
            const profiles = this.profileService.getControllerProfiles(this.subject.controllerId);
            contextKeyService = this.contextKeyService.createOverlay([
                [TestingContextKeys.hasRunnableTests.key, profiles.some(p => p.group & 2 /* TestRunProfileBitset.Run */)],
                [TestingContextKeys.hasDebuggableTests.key, profiles.some(p => p.group & 4 /* TestRunProfileBitset.Debug */)],
            ]);
        }
        const instaService = store.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const toolbar = store.add(instaService.createInstance(MenuWorkbenchToolBar, container, MenuId.TestCallStack, {
            menuOptions: { shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options),
        }));
        toolbar.context = this.subject;
        store.add(toolbar);
        return store;
    }
};
MessageStackFrame = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, ITestProfileService)
], MessageStackFrame);
function runInLast(accessor, bitset, subject) {
    // Let the full command do its thing if we want to run the whole set of tests
    if (subject instanceof TaskSubject) {
        return accessor.get(ICommandService).executeCommand(bitset === 4 /* TestRunProfileBitset.Debug */ ? "testing.debugLastRun" /* TestCommandId.DebugLastRun */ : "testing.reRunLastRun" /* TestCommandId.ReRunLastRun */, subject.result.id);
    }
    const testService = accessor.get(ITestService);
    const plainTest = subject instanceof MessageSubject ? subject.test : subject.test.item;
    const currentTest = testService.collection.getNodeById(plainTest.extId);
    if (!currentTest) {
        return;
    }
    return testService.runTests({
        group: bitset,
        tests: [currentTest],
    });
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'testing.callStack.run',
            title: localize('testing.callStack.run', "Rerun Test"),
            icon: icons.testingRunIcon,
            menu: {
                id: MenuId.TestCallStack,
                when: TestingContextKeys.hasRunnableTests,
                group: 'navigation',
            },
        });
    }
    run(accessor, subject) {
        runInLast(accessor, 2 /* TestRunProfileBitset.Run */, subject);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'testing.callStack.debug',
            title: localize('testing.callStack.debug', "Debug Test"),
            icon: icons.testingDebugIcon,
            menu: {
                id: MenuId.TestCallStack,
                when: TestingContextKeys.hasDebuggableTests,
                group: 'navigation',
            },
        });
    }
    run(accessor, subject) {
        runInLast(accessor, 4 /* TestRunProfileBitset.Debug */, subject);
    }
});
let TestResultsViewContent = class TestResultsViewContent extends Disposable {
    static { TestResultsViewContent_1 = this; }
    get uiState() {
        return {
            splitViewWidths: Array.from({ length: this.splitView.length }, (_, i) => this.splitView.getViewSize(i)),
        };
    }
    get onDidChangeContentHeight() {
        return this.callStackWidget.onDidChangeContentHeight;
    }
    get contentHeight() {
        return this.callStackWidget?.contentHeight || 0;
    }
    constructor(editor, options, instantiationService, modelService, contextKeyService, uriIdentityService) {
        super();
        this.editor = editor;
        this.options = options;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.contextKeyService = contextKeyService;
        this.uriIdentityService = uriIdentityService;
        this.didReveal = this._register(new Emitter());
        this.currentSubjectStore = this._register(new DisposableStore());
        this.onCloseEmitter = this._register(new Relay());
        this.contentProvidersUpdateLimiter = this._register(new Limiter(1));
        this.onClose = this.onCloseEmitter.event;
    }
    fillBody(containerElement) {
        const initialSpitWidth = TestResultsViewContent_1.lastSplitWidth;
        this.splitView = new SplitView(containerElement, { orientation: 1 /* Orientation.HORIZONTAL */ });
        const { historyVisible, showRevealLocationOnMessages } = this.options;
        const isInPeekView = this.editor !== undefined;
        const messageContainer = this.messageContainer = dom.$('.test-output-peek-message-container');
        this.stackContainer = dom.append(containerElement, dom.$('.test-output-call-stack-container'));
        this.callStackWidget = this._register(this.instantiationService.createInstance(CallStackWidget, this.stackContainer, this.editor));
        this.followupWidget = this._register(this.instantiationService.createInstance(FollowupActionWidget, this.editor));
        this.onCloseEmitter.input = this.followupWidget.onClose;
        this.contentProviders = [
            this._register(this.instantiationService.createInstance(DiffContentProvider, this.editor, messageContainer)),
            this._register(this.instantiationService.createInstance(MarkdownTestMessagePeek, messageContainer)),
            this._register(this.instantiationService.createInstance(TerminalMessagePeek, messageContainer, isInPeekView)),
            this._register(this.instantiationService.createInstance(PlainTextMessagePeek, this.editor, messageContainer)),
        ];
        this.messageContextKeyService = this._register(this.contextKeyService.createScoped(containerElement));
        this.contextKeyTestMessage = TestingContextKeys.testMessageContext.bindTo(this.messageContextKeyService);
        this.contextKeyResultOutdated = TestingContextKeys.testResultOutdated.bindTo(this.messageContextKeyService);
        const treeContainer = dom.append(containerElement, dom.$('.test-output-peek-tree.testing-stdtree'));
        const tree = this._register(this.instantiationService.createInstance(OutputPeekTree, treeContainer, this.didReveal.event, { showRevealLocationOnMessages, locationForProgress: this.options.locationForProgress }));
        this.onDidRequestReveal = tree.onDidRequestReview;
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.stackContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: width => {
                TestResultsViewContent_1.lastSplitWidth = width;
                if (this.dimension) {
                    this.callStackWidget?.layout(this.dimension.height, width);
                    this.layoutContentWidgets(this.dimension, width);
                }
            },
        }, Sizing.Distribute);
        this.splitView.addView({
            onDidChange: Event.None,
            element: treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: width => {
                if (this.dimension) {
                    tree.layout(this.dimension.height, width);
                }
            },
        }, Sizing.Distribute);
        this.splitView.setViewVisible(1 /* SubView.History */, historyVisible.value);
        this._register(historyVisible.onDidChange(visible => {
            this.splitView.setViewVisible(1 /* SubView.History */, visible);
        }));
        if (initialSpitWidth) {
            queueMicrotask(() => this.splitView.resizeView(0, initialSpitWidth));
        }
    }
    /**
     * Shows a message in-place without showing or changing the peek location.
     * This is mostly used if peeking a message without a location.
     */
    reveal(opts) {
        this.didReveal.fire(opts);
        if (this.current && equalsSubject(this.current, opts.subject)) {
            return Promise.resolve();
        }
        this.current = opts.subject;
        return this.contentProvidersUpdateLimiter.queue(async () => {
            this.currentSubjectStore.clear();
            const callFrames = this.getCallFrames(opts.subject) || [];
            const topFrame = await this.prepareTopFrame(opts.subject, callFrames);
            this.setCallStackFrames(topFrame, callFrames);
            this.followupWidget.show(opts.subject);
            this.populateFloatingClick(opts.subject);
        });
    }
    setCallStackFrames(messageFrame, stack) {
        this.callStackWidget.setFrames([messageFrame, ...stack.map(frame => new CallStackFrame(frame.label, frame.uri, frame.position?.lineNumber, frame.position?.column))]);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.callStackWidget.collapseAll();
    }
    getCallFrames(subject) {
        if (!(subject instanceof MessageSubject)) {
            return undefined;
        }
        const frames = subject.stack;
        if (!frames?.length || !this.editor) {
            return frames;
        }
        // If the test extension just sets the top frame as the same location
        // where the message is displayed, in the case of a peek in an editor,
        // don't show it again because it's just a duplicate
        const topFrame = frames[0];
        const peekLocation = subject.revealLocation;
        const isTopFrameSame = peekLocation && topFrame.position && topFrame.uri
            && topFrame.position.lineNumber === peekLocation.range.startLineNumber
            && topFrame.position.column === peekLocation.range.startColumn
            && this.uriIdentityService.extUri.isEqual(topFrame.uri, peekLocation.uri);
        return isTopFrameSame ? frames.slice(1) : frames;
    }
    async prepareTopFrame(subject, callFrames) {
        // ensure the messageContainer is in the DOM so renderers can calculate the
        // dimensions before it's rendered in the list.
        this.messageContainer.style.visibility = 'hidden';
        this.stackContainer.appendChild(this.messageContainer);
        const topFrame = this.currentTopFrame = this.instantiationService.createInstance(MessageStackFrame, this.messageContainer, this.followupWidget, subject);
        const hasMultipleFrames = callFrames.length > 0;
        topFrame.showHeader.set(hasMultipleFrames, undefined);
        const provider = await findAsync(this.contentProviders, p => p.update(subject));
        if (provider) {
            const width = this.splitView.getViewSize(0 /* SubView.Diff */);
            if (width !== -1 && this.dimension) {
                topFrame.height.set(provider.layout({ width, height: this.dimension?.height }, hasMultipleFrames), undefined);
            }
            if (provider.onScrolled) {
                this.currentSubjectStore.add(this.callStackWidget.onDidScroll(evt => {
                    provider.onScrolled(evt);
                }));
            }
            if (provider.onDidContentSizeChange) {
                this.currentSubjectStore.add(provider.onDidContentSizeChange(() => {
                    if (this.dimension && !this.isDoingLayoutUpdate) {
                        this.isDoingLayoutUpdate = true;
                        topFrame.height.set(provider.layout(this.dimension, hasMultipleFrames), undefined);
                        this.isDoingLayoutUpdate = false;
                    }
                }));
            }
        }
        return topFrame;
    }
    layoutContentWidgets(dimension, width = this.splitView.getViewSize(0 /* SubView.Diff */)) {
        this.isDoingLayoutUpdate = true;
        for (const provider of this.contentProviders) {
            const frameHeight = provider.layout({ height: dimension.height, width }, !!this.currentTopFrame?.showHeader.get());
            if (frameHeight) {
                this.currentTopFrame?.height.set(frameHeight, undefined);
            }
        }
        this.isDoingLayoutUpdate = false;
    }
    populateFloatingClick(subject) {
        if (!(subject instanceof MessageSubject)) {
            return;
        }
        this.currentSubjectStore.add(toDisposable(() => {
            this.contextKeyResultOutdated.reset();
            this.contextKeyTestMessage.reset();
        }));
        this.contextKeyTestMessage.set(subject.contextValue || '');
        if (subject.result instanceof LiveTestResult) {
            this.contextKeyResultOutdated.set(subject.result.getStateById(subject.test.extId)?.retired ?? false);
            this.currentSubjectStore.add(subject.result.onChange(ev => {
                if (ev.item.item.extId === subject.test.extId) {
                    this.contextKeyResultOutdated.set(ev.item.retired ?? false);
                }
            }));
        }
        else {
            this.contextKeyResultOutdated.set(true);
        }
        const instaService = this.currentSubjectStore.add(this.instantiationService
            .createChild(new ServiceCollection([IContextKeyService, this.messageContextKeyService])));
        this.currentSubjectStore.add(instaService.createInstance(FloatingClickMenu, {
            container: this.messageContainer,
            menuId: MenuId.TestMessageContent,
            getActionArg: () => subject.context,
        }));
    }
    onLayoutBody(height, width) {
        this.dimension = new dom.Dimension(width, height);
        this.splitView.layout(width);
    }
    onWidth(width) {
        this.splitView.layout(width);
    }
};
TestResultsViewContent = TestResultsViewContent_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService),
    __param(4, IContextKeyService),
    __param(5, IUriIdentityService)
], TestResultsViewContent);
export { TestResultsViewContent };
const FOLLOWUP_ANIMATION_MIN_TIME = 500;
let FollowupActionWidget = class FollowupActionWidget extends Disposable {
    get domNode() {
        return this.el.root;
    }
    constructor(editor, testService, quickInput) {
        super();
        this.editor = editor;
        this.testService = testService;
        this.quickInput = quickInput;
        this.el = dom.h('div.testing-followup-action', []);
        this.visibleStore = this._register(new DisposableStore());
        this.onCloseEmitter = this._register(new Emitter());
        this.onClose = this.onCloseEmitter.event;
    }
    show(subject) {
        this.visibleStore.clear();
        if (subject instanceof MessageSubject) {
            this.showMessage(subject);
        }
    }
    async showMessage(subject) {
        const cts = this.visibleStore.add(new CancellationTokenSource());
        const start = Date.now();
        // Wait for completion otherwise results will not be available to the ext host:
        if (subject.result instanceof LiveTestResult && !subject.result.completedAt) {
            await new Promise(r => Event.once(subject.result.onComplete)(r));
        }
        const followups = await this.testService.provideTestFollowups({
            extId: subject.test.extId,
            messageIndex: subject.messageIndex,
            resultId: subject.result.id,
            taskIndex: subject.taskIndex,
        }, cts.token);
        if (!followups.followups.length || cts.token.isCancellationRequested) {
            followups.dispose();
            return;
        }
        this.visibleStore.add(followups);
        dom.clearNode(this.el.root);
        this.el.root.classList.toggle('animated', Date.now() - start > FOLLOWUP_ANIMATION_MIN_TIME);
        this.el.root.appendChild(this.makeFollowupLink(followups.followups[0]));
        if (followups.followups.length > 1) {
            this.el.root.appendChild(this.makeMoreLink(followups.followups));
        }
        this.visibleStore.add(toDisposable(() => {
            this.el.root.remove();
        }));
    }
    makeFollowupLink(first) {
        const link = this.makeLink(() => this.actionFollowup(link, first));
        dom.reset(link, ...renderLabelWithIcons(first.message));
        return link;
    }
    makeMoreLink(followups) {
        const link = this.makeLink(() => this.quickInput.pick(followups.map((f, i) => ({
            label: f.message,
            index: i
        }))).then(picked => {
            if (picked?.length) {
                followups[picked[0].index].execute();
            }
        }));
        link.innerText = localize('testFollowup.more', '+{0} More...', followups.length - 1);
        return link;
    }
    makeLink(onClick) {
        const link = document.createElement('a');
        link.tabIndex = 0;
        this.visibleStore.add(dom.addDisposableListener(link, 'click', onClick));
        this.visibleStore.add(dom.addDisposableListener(link, 'keydown', e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                onClick();
            }
        }));
        return link;
    }
    actionFollowup(link, fu) {
        if (link.ariaDisabled !== 'true') {
            link.ariaDisabled = 'true';
            fu.execute();
            if (this.editor) {
                this.onCloseEmitter.fire();
            }
        }
    }
};
FollowupActionWidget = __decorate([
    __param(1, ITestService),
    __param(2, IQuickInputService)
], FollowupActionWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNWaWV3Q29udGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdFJlc3VsdHNWaWV3L3Rlc3RSZXN1bHRzVmlld0NvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFlLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDNUYsT0FBTyxFQUFFLG9C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