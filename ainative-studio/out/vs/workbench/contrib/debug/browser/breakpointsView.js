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
var BreakpointsRenderer_1, FunctionBreakpointsRenderer_1, DataBreakpointsRenderer_1, InstructionBreakpointsRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { Gesture } from '../../../../base/browser/touch.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Action } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../nls.js';
import { getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { BREAKPOINTS_VIEW_ID, BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_HAS_MODES, CONTEXT_BREAKPOINT_INPUT_FOCUSED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES, CONTEXT_BREAKPOINT_ITEM_TYPE, CONTEXT_BREAKPOINT_SUPPORTS_CONDITION, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_IN_DEBUG_MODE, CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, DEBUG_SCHEME, DebuggerString, IDebugService } from '../common/debug.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, FunctionBreakpoint, InstructionBreakpoint } from '../common/debugModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import * as icons from './debugIcons.js';
const $ = dom.$;
function createCheckbox(disposables) {
    const checkbox = $('input');
    checkbox.type = 'checkbox';
    checkbox.tabIndex = -1;
    disposables.add(Gesture.ignoreTarget(checkbox));
    return checkbox;
}
const MAX_VISIBLE_BREAKPOINTS = 9;
export function getExpandedBodySize(model, sessionId, countLimit) {
    const length = model.getBreakpoints().length + model.getExceptionBreakpointsForSession(sessionId).length + model.getFunctionBreakpoints().length + model.getDataBreakpoints().length + model.getInstructionBreakpoints().length;
    return Math.min(countLimit, length) * 22;
}
function getModeKindForBreakpoint(breakpoint) {
    const kind = breakpoint instanceof Breakpoint ? 'source' : breakpoint instanceof InstructionBreakpoint ? 'instruction' : 'exception';
    return kind;
}
let BreakpointsView = class BreakpointsView extends ViewPane {
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, themeService, editorService, contextViewService, configurationService, viewDescriptorService, contextKeyService, openerService, labelService, menuService, hoverService, languageService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.contextViewService = contextViewService;
        this.labelService = labelService;
        this.languageService = languageService;
        this.needsRefresh = false;
        this.needsStateChange = false;
        this.ignoreLayout = false;
        this.autoFocusedIndex = -1;
        this.menu = menuService.createMenu(MenuId.DebugBreakpointsContext, contextKeyService);
        this._register(this.menu);
        this.breakpointItemType = CONTEXT_BREAKPOINT_ITEM_TYPE.bindTo(contextKeyService);
        this.breakpointIsDataBytes = CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES.bindTo(contextKeyService);
        this.breakpointHasMultipleModes = CONTEXT_BREAKPOINT_HAS_MODES.bindTo(contextKeyService);
        this.breakpointSupportsCondition = CONTEXT_BREAKPOINT_SUPPORTS_CONDITION.bindTo(contextKeyService);
        this.breakpointInputFocused = CONTEXT_BREAKPOINT_INPUT_FOCUSED.bindTo(contextKeyService);
        this._register(this.debugService.getModel().onDidChangeBreakpoints(() => this.onBreakpointsChange()));
        this._register(this.debugService.getViewModel().onDidFocusSession(() => this.onBreakpointsChange()));
        this._register(this.debugService.onDidChangeState(() => this.onStateChange()));
        this.hintDelayer = this._register(new RunOnceScheduler(() => this.updateBreakpointsHint(true), 4000));
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-breakpoints');
        const delegate = new BreakpointsDelegate(this);
        this.list = this.instantiationService.createInstance(WorkbenchList, 'Breakpoints', container, delegate, [
            this.instantiationService.createInstance(BreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType),
            new ExceptionBreakpointsRenderer(this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.debugService, this.hoverService),
            new ExceptionBreakpointInputRenderer(this, this.debugService, this.contextViewService),
            this.instantiationService.createInstance(FunctionBreakpointsRenderer, this.menu, this.breakpointSupportsCondition, this.breakpointItemType),
            new FunctionBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(DataBreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.breakpointIsDataBytes),
            new DataBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(InstructionBreakpointsRenderer),
        ], {
            identityProvider: { getId: (element) => element.getId() },
            multipleSelectionSupport: false,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e },
            accessibilityProvider: new BreakpointsAccessibilityProvider(this.debugService, this.labelService),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        CONTEXT_BREAKPOINTS_FOCUSED.bindTo(this.list.contextKeyService);
        this._register(this.list.onContextMenu(this.onListContextMenu, this));
        this._register(this.list.onMouseMiddleClick(async ({ element }) => {
            if (element instanceof Breakpoint) {
                await this.debugService.removeBreakpoints(element.getId());
            }
            else if (element instanceof FunctionBreakpoint) {
                await this.debugService.removeFunctionBreakpoints(element.getId());
            }
            else if (element instanceof DataBreakpoint) {
                await this.debugService.removeDataBreakpoints(element.getId());
            }
            else if (element instanceof InstructionBreakpoint) {
                await this.debugService.removeInstructionBreakpoints(element.instructionReference, element.offset);
            }
        }));
        this._register(this.list.onDidOpen(async (e) => {
            if (!e.element) {
                return;
            }
            if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.button === 1) { // middle click
                return;
            }
            if (e.element instanceof Breakpoint) {
                openBreakpointSource(e.element, e.sideBySide, e.editorOptions.preserveFocus || false, e.editorOptions.pinned || !e.editorOptions.preserveFocus, this.debugService, this.editorService);
            }
            if (e.element instanceof InstructionBreakpoint) {
                const disassemblyView = await this.editorService.openEditor(DisassemblyViewInput.instance);
                // Focus on double click
                disassemblyView.goToInstructionAndOffset(e.element.instructionReference, e.element.offset, dom.isMouseEvent(e.browserEvent) && e.browserEvent.detail === 2);
            }
            if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.detail === 2 && e.element instanceof FunctionBreakpoint && e.element !== this.inputBoxData?.breakpoint) {
                // double click
                this.renderInputBox({ breakpoint: e.element, type: 'name' });
            }
        }));
        this.list.splice(0, this.list.length, this.elements);
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible) {
                if (this.needsRefresh) {
                    this.onBreakpointsChange();
                }
                if (this.needsStateChange) {
                    this.onStateChange();
                }
            }
        }));
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        this._register(containerModel.onDidChangeAllViewDescriptors(() => {
            this.updateSize();
        }));
    }
    renderHeaderTitle(container, title) {
        super.renderHeaderTitle(container, title);
        const iconLabelContainer = dom.append(container, $('span.breakpoint-warning'));
        this.hintContainer = this._register(new IconLabel(iconLabelContainer, {
            supportIcons: true, hoverDelegate: {
                showHover: (options, focus) => this.hoverService.showInstantHover({ content: options.content, target: this.hintContainer.element }, focus),
                delay: this.configurationService.getValue('workbench.hover.delay')
            }
        }));
        dom.hide(this.hintContainer.element);
    }
    focus() {
        super.focus();
        this.list?.domFocus();
    }
    renderInputBox(data) {
        this._inputBoxData = data;
        this.onBreakpointsChange();
        this._inputBoxData = undefined;
    }
    get inputBoxData() {
        return this._inputBoxData;
    }
    layoutBody(height, width) {
        if (this.ignoreLayout) {
            return;
        }
        super.layoutBody(height, width);
        this.list?.layout(height, width);
        try {
            this.ignoreLayout = true;
            this.updateSize();
        }
        finally {
            this.ignoreLayout = false;
        }
    }
    onListContextMenu(e) {
        const element = e.element;
        const type = element instanceof Breakpoint ? 'breakpoint' : element instanceof ExceptionBreakpoint ? 'exceptionBreakpoint' :
            element instanceof FunctionBreakpoint ? 'functionBreakpoint' : element instanceof DataBreakpoint ? 'dataBreakpoint' :
                element instanceof InstructionBreakpoint ? 'instructionBreakpoint' : undefined;
        this.breakpointItemType.set(type);
        const session = this.debugService.getViewModel().focusedSession;
        const conditionSupported = element instanceof ExceptionBreakpoint ? element.supportsCondition : (!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointSupportsCondition.set(conditionSupported);
        this.breakpointIsDataBytes.set(element instanceof DataBreakpoint && element.src.type === 1 /* DataBreakpointSetType.Address */);
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes(getModeKindForBreakpoint(element)).length > 1);
        const { secondary } = getContextMenuActions(this.menu.getActions({ arg: e.element, shouldForwardArgs: false }), 'inline');
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => secondary,
            getActionsContext: () => element
        });
    }
    updateSize() {
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        // Adjust expanded body size
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        this.minimumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ ? getExpandedBodySize(this.debugService.getModel(), sessionId, MAX_VISIBLE_BREAKPOINTS) : 170;
        this.maximumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ && containerModel.visibleViewDescriptors.length > 1 ? getExpandedBodySize(this.debugService.getModel(), sessionId, Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    }
    updateBreakpointsHint(delayed = false) {
        if (!this.hintContainer) {
            return;
        }
        const currentType = this.debugService.getViewModel().focusedSession?.configuration.type;
        const dbg = currentType ? this.debugService.getAdapterManager().getDebugger(currentType) : undefined;
        const message = dbg?.strings?.[DebuggerString.UnverifiedBreakpoints];
        const debuggerHasUnverifiedBps = message && this.debugService.getModel().getBreakpoints().filter(bp => {
            if (bp.verified || !bp.enabled) {
                return false;
            }
            const langId = this.languageService.guessLanguageIdByFilepathOrFirstLine(bp.uri);
            return langId && dbg.interestedInLanguage(langId);
        });
        if (message && debuggerHasUnverifiedBps?.length && this.debugService.getModel().areBreakpointsActivated()) {
            if (delayed) {
                const mdown = new MarkdownString(undefined, { isTrusted: true }).appendMarkdown(message);
                this.hintContainer.setLabel('$(warning)', undefined, { title: { markdown: mdown, markdownNotSupportedFallback: message } });
                dom.show(this.hintContainer.element);
            }
            else {
                this.hintDelayer.schedule();
            }
        }
        else {
            dom.hide(this.hintContainer.element);
        }
    }
    onBreakpointsChange() {
        if (this.isBodyVisible()) {
            this.updateSize();
            if (this.list) {
                const lastFocusIndex = this.list.getFocus()[0];
                // Check whether focused element was removed
                const needsRefocus = lastFocusIndex && !this.elements.includes(this.list.element(lastFocusIndex));
                this.list.splice(0, this.list.length, this.elements);
                this.needsRefresh = false;
                if (needsRefocus) {
                    this.list.focusNth(Math.min(lastFocusIndex, this.list.length - 1));
                }
            }
            this.updateBreakpointsHint();
        }
        else {
            this.needsRefresh = true;
        }
    }
    onStateChange() {
        if (this.isBodyVisible()) {
            this.needsStateChange = false;
            const thread = this.debugService.getViewModel().focusedThread;
            let found = false;
            if (thread && thread.stoppedDetails && thread.stoppedDetails.hitBreakpointIds && thread.stoppedDetails.hitBreakpointIds.length > 0) {
                const hitBreakpointIds = thread.stoppedDetails.hitBreakpointIds;
                const elements = this.elements;
                const index = elements.findIndex(e => {
                    const id = e.getIdFromAdapter(thread.session.getId());
                    return typeof id === 'number' && hitBreakpointIds.indexOf(id) !== -1;
                });
                if (index >= 0) {
                    this.list.setFocus([index]);
                    this.list.setSelection([index]);
                    found = true;
                    this.autoFocusedIndex = index;
                }
            }
            if (!found) {
                // Deselect breakpoint in breakpoint view when no longer stopped on it #125528
                const focus = this.list.getFocus();
                const selection = this.list.getSelection();
                if (this.autoFocusedIndex >= 0 && equals(focus, selection) && focus.indexOf(this.autoFocusedIndex) >= 0) {
                    this.list.setFocus([]);
                    this.list.setSelection([]);
                }
                this.autoFocusedIndex = -1;
            }
            this.updateBreakpointsHint();
        }
        else {
            this.needsStateChange = true;
        }
    }
    get elements() {
        const model = this.debugService.getModel();
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        const elements = model.getExceptionBreakpointsForSession(sessionId).concat(model.getFunctionBreakpoints()).concat(model.getDataBreakpoints()).concat(model.getBreakpoints()).concat(model.getInstructionBreakpoints());
        return elements;
    }
};
BreakpointsView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IEditorService),
    __param(7, IContextViewService),
    __param(8, IConfigurationService),
    __param(9, IViewDescriptorService),
    __param(10, IContextKeyService),
    __param(11, IOpenerService),
    __param(12, ILabelService),
    __param(13, IMenuService),
    __param(14, IHoverService),
    __param(15, ILanguageService)
], BreakpointsView);
export { BreakpointsView };
class BreakpointsDelegate {
    constructor(view) {
        this.view = view;
        // noop
    }
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof Breakpoint) {
            return BreakpointsRenderer.ID;
        }
        if (element instanceof FunctionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (!element.name || (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId())) {
                return FunctionBreakpointInputRenderer.ID;
            }
            return FunctionBreakpointsRenderer.ID;
        }
        if (element instanceof ExceptionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return ExceptionBreakpointInputRenderer.ID;
            }
            return ExceptionBreakpointsRenderer.ID;
        }
        if (element instanceof DataBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return DataBreakpointInputRenderer.ID;
            }
            return DataBreakpointsRenderer.ID;
        }
        if (element instanceof InstructionBreakpoint) {
            return InstructionBreakpointsRenderer.ID;
        }
        return '';
    }
}
const breakpointIdToActionBarDomeNode = new Map();
let BreakpointsRenderer = class BreakpointsRenderer {
    static { BreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'breakpoints'; }
    get templateId() {
        return BreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.filePath = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(breakpoint, index, data) {
        data.context = breakpoint;
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        data.name.textContent = resources.basenameOrAuthority(breakpoint.uri);
        let badgeContent = breakpoint.lineNumber.toString();
        if (breakpoint.column) {
            badgeContent += `:${breakpoint.column}`;
        }
        if (breakpoint.modeLabel) {
            badgeContent = `${breakpoint.modeLabel}: ${badgeContent}`;
        }
        data.badge.textContent = badgeContent;
        data.filePath.textContent = this.labelService.getUriLabel(resources.dirname(breakpoint.uri), { relative: true });
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        const session = this.debugService.getViewModel().focusedSession;
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('breakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('source').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: breakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(breakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(a, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
BreakpointsRenderer = BreakpointsRenderer_1 = __decorate([
    __param(4, IDebugService),
    __param(5, IHoverService),
    __param(6, ILabelService)
], BreakpointsRenderer);
class ExceptionBreakpointsRenderer {
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        // noop
    }
    static { this.ID = 'exceptionbreakpoints'; }
    get templateId() {
        return ExceptionBreakpointsRenderer.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.breakpoint.classList.add('exception');
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(exceptionBreakpoint, index, data) {
        data.context = exceptionBreakpoint;
        data.name.textContent = exceptionBreakpoint.label || `${exceptionBreakpoint.filter} exceptions`;
        const exceptionBreakpointtitle = exceptionBreakpoint.verified ? (exceptionBreakpoint.description || data.name.textContent) : exceptionBreakpoint.message || localize('unverifiedExceptionBreakpoint', "Unverified Exception Breakpoint");
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, exceptionBreakpointtitle));
        data.breakpoint.classList.toggle('disabled', !exceptionBreakpoint.verified);
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.condition.textContent = exceptionBreakpoint.condition || '';
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.condition, localize('expressionCondition', "Expression condition: {0}", exceptionBreakpoint.condition)));
        if (exceptionBreakpoint.modeLabel) {
            data.badge.textContent = exceptionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        this.breakpointSupportsCondition.set(exceptionBreakpoint.supportsCondition);
        this.breakpointItemType.set('exceptionBreakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('exception').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: exceptionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(exceptionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
let FunctionBreakpointsRenderer = class FunctionBreakpointsRenderer {
    static { FunctionBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'functionbreakpoints'; }
    get templateId() {
        return FunctionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(functionBreakpoint, _index, data) {
        data.context = functionBreakpoint;
        data.name.textContent = functionBreakpoint.name;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (functionBreakpoint.condition && functionBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', "Condition: {0} | Hit Count: {1}", functionBreakpoint.condition, functionBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent = functionBreakpoint.condition || functionBreakpoint.hitCondition || '';
        }
        if (functionBreakpoint.modeLabel) {
            data.badge.textContent = functionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark function breakpoints as disabled if deactivated or if debug type does not support them #9099
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsFunctionBreakpoints) || !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsFunctionBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('functionBreakpointsNotSupported', "Function breakpoints are not supported by this debug type")));
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('functionBreakpoint');
        const { primary } = getActionBarActions(this.menu.getActions({ arg: functionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(functionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
FunctionBreakpointsRenderer = FunctionBreakpointsRenderer_1 = __decorate([
    __param(3, IDebugService),
    __param(4, IHoverService),
    __param(5, ILabelService)
], FunctionBreakpointsRenderer);
let DataBreakpointsRenderer = class DataBreakpointsRenderer {
    static { DataBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, breakpointIsDataBytes, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.breakpointIsDataBytes = breakpointIsDataBytes;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'databreakpoints'; }
    get templateId() {
        return DataBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.accessType = dom.append(data.breakpoint, $('span.access-type'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(dataBreakpoint, _index, data) {
        data.context = dataBreakpoint;
        data.name.textContent = dataBreakpoint.description;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (dataBreakpoint.modeLabel) {
            data.badge.textContent = dataBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark data breakpoints as disabled if deactivated or if debug type does not support them
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsDataBreakpoints) || !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsDataBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('dataBreakpointsNotSupported', "Data breakpoints are not supported by this debug type")));
        }
        if (dataBreakpoint.accessType) {
            const accessType = dataBreakpoint.accessType === 'read' ? localize('read', "Read") : dataBreakpoint.accessType === 'write' ? localize('write', "Write") : localize('access', "Access");
            data.accessType.textContent = accessType;
        }
        else {
            data.accessType.textContent = '';
        }
        if (dataBreakpoint.condition && dataBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', "Condition: {0} | Hit Count: {1}", dataBreakpoint.condition, dataBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent = dataBreakpoint.condition || dataBreakpoint.hitCondition || '';
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('data').length > 1);
        this.breakpointItemType.set('dataBreakpoint');
        this.breakpointIsDataBytes.set(dataBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: dataBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(dataBreakpoint.getId(), data.actionBar.domNode);
        this.breakpointIsDataBytes.reset();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
DataBreakpointsRenderer = DataBreakpointsRenderer_1 = __decorate([
    __param(5, IDebugService),
    __param(6, IHoverService),
    __param(7, ILabelService)
], DataBreakpointsRenderer);
let InstructionBreakpointsRenderer = class InstructionBreakpointsRenderer {
    static { InstructionBreakpointsRenderer_1 = this; }
    constructor(debugService, hoverService, labelService) {
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'instructionBreakpoints'; }
    get templateId() {
        return InstructionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.address = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(breakpoint, index, data) {
        data.context = breakpoint;
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        data.name.textContent = '0x' + breakpoint.address.toString(16);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.name, `Decimal address: breakpoint.address.toString()`));
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        if (breakpoint.modeLabel) {
            data.badge.textContent = breakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
InstructionBreakpointsRenderer = InstructionBreakpointsRenderer_1 = __decorate([
    __param(0, IDebugService),
    __param(1, IHoverService),
    __param(2, ILabelService)
], InstructionBreakpointsRenderer);
class FunctionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'functionbreakpointinput'; }
    get templateId() {
        return FunctionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, { inputBoxStyles: defaultInputBoxStyles });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'name') {
                        this.debugService.updateFunctionBreakpoint(id, { name: inputBox.value });
                    }
                    if (template.type === 'condition') {
                        this.debugService.updateFunctionBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateFunctionBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    if (template.type === 'name' && !template.breakpoint.name) {
                        this.debugService.removeFunctionBreakpoints(id);
                    }
                    else {
                        this.view.renderInputBox(undefined);
                    }
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(functionBreakpoint, _index, data) {
        data.breakpoint = functionBreakpoint;
        data.type = this.view.inputBoxData?.type || 'name'; // If there is no type set take the 'name' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = functionBreakpoint.name || '';
        let placeholder = localize('functionBreakpointPlaceholder', "Function to break on");
        let ariaLabel = localize('functionBreakPointInputAriaLabel', "Type function breakpoint.");
        if (data.type === 'condition') {
            data.inputBox.value = functionBreakpoint.condition || '';
            placeholder = localize('functionBreakpointExpressionPlaceholder', "Break when expression evaluates to true");
            ariaLabel = localize('functionBreakPointExpresionAriaLabel', "Type expression. Function breakpoint will break when expression evaluates to true");
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = functionBreakpoint.hitCondition || '';
            placeholder = localize('functionBreakpointHitCountPlaceholder', "Break when hit count is met");
            ariaLabel = localize('functionBreakPointHitCountAriaLabel', "Type hit count. Function breakpoint will break when hit count is met.");
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class DataBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'databreakpointinput'; }
    get templateId() {
        return DataBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, { inputBoxStyles: defaultInputBoxStyles });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'condition') {
                        this.debugService.updateDataBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateDataBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    this.view.renderInputBox(undefined);
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(dataBreakpoint, _index, data) {
        data.breakpoint = dataBreakpoint;
        data.type = this.view.inputBoxData?.type || 'condition'; // If there is no type set take the 'condition' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ?? ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = '';
        let placeholder = '';
        let ariaLabel = '';
        if (data.type === 'condition') {
            data.inputBox.value = dataBreakpoint.condition || '';
            placeholder = localize('dataBreakpointExpressionPlaceholder', "Break when expression evaluates to true");
            ariaLabel = localize('dataBreakPointExpresionAriaLabel', "Type expression. Data breakpoint will break when expression evaluates to true");
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = dataBreakpoint.hitCondition || '';
            placeholder = localize('dataBreakpointHitCountPlaceholder', "Break when hit count is met");
            ariaLabel = localize('dataBreakPointHitCountAriaLabel', "Type hit count. Data breakpoint will break when hit count is met.");
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class ExceptionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        // noop
    }
    static { this.ID = 'exceptionbreakpointinput'; }
    get templateId() {
        return ExceptionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        breakpoint.classList.add('exception');
        const checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            ariaLabel: localize('exceptionBreakpointAriaLabel', "Type exception breakpoint condition"),
            inputBoxStyles: defaultInputBoxStyles
        });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            if (!templateData.currentBreakpoint) {
                return;
            }
            this.view.breakpointInputFocused.set(false);
            let newCondition = templateData.currentBreakpoint.condition;
            if (success) {
                newCondition = inputBox.value !== '' ? inputBox.value : undefined;
            }
            this.debugService.setExceptionBreakpointCondition(templateData.currentBreakpoint, newCondition);
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            // Need to react with a timeout on the blur event due to possible concurent splices #56443
            setTimeout(() => {
                wrapUp(true);
            });
        }));
        const elementDisposables = new DisposableStore();
        toDispose.add(elementDisposables);
        const templateData = {
            inputBox,
            checkbox,
            templateDisposables: toDispose,
            elementDisposables: new DisposableStore(),
        };
        return templateData;
    }
    renderElement(exceptionBreakpoint, _index, data) {
        const placeHolder = exceptionBreakpoint.conditionDescription || localize('exceptionBreakpointPlaceholder', "Break when expression evaluates to true");
        data.inputBox.setPlaceHolder(placeHolder);
        data.currentBreakpoint = exceptionBreakpoint;
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = exceptionBreakpoint.condition || '';
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class BreakpointsAccessibilityProvider {
    constructor(debugService, labelService) {
        this.debugService = debugService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('breakpoints', "Breakpoints");
    }
    getRole() {
        return 'checkbox';
    }
    isChecked(breakpoint) {
        return breakpoint.enabled;
    }
    getAriaLabel(element) {
        if (element instanceof ExceptionBreakpoint) {
            return element.toString();
        }
        const { message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), element, this.labelService, this.debugService.getModel());
        const toString = element.toString();
        return message ? `${toString}, ${message}` : toString;
    }
}
export function openBreakpointSource(breakpoint, sideBySide, preserveFocus, pinned, debugService, editorService) {
    if (breakpoint.uri.scheme === DEBUG_SCHEME && debugService.state === 0 /* State.Inactive */) {
        return Promise.resolve(undefined);
    }
    const selection = breakpoint.endLineNumber ? {
        startLineNumber: breakpoint.lineNumber,
        endLineNumber: breakpoint.endLineNumber,
        startColumn: breakpoint.column || 1,
        endColumn: breakpoint.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
    } : {
        startLineNumber: breakpoint.lineNumber,
        startColumn: breakpoint.column || 1,
        endLineNumber: breakpoint.lineNumber,
        endColumn: breakpoint.column || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
    };
    return editorService.openEditor({
        resource: breakpoint.uri,
        options: {
            preserveFocus,
            selection,
            revealIfOpened: true,
            selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            pinned
        }
    }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
}
export function getBreakpointMessageAndIcon(state, breakpointsActivated, breakpoint, labelService, debugModel) {
    const debugActive = state === 3 /* State.Running */ || state === 2 /* State.Stopped */;
    const breakpointIcon = breakpoint instanceof DataBreakpoint ? icons.dataBreakpoint : breakpoint instanceof FunctionBreakpoint ? icons.functionBreakpoint : breakpoint.logMessage ? icons.logBreakpoint : icons.breakpoint;
    if (!breakpoint.enabled || !breakpointsActivated) {
        return {
            icon: breakpointIcon.disabled,
            message: breakpoint.logMessage ? localize('disabledLogpoint', "Disabled Logpoint") : localize('disabledBreakpoint', "Disabled Breakpoint"),
        };
    }
    const appendMessage = (text) => {
        return ('message' in breakpoint && breakpoint.message) ? text.concat(', ' + breakpoint.message) : text;
    };
    if (debugActive && breakpoint instanceof Breakpoint && breakpoint.pending) {
        return {
            icon: icons.breakpoint.pending
        };
    }
    if (debugActive && !breakpoint.verified) {
        return {
            icon: breakpointIcon.unverified,
            message: ('message' in breakpoint && breakpoint.message) ? breakpoint.message : (breakpoint.logMessage ? localize('unverifiedLogpoint', "Unverified Logpoint") : localize('unverifiedBreakpoint', "Unverified Breakpoint")),
            showAdapterUnverifiedMessage: true
        };
    }
    if (breakpoint instanceof DataBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('dataBreakpointUnsupported', "Data breakpoints not supported by this debug type"),
            };
        }
        return {
            icon: breakpointIcon.regular,
            message: breakpoint.message || localize('dataBreakpoint', "Data Breakpoint")
        };
    }
    if (breakpoint instanceof FunctionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('functionBreakpointUnsupported', "Function breakpoints not supported by this debug type"),
            };
        }
        const messages = [];
        messages.push(breakpoint.message || localize('functionBreakpoint', "Function Breakpoint"));
        if (breakpoint.condition) {
            messages.push(localize('expression', "Condition: {0}", breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n'))
        };
    }
    if (breakpoint instanceof InstructionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('instructionBreakpointUnsupported', "Instruction breakpoints not supported by this debug type"),
            };
        }
        const messages = [];
        if (breakpoint.message) {
            messages.push(breakpoint.message);
        }
        else if (breakpoint.instructionReference) {
            messages.push(localize('instructionBreakpointAtAddress', "Instruction breakpoint at address {0}", breakpoint.instructionReference));
        }
        else {
            messages.push(localize('instructionBreakpoint', "Instruction breakpoint"));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n'))
        };
    }
    // can change this when all breakpoint supports dependent breakpoint condition
    let triggeringBreakpoint;
    if (breakpoint instanceof Breakpoint && breakpoint.triggeredBy) {
        triggeringBreakpoint = debugModel.getBreakpoints().find(bp => bp.getId() === breakpoint.triggeredBy);
    }
    if (breakpoint.logMessage || breakpoint.condition || breakpoint.hitCondition || triggeringBreakpoint) {
        const messages = [];
        let icon = breakpoint.logMessage ? icons.logBreakpoint.regular : icons.conditionalBreakpoint.regular;
        if (!breakpoint.supported) {
            icon = icons.debugBreakpointUnsupported;
            messages.push(localize('breakpointUnsupported', "Breakpoints of this type are not supported by the debugger"));
        }
        if (breakpoint.logMessage) {
            messages.push(localize('logMessage', "Log Message: {0}", breakpoint.logMessage));
        }
        if (breakpoint.condition) {
            messages.push(localize('expression', "Condition: {0}", breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        if (triggeringBreakpoint) {
            messages.push(localize('triggeredBy', "Hit after breakpoint: {0}", `${labelService.getUriLabel(triggeringBreakpoint.uri, { relative: true })}: ${triggeringBreakpoint.lineNumber}`));
        }
        return {
            icon,
            message: appendMessage(messages.join('\n'))
        };
    }
    const message = ('message' in breakpoint && breakpoint.message) ? breakpoint.message : breakpoint instanceof Breakpoint && labelService ? labelService.getUriLabel(breakpoint.uri) : localize('breakpoint', "Breakpoint");
    return {
        icon: breakpointIcon.regular,
        message
    };
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addFunctionBreakpointAction',
            title: {
                ...localize2('addFunctionBreakpoint', "Add Function Breakpoint"),
                mnemonicTitle: localize({ key: 'miFunctionBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Function Breakpoint..."),
            },
            f1: true,
            icon: icons.watchExpressionsAddFuncBreakpoint,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
                }, {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        const viewService = accessor.get(IViewsService);
        await viewService.openView(BREAKPOINTS_VIEW_ID);
        debugService.addFunctionBreakpoint();
    }
});
class MemoryBreakpointAction extends Action2 {
    async run(accessor, existingBreakpoint) {
        const debugService = accessor.get(IDebugService);
        const session = debugService.getViewModel().focusedSession;
        if (!session) {
            return;
        }
        let defaultValue = undefined;
        if (existingBreakpoint && existingBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */) {
            defaultValue = `${existingBreakpoint.src.address} + ${existingBreakpoint.src.bytes}`;
        }
        const quickInput = accessor.get(IQuickInputService);
        const notifications = accessor.get(INotificationService);
        const range = await this.getRange(quickInput, defaultValue);
        if (!range) {
            return;
        }
        let info;
        try {
            info = await session.dataBytesBreakpointInfo(range.address, range.bytes);
        }
        catch (e) {
            notifications.error(localize('dataBreakpointError', "Failed to set data breakpoint at {0}: {1}", range.address, e.message));
        }
        if (!info?.dataId) {
            return;
        }
        let accessType = 'write';
        if (info.accessTypes && info.accessTypes?.length > 1) {
            const accessTypes = info.accessTypes.map(type => ({ label: type }));
            const selectedAccessType = await quickInput.pick(accessTypes, { placeHolder: localize('dataBreakpointAccessType', "Select the access type to monitor") });
            if (!selectedAccessType) {
                return;
            }
            accessType = selectedAccessType.label;
        }
        const src = { type: 1 /* DataBreakpointSetType.Address */, ...range };
        if (existingBreakpoint) {
            await debugService.removeDataBreakpoints(existingBreakpoint.getId());
        }
        await debugService.addDataBreakpoint({
            description: info.description,
            src,
            canPersist: true,
            accessTypes: info.accessTypes,
            accessType: accessType,
            initialSessionData: { session, dataId: info.dataId }
        });
    }
    getRange(quickInput, defaultValue) {
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            const input = disposables.add(quickInput.createInputBox());
            input.prompt = localize('dataBreakpointMemoryRangePrompt', "Enter a memory range in which to break");
            input.placeholder = localize('dataBreakpointMemoryRangePlaceholder', 'Absolute range (0x1234 - 0x1300) or range of bytes after an address (0x1234 + 0xff)');
            if (defaultValue) {
                input.value = defaultValue;
                input.valueSelection = [0, defaultValue.length];
            }
            disposables.add(input.onDidChangeValue(e => {
                const err = this.parseAddress(e, false);
                input.validationMessage = err?.error;
            }));
            disposables.add(input.onDidAccept(() => {
                const r = this.parseAddress(input.value, true);
                if ('error' in r) {
                    input.validationMessage = r.error;
                }
                else {
                    resolve(r);
                }
                input.dispose();
            }));
            disposables.add(input.onDidHide(() => {
                resolve(undefined);
                disposables.dispose();
            }));
            input.ignoreFocusOut = true;
            input.show();
        });
    }
    parseAddress(range, isFinal) {
        const parts = /^(\S+)\s*(?:([+-])\s*(\S+))?/.exec(range);
        if (!parts) {
            return { error: localize('dataBreakpointAddrFormat', 'Address should be a range of numbers the form "[Start] - [End]" or "[Start] + [Bytes]"') };
        }
        const isNum = (e) => isFinal ? /^0x[0-9a-f]*|[0-9]*$/i.test(e) : /^0x[0-9a-f]+|[0-9]+$/i.test(e);
        const [, startStr, sign = '+', endStr = '1'] = parts;
        for (const n of [startStr, endStr]) {
            if (!isNum(n)) {
                return { error: localize('dataBreakpointAddrStartEnd', 'Number must be a decimal integer or hex value starting with \"0x\", got {0}', n) };
            }
        }
        if (!isFinal) {
            return;
        }
        const start = BigInt(startStr);
        const end = BigInt(endStr);
        const address = `0x${start.toString(16)}`;
        if (sign === '-') {
            return { address, bytes: Number(start - end) };
        }
        return { address, bytes: Number(end) };
    }
}
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addDataBreakpointOnAddress',
            title: {
                ...localize2('addDataBreakpointOnAddress', "Add Data Breakpoint at Address"),
                mnemonicTitle: localize({ key: 'miDataBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Data Breakpoint..."),
            },
            f1: true,
            icon: icons.watchExpressionsAddDataBreakpoint,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 11,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID))
                }, {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED
                }]
        });
    }
});
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.editDataBreakpointOnAddress',
            title: localize2('editDataBreakpointOnAddress', "Edit Address..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES),
                    group: 'navigation',
                    order: 15,
                }]
        });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.toggleBreakpointsActivatedAction',
            title: localize2('activateBreakpoints', 'Toggle Activate Breakpoints'),
            f1: true,
            icon: icons.breakpointsActivate,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 20,
                when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
            }
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.setBreakpointsActivated(!debugService.getModel().areBreakpointsActivated());
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeBreakpoint',
            title: localize('removeBreakpoint', "Remove Breakpoint"),
            icon: Codicon.removeClose,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 20,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')
                }]
        });
    }
    async run(accessor, breakpoint) {
        const debugService = accessor.get(IDebugService);
        if (breakpoint instanceof Breakpoint) {
            await debugService.removeBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            await debugService.removeFunctionBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof DataBreakpoint) {
            await debugService.removeDataBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            await debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeAllBreakpoints',
            title: {
                ...localize2('removeAllBreakpoints', "Remove All Breakpoints"),
                mnemonicTitle: localize({ key: 'miRemoveAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "Remove &&All Breakpoints"),
            },
            f1: true,
            icon: icons.breakpointsRemoveAll,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 30,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.removeBreakpoints();
        debugService.removeFunctionBreakpoints();
        debugService.removeDataBreakpoints();
        debugService.removeInstructionBreakpoints();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.enableAllBreakpoints',
            title: {
                ...localize2('enableAllBreakpoints', "Enable All Breakpoints"),
                mnemonicTitle: localize({ key: 'miEnableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "&&Enable All Breakpoints"),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 10,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 1,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.disableAllBreakpoints',
            title: {
                ...localize2('disableAllBreakpoints', "Disable All Breakpoints"),
                mnemonicTitle: localize({ key: 'miDisableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "Disable A&&ll Breakpoints"),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 2,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.reapplyBreakpointsAction',
            title: localize2('reapplyAllBreakpoints', 'Reapply All Breakpoints'),
            f1: true,
            precondition: CONTEXT_IN_DEBUG_MODE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 30,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.setBreakpointsActivated(true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editCondition', "Edit Condition..."),
            icon: Codicon.edit,
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('functionBreakpoint'),
                    group: 'navigation',
                    order: 10
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 10
                }]
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        if (breakpoint instanceof Breakpoint) {
            const editor = await openBreakpointSource(breakpoint, false, false, true, debugService, editorService);
            if (editor) {
                const codeEditor = editor.getControl();
                if (isCodeEditor(codeEditor)) {
                    codeEditor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(breakpoint.lineNumber, breakpoint.column);
                }
            }
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            const contextMenuService = accessor.get(IContextMenuService);
            const actions = [new Action('breakpoint.editCondition', localize('editCondition', "Edit Condition..."), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'condition' })),
                new Action('breakpoint.editCondition', localize('editHitCount', "Edit Hit Count..."), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'hitCount' }))];
            const domNode = breakpointIdToActionBarDomeNode.get(breakpoint.getId());
            if (domNode) {
                contextMenuService.showContextMenu({
                    getActions: () => actions,
                    getAnchor: () => domNode,
                    onHide: () => dispose(actions)
                });
            }
        }
        else {
            view.renderInputBox({ breakpoint, type: 'condition' });
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editBreakpoint', "Edit Function Condition..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint')
                }]
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'name' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpointHitCount',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editHitCount', "Edit Hit Count..."),
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('dataBreakpoint'))
                }]
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'hitCount' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpointMode',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editMode', "Edit Mode..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINT_HAS_MODES, ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('breakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('exceptionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('instructionBreakpoint')))
                }]
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const kind = getModeKindForBreakpoint(breakpoint);
        const modes = debugService.getModel().getBreakpointModes(kind);
        const picked = await accessor.get(IQuickInputService).pick(modes.map(mode => ({ label: mode.label, description: mode.description, mode: mode.mode })), { placeHolder: localize('selectBreakpointMode', "Select Breakpoint Mode") });
        if (!picked) {
            return;
        }
        if (kind === 'source') {
            const data = new Map();
            data.set(breakpoint.getId(), { mode: picked.mode, modeLabel: picked.label });
            debugService.updateBreakpoints(breakpoint.originalUri, data, false);
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
            debugService.addInstructionBreakpoint({ ...breakpoint.toJSON(), mode: picked.mode, modeLabel: picked.label });
        }
        else if (breakpoint instanceof ExceptionBreakpoint) {
            breakpoint.mode = picked.mode;
            breakpoint.modeLabel = picked.label;
            debugService.setExceptionBreakpointCondition(breakpoint, breakpoint.condition); // no-op to trigger a re-send
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9icmVha3BvaW50c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFFdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBSTVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdILE9BQU8sRUFBRSxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFbkgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsaUNBQWlDLEVBQUUseUJBQXlCLEVBQUUsMkJBQTJCLEVBQUUsNEJBQTRCLEVBQUUsZ0NBQWdDLEVBQUUscUNBQXFDLEVBQUUsNEJBQTRCLEVBQUUscUNBQXFDLEVBQUUsMkJBQTJCLEVBQUUscUJBQXFCLEVBQUUsMkNBQTJDLEVBQUUsWUFBWSxFQUErQyxjQUFjLEVBQWlKLGFBQWEsRUFBeUYsTUFBTSxvQkFBb0IsQ0FBQztBQUNqdUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNySSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEtBQUssS0FBSyxNQUFNLGlCQUFpQixDQUFDO0FBR3pDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFaEIsU0FBUyxjQUFjLENBQUMsV0FBNEI7SUFDbkQsTUFBTSxRQUFRLEdBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxRQUFRLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUMzQixRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRWhELE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUM7QUFFRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsQ0FBQztBQUNsQyxNQUFNLFVBQVUsbUJBQW1CLENBQUMsS0FBa0IsRUFBRSxTQUE2QixFQUFFLFVBQWtCO0lBQ3hHLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNoTyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQyxDQUFDO0FBUUQsU0FBUyx3QkFBd0IsQ0FBQyxVQUF1QjtJQUN4RCxNQUFNLElBQUksR0FBRyxVQUFVLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsWUFBWSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7SUFDckksT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRU0sSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxRQUFRO0lBa0I1QyxZQUNDLE9BQTRCLEVBQ1Asa0JBQXVDLEVBQzdDLFlBQTRDLEVBQ3ZDLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDbkQsWUFBMkIsRUFDMUIsYUFBOEMsRUFDekMsa0JBQXdELEVBQ3RELG9CQUEyQyxFQUMxQyxxQkFBNkMsRUFDakQsaUJBQXFDLEVBQ3pDLGFBQTZCLEVBQzlCLFlBQTRDLEVBQzdDLFdBQXlCLEVBQ3hCLFlBQTJCLEVBQ3hCLGVBQWtEO1FBRXBFLEtBQUssQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQWZ2SixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUkxQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDeEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUs3QyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUd4QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUEvQjdELGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLHFCQUFnQixHQUFHLEtBQUssQ0FBQztRQUN6QixpQkFBWSxHQUFHLEtBQUssQ0FBQztRQVFyQixxQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztRQXlCN0IsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3RGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMscUJBQXFCLEdBQUcscUNBQXFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0YsSUFBSSxDQUFDLDBCQUEwQixHQUFHLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQywyQkFBMkIsR0FBRyxxQ0FBcUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuRyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDN0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFO1lBQ3ZHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztZQUNwSyxJQUFJLDRCQUE0QixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzdLLElBQUksZ0NBQWdDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQ3RGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQzNJLElBQUksK0JBQStCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzSCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1lBQ3BNLElBQUksMkJBQTJCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN2SCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDO1NBQ3hFLEVBQUU7WUFDRixnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQW9CLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN0RSx3QkFBd0IsRUFBRSxLQUFLO1lBQy9CLCtCQUErQixFQUFFLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN0RixxQkFBcUIsRUFBRSxJQUFJLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNqRyxjQUFjLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsa0JBQWtCO1NBQ2hFLENBQWtDLENBQUM7UUFFcEMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXRFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQ2pFLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDNUQsQ0FBQztpQkFBTSxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO2dCQUNsRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxJQUFJLE9BQU8sWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLENBQUM7aUJBQU0sSUFBSSxPQUFPLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEcsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsRUFBRTtZQUM1QyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNoQixPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlO2dCQUNyRixPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDckMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3hMLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztnQkFDaEQsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0Ysd0JBQXdCO2dCQUN2QixlQUFtQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbEwsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLFlBQVksa0JBQWtCLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxDQUFDO2dCQUMvSixlQUFlO2dCQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM5RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFckQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdkQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDdkIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzVCLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUUsQ0FBRSxDQUFDO1FBQ3hJLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRTtZQUNoRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFa0IsaUJBQWlCLENBQUMsU0FBc0IsRUFBRSxLQUFhO1FBQ3pFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRTtZQUNyRSxZQUFZLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRTtnQkFDbEMsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsYUFBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQztnQkFDNUksS0FBSyxFQUFVLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUM7YUFDMUU7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUNKLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELGNBQWMsQ0FBQyxJQUE4QjtRQUM1QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFa0IsVUFBVSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQzFELElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNuQixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLENBQXFDO1FBQzlELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDMUIsTUFBTSxJQUFJLEdBQUcsT0FBTyxZQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLFlBQVksbUJBQW1CLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDM0gsT0FBTyxZQUFZLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDcEgsT0FBTyxZQUFZLHFCQUFxQixDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUM7UUFDaEUsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLFlBQVksbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3BLLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLE9BQU8sWUFBWSxjQUFjLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBDQUFrQyxDQUFDLENBQUM7UUFDeEgsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLE9BQXNCLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVsSixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTFILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7WUFDdkMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO1lBQ3pCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO1lBQzNCLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87U0FDaEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLFVBQVU7UUFDakIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFFLENBQUUsQ0FBQztRQUV4SSw0QkFBNEI7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDM0UsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQy9KLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsaUNBQXlCLElBQUksY0FBYyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUM7SUFDMU8sQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQU8sR0FBRyxLQUFLO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO1FBQ3hGLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3JHLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNyRSxNQUFNLHdCQUF3QixHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNyRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pGLE9BQU8sTUFBTSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksT0FBTyxJQUFJLHdCQUF3QixFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUMzRyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDekYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsNEJBQTRCLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1SCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0IsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNmLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLDRDQUE0QztnQkFDNUMsTUFBTSxZQUFZLEdBQUcsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDbEcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7Z0JBQzFCLElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1lBQzlCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQzlELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNsQixJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BJLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDL0IsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDcEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDdEQsT0FBTyxPQUFPLEVBQUUsS0FBSyxRQUFRLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLEtBQUssR0FBRyxJQUFJLENBQUM7b0JBQ2IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osOEVBQThFO2dCQUM5RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUMzQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN6RyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLFFBQVE7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUMzRSxNQUFNLFFBQVEsR0FBZ0MsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLFNBQVMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUVyUCxPQUFPLFFBQTRCLENBQUM7SUFDckMsQ0FBQztDQUNELENBQUE7QUExU1ksZUFBZTtJQW9CekIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsZ0JBQWdCLENBQUE7R0FsQ04sZUFBZSxDQTBTM0I7O0FBRUQsTUFBTSxtQkFBbUI7SUFFeEIsWUFBb0IsSUFBcUI7UUFBckIsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFDeEMsT0FBTztJQUNSLENBQUM7SUFFRCxTQUFTLENBQUMsUUFBd0I7UUFDakMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXVCO1FBQ3BDLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFDRCxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQzNDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDO1lBQzlELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDN0YsT0FBTywrQkFBK0IsQ0FBQyxFQUFFLENBQUM7WUFDM0MsQ0FBQztZQUVELE9BQU8sMkJBQTJCLENBQUMsRUFBRSxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLE9BQU8sWUFBWSxtQkFBbUIsRUFBRSxDQUFDO1lBQzVDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDO1lBQzlELElBQUksa0JBQWtCLElBQUksa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzFFLE9BQU8sZ0NBQWdDLENBQUMsRUFBRSxDQUFDO1lBQzVDLENBQUM7WUFDRCxPQUFPLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztRQUN4QyxDQUFDO1FBQ0QsSUFBSSxPQUFPLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDdkMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUM7WUFDOUQsSUFBSSxrQkFBa0IsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDMUUsT0FBTywyQkFBMkIsQ0FBQyxFQUFFLENBQUM7WUFDdkMsQ0FBQztZQUVELE9BQU8sdUJBQXVCLENBQUMsRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFDRCxJQUFJLE9BQU8sWUFBWSxxQkFBcUIsRUFBRSxDQUFDO1lBQzlDLE9BQU8sOEJBQThCLENBQUMsRUFBRSxDQUFDO1FBQzFDLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7Q0FDRDtBQW9FRCxNQUFNLCtCQUErQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO0FBQ3ZFLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COztJQUV4QixZQUNTLElBQVcsRUFDWCwwQkFBZ0QsRUFDaEQsMkJBQWlELEVBQ2pELGtCQUFtRCxFQUMzQixZQUEyQixFQUMzQixZQUEyQixFQUMzQixZQUEyQjtRQU5uRCxTQUFJLEdBQUosSUFBSSxDQUFPO1FBQ1gsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFzQjtRQUNoRCxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQXNCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBaUM7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFFM0QsT0FBTztJQUNSLENBQUM7YUFFZSxPQUFFLEdBQUcsYUFBYSxBQUFoQixDQUFpQjtJQUVuQyxJQUFJLFVBQVU7UUFDYixPQUFPLHFCQUFtQixDQUFDLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUE0QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdGLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUVsRixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBdUIsRUFBRSxLQUFhLEVBQUUsSUFBNkI7UUFDbEYsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBRXRHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEUsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixZQUFZLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDekMsQ0FBQztRQUNELElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLFlBQVksR0FBRyxHQUFHLFVBQVUsQ0FBQyxTQUFTLEtBQUssWUFBWSxFQUFFLENBQUM7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQztRQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pILElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFFM0MsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLE9BQU8sSUFBSSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6SixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssMEJBQWtCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLDBCQUFrQixDQUFDO1FBQzNHLElBQUksV0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUM7UUFDaEUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3hHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxRyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNELCtCQUErQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBSUQsY0FBYyxDQUFDLENBQU0sRUFBRSxLQUFhLEVBQUUsUUFBaUM7UUFDdEUsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBcUM7UUFDcEQsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7O0FBNUZJLG1CQUFtQjtJQU90QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FUVixtQkFBbUIsQ0E2RnhCO0FBRUQsTUFBTSw0QkFBNEI7SUFFakMsWUFDUyxJQUFXLEVBQ1gsMEJBQWdELEVBQ2hELDJCQUFpRCxFQUNqRCxrQkFBbUQsRUFDbkQsWUFBMkIsRUFDbEIsWUFBMkI7UUFMcEMsU0FBSSxHQUFKLElBQUksQ0FBTztRQUNYLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0I7UUFDaEQsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFzQjtRQUNqRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQWlDO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ2xCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRTVDLE9BQU87SUFDUixDQUFDO2FBRWUsT0FBRSxHQUFHLHNCQUFzQixDQUFDO0lBRTVDLElBQUksVUFBVTtRQUNiLE9BQU8sNEJBQTRCLENBQUMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxJQUFJLEdBQXFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0YsSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7UUFFbEYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsYUFBYSxDQUFDLG1CQUF5QyxFQUFFLEtBQWEsRUFBRSxJQUFzQztRQUM3RyxJQUFJLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLEtBQUssSUFBSSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sYUFBYSxDQUFDO1FBQ2hHLE1BQU0sd0JBQXdCLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLCtCQUErQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDek8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQzlJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUM7UUFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUNqRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsMkJBQTJCLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhOLElBQUksbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFFLG1CQUEyQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDckcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0csTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDL0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNELCtCQUErQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBNkIsRUFBRSxLQUFhLEVBQUUsWUFBOEMsRUFBRSxNQUEwQjtRQUN0SSxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUE4QztRQUM3RCxZQUFZLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUMsQ0FBQzs7QUFHRixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjs7SUFFaEMsWUFDUyxJQUFXLEVBQ1gsMkJBQWlELEVBQ2pELGtCQUFtRCxFQUMzQixZQUEyQixFQUMzQixZQUEyQixFQUMzQixZQUEyQjtRQUxuRCxTQUFJLEdBQUosSUFBSSxDQUFPO1FBQ1gsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFzQjtRQUNqRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQWlDO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRTNELE9BQU87SUFDUixDQUFDO2FBRWUsT0FBRSxHQUFHLHFCQUFxQixBQUF4QixDQUF5QjtJQUUzQyxJQUFJLFVBQVU7UUFDYixPQUFPLDZCQUEyQixDQUFDLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUFvQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdGLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUVsRixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxhQUFhLENBQUMsa0JBQXNDLEVBQUUsTUFBYyxFQUFFLElBQXFDO1FBQzFHLElBQUksQ0FBQyxPQUFPLEdBQUcsa0JBQWtCLENBQUM7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1FBQ2hELE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzVNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDO1FBQ25ELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVJLElBQUksa0JBQWtCLENBQUMsU0FBUyxJQUFJLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpQ0FBaUMsRUFBRSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEssQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLElBQUksa0JBQWtCLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUNwRyxDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7WUFDdEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDbkMsQ0FBQztRQUVELG9HQUFvRztRQUNwRyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsQ0FBQztRQUNoRSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDeEssSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDJCQUEyQixFQUFFLENBQUM7WUFDbEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDJEQUEyRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9OLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzlILElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMzRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQTJCLEVBQUUsS0FBYSxFQUFFLFlBQTZDLEVBQUUsTUFBMEI7UUFDbkksWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBNkM7UUFDNUQsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7O0FBeEZJLDJCQUEyQjtJQU05QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FSViwyQkFBMkIsQ0F5RmhDO0FBRUQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O0lBRTVCLFlBQ1MsSUFBVyxFQUNYLDBCQUFnRCxFQUNoRCwyQkFBaUQsRUFDakQsa0JBQW1ELEVBQ25ELHFCQUF1RCxFQUMvQixZQUEyQixFQUMzQixZQUEyQixFQUMzQixZQUEyQjtRQVBuRCxTQUFJLEdBQUosSUFBSSxDQUFPO1FBQ1gsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFzQjtRQUNoRCxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQXNCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBaUM7UUFDbkQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFrQztRQUMvQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUUzRCxPQUFPO0lBQ1IsQ0FBQzthQUVlLE9BQUUsR0FBRyxpQkFBaUIsQUFBcEIsQ0FBcUI7SUFFdkMsSUFBSSxVQUFVO1FBQ2IsT0FBTyx5QkFBdUIsQ0FBQyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLElBQUksR0FBZ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3RixJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25GLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUVsRixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxhQUFhLENBQUMsY0FBOEIsRUFBRSxNQUFjLEVBQUUsSUFBaUM7UUFDOUYsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQztRQUNuRCxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDeE0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0SSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO1FBQy9DLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTVJLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDbEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDbkMsQ0FBQztRQUVELDBGQUEwRjtRQUMxRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsQ0FBQztRQUNoRSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEssSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDOUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHVEQUF1RCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZOLENBQUM7UUFDRCxJQUFJLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMvQixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkwsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLENBQUM7UUFDRCxJQUFJLGNBQWMsQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpQ0FBaUMsRUFBRSxjQUFjLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxSixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7UUFDNUYsQ0FBQztRQUVELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQ0FBa0MsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxSCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDM0QsK0JBQStCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQXVCLEVBQUUsS0FBYSxFQUFFLFlBQXlDLEVBQUUsTUFBMEI7UUFDM0gsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBaUQ7UUFDaEUsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7O0FBcEdJLHVCQUF1QjtJQVExQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FWVix1QkFBdUIsQ0FxRzVCO0FBRUQsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7O0lBRW5DLFlBQ2lDLFlBQTJCLEVBQzNCLFlBQTJCLEVBQzNCLFlBQTJCO1FBRjNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRTNELE9BQU87SUFDUixDQUFDO2FBRWUsT0FBRSxHQUFHLHdCQUF3QixBQUEzQixDQUE0QjtJQUU5QyxJQUFJLFVBQVU7UUFDYixPQUFPLGdDQUE4QixDQUFDLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUF1QyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdGLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUVsRixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBa0MsRUFBRSxLQUFhLEVBQUUsSUFBd0M7UUFDeEcsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBRXRHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxnREFBZ0QsQ0FBQyxDQUFDLENBQUM7UUFDaEssSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztRQUUzQyxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDcE0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsT0FBTyxJQUFJLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpKLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSywwQkFBa0IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssMEJBQWtCLENBQUM7UUFDM0csSUFBSSxXQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDO1lBQzlDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBR0QsY0FBYyxDQUFDLE9BQStCLEVBQUUsS0FBYSxFQUFFLFlBQWdELEVBQUUsTUFBMEI7UUFDMUksWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBZ0Q7UUFDL0QsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7O0FBM0VJLDhCQUE4QjtJQUdqQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FMViw4QkFBOEIsQ0E0RW5DO0FBRUQsTUFBTSwrQkFBK0I7SUFFcEMsWUFDUyxJQUFxQixFQUNyQixZQUEyQixFQUMzQixrQkFBdUMsRUFDOUIsWUFBMkIsRUFDcEMsWUFBMkI7UUFKM0IsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFDckIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNwQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUNoQyxDQUFDO2FBRVcsT0FBRSxHQUFHLHlCQUF5QixDQUFDO0lBRS9DLElBQUksVUFBVTtRQUNiLE9BQU8sK0JBQStCLENBQUMsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxRQUFRLEdBQXlDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUMzRCxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixRQUFRLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUcxRSxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBRXJILFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFeEIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7WUFDbkMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDekIsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUV2QyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQzt3QkFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQzFFLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO3dCQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDL0UsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7d0JBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCLENBQUMsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNsRixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDM0QsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDakQsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUNyQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsUUFBUSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDM0IsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBaUIsRUFBRSxFQUFFO1lBQ3ZHLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxNQUFNLHdCQUFnQixDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLHVCQUFlLENBQUM7WUFDeEMsSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDM0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUM3QixRQUFRLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwRCxRQUFRLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3pDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDOUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELGFBQWEsQ0FBQyxrQkFBc0MsRUFBRSxNQUFjLEVBQUUsSUFBMEM7UUFDL0csSUFBSSxDQUFDLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksSUFBSSxNQUFNLENBQUMsQ0FBQyx5REFBeUQ7UUFDN0csTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFNU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0SSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7UUFFcEQsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLCtCQUErQixFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDcEYsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDMUYsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7WUFDekQsV0FBVyxHQUFHLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1lBQzdHLFNBQVMsR0FBRyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsbUZBQW1GLENBQUMsQ0FBQztRQUNuSixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7WUFDNUQsV0FBVyxHQUFHLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1lBQy9GLFNBQVMsR0FBRyxRQUFRLENBQUMscUNBQXFDLEVBQUUsdUVBQXVFLENBQUMsQ0FBQztRQUN0SSxDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFMUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQTRCLEVBQUUsS0FBYSxFQUFFLFlBQWtELEVBQUUsTUFBMEI7UUFDekksWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBa0Q7UUFDakUsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7O0FBR0YsTUFBTSwyQkFBMkI7SUFFaEMsWUFDUyxJQUFxQixFQUNyQixZQUEyQixFQUMzQixrQkFBdUMsRUFDOUIsWUFBMkIsRUFDcEMsWUFBMkI7UUFKM0IsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFDckIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNwQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUNoQyxDQUFDO2FBRVcsT0FBRSxHQUFHLHFCQUFxQixDQUFDO0lBRTNDLElBQUksVUFBVTtRQUNiLE9BQU8sMkJBQTJCLENBQUMsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxRQUFRLEdBQXFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUMzRCxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixRQUFRLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUcxRSxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JILFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFeEIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7WUFDbkMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDekIsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUV2QyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQzt3QkFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQzNFLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO3dCQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDOUUsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7WUFDRixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsUUFBUSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDM0IsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBaUIsRUFBRSxFQUFFO1lBQ3ZHLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxNQUFNLHdCQUFnQixDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLHVCQUFlLENBQUM7WUFDeEMsSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDM0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUM3QixRQUFRLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwRCxRQUFRLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3pDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDOUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELGFBQWEsQ0FBQyxjQUE4QixFQUFFLE1BQWMsRUFBRSxJQUFzQztRQUNuRyxJQUFJLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksSUFBSSxXQUFXLENBQUMsQ0FBQyw4REFBOEQ7UUFDdkgsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXhNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO1lBQ3JELFdBQVcsR0FBRyxRQUFRLENBQUMscUNBQXFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztZQUN6RyxTQUFTLEdBQUcsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLCtFQUErRSxDQUFDLENBQUM7UUFDM0ksQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztZQUN4RCxXQUFXLEdBQUcsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLDZCQUE2QixDQUFDLENBQUM7WUFDM0YsU0FBUyxHQUFHLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxtRUFBbUUsQ0FBQyxDQUFDO1FBQzlILENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUxQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBd0IsRUFBRSxLQUFhLEVBQUUsWUFBOEMsRUFBRSxNQUEwQjtRQUNqSSxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUE4QztRQUM3RCxZQUFZLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUMsQ0FBQzs7QUFHRixNQUFNLGdDQUFnQztJQUVyQyxZQUNTLElBQXFCLEVBQ3JCLFlBQTJCLEVBQzNCLGtCQUF1QztRQUZ2QyxTQUFJLEdBQUosSUFBSSxDQUFpQjtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRS9DLE9BQU87SUFDUixDQUFDO2FBRWUsT0FBRSxHQUFHLDBCQUEwQixDQUFDO0lBRWhELElBQUksVUFBVTtRQUNiLE9BQU8sZ0NBQWdDLENBQUMsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUMzRCxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFM0MsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUN6RSxTQUFTLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHFDQUFxQyxDQUFDO1lBQzFGLGNBQWMsRUFBRSxxQkFBcUI7U0FDckMsQ0FBQyxDQUFDO1FBR0gsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixNQUFNLE1BQU0sR0FBRyxDQUFDLE9BQWdCLEVBQUUsRUFBRTtZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3JDLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztZQUM1RCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ25FLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqRyxDQUFDLENBQUM7UUFFRixTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQWlCLEVBQUUsRUFBRTtZQUN2RyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSx3QkFBZ0IsQ0FBQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSx1QkFBZSxDQUFDO1lBQ3hDLElBQUksUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ25CLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQzNFLDBGQUEwRjtZQUMxRixVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNqRCxTQUFTLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFbEMsTUFBTSxZQUFZLEdBQTBDO1lBQzNELFFBQVE7WUFDUixRQUFRO1lBQ1IsbUJBQW1CLEVBQUUsU0FBUztZQUM5QixrQkFBa0IsRUFBRSxJQUFJLGVBQWUsRUFBRTtTQUN6QyxDQUFDO1FBRUYsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVELGFBQWEsQ0FBQyxtQkFBd0MsRUFBRSxNQUFjLEVBQUUsSUFBMkM7UUFDbEgsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsb0JBQW9CLElBQUksUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHlDQUF5QyxDQUFDLENBQUM7UUFDdEosSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDO1FBQzdDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUMxRCxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBNkIsRUFBRSxLQUFhLEVBQUUsWUFBbUQsRUFBRSxNQUEwQjtRQUMzSSxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFtRDtRQUNsRSxZQUFZLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUMsQ0FBQzs7QUFHRixNQUFNLGdDQUFnQztJQUVyQyxZQUNrQixZQUEyQixFQUMzQixZQUEyQjtRQUQzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUN6QyxDQUFDO0lBRUwsa0JBQWtCO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFRCxTQUFTLENBQUMsVUFBdUI7UUFDaEMsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBdUI7UUFDbkMsSUFBSSxPQUFPLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztZQUM1QyxPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQixDQUFDO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxPQUE4RCxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2xQLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVwQyxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUN2RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsVUFBdUIsRUFBRSxVQUFtQixFQUFFLGFBQXNCLEVBQUUsTUFBZSxFQUFFLFlBQTJCLEVBQUUsYUFBNkI7SUFDckwsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxZQUFZLElBQUksWUFBWSxDQUFDLEtBQUssMkJBQW1CLEVBQUUsQ0FBQztRQUNyRixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzVDLGVBQWUsRUFBRSxVQUFVLENBQUMsVUFBVTtRQUN0QyxhQUFhLEVBQUUsVUFBVSxDQUFDLGFBQWE7UUFDdkMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQztRQUNuQyxTQUFTLEVBQUUsVUFBVSxDQUFDLFNBQVMscURBQW9DO0tBQ25FLENBQUMsQ0FBQyxDQUFDO1FBQ0gsZUFBZSxFQUFFLFVBQVUsQ0FBQyxVQUFVO1FBQ3RDLFdBQVcsRUFBRSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUM7UUFDbkMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxVQUFVO1FBQ3BDLFNBQVMsRUFBRSxVQUFVLENBQUMsTUFBTSxxREFBb0M7S0FDaEUsQ0FBQztJQUVGLE9BQU8sYUFBYSxDQUFDLFVBQVUsQ0FBQztRQUMvQixRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUc7UUFDeEIsT0FBTyxFQUFFO1lBQ1IsYUFBYTtZQUNiLFNBQVM7WUFDVCxjQUFjLEVBQUUsSUFBSTtZQUNwQixtQkFBbUIsK0RBQXVEO1lBQzFFLE1BQU07U0FDTjtLQUNELEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsS0FBWSxFQUFFLG9CQUE2QixFQUFFLFVBQTBCLEVBQUUsWUFBMkIsRUFBRSxVQUF1QjtJQUN4SyxNQUFNLFdBQVcsR0FBRyxLQUFLLDBCQUFrQixJQUFJLEtBQUssMEJBQWtCLENBQUM7SUFFdkUsTUFBTSxjQUFjLEdBQUcsVUFBVSxZQUFZLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxZQUFZLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFFMU4sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ2xELE9BQU87WUFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVE7WUFDN0IsT0FBTyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLENBQUM7U0FDMUksQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBVSxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxTQUFTLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDeEcsQ0FBQyxDQUFDO0lBRUYsSUFBSSxXQUFXLElBQUksVUFBVSxZQUFZLFVBQVUsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0UsT0FBTztZQUNOLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU87U0FDOUIsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLFdBQVcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6QyxPQUFPO1lBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxVQUFVO1lBQy9CLE9BQU8sRUFBRSxDQUFDLFNBQVMsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUMzTiw0QkFBNEIsRUFBRSxJQUFJO1NBQ2xDLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxVQUFVLFlBQVksY0FBYyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPO2dCQUNOLElBQUksRUFBRSxjQUFjLENBQUMsVUFBVTtnQkFDL0IsT0FBTyxFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxtREFBbUQsQ0FBQzthQUNuRyxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU87WUFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU87WUFDNUIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDO1NBQzVFLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxVQUFVLFlBQVksa0JBQWtCLEVBQUUsQ0FBQztRQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE9BQU87Z0JBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxVQUFVO2dCQUMvQixPQUFPLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLHVEQUF1RCxDQUFDO2FBQzNHLENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO1FBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQzNGLElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxPQUFPO1lBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxPQUFPO1lBQzVCLE9BQU8sRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksVUFBVSxZQUFZLHFCQUFxQixFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPO2dCQUNOLElBQUksRUFBRSxjQUFjLENBQUMsVUFBVTtnQkFDL0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSwwREFBMEQsQ0FBQzthQUNqSCxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxDQUFDO2FBQU0sSUFBSSxVQUFVLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM1QyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ3JJLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELE9BQU87WUFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU87WUFDNUIsT0FBTyxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNDLENBQUM7SUFDSCxDQUFDO0lBRUQsOEVBQThFO0lBQzlFLElBQUksb0JBQTZDLENBQUM7SUFDbEQsSUFBSSxVQUFVLFlBQVksVUFBVSxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNoRSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsVUFBVSxJQUFJLFVBQVUsQ0FBQyxTQUFTLElBQUksVUFBVSxDQUFDLFlBQVksSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1FBQ3RHLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQztRQUNyRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLElBQUksR0FBRyxLQUFLLENBQUMsMEJBQTBCLENBQUM7WUFDeEMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsNERBQTRELENBQUMsQ0FBQyxDQUFDO1FBQ2hILENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEYsQ0FBQztRQUNELElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLDJCQUEyQixFQUFFLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEwsQ0FBQztRQUVELE9BQU87WUFDTixJQUFJO1lBQ0osT0FBTyxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNDLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxTQUFTLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxZQUFZLFVBQVUsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFOLE9BQU87UUFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU87UUFDNUIsT0FBTztLQUNQLENBQUM7QUFDSCxDQUFDO0FBRUQsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDREQUE0RDtZQUNoRSxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsdUJBQXVCLEVBQUUseUJBQXlCLENBQUM7Z0JBQ2hFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLDBCQUEwQixDQUFDO2FBQ3hIO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsS0FBSyxDQUFDLGlDQUFpQztZQUM3QyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUM7aUJBQ3hELEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyx3QkFBd0I7b0JBQ25DLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sV0FBVyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2hELFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQ3RDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxNQUFlLHNCQUF1QixTQUFRLE9BQU87SUFDcEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLGtCQUFvQztRQUN6RSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUM7UUFDM0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxrQkFBa0IsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQ0FBa0MsRUFBRSxDQUFDO1lBQ3pGLFlBQVksR0FBRyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLE1BQU0sa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RGLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDcEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLElBQTZDLENBQUM7UUFDbEQsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM3SCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksVUFBVSxHQUEyQyxPQUFPLENBQUM7UUFDakUsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEUsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxtQ0FBbUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMxSixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDekIsT0FBTztZQUNSLENBQUM7WUFFRCxVQUFVLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBeUIsRUFBRSxJQUFJLHVDQUErQixFQUFFLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDcEYsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sWUFBWSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELE1BQU0sWUFBWSxDQUFDLGlCQUFpQixDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixHQUFHO1lBQ0gsVUFBVSxFQUFFLElBQUk7WUFDaEIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLGtCQUFrQixFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO1NBQ3BELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxRQUFRLENBQUMsVUFBOEIsRUFBRSxZQUFxQjtRQUNyRSxPQUFPLElBQUksT0FBTyxDQUFpRCxPQUFPLENBQUMsRUFBRTtZQUM1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDM0QsS0FBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztZQUNyRyxLQUFLLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxxRkFBcUYsQ0FBQyxDQUFDO1lBQzVKLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO2dCQUMzQixLQUFLLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxDQUFDO1lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN4QyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDdEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDbEIsS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQ25DLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osQ0FBQztnQkFDRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDbkIsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztZQUM1QixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFJTyxZQUFZLENBQUMsS0FBYSxFQUFFLE9BQWdCO1FBQ25ELE1BQU0sS0FBSyxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx3RkFBd0YsQ0FBQyxFQUFFLENBQUM7UUFDbEosQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEdBQUcsR0FBRyxFQUFFLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFFckQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDZixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw2RUFBNkUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVJLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLE1BQU0sT0FBTyxHQUFHLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzFDLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNoRCxDQUFDO1FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7SUFDeEMsQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLEtBQU0sU0FBUSxzQkFBc0I7SUFDbkQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkRBQTJEO1lBQy9ELEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxnQ0FBZ0MsQ0FBQztnQkFDNUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsc0JBQXNCLENBQUM7YUFDaEg7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxLQUFLLENBQUMsaUNBQWlDO1lBQzdDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztvQkFDcEIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO29CQUNULElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUM7aUJBQ3pILEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyx3QkFBd0I7b0JBQ25DLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsMkNBQTJDO2lCQUNqRCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsc0JBQXNCO0lBQ25EO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDREQUE0RDtZQUNoRSxLQUFLLEVBQUUsU0FBUyxDQUFDLDZCQUE2QixFQUFFLGlCQUFpQixDQUFDO1lBQ2xFLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsRUFBRSxxQ0FBcUMsQ0FBQztvQkFDNUcsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO2lCQUNULENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGlFQUFpRTtZQUNyRSxLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLDZCQUE2QixDQUFDO1lBQ3RFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLEtBQUssQ0FBQyxtQkFBbUI7WUFDL0IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDcEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxFQUFFO2dCQUNULElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQzthQUN4RDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUM7WUFDeEQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQ3pCLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxLQUFLLEVBQUUsZ0JBQWdCO29CQUN2QixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsNEJBQTRCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDO2lCQUNyRSxFQUFFO29CQUNGLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsNEJBQTRCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDO2lCQUNyRSxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxVQUEyQjtRQUNoRSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELElBQUksVUFBVSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sWUFBWSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxJQUFJLFVBQVUsWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3JELE1BQU0sWUFBWSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7YUFBTSxJQUFJLFVBQVUsWUFBWSxjQUFjLEVBQUUsQ0FBQztZQUNqRCxNQUFNLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDO2FBQU0sSUFBSSxVQUFVLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztZQUN4RCxNQUFNLFlBQVksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JHLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFEQUFxRDtZQUN6RCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsd0JBQXdCLENBQUM7Z0JBQzlELGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLDBCQUEwQixDQUFDO2FBQzFIO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsS0FBSyxDQUFDLG9CQUFvQjtZQUNoQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUM7aUJBQ3hELEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7b0JBQ2xDLEtBQUssRUFBRSxnQkFBZ0I7b0JBQ3ZCLEtBQUssRUFBRSxFQUFFO29CQUNULElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLDRCQUE0QixDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2lCQUNwSCxFQUFFO29CQUNGLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO29CQUMzQixLQUFLLEVBQUUsZUFBZTtvQkFDdEIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLDJCQUEyQjtpQkFDakMsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUNqQyxZQUFZLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUN6QyxZQUFZLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNyQyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFEQUFxRDtZQUN6RCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsd0JBQXdCLENBQUM7Z0JBQzlELGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLDBCQUEwQixDQUFDO2FBQzFIO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7aUJBQ3BILEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNEQUFzRDtZQUMxRCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsdUJBQXVCLEVBQUUseUJBQXlCLENBQUM7Z0JBQ2hFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLDJCQUEyQixDQUFDO2FBQzVIO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7aUJBQ3BILEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlEQUF5RDtZQUM3RCxLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLHlCQUF5QixDQUFDO1lBQ3BFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLHFCQUFxQjtZQUNuQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtvQkFDbEMsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO29CQUNULElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLDRCQUE0QixDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2lCQUNwSCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxVQUEyQjtJQUN4RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsTUFBTSxFQUFFLG1CQUFtQjtZQUMzQixLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQztZQUNyRCxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsWUFBWSxFQUFFLHFDQUFxQztZQUNuRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtvQkFDbEMsSUFBSSxFQUFFLDRCQUE0QixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQztvQkFDcEUsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO2lCQUNULEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7b0JBQ2xDLEtBQUssRUFBRSxRQUFRO29CQUNmLEtBQUssRUFBRSxFQUFFO2lCQUNULENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUEwQixFQUFFLElBQXFCLEVBQUUsVUFBa0Y7UUFDcEosTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELElBQUksVUFBVSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLE1BQU0sb0JBQW9CLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN2RyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsVUFBVSxDQUFDLGVBQWUsQ0FBZ0MsaUNBQWlDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUosQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxVQUFVLFlBQVksa0JBQWtCLEVBQUUsQ0FBQztZQUNyRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM3RCxNQUFNLE9BQU8sR0FBYSxDQUFDLElBQUksTUFBTSxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDdE0sSUFBSSxNQUFNLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzSyxNQUFNLE9BQU8sR0FBRywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFeEUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixrQkFBa0IsQ0FBQyxlQUFlLENBQUM7b0JBQ2xDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO29CQUN6QixTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztvQkFDeEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7aUJBQzlCLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDeEQsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFHSCxlQUFlLENBQUMsS0FBTSxTQUFRLFVBQTJCO0lBQ3hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxNQUFNLEVBQUUsbUJBQW1CO1lBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsNEJBQTRCLENBQUM7WUFDL0QsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7b0JBQ2xDLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDO2lCQUNsRSxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUEyQixFQUFFLElBQXFCLEVBQUUsVUFBK0I7UUFDNUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxVQUEyQjtJQUN4RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQ0FBc0M7WUFDMUMsTUFBTSxFQUFFLG1CQUFtQjtZQUMzQixLQUFLLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQztZQUNwRCxZQUFZLEVBQUUscUNBQXFDO1lBQ25ELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO29CQUNsQyxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7aUJBQy9JLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxDQUFDLFNBQTJCLEVBQUUsSUFBcUIsRUFBRSxVQUErQjtRQUM1RixJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLFVBQTJCO0lBQ3hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBCQUEwQjtZQUM5QixNQUFNLEVBQUUsbUJBQW1CO1lBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQztZQUMzQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtvQkFDbEMsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO29CQUNULElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qiw0QkFBNEIsRUFDNUIsY0FBYyxDQUFDLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FDdk07aUJBQ0QsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQTBCLEVBQUUsSUFBcUIsRUFBRSxVQUF1QjtRQUN6RixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sSUFBSSxHQUFHLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQ3pELEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQzFGLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQyxFQUFFLENBQzNFLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRSxDQUFDO2FBQU0sSUFBSSxVQUFVLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztZQUN4RCxZQUFZLENBQUMsNEJBQTRCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RixZQUFZLENBQUMsd0JBQXdCLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDL0csQ0FBQzthQUFNLElBQUksVUFBVSxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQzlCLFVBQVUsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUNwQyxZQUFZLENBQUMsK0JBQStCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLDZCQUE2QjtRQUM5RyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQyJ9