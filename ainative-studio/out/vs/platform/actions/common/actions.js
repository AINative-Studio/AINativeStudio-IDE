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
var MenuItemAction_1;
import { SubmenuAction } from '../../../base/common/actions.js';
import { MicrotaskEmitter } from '../../../base/common/event.js';
import { DisposableStore, dispose, markAsSingleton, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { CommandsRegistry, ICommandService } from '../../commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
export function isIMenuItem(item) {
    return item.command !== undefined;
}
export function isISubmenuItem(item) {
    return item.submenu !== undefined;
}
export class MenuId {
    static { this._instances = new Map(); }
    static { this.CommandPalette = new MenuId('CommandPalette'); }
    static { this.DebugBreakpointsContext = new MenuId('DebugBreakpointsContext'); }
    static { this.DebugCallStackContext = new MenuId('DebugCallStackContext'); }
    static { this.DebugConsoleContext = new MenuId('DebugConsoleContext'); }
    static { this.DebugVariablesContext = new MenuId('DebugVariablesContext'); }
    static { this.NotebookVariablesContext = new MenuId('NotebookVariablesContext'); }
    static { this.DebugHoverContext = new MenuId('DebugHoverContext'); }
    static { this.DebugWatchContext = new MenuId('DebugWatchContext'); }
    static { this.DebugToolBar = new MenuId('DebugToolBar'); }
    static { this.DebugToolBarStop = new MenuId('DebugToolBarStop'); }
    static { this.DebugCallStackToolbar = new MenuId('DebugCallStackToolbar'); }
    static { this.DebugCreateConfiguration = new MenuId('DebugCreateConfiguration'); }
    static { this.EditorContext = new MenuId('EditorContext'); }
    static { this.SimpleEditorContext = new MenuId('SimpleEditorContext'); }
    static { this.EditorContent = new MenuId('EditorContent'); }
    static { this.EditorLineNumberContext = new MenuId('EditorLineNumberContext'); }
    static { this.EditorContextCopy = new MenuId('EditorContextCopy'); }
    static { this.EditorContextPeek = new MenuId('EditorContextPeek'); }
    static { this.EditorContextShare = new MenuId('EditorContextShare'); }
    static { this.EditorTitle = new MenuId('EditorTitle'); }
    static { this.EditorTitleRun = new MenuId('EditorTitleRun'); }
    static { this.EditorTitleContext = new MenuId('EditorTitleContext'); }
    static { this.EditorTitleContextShare = new MenuId('EditorTitleContextShare'); }
    static { this.EmptyEditorGroup = new MenuId('EmptyEditorGroup'); }
    static { this.EmptyEditorGroupContext = new MenuId('EmptyEditorGroupContext'); }
    static { this.EditorTabsBarContext = new MenuId('EditorTabsBarContext'); }
    static { this.EditorTabsBarShowTabsSubmenu = new MenuId('EditorTabsBarShowTabsSubmenu'); }
    static { this.EditorTabsBarShowTabsZenModeSubmenu = new MenuId('EditorTabsBarShowTabsZenModeSubmenu'); }
    static { this.EditorActionsPositionSubmenu = new MenuId('EditorActionsPositionSubmenu'); }
    static { this.ExplorerContext = new MenuId('ExplorerContext'); }
    static { this.ExplorerContextShare = new MenuId('ExplorerContextShare'); }
    static { this.ExtensionContext = new MenuId('ExtensionContext'); }
    static { this.ExtensionEditorContextMenu = new MenuId('ExtensionEditorContextMenu'); }
    static { this.GlobalActivity = new MenuId('GlobalActivity'); }
    static { this.CommandCenter = new MenuId('CommandCenter'); }
    static { this.CommandCenterCenter = new MenuId('CommandCenterCenter'); }
    static { this.LayoutControlMenuSubmenu = new MenuId('LayoutControlMenuSubmenu'); }
    static { this.LayoutControlMenu = new MenuId('LayoutControlMenu'); }
    static { this.MenubarMainMenu = new MenuId('MenubarMainMenu'); }
    static { this.MenubarAppearanceMenu = new MenuId('MenubarAppearanceMenu'); }
    static { this.MenubarDebugMenu = new MenuId('MenubarDebugMenu'); }
    static { this.MenubarEditMenu = new MenuId('MenubarEditMenu'); }
    static { this.MenubarCopy = new MenuId('MenubarCopy'); }
    static { this.MenubarFileMenu = new MenuId('MenubarFileMenu'); }
    static { this.MenubarGoMenu = new MenuId('MenubarGoMenu'); }
    static { this.MenubarHelpMenu = new MenuId('MenubarHelpMenu'); }
    static { this.MenubarLayoutMenu = new MenuId('MenubarLayoutMenu'); }
    static { this.MenubarNewBreakpointMenu = new MenuId('MenubarNewBreakpointMenu'); }
    static { this.PanelAlignmentMenu = new MenuId('PanelAlignmentMenu'); }
    static { this.PanelPositionMenu = new MenuId('PanelPositionMenu'); }
    static { this.ActivityBarPositionMenu = new MenuId('ActivityBarPositionMenu'); }
    static { this.MenubarPreferencesMenu = new MenuId('MenubarPreferencesMenu'); }
    static { this.MenubarRecentMenu = new MenuId('MenubarRecentMenu'); }
    static { this.MenubarSelectionMenu = new MenuId('MenubarSelectionMenu'); }
    static { this.MenubarShare = new MenuId('MenubarShare'); }
    static { this.MenubarSwitchEditorMenu = new MenuId('MenubarSwitchEditorMenu'); }
    static { this.MenubarSwitchGroupMenu = new MenuId('MenubarSwitchGroupMenu'); }
    static { this.MenubarTerminalMenu = new MenuId('MenubarTerminalMenu'); }
    static { this.MenubarTerminalSuggestStatusMenu = new MenuId('MenubarTerminalSuggestStatusMenu'); }
    static { this.MenubarViewMenu = new MenuId('MenubarViewMenu'); }
    static { this.MenubarHomeMenu = new MenuId('MenubarHomeMenu'); }
    static { this.OpenEditorsContext = new MenuId('OpenEditorsContext'); }
    static { this.OpenEditorsContextShare = new MenuId('OpenEditorsContextShare'); }
    static { this.ProblemsPanelContext = new MenuId('ProblemsPanelContext'); }
    static { this.SCMInputBox = new MenuId('SCMInputBox'); }
    static { this.SCMChangeContext = new MenuId('SCMChangeContext'); }
    static { this.SCMResourceContext = new MenuId('SCMResourceContext'); }
    static { this.SCMResourceContextShare = new MenuId('SCMResourceContextShare'); }
    static { this.SCMResourceFolderContext = new MenuId('SCMResourceFolderContext'); }
    static { this.SCMResourceGroupContext = new MenuId('SCMResourceGroupContext'); }
    static { this.SCMSourceControl = new MenuId('SCMSourceControl'); }
    static { this.SCMSourceControlInline = new MenuId('SCMSourceControlInline'); }
    static { this.SCMSourceControlTitle = new MenuId('SCMSourceControlTitle'); }
    static { this.SCMHistoryTitle = new MenuId('SCMHistoryTitle'); }
    static { this.SCMHistoryItemContext = new MenuId('SCMHistoryItemContext'); }
    static { this.SCMHistoryItemHover = new MenuId('SCMHistoryItemHover'); }
    static { this.SCMHistoryItemRefContext = new MenuId('SCMHistoryItemRefContext'); }
    static { this.SCMTitle = new MenuId('SCMTitle'); }
    static { this.SearchContext = new MenuId('SearchContext'); }
    static { this.SearchActionMenu = new MenuId('SearchActionContext'); }
    static { this.StatusBarWindowIndicatorMenu = new MenuId('StatusBarWindowIndicatorMenu'); }
    static { this.StatusBarRemoteIndicatorMenu = new MenuId('StatusBarRemoteIndicatorMenu'); }
    static { this.StickyScrollContext = new MenuId('StickyScrollContext'); }
    static { this.TestItem = new MenuId('TestItem'); }
    static { this.TestItemGutter = new MenuId('TestItemGutter'); }
    static { this.TestProfilesContext = new MenuId('TestProfilesContext'); }
    static { this.TestMessageContext = new MenuId('TestMessageContext'); }
    static { this.TestMessageContent = new MenuId('TestMessageContent'); }
    static { this.TestPeekElement = new MenuId('TestPeekElement'); }
    static { this.TestPeekTitle = new MenuId('TestPeekTitle'); }
    static { this.TestCallStack = new MenuId('TestCallStack'); }
    static { this.TestCoverageFilterItem = new MenuId('TestCoverageFilterItem'); }
    static { this.TouchBarContext = new MenuId('TouchBarContext'); }
    static { this.TitleBar = new MenuId('TitleBar'); }
    static { this.TitleBarContext = new MenuId('TitleBarContext'); }
    static { this.TitleBarTitleContext = new MenuId('TitleBarTitleContext'); }
    static { this.TunnelContext = new MenuId('TunnelContext'); }
    static { this.TunnelPrivacy = new MenuId('TunnelPrivacy'); }
    static { this.TunnelProtocol = new MenuId('TunnelProtocol'); }
    static { this.TunnelPortInline = new MenuId('TunnelInline'); }
    static { this.TunnelTitle = new MenuId('TunnelTitle'); }
    static { this.TunnelLocalAddressInline = new MenuId('TunnelLocalAddressInline'); }
    static { this.TunnelOriginInline = new MenuId('TunnelOriginInline'); }
    static { this.ViewItemContext = new MenuId('ViewItemContext'); }
    static { this.ViewContainerTitle = new MenuId('ViewContainerTitle'); }
    static { this.ViewContainerTitleContext = new MenuId('ViewContainerTitleContext'); }
    static { this.ViewTitle = new MenuId('ViewTitle'); }
    static { this.ViewTitleContext = new MenuId('ViewTitleContext'); }
    static { this.CommentEditorActions = new MenuId('CommentEditorActions'); }
    static { this.CommentThreadTitle = new MenuId('CommentThreadTitle'); }
    static { this.CommentThreadActions = new MenuId('CommentThreadActions'); }
    static { this.CommentThreadAdditionalActions = new MenuId('CommentThreadAdditionalActions'); }
    static { this.CommentThreadTitleContext = new MenuId('CommentThreadTitleContext'); }
    static { this.CommentThreadCommentContext = new MenuId('CommentThreadCommentContext'); }
    static { this.CommentTitle = new MenuId('CommentTitle'); }
    static { this.CommentActions = new MenuId('CommentActions'); }
    static { this.CommentsViewThreadActions = new MenuId('CommentsViewThreadActions'); }
    static { this.InteractiveToolbar = new MenuId('InteractiveToolbar'); }
    static { this.InteractiveCellTitle = new MenuId('InteractiveCellTitle'); }
    static { this.InteractiveCellDelete = new MenuId('InteractiveCellDelete'); }
    static { this.InteractiveCellExecute = new MenuId('InteractiveCellExecute'); }
    static { this.InteractiveInputExecute = new MenuId('InteractiveInputExecute'); }
    static { this.InteractiveInputConfig = new MenuId('InteractiveInputConfig'); }
    static { this.ReplInputExecute = new MenuId('ReplInputExecute'); }
    static { this.IssueReporter = new MenuId('IssueReporter'); }
    static { this.NotebookToolbar = new MenuId('NotebookToolbar'); }
    static { this.NotebookToolbarContext = new MenuId('NotebookToolbarContext'); }
    static { this.NotebookStickyScrollContext = new MenuId('NotebookStickyScrollContext'); }
    static { this.NotebookCellTitle = new MenuId('NotebookCellTitle'); }
    static { this.NotebookCellDelete = new MenuId('NotebookCellDelete'); }
    static { this.NotebookCellInsert = new MenuId('NotebookCellInsert'); }
    static { this.NotebookCellBetween = new MenuId('NotebookCellBetween'); }
    static { this.NotebookCellListTop = new MenuId('NotebookCellTop'); }
    static { this.NotebookCellExecute = new MenuId('NotebookCellExecute'); }
    static { this.NotebookCellExecuteGoTo = new MenuId('NotebookCellExecuteGoTo'); }
    static { this.NotebookCellExecutePrimary = new MenuId('NotebookCellExecutePrimary'); }
    static { this.NotebookDiffCellInputTitle = new MenuId('NotebookDiffCellInputTitle'); }
    static { this.NotebookDiffDocumentMetadata = new MenuId('NotebookDiffDocumentMetadata'); }
    static { this.NotebookDiffCellMetadataTitle = new MenuId('NotebookDiffCellMetadataTitle'); }
    static { this.NotebookDiffCellOutputsTitle = new MenuId('NotebookDiffCellOutputsTitle'); }
    static { this.NotebookOutputToolbar = new MenuId('NotebookOutputToolbar'); }
    static { this.NotebookOutlineFilter = new MenuId('NotebookOutlineFilter'); }
    static { this.NotebookOutlineActionMenu = new MenuId('NotebookOutlineActionMenu'); }
    static { this.NotebookEditorLayoutConfigure = new MenuId('NotebookEditorLayoutConfigure'); }
    static { this.NotebookKernelSource = new MenuId('NotebookKernelSource'); }
    static { this.BulkEditTitle = new MenuId('BulkEditTitle'); }
    static { this.BulkEditContext = new MenuId('BulkEditContext'); }
    static { this.TimelineItemContext = new MenuId('TimelineItemContext'); }
    static { this.TimelineTitle = new MenuId('TimelineTitle'); }
    static { this.TimelineTitleContext = new MenuId('TimelineTitleContext'); }
    static { this.TimelineFilterSubMenu = new MenuId('TimelineFilterSubMenu'); }
    static { this.AccountsContext = new MenuId('AccountsContext'); }
    static { this.SidebarTitle = new MenuId('SidebarTitle'); }
    static { this.PanelTitle = new MenuId('PanelTitle'); }
    static { this.AuxiliaryBarTitle = new MenuId('AuxiliaryBarTitle'); }
    static { this.AuxiliaryBarHeader = new MenuId('AuxiliaryBarHeader'); }
    static { this.TerminalInstanceContext = new MenuId('TerminalInstanceContext'); }
    static { this.TerminalEditorInstanceContext = new MenuId('TerminalEditorInstanceContext'); }
    static { this.TerminalNewDropdownContext = new MenuId('TerminalNewDropdownContext'); }
    static { this.TerminalTabContext = new MenuId('TerminalTabContext'); }
    static { this.TerminalTabEmptyAreaContext = new MenuId('TerminalTabEmptyAreaContext'); }
    static { this.TerminalStickyScrollContext = new MenuId('TerminalStickyScrollContext'); }
    static { this.WebviewContext = new MenuId('WebviewContext'); }
    static { this.InlineCompletionsActions = new MenuId('InlineCompletionsActions'); }
    static { this.InlineEditsActions = new MenuId('InlineEditsActions'); }
    static { this.NewFile = new MenuId('NewFile'); }
    static { this.MergeInput1Toolbar = new MenuId('MergeToolbar1Toolbar'); }
    static { this.MergeInput2Toolbar = new MenuId('MergeToolbar2Toolbar'); }
    static { this.MergeBaseToolbar = new MenuId('MergeBaseToolbar'); }
    static { this.MergeInputResultToolbar = new MenuId('MergeToolbarResultToolbar'); }
    static { this.InlineSuggestionToolbar = new MenuId('InlineSuggestionToolbar'); }
    static { this.InlineEditToolbar = new MenuId('InlineEditToolbar'); }
    static { this.ChatContext = new MenuId('ChatContext'); }
    static { this.ChatCodeBlock = new MenuId('ChatCodeblock'); }
    static { this.ChatCompareBlock = new MenuId('ChatCompareBlock'); }
    static { this.ChatMessageTitle = new MenuId('ChatMessageTitle'); }
    static { this.ChatMessageFooter = new MenuId('ChatMessageFooter'); }
    static { this.ChatExecute = new MenuId('ChatExecute'); }
    static { this.ChatExecuteSecondary = new MenuId('ChatExecuteSecondary'); }
    static { this.ChatInput = new MenuId('ChatInput'); }
    static { this.ChatInputSide = new MenuId('ChatInputSide'); }
    static { this.ChatModelPicker = new MenuId('ChatModelPicker'); }
    static { this.ChatEditingWidgetToolbar = new MenuId('ChatEditingWidgetToolbar'); }
    static { this.ChatEditingEditorContent = new MenuId('ChatEditingEditorContent'); }
    static { this.ChatEditingEditorHunk = new MenuId('ChatEditingEditorHunk'); }
    static { this.ChatEditingDeletedNotebookCell = new MenuId('ChatEditingDeletedNotebookCell'); }
    static { this.ChatInputAttachmentToolbar = new MenuId('ChatInputAttachmentToolbar'); }
    static { this.ChatEditingWidgetModifiedFilesToolbar = new MenuId('ChatEditingWidgetModifiedFilesToolbar'); }
    static { this.ChatInputResourceAttachmentContext = new MenuId('ChatInputResourceAttachmentContext'); }
    static { this.ChatInputSymbolAttachmentContext = new MenuId('ChatInputSymbolAttachmentContext'); }
    static { this.ChatInlineResourceAnchorContext = new MenuId('ChatInlineResourceAnchorContext'); }
    static { this.ChatInlineSymbolAnchorContext = new MenuId('ChatInlineSymbolAnchorContext'); }
    static { this.ChatEditingCodeBlockContext = new MenuId('ChatEditingCodeBlockContext'); }
    static { this.ChatTitleBarMenu = new MenuId('ChatTitleBarMenu'); }
    static { this.ChatAttachmentsContext = new MenuId('ChatAttachmentsContext'); }
    static { this.AccessibleView = new MenuId('AccessibleView'); }
    static { this.MultiDiffEditorFileToolbar = new MenuId('MultiDiffEditorFileToolbar'); }
    static { this.DiffEditorHunkToolbar = new MenuId('DiffEditorHunkToolbar'); }
    static { this.DiffEditorSelectionToolbar = new MenuId('DiffEditorSelectionToolbar'); }
    /**
     * Create or reuse a `MenuId` with the given identifier
     */
    static for(identifier) {
        return MenuId._instances.get(identifier) ?? new MenuId(identifier);
    }
    /**
     * Create a new `MenuId` with the unique identifier. Will throw if a menu
     * with the identifier already exists, use `MenuId.for(ident)` or a unique
     * identifier
     */
    constructor(identifier) {
        if (MenuId._instances.has(identifier)) {
            throw new TypeError(`MenuId with identifier '${identifier}' already exists. Use MenuId.for(ident) or a unique identifier`);
        }
        MenuId._instances.set(identifier, this);
        this.id = identifier;
    }
}
export const IMenuService = createDecorator('menuService');
class MenuRegistryChangeEvent {
    static { this._all = new Map(); }
    static for(id) {
        let value = this._all.get(id);
        if (!value) {
            value = new MenuRegistryChangeEvent(id);
            this._all.set(id, value);
        }
        return value;
    }
    static merge(events) {
        const ids = new Set();
        for (const item of events) {
            if (item instanceof MenuRegistryChangeEvent) {
                ids.add(item.id);
            }
        }
        return ids;
    }
    constructor(id) {
        this.id = id;
        this.has = candidate => candidate === id;
    }
}
export const MenuRegistry = new class {
    constructor() {
        this._commands = new Map();
        this._menuItems = new Map();
        this._onDidChangeMenu = new MicrotaskEmitter({
            merge: MenuRegistryChangeEvent.merge
        });
        this.onDidChangeMenu = this._onDidChangeMenu.event;
    }
    addCommand(command) {
        this._commands.set(command.id, command);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
        return markAsSingleton(toDisposable(() => {
            if (this._commands.delete(command.id)) {
                this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
            }
        }));
    }
    getCommand(id) {
        return this._commands.get(id);
    }
    getCommands() {
        const map = new Map();
        this._commands.forEach((value, key) => map.set(key, value));
        return map;
    }
    appendMenuItem(id, item) {
        let list = this._menuItems.get(id);
        if (!list) {
            list = new LinkedList();
            this._menuItems.set(id, list);
        }
        const rm = list.push(item);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        return markAsSingleton(toDisposable(() => {
            rm();
            this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        }));
    }
    appendMenuItems(items) {
        const result = new DisposableStore();
        for (const { id, item } of items) {
            result.add(this.appendMenuItem(id, item));
        }
        return result;
    }
    getMenuItems(id) {
        let result;
        if (this._menuItems.has(id)) {
            result = [...this._menuItems.get(id)];
        }
        else {
            result = [];
        }
        if (id === MenuId.CommandPalette) {
            // CommandPalette is special because it shows
            // all commands by default
            this._appendImplicitItems(result);
        }
        return result;
    }
    _appendImplicitItems(result) {
        const set = new Set();
        for (const item of result) {
            if (isIMenuItem(item)) {
                set.add(item.command.id);
                if (item.alt) {
                    set.add(item.alt.id);
                }
            }
        }
        this._commands.forEach((command, id) => {
            if (!set.has(id)) {
                result.push({ command });
            }
        });
    }
};
export class SubmenuItemAction extends SubmenuAction {
    constructor(item, hideActions, actions) {
        super(`submenuitem.${item.submenu.id}`, typeof item.title === 'string' ? item.title : item.title.value, actions, 'submenu');
        this.item = item;
        this.hideActions = hideActions;
    }
}
// implements IAction, does NOT extend Action, so that no one
// subscribes to events of Action or modified properties
let MenuItemAction = MenuItemAction_1 = class MenuItemAction {
    static label(action, options) {
        return options?.renderShortTitle && action.shortTitle
            ? (typeof action.shortTitle === 'string' ? action.shortTitle : action.shortTitle.value)
            : (typeof action.title === 'string' ? action.title : action.title.value);
    }
    constructor(item, alt, options, hideActions, menuKeybinding, contextKeyService, _commandService) {
        this.hideActions = hideActions;
        this.menuKeybinding = menuKeybinding;
        this._commandService = _commandService;
        this.id = item.id;
        this.label = MenuItemAction_1.label(item, options);
        this.tooltip = (typeof item.tooltip === 'string' ? item.tooltip : item.tooltip?.value) ?? '';
        this.enabled = !item.precondition || contextKeyService.contextMatchesRules(item.precondition);
        this.checked = undefined;
        let icon;
        if (item.toggled) {
            const toggled = (item.toggled.condition ? item.toggled : { condition: item.toggled });
            this.checked = contextKeyService.contextMatchesRules(toggled.condition);
            if (this.checked && toggled.tooltip) {
                this.tooltip = typeof toggled.tooltip === 'string' ? toggled.tooltip : toggled.tooltip.value;
            }
            if (this.checked && ThemeIcon.isThemeIcon(toggled.icon)) {
                icon = toggled.icon;
            }
            if (this.checked && toggled.title) {
                this.label = typeof toggled.title === 'string' ? toggled.title : toggled.title.value;
            }
        }
        if (!icon) {
            icon = ThemeIcon.isThemeIcon(item.icon) ? item.icon : undefined;
        }
        this.item = item;
        this.alt = alt ? new MenuItemAction_1(alt, undefined, options, hideActions, undefined, contextKeyService, _commandService) : undefined;
        this._options = options;
        this.class = icon && ThemeIcon.asClassName(icon);
    }
    run(...args) {
        let runArgs = [];
        if (this._options?.arg) {
            runArgs = [...runArgs, this._options.arg];
        }
        if (this._options?.shouldForwardArgs) {
            runArgs = [...runArgs, ...args];
        }
        return this._commandService.executeCommand(this.id, ...runArgs);
    }
};
MenuItemAction = MenuItemAction_1 = __decorate([
    __param(5, IContextKeyService),
    __param(6, ICommandService)
], MenuItemAction);
export { MenuItemAction };
export class Action2 {
    constructor(desc) {
        this.desc = desc;
    }
}
export function registerAction2(ctor) {
    const disposables = []; // not using `DisposableStore` to reduce startup perf cost
    const action = new ctor();
    const { f1, menu, keybinding, ...command } = action.desc;
    if (CommandsRegistry.getCommand(command.id)) {
        throw new Error(`Cannot register two commands with the same id: ${command.id}`);
    }
    // command
    disposables.push(CommandsRegistry.registerCommand({
        id: command.id,
        handler: (accessor, ...args) => action.run(accessor, ...args),
        metadata: command.metadata ?? { description: action.desc.title }
    }));
    // menu
    if (Array.isArray(menu)) {
        for (const item of menu) {
            disposables.push(MenuRegistry.appendMenuItem(item.id, { command: { ...command, precondition: item.precondition === null ? undefined : command.precondition }, ...item }));
        }
    }
    else if (menu) {
        disposables.push(MenuRegistry.appendMenuItem(menu.id, { command: { ...command, precondition: menu.precondition === null ? undefined : command.precondition }, ...menu }));
    }
    if (f1) {
        disposables.push(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command, when: command.precondition }));
        disposables.push(MenuRegistry.addCommand(command));
    }
    // keybinding
    if (Array.isArray(keybinding)) {
        for (const item of keybinding) {
            disposables.push(KeybindingsRegistry.registerKeybindingRule({
                ...item,
                id: command.id,
                when: command.precondition ? ContextKeyExpr.and(command.precondition, item.when) : item.when
            }));
        }
    }
    else if (keybinding) {
        disposables.push(KeybindingsRegistry.registerKeybindingRule({
            ...keybinding,
            id: command.id,
            when: command.precondition ? ContextKeyExpr.and(command.precondition, keybinding.when) : keybinding.when
        }));
    }
    return {
        dispose() {
            dispose(disposables);
        }
    };
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2NvbW1vbi9hY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVcsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRyxPQUFPLEVBQW1CLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUF5QnRHLE1BQU0sVUFBVSxXQUFXLENBQUMsSUFBUztJQUNwQyxPQUFRLElBQWtCLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQztBQUNsRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxJQUFTO0lBQ3ZDLE9BQVEsSUFBcUIsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDO0FBQ3JELENBQUM7QUFFRCxNQUFNLE9BQU8sTUFBTTthQUVNLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQzthQUUvQyxtQkFBYyxHQUFH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