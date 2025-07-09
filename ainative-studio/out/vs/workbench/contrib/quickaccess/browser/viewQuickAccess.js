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
var ViewQuickAccessProvider_1;
import { localize, localize2 } from '../../../../nls.js';
import { IQuickInputService, ItemActivation } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { fuzzyContains } from '../../../../base/common/strings.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IDebugService, REPL_VIEW_ID } from '../../debug/common/debug.js';
let ViewQuickAccessProvider = class ViewQuickAccessProvider extends PickerQuickAccessProvider {
    static { ViewQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'view '; }
    constructor(viewDescriptorService, viewsService, outputService, terminalService, terminalGroupService, debugService, paneCompositeService, contextKeyService) {
        super(ViewQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noViewResults', "No matching views"),
                containerLabel: ''
            }
        });
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.outputService = outputService;
        this.terminalService = terminalService;
        this.terminalGroupService = terminalGroupService;
        this.debugService = debugService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
    }
    _getPicks(filter) {
        const filteredViewEntries = this.doGetViewPickItems().filter(entry => {
            if (!filter) {
                return true;
            }
            // Match fuzzy on label
            entry.highlights = { label: matchesFuzzy(filter, entry.label, true) ?? undefined };
            // Return if we have a match on label or container
            return entry.highlights.label || fuzzyContains(entry.containerLabel, filter);
        });
        // Map entries to container labels
        const mapEntryToContainer = new Map();
        for (const entry of filteredViewEntries) {
            if (!mapEntryToContainer.has(entry.label)) {
                mapEntryToContainer.set(entry.label, entry.containerLabel);
            }
        }
        // Add separators for containers
        const filteredViewEntriesWithSeparators = [];
        let lastContainer = undefined;
        for (const entry of filteredViewEntries) {
            if (lastContainer !== entry.containerLabel) {
                lastContainer = entry.containerLabel;
                // When the entry container has a parent container, set container
                // label as Parent / Child. For example, `Views / Explorer`.
                let separatorLabel;
                if (mapEntryToContainer.has(lastContainer)) {
                    separatorLabel = `${mapEntryToContainer.get(lastContainer)} / ${lastContainer}`;
                }
                else {
                    separatorLabel = lastContainer;
                }
                filteredViewEntriesWithSeparators.push({ type: 'separator', label: separatorLabel });
            }
            filteredViewEntriesWithSeparators.push(entry);
        }
        return filteredViewEntriesWithSeparators;
    }
    doGetViewPickItems() {
        const viewEntries = [];
        const getViewEntriesForPaneComposite = (paneComposite, viewContainer) => {
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            const result = [];
            for (const view of viewContainerModel.allViewDescriptors) {
                if (this.contextKeyService.contextMatchesRules(view.when)) {
                    result.push({
                        label: view.name.value,
                        containerLabel: viewContainerModel.title,
                        accept: () => this.viewsService.openView(view.id, true)
                    });
                }
            }
            return result;
        };
        const addPaneComposites = (location, containerLabel) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            const visiblePaneCompositeIds = this.paneCompositeService.getVisiblePaneCompositeIds(location);
            paneComposites.sort((a, b) => {
                let aIndex = visiblePaneCompositeIds.findIndex(id => a.id === id);
                let bIndex = visiblePaneCompositeIds.findIndex(id => b.id === id);
                if (aIndex < 0) {
                    aIndex = paneComposites.indexOf(a) + visiblePaneCompositeIds.length;
                }
                if (bIndex < 0) {
                    bIndex = paneComposites.indexOf(b) + visiblePaneCompositeIds.length;
                }
                return aIndex - bIndex;
            });
            for (const paneComposite of paneComposites) {
                if (this.includeViewContainer(paneComposite)) {
                    const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                    if (viewContainer) {
                        viewEntries.push({
                            label: this.viewDescriptorService.getViewContainerModel(viewContainer).title,
                            containerLabel,
                            accept: () => this.paneCompositeService.openPaneComposite(paneComposite.id, location, true)
                        });
                    }
                }
            }
        };
        // Viewlets / Panels
        addPaneComposites(0 /* ViewContainerLocation.Sidebar */, localize('views', "Side Bar"));
        addPaneComposites(1 /* ViewContainerLocation.Panel */, localize('panels', "Panel"));
        addPaneComposites(2 /* ViewContainerLocation.AuxiliaryBar */, localize('Void side bar', "Void Side Bar"));
        const addPaneCompositeViews = (location) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            for (const paneComposite of paneComposites) {
                const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                if (viewContainer) {
                    viewEntries.push(...getViewEntriesForPaneComposite(paneComposite, viewContainer));
                }
            }
        };
        // Side Bar / Panel Views
        addPaneCompositeViews(0 /* ViewContainerLocation.Sidebar */);
        addPaneCompositeViews(1 /* ViewContainerLocation.Panel */);
        addPaneCompositeViews(2 /* ViewContainerLocation.AuxiliaryBar */);
        // Terminals
        this.terminalGroupService.groups.forEach((group, groupIndex) => {
            group.terminalInstances.forEach((terminal, terminalIndex) => {
                const label = localize('terminalTitle', "{0}: {1}", `${groupIndex + 1}.${terminalIndex + 1}`, terminal.title);
                viewEntries.push({
                    label,
                    containerLabel: localize('terminals', "Terminal"),
                    accept: async () => {
                        await this.terminalGroupService.showPanel(true);
                        this.terminalService.setActiveInstance(terminal);
                    }
                });
            });
        });
        // Debug Consoles
        this.debugService.getModel().getSessions(true).filter(s => s.hasSeparateRepl()).forEach((session, _) => {
            const label = session.name;
            viewEntries.push({
                label,
                containerLabel: localize('debugConsoles', "Debug Console"),
                accept: async () => {
                    await this.debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
                    if (!this.viewsService.isViewVisible(REPL_VIEW_ID)) {
                        await this.viewsService.openView(REPL_VIEW_ID, true);
                    }
                }
            });
        });
        // Output Channels
        const channels = this.outputService.getChannelDescriptors();
        for (const channel of channels) {
            viewEntries.push({
                label: channel.label,
                containerLabel: localize('channels', "Output"),
                accept: () => this.outputService.showChannel(channel.id)
            });
        }
        return viewEntries;
    }
    includeViewContainer(container) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(container.id);
        if (viewContainer?.hideIfEmpty) {
            return this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors.length > 0;
        }
        return true;
    }
};
ViewQuickAccessProvider = ViewQuickAccessProvider_1 = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IViewsService),
    __param(2, IOutputService),
    __param(3, ITerminalService),
    __param(4, ITerminalGroupService),
    __param(5, IDebugService),
    __param(6, IPaneCompositePartService),
    __param(7, IContextKeyService)
], ViewQuickAccessProvider);
export { ViewQuickAccessProvider };
//#region Actions
export class OpenViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.openView'; }
    constructor() {
        super({
            id: OpenViewPickerAction.ID,
            title: localize2('openView', 'Open View'),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(ViewQuickAccessProvider.PREFIX);
    }
}
export class QuickAccessViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.quickOpenView'; }
    static { this.KEYBINDING = {
        primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 0 }
    }; }
    constructor() {
        super({
            id: QuickAccessViewPickerAction.ID,
            title: localize2('quickOpenView', 'Quick Open View'),
            category: Categories.View,
            f1: false, // hide quick pickers from command palette to not confuse with the other entry that shows a input field
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: undefined,
                ...QuickAccessViewPickerAction.KEYBINDING
            }
        });
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(QuickAccessViewPickerAction.ID);
        quickInputService.quickAccess.show(ViewQuickAccessProvider.PREFIX, { quickNavigateConfiguration: { keybindings: keys }, itemActivation: ItemActivation.FIRST });
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3F1aWNrYWNjZXNzL2Jyb3dzZXIvdmlld1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBdUIsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0gsT0FBTyxFQUEwQix5QkFBeUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxzQkFBc0IsRUFBd0MsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSXpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBTW5FLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEseUJBQTZDOzthQUVsRixXQUFNLEdBQUcsT0FBTyxBQUFWLENBQVc7SUFFeEIsWUFDMEMscUJBQTZDLEVBQ3RELFlBQTJCLEVBQzFCLGFBQTZCLEVBQzNCLGVBQWlDLEVBQzVCLG9CQUEyQyxFQUNuRCxZQUEyQixFQUNmLG9CQUErQyxFQUN0RCxpQkFBcUM7UUFFMUUsS0FBSyxDQUFDLHlCQUF1QixDQUFDLE1BQU0sRUFBRTtZQUNyQyxhQUFhLEVBQUU7Z0JBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ3JELGNBQWMsRUFBRSxFQUFFO2FBQ2xCO1NBQ0QsQ0FBQyxDQUFDO1FBZHNDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDdEQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDMUIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzNCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUM1Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ2YseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEyQjtRQUN0RCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBUTNFLENBQUM7SUFFUyxTQUFTLENBQUMsTUFBYztRQUNqQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNwRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsdUJBQXVCO1lBQ3ZCLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBRW5GLGtEQUFrRDtZQUNsRCxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEQsS0FBSyxNQUFNLEtBQUssSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0YsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxNQUFNLGlDQUFpQyxHQUFvRCxFQUFFLENBQUM7UUFDOUYsSUFBSSxhQUFhLEdBQXVCLFNBQVMsQ0FBQztRQUNsRCxLQUFLLE1BQU0sS0FBSyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekMsSUFBSSxhQUFhLEtBQUssS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM1QyxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFFckMsaUVBQWlFO2dCQUNqRSw0REFBNEQ7Z0JBQzVELElBQUksY0FBc0IsQ0FBQztnQkFDM0IsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsY0FBYyxHQUFHLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLGFBQWEsRUFBRSxDQUFDO2dCQUNqRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsY0FBYyxHQUFHLGFBQWEsQ0FBQztnQkFDaEMsQ0FBQztnQkFFRCxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBRXRGLENBQUM7WUFFRCxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELE9BQU8saUNBQWlDLENBQUM7SUFDMUMsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixNQUFNLFdBQVcsR0FBOEIsRUFBRSxDQUFDO1FBRWxELE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxhQUFzQyxFQUFFLGFBQTRCLEVBQXdCLEVBQUU7WUFDckksTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDM0YsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQztZQUN4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzFELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMzRCxNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNYLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7d0JBQ3RCLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxLQUFLO3dCQUN4QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUM7cUJBQ3ZELENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDO1FBRUYsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLFFBQStCLEVBQUUsY0FBc0IsRUFBRSxFQUFFO1lBQ3JGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3RSxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUvRixjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM1QixJQUFJLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUVsRSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDO2dCQUNyRSxDQUFDO2dCQUVELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNoQixNQUFNLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUM7Z0JBQ3JFLENBQUM7Z0JBRUQsT0FBTyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBRUgsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDeEYsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDbkIsV0FBVyxDQUFDLElBQUksQ0FBQzs0QkFDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLOzRCQUM1RSxjQUFjOzRCQUNkLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDO3lCQUMzRixDQUFDLENBQUM7b0JBQ0osQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLG9CQUFvQjtRQUNwQixpQkFBaUIsd0NBQWdDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNoRixpQkFBaUIsc0NBQThCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1RSxpQkFBaUIsNkNBQXFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUVsRyxNQUFNLHFCQUFxQixHQUFHLENBQUMsUUFBK0IsRUFBRSxFQUFFO1lBQ2pFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3RSxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RixJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsOEJBQThCLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25GLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYseUJBQXlCO1FBQ3pCLHFCQUFxQix1Q0FBK0IsQ0FBQztRQUNyRCxxQkFBcUIscUNBQTZCLENBQUM7UUFDbkQscUJBQXFCLDRDQUFvQyxDQUFDO1FBRTFELFlBQVk7UUFDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUM5RCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFO2dCQUMzRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxHQUFHLFVBQVUsR0FBRyxDQUFDLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUcsV0FBVyxDQUFDLElBQUksQ0FBQztvQkFDaEIsS0FBSztvQkFDTCxjQUFjLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUM7b0JBQ2pELE1BQU0sRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDbEIsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoRCxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNsRCxDQUFDO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RHLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDM0IsV0FBVyxDQUFDLElBQUksQ0FBQztnQkFDaEIsS0FBSztnQkFDTCxjQUFjLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUM7Z0JBQzFELE1BQU0sRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDbEIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUUzRixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQzt3QkFDcEQsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3RELENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQztRQUVKLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM1RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsY0FBYyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDO2dCQUM5QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzthQUN4RCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFNBQWtDO1FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEYsSUFBSSxhQUFhLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN6RyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDOztBQWpNVyx1QkFBdUI7SUFLakMsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLGtCQUFrQixDQUFBO0dBWlIsdUJBQXVCLENBa01uQzs7QUFHRCxpQkFBaUI7QUFFakIsTUFBTSxPQUFPLG9CQUFxQixTQUFRLE9BQU87YUFFaEMsT0FBRSxHQUFHLDJCQUEyQixDQUFDO0lBRWpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7WUFDM0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ3pDLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25GLENBQUM7O0FBR0YsTUFBTSxPQUFPLDJCQUE0QixTQUFRLE9BQU87YUFFdkMsT0FBRSxHQUFHLGdDQUFnQyxDQUFDO2FBQ3RDLGVBQVUsR0FBRztRQUM1QixPQUFPLEVBQUUsaURBQTZCO1FBQ3RDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBNkIsRUFBRTtRQUMvQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO0tBQ3JCLENBQUM7SUFFRjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFO1lBQ2xDLEtBQUssRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDO1lBQ3BELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsS0FBSyxFQUFFLHVHQUF1RztZQUNsSCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLElBQUksRUFBRSxTQUFTO2dCQUNmLEdBQUcsMkJBQTJCLENBQUMsVUFBVTthQUN6QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRTNELE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2pLLENBQUM7O0FBR0YsWUFBWSJ9