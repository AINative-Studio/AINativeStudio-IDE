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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2NhbGxTdGFja1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBT3BHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQXNCLE1BQU0sb0NBQW9DLENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ2xMLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsZUFB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