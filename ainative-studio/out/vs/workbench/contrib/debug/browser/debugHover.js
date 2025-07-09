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
var DebugHoverWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as lifecycle from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import * as nls from '../../../../nls.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { asCssVariable, editorHoverBackground, editorHoverBorder, editorHoverForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IDebugService } from '../common/debug.js';
import { Expression, Variable, VisualizedExpression } from '../common/debugModel.js';
import { getEvaluatableExpressionAtPosition } from '../common/debugUtils.js';
import { AbstractExpressionDataSource } from './baseDebugView.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
import { VariablesRenderer, VisualizedVariableRenderer, openContextMenuForVariableTreeElement } from './variablesView.js';
const $ = dom.$;
export var ShowDebugHoverResult;
(function (ShowDebugHoverResult) {
    ShowDebugHoverResult[ShowDebugHoverResult["NOT_CHANGED"] = 0] = "NOT_CHANGED";
    ShowDebugHoverResult[ShowDebugHoverResult["NOT_AVAILABLE"] = 1] = "NOT_AVAILABLE";
    ShowDebugHoverResult[ShowDebugHoverResult["CANCELLED"] = 2] = "CANCELLED";
})(ShowDebugHoverResult || (ShowDebugHoverResult = {}));
async function doFindExpression(container, namesToFind) {
    if (!container) {
        return null;
    }
    const children = await container.getChildren();
    // look for our variable in the list. First find the parents of the hovered variable if there are any.
    const filtered = children.filter(v => namesToFind[0] === v.name);
    if (filtered.length !== 1) {
        return null;
    }
    if (namesToFind.length === 1) {
        return filtered[0];
    }
    else {
        return doFindExpression(filtered[0], namesToFind.slice(1));
    }
}
export async function findExpressionInStackFrame(stackFrame, namesToFind) {
    const scopes = await stackFrame.getScopes();
    const nonExpensive = scopes.filter(s => !s.expensive);
    const expressions = coalesce(await Promise.all(nonExpensive.map(scope => doFindExpression(scope, namesToFind))));
    // only show if all expressions found have the same value
    return expressions.length > 0 && expressions.every(e => e.value === expressions[0].value) ? expressions[0] : undefined;
}
let DebugHoverWidget = class DebugHoverWidget {
    static { DebugHoverWidget_1 = this; }
    static { this.ID = 'debug.hoverWidget'; }
    get isShowingComplexValue() {
        return this.complexValueContainer?.hidden === false;
    }
    constructor(editor, debugService, instantiationService, menuService, contextKeyService, contextMenuService) {
        this.editor = editor;
        this.debugService = debugService;
        this.instantiationService = instantiationService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        // editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.isUpdatingTree = false;
        this.highlightDecorations = this.editor.createDecorationsCollection();
        this.toDispose = [];
        this.showAtPosition = null;
        this.positionPreference = [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */];
        this.debugHoverComputer = this.instantiationService.createInstance(DebugHoverComputer, this.editor);
        this.expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
    }
    create() {
        this.domNode = $('.debug-hover-widget');
        this.complexValueContainer = dom.append(this.domNode, $('.complex-value'));
        this.complexValueTitle = dom.append(this.complexValueContainer, $('.title'));
        this.treeContainer = dom.append(this.complexValueContainer, $('.debug-hover-tree'));
        this.treeContainer.setAttribute('role', 'tree');
        const tip = dom.append(this.complexValueContainer, $('.tip'));
        tip.textContent = nls.localize({ key: 'quickTip', comment: ['"switch to editor language hover" means to show the programming language hover widget instead of the debug hover'] }, 'Hold {0} key to switch to editor language hover', isMacintosh ? 'Option' : 'Alt');
        const dataSource = this.instantiationService.createInstance(DebugHoverDataSource);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'DebugHover', this.treeContainer, new DebugHoverDelegate(), [
            this.instantiationService.createInstance(VariablesRenderer, this.expressionRenderer),
            this.instantiationService.createInstance(VisualizedVariableRenderer, this.expressionRenderer),
        ], dataSource, {
            accessibilityProvider: new DebugHoverAccessibilityProvider(),
            mouseSupport: false,
            horizontalScrolling: true,
            useShadows: false,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e.name },
            overrideStyles: {
                listBackground: editorHoverBackground
            }
        });
        this.toDispose.push(VisualizedVariableRenderer.rendererOnVisualizationRange(this.debugService.getViewModel(), this.tree));
        this.valueContainer = $('.value');
        this.valueContainer.tabIndex = 0;
        this.valueContainer.setAttribute('role', 'tooltip');
        this.scrollbar = new DomScrollableElement(this.valueContainer, { horizontal: 2 /* ScrollbarVisibility.Hidden */ });
        this.domNode.appendChild(this.scrollbar.getDomNode());
        this.toDispose.push(this.scrollbar);
        this.editor.applyFontInfo(this.domNode);
        this.domNode.style.backgroundColor = asCssVariable(editorHoverBackground);
        this.domNode.style.border = `1px solid ${asCssVariable(editorHoverBorder)}`;
        this.domNode.style.color = asCssVariable(editorHoverForeground);
        this.toDispose.push(this.tree.onContextMenu(async (e) => await this.onContextMenu(e)));
        this.toDispose.push(this.tree.onDidChangeContentHeight(() => {
            if (!this.isUpdatingTree) {
                // Don't do a layout in the middle of the async setInput
                this.layoutTreeAndContainer();
            }
        }));
        this.toDispose.push(this.tree.onDidChangeContentWidth(() => {
            if (!this.isUpdatingTree) {
                // Don't do a layout in the middle of the async setInput
                this.layoutTreeAndContainer();
            }
        }));
        this.registerListeners();
        this.editor.addContentWidget(this);
    }
    async onContextMenu(e) {
        const variable = e.element;
        if (!(variable instanceof Variable) || !variable.value) {
            return;
        }
        return openContextMenuForVariableTreeElement(this.contextKeyService, this.menuService, this.contextMenuService, MenuId.DebugHoverContext, e);
    }
    registerListeners() {
        this.toDispose.push(dom.addStandardDisposableListener(this.domNode, 'keydown', (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
            }
        }));
        this.toDispose.push(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        this.toDispose.push(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
    }
    isHovered() {
        return !!this.domNode?.matches(':hover');
    }
    isVisible() {
        return !!this._isVisible;
    }
    willBeVisible() {
        return !!this.showCancellationSource;
    }
    getId() {
        return DebugHoverWidget_1.ID;
    }
    getDomNode() {
        return this.domNode;
    }
    /**
     * Gets whether the given coordinates are in the safe triangle formed from
     * the position at which the hover was initiated.
     */
    isInSafeTriangle(x, y) {
        return this._isVisible && !!this.safeTriangle?.contains(x, y);
    }
    async showAt(position, focus, mouseEvent) {
        this.showCancellationSource?.dispose(true);
        const cancellationSource = this.showCancellationSource = new CancellationTokenSource();
        const session = this.debugService.getViewModel().focusedSession;
        if (!session || !this.editor.hasModel()) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        const result = await this.debugHoverComputer.compute(position, cancellationSource.token);
        if (cancellationSource.token.isCancellationRequested) {
            this.hide();
            return 2 /* ShowDebugHoverResult.CANCELLED */;
        }
        if (!result.range) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        if (this.isVisible() && !result.rangeChanged) {
            return 0 /* ShowDebugHoverResult.NOT_CHANGED */;
        }
        const expression = await this.debugHoverComputer.evaluate(session);
        if (cancellationSource.token.isCancellationRequested) {
            this.hide();
            return 2 /* ShowDebugHoverResult.CANCELLED */;
        }
        if (!expression || (expression instanceof Expression && !expression.available)) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        this.highlightDecorations.set([{
                range: result.range,
                options: DebugHoverWidget_1._HOVER_HIGHLIGHT_DECORATION_OPTIONS
            }]);
        return this.doShow(session, result.range.getStartPosition(), expression, focus, mouseEvent);
    }
    static { this._HOVER_HIGHLIGHT_DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'bdebug-hover-highlight',
        className: 'hoverHighlight'
    }); }
    async doShow(session, position, expression, focus, mouseEvent) {
        if (!this.domNode) {
            this.create();
        }
        this.showAtPosition = position;
        const store = new lifecycle.DisposableStore();
        this._isVisible = { store };
        if (!expression.hasChildren) {
            this.complexValueContainer.hidden = true;
            this.valueContainer.hidden = false;
            store.add(this.expressionRenderer.renderValue(this.valueContainer, expression, {
                showChanged: false,
                colorize: true,
                hover: false,
                session,
            }));
            this.valueContainer.title = '';
            this.editor.layoutContentWidget(this);
            this.safeTriangle = mouseEvent && new dom.SafeTriangle(mouseEvent.posx, mouseEvent.posy, this.domNode);
            this.scrollbar.scanDomNode();
            if (focus) {
                this.editor.render();
                this.valueContainer.focus();
            }
            return undefined;
        }
        this.valueContainer.hidden = true;
        this.expressionToRender = expression;
        store.add(this.expressionRenderer.renderValue(this.complexValueTitle, expression, { hover: false, session }));
        this.editor.layoutContentWidget(this);
        this.safeTriangle = mouseEvent && new dom.SafeTriangle(mouseEvent.posx, mouseEvent.posy, this.domNode);
        this.tree.scrollTop = 0;
        this.tree.scrollLeft = 0;
        this.complexValueContainer.hidden = false;
        if (focus) {
            this.editor.render();
            this.tree.domFocus();
        }
    }
    layoutTreeAndContainer() {
        this.layoutTree();
        this.editor.layoutContentWidget(this);
    }
    layoutTree() {
        const scrollBarHeight = 10;
        let maxHeightToAvoidCursorOverlay = Infinity;
        if (this.showAtPosition) {
            const editorTop = this.editor.getDomNode()?.offsetTop || 0;
            const containerTop = this.treeContainer.offsetTop + editorTop;
            const hoveredCharTop = this.editor.getTopForLineNumber(this.showAtPosition.lineNumber, true) - this.editor.getScrollTop();
            if (containerTop < hoveredCharTop) {
                maxHeightToAvoidCursorOverlay = hoveredCharTop + editorTop - 22; // 22 is monaco top padding https://github.com/microsoft/vscode/blob/a1df2d7319382d42f66ad7f411af01e4cc49c80a/src/vs/editor/browser/viewParts/contentWidgets/contentWidgets.ts#L364
            }
        }
        const treeHeight = Math.min(Math.max(266, this.editor.getLayoutInfo().height * 0.55), this.tree.contentHeight + scrollBarHeight, maxHeightToAvoidCursorOverlay);
        const realTreeWidth = this.tree.contentWidth;
        const treeWidth = clamp(realTreeWidth, 400, 550);
        this.tree.layout(treeHeight, treeWidth);
        this.treeContainer.style.height = `${treeHeight}px`;
        this.scrollbar.scanDomNode();
    }
    beforeRender() {
        // beforeRender will be called each time the hover size changes, and the content widget is layed out again.
        if (this.expressionToRender) {
            const expression = this.expressionToRender;
            this.expressionToRender = undefined;
            // Do this in beforeRender once the content widget is no longer display=none so that its elements' sizes will be measured correctly.
            this.isUpdatingTree = true;
            this.tree.setInput(expression).finally(() => {
                this.isUpdatingTree = false;
            });
        }
        return null;
    }
    afterRender(positionPreference) {
        if (positionPreference) {
            // Remember where the editor placed you to keep position stable #109226
            this.positionPreference = [positionPreference];
        }
    }
    hide() {
        if (this.showCancellationSource) {
            this.showCancellationSource.dispose(true);
            this.showCancellationSource = undefined;
        }
        if (!this._isVisible) {
            return;
        }
        if (dom.isAncestorOfActiveElement(this.domNode)) {
            this.editor.focus();
        }
        this._isVisible.store.dispose();
        this._isVisible = undefined;
        this.highlightDecorations.clear();
        this.editor.layoutContentWidget(this);
        this.positionPreference = [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */];
    }
    getPosition() {
        return this._isVisible ? {
            position: this.showAtPosition,
            preference: this.positionPreference
        } : null;
    }
    dispose() {
        this.toDispose = lifecycle.dispose(this.toDispose);
    }
};
DebugHoverWidget = DebugHoverWidget_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService)
], DebugHoverWidget);
export { DebugHoverWidget };
class DebugHoverAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize('treeAriaLabel', "Debug Hover");
    }
    getAriaLabel(element) {
        return nls.localize({ key: 'variableAriaLabel', comment: ['Do not translate placeholders. Placeholders are name and value of a variable.'] }, "{0}, value {1}, variables, debug", element.name, element.value);
    }
}
class DebugHoverDataSource extends AbstractExpressionDataSource {
    hasChildren(element) {
        return element.hasChildren;
    }
    doGetChildren(element) {
        return element.getChildren();
    }
}
class DebugHoverDelegate {
    getHeight(element) {
        return 18;
    }
    getTemplateId(element) {
        if (element instanceof VisualizedExpression) {
            return VisualizedVariableRenderer.ID;
        }
        return VariablesRenderer.ID;
    }
}
let DebugHoverComputer = class DebugHoverComputer {
    constructor(editor, debugService, languageFeaturesService, logService) {
        this.editor = editor;
        this.debugService = debugService;
        this.languageFeaturesService = languageFeaturesService;
        this.logService = logService;
    }
    async compute(position, token) {
        const session = this.debugService.getViewModel().focusedSession;
        if (!session || !this.editor.hasModel()) {
            return { rangeChanged: false };
        }
        const model = this.editor.getModel();
        const result = await getEvaluatableExpressionAtPosition(this.languageFeaturesService, model, position, token);
        if (!result) {
            return { rangeChanged: false };
        }
        const { range, matchingExpression } = result;
        const rangeChanged = !this._current?.range.equalsRange(range);
        this._current = { expression: matchingExpression, range: Range.lift(range) };
        return { rangeChanged, range: this._current.range };
    }
    async evaluate(session) {
        if (!this._current) {
            this.logService.error('No expression to evaluate');
            return;
        }
        const textModel = this.editor.getModel();
        const debugSource = textModel && session.getSourceForUri(textModel?.uri);
        if (session.capabilities.supportsEvaluateForHovers) {
            const expression = new Expression(this._current.expression);
            await expression.evaluate(session, this.debugService.getViewModel().focusedStackFrame, 'hover', undefined, debugSource ? {
                line: this._current.range.startLineNumber,
                column: this._current.range.startColumn,
                source: debugSource.raw,
            } : undefined);
            return expression;
        }
        else {
            const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
            if (focusedStackFrame) {
                return await findExpressionInStackFrame(focusedStackFrame, coalesce(this._current.expression.split('.').map(word => word.trim())));
            }
        }
        return undefined;
    }
};
DebugHoverComputer = __decorate([
    __param(1, IDebugService),
    __param(2, ILanguageFeaturesService),
    __param(3, ILogService)
], DebugHoverComputer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnSG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFLdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRyxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFNbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JB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