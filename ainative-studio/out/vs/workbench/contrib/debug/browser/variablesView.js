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
var VisualizedVariableRenderer_1, VariablesRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Action } from '../../../../base/common/actions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED, CONTEXT_VARIABLES_FOCUSED, IDebugService, VARIABLES_VIEW_ID, WATCH_VIEW_ID } from '../common/debug.js';
import { getContextForVariable } from '../common/debugContext.js';
import { ErrorScope, Expression, Scope, StackFrame, Variable, VisualizedExpression, getUriForDebugMemory } from '../common/debugModel.js';
import { IDebugVisualizerService } from '../common/debugVisualizers.js';
import { AbstractExpressionDataSource, AbstractExpressionsRenderer, expressionAndScopeLabelProvider, renderViewTree } from './baseDebugView.js';
import { ADD_TO_WATCH_ID, ADD_TO_WATCH_LABEL, COPY_EVALUATE_PATH_ID, COPY_EVALUATE_PATH_LABEL, COPY_VALUE_ID, COPY_VALUE_LABEL } from './debugCommands.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
const $ = dom.$;
let forgetScopes = true;
let variableInternalContext;
let dataBreakpointInfoResponse;
let VariablesView = class VariablesView extends ViewPane {
    get treeSelection() {
        return this.tree.getSelection();
    }
    constructor(options, contextMenuService, debugService, keybindingService, configurationService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.menuService = menuService;
        this.needsRefresh = false;
        this.savedViewState = new Map();
        this.autoExpandedScopes = new Set();
        // Use scheduler to prevent unnecessary flashing
        this.updateTreeScheduler = new RunOnceScheduler(async () => {
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            this.needsRefresh = false;
            const input = this.tree.getInput();
            if (input) {
                this.savedViewState.set(input.getId(), this.tree.getViewState());
            }
            if (!stackFrame) {
                await this.tree.setInput(null);
                return;
            }
            const viewState = this.savedViewState.get(stackFrame.getId());
            await this.tree.setInput(stackFrame, viewState);
            // Automatically expand the first non-expensive scope
            const scopes = await stackFrame.getScopes();
            const toExpand = scopes.find(s => !s.expensive);
            // A race condition could be present causing the scopes here to be different from the scopes that the tree just retrieved.
            // If that happened, don't try to reveal anything, it will be straightened out on the next update
            if (toExpand && this.tree.hasNode(toExpand)) {
                this.autoExpandedScopes.add(toExpand.getId());
                await this.tree.expand(toExpand);
            }
        }, 400);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-variables');
        const treeContainer = renderViewTree(container);
        const expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'VariablesView', treeContainer, new VariablesDelegate(), [
            this.instantiationService.createInstance(VariablesRenderer, expressionRenderer),
            this.instantiationService.createInstance(VisualizedVariableRenderer, expressionRenderer),
            new ScopesRenderer(),
            new ScopeErrorRenderer(),
        ], this.instantiationService.createInstance(VariablesDataSource), {
            accessibilityProvider: new VariablesAccessibilityProvider(),
            identityProvider: { getId: (element) => element.getId() },
            keyboardNavigationLabelProvider: expressionAndScopeLabelProvider,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        this._register(VisualizedVariableRenderer.rendererOnVisualizationRange(this.debugService.getViewModel(), this.tree));
        this.tree.setInput(this.debugService.getViewModel().focusedStackFrame ?? null);
        CONTEXT_VARIABLES_FOCUSED.bindTo(this.tree.contextKeyService);
        this._register(this.debugService.getViewModel().onDidFocusStackFrame(sf => {
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                return;
            }
            // Refresh the tree immediately if the user explictly changed stack frames.
            // Otherwise postpone the refresh until user stops stepping.
            const timeout = sf.explicit ? 0 : undefined;
            this.updateTreeScheduler.schedule(timeout);
        }));
        this._register(this.debugService.getViewModel().onWillUpdateViews(() => {
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            if (stackFrame && forgetScopes) {
                stackFrame.forgetScopes();
            }
            forgetScopes = true;
            this.tree.updateChildren();
        }));
        this._register(this.tree);
        this._register(this.tree.onMouseDblClick(e => this.onMouseDblClick(e)));
        this._register(this.tree.onContextMenu(async (e) => await this.onContextMenu(e)));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible && this.needsRefresh) {
                this.updateTreeScheduler.schedule();
            }
        }));
        let horizontalScrolling;
        this._register(this.debugService.getViewModel().onDidSelectExpression(e => {
            const variable = e?.expression;
            if (variable && this.tree.hasNode(variable)) {
                horizontalScrolling = this.tree.options.horizontalScrolling;
                if (horizontalScrolling) {
                    this.tree.updateOptions({ horizontalScrolling: false });
                }
                this.tree.rerender(variable);
            }
            else if (!e && horizontalScrolling !== undefined) {
                this.tree.updateOptions({ horizontalScrolling: horizontalScrolling });
                horizontalScrolling = undefined;
            }
        }));
        this._register(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
        this._register(this.debugService.onDidEndSession(() => {
            this.savedViewState.clear();
            this.autoExpandedScopes.clear();
        }));
    }
    layoutBody(width, height) {
        super.layoutBody(height, width);
        this.tree.layout(width, height);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    onMouseDblClick(e) {
        if (this.canSetExpressionValue(e.element)) {
            this.debugService.getViewModel().setSelectedExpression(e.element, false);
        }
    }
    canSetExpressionValue(e) {
        const session = this.debugService.getViewModel().focusedSession;
        if (!session) {
            return false;
        }
        if (e instanceof VisualizedExpression) {
            return !!e.treeItem.canEdit;
        }
        return e instanceof Variable && !e.presentationHint?.attributes?.includes('readOnly') && !e.presentationHint?.lazy;
    }
    async onContextMenu(e) {
        const variable = e.element;
        if (!(variable instanceof Variable) || !variable.value) {
            return;
        }
        return openContextMenuForVariableTreeElement(this.contextKeyService, this.menuService, this.contextMenuService, MenuId.DebugVariablesContext, e);
    }
};
VariablesView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IViewDescriptorService),
    __param(7, IContextKeyService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IMenuService)
], VariablesView);
export { VariablesView };
export async function openContextMenuForVariableTreeElement(parentContextKeyService, menuService, contextMenuService, menuId, e) {
    const variable = e.element;
    if (!(variable instanceof Variable) || !variable.value) {
        return;
    }
    const contextKeyService = await getContextForVariableMenuWithDataAccess(parentContextKeyService, variable);
    const context = getVariablesContext(variable);
    const menu = menuService.getMenuActions(menuId, contextKeyService, { arg: context, shouldForwardArgs: false });
    const { secondary } = getContextMenuActions(menu, 'inline');
    contextMenuService.showContextMenu({
        getAnchor: () => e.anchor,
        getActions: () => secondary
    });
}
const getVariablesContext = (variable) => ({
    sessionId: variable.getSession()?.getId(),
    container: variable.parent instanceof Expression
        ? { expression: variable.parent.name }
        : variable.parent.toDebugProtocolObject(),
    variable: variable.toDebugProtocolObject()
});
/**
 * Gets a context key overlay that has context for the given variable, including data access info.
 */
async function getContextForVariableMenuWithDataAccess(parentContext, variable) {
    const session = variable.getSession();
    if (!session || !session.capabilities.supportsDataBreakpoints) {
        return getContextForVariableMenuBase(parentContext, variable);
    }
    const contextKeys = [];
    dataBreakpointInfoResponse = await session.dataBreakpointInfo(variable.name, variable.parent.reference);
    const dataBreakpointId = dataBreakpointInfoResponse?.dataId;
    const dataBreakpointAccessTypes = dataBreakpointInfoResponse?.accessTypes;
    if (!dataBreakpointAccessTypes) {
        contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED.key, !!dataBreakpointId]);
    }
    else {
        for (const accessType of dataBreakpointAccessTypes) {
            switch (accessType) {
                case 'read':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED.key, !!dataBreakpointId]);
                    break;
                case 'write':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED.key, !!dataBreakpointId]);
                    break;
                case 'readWrite':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED.key, !!dataBreakpointId]);
                    break;
            }
        }
    }
    return getContextForVariableMenuBase(parentContext, variable, contextKeys);
}
/**
 * Gets a context key overlay that has context for the given variable.
 */
function getContextForVariableMenuBase(parentContext, variable, additionalContext = []) {
    variableInternalContext = variable;
    return getContextForVariable(parentContext, variable, additionalContext);
}
function isStackFrame(obj) {
    return obj instanceof StackFrame;
}
class VariablesDataSource extends AbstractExpressionDataSource {
    hasChildren(element) {
        if (!element) {
            return false;
        }
        if (isStackFrame(element)) {
            return true;
        }
        return element.hasChildren;
    }
    doGetChildren(element) {
        if (isStackFrame(element)) {
            return element.getScopes();
        }
        return element.getChildren();
    }
}
class VariablesDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof ErrorScope) {
            return ScopeErrorRenderer.ID;
        }
        if (element instanceof Scope) {
            return ScopesRenderer.ID;
        }
        if (element instanceof VisualizedExpression) {
            return VisualizedVariableRenderer.ID;
        }
        return VariablesRenderer.ID;
    }
}
class ScopesRenderer {
    static { this.ID = 'scope'; }
    get templateId() {
        return ScopesRenderer.ID;
    }
    renderTemplate(container) {
        const name = dom.append(container, $('.scope'));
        const label = new HighlightedLabel(name);
        return { name, label };
    }
    renderElement(element, index, templateData) {
        templateData.label.set(element.element.name, createMatches(element.filterData));
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
class ScopeErrorRenderer {
    static { this.ID = 'scopeError'; }
    get templateId() {
        return ScopeErrorRenderer.ID;
    }
    renderTemplate(container) {
        const wrapper = dom.append(container, $('.scope'));
        const error = dom.append(wrapper, $('.error'));
        return { error };
    }
    renderElement(element, index, templateData) {
        templateData.error.innerText = element.element.name;
    }
    disposeTemplate() {
        // noop
    }
}
let VisualizedVariableRenderer = class VisualizedVariableRenderer extends AbstractExpressionsRenderer {
    static { VisualizedVariableRenderer_1 = this; }
    static { this.ID = 'viz'; }
    /**
     * Registers a helper that rerenders the tree when visualization is requested
     * or cancelled./
     */
    static rendererOnVisualizationRange(model, tree) {
        return model.onDidChangeVisualization(({ original }) => {
            if (!tree.hasNode(original)) {
                return;
            }
            const parent = tree.getParentElement(original);
            tree.updateChildren(parent, false, false);
        });
    }
    constructor(expressionRenderer, debugService, contextViewService, hoverService, menuService, contextKeyService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
    }
    get templateId() {
        return VisualizedVariableRenderer_1.ID;
    }
    renderElement(node, index, data) {
        data.elementDisposable.clear();
        super.renderExpressionElement(node.element, node, data);
    }
    renderExpression(expression, data, highlights) {
        const viz = expression;
        let text = viz.name;
        if (viz.value && typeof viz.name === 'string') {
            text += ':';
        }
        data.label.set(text, highlights, viz.name);
        data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, viz, {
            showChanged: false,
            maxValueLength: 1024,
            colorize: true,
            session: expression.getSession(),
        }));
    }
    getInputBoxOptions(expression) {
        const viz = expression;
        return {
            initialValue: expression.value,
            ariaLabel: localize('variableValueAriaLabel', "Type new variable value"),
            validationOptions: {
                validation: () => viz.errorMessage ? ({ content: viz.errorMessage }) : null
            },
            onFinish: (value, success) => {
                viz.errorMessage = undefined;
                if (success) {
                    viz.edit(value).then(() => {
                        // Do not refresh scopes due to a node limitation #15520
                        forgetScopes = false;
                        this.debugService.getViewModel().updateViews();
                    });
                }
            }
        };
    }
    renderActionBar(actionBar, expression, _data) {
        const viz = expression;
        const contextKeyService = viz.original ? getContextForVariableMenuBase(this.contextKeyService, viz.original) : this.contextKeyService;
        const context = viz.original ? getVariablesContext(viz.original) : undefined;
        const menu = this.menuService.getMenuActions(MenuId.DebugVariablesContext, contextKeyService, { arg: context, shouldForwardArgs: false });
        const { primary } = getContextMenuActions(menu, 'inline');
        if (viz.original) {
            const action = new Action('debugViz', localize('removeVisualizer', 'Remove Visualizer'), ThemeIcon.asClassName(Codicon.eye), true, () => this.debugService.getViewModel().setVisualizedExpression(viz.original, undefined));
            action.checked = true;
            primary.push(action);
            actionBar.domNode.style.display = 'initial';
        }
        actionBar.clear();
        actionBar.context = context;
        actionBar.push(primary, { icon: true, label: false });
    }
};
VisualizedVariableRenderer = VisualizedVariableRenderer_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IContextViewService),
    __param(3, IHoverService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], VisualizedVariableRenderer);
export { VisualizedVariableRenderer };
let VariablesRenderer = class VariablesRenderer extends AbstractExpressionsRenderer {
    static { VariablesRenderer_1 = this; }
    static { this.ID = 'variable'; }
    constructor(expressionRenderer, menuService, contextKeyService, visualization, contextMenuService, debugService, contextViewService, hoverService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.visualization = visualization;
        this.contextMenuService = contextMenuService;
    }
    get templateId() {
        return VariablesRenderer_1.ID;
    }
    renderExpression(expression, data, highlights) {
        data.elementDisposable.add(this.expressionRenderer.renderVariable(data, expression, {
            highlights,
            showChanged: true,
        }));
    }
    renderElement(node, index, data) {
        data.elementDisposable.clear();
        super.renderExpressionElement(node.element, node, data);
    }
    getInputBoxOptions(expression) {
        const variable = expression;
        return {
            initialValue: expression.value,
            ariaLabel: localize('variableValueAriaLabel', "Type new variable value"),
            validationOptions: {
                validation: () => variable.errorMessage ? ({ content: variable.errorMessage }) : null
            },
            onFinish: (value, success) => {
                variable.errorMessage = undefined;
                const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                if (success && variable.value !== value && focusedStackFrame) {
                    variable.setVariable(value, focusedStackFrame)
                        // Need to force watch expressions and variables to update since a variable change can have an effect on both
                        .then(() => {
                        // Do not refresh scopes due to a node limitation #15520
                        forgetScopes = false;
                        this.debugService.getViewModel().updateViews();
                    });
                }
            }
        };
    }
    renderActionBar(actionBar, expression, data) {
        const variable = expression;
        const contextKeyService = getContextForVariableMenuBase(this.contextKeyService, variable);
        const context = getVariablesContext(variable);
        const menu = this.menuService.getMenuActions(MenuId.DebugVariablesContext, contextKeyService, { arg: context, shouldForwardArgs: false });
        const { primary } = getContextMenuActions(menu, 'inline');
        actionBar.clear();
        actionBar.context = context;
        actionBar.push(primary, { icon: true, label: false });
        const cts = new CancellationTokenSource();
        data.elementDisposable.add(toDisposable(() => cts.dispose(true)));
        this.visualization.getApplicableFor(expression, cts.token).then(result => {
            data.elementDisposable.add(result);
            const originalExpression = (expression instanceof VisualizedExpression && expression.original) || expression;
            const actions = result.object.map(v => new Action('debugViz', v.name, v.iconClass || 'debug-viz-icon', undefined, this.useVisualizer(v, originalExpression, cts.token)));
            if (actions.length === 0) {
                // no-op
            }
            else if (actions.length === 1) {
                actionBar.push(actions[0], { icon: true, label: false });
            }
            else {
                actionBar.push(new Action('debugViz', localize('useVisualizer', 'Visualize Variable...'), ThemeIcon.asClassName(Codicon.eye), undefined, () => this.pickVisualizer(actions, originalExpression, data)), { icon: true, label: false });
            }
        });
    }
    pickVisualizer(actions, expression, data) {
        this.contextMenuService.showContextMenu({
            getAnchor: () => data.actionBar.getContainer(),
            getActions: () => actions,
        });
    }
    useVisualizer(viz, expression, token) {
        return async () => {
            const resolved = await viz.resolve(token);
            if (token.isCancellationRequested) {
                return;
            }
            if (resolved.type === 0 /* DebugVisualizationType.Command */) {
                viz.execute();
            }
            else {
                const replacement = await this.visualization.getVisualizedNodeFor(resolved.id, expression);
                if (replacement) {
                    this.debugService.getViewModel().setVisualizedExpression(expression, replacement);
                }
            }
        };
    }
};
VariablesRenderer = VariablesRenderer_1 = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService),
    __param(3, IDebugVisualizerService),
    __param(4, IContextMenuService),
    __param(5, IDebugService),
    __param(6, IContextViewService),
    __param(7, IHoverService)
], VariablesRenderer);
export { VariablesRenderer };
class VariablesAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('variablesAriaTreeLabel', "Debug Variables");
    }
    getAriaLabel(element) {
        if (element instanceof Scope) {
            return localize('variableScopeAriaLabel', "Scope {0}", element.name);
        }
        if (element instanceof Variable) {
            return localize({ key: 'variableAriaLabel', comment: ['Placeholders are variable name and variable value respectivly. They should not be translated.'] }, "{0}, value {1}", element.name, element.value);
        }
        return null;
    }
}
export const SET_VARIABLE_ID = 'debug.setVariable';
CommandsRegistry.registerCommand({
    id: SET_VARIABLE_ID,
    handler: (accessor) => {
        const debugService = accessor.get(IDebugService);
        debugService.getViewModel().setSelectedExpression(variableInternalContext, false);
    }
});
CommandsRegistry.registerCommand({
    metadata: {
        description: COPY_VALUE_LABEL,
    },
    id: COPY_VALUE_ID,
    handler: async (accessor, arg, ctx) => {
        if (!arg) {
            const viewService = accessor.get(IViewsService);
            const view = viewService.getActiveViewWithId(WATCH_VIEW_ID) || viewService.getActiveViewWithId(VARIABLES_VIEW_ID);
            if (view) {
            }
        }
        const debugService = accessor.get(IDebugService);
        const clipboardService = accessor.get(IClipboardService);
        let elementContext = '';
        let elements;
        if (!arg) {
            const viewService = accessor.get(IViewsService);
            const focusedView = viewService.getFocusedView();
            let view;
            if (focusedView?.id === WATCH_VIEW_ID) {
                view = viewService.getActiveViewWithId(WATCH_VIEW_ID);
                elementContext = 'watch';
            }
            else if (focusedView?.id === VARIABLES_VIEW_ID) {
                view = viewService.getActiveViewWithId(VARIABLES_VIEW_ID);
                elementContext = 'variables';
            }
            if (!view) {
                return;
            }
            elements = view.treeSelection.filter(e => e instanceof Expression || e instanceof Variable);
        }
        else if (arg instanceof Variable || arg instanceof Expression) {
            elementContext = 'watch';
            elements = ctx ? ctx : [];
        }
        else {
            elementContext = 'variables';
            elements = variableInternalContext ? [variableInternalContext] : [];
        }
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const session = debugService.getViewModel().focusedSession;
        if (!stackFrame || !session || elements.length === 0) {
            return;
        }
        const evalContext = session.capabilities.supportsClipboardContext ? 'clipboard' : elementContext;
        const toEvaluate = elements.map(element => element instanceof Variable ? (element.evaluateName || element.value) : element.name);
        try {
            const evaluations = await Promise.all(toEvaluate.map(expr => session.evaluate(expr, stackFrame.frameId, evalContext)));
            const result = coalesce(evaluations).map(evaluation => evaluation.body.result);
            if (result.length) {
                clipboardService.writeText(result.join('\n'));
            }
        }
        catch (e) {
            const result = elements.map(element => element.value);
            clipboardService.writeText(result.join('\n'));
        }
    }
});
export const VIEW_MEMORY_ID = 'workbench.debug.viewlet.action.viewMemory';
const HEX_EDITOR_EXTENSION_ID = 'ms-vscode.hexeditor';
const HEX_EDITOR_EDITOR_ID = 'hexEditor.hexedit';
CommandsRegistry.registerCommand({
    id: VIEW_MEMORY_ID,
    handler: async (accessor, arg, ctx) => {
        const debugService = accessor.get(IDebugService);
        let sessionId;
        let memoryReference;
        if ('sessionId' in arg) { // IVariablesContext
            if (!arg.sessionId || !arg.variable.memoryReference) {
                return;
            }
            sessionId = arg.sessionId;
            memoryReference = arg.variable.memoryReference;
        }
        else { // IExpression
            if (!arg.memoryReference) {
                return;
            }
            const focused = debugService.getViewModel().focusedSession;
            if (!focused) {
                return;
            }
            sessionId = focused.getId();
            memoryReference = arg.memoryReference;
        }
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const editorService = accessor.get(IEditorService);
        const notificationService = accessor.get(INotificationService);
        const extensionService = accessor.get(IExtensionService);
        const telemetryService = accessor.get(ITelemetryService);
        const ext = await extensionService.getExtension(HEX_EDITOR_EXTENSION_ID);
        if (ext || await tryInstallHexEditor(extensionsWorkbenchService, notificationService)) {
            /* __GDPR__
                "debug/didViewMemory" : {
                    "owner": "connor4312",
                    "debugType" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            telemetryService.publicLog('debug/didViewMemory', {
                debugType: debugService.getModel().getSession(sessionId)?.configuration.type,
            });
            await editorService.openEditor({
                resource: getUriForDebugMemory(sessionId, memoryReference),
                options: {
                    revealIfOpened: true,
                    override: HEX_EDITOR_EDITOR_ID,
                },
            }, SIDE_GROUP);
        }
    }
});
async function tryInstallHexEditor(extensionsWorkbenchService, notificationService) {
    try {
        await extensionsWorkbenchService.install(HEX_EDITOR_EXTENSION_ID, {
            justification: localize("viewMemory.prompt", "Inspecting binary data requires this extension."),
            enable: true
        }, 15 /* ProgressLocation.Notification */);
        return true;
    }
    catch (error) {
        notificationService.error(error);
        return false;
    }
}
export const BREAK_WHEN_VALUE_CHANGES_ID = 'debug.breakWhenValueChanges';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_CHANGES_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({ description: dataBreakpointInfoResponse.description, src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId }, canPersist: !!dataBreakpointInfoResponse.canPersist, accessTypes: dataBreakpointInfoResponse.accessTypes, accessType: 'write' });
        }
    }
});
export const BREAK_WHEN_VALUE_IS_ACCESSED_ID = 'debug.breakWhenValueIsAccessed';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_IS_ACCESSED_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({ description: dataBreakpointInfoResponse.description, src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId }, canPersist: !!dataBreakpointInfoResponse.canPersist, accessTypes: dataBreakpointInfoResponse.accessTypes, accessType: 'readWrite' });
        }
    }
});
export const BREAK_WHEN_VALUE_IS_READ_ID = 'debug.breakWhenValueIsRead';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_IS_READ_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({ description: dataBreakpointInfoResponse.description, src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId }, canPersist: !!dataBreakpointInfoResponse.canPersist, accessTypes: dataBreakpointInfoResponse.accessTypes, accessType: 'read' });
        }
    }
});
CommandsRegistry.registerCommand({
    metadata: {
        description: COPY_EVALUATE_PATH_LABEL,
    },
    id: COPY_EVALUATE_PATH_ID,
    handler: async (accessor, context) => {
        const clipboardService = accessor.get(IClipboardService);
        await clipboardService.writeText(context.variable.evaluateName);
    }
});
CommandsRegistry.registerCommand({
    metadata: {
        description: ADD_TO_WATCH_LABEL,
    },
    id: ADD_TO_WATCH_ID,
    handler: async (accessor, context) => {
        const debugService = accessor.get(IDebugService);
        debugService.addWatchExpression(context.variable.evaluateName);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'variables.collapse',
            viewId: VARIABLES_VIEW_ID,
            title: localize('collapse', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VARIABLES_VIEW_ID)
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3ZhcmlhYmxlc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFFdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFjLE1BQU0sa0VBQWtFLENBQUM7QUFLaEgsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0Qs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