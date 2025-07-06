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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvY29tbW9uL2FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBVyxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBd0Isa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLDZDQUE2QyxDQUFDO0FBQ2hHLE9BQU8sRUFBbUIsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQXlCdEcsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFTO0lBQ3BDLE9BQVEsSUFBa0IsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDO0FBQ2xELENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLElBQVM7SUFDdkMsT0FBUSxJQUFxQixDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUM7QUFDckQsQ0FBQztBQUVELE1BQU0sT0FBTyxNQUFNO2FBRU0sZUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO2FBRS9DLG1CQUFjLEdBQUcs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