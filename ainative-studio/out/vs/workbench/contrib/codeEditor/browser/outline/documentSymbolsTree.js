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
var DocumentSymbolFilter_1;
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getAriaLabelForSymbol, symbolKindNames, SymbolKinds } from '../../../../../editor/common/languages.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { OutlineElement, OutlineGroup, OutlineModel } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import '../../../../../editor/contrib/symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { fillInSymbolsDragData } from '../../../../../platform/dnd/browser/dnd.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { withSelection } from '../../../../../platform/opener/common/opener.js';
import { listErrorForeground, listWarningForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import './documentSymbolsTree.css';
export class DocumentSymbolNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (element instanceof OutlineGroup) {
            return element.label;
        }
        else {
            return element.symbol.name;
        }
    }
}
export class DocumentSymbolAccessibilityProvider {
    constructor(_ariaLabel) {
        this._ariaLabel = _ariaLabel;
    }
    getWidgetAriaLabel() {
        return this._ariaLabel;
    }
    getAriaLabel(element) {
        if (element instanceof OutlineGroup) {
            return element.label;
        }
        else {
            return getAriaLabelForSymbol(element.symbol.name, element.symbol.kind);
        }
    }
}
export class DocumentSymbolIdentityProvider {
    getId(element) {
        return element.id;
    }
}
let DocumentSymbolDragAndDrop = class DocumentSymbolDragAndDrop {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
    }
    getDragURI(element) {
        const resource = OutlineModel.get(element)?.uri;
        if (!resource) {
            return null;
        }
        if (element instanceof OutlineElement) {
            const symbolUri = symbolRangeUri(resource, element.symbol);
            return symbolUri.fsPath + (symbolUri.fragment ? '#' + symbolUri.fragment : '');
        }
        else {
            return resource.fsPath;
        }
    }
    getDragLabel(elements, originalEvent) {
        // Multi select not supported
        if (elements.length !== 1) {
            return undefined;
        }
        const element = elements[0];
        return element instanceof OutlineElement ? element.symbol.name : element.label;
    }
    onDragStart(data, originalEvent) {
        const elements = data.elements;
        const item = elements[0];
        if (!item || !originalEvent.dataTransfer) {
            return;
        }
        const resource = OutlineModel.get(item)?.uri;
        if (!resource) {
            return;
        }
        const outlineElements = item instanceof OutlineElement ? [item] : Array.from(item.children.values());
        fillInSymbolsDragData(outlineElements.map(oe => ({
            name: oe.symbol.name,
            fsPath: resource.fsPath,
            range: oe.symbol.range,
            kind: oe.symbol.kind
        })), originalEvent);
        this._instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, outlineElements.map((oe) => ({
            resource,
            selection: oe.symbol.range,
        })), originalEvent));
    }
    onDragOver() { return false; }
    drop() { }
    dispose() { }
};
DocumentSymbolDragAndDrop = __decorate([
    __param(0, IInstantiationService)
], DocumentSymbolDragAndDrop);
export { DocumentSymbolDragAndDrop };
function symbolRangeUri(resource, symbol) {
    return withSelection(resource, symbol.range);
}
class DocumentSymbolGroupTemplate {
    static { this.id = 'DocumentSymbolGroupTemplate'; }
    constructor(labelContainer, label) {
        this.labelContainer = labelContainer;
        this.label = label;
    }
    dispose() {
        this.label.dispose();
    }
}
class DocumentSymbolTemplate {
    static { this.id = 'DocumentSymbolTemplate'; }
    constructor(container, iconLabel, iconClass, decoration) {
        this.container = container;
        this.iconLabel = iconLabel;
        this.iconClass = iconClass;
        this.decoration = decoration;
    }
}
export class DocumentSymbolVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        return element instanceof OutlineGroup
            ? DocumentSymbolGroupTemplate.id
            : DocumentSymbolTemplate.id;
    }
}
export class DocumentSymbolGroupRenderer {
    constructor() {
        this.templateId = DocumentSymbolGroupTemplate.id;
    }
    renderTemplate(container) {
        const labelContainer = dom.$('.outline-element-label');
        container.classList.add('outline-element');
        dom.append(container, labelContainer);
        return new DocumentSymbolGroupTemplate(labelContainer, new HighlightedLabel(labelContainer));
    }
    renderElement(node, _index, template) {
        template.label.set(node.element.label, createMatches(node.filterData));
    }
    disposeTemplate(_template) {
        _template.dispose();
    }
}
let DocumentSymbolRenderer = class DocumentSymbolRenderer {
    constructor(_renderMarker, target, _configurationService, _themeService) {
        this._renderMarker = _renderMarker;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this.templateId = DocumentSymbolTemplate.id;
    }
    renderTemplate(container) {
        container.classList.add('outline-element');
        const iconLabel = new IconLabel(container, { supportHighlights: true });
        const iconClass = dom.$('.outline-element-icon');
        const decoration = dom.$('.outline-element-decoration');
        container.prepend(iconClass);
        container.appendChild(decoration);
        return new DocumentSymbolTemplate(container, iconLabel, iconClass, decoration);
    }
    renderElement(node, _index, template) {
        const { element } = node;
        const extraClasses = ['nowrap'];
        const options = {
            matches: createMatches(node.filterData),
            labelEscapeNewLines: true,
            extraClasses,
            title: localize('title.template', "{0} ({1})", element.symbol.name, symbolKindNames[element.symbol.kind])
        };
        if (this._configurationService.getValue("outline.icons" /* OutlineConfigKeys.icons */)) {
            // add styles for the icons
            template.iconClass.className = '';
            template.iconClass.classList.add('outline-element-icon', 'inline', ...ThemeIcon.asClassNameArray(SymbolKinds.toIcon(element.symbol.kind)));
        }
        if (element.symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0) {
            extraClasses.push(`deprecated`);
            options.matches = [];
        }
        template.iconLabel.setLabel(element.symbol.name, element.symbol.detail, options);
        if (this._renderMarker) {
            this._renderMarkerInfo(element, template);
        }
    }
    _renderMarkerInfo(element, template) {
        if (!element.marker) {
            dom.hide(template.decoration);
            template.container.style.removeProperty('--outline-element-color');
            return;
        }
        const { count, topSev } = element.marker;
        const color = this._themeService.getColorTheme().getColor(topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
        const cssColor = color ? color.toString() : 'inherit';
        // color of the label
        const problem = this._configurationService.getValue('problems.visibility');
        const configProblems = this._configurationService.getValue("outline.problems.colors" /* OutlineConfigKeys.problemsColors */);
        if (!problem || !configProblems) {
            template.container.style.removeProperty('--outline-element-color');
        }
        else {
            template.container.style.setProperty('--outline-element-color', cssColor);
        }
        // badge with color/rollup
        if (problem === undefined) {
            return;
        }
        const configBadges = this._configurationService.getValue("outline.problems.badges" /* OutlineConfigKeys.problemsBadges */);
        if (!configBadges || !problem) {
            dom.hide(template.decoration);
        }
        else if (count > 0) {
            dom.show(template.decoration);
            template.decoration.classList.remove('bubble');
            template.decoration.innerText = count < 10 ? count.toString() : '+9';
            template.decoration.title = count === 1 ? localize('1.problem', "1 problem in this element") : localize('N.problem', "{0} problems in this element", count);
            template.decoration.style.setProperty('--outline-element-color', cssColor);
        }
        else {
            dom.show(template.decoration);
            template.decoration.classList.add('bubble');
            template.decoration.innerText = '\uea71';
            template.decoration.title = localize('deep.problem', "Contains elements with problems");
            template.decoration.style.setProperty('--outline-element-color', cssColor);
        }
    }
    disposeTemplate(_template) {
        _template.iconLabel.dispose();
    }
};
DocumentSymbolRenderer = __decorate([
    __param(2, IConfigurationService),
    __param(3, IThemeService)
], DocumentSymbolRenderer);
export { DocumentSymbolRenderer };
let DocumentSymbolFilter = class DocumentSymbolFilter {
    static { DocumentSymbolFilter_1 = this; }
    static { this.kindToConfigName = Object.freeze({
        [0 /* SymbolKind.File */]: 'showFiles',
        [1 /* SymbolKind.Module */]: 'showModules',
        [2 /* SymbolKind.Namespace */]: 'showNamespaces',
        [3 /* SymbolKind.Package */]: 'showPackages',
        [4 /* SymbolKind.Class */]: 'showClasses',
        [5 /* SymbolKind.Method */]: 'showMethods',
        [6 /* SymbolKind.Property */]: 'showProperties',
        [7 /* SymbolKind.Field */]: 'showFields',
        [8 /* SymbolKind.Constructor */]: 'showConstructors',
        [9 /* SymbolKind.Enum */]: 'showEnums',
        [10 /* SymbolKind.Interface */]: 'showInterfaces',
        [11 /* SymbolKind.Function */]: 'showFunctions',
        [12 /* SymbolKind.Variable */]: 'showVariables',
        [13 /* SymbolKind.Constant */]: 'showConstants',
        [14 /* SymbolKind.String */]: 'showStrings',
        [15 /* SymbolKind.Number */]: 'showNumbers',
        [16 /* SymbolKind.Boolean */]: 'showBooleans',
        [17 /* SymbolKind.Array */]: 'showArrays',
        [18 /* SymbolKind.Object */]: 'showObjects',
        [19 /* SymbolKind.Key */]: 'showKeys',
        [20 /* SymbolKind.Null */]: 'showNull',
        [21 /* SymbolKind.EnumMember */]: 'showEnumMembers',
        [22 /* SymbolKind.Struct */]: 'showStructs',
        [23 /* SymbolKind.Event */]: 'showEvents',
        [24 /* SymbolKind.Operator */]: 'showOperators',
        [25 /* SymbolKind.TypeParameter */]: 'showTypeParameters',
    }); }
    constructor(_prefix, _textResourceConfigService) {
        this._prefix = _prefix;
        this._textResourceConfigService = _textResourceConfigService;
    }
    filter(element) {
        const outline = OutlineModel.get(element);
        if (!(element instanceof OutlineElement)) {
            return true;
        }
        const configName = DocumentSymbolFilter_1.kindToConfigName[element.symbol.kind];
        const configKey = `${this._prefix}.${configName}`;
        return this._textResourceConfigService.getValue(outline?.uri, configKey);
    }
};
DocumentSymbolFilter = DocumentSymbolFilter_1 = __decorate([
    __param(1, ITextResourceConfigurationService)
], DocumentSymbolFilter);
export { DocumentSymbolFilter };
export class DocumentSymbolComparator {
    constructor() {
        this._collator = new dom.WindowIdleValue(mainWindow, () => new Intl.Collator(undefined, { numeric: true }));
    }
    compareByPosition(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return Range.compareRangesUsingStarts(a.symbol.range, b.symbol.range) || this._collator.value.compare(a.symbol.name, b.symbol.name);
        }
        return 0;
    }
    compareByType(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return a.symbol.kind - b.symbol.kind || this._collator.value.compare(a.symbol.name, b.symbol.name);
        }
        return 0;
    }
    compareByName(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return this._collator.value.compare(a.symbol.name, b.symbol.name) || Range.compareRangesUsingStarts(a.symbol.range, b.symbol.range);
        }
        return 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvb3V0bGluZS9kb2N1bWVudFN5bWJvbHNUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxTQUFTLEVBQTBCLE1BQU0sdURBQXVELENBQUM7QUFLMUcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBa0IscUJBQXFCLEVBQWMsZUFBZSxFQUFFLFdBQVcsRUFBYSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ25JLE9BQU8sa0VBQWtFLENBQUMsQ0FBQyw4RUFBOEU7QUFDekosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBaUIsTUFBTSw0Q0FBNEMsQ0FBQztB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