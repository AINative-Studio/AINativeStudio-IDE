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
var NewFileTemplatesManager_1;
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, IMenuService, MenuId, registerAction2, MenuRegistry, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
const builtInSource = localize('Built-In', "Built-In");
const category = localize2('Create', 'Create');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showNewFileEntries',
            title: localize2('welcome.newFile', 'New File...'),
            category,
            f1: true,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ + 2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 44 /* KeyCode.KeyN */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '1_new',
                order: 2
            }
        });
    }
    async run(accessor) {
        return assertIsDefined(NewFileTemplatesManager.Instance).run();
    }
});
let NewFileTemplatesManager = class NewFileTemplatesManager extends Disposable {
    static { NewFileTemplatesManager_1 = this; }
    constructor(quickInputService, contextKeyService, commandService, keybindingService, menuService) {
        super();
        this.quickInputService = quickInputService;
        this.contextKeyService = contextKeyService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        NewFileTemplatesManager_1.Instance = this;
        this._register({ dispose() { if (NewFileTemplatesManager_1.Instance === this) {
                NewFileTemplatesManager_1.Instance = undefined;
            } } });
        this.menu = menuService.createMenu(MenuId.NewFile, contextKeyService);
    }
    allEntries() {
        const items = [];
        for (const [groupName, group] of this.menu.getActions({ renderShortTitle: true })) {
            for (const action of group) {
                if (action instanceof MenuItemAction) {
                    items.push({ commandID: action.item.id, from: action.item.source?.title ?? builtInSource, title: action.label, group: groupName });
                }
            }
        }
        return items;
    }
    async run() {
        const entries = this.allEntries();
        if (entries.length === 0) {
            throw Error('Unexpected empty new items list');
        }
        else if (entries.length === 1) {
            this.commandService.executeCommand(entries[0].commandID);
            return true;
        }
        else {
            return this.selectNewEntry(entries);
        }
    }
    async selectNewEntry(entries) {
        const { promise: resultPromise, resolve: resolveResult } = promiseWithResolvers();
        const disposables = new DisposableStore();
        const qp = this.quickInputService.createQuickPick({ useSeparators: true });
        qp.title = localize('newFileTitle', "New File...");
        qp.placeholder = localize('newFilePlaceholder', "Select File Type or Enter File Name...");
        qp.sortByLabel = false;
        qp.matchOnDetail = true;
        qp.matchOnDescription = true;
        const sortCategories = (a, b) => {
            const categoryPriority = { 'file': 1, 'notebook': 2 };
            if (categoryPriority[a.group] && categoryPriority[b.group]) {
                if (categoryPriority[a.group] !== categoryPriority[b.group]) {
                    return categoryPriority[b.group] - categoryPriority[a.group];
                }
            }
            else if (categoryPriority[a.group]) {
                return 1;
            }
            else if (categoryPriority[b.group]) {
                return -1;
            }
            if (a.from === builtInSource) {
                return 1;
            }
            if (b.from === builtInSource) {
                return -1;
            }
            return a.from.localeCompare(b.from);
        };
        const displayCategory = {
            'file': localize('file', "File"),
            'notebook': localize('notebook', "Notebook"),
        };
        const refreshQp = (entries) => {
            const items = [];
            let lastSeparator;
            entries
                .sort((a, b) => -sortCategories(a, b))
                .forEach((entry) => {
                const command = entry.commandID;
                const keybinding = this.keybindingService.lookupKeybinding(command || '', this.contextKeyService);
                if (lastSeparator !== entry.group) {
                    items.push({
                        type: 'separator',
                        label: displayCategory[entry.group] ?? entry.group
                    });
                    lastSeparator = entry.group;
                }
                items.push({
                    ...entry,
                    label: entry.title,
                    type: 'item',
                    keybinding,
                    buttons: command ? [
                        {
                            iconClass: 'codicon codicon-gear',
                            tooltip: localize('change keybinding', "Configure Keybinding")
                        }
                    ] : [],
                    detail: '',
                    description: entry.from,
                });
            });
            qp.items = items;
        };
        refreshQp(entries);
        disposables.add(this.menu.onDidChange(() => refreshQp(this.allEntries())));
        disposables.add(qp.onDidChangeValue((val) => {
            if (val === '') {
                refreshQp(entries);
                return;
            }
            const currentTextEntry = {
                commandID: 'workbench.action.files.newFile',
                commandArgs: { languageId: undefined, viewType: undefined, fileName: val },
                title: localize('miNewFileWithName', "Create New File ({0})", val),
                group: 'file',
                from: builtInSource,
            };
            refreshQp([currentTextEntry, ...entries]);
        }));
        disposables.add(qp.onDidAccept(async (e) => {
            const selected = qp.selectedItems[0];
            resolveResult(!!selected);
            qp.hide();
            if (selected) {
                await this.commandService.executeCommand(selected.commandID, selected.commandArgs);
            }
        }));
        disposables.add(qp.onDidHide(() => {
            qp.dispose();
            disposables.dispose();
            resolveResult(false);
        }));
        disposables.add(qp.onDidTriggerItemButton(e => {
            qp.hide();
            this.commandService.executeCommand('workbench.action.openGlobalKeybindings', e.item.commandID);
            resolveResult(false);
        }));
        qp.show();
        return resultPromise;
    }
};
NewFileTemplatesManager = NewFileTemplatesManager_1 = __decorate([
    __param(0, IQuickInputService),
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IKeybindingService),
    __param(4, IMenuService)
], NewFileTemplatesManager);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(NewFileTemplatesManager, 3 /* LifecyclePhase.Restored */);
MenuRegistry.appendMenuItem(MenuId.NewFile, {
    group: 'file',
    command: {
        id: 'workbench.action.files.newUntitledFile',
        title: localize('miNewFile2', "Text File")
    },
    order: 1
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3RmlsZS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVZpZXdzL2NvbW1vbi9uZXdGaWxlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFTLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNySixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsT0FBTyxFQUFFLGtCQUFrQixFQUF1QyxNQUFNLHNEQUFzRCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBR3RILE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDdkQsTUFBTSxRQUFRLEdBQXFCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFFakUsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QjtZQUNoQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQztZQUNsRCxRQUFRO1lBQ1IsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLGdEQUEyQiwyQkFBaUIsd0JBQWU7Z0JBQ3BFLE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtnQkFDMUIsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sZUFBZSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2hFLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFHSCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O0lBSy9DLFlBQ3NDLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDeEMsY0FBK0IsRUFDNUIsaUJBQXFDLEVBQzVELFdBQXlCO1FBRXZDLEtBQUssRUFBRSxDQUFDO1FBTjZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUsxRSx5QkFBdUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRXhDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEtBQUssSUFBSSx5QkFBdUIsQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQUMseUJBQXVCLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRW5JLElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVPLFVBQVU7UUFDakIsTUFBTSxLQUFLLEdBQWtCLEVBQUUsQ0FBQztRQUNoQyxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDbkYsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7b0JBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQ3BJLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHO1FBQ1IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7YUFDSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQzthQUNJLENBQUM7WUFDTCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQXNCO1FBQ2xELE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsR0FBRyxvQkFBb0IsRUFBVyxDQUFDO1FBRTNGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLEVBQUUsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRCxFQUFFLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzFGLEVBQUUsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLEVBQUUsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLEVBQUUsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFFN0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFjLEVBQUUsQ0FBYyxFQUFVLEVBQUU7WUFDakUsTUFBTSxnQkFBZ0IsR0FBMkIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM5RSxJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDNUQsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzdELE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUQsQ0FBQztZQUNGLENBQUM7aUJBQ0ksSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLENBQUMsQ0FBQztZQUFDLENBQUM7aUJBQzVDLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUM7WUFFbEQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRSxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUM7WUFFNUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDO1FBRUYsTUFBTSxlQUFlLEdBQTJCO1lBQy9DLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUNoQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7U0FDNUMsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFHLENBQUMsT0FBc0IsRUFBRSxFQUFFO1lBQzVDLE1BQU0sS0FBSyxHQUErRCxFQUFFLENBQUM7WUFDN0UsSUFBSSxhQUFpQyxDQUFDO1lBQ3RDLE9BQU87aUJBQ0wsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNyQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztnQkFDaEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ2xHLElBQUksYUFBYSxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDVixJQUFJLEVBQUUsV0FBVzt3QkFDakIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUs7cUJBQ2xELENBQUMsQ0FBQztvQkFDSCxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDN0IsQ0FBQztnQkFDRCxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNWLEdBQUcsS0FBSztvQkFDUixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7b0JBQ2xCLElBQUksRUFBRSxNQUFNO29CQUNaLFVBQVU7b0JBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ2xCOzRCQUNDLFNBQVMsRUFBRSxzQkFBc0I7NEJBQ2pDLE9BQU8sRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUM7eUJBQzlEO3FCQUNELENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ04sTUFBTSxFQUFFLEVBQUU7b0JBQ1YsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO2lCQUN2QixDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUNKLEVBQUUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLENBQUMsQ0FBQztRQUNGLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVuQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0UsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUNuRCxJQUFJLEdBQUcsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuQixPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sZ0JBQWdCLEdBQWdCO2dCQUNyQyxTQUFTLEVBQUUsZ0NBQWdDO2dCQUMzQyxXQUFXLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDMUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxHQUFHLENBQUM7Z0JBQ2xFLEtBQUssRUFBRSxNQUFNO2dCQUNiLElBQUksRUFBRSxhQUFhO2FBQ25CLENBQUM7WUFDRixTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7WUFDeEMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQW1DLENBQUM7WUFDdkUsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUxQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFBQyxDQUFDO1FBQ3RHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2pDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzdDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLHdDQUF3QyxFQUFHLENBQUMsQ0FBQyxJQUF1QyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25JLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVYsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztDQUNELENBQUE7QUExSkssdUJBQXVCO0lBTTFCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7R0FWVCx1QkFBdUIsQ0EwSjVCO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDO0tBQ3pFLDZCQUE2QixDQUFDLHVCQUF1QixrQ0FBMEIsQ0FBQztBQUVsRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7SUFDM0MsS0FBSyxFQUFFLE1BQU07SUFDYixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsd0NBQXdDO1FBQzVDLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQztLQUMxQztJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFDIn0=