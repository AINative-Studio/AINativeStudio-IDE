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
var SessionsRenderer_1, ThreadsRenderer_1, StackFramesRenderer_1, ErrorsRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Action } from '../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { posix } from '../../../../base/common/path.js';
import { commonSuffixLength } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { getActionBarActions, getContextMenuActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { asCssVariable, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { renderViewTree } from './baseDebugView.js';
import { CONTINUE_ID, CONTINUE_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, PAUSE_ID, PAUSE_LABEL, RESTART_LABEL, RESTART_SESSION_ID, STEP_INTO_ID, STEP_INTO_LABEL, STEP_OUT_ID, STEP_OUT_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STOP_ID, STOP_LABEL } from './debugCommands.js';
import * as icons from './debugIcons.js';
import { createDisconnectMenuItemAction } from './debugToolBar.js';
import { CALLSTACK_VIEW_ID, CONTEXT_CALLSTACK_FOCUSED, CONTEXT_CALLSTACK_ITEM_STOPPED, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD, CONTEXT_CALLSTACK_SESSION_IS_ATTACH, CONTEXT_DEBUG_STATE, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_STACK_FRAME_SUPPORTS_RESTART, getStateLabel, IDebugService, isFrameDeemphasized } from '../common/debug.js';
import { StackFrame, Thread, ThreadAndSessionIds } from '../common/debugModel.js';
import { isSessionAttach } from '../common/debugUtils.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = dom.$;
function assignSessionContext(element, context) {
    context.sessionId = element.getId();
    return context;
}
function assignThreadContext(element, context) {
    context.threadId = element.getId();
    assignSessionContext(element.session, context);
    return context;
}
function assignStackFrameContext(element, context) {
    context.frameId = element.getId();
    context.frameName = element.name;
    context.frameLocation = { range: element.range, source: element.source.raw };
    assignThreadContext(element.thread, context);
    return context;
}
export function getContext(element) {
    if (element instanceof StackFrame) {
        return assignStackFrameContext(element, {});
    }
    else if (element instanceof Thread) {
        return assignThreadContext(element, {});
    }
    else if (isDebugSession(element)) {
        return assignSessionContext(element, {});
    }
    else {
        return undefined;
    }
}
// Extensions depend on this context, should not be changed even though it is not fully deterministic
export function getContextForContributedActions(element) {
    if (element instanceof StackFrame) {
        if (element.source.inMemory) {
            return element.source.raw.path || element.source.reference || element.source.name;
        }
        return element.source.uri.toString();
    }
    if (element instanceof Thread) {
        return element.threadId;
    }
    if (isDebugSession(element)) {
        return element.getId();
    }
    return '';
}
export function getSpecificSourceName(stackFrame) {
    // To reduce flashing of the path name and the way we fetch stack frames
    // We need to compute the source name based on the other frames in the stale call stack
    let callStack = stackFrame.thread.getStaleCallStack();
    callStack = callStack.length > 0 ? callStack : stackFrame.thread.getCallStack();
    const otherSources = callStack.map(sf => sf.source).filter(s => s !== stackFrame.source);
    let suffixLength = 0;
    otherSources.forEach(s => {
        if (s.name === stackFrame.source.name) {
            suffixLength = Math.max(suffixLength, commonSuffixLength(stackFrame.source.uri.path, s.uri.path));
        }
    });
    if (suffixLength === 0) {
        return stackFrame.source.name;
    }
    const from = Math.max(0, stackFrame.source.uri.path.lastIndexOf(posix.sep, stackFrame.source.uri.path.length - suffixLength - 1));
    return (from > 0 ? '...' : '') + stackFrame.source.uri.path.substring(from);
}
async function expandTo(session, tree) {
    if (session.parentSession) {
        await expandTo(session.parentSession, tree);
    }
    await tree.expand(session);
}
let CallStackView = class CallStackView extends ViewPane {
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.options = options;
        this.debugService = debugService;
        this.menuService = menuService;
        this.needsRefresh = false;
        this.ignoreSelectionChangedEvent = false;
        this.ignoreFocusStackFrameEvent = false;
        this.autoExpandedSessions = new Set();
        this.selectionNeedsUpdate = false;
        // Create scheduler to prevent unnecessary flashing of tree when reacting to changes
        this.onCallStackChangeScheduler = this._register(new RunOnceScheduler(async () => {
            // Only show the global pause message if we do not display threads.
            // Otherwise there will be a pause message per thread and there is no need for a global one.
            const sessions = this.debugService.getModel().getSessions();
            if (sessions.length === 0) {
                this.autoExpandedSessions.clear();
            }
            const thread = sessions.length === 1 && sessions[0].getAllThreads().length === 1 ? sessions[0].getAllThreads()[0] : undefined;
            const stoppedDetails = sessions.length === 1 ? sessions[0].getStoppedDetails() : undefined;
            if (stoppedDetails && (thread || typeof stoppedDetails.threadId !== 'number')) {
                this.stateMessageLabel.textContent = stoppedDescription(stoppedDetails);
                this.stateMessageLabelHover.update(stoppedText(stoppedDetails));
                this.stateMessageLabel.classList.toggle('exception', stoppedDetails.reason === 'exception');
                this.stateMessage.hidden = false;
            }
            else if (sessions.length === 1 && sessions[0].state === 3 /* State.Running */) {
                this.stateMessageLabel.textContent = localize({ key: 'running', comment: ['indicates state'] }, "Running");
                this.stateMessageLabelHover.update(sessions[0].getLabel());
                this.stateMessageLabel.classList.remove('exception');
                this.stateMessage.hidden = false;
            }
            else {
                this.stateMessage.hidden = true;
            }
            this.updateActions();
            this.needsRefresh = false;
            this.dataSource.deemphasizedStackFramesToShow = [];
            await this.tree.updateChildren();
            try {
                const toExpand = new Set();
                sessions.forEach(s => {
                    // Automatically expand sessions that have children, but only do this once.
                    if (s.parentSession && !this.autoExpandedSessions.has(s.parentSession)) {
                        toExpand.add(s.parentSession);
                    }
                });
                for (const session of toExpand) {
                    await expandTo(session, this.tree);
                    this.autoExpandedSessions.add(session);
                }
            }
            catch (e) {
                // Ignore tree expand errors if element no longer present
            }
            if (this.selectionNeedsUpdate) {
                this.selectionNeedsUpdate = false;
                await this.updateTreeSelection();
            }
        }, 50));
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.options.title);
        this.stateMessage = dom.append(container, $('span.call-stack-state-message'));
        this.stateMessage.hidden = true;
        this.stateMessageLabel = dom.append(this.stateMessage, $('span.label'));
        this.stateMessageLabelHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.stateMessage, ''));
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-call-stack');
        const treeContainer = renderViewTree(container);
        this.dataSource = new CallStackDataSource(this.debugService);
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'CallStackView', treeContainer, new CallStackDelegate(), new CallStackCompressionDelegate(this.debugService), [
            this.instantiationService.createInstance(SessionsRenderer),
            this.instantiationService.createInstance(ThreadsRenderer),
            this.instantiationService.createInstance(StackFramesRenderer),
            this.instantiationService.createInstance(ErrorsRenderer),
            new LoadMoreRenderer(),
            new ShowMoreRenderer()
        ], this.dataSource, {
            accessibilityProvider: new CallStackAccessibilityProvider(),
            compressionEnabled: true,
            autoExpandSingleChildren: true,
            identityProvider: {
                getId: (element) => {
                    if (typeof element === 'string') {
                        return element;
                    }
                    if (element instanceof Array) {
                        return `showMore ${element[0].getId()}`;
                    }
                    return element.getId();
                }
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (e) => {
                    if (isDebugSession(e)) {
                        return e.getLabel();
                    }
                    if (e instanceof Thread) {
                        return `${e.name} ${e.stateLabel}`;
                    }
                    if (e instanceof StackFrame || typeof e === 'string') {
                        return e;
                    }
                    if (e instanceof ThreadAndSessionIds) {
                        return LoadMoreRenderer.LABEL;
                    }
                    return localize('showMoreStackFrames2', "Show More Stack Frames");
                },
                getCompressedNodeKeyboardNavigationLabel: (e) => {
                    const firstItem = e[0];
                    if (isDebugSession(firstItem)) {
                        return firstItem.getLabel();
                    }
                    return '';
                }
            },
            expandOnlyOnTwistieClick: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        CONTEXT_CALLSTACK_FOCUSED.bindTo(this.tree.contextKeyService);
        this.tree.setInput(this.debugService.getModel());
        this._register(this.tree);
        this._register(this.tree.onDidOpen(async (e) => {
            if (this.ignoreSelectionChangedEvent) {
                return;
            }
            const focusStackFrame = (stackFrame, thread, session, options = {}) => {
                this.ignoreFocusStackFrameEvent = true;
                try {
                    this.debugService.focusStackFrame(stackFrame, thread, session, { ...options, ...{ explicit: true } });
                }
                finally {
                    this.ignoreFocusStackFrameEvent = false;
                }
            };
            const element = e.element;
            if (element instanceof StackFrame) {
                const opts = {
                    preserveFocus: e.editorOptions.preserveFocus,
                    sideBySide: e.sideBySide,
                    pinned: e.editorOptions.pinned
                };
                focusStackFrame(element, element.thread, element.thread.session, opts);
            }
            if (element instanceof Thread) {
                focusStackFrame(undefined, element, element.session);
            }
            if (isDebugSession(element)) {
                focusStackFrame(undefined, undefined, element);
            }
            if (element instanceof ThreadAndSessionIds) {
                const session = this.debugService.getModel().getSession(element.sessionId);
                const thread = session && session.getThread(element.threadId);
                if (thread) {
                    const totalFrames = thread.stoppedDetails?.totalFrames;
                    const remainingFramesCount = typeof totalFrames === 'number' ? (totalFrames - thread.getCallStack().length) : undefined;
                    // Get all the remaining frames
                    await thread.fetchCallStack(remainingFramesCount);
                    await this.tree.updateChildren();
                }
            }
            if (element instanceof Array) {
                this.dataSource.deemphasizedStackFramesToShow.push(...element);
                this.tree.updateChildren();
            }
        }));
        this._register(this.debugService.getModel().onDidChangeCallStack(() => {
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                return;
            }
            if (!this.onCallStackChangeScheduler.isScheduled()) {
                this.onCallStackChangeScheduler.schedule();
            }
        }));
        const onFocusChange = Event.any(this.debugService.getViewModel().onDidFocusStackFrame, this.debugService.getViewModel().onDidFocusSession);
        this._register(onFocusChange(async () => {
            if (this.ignoreFocusStackFrameEvent) {
                return;
            }
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                this.selectionNeedsUpdate = true;
                return;
            }
            if (this.onCallStackChangeScheduler.isScheduled()) {
                this.selectionNeedsUpdate = true;
                return;
            }
            await this.updateTreeSelection();
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        // Schedule the update of the call stack tree if the viewlet is opened after a session started #14684
        if (this.debugService.state === 2 /* State.Stopped */) {
            this.onCallStackChangeScheduler.schedule(0);
        }
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible && this.needsRefresh) {
                this.onCallStackChangeScheduler.schedule();
            }
        }));
        this._register(this.debugService.onDidNewSession(s => {
            const sessionListeners = [];
            sessionListeners.push(s.onDidChangeName(() => {
                // this.tree.updateChildren is called on a delay after a session is added,
                // so don't rerender if the tree doesn't have the node yet
                if (this.tree.hasNode(s)) {
                    this.tree.rerender(s);
                }
            }));
            sessionListeners.push(s.onDidEndAdapter(() => dispose(sessionListeners)));
            if (s.parentSession) {
                // A session we already expanded has a new child session, allow to expand it again.
                this.autoExpandedSessions.delete(s.parentSession);
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    async updateTreeSelection() {
        if (!this.tree || !this.tree.getInput()) {
            // Tree not initialized yet
            return;
        }
        const updateSelectionAndReveal = (element) => {
            this.ignoreSelectionChangedEvent = true;
            try {
                this.tree.setSelection([element]);
                // If the element is outside of the screen bounds,
                // position it in the middle
                if (this.tree.getRelativeTop(element) === null) {
                    this.tree.reveal(element, 0.5);
                }
                else {
                    this.tree.reveal(element);
                }
            }
            catch (e) { }
            finally {
                this.ignoreSelectionChangedEvent = false;
            }
        };
        const thread = this.debugService.getViewModel().focusedThread;
        const session = this.debugService.getViewModel().focusedSession;
        const stackFrame = this.debugService.getViewModel().focusedStackFrame;
        if (!thread) {
            if (!session) {
                this.tree.setSelection([]);
            }
            else {
                updateSelectionAndReveal(session);
            }
        }
        else {
            // Ignore errors from this expansions because we are not aware if we rendered the threads and sessions or we hide them to declutter the view
            try {
                await expandTo(thread.session, this.tree);
            }
            catch (e) { }
            try {
                await this.tree.expand(thread);
            }
            catch (e) { }
            const toReveal = stackFrame || session;
            if (toReveal) {
                updateSelectionAndReveal(toReveal);
            }
        }
    }
    onContextMenu(e) {
        const element = e.element;
        let overlay = [];
        if (isDebugSession(element)) {
            overlay = getSessionContextOverlay(element);
        }
        else if (element instanceof Thread) {
            overlay = getThreadContextOverlay(element);
        }
        else if (element instanceof StackFrame) {
            overlay = getStackFrameContextOverlay(element);
        }
        const contextKeyService = this.contextKeyService.createOverlay(overlay);
        const menu = this.menuService.getMenuActions(MenuId.DebugCallStackContext, contextKeyService, { arg: getContextForContributedActions(element), shouldForwardArgs: true });
        const result = getContextMenuActions(menu, 'inline');
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => result.secondary,
            getActionsContext: () => getContext(element)
        });
    }
};
CallStackView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IInstantiationService),
    __param(5, IViewDescriptorService),
    __param(6, IConfigurationService),
    __param(7, IContextKeyService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IMenuService)
], CallStackView);
export { CallStackView };
function getSessionContextOverlay(session) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'session'],
        [CONTEXT_CALLSTACK_SESSION_IS_ATTACH.key, isSessionAttach(session)],
        [CONTEXT_CALLSTACK_ITEM_STOPPED.key, session.state === 2 /* State.Stopped */],
        [CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD.key, session.getAllThreads().length === 1],
    ];
}
let SessionsRenderer = class SessionsRenderer {
    static { SessionsRenderer_1 = this; }
    static { this.ID = 'session'; }
    constructor(instantiationService, contextKeyService, hoverService, menuService) {
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.menuService = menuService;
    }
    get templateId() {
        return SessionsRenderer_1.ID;
    }
    renderTemplate(container) {
        const session = dom.append(container, $('.session'));
        dom.append(session, $(ThemeIcon.asCSSSelector(icons.callstackViewSession)));
        const name = dom.append(session, $('.name'));
        const stateLabel = dom.append(session, $('span.state.label.monaco-count-badge.long'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(name));
        const stopActionViewItemDisposables = templateDisposable.add(new DisposableStore());
        const actionBar = templateDisposable.add(new ActionBar(session, {
            actionViewItemProvider: (action, options) => {
                if ((action.id === STOP_ID || action.id === DISCONNECT_ID) && action instanceof MenuItemAction) {
                    stopActionViewItemDisposables.clear();
                    const item = this.instantiationService.invokeFunction(accessor => createDisconnectMenuItemAction(action, stopActionViewItemDisposables, accessor, { ...options, menuAsChild: false }));
                    if (item) {
                        return item;
                    }
                }
                if (action instanceof MenuItemAction) {
                    return this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                }
                else if (action instanceof SubmenuItemAction) {
                    return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                }
                return undefined;
            }
        }));
        const elementDisposable = templateDisposable.add(new DisposableStore());
        return { session, name, stateLabel, label, actionBar, elementDisposable, templateDisposable };
    }
    renderElement(element, _, data) {
        this.doRenderElement(element.element, createMatches(element.filterData), data);
    }
    renderCompressedElements(node, _index, templateData) {
        const lastElement = node.element.elements[node.element.elements.length - 1];
        const matches = createMatches(node.filterData);
        this.doRenderElement(lastElement, matches, templateData);
    }
    doRenderElement(session, matches, data) {
        const sessionHover = data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.session, localize({ key: 'session', comment: ['Session is a noun'] }, "Session")));
        data.label.set(session.getLabel(), matches);
        const stoppedDetails = session.getStoppedDetails();
        const thread = session.getAllThreads().find(t => t.stopped);
        const contextKeyService = this.contextKeyService.createOverlay(getSessionContextOverlay(session));
        const menu = data.elementDisposable.add(this.menuService.createMenu(MenuId.DebugCallStackContext, contextKeyService));
        const setupActionBar = () => {
            data.actionBar.clear();
            const { primary } = getActionBarActions(menu.getActions({ arg: getContextForContributedActions(session), shouldForwardArgs: true }), 'inline');
            data.actionBar.push(primary, { icon: true, label: false });
            // We need to set our internal context on the action bar, since our commands depend on that one
            // While the external context our extensions rely on
            data.actionBar.context = getContext(session);
        };
        data.elementDisposable.add(menu.onDidChange(() => setupActionBar()));
        setupActionBar();
        data.stateLabel.style.display = '';
        if (stoppedDetails) {
            data.stateLabel.textContent = stoppedDescription(stoppedDetails);
            sessionHover.update(`${session.getLabel()}: ${stoppedText(stoppedDetails)}`);
            data.stateLabel.classList.toggle('exception', stoppedDetails.reason === 'exception');
        }
        else if (thread && thread.stoppedDetails) {
            data.stateLabel.textContent = stoppedDescription(thread.stoppedDetails);
            sessionHover.update(`${session.getLabel()}: ${stoppedText(thread.stoppedDetails)}`);
            data.stateLabel.classList.toggle('exception', thread.stoppedDetails.reason === 'exception');
        }
        else {
            data.stateLabel.textContent = localize({ key: 'running', comment: ['indicates state'] }, "Running");
            data.stateLabel.classList.remove('exception');
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    disposeElement(_element, _, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeCompressedElements(node, index, templateData, height) {
        templateData.elementDisposable.clear();
    }
};
SessionsRenderer = SessionsRenderer_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IHoverService),
    __param(3, IMenuService)
], SessionsRenderer);
function getThreadContextOverlay(thread) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'thread'],
        [CONTEXT_CALLSTACK_ITEM_STOPPED.key, thread.stopped]
    ];
}
let ThreadsRenderer = class ThreadsRenderer {
    static { ThreadsRenderer_1 = this; }
    static { this.ID = 'thread'; }
    constructor(contextKeyService, hoverService, menuService) {
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.menuService = menuService;
    }
    get templateId() {
        return ThreadsRenderer_1.ID;
    }
    renderTemplate(container) {
        const thread = dom.append(container, $('.thread'));
        const name = dom.append(thread, $('.name'));
        const stateLabel = dom.append(thread, $('span.state.label.monaco-count-badge.long'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(name));
        const actionBar = templateDisposable.add(new ActionBar(thread));
        const elementDisposable = templateDisposable.add(new DisposableStore());
        return { thread, name, stateLabel, label, actionBar, elementDisposable, templateDisposable };
    }
    renderElement(element, _index, data) {
        const thread = element.element;
        data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.thread, thread.name));
        data.label.set(thread.name, createMatches(element.filterData));
        data.stateLabel.textContent = thread.stateLabel;
        data.stateLabel.classList.toggle('exception', thread.stoppedDetails?.reason === 'exception');
        const contextKeyService = this.contextKeyService.createOverlay(getThreadContextOverlay(thread));
        const menu = data.elementDisposable.add(this.menuService.createMenu(MenuId.DebugCallStackContext, contextKeyService));
        const setupActionBar = () => {
            data.actionBar.clear();
            const { primary } = getActionBarActions(menu.getActions({ arg: getContextForContributedActions(thread), shouldForwardArgs: true }), 'inline');
            data.actionBar.push(primary, { icon: true, label: false });
            // We need to set our internal context on the action bar, since our commands depend on that one
            // While the external context our extensions rely on
            data.actionBar.context = getContext(thread);
        };
        data.elementDisposable.add(menu.onDidChange(() => setupActionBar()));
        setupActionBar();
    }
    renderCompressedElements(_node, _index, _templateData, _height) {
        throw new Error('Method not implemented.');
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
};
ThreadsRenderer = ThreadsRenderer_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IHoverService),
    __param(2, IMenuService)
], ThreadsRenderer);
function getStackFrameContextOverlay(stackFrame) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'stackFrame'],
        [CONTEXT_STACK_FRAME_SUPPORTS_RESTART.key, stackFrame.canRestart]
    ];
}
let StackFramesRenderer = class StackFramesRenderer {
    static { StackFramesRenderer_1 = this; }
    static { this.ID = 'stackFrame'; }
    constructor(hoverService, labelService, notificationService) {
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.notificationService = notificationService;
    }
    get templateId() {
        return StackFramesRenderer_1.ID;
    }
    renderTemplate(container) {
        const stackFrame = dom.append(container, $('.stack-frame'));
        const labelDiv = dom.append(stackFrame, $('span.label.expression'));
        const file = dom.append(stackFrame, $('.file'));
        const fileName = dom.append(file, $('span.file-name'));
        const wrapper = dom.append(file, $('span.line-number-wrapper'));
        const lineNumber = dom.append(wrapper, $('span.line-number.monaco-count-badge'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(labelDiv));
        const actionBar = templateDisposable.add(new ActionBar(stackFrame));
        return { file, fileName, label, lineNumber, stackFrame, actionBar, templateDisposable };
    }
    renderElement(element, index, data) {
        const stackFrame = element.element;
        data.stackFrame.classList.toggle('disabled', !stackFrame.source || !stackFrame.source.available || isFrameDeemphasized(stackFrame));
        data.stackFrame.classList.toggle('label', stackFrame.presentationHint === 'label');
        const hasActions = !!stackFrame.thread.session.capabilities.supportsRestartFrame && stackFrame.presentationHint !== 'label' && stackFrame.presentationHint !== 'subtle' && stackFrame.canRestart;
        data.stackFrame.classList.toggle('has-actions', hasActions);
        let title = stackFrame.source.inMemory ? stackFrame.source.uri.path : this.labelService.getUriLabel(stackFrame.source.uri);
        if (stackFrame.source.raw.origin) {
            title += `\n${stackFrame.source.raw.origin}`;
        }
        data.templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.file, title));
        data.label.set(stackFrame.name, createMatches(element.filterData), stackFrame.name);
        data.fileName.textContent = getSpecificSourceName(stackFrame);
        if (stackFrame.range.startLineNumber !== undefined) {
            data.lineNumber.textContent = `${stackFrame.range.startLineNumber}`;
            if (stackFrame.range.startColumn) {
                data.lineNumber.textContent += `:${stackFrame.range.startColumn}`;
            }
            data.lineNumber.classList.remove('unavailable');
        }
        else {
            data.lineNumber.classList.add('unavailable');
        }
        data.actionBar.clear();
        if (hasActions) {
            const action = new Action('debug.callStack.restartFrame', localize('restartFrame', "Restart Frame"), ThemeIcon.asClassName(icons.debugRestartFrame), true, async () => {
                try {
                    await stackFrame.restart();
                }
                catch (e) {
                    this.notificationService.error(e);
                }
            });
            data.actionBar.push(action, { icon: true, label: false });
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
StackFramesRenderer = StackFramesRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, ILabelService),
    __param(2, INotificationService)
], StackFramesRenderer);
let ErrorsRenderer = class ErrorsRenderer {
    static { ErrorsRenderer_1 = this; }
    static { this.ID = 'error'; }
    get templateId() {
        return ErrorsRenderer_1.ID;
    }
    constructor(hoverService) {
        this.hoverService = hoverService;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.error'));
        return { label, templateDisposable: new DisposableStore() };
    }
    renderElement(element, index, data) {
        const error = element.element;
        data.label.textContent = error;
        data.templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, error));
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
};
ErrorsRenderer = ErrorsRenderer_1 = __decorate([
    __param(0, IHoverService)
], ErrorsRenderer);
class LoadMoreRenderer {
    static { this.ID = 'loadMore'; }
    static { this.LABEL = localize('loadAllStackFrames', "Load More Stack Frames"); }
    constructor() { }
    get templateId() {
        return LoadMoreRenderer.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.load-all'));
        label.style.color = asCssVariable(textLinkForeground);
        return { label };
    }
    renderElement(element, index, data) {
        data.label.textContent = LoadMoreRenderer.LABEL;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
}
class ShowMoreRenderer {
    static { this.ID = 'showMore'; }
    constructor() { }
    get templateId() {
        return ShowMoreRenderer.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.show-more'));
        label.style.color = asCssVariable(textLinkForeground);
        return { label };
    }
    renderElement(element, index, data) {
        const stackFrames = element.element;
        if (stackFrames.every(sf => !!(sf.source && sf.source.origin && sf.source.origin === stackFrames[0].source.origin))) {
            data.label.textContent = localize('showMoreAndOrigin', "Show {0} More: {1}", stackFrames.length, stackFrames[0].source.origin);
        }
        else {
            data.label.textContent = localize('showMoreStackFrames', "Show {0} More Stack Frames", stackFrames.length);
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
}
class CallStackDelegate {
    getHeight(element) {
        if (element instanceof StackFrame && element.presentationHint === 'label') {
            return 16;
        }
        if (element instanceof ThreadAndSessionIds || element instanceof Array) {
            return 16;
        }
        return 22;
    }
    getTemplateId(element) {
        if (isDebugSession(element)) {
            return SessionsRenderer.ID;
        }
        if (element instanceof Thread) {
            return ThreadsRenderer.ID;
        }
        if (element instanceof StackFrame) {
            return StackFramesRenderer.ID;
        }
        if (typeof element === 'string') {
            return ErrorsRenderer.ID;
        }
        if (element instanceof ThreadAndSessionIds) {
            return LoadMoreRenderer.ID;
        }
        // element instanceof Array
        return ShowMoreRenderer.ID;
    }
}
function stoppedText(stoppedDetails) {
    return stoppedDetails.text ?? stoppedDescription(stoppedDetails);
}
function stoppedDescription(stoppedDetails) {
    return stoppedDetails.description ||
        (stoppedDetails.reason ? localize({ key: 'pausedOn', comment: ['indicates reason for program being paused'] }, "Paused on {0}", stoppedDetails.reason) : localize('paused', "Paused"));
}
function isDebugModel(obj) {
    return typeof obj.getSessions === 'function';
}
function isDebugSession(obj) {
    return obj && typeof obj.getAllThreads === 'function';
}
class CallStackDataSource {
    constructor(debugService) {
        this.debugService = debugService;
        this.deemphasizedStackFramesToShow = [];
    }
    hasChildren(element) {
        if (isDebugSession(element)) {
            const threads = element.getAllThreads();
            return (threads.length > 1) || (threads.length === 1 && threads[0].stopped) || !!(this.debugService.getModel().getSessions().find(s => s.parentSession === element));
        }
        return isDebugModel(element) || (element instanceof Thread && element.stopped);
    }
    async getChildren(element) {
        if (isDebugModel(element)) {
            const sessions = element.getSessions();
            if (sessions.length === 0) {
                return Promise.resolve([]);
            }
            if (sessions.length > 1 || this.debugService.getViewModel().isMultiSessionView()) {
                return Promise.resolve(sessions.filter(s => !s.parentSession));
            }
            const threads = sessions[0].getAllThreads();
            // Only show the threads in the call stack if there is more than 1 thread.
            return threads.length === 1 ? this.getThreadChildren(threads[0]) : Promise.resolve(threads);
        }
        else if (isDebugSession(element)) {
            const childSessions = this.debugService.getModel().getSessions().filter(s => s.parentSession === element);
            const threads = element.getAllThreads();
            if (threads.length === 1) {
                // Do not show thread when there is only one to be compact.
                const children = await this.getThreadChildren(threads[0]);
                return children.concat(childSessions);
            }
            return Promise.resolve(threads.concat(childSessions));
        }
        else {
            return this.getThreadChildren(element);
        }
    }
    getThreadChildren(thread) {
        return this.getThreadCallstack(thread).then(children => {
            // Check if some stack frames should be hidden under a parent element since they are deemphasized
            const result = [];
            children.forEach((child, index) => {
                if (child instanceof StackFrame && child.source && isFrameDeemphasized(child)) {
                    // Check if the user clicked to show the deemphasized source
                    if (this.deemphasizedStackFramesToShow.indexOf(child) === -1) {
                        if (result.length) {
                            const last = result[result.length - 1];
                            if (last instanceof Array) {
                                // Collect all the stackframes that will be "collapsed"
                                last.push(child);
                                return;
                            }
                        }
                        const nextChild = index < children.length - 1 ? children[index + 1] : undefined;
                        if (nextChild instanceof StackFrame && nextChild.source && isFrameDeemphasized(nextChild)) {
                            // Start collecting stackframes that will be "collapsed"
                            result.push([child]);
                            return;
                        }
                    }
                }
                result.push(child);
            });
            return result;
        });
    }
    async getThreadCallstack(thread) {
        let callStack = thread.getCallStack();
        if (!callStack || !callStack.length) {
            await thread.fetchCallStack();
            callStack = thread.getCallStack();
        }
        if (callStack.length === 1 && thread.session.capabilities.supportsDelayedStackTraceLoading && thread.stoppedDetails && thread.stoppedDetails.totalFrames && thread.stoppedDetails.totalFrames > 1) {
            // To reduce flashing of the call stack view simply append the stale call stack
            // once we have the correct data the tree will refresh and we will no longer display it.
            callStack = callStack.concat(thread.getStaleCallStack().slice(1));
        }
        if (thread.stoppedDetails && thread.stoppedDetails.framesErrorMessage) {
            callStack = callStack.concat([thread.stoppedDetails.framesErrorMessage]);
        }
        if (!thread.reachedEndOfCallStack && thread.stoppedDetails) {
            callStack = callStack.concat([new ThreadAndSessionIds(thread.session.getId(), thread.threadId)]);
        }
        return callStack;
    }
}
class CallStackAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize({ comment: ['Debug is a noun in this context, not a verb.'], key: 'callStackAriaLabel' }, "Debug Call Stack");
    }
    getWidgetRole() {
        // Use treegrid as a role since each element can have additional actions inside #146210
        return 'treegrid';
    }
    getRole(_element) {
        return 'row';
    }
    getAriaLabel(element) {
        if (element instanceof Thread) {
            return localize({ key: 'threadAriaLabel', comment: ['Placeholders stand for the thread name and the thread state.For example "Thread 1" and "Stopped'] }, "Thread {0} {1}", element.name, element.stateLabel);
        }
        if (element instanceof StackFrame) {
            return localize('stackFrameAriaLabel', "Stack Frame {0}, line {1}, {2}", element.name, element.range.startLineNumber, getSpecificSourceName(element));
        }
        if (isDebugSession(element)) {
            const thread = element.getAllThreads().find(t => t.stopped);
            const state = thread ? thread.stateLabel : localize({ key: 'running', comment: ['indicates state'] }, "Running");
            return localize({ key: 'sessionLabel', comment: ['Placeholders stand for the session name and the session state. For example "Launch Program" and "Running"'] }, "Session {0} {1}", element.getLabel(), state);
        }
        if (typeof element === 'string') {
            return element;
        }
        if (element instanceof Array) {
            return localize('showMoreStackFrames', "Show {0} More Stack Frames", element.length);
        }
        // element instanceof ThreadAndSessionIds
        return LoadMoreRenderer.LABEL;
    }
}
class CallStackCompressionDelegate {
    constructor(debugService) {
        this.debugService = debugService;
    }
    isIncompressible(stat) {
        if (isDebugSession(stat)) {
            if (stat.compact) {
                return false;
            }
            const sessions = this.debugService.getModel().getSessions();
            if (sessions.some(s => s.parentSession === stat && s.compact)) {
                return false;
            }
            return true;
        }
        return true;
    }
}
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            id: 'callStack.collapse',
            viewId: CALLSTACK_VIEW_ID,
            title: localize('collapse', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            precondition: CONTEXT_DEBUG_STATE.isEqualTo(getStateLabel(2 /* State.Stopped */)),
            menu: {
                id: MenuId.ViewTitle,
                order: 10,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', CALLSTACK_VIEW_ID)
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
function registerCallStackInlineMenuItem(id, title, icon, when, order, precondition) {
    MenuRegistry.appendMenuItem(MenuId.DebugCallStackContext, {
        group: 'inline',
        order,
        when,
        command: { id, title, icon, precondition }
    });
}
const threadOrSessionWithOneThread = ContextKeyExpr.or(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD));
registerCallStackInlineMenuItem(PAUSE_ID, PAUSE_LABEL, icons.debugPause, ContextKeyExpr.and(threadOrSessionWithOneThread, CONTEXT_CALLSTACK_ITEM_STOPPED.toNegated()), 10, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated());
registerCallStackInlineMenuItem(CONTINUE_ID, CONTINUE_LABEL, icons.debugContinue, ContextKeyExpr.and(threadOrSessionWithOneThread, CONTEXT_CALLSTACK_ITEM_STOPPED), 10);
registerCallStackInlineMenuItem(STEP_OVER_ID, STEP_OVER_LABEL, icons.debugStepOver, threadOrSessionWithOneThread, 20, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(STEP_INTO_ID, STEP_INTO_LABEL, icons.debugStepInto, threadOrSessionWithOneThread, 30, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(STEP_OUT_ID, STEP_OUT_LABEL, icons.debugStepOut, threadOrSessionWithOneThread, 40, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(RESTART_SESSION_ID, RESTART_LABEL, icons.debugRestart, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), 50);
registerCallStackInlineMenuItem(STOP_ID, STOP_LABEL, icons.debugStop, ContextKeyExpr.and(CONTEXT_CALLSTACK_SESSION_IS_ATTACH.toNegated(), CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session')), 60);
registerCallStackInlineMenuItem(DISCONNECT_ID, DISCONNECT_LABEL, icons.debugDisconnect, ContextKeyExpr.and(CONTEXT_CALLSTACK_SESSION_IS_ATTACH, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session')), 60);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvY2FsbFN0YWNrVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFPcEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBc0IsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDbEwsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxlQUFl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