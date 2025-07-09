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
var RepositoryRenderer_1;
import './media/scm.css';
import { DisposableStore, combinedDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore } from '../../../../base/common/observable.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { ISCMViewService } from '../common/scm.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { connectPrimaryMenu, getRepositoryResourceCount, isSCMRepository, StatusBarAction } from './util.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class RepositoryActionRunner extends ActionRunner {
    constructor(getSelectedRepositories) {
        super();
        this.getSelectedRepositories = getSelectedRepositories;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const selection = this.getSelectedRepositories().map(r => r.provider);
        const actionContext = selection.some(s => s === context) ? selection : [context];
        await action.run(...actionContext);
    }
}
let RepositoryRenderer = class RepositoryRenderer {
    static { RepositoryRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'repository'; }
    get templateId() { return RepositoryRenderer_1.TEMPLATE_ID; }
    constructor(toolbarMenuId, actionViewItemProvider, commandService, contextKeyService, contextMenuService, hoverService, keybindingService, menuService, scmViewService, telemetryService) {
        this.toolbarMenuId = toolbarMenuId;
        this.actionViewItemProvider = actionViewItemProvider;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        if (container.classList.contains('monaco-tl-contents')) {
            container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        }
        const provider = append(container, $('.scm-provider'));
        const label = append(provider, $('.label'));
        const labelCustomHover = this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), label, '', {});
        const name = append(label, $('span.name'));
        const description = append(label, $('span.description'));
        const actions = append(provider, $('.actions'));
        const toolBar = new WorkbenchToolBar(actions, { actionViewItemProvider: this.actionViewItemProvider, resetMenu: this.toolbarMenuId }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(provider, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const visibilityDisposable = toolBar.onDidChangeDropdownVisibility(e => provider.classList.toggle('active', e));
        const templateDisposable = combinedDisposable(labelCustomHover, visibilityDisposable, toolBar);
        return { label, labelCustomHover, name, description, countContainer, count, toolBar, elementDisposables: new DisposableStore(), templateDisposable };
    }
    renderElement(arg, index, templateData, height) {
        const repository = isSCMRepository(arg) ? arg : arg.element;
        templateData.name.textContent = repository.provider.name;
        if (repository.provider.rootUri) {
            templateData.labelCustomHover.update(`${repository.provider.label}: ${repository.provider.rootUri.fsPath}`);
            templateData.description.textContent = repository.provider.label;
        }
        else {
            templateData.labelCustomHover.update(repository.provider.label);
            templateData.description.textContent = '';
        }
        let statusPrimaryActions = [];
        let menuPrimaryActions = [];
        let menuSecondaryActions = [];
        const updateToolbar = () => {
            templateData.toolBar.setActions([...statusPrimaryActions, ...menuPrimaryActions], menuSecondaryActions);
        };
        templateData.elementDisposables.add(autorunWithStore((reader, store) => {
            const commands = repository.provider.statusBarCommands.read(reader) ?? [];
            statusPrimaryActions = commands.map(c => store.add(new StatusBarAction(c, this.commandService)));
            updateToolbar();
        }));
        templateData.elementDisposables.add(autorun(reader => {
            const count = repository.provider.count.read(reader) ?? getRepositoryResourceCount(repository.provider);
            templateData.countContainer.setAttribute('data-count', String(count));
            templateData.count.setCount(count);
        }));
        const repositoryMenus = this.scmViewService.menus.getRepositoryMenus(repository.provider);
        const menu = this.toolbarMenuId === MenuId.SCMTitle ? repositoryMenus.titleMenu.menu : repositoryMenus.repositoryMenu;
        templateData.elementDisposables.add(connectPrimaryMenu(menu, (primary, secondary) => {
            menuPrimaryActions = primary;
            menuSecondaryActions = secondary;
            updateToolbar();
        }));
        templateData.toolBar.context = repository.provider;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
        templateData.count.dispose();
    }
};
RepositoryRenderer = RepositoryRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IHoverService),
    __param(6, IKeybindingService),
    __param(7, IMenuService),
    __param(8, ISCMViewService),
    __param(9, ITelemetryService)
], RepositoryRenderer);
export { RepositoryRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtUmVwb3NpdG9yeVJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbVJlcG9zaXRvcnlSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQWUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFnQyxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQU03RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtC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