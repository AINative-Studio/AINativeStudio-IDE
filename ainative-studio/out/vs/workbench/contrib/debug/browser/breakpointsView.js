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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYnJlYWtwb2ludHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFL0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUk1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFM0UsT0FBTyxFQUFF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