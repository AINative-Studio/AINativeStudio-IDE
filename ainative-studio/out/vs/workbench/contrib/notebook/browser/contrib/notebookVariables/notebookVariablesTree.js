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
var NotebookVariableRenderer_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../../../../../platform/list/browser/listService.js';
import { DebugExpressionRenderer } from '../../../../debug/browser/debugExpressionRenderer.js';
const $ = dom.$;
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
export class NotebookVariablesTree extends WorkbenchObjectTree {
}
export class NotebookVariablesDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return NotebookVariableRenderer.ID;
    }
}
let NotebookVariableRenderer = class NotebookVariableRenderer {
    static { NotebookVariableRenderer_1 = this; }
    static { this.ID = 'variableElement'; }
    get templateId() {
        return NotebookVariableRenderer_1.ID;
    }
    constructor(instantiationService) {
        this.expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
    }
    renderTemplate(container) {
        const expression = dom.append(container, $('.expression'));
        const name = dom.append(expression, $('span.name'));
        const value = dom.append(expression, $('span.value'));
        const template = { expression, name, value, elementDisposables: new DisposableStore() };
        return template;
    }
    renderElement(element, _index, data) {
        const text = element.element.value.trim() !== '' ? `${element.element.name}:` : element.element.name;
        data.name.textContent = text;
        data.name.title = element.element.type ?? '';
        data.elementDisposables.add(this.expressionRenderer.renderValue(data.value, element.element, {
            colorize: true,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            session: undefined,
        }));
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
    }
};
NotebookVariableRenderer = NotebookVariableRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], NotebookVariableRenderer);
export { NotebookVariableRenderer };
export class NotebookVariableAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('debugConsole', "Notebook Variables");
    }
    getAriaLabel(element) {
        return localize('notebookVariableAriaLabel', "Variable {0}, value {1}", element.name, element.value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va1ZhcmlhYmxlc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFLN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUcvRixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxDQUFDO0FBRWhELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxtQkFBNkM7Q0FBSTtBQUU1RixNQUFNLE9BQU8seUJBQXlCO0lBRXJDLFNBQVMsQ0FBQyxPQUFpQztRQUMxQyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBaUM7UUFDOUMsT0FBTyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNEO0FBU00sSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7O2FBSXBCLE9BQUUsR0FBRyxpQkFBaUIsQUFBcEIsQ0FBcUI7SUFFdkMsSUFBSSxVQUFVO1FBQ2IsT0FBTywwQkFBd0Is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