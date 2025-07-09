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
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { DefaultStyleController } from '../../../../base/browser/ui/list/listWidget.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { getListStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, focusBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { settingsHeaderForeground, settingsHeaderHoverForeground } from '../common/settingsEditorColorRegistry.js';
import { SettingsTreeFilter } from './settingsTree.js';
import { SettingsTreeGroupElement, SettingsTreeSettingElement } from './settingsTreeModels.js';
const $ = DOM.$;
let TOCTreeModel = class TOCTreeModel {
    constructor(_viewState, environmentService) {
        this._viewState = _viewState;
        this.environmentService = environmentService;
        this._currentSearchModel = null;
    }
    get settingsTreeRoot() {
        return this._settingsTreeRoot;
    }
    set settingsTreeRoot(value) {
        this._settingsTreeRoot = value;
        this.update();
    }
    get currentSearchModel() {
        return this._currentSearchModel;
    }
    set currentSearchModel(model) {
        this._currentSearchModel = model;
        this.update();
    }
    get children() {
        return this._settingsTreeRoot.children;
    }
    update() {
        if (this._settingsTreeRoot) {
            this.updateGroupCount(this._settingsTreeRoot);
        }
    }
    updateGroupCount(group) {
        group.children.forEach(child => {
            if (child instanceof SettingsTreeGroupElement) {
                this.updateGroupCount(child);
            }
        });
        const childCount = group.children
            .filter(child => child instanceof SettingsTreeGroupElement)
            .reduce((acc, cur) => acc + cur.count, 0);
        group.count = childCount + this.getGroupCount(group);
    }
    getGroupCount(group) {
        return group.children.filter(child => {
            if (!(child instanceof SettingsTreeSettingElement)) {
                return false;
            }
            if (this._currentSearchModel && !this._currentSearchModel.root.containsSetting(child.setting.key)) {
                return false;
            }
            // Check everything that the SettingsFilter checks except whether it's filtered by a category
            const isRemote = !!this.environmentService.remoteAuthority;
            return child.matchesScope(this._viewState.settingsTarget, isRemote) &&
                child.matchesAllTags(this._viewState.tagFilters) &&
                child.matchesAnyFeature(this._viewState.featureFilters) &&
                child.matchesAnyExtension(this._viewState.extensionFilters) &&
                child.matchesAnyId(this._viewState.idFilters);
        }).length;
    }
};
TOCTreeModel = __decorate([
    __param(1, IWorkbenchEnvironmentService)
], TOCTreeModel);
export { TOCTreeModel };
const TOC_ENTRY_TEMPLATE_ID = 'settings.toc.entry';
export class TOCRenderer {
    constructor(_hoverService) {
        this._hoverService = _hoverService;
        this.templateId = TOC_ENTRY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        return {
            labelElement: DOM.append(container, $('.settings-toc-entry')),
            countElement: DOM.append(container, $('.settings-toc-count')),
            elementDisposables: new DisposableStore()
        };
    }
    renderElement(node, index, template) {
        template.elementDisposables.clear();
        const element = node.element;
        const count = element.count;
        const label = element.label;
        template.labelElement.textContent = label;
        template.elementDisposables.add(this._hoverService.setupDelayedHover(template.labelElement, { content: label }));
        if (count) {
            template.countElement.textContent = ` (${count})`;
        }
        else {
            template.countElement.textContent = '';
        }
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
    }
}
class TOCTreeDelegate {
    getTemplateId(element) {
        return TOC_ENTRY_TEMPLATE_ID;
    }
    getHeight(element) {
        return 22;
    }
}
export function createTOCIterator(model, tree) {
    const groupChildren = model.children.filter(c => c instanceof SettingsTreeGroupElement);
    return Iterable.map(groupChildren, g => {
        const hasGroupChildren = g.children.some(c => c instanceof SettingsTreeGroupElement);
        return {
            element: g,
            collapsed: undefined,
            collapsible: hasGroupChildren,
            children: g instanceof SettingsTreeGroupElement ?
                createTOCIterator(g, tree) :
                undefined
        };
    });
}
class SettingsAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize({
            key: 'settingsTOC',
            comment: ['A label for the table of contents for the full settings list']
        }, "Settings Table of Contents");
    }
    getAriaLabel(element) {
        if (!element) {
            return '';
        }
        if (element instanceof SettingsTreeGroupElement) {
            return localize('groupRowAriaLabel', "{0}, group", element.label);
        }
        return '';
    }
    getAriaLevel(element) {
        let i = 1;
        while (element instanceof SettingsTreeGroupElement && element.parent) {
            i++;
            element = element.parent;
        }
        return i;
    }
}
let TOCTree = class TOCTree extends WorkbenchObjectTree {
    constructor(container, viewState, contextKeyService, listService, configurationService, hoverService, instantiationService) {
        // test open mode
        const filter = instantiationService.createInstance(SettingsTreeFilter, viewState);
        const options = {
            filter,
            multipleSelectionSupport: false,
            identityProvider: {
                getId(e) {
                    return e.id;
                }
            },
            styleController: id => new DefaultStyleController(domStylesheetsJs.createStyleSheet(container), id),
            accessibilityProvider: instantiationService.createInstance(SettingsAccessibilityProvider),
            collapseByDefault: true,
            horizontalScrolling: false,
            hideTwistiesOfChildlessElements: true,
            renderIndentGuides: RenderIndentGuides.None
        };
        super('SettingsTOC', container, new TOCTreeDelegate(), [new TOCRenderer(hoverService)], options, instantiationService, contextKeyService, listService, configurationService);
        this.style(getListStyles({
            listBackground: editorBackground,
            listFocusOutline: focusBorder,
            listActiveSelectionBackground: editorBackground,
            listActiveSelectionForeground: settingsHeaderForeground,
            listFocusAndSelectionBackground: editorBackground,
            listFocusAndSelectionForeground: settingsHeaderForeground,
            listFocusBackground: editorBackground,
            listFocusForeground: settingsHeaderHoverForeground,
            listHoverForeground: settingsHeaderHoverForeground,
            listHoverBackground: editorBackground,
            listInactiveSelectionBackground: editorBackground,
            listInactiveSelectionForeground: settingsHeaderForeground,
            listInactiveFocusBackground: editorBackground,
            listInactiveFocusOutline: editorBackground,
            treeIndentGuidesStroke: undefined,
            treeInactiveIndentGuidesStroke: undefined
        }));
    }
};
TOCTree = __decorate([
    __param(2, IContextKeyService),
    __param(3, IListService),
    __param(4, IConfigurationService),
    __param(5, IHoverService),
    __param(6, IInstantiationService)
], TOCTree);
export { TOCTree };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9jVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3RvY1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLHNCQUFzQixFQUE4QixNQUFNLGdEQUFnRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUErQixtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7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