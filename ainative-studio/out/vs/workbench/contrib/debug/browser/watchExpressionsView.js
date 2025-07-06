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
var WatchExpressionsRenderer_1;
import { ElementsDragAndDropData } from '../../../../base/browser/ui/list/listView.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { getContextMenuActions, getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { CONTEXT_CAN_VIEW_MEMORY, CONTEXT_EXPRESSION_SELECTED, CONTEXT_VARIABLE_IS_READONLY, CONTEXT_WATCH_EXPRESSIONS_EXIST, CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_WATCH_ITEM_TYPE, IDebugService, WATCH_VIEW_ID } from '../common/debug.js';
import { Expression, Variable, VisualizedExpression } from '../common/debugModel.js';
import { AbstractExpressionDataSource, AbstractExpressionsRenderer, expressionAndScopeLabelProvider, renderViewTree } from './baseDebugView.js';
import { COPY_WATCH_EXPRESSION_COMMAND_ID } from './debugCommands.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
import { watchExpressionsAdd, watchExpressionsRemoveAll } from './debugIcons.js';
import { VariablesRenderer, VisualizedVariableRenderer } from './variablesView.js';
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
let ignoreViewUpdates = false;
let useCachedEvaluation = false;
let WatchExpressionsView = class WatchExpressionsView extends ViewPane {
    get treeSelection() {
        return this.tree.getSelection();
    }
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.needsRefresh = false;
        this.menu = menuService.createMenu(MenuId.DebugWatchContext, contextKeyService);
        this._register(this.menu);
        this.watchExpressionsUpdatedScheduler = new RunOnceScheduler(() => {
            this.needsRefresh = false;
            this.tree.updateChildren();
        }, 50);
        this.watchExpressionsExist = CONTEXT_WATCH_EXPRESSIONS_EXIST.bindTo(contextKeyService);
        this.variableReadonly = CONTEXT_VARIABLE_IS_READONLY.bindTo(contextKeyService);
        this.watchExpressionsExist.set(this.debugService.getModel().getWatchExpressions().length > 0);
        this.watchItemType = CONTEXT_WATCH_ITEM_TYPE.bindTo(contextKeyService);
        this.expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-watch');
        const treeContainer = renderViewTree(container);
        const expressionsRenderer = this.instantiationService.createInstance(WatchExpressionsRenderer, this.expressionRenderer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'WatchExpressions', treeContainer, new WatchExpressionsDelegate(), [
            expressionsRenderer,
            this.instantiationService.createInstance(VariablesRenderer, this.expressionRenderer),
            this.instantiationService.createInstance(VisualizedVariableRenderer, this.expressionRenderer),
        ], this.instantiationService.createInstance(WatchExpressionsDataSource), {
            accessibilityProvider: new WatchExpressionsAccessibilityProvider(),
            identityProvider: { getId: (element) => element.getId() },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (e) => {
                    if (e === this.debugService.getViewModel().getSelectedExpression()?.expression) {
                        // Don't filter input box
                        return undefined;
                    }
                    return expressionAndScopeLabelProvider.getKeyboardNavigationLabel(e);
                }
            },
            dnd: new WatchExpressionsDragAndDrop(this.debugService),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        this._register(this.tree);
        this.tree.setInput(this.debugService);
        CONTEXT_WATCH_EXPRESSIONS_FOCUSED.bindTo(this.tree.contextKeyService);
        this._register(VisualizedVariableRenderer.rendererOnVisualizationRange(this.debugService.getViewModel(), this.tree));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onMouseDblClick(e => this.onMouseDblClick(e)));
        this._register(this.debugService.getModel().onDidChangeWatchExpressions(async (we) => {
            this.watchExpressionsExist.set(this.debugService.getModel().getWatchExpressions().length > 0);
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
            }
            else {
                if (we && !we.name) {
                    // We are adding a new input box, no need to re-evaluate watch expressions
                    useCachedEvaluation = true;
                }
                await this.tree.updateChildren();
                useCachedEvaluation = false;
                if (we instanceof Expression) {
                    this.tree.reveal(we);
                }
            }
        }));
        this._register(this.debugService.getViewModel().onDidFocusStackFrame(() => {
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                return;
            }
            if (!this.watchExpressionsUpdatedScheduler.isScheduled()) {
                this.watchExpressionsUpdatedScheduler.schedule();
            }
        }));
        this._register(this.debugService.getViewModel().onWillUpdateViews(() => {
            if (!ignoreViewUpdates) {
                this.tree.updateChildren();
            }
        }));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible && this.needsRefresh) {
                this.watchExpressionsUpdatedScheduler.schedule();
            }
        }));
        let horizontalScrolling;
        this._register(this.debugService.getViewModel().onDidSelectExpression(e => {
            const expression = e?.expression;
            if (expression && this.tree.hasNode(expression)) {
                horizontalScrolling = this.tree.options.horizontalScrolling;
                if (horizontalScrolling) {
                    this.tree.updateOptions({ horizontalScrolling: false });
                }
                if (expression.name) {
                    // Only rerender if the input is already done since otherwise the tree is not yet aware of the new element
                    this.tree.rerender(expression);
                }
            }
            else if (!expression && horizontalScrolling !== undefined) {
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
    onMouseDblClick(e) {
        if (e.browserEvent.target.className.indexOf('twistie') >= 0) {
            // Ignore double click events on twistie
            return;
        }
        const element = e.element;
        // double click on primitive value: open input box to be able to select and copy value.
        const selectedExpression = this.debugService.getViewModel().getSelectedExpression();
        if ((element instanceof Expression && element !== selectedExpression?.expression) || (element instanceof VisualizedExpression && element.treeItem.canEdit)) {
            this.debugService.getViewModel().setSelectedExpression(element, false);
        }
        else if (!element) {
            // Double click in watch panel triggers to add a new watch expression
            this.debugService.addWatchExpression();
        }
    }
    onContextMenu(e) {
        const element = e.element;
        const selection = this.tree.getSelection();
        this.watchItemType.set(element instanceof Expression ? 'expression' : element instanceof Variable ? 'variable' : undefined);
        const attributes = element instanceof Variable ? element.presentationHint?.attributes : undefined;
        this.variableReadonly.set(!!attributes && attributes.indexOf('readOnly') >= 0 || !!element?.presentationHint?.lazy);
        const actions = getFlatContextMenuActions(this.menu.getActions({ arg: element, shouldForwardArgs: true }));
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => element && selection.includes(element) ? selection : element ? [element] : [],
        });
    }
};
WatchExpressionsView = __decorate([
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
], WatchExpressionsView);
export { WatchExpressionsView };
class WatchExpressionsDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof Expression) {
            return WatchExpressionsRenderer.ID;
        }
        if (element instanceof VisualizedExpression) {
            return VisualizedVariableRenderer.ID;
        }
        // Variable
        return VariablesRenderer.ID;
    }
}
function isDebugService(element) {
    return typeof element.getConfigurationManager === 'function';
}
class WatchExpressionsDataSource extends AbstractExpressionDataSource {
    hasChildren(element) {
        return isDebugService(element) || element.hasChildren;
    }
    doGetChildren(element) {
        if (isDebugService(element)) {
            const debugService = element;
            const watchExpressions = debugService.getModel().getWatchExpressions();
            const viewModel = debugService.getViewModel();
            return Promise.all(watchExpressions.map(we => !!we.name && !useCachedEvaluation
                ? we.evaluate(viewModel.focusedSession, viewModel.focusedStackFrame, 'watch').then(() => we)
                : Promise.resolve(we)));
        }
        return element.getChildren();
    }
}
let WatchExpressionsRenderer = class WatchExpressionsRenderer extends AbstractExpressionsRenderer {
    static { WatchExpressionsRenderer_1 = this; }
    static { this.ID = 'watchexpression'; }
    constructor(expressionRenderer, menuService, contextKeyService, debugService, contextViewService, hoverService, configurationService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
    }
    get templateId() {
        return WatchExpressionsRenderer_1.ID;
    }
    renderElement(node, index, data) {
        data.elementDisposable.clear();
        data.elementDisposable.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.showVariableTypes')) {
                super.renderExpressionElement(node.element, node, data);
            }
        }));
        super.renderExpressionElement(node.element, node, data);
    }
    renderExpression(expression, data, highlights) {
        let text;
        data.type.textContent = '';
        const showType = this.configurationService.getValue('debug').showVariableTypes;
        if (showType && expression.type) {
            text = typeof expression.value === 'string' ? `${expression.name}: ` : expression.name;
            //render type
            data.type.textContent = expression.type + ' =';
        }
        else {
            text = typeof expression.value === 'string' ? `${expression.name} =` : expression.name;
        }
        let title;
        if (expression.type) {
            if (showType) {
                title = `${expression.name}`;
            }
            else {
                title = expression.type === expression.value ?
                    expression.type :
                    `${expression.type}`;
            }
        }
        else {
            title = expression.value;
        }
        data.label.set(text, highlights, title);
        data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, expression, {
            showChanged: true,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            colorize: true,
            session: expression.getSession(),
        }));
    }
    getInputBoxOptions(expression, settingValue) {
        if (settingValue) {
            return {
                initialValue: expression.value,
                ariaLabel: localize('typeNewValue', "Type new value"),
                onFinish: async (value, success) => {
                    if (success && value) {
                        const focusedFrame = this.debugService.getViewModel().focusedStackFrame;
                        if (focusedFrame && (expression instanceof Variable || expression instanceof Expression)) {
                            await expression.setExpression(value, focusedFrame);
                            this.debugService.getViewModel().updateViews();
                        }
                    }
                }
            };
        }
        return {
            initialValue: expression.name ? expression.name : '',
            ariaLabel: localize('watchExpressionInputAriaLabel', "Type watch expression"),
            placeholder: localize('watchExpressionPlaceholder', "Expression to watch"),
            onFinish: (value, success) => {
                if (success && value) {
                    this.debugService.renameWatchExpression(expression.getId(), value);
                    ignoreViewUpdates = true;
                    this.debugService.getViewModel().updateViews();
                    ignoreViewUpdates = false;
                }
                else if (!expression.name) {
                    this.debugService.removeWatchExpressions(expression.getId());
                }
            }
        };
    }
    renderActionBar(actionBar, expression) {
        const contextKeyService = getContextForWatchExpressionMenu(this.contextKeyService, expression);
        const context = expression;
        const menu = this.menuService.getMenuActions(MenuId.DebugWatchContext, contextKeyService, { arg: context, shouldForwardArgs: false });
        const { primary } = getContextMenuActions(menu, 'inline');
        actionBar.clear();
        actionBar.context = context;
        actionBar.push(primary, { icon: true, label: false });
    }
};
WatchExpressionsRenderer = WatchExpressionsRenderer_1 = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService),
    __param(3, IDebugService),
    __param(4, IContextViewService),
    __param(5, IHoverService),
    __param(6, IConfigurationService)
], WatchExpressionsRenderer);
export { WatchExpressionsRenderer };
/**
 * Gets a context key overlay that has context for the given expression.
 */
function getContextForWatchExpressionMenu(parentContext, expression) {
    return parentContext.createOverlay([
        [CONTEXT_CAN_VIEW_MEMORY.key, expression.memoryReference !== undefined],
        [CONTEXT_WATCH_ITEM_TYPE.key, 'expression']
    ]);
}
class WatchExpressionsAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize({ comment: ['Debug is a noun in this context, not a verb.'], key: 'watchAriaTreeLabel' }, "Debug Watch Expressions");
    }
    getAriaLabel(element) {
        if (element instanceof Expression) {
            return localize('watchExpressionAriaLabel', "{0}, value {1}", element.name, element.value);
        }
        // Variable
        return localize('watchVariableAriaLabel', "{0}, value {1}", element.name, element.value);
    }
}
class WatchExpressionsDragAndDrop {
    constructor(debugService) {
        this.debugService = debugService;
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        if (!(data instanceof ElementsDragAndDropData)) {
            return false;
        }
        const expressions = data.elements;
        if (!(expressions.length > 0 && expressions[0] instanceof Expression)) {
            return false;
        }
        let dropEffectPosition = undefined;
        if (targetIndex === undefined) {
            // Hovering over the list
            dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
            targetIndex = -1;
        }
        else {
            // Hovering over an element
            switch (targetSector) {
                case 0 /* ListViewTargetSector.TOP */:
                case 1 /* ListViewTargetSector.CENTER_TOP */:
                    dropEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                    break;
                case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                case 3 /* ListViewTargetSector.BOTTOM */:
                    dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                    break;
            }
        }
        return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition }, feedback: [targetIndex] };
    }
    getDragURI(element) {
        if (!(element instanceof Expression) || element === this.debugService.getViewModel().getSelectedExpression()?.expression) {
            return null;
        }
        return element.getId();
    }
    getDragLabel(elements) {
        if (elements.length === 1) {
            return elements[0].name;
        }
        return undefined;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) {
        if (!(data instanceof ElementsDragAndDropData)) {
            return;
        }
        const draggedElement = data.elements[0];
        if (!(draggedElement instanceof Expression)) {
            throw new Error('Invalid dragged element');
        }
        const watches = this.debugService.getModel().getWatchExpressions();
        const sourcePosition = watches.indexOf(draggedElement);
        let targetPosition;
        if (targetElement instanceof Expression) {
            targetPosition = watches.indexOf(targetElement);
            switch (targetSector) {
                case 3 /* ListViewTargetSector.BOTTOM */:
                case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    targetPosition++;
                    break;
            }
            if (sourcePosition < targetPosition) {
                targetPosition--;
            }
        }
        else {
            targetPosition = watches.length - 1;
        }
        this.debugService.moveWatchExpression(draggedElement.getId(), targetPosition);
    }
    dispose() { }
}
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            id: 'watch.collapse',
            viewId: WATCH_VIEW_ID,
            title: localize('collapse', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            precondition: CONTEXT_WATCH_EXPRESSIONS_EXIST,
            menu: {
                id: MenuId.ViewTitle,
                order: 30,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', WATCH_VIEW_ID)
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
export const ADD_WATCH_ID = 'workbench.debug.viewlet.action.addWatchExpression'; // Use old and long id for backwards compatibility
export const ADD_WATCH_LABEL = localize('addWatchExpression', "Add Expression");
registerAction2(class AddWatchExpressionAction extends Action2 {
    constructor() {
        super({
            id: ADD_WATCH_ID,
            title: ADD_WATCH_LABEL,
            f1: false,
            icon: watchExpressionsAdd,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', WATCH_VIEW_ID)
            }
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.addWatchExpression();
    }
});
export const REMOVE_WATCH_EXPRESSIONS_COMMAND_ID = 'workbench.debug.viewlet.action.removeAllWatchExpressions';
export const REMOVE_WATCH_EXPRESSIONS_LABEL = localize('removeAllWatchExpressions', "Remove All Expressions");
registerAction2(class RemoveAllWatchExpressionsAction extends Action2 {
    constructor() {
        super({
            id: REMOVE_WATCH_EXPRESSIONS_COMMAND_ID, // Use old and long id for backwards compatibility
            title: REMOVE_WATCH_EXPRESSIONS_LABEL,
            f1: false,
            icon: watchExpressionsRemoveAll,
            precondition: CONTEXT_WATCH_EXPRESSIONS_EXIST,
            menu: {
                id: MenuId.ViewTitle,
                order: 20,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', WATCH_VIEW_ID)
            }
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.removeWatchExpressions();
    }
});
registerAction2(class CopyExpression extends ViewAction {
    constructor() {
        super({
            id: COPY_WATCH_EXPRESSION_COMMAND_ID,
            title: localize('copyWatchExpression', "Copy Expression"),
            f1: false,
            viewId: WATCH_VIEW_ID,
            precondition: CONTEXT_WATCH_EXPRESSIONS_EXIST,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusedViewContext.isEqualTo(WATCH_VIEW_ID), CONTEXT_EXPRESSION_SELECTED.negate()),
            },
            menu: {
                id: MenuId.DebugWatchContext,
                order: 20,
                group: '3_modification',
                when: CONTEXT_WATCH_ITEM_TYPE.isEqualTo('expression')
            }
        });
    }
    runInView(accessor, view, value) {
        const clipboardService = accessor.get(IClipboardService);
        if (!value) {
            value = view.treeSelection.at(-1);
        }
        if (value) {
            clipboardService.writeText(value.name);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hFeHByZXNzaW9uc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3dhdGNoRXhwcmVzc2lvbnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQU1oRyxPQUFPLEVBQUUsdUJBQXVCLEVBQXdCLE1BQU0sOENBQThDLENBQUM7QUFHN0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNuSSxPQUFPLEVBQUUsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsT0FBTyxF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