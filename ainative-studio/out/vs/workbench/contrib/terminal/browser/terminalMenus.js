/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { TaskExecutionSupportedContext } from '../../tasks/common/taskService.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
var ContextMenuGroup;
(function (ContextMenuGroup) {
    ContextMenuGroup["Create"] = "1_create";
    ContextMenuGroup["Edit"] = "3_edit";
    ContextMenuGroup["Clear"] = "5_clear";
    ContextMenuGroup["Kill"] = "7_kill";
    ContextMenuGroup["Config"] = "9_config";
})(ContextMenuGroup || (ContextMenuGroup = {}));
export var TerminalMenuBarGroup;
(function (TerminalMenuBarGroup) {
    TerminalMenuBarGroup["Create"] = "1_create";
    TerminalMenuBarGroup["Run"] = "3_run";
    TerminalMenuBarGroup["Manage"] = "5_manage";
    TerminalMenuBarGroup["Configure"] = "7_configure";
})(TerminalMenuBarGroup || (TerminalMenuBarGroup = {}));
export function setupTerminalMenus() {
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: localize({ key: 'miNewTerminal', comment: ['&& denotes a mnemonic'] }, "&&New Terminal")
                },
                order: 1
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: localize({ key: 'miSplitTerminal', comment: ['&& denotes a mnemonic'] }, "&&Split Terminal"),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */)
                },
                order: 2,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize({ key: 'miRunActiveFile', comment: ['&& denotes a mnemonic'] }, "Run &&Active File")
                },
                order: 3,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize({ key: 'miRunSelectedText', comment: ['&& denotes a mnemonic'] }, "Run &&Selected Text")
                },
                order: 4,
                when: TerminalContextKeys.processSupported
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                group: "1_create" /* ContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value
                }
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* ContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* ContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', "Copy")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', "Copy as HTML")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', "Paste")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', "Clear")
                },
                group: "5_clear" /* ContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* ContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', "Select All"),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3
            }
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                group: "1_create" /* ContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value
                }
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* ContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* ContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', "Copy")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', "Copy as HTML")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', "Paste")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', "Clear")
                },
                group: "5_clear" /* ContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', "Select All"),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* ContextMenuGroup.Config */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    title: localize('workbench.action.terminal.newWithProfile.short', "New Terminal With Profile...")
                },
                group: "1_create" /* ContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* ContextMenuGroup.Create */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
                    title: localize2('workbench.action.terminal.selectDefaultProfile', 'Select Default Profile'),
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
                    title: localize('workbench.action.terminal.openSettings', "Configure Terminal Settings")
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.runTask',
                    title: localize('workbench.action.tasks.runTask', "Run Task...")
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 1
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.configureTaskRunner',
                    title: localize('workbench.action.tasks.configureTaskRunner', "Configure Tasks...")
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 2
            },
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
                    title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal')
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`)),
            }
        },
        {
            // This is used to show instead of tabs when there is only a single terminal
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
                    title: terminalStrings.focus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.has(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'always'))),
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 2,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
                    title: terminalStrings.kill,
                    icon: Codicon.trash
                },
                group: 'navigation',
                order: 3,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                    icon: Codicon.plus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.or(TerminalContextKeys.webExtensionContributedProfile, TerminalContextKeys.processSupported))
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clearLong', "Clear Terminal"),
                    icon: Codicon.clearAll
                },
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize('workbench.action.terminal.runActiveFile', "Run Active File"),
                    icon: Codicon.run
                },
                group: 'navigation',
                order: 5,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize('workbench.action.terminal.runSelectedText', "Run Selected Text"),
                    icon: Codicon.selection
                },
                group: 'navigation',
                order: 6,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
                    title: terminalStrings.split.value,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
                    title: terminalStrings.moveToEditor.value
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
                    title: terminalStrings.moveIntoNewWindow.value
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
                    title: localize('workbench.action.terminal.renameInstance', "Rename...")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
                    title: localize('workbench.action.terminal.changeIcon', "Change Icon...")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
                    title: localize('workbench.action.terminal.changeColor', "Change Color...")
                },
                group: "3_edit" /* ContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "3_edit" /* ContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
                    title: localize('workbench.action.terminal.joinInstance', "Join Terminals")
                },
                when: TerminalContextKeys.tabsSingularSelection.toNegated(),
                group: "9_config" /* ContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
                    title: terminalStrings.unsplit.value
                },
                when: ContextKeyExpr.and(TerminalContextKeys.tabsSingularSelection, TerminalContextKeys.splitTerminal),
                group: "9_config" /* ContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* ContextMenuGroup.Kill */,
            }
        }
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
            title: terminalStrings.moveToTerminalPanel
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
            title: terminalStrings.rename
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
            title: terminalStrings.changeColor
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
            title: terminalStrings.changeIcon
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
            title: terminalStrings.toggleSizeToContentWidth
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new,
            icon: Codicon.plus
        },
        alt: {
            id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
            title: terminalStrings.split.value,
            icon: Codicon.splitHorizontal
        },
        group: 'navigation',
        order: 0,
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal)
    });
}
export function getTerminalActionBarArgs(location, profiles, defaultProfileName, contributedProfiles, terminalService, dropdownMenu, disposableStore) {
    let dropdownActions = [];
    let submenuActions = [];
    profiles = profiles.filter(e => !e.isAutoDetected);
    const splitLocation = (location === TerminalLocation.Editor || (typeof location === 'object' && 'viewColumn' in location && location.viewColumn === ACTIVE_GROUP)) ? { viewColumn: SIDE_GROUP } : { splitActiveTerminal: true };
    for (const p of profiles) {
        const isDefault = p.profileName === defaultProfileName;
        const options = { config: p, location };
        const splitOptions = { config: p, location: splitLocation };
        const sanitizedProfileName = p.profileName.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */, isDefault ? localize('defaultTerminalProfile', "{0} (Default)", sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
            const instance = await terminalService.createTerminal(options);
            terminalService.setActiveInstance(instance);
            await terminalService.focusActiveInstance();
        })));
        submenuActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, isDefault ? localize('defaultTerminalProfile', "{0} (Default)", sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
            const instance = await terminalService.createTerminal(splitOptions);
            terminalService.setActiveInstance(instance);
            await terminalService.focusActiveInstance();
        })));
    }
    for (const contributed of contributedProfiles) {
        const isDefault = contributed.title === defaultProfileName;
        const title = isDefault ? localize('defaultTerminalProfile', "{0} (Default)", contributed.title.replace(/[\n\r\t]/g, '')) : contributed.title.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action('contributed', title, undefined, true, () => terminalService.createTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title
            },
            location
        }))));
        submenuActions.push(disposableStore.add(new Action('contributed-split', title, undefined, true, () => terminalService.createTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title
            },
            location: splitLocation
        }))));
    }
    const defaultProfileAction = dropdownActions.find(d => d.label.endsWith('(Default)'));
    if (defaultProfileAction) {
        dropdownActions = dropdownActions.filter(d => d !== defaultProfileAction).sort((a, b) => a.label.localeCompare(b.label));
        dropdownActions.unshift(defaultProfileAction);
    }
    if (dropdownActions.length > 0) {
        dropdownActions.push(new SubmenuAction('split.profile', localize('splitTerminal', 'Split Terminal'), submenuActions));
        dropdownActions.push(new Separator());
    }
    const actions = dropdownMenu.getActions();
    dropdownActions.push(...Separator.join(...actions.map(a => a[1])));
    const defaultSubmenuProfileAction = submenuActions.find(d => d.label.endsWith('(Default)'));
    if (defaultSubmenuProfileAction) {
        submenuActions = submenuActions.filter(d => d !== defaultSubmenuProfileAction).sort((a, b) => a.label.localeCompare(b.label));
        submenuActions.unshift(defaultSubmenuProfileAction);
    }
    const dropdownAction = disposableStore.add(new Action('refresh profiles', localize('launchProfile', 'Launch Profile...'), 'codicon-chevron-down', true));
    return { dropdownAction, dropdownMenuActions: dropdownActions, className: `terminal-tab-actions-${terminalService.resolveLocation(location)}` };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNZW51cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxNZW51cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFTLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUErQyxnQkFBZ0IsRUFBcUIsTUFBTSxrREFBa0QsQ0FBQztBQUNwSixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVsRixPQUFPLEVBQXFCLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUE2QixNQUFNLGlDQUFpQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzVGLElBQVcsZ0JBTVY7QUFORCxXQUFXLGdCQUFnQjtJQUMxQix1Q0FBbUIsQ0FBQTtJ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