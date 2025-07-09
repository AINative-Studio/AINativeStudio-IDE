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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { IDebugVisualizerService } from '../common/debugVisualizers.js';
const $ = dom.$;
export function renderViewTree(container) {
    const treeContainer = $('.');
    treeContainer.classList.add('debug-view-content', 'file-icon-themable-tree');
    container.appendChild(treeContainer);
    return treeContainer;
}
/** Splits highlights based on matching of the {@link expressionAndScopeLabelProvider} */
export const splitExpressionOrScopeHighlights = (e, highlights) => {
    const nameEndsAt = e.name.length;
    const labelBeginsAt = e.name.length + 2;
    const name = [];
    const value = [];
    for (const hl of highlights) {
        if (hl.start < nameEndsAt) {
            name.push({ start: hl.start, end: Math.min(hl.end, nameEndsAt) });
        }
        if (hl.end > labelBeginsAt) {
            value.push({ start: Math.max(hl.start - labelBeginsAt, 0), end: hl.end - labelBeginsAt });
        }
    }
    return { name, value };
};
/** Keyboard label provider for expression and scope tree elements. */
export const expressionAndScopeLabelProvider = {
    getKeyboardNavigationLabel(e) {
        const stripAnsi = e.getSession()?.rememberedCapabilities?.supportsANSIStyling;
        return `${e.name}: ${stripAnsi ? removeAnsiEscapeCodes(e.value) : e.value}`;
    },
};
let AbstractExpressionDataSource = class AbstractExpressionDataSource {
    constructor(debugService, debugVisualizer) {
        this.debugService = debugService;
        this.debugVisualizer = debugVisualizer;
    }
    async getChildren(element) {
        const vm = this.debugService.getViewModel();
        const children = await this.doGetChildren(element);
        return Promise.all(children.map(async (r) => {
            const vizOrTree = vm.getVisualizedExpression(r);
            if (typeof vizOrTree === 'string') {
                const viz = await this.debugVisualizer.getVisualizedNodeFor(vizOrTree, r);
                if (viz) {
                    vm.setVisualizedExpression(r, viz);
                    return viz;
                }
            }
            else if (vizOrTree) {
                return vizOrTree;
            }
            return r;
        }));
    }
};
AbstractExpressionDataSource = __decorate([
    __param(0, IDebugService),
    __param(1, IDebugVisualizerService)
], AbstractExpressionDataSource);
export { AbstractExpressionDataSource };
let AbstractExpressionsRenderer = class AbstractExpressionsRenderer {
    constructor(debugService, contextViewService, hoverService) {
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
    }
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        const expression = dom.append(container, $('.expression'));
        const name = dom.append(expression, $('span.name'));
        const lazyButton = dom.append(expression, $('span.lazy-button'));
        lazyButton.classList.add(...ThemeIcon.asClassNameArray(Codicon.eye));
        templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), lazyButton, localize('debug.lazyButton.tooltip', "Click to expand")));
        const type = dom.append(expression, $('span.type'));
        const value = dom.append(expression, $('span.value'));
        const label = templateDisposable.add(new HighlightedLabel(name));
        const inputBoxContainer = dom.append(expression, $('.inputBoxContainer'));
        let actionBar;
        if (this.renderActionBar) {
            dom.append(expression, $('.span.actionbar-spacer'));
            actionBar = templateDisposable.add(new ActionBar(expression));
        }
        const template = { expression, name, type, value, label, inputBoxContainer, actionBar, elementDisposable: new DisposableStore(), templateDisposable, lazyButton, currentElement: undefined };
        templateDisposable.add(dom.addDisposableListener(lazyButton, dom.EventType.CLICK, () => {
            if (template.currentElement) {
                this.debugService.getViewModel().evaluateLazyExpression(template.currentElement);
            }
        }));
        return template;
    }
    renderExpressionElement(element, node, data) {
        data.currentElement = element;
        this.renderExpression(node.element, data, createMatches(node.filterData));
        if (data.actionBar) {
            this.renderActionBar(data.actionBar, element, data);
        }
        const selectedExpression = this.debugService.getViewModel().getSelectedExpression();
        if (element === selectedExpression?.expression || (element instanceof Variable && element.errorMessage)) {
            const options = this.getInputBoxOptions(element, !!selectedExpression?.settingWatch);
            if (options) {
                data.elementDisposable.add(this.renderInputBox(data.name, data.value, data.inputBoxContainer, options));
            }
        }
    }
    renderInputBox(nameElement, valueElement, inputBoxContainer, options) {
        nameElement.style.display = 'none';
        valueElement.style.display = 'none';
        inputBoxContainer.style.display = 'initial';
        dom.clearNode(inputBoxContainer);
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, { ...options, inputBoxStyles: defaultInputBoxStyles });
        inputBox.value = options.initialValue;
        inputBox.focus();
        inputBox.select();
        const done = createSingleCallFunction((success, finishEditing) => {
            nameElement.style.display = '';
            valueElement.style.display = '';
            inputBoxContainer.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            if (finishEditing) {
                this.debugService.getViewModel().setSelectedExpression(undefined, false);
                options.onFinish(value, success);
            }
        });
        const toDispose = [
            inputBox,
            dom.addStandardDisposableListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e) => {
                const isEscape = e.equals(9 /* KeyCode.Escape */);
                const isEnter = e.equals(3 /* KeyCode.Enter */);
                if (isEscape || isEnter) {
                    e.preventDefault();
                    e.stopPropagation();
                    done(isEnter, true);
                }
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.BLUR, () => {
                done(true, true);
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.CLICK, e => {
                // Do not expand / collapse selected elements
                e.preventDefault();
                e.stopPropagation();
            })
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable.dispose();
        templateData.templateDisposable.dispose();
    }
};
AbstractExpressionsRenderer = __decorate([
    __param(0, IDebugService),
    __param(1, IContextViewService),
    __param(2, IHoverService)
], AbstractExpressionsRenderer);
export { AbstractExpressionsRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2Jhc2VEZWJ1Z1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFjLE1BQU0sa0VBQWtFLENBQUM7QUFDaEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUEyQixRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUdyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxlQUFlLEVBQWUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxD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