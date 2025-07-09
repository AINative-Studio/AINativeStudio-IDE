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
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { Event } from '../../../../base/common/event.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { ISCMViewService } from '../common/scm.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { collectContextMenuActions, getActionViewItemProvider } from './util.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class ListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return RepositoryRenderer.TEMPLATE_ID;
    }
}
let SCMRepositoriesViewPane = class SCMRepositoriesViewPane extends ViewPane {
    constructor(options, scmViewService, keybindingService, contextMenuService, instantiationService, viewDescriptorService, contextKeyService, configurationService, openerService, themeService, hoverService) {
        super({ ...options, titleMenuId: MenuId.SCMSourceControlTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.scmViewService = scmViewService;
        this.disposables = new DisposableStore();
    }
    renderBody(container) {
        super.renderBody(container);
        const listContainer = append(container, $('.scm-view.scm-repositories-view'));
        const updateProviderCountVisibility = () => {
            const value = this.configurationService.getValue('scm.providerCountBadge');
            listContainer.classList.toggle('hide-provider-counts', value === 'hidden');
            listContainer.classList.toggle('auto-provider-counts', value === 'auto');
        };
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.providerCountBadge'), this.disposables)(updateProviderCountVisibility));
        updateProviderCountVisibility();
        const delegate = new ListDelegate();
        const renderer = this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMSourceControlInline, getActionViewItemProvider(this.instantiationService));
        const identityProvider = { getId: (r) => r.provider.id };
        this.list = this.instantiationService.createInstance(WorkbenchList, `SCM Main`, listContainer, delegate, [renderer], {
            identityProvider,
            horizontalScrolling: false,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            accessibilityProvider: {
                getAriaLabel(r) {
                    return r.provider.label;
                },
                getWidgetAriaLabel() {
                    return localize('scm', "Source Control Repositories");
                }
            }
        });
        this._register(this.list);
        this._register(this.list.onDidChangeSelection(this.onListSelectionChange, this));
        this._register(this.list.onDidChangeFocus(this.onDidChangeFocus, this));
        this._register(this.list.onContextMenu(this.onListContextMenu, this));
        this._register(this.scmViewService.onDidChangeRepositories(this.onDidChangeRepositories, this));
        this._register(this.scmViewService.onDidChangeVisibleRepositories(this.updateListSelection, this));
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('scm.repositories.visible')) {
                    this.updateBodySize();
                }
            }));
        }
        this.onDidChangeRepositories();
        this.updateListSelection();
    }
    onDidChangeRepositories() {
        this.list.splice(0, this.list.length, this.scmViewService.repositories);
        this.updateBodySize();
    }
    focus() {
        super.focus();
        this.list.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.list.layout(height, width);
    }
    updateBodySize() {
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            return;
        }
        const visibleCount = this.configurationService.getValue('scm.repositories.visible');
        const empty = this.list.length === 0;
        const size = Math.min(this.list.length, visibleCount) * 22;
        this.minimumBodySize = visibleCount === 0 ? 22 : size;
        this.maximumBodySize = visibleCount === 0 ? Number.POSITIVE_INFINITY : empty ? Number.POSITIVE_INFINITY : size;
    }
    onListContextMenu(e) {
        if (!e.element) {
            return;
        }
        const provider = e.element.provider;
        const menus = this.scmViewService.menus.getRepositoryMenus(provider);
        const menu = menus.repositoryContextMenu;
        const actions = collectContextMenuActions(menu);
        const actionRunner = new RepositoryActionRunner(() => {
            return this.list.getSelectedElements();
        });
        actionRunner.onWillRun(() => this.list.domFocus());
        this.contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => provider,
            onHide: () => actionRunner.dispose()
        });
    }
    onListSelectionChange(e) {
        if (e.browserEvent && e.elements.length > 0) {
            const scrollTop = this.list.scrollTop;
            this.scmViewService.visibleRepositories = e.elements;
            this.list.scrollTop = scrollTop;
        }
    }
    onDidChangeFocus(e) {
        if (e.browserEvent && e.elements.length > 0) {
            this.scmViewService.focus(e.elements[0]);
        }
    }
    updateListSelection() {
        const oldSelection = this.list.getSelection();
        const oldSet = new Set(Iterable.map(oldSelection, i => this.list.element(i)));
        const set = new Set(this.scmViewService.visibleRepositories);
        const added = new Set(Iterable.filter(set, r => !oldSet.has(r)));
        const removed = new Set(Iterable.filter(oldSet, r => !set.has(r)));
        if (added.size === 0 && removed.size === 0) {
            return;
        }
        const selection = oldSelection
            .filter(i => !removed.has(this.list.element(i)));
        for (let i = 0; i < this.list.length; i++) {
            if (added.has(this.list.element(i))) {
                selection.push(i);
            }
        }
        this.list.setSelection(selection);
        if (selection.length > 0 && selection.indexOf(this.list.getFocus()[0]) === -1) {
            this.list.setAnchor(selection[0]);
            this.list.setFocus([selection[0]]);
        }
    }
    dispose() {
        this.disposables.dispose();
        super.dispose();
    }
};
SCMRepositoriesViewPane = __decorate([
    __param(1, ISCMViewService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IViewDescriptorService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService)
], SCMRepositoriesViewPane);
export { SCMRepositoriesViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtUmVwb3NpdG9yaWVzVmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtUmVwb3NpdG9yaWVzVmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQW9CLE1BQU0sMENBQTBDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU1RCxPQUFPLEVBQWtCLGVBQWUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FB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