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
var ReplGroupRenderer_1, ReplOutputElementRenderer_1, ReplVariablesRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import severity from '../../../../base/common/severity.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { RawObjectReplElement, ReplEvaluationInput, ReplEvaluationResult, ReplGroup, ReplOutputElement, ReplVariableElement } from '../common/replModel.js';
import { AbstractExpressionsRenderer } from './baseDebugView.js';
import { debugConsoleEvaluationInput } from './debugIcons.js';
const $ = dom.$;
export class ReplEvaluationInputsRenderer {
    static { this.ID = 'replEvaluationInput'; }
    get templateId() {
        return ReplEvaluationInputsRenderer.ID;
    }
    renderTemplate(container) {
        dom.append(container, $('span.arrow' + ThemeIcon.asCSSSelector(debugConsoleEvaluationInput)));
        const input = dom.append(container, $('.expression'));
        const label = new HighlightedLabel(input);
        return { label };
    }
    renderElement(element, index, templateData) {
        const evaluation = element.element;
        templateData.label.set(evaluation.value, createMatches(element.filterData));
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
let ReplGroupRenderer = class ReplGroupRenderer {
    static { ReplGroupRenderer_1 = this; }
    static { this.ID = 'replGroup'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplGroupRenderer_1.ID;
    }
    renderTemplate(container) {
        container.classList.add('group');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        const label = dom.append(expression, $('span.label'));
        const source = this.instaService.createInstance(SourceWidget, expression);
        return { label, source };
    }
    renderElement(element, _index, templateData) {
        templateData.elementDisposable?.dispose();
        const replGroup = element.element;
        dom.clearNode(templateData.label);
        templateData.elementDisposable = this.expressionRenderer.renderValue(templateData.label, replGroup.name, { wasANSI: true, session: element.element.session });
        templateData.source.setSource(replGroup.sourceData);
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable?.dispose();
        templateData.source.dispose();
    }
};
ReplGroupRenderer = ReplGroupRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplGroupRenderer);
export { ReplGroupRenderer };
export class ReplEvaluationResultsRenderer {
    static { this.ID = 'replEvaluationResult'; }
    get templateId() {
        return ReplEvaluationResultsRenderer.ID;
    }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    renderTemplate(container) {
        const output = dom.append(container, $('.evaluation-result.expression'));
        const value = dom.append(output, $('span.value'));
        return { value, elementStore: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.elementStore.clear();
        const expression = element.element;
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, expression, {
            colorize: true,
            hover: false,
            session: element.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
    }
}
let ReplOutputElementRenderer = class ReplOutputElementRenderer {
    static { ReplOutputElementRenderer_1 = this; }
    static { this.ID = 'outputReplElement'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplOutputElementRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        data.container = container;
        data.countContainer = dom.append(expression, $('.count-badge-wrapper'));
        data.count = new CountBadge(data.countContainer, {}, defaultCountBadgeStyles);
        data.value = dom.append(expression, $('span.value.label'));
        data.source = this.instaService.createInstance(SourceWidget, expression);
        data.elementDisposable = new DisposableStore();
        return data;
    }
    renderElement({ element }, index, templateData) {
        templateData.elementDisposable.clear();
        this.setElementCount(element, templateData);
        templateData.elementDisposable.add(element.onDidChangeCount(() => this.setElementCount(element, templateData)));
        // value
        dom.clearNode(templateData.value);
        // Reset classes to clear ansi decorations since templates are reused
        templateData.value.className = 'value';
        const locationReference = element.expression?.valueLocationReference;
        templateData.elementDisposable.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            wasANSI: true,
            session: element.session,
            locationReference,
            hover: false,
        }));
        templateData.value.classList.add((element.severity === severity.Warning) ? 'warn' : (element.severity === severity.Error) ? 'error' : (element.severity === severity.Ignore) ? 'ignore' : 'info');
        templateData.source.setSource(element.sourceData);
        templateData.getReplElementSource = () => element.sourceData;
    }
    setElementCount(element, templateData) {
        if (element.count >= 2) {
            templateData.count.setCount(element.count);
            templateData.countContainer.hidden = false;
        }
        else {
            templateData.countContainer.hidden = true;
        }
    }
    disposeTemplate(templateData) {
        templateData.source.dispose();
        templateData.elementDisposable.dispose();
        templateData.count.dispose();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
    }
};
ReplOutputElementRenderer = ReplOutputElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplOutputElementRenderer);
export { ReplOutputElementRenderer };
let ReplVariablesRenderer = class ReplVariablesRenderer extends AbstractExpressionsRenderer {
    static { ReplVariablesRenderer_1 = this; }
    static { this.ID = 'replVariable'; }
    get templateId() {
        return ReplVariablesRenderer_1.ID;
    }
    constructor(expressionRenderer, debugService, contextViewService, hoverService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
    }
    renderElement(node, _index, data) {
        const element = node.element;
        data.elementDisposable.clear();
        super.renderExpressionElement(element instanceof ReplVariableElement ? element.expression : element, node, data);
    }
    renderExpression(expression, data, highlights) {
        const isReplVariable = expression instanceof ReplVariableElement;
        if (isReplVariable || !expression.name) {
            data.label.set('');
            const value = isReplVariable ? expression.expression : expression;
            data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, value, { colorize: true, hover: false, session: expression.getSession() }));
            data.expression.classList.remove('nested-variable');
        }
        else {
            data.elementDisposable.add(this.expressionRenderer.renderVariable(data, expression, { showChanged: true, highlights }));
            data.expression.classList.toggle('nested-variable', isNestedVariable(expression));
        }
    }
    getInputBoxOptions(expression) {
        return undefined;
    }
};
ReplVariablesRenderer = ReplVariablesRenderer_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ReplVariablesRenderer);
export { ReplVariablesRenderer };
export class ReplRawObjectsRenderer {
    static { this.ID = 'rawObject'; }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    get templateId() {
        return ReplRawObjectsRenderer.ID;
    }
    renderTemplate(container) {
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression'));
        const name = dom.append(expression, $('span.name'));
        const label = new HighlightedLabel(name);
        const value = dom.append(expression, $('span.value'));
        return { container, expression, name, label, value, elementStore: new DisposableStore() };
    }
    renderElement(node, index, templateData) {
        templateData.elementStore.clear();
        // key
        const element = node.element;
        templateData.label.set(element.name ? `${element.name}:` : '', createMatches(node.filterData));
        if (element.name) {
            templateData.name.textContent = `${element.name}:`;
        }
        else {
            templateData.name.textContent = '';
        }
        // value
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            hover: false,
            session: node.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
        templateData.label.dispose();
    }
}
function isNestedVariable(element) {
    return element instanceof Variable && (element.parent instanceof ReplEvaluationResult || element.parent instanceof Variable);
}
export class ReplDelegate extends CachedListVirtualDelegate {
    constructor(configurationService, replOptions) {
        super();
        this.configurationService = configurationService;
        this.replOptions = replOptions;
    }
    getHeight(element) {
        const config = this.configurationService.getValue('debug');
        if (!config.console.wordWrap) {
            return this.estimateHeight(element, true);
        }
        return super.getHeight(element);
    }
    /**
     * With wordWrap enabled, this is an estimate. With wordWrap disabled, this is the real height that the list will use.
     */
    estimateHeight(element, ignoreValueLength = false) {
        const lineHeight = this.replOptions.replConfiguration.lineHeight;
        const countNumberOfLines = (str) => str.match(/\n/g)?.length ?? 0;
        const hasValue = (e) => typeof e.value === 'string';
        if (hasValue(element) && !isNestedVariable(element)) {
            const value = element.value;
            const valueRows = countNumberOfLines(value)
                + (ignoreValueLength ? 0 : Math.floor(value.length / 70)) // Make an estimate for wrapping
                + (element instanceof ReplOutputElement ? 0 : 1); // A SimpleReplElement ends in \n if it's a complete line
            return Math.max(valueRows, 1) * lineHeight;
        }
        return lineHeight;
    }
    getTemplateId(element) {
        if (element instanceof Variable || element instanceof ReplVariableElement) {
            return ReplVariablesRenderer.ID;
        }
        if (element instanceof ReplEvaluationResult) {
            return ReplEvaluationResultsRenderer.ID;
        }
        if (element instanceof ReplEvaluationInput) {
            return ReplEvaluationInputsRenderer.ID;
        }
        if (element instanceof ReplOutputElement) {
            return ReplOutputElementRenderer.ID;
        }
        if (element instanceof ReplGroup) {
            return ReplGroupRenderer.ID;
        }
        return ReplRawObjectsRenderer.ID;
    }
    hasDynamicHeight(element) {
        if (isNestedVariable(element)) {
            // Nested variables should always be in one line #111843
            return false;
        }
        // Empty elements should not have dynamic height since they will be invisible
        return element.toString().length > 0;
    }
}
function isDebugSession(obj) {
    return typeof obj.getReplElements === 'function';
}
export class ReplDataSource {
    hasChildren(element) {
        if (isDebugSession(element)) {
            return true;
        }
        return !!element.hasChildren;
    }
    getChildren(element) {
        if (isDebugSession(element)) {
            return Promise.resolve(element.getReplElements());
        }
        return Promise.resolve(element.getChildren());
    }
}
export class ReplAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('debugConsole', "Debug Console");
    }
    getAriaLabel(element) {
        if (element instanceof Variable) {
            return localize('replVariableAriaLabel', "Variable {0}, value {1}", element.name, element.value);
        }
        if (element instanceof ReplOutputElement || element instanceof ReplEvaluationInput || element instanceof ReplEvaluationResult) {
            return element.value + (element instanceof ReplOutputElement && element.count > 1 ? localize({ key: 'occurred', comment: ['Front will the value of the debug console element. Placeholder will be replaced by a number which represents occurrance count.'] }, ", occurred {0} times", element.count) : '');
        }
        if (element instanceof RawObjectReplElement) {
            return localize('replRawObjectAriaLabel', "Debug console variable {0}, value {1}", element.name, element.value);
        }
        if (element instanceof ReplGroup) {
            return localize('replGroup', "Debug console group {0}", element.name);
        }
        return '';
    }
}
let SourceWidget = class SourceWidget extends Disposable {
    constructor(container, editorService, hoverService, labelService) {
        super();
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.el = dom.append(container, $('.source'));
        this._register(dom.addDisposableListener(this.el, 'click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (this.source) {
                this.source.source.openInEditor(editorService, {
                    startLineNumber: this.source.lineNumber,
                    startColumn: this.source.column,
                    endLineNumber: this.source.lineNumber,
                    endColumn: this.source.column
                });
            }
        }));
    }
    setSource(source) {
        this.source = source;
        this.el.textContent = source ? `${basename(source.source.name)}:${source.lineNumber}` : '';
        this.hover ??= this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.el, ''));
        this.hover.update(source ? `${this.labelService.getUriLabel(source.source.uri)}:${source.lineNumber}` : '');
    }
};
SourceWidget = __decorate([
    __param(1, IEditorService),
    __param(2, IHoverService),
    __param(3, ILabelService)
], SourceWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbFZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3JlcGxWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLGtFQUFrRSxDQUFDO0FBRWhILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR3JGLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBdUIsYUFBYSxFQUF5SCxNQUFNLG9CQUFvQixDQUFDO0FBQy9MLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUosT0FBTyxFQUFFLDJCQUEyQixFQUE2QyxNQUFNLG9CQUFvQixDQUFDO0FBRTVHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTlELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFvQ2hCLE1BQU0sT0FBTyw0QkFBNEI7YUFDeEIsT0FBRSxHQUFHLHFCQUFxQixDQUFDO0lBRTNDLElBQUksVUFBVTtRQUNiLE9BQU8sNEJBQTRCLENBQUMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBbUQsRUFBRSxLQUFhLEVBQUUsWUFBOEM7UUFDL0gsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNuQyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQThDO1FBQzdELFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQzs7QUFHSyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjs7YUFDYixPQUFFLEdBQUcsV0FBVyxBQUFkLENBQWU7SUFFakMsWUFDa0Isa0JBQTJDLEVBQ3BCLFlBQW1DO1FBRDFELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBeUI7UUFDcEIsaUJBQVksR0FBWixZQUFZLENBQXVCO0lBQ3hFLENBQUM7SUFFTCxJQUFJLFVBQVU7UUFDYixPQUFPLG1CQUFpQixDQUFDLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUF5QyxFQUFFLE1BQWMsRUFBRSxZQUFvQztRQUU1RyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNsQyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxZQUFZLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDOUosWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxlQUFlLENBQUMsWUFBb0M7UUFDbkQsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQzFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQzs7QUFoQ1csaUJBQWlCO0lBSzNCLFdBQUEscUJBQXFCLENBQUE7R0FMWCxpQkFBaUIsQ0FpQzdCOztBQUVELE1BQU0sT0FBTyw2QkFBNkI7YUFDekIsT0FBRSxHQUFHLHNCQUFzQixDQUFDO0lBRTVDLElBQUksVUFBVTtRQUNiLE9BQU8sNkJBQTZCLENBQUMsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxZQUNrQixrQkFBMkM7UUFBM0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUF5QjtJQUN6RCxDQUFDO0lBRUwsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDekUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFbEQsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxlQUFlLEVBQUUsRUFBRSxDQUFDO0lBQ3ZELENBQUM7SUFFRCxhQUFhLENBQUMsT0FBK0QsRUFBRSxLQUFhLEVBQUUsWUFBK0M7UUFDNUksWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQ25DLFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUU7WUFDakcsUUFBUSxFQUFFLElBQUk7WUFDZCxLQUFLLEVBQUUsS0FBSztZQUNaLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtTQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBK0M7UUFDOUQsWUFBWSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNyQyxDQUFDOztBQUdLLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCOzthQUNyQixPQUFFLEdBQUcsbUJBQW1CLEFBQXRCLENBQXVCO0lBRXpDLFlBQ2tCLGtCQUEyQyxFQUNwQixZQUFtQztRQUQxRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1FBQ3BCLGlCQUFZLEdBQVosWUFBWSxDQUF1QjtJQUN4RSxDQUFDO0lBRUwsSUFBSSxVQUFVO1FBQ2IsT0FBTywyQkFBeUIsQ0FBQyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLElBQUksR0FBbUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRSxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDO1FBRW5GLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRS9DLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELGFBQWEsQ0FBQyxFQUFFLE9BQU8sRUFBNEMsRUFBRSxLQUFhLEVBQUUsWUFBNEM7UUFDL0gsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzVDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoSCxRQUFRO1FBQ1IsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMscUVBQXFFO1FBQ3JFLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztRQUV2QyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsc0JBQXNCLENBQUM7UUFDckUsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUN6RyxPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixpQkFBaUI7WUFDakIsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUMsQ0FBQztRQUVKLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsTSxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEQsWUFBWSxDQUFDLG9CQUFvQixHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7SUFDOUQsQ0FBQztJQUVPLGVBQWUsQ0FBQyxPQUEwQixFQUFFLFlBQTRDO1FBQy9GLElBQUksT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN4QixZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0MsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQTRDO1FBQzNELFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUFrRCxFQUFFLE1BQWMsRUFBRSxZQUE0QztRQUM5SCxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEMsQ0FBQzs7QUFsRVcseUJBQXlCO0lBS25DLFdBQUEscUJBQXFCLENBQUE7R0FMWCx5QkFBeUIsQ0FtRXJDOztBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsMkJBQThEOzthQUV4RixPQUFFLEdBQUcsY0FBYyxBQUFqQixDQUFrQjtJQUVwQyxJQUFJLFVBQVU7UUFDYixPQUFPLHVCQUFxQixDQUFDLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsWUFDa0Isa0JBQTJDLEVBQzdDLFlBQTJCLEVBQ3JCLGtCQUF1QyxFQUM3QyxZQUEyQjtRQUUxQyxLQUFLLENBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxDQUFDO1FBTHJDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBeUI7SUFNN0QsQ0FBQztJQUVNLGFBQWEsQ0FBQyxJQUE4RCxFQUFFLE1BQWMsRUFBRSxJQUE2QjtRQUNqSSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMvQixLQUFLLENBQUMsdUJBQXVCLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xILENBQUM7SUFFUyxnQkFBZ0IsQ0FBQyxVQUE2QyxFQUFFLElBQTZCLEVBQUUsVUFBd0I7UUFDaEksTUFBTSxjQUFjLEdBQUcsVUFBVSxZQUFZLG1CQUFtQixDQUFDO1FBQ2pFLElBQUksY0FBYyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQ2xFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZKLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFzQixFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkYsQ0FBQztJQUNGLENBQUM7SUFFUyxrQkFBa0IsQ0FBQyxVQUF1QjtRQUNuRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDOztBQXRDVyxxQkFBcUI7SUFVL0IsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0dBWkgscUJBQXFCLENBdUNqQzs7QUFFRCxNQUFNLE9BQU8sc0JBQXNCO2FBQ2xCLE9BQUUsR0FBRyxXQUFXLENBQUM7SUFFakMsWUFDa0Isa0JBQTJDO1FBQTNDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBeUI7SUFDekQsQ0FBQztJQUVMLElBQUksVUFBVTtRQUNiLE9BQU8sc0JBQXNCLENBQUMsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbEMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRXRELE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLGVBQWUsRUFBRSxFQUFFLENBQUM7SUFDM0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFpRCxFQUFFLEtBQWEsRUFBRSxZQUF3QztRQUN2SCxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxDLE1BQU07UUFDTixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQy9GLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDO1FBQ3BELENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3BDLENBQUM7UUFFRCxRQUFRO1FBQ1IsWUFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDcEcsS0FBSyxFQUFFLEtBQUs7WUFDWixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7U0FDbEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXdDO1FBQ3ZELFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDOztBQUdGLFNBQVMsZ0JBQWdCLENBQUMsT0FBcUI7SUFDOUMsT0FBTyxPQUFPLFlBQVksUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sWUFBWSxvQkFBb0IsSUFBSSxPQUFPLENBQUMsTUFBTSxZQUFZLFFBQVEsQ0FBQyxDQUFDO0FBQzlILENBQUM7QUFFRCxNQUFNLE9BQU8sWUFBYSxTQUFRLHlCQUF1QztJQUV4RSxZQUNrQixvQkFBMkMsRUFDM0MsV0FBeUI7UUFFMUMsS0FBSyxFQUFFLENBQUM7UUFIUyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBRzNDLENBQUM7SUFFUSxTQUFTLENBQUMsT0FBcUI7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBc0IsT0FBTyxDQUFDLENBQUM7UUFFaEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNPLGNBQWMsQ0FBQyxPQUFxQixFQUFFLGlCQUFpQixHQUFHLEtBQUs7UUFDeEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUM7UUFDakUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQzFFLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBTSxFQUEwQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQztRQUVqRixJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUM1QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7a0JBQ3hDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDO2tCQUN4RixDQUFDLE9BQU8sWUFBWSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHlEQUF5RDtZQUU1RyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUM1QyxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFxQjtRQUNsQyxJQUFJLE9BQU8sWUFBWSxRQUFRLElBQUksT0FBTyxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDM0UsT0FBTyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLG9CQUFvQixFQUFFLENBQUM7WUFDN0MsT0FBTyw2QkFBNkIsQ0FBQyxFQUFFLENBQUM7UUFDekMsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDNUMsT0FBTyw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLGlCQUFpQixFQUFFLENBQUM7WUFDMUMsT0FBTyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7UUFDckMsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8saUJBQWlCLENBQUMsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFFRCxPQUFPLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsT0FBcUI7UUFDckMsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQy9CLHdEQUF3RDtZQUN4RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCw2RUFBNkU7UUFDN0UsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUFRO0lBQy9CLE9BQU8sT0FBTyxHQUFHLENBQUMsZUFBZSxLQUFLLFVBQVUsQ0FBQztBQUNsRCxDQUFDO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFFMUIsV0FBVyxDQUFDLE9BQXFDO1FBQ2hELElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxDQUFDLENBQThDLE9BQVEsQ0FBQyxXQUFXLENBQUM7SUFDNUUsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFxQztRQUNoRCxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFxQyxPQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUNwRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBRXJDLGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELFlBQVksQ0FBQyxPQUFxQjtRQUNqQyxJQUFJLE9BQU8sWUFBWSxRQUFRLEVBQUUsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRyxDQUFDO1FBQ0QsSUFBSSxPQUFPLFlBQVksaUJBQWlCLElBQUksT0FBTyxZQUFZLG1CQUFtQixJQUFJLE9BQU8sWUFBWSxvQkFBb0IsRUFBRSxDQUFDO1lBQy9ILE9BQU8sT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sWUFBWSxpQkFBaUIsSUFBSSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxnSUFBZ0ksQ0FBQyxFQUFFLEVBQzVQLHNCQUFzQixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLG9CQUFvQixFQUFFLENBQUM7WUFDN0MsT0FBTyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsdUNBQXVDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakgsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sUUFBUSxDQUFDLFdBQVcsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztDQUNEO0FBRUQsSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLFVBQVU7SUFLcEMsWUFBWSxTQUFzQixFQUNqQixhQUE2QixFQUNiLFlBQTJCLEVBQzNCLFlBQTJCO1FBRTNELEtBQUssRUFBRSxDQUFDO1FBSHdCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRzNELElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDOUQsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwQixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRTtvQkFDOUMsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtvQkFDdkMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtvQkFDL0IsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtvQkFDckMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtpQkFDN0IsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDO0lBRU0sU0FBUyxDQUFDLE1BQTJCO1FBQzNDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUUzRixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEgsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3RyxDQUFDO0NBQ0QsQ0FBQTtBQWxDSyxZQUFZO0lBTWYsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0dBUlYsWUFBWSxDQWtDakIifQ==