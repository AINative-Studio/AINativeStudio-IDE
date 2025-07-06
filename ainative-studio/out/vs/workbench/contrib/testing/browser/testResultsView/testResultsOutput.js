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
import * as dom from '../../../../../base/browser/dom.js';
import { Delayer } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, combinedDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { EmbeddedDiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { peekViewResultsBackground } from '../../../../../editor/contrib/peekView/browser/peekView.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { formatMessageForTerminal } from '../../../../../platform/terminal/common/terminalStrings.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../../common/theme.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { DetachedProcessInfo } from '../../../terminal/browser/detachedTerminal.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { getXtermScaledDimensions } from '../../../terminal/browser/xterm/xtermTerminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../../../terminal/common/terminalColorRegistry.js';
import { colorizeTestMessageInEditor } from '../testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject } from './testResultsSubject.js';
import { MutableObservableValue } from '../../common/observableValue.js';
import { LiveTestResult } from '../../common/testResult.js';
import { ITestMessage, getMarkId } from '../../common/testTypes.js';
import { CALL_STACK_WIDGET_HEADER_HEIGHT } from '../../../debug/browser/callStackWidget.js';
class SimpleDiffEditorModel extends EditorModel {
    constructor(_original, _modified) {
        super();
        this._original = _original;
        this._modified = _modified;
        this.original = this._original.object.textEditorModel;
        this.modified = this._modified.object.textEditorModel;
    }
    dispose() {
        super.dispose();
        this._original.dispose();
        this._modified.dispose();
    }
}
const commonEditorOptions = {
    scrollBeyondLastLine: false,
    links: true,
    lineNumbers: 'off',
    glyphMargin: false,
    scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto',
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        handleMouseWheel: false,
    },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
    readOnly: true,
    stickyScroll: { enabled: false },
    minimap: { enabled: false },
    automaticLayout: false,
};
const diffEditorOptions = {
    ...commonEditorOptions,
    enableSplitViewResizing: true,
    isInEmbeddedEditor: true,
    renderOverviewRuler: false,
    ignoreTrimWhitespace: false,
    renderSideBySide: true,
    useInlineViewWhenSpaceIsLimited: false,
    originalAriaLabel: localize('testingOutputExpected', 'Expected result'),
    modifiedAriaLabel: localize('testingOutputActual', 'Actual result'),
    diffAlgorithm: 'advanced',
};
let DiffContentProvider = class DiffContentProvider extends Disposable {
    get onDidContentSizeChange() {
        return this.widget.value?.onDidContentSizeChange || Event.None;
    }
    constructor(editor, container, instantiationService, modelService) {
        super();
        this.editor = editor;
        this.container = container;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.widget = this._register(new MutableDisposable());
        this.model = this._register(new MutableDisposable());
    }
    async update(subject) {
        if (!(subject instanceof MessageSubject)) {
            this.clear();
            return false;
        }
        const message = subject.message;
        if (!ITestMessage.isDiffable(message)) {
            this.clear();
            return false;
        }
        const [original, modified] = await Promise.all([
            this.modelService.createModelReference(subject.expectedUri),
            this.modelService.createModelReference(subject.actualUri),
        ]);
        const model = this.model.value = new SimpleDiffEditorModel(original, modified);
        if (!this.widget.value) {
            this.widget.value = this.editor ? this.instantiationService.createInstance(EmbeddedDiffEditorWidget, this.container, diffEditorOptions, {}, this.editor) : this.instantiationService.createInstance(DiffEditorWidget, this.container, diffEditorOptions, {});
            if (this.dimension) {
                this.widget.value.layout(this.dimension);
            }
        }
        this.widget.value.setModel(model);
        this.widget.value.updateOptions(this.getOptions(isMultiline(message.expected) || isMultiline(message.actual)));
        return true;
    }
    clear() {
        this.model.clear();
        this.widget.clear();
    }
    layout(dimensions, hasMultipleFrames) {
        this.dimension = dimensions;
        const editor = this.widget.value;
        if (!editor) {
            return;
        }
        editor.layout(dimensions);
        const height = Math.max(editor.getOriginalEditor().getContentHeight(), editor.getModifiedEditor().getContentHeight());
        this.helper = new ScrollHelper(hasMultipleFrames, height, dimensions.height);
        return height;
    }
    onScrolled(evt) {
        this.helper?.onScrolled(evt, this.widget.value?.getDomNode(), this.widget.value?.getOriginalEditor());
    }
    getOptions(isMultiline) {
        return isMultiline
            ? { ...diffEditorOptions, lineNumbers: 'on' }
            : { ...diffEditorOptions, lineNumbers: 'off' };
    }
};
DiffContentProvider = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService)
], DiffContentProvider);
export { DiffContentProvider };
let MarkdownTestMessagePeek = class MarkdownTestMessagePeek extends Disposable {
    constructor(container, instantiationService) {
        super();
        this.container = container;
        this.instantiationService = instantiationService;
        this.markdown = new Lazy(() => this.instantiationService.createInstance(MarkdownRenderer, {}));
        this.rendered = this._register(new DisposableStore());
        this._register(toDisposable(() => this.clear()));
    }
    async update(subject) {
        this.clear();
        if (!(subject instanceof MessageSubject)) {
            return false;
        }
        const message = subject.message;
        if (ITestMessage.isDiffable(message) || typeof message.message === 'string') {
            return false;
        }
        const rendered = this.rendered.add(this.markdown.value.render(message.message, {}));
        rendered.element.style.userSelect = 'text';
        rendered.element.classList.add('preview-text');
        this.container.appendChild(rendered.element);
        this.element = rendered.element;
        this.rendered.add(toDisposable(() => rendered.element.remove()));
        return true;
    }
    layout(dimension) {
        if (!this.element) {
            return undefined;
        }
        this.element.style.width = `${dimension.width - 32}px`;
        return this.element.clientHeight;
    }
    clear() {
        this.rendered.clear();
        this.element = undefined;
    }
};
MarkdownTestMessagePeek = __decorate([
    __param(1, IInstantiationService)
], MarkdownTestMessagePeek);
export { MarkdownTestMessagePeek };
class ScrollHelper {
    constructor(hasMultipleFrames, contentHeight, viewHeight) {
        this.hasMultipleFrames = hasMultipleFrames;
        this.contentHeight = contentHeight;
        this.viewHeight = viewHeight;
    }
    onScrolled(evt, container, editor) {
        if (!editor || !container) {
            return;
        }
        let delta = Math.max(0, evt.scrollTop - (this.hasMultipleFrames ? CALL_STACK_WIDGET_HEADER_HEIGHT : 0));
        delta = Math.min(Math.max(0, this.contentHeight - this.viewHeight), delta);
        editor.setScrollTop(delta);
        container.style.transform = `translateY(${delta}px)`;
    }
}
let PlainTextMessagePeek = class PlainTextMessagePeek extends Disposable {
    get onDidContentSizeChange() {
        return this.widget.value?.onDidContentSizeChange || Event.None;
    }
    constructor(editor, container, instantiationService, modelService) {
        super();
        this.editor = editor;
        this.container = container;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.widgetDecorations = this._register(new MutableDisposable());
        this.widget = this._register(new MutableDisposable());
        this.model = this._register(new MutableDisposable());
    }
    async update(subject) {
        if (!(subject instanceof MessageSubject)) {
            this.clear();
            return false;
        }
        const message = subject.message;
        if (ITestMessage.isDiffable(message) || message.type === 1 /* TestMessageType.Output */ || typeof message.message !== 'string') {
            this.clear();
            return false;
        }
        const modelRef = this.model.value = await this.modelService.createModelReference(subject.messageUri);
        if (!this.widget.value) {
            this.widget.value = this.editor ? this.instantiationService.createInstance(EmbeddedCodeEditorWidget, this.container, commonEditorOptions, {}, this.editor) : this.instantiationService.createInstance(CodeEditorWidget, this.container, commonEditorOptions, { isSimpleWidget: true });
            if (this.dimension) {
                this.widget.value.layout(this.dimension);
            }
        }
        this.widget.value.setModel(modelRef.object.textEditorModel);
        this.widget.value.updateOptions(commonEditorOptions);
        this.widgetDecorations.value = colorizeTestMessageInEditor(message.message, this.widget.value);
        return true;
    }
    clear() {
        this.widgetDecorations.clear();
        this.widget.clear();
        this.model.clear();
    }
    onScrolled(evt) {
        this.helper?.onScrolled(evt, this.widget.value?.getDomNode(), this.widget.value);
    }
    layout(dimensions, hasMultipleFrames) {
        this.dimension = dimensions;
        const editor = this.widget.value;
        if (!editor) {
            return;
        }
        editor.layout(dimensions);
        const height = editor.getContentHeight();
        this.helper = new ScrollHelper(hasMultipleFrames, height, dimensions.height);
        return height;
    }
};
PlainTextMessagePeek = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService)
], PlainTextMessagePeek);
export { PlainTextMessagePeek };
let TerminalMessagePeek = class TerminalMessagePeek extends Disposable {
    constructor(container, isInPeekView, terminalService, viewDescriptorService, workspaceContext) {
        super();
        this.container = container;
        this.isInPeekView = isInPeekView;
        this.terminalService = terminalService;
        this.viewDescriptorService = viewDescriptorService;
        this.workspaceContext = workspaceContext;
        this.terminalCwd = this._register(new MutableObservableValue(''));
        this.xtermLayoutDelayer = this._register(new Delayer(50));
        /** Active terminal instance. */
        this.terminal = this._register(new MutableDisposable());
        /** Listener for streaming result data */
        this.outputDataListener = this._register(new MutableDisposable());
    }
    async makeTerminal() {
        const prev = this.terminal.value;
        if (prev) {
            prev.xterm.clearBuffer();
            prev.xterm.clearSearchDecorations();
            // clearBuffer tries to retain the prompt. Reset prompt, scrolling state, etc.
            prev.xterm.write(`\x1bc`);
            return prev;
        }
        const capabilities = new TerminalCapabilityStore();
        const cwd = this.terminalCwd;
        capabilities.add(0 /* TerminalCapability.CwdDetection */, {
            type: 0 /* TerminalCapability.CwdDetection */,
            get cwds() { return [cwd.value]; },
            onDidChangeCwd: cwd.onDidChange,
            getCwd: () => cwd.value,
            updateCwd: () => { },
        });
        return this.terminal.value = await this.terminalService.createDetachedTerminal({
            rows: 10,
            cols: 80,
            readonly: true,
            capabilities,
            processInfo: new DetachedProcessInfo({ initialCwd: cwd.value }),
            colorProvider: {
                getBackgroundColor: theme => {
                    const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
                    if (terminalBackground) {
                        return terminalBackground;
                    }
                    if (this.isInPeekView) {
                        return theme.getColor(peekViewResultsBackground);
                    }
                    const location = this.viewDescriptorService.getViewLocationById("workbench.panel.testResults.view" /* Testing.ResultsViewId */);
                    return location === 1 /* ViewContainerLocation.Panel */
                        ? theme.getColor(PANEL_BACKGROUND)
                        : theme.getColor(SIDE_BAR_BACKGROUND);
                },
            }
        });
    }
    async update(subject) {
        this.outputDataListener.clear();
        if (subject instanceof TaskSubject) {
            await this.updateForTaskSubject(subject);
        }
        else if (subject instanceof TestOutputSubject || (subject instanceof MessageSubject && subject.message.type === 1 /* TestMessageType.Output */)) {
            await this.updateForTestSubject(subject);
        }
        else {
            this.clear();
            return false;
        }
        return true;
    }
    async updateForTestSubject(subject) {
        const that = this;
        const testItem = subject instanceof TestOutputSubject ? subject.test.item : subject.test;
        const terminal = await this.updateGenerically({
            subject,
            noOutputMessage: localize('caseNoOutput', 'The test case did not report any output.'),
            getTarget: result => result?.tasks[subject.taskIndex].output,
            *doInitialWrite(output, results) {
                that.updateCwd(testItem.uri);
                const state = subject instanceof TestOutputSubject ? subject.test : results.getStateById(testItem.extId);
                if (!state) {
                    return;
                }
                for (const message of state.tasks[subject.taskIndex].messages) {
                    if (message.type === 1 /* TestMessageType.Output */) {
                        yield* output.getRangeIter(message.offset, message.length);
                    }
                }
            },
            doListenForMoreData: (output, result, write) => result.onChange(e => {
                if (e.reason === 2 /* TestResultItemChangeReason.NewMessage */ && e.item.item.extId === testItem.extId && e.message.type === 1 /* TestMessageType.Output */) {
                    for (const chunk of output.getRangeIter(e.message.offset, e.message.length)) {
                        write(chunk.buffer);
                    }
                }
            }),
        });
        if (subject instanceof MessageSubject && subject.message.type === 1 /* TestMessageType.Output */ && subject.message.marker !== undefined) {
            terminal?.xterm.selectMarkedRange(getMarkId(subject.message.marker, true), getMarkId(subject.message.marker, false), /* scrollIntoView= */ true);
        }
    }
    updateForTaskSubject(subject) {
        return this.updateGenerically({
            subject,
            noOutputMessage: localize('runNoOutput', 'The test run did not record any output.'),
            getTarget: result => result?.tasks[subject.taskIndex],
            doInitialWrite: (task, result) => {
                // Update the cwd and use the first test to try to hint at the correct cwd,
                // but often this will fall back to the first workspace folder.
                this.updateCwd(Iterable.find(result.tests, t => !!t.item.uri)?.item.uri);
                return task.output.buffers;
            },
            doListenForMoreData: (task, _result, write) => task.output.onDidWriteData(e => write(e.buffer)),
        });
    }
    async updateGenerically(opts) {
        const result = opts.subject.result;
        const target = opts.getTarget(result);
        if (!target) {
            return this.clear();
        }
        const terminal = await this.makeTerminal();
        let didWriteData = false;
        const pendingWrites = new MutableObservableValue(0);
        if (result instanceof LiveTestResult) {
            for (const chunk of opts.doInitialWrite(target, result)) {
                didWriteData ||= chunk.byteLength > 0;
                pendingWrites.value++;
                terminal.xterm.write(chunk.buffer, () => pendingWrites.value--);
            }
        }
        else {
            didWriteData = true;
            this.writeNotice(terminal, localize('runNoOutputForPast', 'Test output is only available for new test runs.'));
        }
        this.attachTerminalToDom(terminal);
        this.outputDataListener.clear();
        if (result instanceof LiveTestResult && !result.completedAt) {
            const l1 = result.onComplete(() => {
                if (!didWriteData) {
                    this.writeNotice(terminal, opts.noOutputMessage);
                }
            });
            const l2 = opts.doListenForMoreData(target, result, data => {
                terminal.xterm.write(data);
                didWriteData ||= data.byteLength > 0;
            });
            this.outputDataListener.value = combinedDisposable(l1, l2);
        }
        if (!this.outputDataListener.value && !didWriteData) {
            this.writeNotice(terminal, opts.noOutputMessage);
        }
        // Ensure pending writes finish, otherwise the selection in `updateForTestSubject`
        // can happen before the markers are processed.
        if (pendingWrites.value > 0) {
            await new Promise(resolve => {
                const l = pendingWrites.onDidChange(() => {
                    if (pendingWrites.value === 0) {
                        l.dispose();
                        resolve();
                    }
                });
            });
        }
        return terminal;
    }
    updateCwd(testUri) {
        const wf = (testUri && this.workspaceContext.getWorkspaceFolder(testUri))
            || this.workspaceContext.getWorkspace().folders[0];
        if (wf) {
            this.terminalCwd.value = wf.uri.fsPath;
        }
    }
    writeNotice(terminal, str) {
        terminal.xterm.write(formatMessageForTerminal(str));
    }
    attachTerminalToDom(terminal) {
        terminal.xterm.write('\x1b[?25l'); // hide cursor
        dom.scheduleAtNextAnimationFrame(dom.getWindow(this.container), () => this.layoutTerminal(terminal));
        terminal.attachToElement(this.container, { enableGpu: false });
    }
    clear() {
        this.outputDataListener.clear();
        this.xtermLayoutDelayer.cancel();
        this.terminal.clear();
    }
    layout(dimensions) {
        this.dimensions = dimensions;
        if (this.terminal.value) {
            this.layoutTerminal(this.terminal.value, dimensions.width, dimensions.height);
            return dimensions.height;
        }
        return undefined;
    }
    layoutTerminal({ xterm }, width = this.dimensions?.width ?? this.container.clientWidth, height = this.dimensions?.height ?? this.container.clientHeight) {
        width -= 10 + 20; // scrollbar width + margin
        this.xtermLayoutDelayer.trigger(() => {
            const scaled = getXtermScaledDimensions(dom.getWindow(this.container), xterm.getFont(), width, height);
            if (scaled) {
                xterm.resize(scaled.cols, scaled.rows);
            }
        });
    }
};
TerminalMessagePeek = __decorate([
    __param(2, ITerminalService),
    __param(3, IViewDescriptorService),
    __param(4, IWorkspaceContextService)
], TerminalMessagePeek);
export { TerminalMessagePeek };
const isMultiline = (str) => !!str && str.includes('\n');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNPdXRwdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdFJlc3VsdHNWaWV3L3Rlc3RSZXN1bHRzT3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUEyQixpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdwSyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN2SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN2SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUVySCxPQUFPLEVBQTRCLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDdkgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFN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