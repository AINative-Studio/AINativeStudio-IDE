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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL2lubGluZUNoYXRDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU1RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUM1SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUMzSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNqRyxPQUFPLEVB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