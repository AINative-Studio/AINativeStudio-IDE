/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { equals } from '../../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellation, timeout } from '../../../../../base/common/async.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IDiffProviderFactoryService } from '../../../../../editor/browser/widget/diffEditor/diffProviderFactoryService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestDiffProviderFactoryService } from '../../../../../editor/test/browser/diff/testDiffProviderFactoryService.js';
import { instantiateTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IChatAccessibilityService, IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatAgentService, IChatAgentNameService, IChatAgentService } from '../../../chat/common/chatAgents.js';
import { InlineChatController1 } from '../../browser/inlineChatController.js';
import { CTX_INLINE_CHAT_RESPONSE_TYPE } from '../../common/inlineChat.js';
import { TestViewsService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { IExtensionService, nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatService } from '../../../chat/common/chatServiceImpl.js';
import { IChatVariablesService } from '../../../chat/common/chatVariables.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { TestContextService, TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../../../chat/common/chatSlashCommands.js';
import { ChatWidgetService } from '../../../chat/browser/chatWidget.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../../../chat/common/chatWidgetHistoryService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { ChatVariablesService } from '../../../chat/browser/chatVariables.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { RerunAction } from '../../browser/inlineChatActions.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { assertType } from '../../../../../base/common/types.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IInlineChatSessionService } from '../../browser/inlineChatSessionService.js';
import { InlineChatSessionServiceImpl } from '../../browser/inlineChatSessionServiceImpl.js';
import { TestWorkerService } from './testWorkerService.js';
import { ILanguageModelsService, LanguageModelsService } from '../../../chat/common/languageModels.js';
import { IChatEditingService } from '../../../chat/common/chatEditingService.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../../services/textmodelResolver/common/textModelResolverService.js';
import { ChatInputBoxContentProvider } from '../../../chat/browser/chatEdinputInputContentProvider.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { ILanguageModelToolsService } from '../../../chat/common/languageModelToolsService.js';
import { MockLanguageModelToolsService } from '../../../chat/test/common/mockLanguageModelToolsService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
suite('InlineChatController', function () {
    const agentData = {
        extensionId: nullExtensionDescription.identifier,
        publisherDisplayName: '',
        extensionDisplayName: '',
        extensionPublisherId: '',
        // id: 'testEditorAgent',
        name: 'testEditorAgent',
        isDefault: true,
        locations: [ChatAgentLocation.Editor],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
    class TestController extends InlineChatController1 {
        constructor() {
            super(...arguments);
            this.onDidChangeState = this._onDidEnterState.event;
            this.states = [];
        }
        static { this.INIT_SEQUENCE = ["CREATE_SESSION" /* State.CREATE_SESSION */, "INIT_UI" /* State.INIT_UI */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]; }
        static { this.INIT_SEQUENCE_AUTO_SEND = [...this.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]; }
        awaitStates(states) {
            const actual = [];
            return new Promise((resolve, reject) => {
                const d = this.onDidChangeState(state => {
                    actual.push(state);
                    if (equals(states, actual)) {
                        d.dispose();
                        resolve(undefined);
                    }
                });
                setTimeout(() => {
                    d.dispose();
                    resolve(`[${states.join(',')}] <> [${actual.join(',')}]`);
                }, 1000);
            });
        }
    }
    const store = new DisposableStore();
    let configurationService;
    let editor;
    let model;
    let ctrl;
    let contextKeyService;
    let chatService;
    let chatAgentService;
    let inlineChatSessionService;
    let instaService;
    let chatWidget;
    setup(function () {
        const serviceCollection = new ServiceCollection([IConfigurationService, new TestConfigurationService()], [IChatVariablesService, new SyncDescriptor(ChatVariablesService)], [ILogService, new NullLogService()], [ITelemetryService, NullTelemetryService], [IHoverService, NullHoverService], [IExtensionService, new TestExtensionService()], [IContextKeyService, new MockContextKeyService()], [IViewsService, new class extends TestViewsService {
                async openView(id, focus) {
                    return { widget: chatWidget ?? null };
                }
            }()], [IWorkspaceContextService, new TestContextService()], [IChatWidgetHistoryService, new SyncDescriptor(ChatWidgetHistoryService)], [IChatWidgetService, new SyncDescriptor(ChatWidgetService)], [IChatSlashCommandService, new SyncDescriptor(ChatSlashCommandService)], [IChatService, new SyncDescriptor(ChatService)], [IChatAgentNameService, new class extends mock() {
                getAgentNameRestriction(chatAgentData) {
                    return false;
                }
            }], [IEditorWorkerService, new SyncDescriptor(TestWorkerService)], [IContextKeyService, contextKeyService], [IChatAgentService, new SyncDescriptor(ChatAgentService)], [IDiffProviderFactoryService, new SyncDescriptor(TestDiffProviderFactoryService)], [IInlineChatSessionService, new SyncDescriptor(InlineChatSessionServiceImpl)], [ICommandService, new SyncDescriptor(TestCommandService)], [IChatEditingService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.editingSessionsObs = constObservable([]);
                }
            }], [IEditorProgressService, new class extends mock() {
                show(total, delay) {
                    return {
                        total() { },
                        worked(value) { },
                        done() { },
                    };
                }
            }], [IChatAccessibilityService, new class extends mock() {
                acceptResponse(response, requestId) { }
                acceptRequest() { return -1; }
            }], [IAccessibleViewService, new class extends mock() {
                getOpenAriaHint(verbositySettingKey) {
                    return null;
                }
            }], [IConfigurationService, configurationService], [IViewDescriptorService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLocation = Event.None;
                }
            }], [INotebookEditorService, new class extends mock() {
                listNotebookEditors() { return []; }
            }], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()], [ILanguageModelsService, new SyncDescriptor(LanguageModelsService)], [ITextModelService, new SyncDescriptor(TextModelResolverService)], [ILanguageModelToolsService, new SyncDescriptor(MockLanguageModelToolsService)]);
        instaService = store.add((store.add(workbenchInstantiationService(undefined, store))).createChild(serviceCollection));
        configurationService = instaService.get(IConfigurationService);
        configurationService.setUserConfiguration('chat', { editor: { fontSize: 14, fontFamily: 'default' } });
        configurationService.setUserConfiguration('editor', {});
        contextKeyService = instaService.get(IContextKeyService);
        chatService = instaService.get(IChatService);
        chatAgentService = instaService.get(IChatAgentService);
        inlineChatSessionService = store.add(instaService.get(IInlineChatSessionService));
        store.add(instaService.get(ILanguageModelsService));
        store.add(instaService.createInstance(ChatInputBoxContentProvider));
        model = store.add(instaService.get(IModelService).createModel('Hello\nWorld\nHello Again\nHello World\n', null));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        editor = store.add(instantiateTestCodeEditor(instaService, model));
        store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData, }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{
                            range: new Range(1, 1, 1, 1),
                            text: request.message
                        }]
                });
                return {};
            },
        }));
    });
    teardown(function () {
        store.clear();
        ctrl?.dispose();
    });
    // TODO@jrieken re-enable, looks like List/ChatWidget is leaking
    // ensureNoDisposablesAreLeakedInTestSuite();
    test('creation, not showing anything', function () {
        ctrl = instaService.createInstance(TestController, editor);
        assert.ok(ctrl);
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test('run (show/hide)', async function () {
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const run = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        assert.ok(ctrl.getWidgetPosition() !== undefined);
        await ctrl.cancelSession();
        await run;
        assert.ok(ctrl.getWidgetPosition() === undefined);
    });
    test('wholeRange does not expand to whole lines, editor selection default', async function () {
        editor.setSelection(new Range(1, 1, 1, 3));
        ctrl = instaService.createInstance(TestController, editor);
        ctrl.run({});
        await Event.toPromise(Event.filter(ctrl.onDidChangeState, e => e === "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */));
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 3));
        await ctrl.cancelSession();
    });
    test('typing outside of wholeRange finishes session', async function () {
        configurationService.setUserConfiguration("inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */, true);
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 11 /* line length */));
        editor.setSelection(new Range(2, 1, 2, 1));
        editor.trigger('test', 'type', { text: 'a' });
        assert.strictEqual(await ctrl.awaitStates(["DONE" /* State.ACCEPT */]), undefined);
        await r;
    });
    test('\'whole range\' isn\'t updated for edits outside whole range #4346', async function () {
        editor.setSelection(new Range(3, 1, 3, 3));
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: editor.getModel().uri,
                    edits: [{
                            range: new Range(1, 1, 1, 1), // EDIT happens outside of whole range
                            text: `${request.message}\n${request.message}`
                        }]
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates(TestController.INIT_SEQUENCE);
        const r = ctrl.run({ message: 'GENGEN', autoSend: false });
        assert.strictEqual(await p, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(3, 1, 3, 3)); // initial
        ctrl.chatWidget.setInput('GENGEN');
        ctrl.chatWidget.acceptInput();
        assert.strictEqual(await ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]), undefined);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 4, 3));
        await ctrl.cancelSession();
        await r;
    });
    test('Stuck inline chat widget #211', async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                return new Promise(() => { });
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test('[Bug] Inline Chat\'s streaming pushed broken iterations to the undo stack #2403', async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'hEllo1\n' }] });
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(2, 1, 2, 1), text: 'hEllo2\n' }] });
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1000, 1), text: 'Hello1\nHello2\n' }] });
                return {};
            },
        }));
        const valueThen = editor.getModel().getValue();
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(editor.getModel().getValue(), 'Hello1\nHello2\n');
        editor.getModel().undo();
        assert.strictEqual(editor.getModel().getValue(), valueThen);
    });
    test.skip('UI is streaming edits minutes after the response is finished #3345', async function () {
        return runWithFakedTimers({ maxTaskCount: Number.MAX_SAFE_INTEGER }, async () => {
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData
            }, {
                async invoke(request, progress, history, token) {
                    const text = '${CSI}#a\n${CSI}#b\n${CSI}#c\n';
                    await timeout(10);
                    progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text }] });
                    await timeout(10);
                    progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.repeat(1000) + 'DONE' }] });
                    throw new Error('Too long');
                },
            }));
            // let modelChangeCounter = 0;
            // store.add(editor.getModel().onDidChangeContent(() => { modelChangeCounter++; }));
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            const r = ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            // assert.ok(modelChangeCounter > 0, modelChangeCounter.toString()); // some changes have been made
            // const modelChangeCounterNow = modelChangeCounter;
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await timeout(10);
            // assert.strictEqual(modelChangeCounterNow, modelChangeCounter);
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await ctrl.cancelSession();
            await r;
        });
    });
    test('escape doesn\'t remove code added from inline editor chat #3523 1/2', async function () {
        // NO manual edits -> cancel
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        ctrl.cancelSession();
        await r;
        assert.ok(!model.getValue().includes('GENERATED'));
    });
    test('escape doesn\'t remove code added from inline editor chat #3523, 2/2', async function () {
        // manual edits -> finish
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        editor.executeEdits('test', [EditOperation.insert(model.getFullModelRange().getEndPosition(), 'MANUAL')]);
        ctrl.acceptSession();
        await r;
        assert.ok(model.getValue().includes('GENERATED'));
        assert.ok(model.getValue().includes('MANUAL'));
    });
    test('re-run should discard pending edits', async function () {
        let count = 1;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'PROMPT_', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_1');
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_2');
        ctrl.acceptSession();
        await r;
    });
    test('Retry undoes all changes, not just those from the request#5736', async function () {
        const text = [
            'eins-',
            'zwei-',
            'drei-'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins-');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei-eins-');
        // REQUEST 2 - RERUN
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p3, undefined);
        assert.strictEqual(model.getValue(), 'drei-eins-');
        ctrl.acceptSession();
        await r;
    });
    test('moving inline chat to another model undoes changes', async function () {
        const text = [
            'eins\n',
            'zwei\n'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        };
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    test('moving inline chat to another model undoes changes (2 requests)', async function () {
        const text = [
            'eins\n',
            'zwei\n'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei\neins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        };
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    test('Clicking "re-run without /doc" while a request is in progress closes the widget #5997', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        const onDidInvoke = new Emitter();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                queueMicrotask(() => onDidInvoke.fire());
                commandDetection.push(request.enableCommandDetection);
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] });
                if (count === 1) {
                    // FIRST call waits for cancellation
                    await raceCancellation(new Promise(() => { }), token);
                }
                else {
                    await timeout(10);
                }
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        // const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, State.SHOW_REQUEST]);
        const p = Event.toPromise(onDidInvoke.event);
        ctrl.run({ message: 'Hello-', autoSend: true });
        await p;
        // assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = Event.toPromise(onDidInvoke.event);
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, { noCommandDetection: true, attempt: request.attempt + 1, location: ChatAgentLocation.Editor });
        await p2;
        assert.strictEqual(await p3, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Re-run without after request is done', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                commandDetection.push(request.enableCommandDetection);
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, { noCommandDetection: true, attempt: request.attempt + 1, location: ChatAgentLocation.Editor });
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Inline: Pressing Rerun request while the response streams breaks the response #5442', async function () {
        model.setValue('two\none\n');
        const attempts = [];
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                attempts.push(request.attempt);
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: `TRY:${request.attempt}\n` }] });
                await raceCancellation(deferred.p, token);
                deferred.complete();
                await timeout(10);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        await timeout(10);
        assert.deepStrictEqual(attempts, [0]);
        // RERUN (cancel, undo, redo)
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const rerun = new RerunAction();
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(attempts, [0, 1]);
        assert.strictEqual(model.getValue(), 'TRY:1\ntwo\none\n');
    });
    test('Stopping/cancelling a request should NOT undo its changes', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        let progress;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, _progress, history, token) {
                progress = _progress;
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        await timeout(10);
        assert.strictEqual(await p, undefined);
        assertType(progress);
        const modelChange = new Promise(resolve => model.onDidChangeContent(() => resolve()));
        progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }] });
        await modelChange;
        assert.strictEqual(model.getValue(), 'HelloWorld'); // first word has been streamed
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'HelloWorld'); // CANCEL just stops the request and progressive typing but doesn't undo
    });
    test('Apply Edits from existing session w/ edits', async function () {
        model.setValue('');
        const newSession = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(newSession);
        await (await chatService.sendRequest(newSession.chatModel.sessionId, 'Existing', { location: ChatAgentLocation.Editor }))?.responseCreatedPromise;
        assert.strictEqual(newSession.chatModel.requestInProgress, true);
        const response = newSession.chatModel.lastRequest?.response;
        assertType(response);
        await new Promise(resolve => {
            if (response.isComplete) {
                resolve(undefined);
            }
            const d = response.onDidChange(() => {
                if (response.isComplete) {
                    d.dispose();
                    resolve(undefined);
                }
            });
        });
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
        ctrl.run({ existingSession: newSession });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'Existing');
    });
    test('Undo on error (2 rounds)', async function () {
        return runWithFakedTimers({}, async () => {
            store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData, }, {
                async invoke(request, progress, history, token) {
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{
                                range: new Range(1, 1, 1, 1),
                                text: request.message
                            }]
                    });
                    if (request.message === 'two') {
                        await timeout(100); // give edit a chance
                        return {
                            errorDetails: { message: 'FAILED' }
                        };
                    }
                    return {};
                },
            }));
            model.setValue('');
            // ROUND 1
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            ctrl.run({ autoSend: true, message: 'one' });
            assert.strictEqual(await p, undefined);
            assert.strictEqual(model.getValue(), 'one');
            // ROUND 2
            const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            const values = new Set();
            store.add(model.onDidChangeContent(() => values.add(model.getValue())));
            ctrl.chatWidget.acceptInput('two'); // WILL Trigger a failure
            assert.strictEqual(await p2, undefined);
            assert.strictEqual(model.getValue(), 'one'); // undone
            assert.ok(values.has('twoone')); // we had but the change got undone
        });
    });
    test('Inline chat "discard" button does not always appear if response is stopped #228030', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }] });
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        const value = contextKeyService.getContextKeyValue(CTX_INLINE_CHAT_RESPONSE_TYPE.key);
        assert.notStrictEqual(value, "none" /* InlineChatResponseType.None */);
    });
    test('Restore doesn\'t edit on errored result', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model2 = store.add(instaService.get(IModelService).createModel('ABC', null));
            model.setValue('World');
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData
            }, {
                async invoke(request, progress, history, token) {
                    progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello1' }] });
                    await timeout(100);
                    progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello2' }] });
                    await timeout(100);
                    progress({ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello3' }] });
                    await timeout(100);
                    return {
                        errorDetails: { message: 'FAILED' }
                    };
                },
            }));
            ctrl = instaService.createInstance(TestController, editor);
            // REQUEST 1
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            const p2 = ctrl.awaitStates(["PAUSE" /* State.PAUSE */]);
            editor.setModel(model2);
            assert.strictEqual(await p2, undefined);
            const p3 = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
            editor.setModel(model);
            assert.strictEqual(await p3, undefined);
            assert.strictEqual(model.getValue(), 'World');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L3Rlc3QvYnJvd3Nlci9pbmxpbmVDaGF0Q29udHJvbGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFNUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDNUgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDM0gsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDakcsT0FBTyxF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