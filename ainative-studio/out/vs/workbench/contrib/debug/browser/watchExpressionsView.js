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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hFeHByZXNzaW9uc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci93YXRjaEV4cHJlc3Npb25zVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFNaEcsT0FBTyxFQUFFLHVCQUF1QixFQUF3QixNQUFNLDhDQUE4QyxDQUFDO0FBRzdHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDbkksT0FBTyxFQUFFLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8s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