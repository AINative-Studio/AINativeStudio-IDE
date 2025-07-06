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
import { localize } from '../../../../nls.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import * as resources from '../../../../base/common/resources.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { index } from '../../../../base/common/arrays.js';
import { isProposedApiEnabled } from '../../extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { platform } from '../../../../base/common/process.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
const apiMenus = [
    {
        key: 'commandPalette',
        id: MenuId.CommandPalette,
        description: localize('menus.commandPalette', "The Command Palette"),
        supportsSubmenus: false
    },
    {
        key: 'touchBar',
        id: MenuId.TouchBarContext,
        description: localize('menus.touchBar', "The touch bar (macOS only)"),
        supportsSubmenus: false
    },
    {
        key: 'editor/title',
        id: MenuId.EditorTitle,
        description: localize('menus.editorTitle', "The editor title menu")
    },
    {
        key: 'editor/title/run',
        id: MenuId.EditorTitleRun,
        description: localize('menus.editorTitleRun', "Run submenu inside the editor title menu")
    },
    {
        key: 'editor/context',
        id: MenuId.EditorContext,
        description: localize('menus.editorContext', "The editor context menu")
    },
    {
        key: 'editor/context/copy',
        id: MenuId.EditorContextCopy,
        description: localize('menus.editorContextCopyAs', "'Copy as' submenu in the editor context menu")
    },
    {
        key: 'editor/context/share',
        id: MenuId.EditorContextShare,
        description: localize('menus.editorContextShare', "'Share' submenu in the editor context menu"),
        proposed: 'contribShareMenu'
    },
    {
        key: 'explorer/context',
        id: MenuId.ExplorerContext,
        description: localize('menus.explorerContext', "The file explorer context menu")
    },
    {
        key: 'explorer/context/share',
        id: MenuId.ExplorerContextShare,
        description: localize('menus.explorerContextShare', "'Share' submenu in the file explorer context menu"),
        proposed: 'contribShareMenu'
    },
    {
        key: 'editor/title/context',
        id: MenuId.EditorTitleContext,
        description: localize('menus.editorTabContext', "The editor tabs context menu")
    },
    {
        key: 'editor/title/context/share',
        id: MenuId.EditorTitleContextShare,
        description: localize('menus.editorTitleContextShare', "'Share' submenu inside the editor title context menu"),
        proposed: 'contribShareMenu'
    },
    {
        key: 'debug/callstack/context',
        id: MenuId.DebugCallStackContext,
        description: localize('menus.debugCallstackContext', "The debug callstack view context menu")
    },
    {
        key: 'debug/variables/context',
        id: MenuId.DebugVariablesContext,
        description: localize('menus.debugVariablesContext', "The debug variables view context menu")
    },
    {
        key: 'debug/toolBar',
        id: MenuId.DebugToolBar,
        description: localize('menus.debugToolBar', "The debug toolbar menu")
    },
    {
        key: 'debug/createConfiguration',
        id: MenuId.DebugCreateConfiguration,
        proposed: 'contribDebugCreateConfiguration',
        description: localize('menus.debugCreateConfiguation', "The debug create configuration menu")
    },
    {
        key: 'notebook/variables/context',
        id: MenuId.NotebookVariablesContext,
        description: localize('menus.notebookVariablesContext', "The notebook variables view context menu")
    },
    {
        key: 'menuBar/home',
        id: MenuId.MenubarHomeMenu,
        description: localize('menus.home', "The home indicator context menu (web only)"),
        proposed: 'contribMenuBarHome',
        supportsSubmenus: false
    },
    {
        key: 'menuBar/edit/copy',
        id: MenuId.MenubarCopy,
        description: localize('menus.opy', "'Copy as' submenu in the top level Edit menu")
    },
    {
        key: 'scm/title',
        id: MenuId.SCMTitle,
        description: localize('menus.scmTitle', "The Source Control title menu")
    },
    {
        key: 'scm/sourceControl',
        id: MenuId.SCMSourceControl,
        description: localize('menus.scmSourceControl', "The Source Control menu")
    },
    {
        key: 'scm/sourceControl/title',
        id: MenuId.SCMSourceControlTitle,
        description: localize('menus.scmSourceControlTitle', "The Source Control title menu"),
        proposed: 'contribSourceControlTitleMenu'
    },
    {
        key: 'scm/resourceState/context',
        id: MenuId.SCMResourceContext,
        description: localize('menus.resourceStateContext', "The Source Control resource state context menu")
    },
    {
        key: 'scm/resourceFolder/context',
        id: MenuId.SCMResourceFolderContext,
        description: localize('menus.resourceFolderContext', "The Source Control resource folder context menu")
    },
    {
        key: 'scm/resourceGroup/context',
        id: MenuId.SCMResourceGroupContext,
        description: localize('menus.resourceGroupContext', "The Source Control resource group context menu")
    },
    {
        key: 'scm/change/title',
        id: MenuId.SCMChangeContext,
        description: localize('menus.changeTitle', "The Source Control inline change menu")
    },
    {
        key: 'scm/inputBox',
        id: MenuId.SCMInputBox,
        description: localize('menus.input', "The Source Control input box menu"),
        proposed: 'contribSourceControlInputBoxMenu'
    },
    {
        key: 'scm/history/title',
        id: MenuId.SCMHistoryTitle,
        description: localize('menus.scmHistoryTitle', "The Source Control History title menu"),
        proposed: 'contribSourceControlHistoryTitleMenu'
    },
    {
        key: 'scm/historyItem/context',
        id: MenuId.SCMHistoryItemContext,
        description: localize('menus.historyItemContext', "The Source Control history item context menu"),
        proposed: 'contribSourceControlHistoryItemMenu'
    },
    {
        key: 'scm/historyItem/hover',
        id: MenuId.SCMHistoryItemHover,
        description: localize('menus.historyItemHover', "The Source Control history item hover menu"),
        proposed: 'contribSourceControlHistoryItemMenu'
    },
    {
        key: 'scm/historyItemRef/context',
        id: MenuId.SCMHistoryItemRefContext,
        description: localize('menus.historyItemRefContext', "The Source Control history item reference context menu"),
        proposed: 'contribSourceControlHistoryItemMenu'
    },
    {
        key: 'statusBar/remoteIndicator',
        id: MenuId.StatusBarRemoteIndicatorMenu,
        description: localize('menus.statusBarRemoteIndicator', "The remote indicator menu in the status bar"),
        supportsSubmenus: false
    },
    {
        key: 'terminal/context',
        id: MenuId.TerminalInstanceContext,
        description: localize('menus.terminalContext', "The terminal context menu")
    },
    {
        key: 'terminal/title/context',
        id: MenuId.TerminalTabContext,
        description: localize('menus.terminalTabContext', "The terminal tabs context menu")
    },
    {
        key: 'view/title',
        id: MenuId.ViewTitle,
        description: localize('view.viewTitle', "The contributed view title menu")
    },
    {
        key: 'viewContainer/title',
        id: MenuId.ViewContainerTitle,
        description: localize('view.containerTitle', "The contributed view container title menu"),
        proposed: 'contribViewContainerTitle'
    },
    {
        key: 'view/item/context',
        id: MenuId.ViewItemContext,
        description: localize('view.itemContext', "The contributed view item context menu")
    },
    {
        key: 'comments/comment/editorActions',
        id: MenuId.CommentEditorActions,
        description: localize('commentThread.editorActions', "The contributed comment editor actions"),
        proposed: 'contribCommentEditorActionsMenu'
    },
    {
        key: 'comments/commentThread/title',
        id: MenuId.CommentThreadTitle,
        description: localize('commentThread.title', "The contributed comment thread title menu")
    },
    {
        key: 'comments/commentThread/context',
        id: MenuId.CommentThreadActions,
        description: localize('commentThread.actions', "The contributed comment thread context menu, rendered as buttons below the comment editor"),
        supportsSubmenus: false
    },
    {
        key: 'comments/commentThread/additionalActions',
        id: MenuId.CommentThreadAdditionalActions,
        description: localize('commentThread.actions', "The contributed comment thread context menu, rendered as buttons below the comment editor"),
        supportsSubmenus: true,
        proposed: 'contribCommentThreadAdditionalMenu'
    },
    {
        key: 'comments/commentThread/title/context',
        id: MenuId.CommentThreadTitleContext,
        description: localize('commentThread.titleContext', "The contributed comment thread title's peek context menu, rendered as a right click menu on the comment thread's peek title."),
        proposed: 'contribCommentPeekContext'
    },
    {
        key: 'comments/comment/title',
        id: MenuId.CommentTitle,
        description: localize('comment.title', "The contributed comment title menu")
    },
    {
        key: 'comments/comment/context',
        id: MenuId.CommentActions,
        description: localize('comment.actions', "The contributed comment context menu, rendered as buttons below the comment editor"),
        supportsSubmenus: false
    },
    {
        key: 'comments/commentThread/comment/context',
        id: MenuId.CommentThreadCommentContext,
        description: localize('comment.commentContext', "The contributed comment context menu, rendered as a right click menu on the an individual comment in the comment thread's peek view."),
        proposed: 'contribCommentPeekContext'
    },
    {
        key: 'commentsView/commentThread/context',
        id: MenuId.CommentsViewThreadActions,
        description: localize('commentsView.threadActions', "The contributed comment thread context menu in the comments view"),
        proposed: 'contribCommentsViewThreadMenus'
    },
    {
        key: 'notebook/toolbar',
        id: MenuId.NotebookToolbar,
        description: localize('notebook.toolbar', "The contributed notebook toolbar menu")
    },
    {
        key: 'notebook/kernelSource',
        id: MenuId.NotebookKernelSource,
        description: localize('notebook.kernelSource', "The contributed notebook kernel sources menu"),
        proposed: 'notebookKernelSource'
    },
    {
        key: 'notebook/cell/title',
        id: MenuId.NotebookCellTitle,
        description: localize('notebook.cell.title', "The contributed notebook cell title menu")
    },
    {
        key: 'notebook/cell/execute',
        id: MenuId.NotebookCellExecute,
        description: localize('notebook.cell.execute', "The contributed notebook cell execution menu")
    },
    {
        key: 'interactive/toolbar',
        id: MenuId.InteractiveToolbar,
        description: localize('interactive.toolbar', "The contributed interactive toolbar menu"),
    },
    {
        key: 'interactive/cell/title',
        id: MenuId.InteractiveCellTitle,
        description: localize('interactive.cell.title', "The contributed interactive cell title menu"),
    },
    {
        key: 'issue/reporter',
        id: MenuId.IssueReporter,
        description: localize('issue.reporter', "The contributed issue reporter menu")
    },
    {
        key: 'testing/item/context',
        id: MenuId.TestItem,
        description: localize('testing.item.context', "The contributed test item menu"),
    },
    {
        key: 'testing/item/gutter',
        id: MenuId.TestItemGutter,
        description: localize('testing.item.gutter.title', "The menu for a gutter decoration for a test item"),
    },
    {
        key: 'testing/profiles/context',
        id: MenuId.TestProfilesContext,
        description: localize('testing.profiles.context.title', "The menu for configuring testing profiles."),
    },
    {
        key: 'testing/item/result',
        id: MenuId.TestPeekElement,
        description: localize('testing.item.result.title', "The menu for an item in the Test Results view or peek."),
    },
    {
        key: 'testing/message/context',
        id: MenuId.TestMessageContext,
        description: localize('testing.message.context.title', "A prominent button overlaying editor content where the message is displayed"),
    },
    {
        key: 'testing/message/content',
        id: MenuId.TestMessageContent,
        description: localize('testing.message.content.title', "Context menu for the message in the results tree"),
    },
    {
        key: 'extension/context',
        id: MenuId.ExtensionContext,
        description: localize('menus.extensionContext', "The extension context menu")
    },
    {
        key: 'timeline/title',
        id: MenuId.TimelineTitle,
        description: localize('view.timelineTitle', "The Timeline view title menu")
    },
    {
        key: 'timeline/item/context',
        id: MenuId.TimelineItemContext,
        description: localize('view.timelineContext', "The Timeline view item context menu")
    },
    {
        key: 'ports/item/context',
        id: MenuId.TunnelContext,
        description: localize('view.tunnelContext', "The Ports view item context menu")
    },
    {
        key: 'ports/item/origin/inline',
        id: MenuId.TunnelOriginInline,
        description: localize('view.tunnelOriginInline', "The Ports view item origin inline menu")
    },
    {
        key: 'ports/item/port/inline',
        id: MenuId.TunnelPortInline,
        description: localize('view.tunnelPortInline', "The Ports view item port inline menu")
    },
    {
        key: 'file/newFile',
        id: MenuId.NewFile,
        description: localize('file.newFile', "The 'New File...' quick pick, shown on welcome page and File menu."),
        supportsSubmenus: false,
    },
    {
        key: 'webview/context',
        id: MenuId.WebviewContext,
        description: localize('webview.context', "The webview context menu")
    },
    {
        key: 'file/share',
        id: MenuId.MenubarShare,
        description: localize('menus.share', "Share submenu shown in the top level File menu."),
        proposed: 'contribShareMenu'
    },
    {
        key: 'editor/inlineCompletions/actions',
        id: MenuId.InlineCompletionsActions,
        description: localize('inlineCompletions.actions', "The actions shown when hovering on an inline completion"),
        supportsSubmenus: false,
        proposed: 'inlineCompletionsAdditions'
    },
    {
        key: 'editor/content',
        id: MenuId.EditorContent,
        description: localize('merge.toolbar', "The prominent button in an editor, overlays its content"),
        proposed: 'contribEditorContentMenu'
    },
    {
        key: 'editor/lineNumber/context',
        id: MenuId.EditorLineNumberContext,
        description: localize('editorLineNumberContext', "The contributed editor line number context menu")
    },
    {
        key: 'mergeEditor/result/title',
        id: MenuId.MergeInputResultToolbar,
        description: localize('menus.mergeEditorResult', "The result toolbar of the merge editor"),
        proposed: 'contribMergeEditorMenus'
    },
    {
        key: 'multiDiffEditor/resource/title',
        id: MenuId.MultiDiffEditorFileToolbar,
        description: localize('menus.multiDiffEditorResource', "The resource toolbar in the multi diff editor"),
        proposed: 'contribMultiDiffEditorMenus'
    },
    {
        key: 'diffEditor/gutter/hunk',
        id: MenuId.DiffEditorHunkToolbar,
        description: localize('menus.diffEditorGutterToolBarMenus', "The gutter toolbar in the diff editor"),
        proposed: 'contribDiffEditorGutterToolBarMenus'
    },
    {
        key: 'diffEditor/gutter/selection',
        id: MenuId.DiffEditorSelectionToolbar,
        description: localize('menus.diffEditorGutterToolBarMenus', "The gutter toolbar in the diff editor"),
        proposed: 'contribDiffEditorGutterToolBarMenus'
    },
    {
        key: 'searchPanel/aiResults/commands',
        id: MenuId.SearchActionMenu,
        description: localize('searchPanel.aiResultsCommands', "The commands that will contribute to the menu rendered as buttons next to the AI search title"),
    },
    {
        key: 'chat/modelPicker',
        id: MenuId.ChatModelPicker,
        description: localize('menus.chatModelPicker', "The chat model picker dropdown menu"),
        supportsSubmenus: false,
        proposed: 'chatParticipantPrivate'
    }
];
var schema;
(function (schema) {
    // --- menus, submenus contribution point
    function isMenuItem(item) {
        return typeof item.command === 'string';
    }
    schema.isMenuItem = isMenuItem;
    function isValidMenuItem(item, collector) {
        if (typeof item.command !== 'string') {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'command'));
            return false;
        }
        if (item.alt && typeof item.alt !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'alt'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'group'));
            return false;
        }
        return true;
    }
    schema.isValidMenuItem = isValidMenuItem;
    function isValidSubmenuItem(item, collector) {
        if (typeof item.submenu !== 'string') {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'submenu'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'group'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenuItem = isValidSubmenuItem;
    function isValidItems(items, collector) {
        if (!Array.isArray(items)) {
            collector.error(localize('requirearray', "submenu items must be an array"));
            return false;
        }
        for (const item of items) {
            if (isMenuItem(item)) {
                if (!isValidMenuItem(item, collector)) {
                    return false;
                }
            }
            else {
                if (!isValidSubmenuItem(item, collector)) {
                    return false;
                }
            }
        }
        return true;
    }
    schema.isValidItems = isValidItems;
    function isValidSubmenu(submenu, collector) {
        if (typeof submenu !== 'object') {
            collector.error(localize('require', "submenu items must be an object"));
            return false;
        }
        if (typeof submenu.id !== 'string') {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'id'));
            return false;
        }
        if (typeof submenu.label !== 'string') {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'label'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenu = isValidSubmenu;
    const menuItem = {
        type: 'object',
        required: ['command'],
        properties: {
            command: {
                description: localize('vscode.extension.contributes.menuItem.command', 'Identifier of the command to execute. The command must be declared in the \'commands\'-section'),
                type: 'string'
            },
            alt: {
                description: localize('vscode.extension.contributes.menuItem.alt', 'Identifier of an alternative command to execute. The command must be declared in the \'commands\'-section'),
                type: 'string'
            },
            when: {
                description: localize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
                type: 'string'
            },
            group: {
                description: localize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
                type: 'string'
            }
        }
    };
    const submenuItem = {
        type: 'object',
        required: ['submenu'],
        properties: {
            submenu: {
                description: localize('vscode.extension.contributes.menuItem.submenu', 'Identifier of the submenu to display in this item.'),
                type: 'string'
            },
            when: {
                description: localize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
                type: 'string'
            },
            group: {
                description: localize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
                type: 'string'
            }
        }
    };
    const submenu = {
        type: 'object',
        required: ['id', 'label'],
        properties: {
            id: {
                description: localize('vscode.extension.contributes.submenu.id', 'Identifier of the menu to display as a submenu.'),
                type: 'string'
            },
            label: {
                description: localize('vscode.extension.contributes.submenu.label', 'The label of the menu item which leads to this submenu.'),
                type: 'string'
            },
            icon: {
                description: localize({ key: 'vscode.extension.contributes.submenu.icon', comment: ['do not translate or change `\\$(zap)`, \\ in front of $ is important.'] }, '(Optional) Icon which is used to represent the submenu in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
                anyOf: [{
                        type: 'string'
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize('vscode.extension.contributes.submenu.icon.light', 'Icon path when a light theme is used'),
                                type: 'string'
                            },
                            dark: {
                                description: localize('vscode.extension.contributes.submenu.icon.dark', 'Icon path when a dark theme is used'),
                                type: 'string'
                            }
                        }
                    }]
            }
        }
    };
    schema.menusContribution = {
        description: localize('vscode.extension.contributes.menus', "Contributes menu items to the editor"),
        type: 'object',
        properties: index(apiMenus, menu => menu.key, menu => ({
            markdownDescription: menu.proposed ? localize('proposed', "Proposed API, requires `enabledApiProposal: [\"{0}\"]` - {1}", menu.proposed, menu.description) : menu.description,
            type: 'array',
            items: menu.supportsSubmenus === false ? menuItem : { oneOf: [menuItem, submenuItem] }
        })),
        additionalProperties: {
            description: 'Submenu',
            type: 'array',
            items: { oneOf: [menuItem, submenuItem] }
        }
    };
    schema.submenusContribution = {
        description: localize('vscode.extension.contributes.submenus', "Contributes submenu items to the editor"),
        type: 'array',
        items: submenu
    };
    function isValidCommand(command, collector) {
        if (!command) {
            collector.error(localize('nonempty', "expected non-empty value."));
            return false;
        }
        if (isFalsyOrWhitespace(command.command)) {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'command'));
            return false;
        }
        if (!isValidLocalizedString(command.title, collector, 'title')) {
            return false;
        }
        if (command.shortTitle && !isValidLocalizedString(command.shortTitle, collector, 'shortTitle')) {
            return false;
        }
        if (command.enablement && typeof command.enablement !== 'string') {
            collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'precondition'));
            return false;
        }
        if (command.category && !isValidLocalizedString(command.category, collector, 'category')) {
            return false;
        }
        if (!isValidIcon(command.icon, collector)) {
            return false;
        }
        return true;
    }
    schema.isValidCommand = isValidCommand;
    function isValidIcon(icon, collector) {
        if (typeof icon === 'undefined') {
            return true;
        }
        if (typeof icon === 'string') {
            return true;
        }
        else if (typeof icon.dark === 'string' && typeof icon.light === 'string') {
            return true;
        }
        collector.error(localize('opticon', "property `icon` can be omitted or must be either a string or a literal like `{dark, light}`"));
        return false;
    }
    function isValidLocalizedString(localized, collector, propertyName) {
        if (typeof localized === 'undefined') {
            collector.error(localize('requireStringOrObject', "property `{0}` is mandatory and must be of type `string` or `object`", propertyName));
            return false;
        }
        else if (typeof localized === 'string' && isFalsyOrWhitespace(localized)) {
            collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", propertyName));
            return false;
        }
        else if (typeof localized !== 'string' && (isFalsyOrWhitespace(localized.original) || isFalsyOrWhitespace(localized.value))) {
            collector.error(localize('requirestrings', "properties `{0}` and `{1}` are mandatory and must be of type `string`", `${propertyName}.value`, `${propertyName}.original`));
            return false;
        }
        return true;
    }
    const commandType = {
        type: 'object',
        required: ['command', 'title'],
        properties: {
            command: {
                description: localize('vscode.extension.contributes.commandType.command', 'Identifier of the command to execute'),
                type: 'string'
            },
            title: {
                description: localize('vscode.extension.contributes.commandType.title', 'Title by which the command is represented in the UI'),
                type: 'string'
            },
            shortTitle: {
                markdownDescription: localize('vscode.extension.contributes.commandType.shortTitle', '(Optional) Short title by which the command is represented in the UI. Menus pick either `title` or `shortTitle` depending on the context in which they show commands.'),
                type: 'string'
            },
            category: {
                description: localize('vscode.extension.contributes.commandType.category', '(Optional) Category string by which the command is grouped in the UI'),
                type: 'string'
            },
            enablement: {
                description: localize('vscode.extension.contributes.commandType.precondition', '(Optional) Condition which must be true to enable the command in the UI (menu and keybindings). Does not prevent executing the command by other means, like the `executeCommand`-api.'),
                type: 'string'
            },
            icon: {
                description: localize({ key: 'vscode.extension.contributes.commandType.icon', comment: ['do not translate or change `\\$(zap)`, \\ in front of $ is important.'] }, '(Optional) Icon which is used to represent the command in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
                anyOf: [{
                        type: 'string'
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize('vscode.extension.contributes.commandType.icon.light', 'Icon path when a light theme is used'),
                                type: 'string'
                            },
                            dark: {
                                description: localize('vscode.extension.contributes.commandType.icon.dark', 'Icon path when a dark theme is used'),
                                type: 'string'
                            }
                        }
                    }]
            }
        }
    };
    schema.commandsContribution = {
        description: localize('vscode.extension.contributes.commands', "Contributes commands to the command palette."),
        oneOf: [
            commandType,
            {
                type: 'array',
                items: commandType
            }
        ]
    };
})(schema || (schema = {}));
const _commandRegistrations = new DisposableStore();
export const commandsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'commands',
    jsonSchema: schema.commandsContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.command) {
                result.push(`onCommand:${contrib.command}`);
            }
        }
    }
});
commandsExtensionPoint.setHandler(extensions => {
    function handleCommand(userFriendlyCommand, extension) {
        if (!schema.isValidCommand(userFriendlyCommand, extension.collector)) {
            return;
        }
        const { icon, enablement, category, title, shortTitle, command } = userFriendlyCommand;
        let absoluteIcon;
        if (icon) {
            if (typeof icon === 'string') {
                absoluteIcon = ThemeIcon.fromString(icon) ?? { dark: resources.joinPath(extension.description.extensionLocation, icon), light: resources.joinPath(extension.description.extensionLocation, icon) };
            }
            else {
                absoluteIcon = {
                    dark: resources.joinPath(extension.description.extensionLocation, icon.dark),
                    light: resources.joinPath(extension.description.extensionLocation, icon.light)
                };
            }
        }
        const existingCmd = MenuRegistry.getCommand(command);
        if (existingCmd) {
            if (existingCmd.source) {
                extension.collector.info(localize('dup1', "Command `{0}` already registered by {1} ({2})", userFriendlyCommand.command, existingCmd.source.title, existingCmd.source.id));
            }
            else {
                extension.collector.info(localize('dup0', "Command `{0}` already registered", userFriendlyCommand.command));
            }
        }
        _commandRegistrations.add(MenuRegistry.addCommand({
            id: command,
            title,
            source: { id: extension.description.identifier.value, title: extension.description.displayName ?? extension.description.name },
            shortTitle,
            tooltip: title,
            category,
            precondition: ContextKeyExpr.deserialize(enablement),
            icon: absoluteIcon
        }));
    }
    // remove all previous command registrations
    _commandRegistrations.clear();
    for (const extension of extensions) {
        const { value } = extension;
        if (Array.isArray(value)) {
            for (const command of value) {
                handleCommand(command, extension);
            }
        }
        else {
            handleCommand(value, extension);
        }
    }
});
const _submenus = new Map();
const submenusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'submenus',
    jsonSchema: schema.submenusContribution
});
submenusExtensionPoint.setHandler(extensions => {
    _submenus.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const [, submenuInfo] of Object.entries(value)) {
            if (!schema.isValidSubmenu(submenuInfo, collector)) {
                continue;
            }
            if (!submenuInfo.id) {
                collector.warn(localize('submenuId.invalid.id', "`{0}` is not a valid submenu identifier", submenuInfo.id));
                continue;
            }
            if (_submenus.has(submenuInfo.id)) {
                collector.info(localize('submenuId.duplicate.id', "The `{0}` submenu was already previously registered.", submenuInfo.id));
                continue;
            }
            if (!submenuInfo.label) {
                collector.warn(localize('submenuId.invalid.label', "`{0}` is not a valid submenu label", submenuInfo.label));
                continue;
            }
            let absoluteIcon;
            if (submenuInfo.icon) {
                if (typeof submenuInfo.icon === 'string') {
                    absoluteIcon = ThemeIcon.fromString(submenuInfo.icon) || { dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon) };
                }
                else {
                    absoluteIcon = {
                        dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.dark),
                        light: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.light)
                    };
                }
            }
            const item = {
                id: MenuId.for(`api:${submenuInfo.id}`),
                label: submenuInfo.label,
                icon: absoluteIcon
            };
            _submenus.set(submenuInfo.id, item);
        }
    }
});
const _apiMenusByKey = new Map(apiMenus.map(menu => ([menu.key, menu])));
const _menuRegistrations = new DisposableStore();
const _submenuMenuItems = new Map();
const menusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'menus',
    jsonSchema: schema.menusContribution,
    deps: [submenusExtensionPoint]
});
menusExtensionPoint.setHandler(extensions => {
    // remove all previous menu registrations
    _menuRegistrations.clear();
    _submenuMenuItems.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const entry of Object.entries(value)) {
            if (!schema.isValidItems(entry[1], collector)) {
                continue;
            }
            let menu = _apiMenusByKey.get(entry[0]);
            if (!menu) {
                const submenu = _submenus.get(entry[0]);
                if (submenu) {
                    menu = {
                        key: entry[0],
                        id: submenu.id,
                        description: ''
                    };
                }
            }
            if (!menu) {
                continue;
            }
            if (menu.proposed && !isProposedApiEnabled(extension.description, menu.proposed)) {
                collector.error(localize('proposedAPI.invalid', "{0} is a proposed menu identifier. It requires 'package.json#enabledApiProposals: [\"{1}\"]' and is only available when running out of dev or with the following command line switch: --enable-proposed-api {2}", entry[0], menu.proposed, extension.description.identifier.value));
                continue;
            }
            for (const menuItem of entry[1]) {
                let item;
                if (schema.isMenuItem(menuItem)) {
                    const command = MenuRegistry.getCommand(menuItem.command);
                    const alt = menuItem.alt && MenuRegistry.getCommand(menuItem.alt) || undefined;
                    if (!command) {
                        collector.error(localize('missing.command', "Menu item references a command `{0}` which is not defined in the 'commands' section.", menuItem.command));
                        continue;
                    }
                    if (menuItem.alt && !alt) {
                        collector.warn(localize('missing.altCommand', "Menu item references an alt-command `{0}` which is not defined in the 'commands' section.", menuItem.alt));
                    }
                    if (menuItem.command === menuItem.alt) {
                        collector.info(localize('dupe.command', "Menu item references the same command as default and alt-command"));
                    }
                    item = { command, alt, group: undefined, order: undefined, when: undefined };
                }
                else {
                    if (menu.supportsSubmenus === false) {
                        collector.error(localize('unsupported.submenureference', "Menu item references a submenu for a menu which doesn't have submenu support."));
                        continue;
                    }
                    const submenu = _submenus.get(menuItem.submenu);
                    if (!submenu) {
                        collector.error(localize('missing.submenu', "Menu item references a submenu `{0}` which is not defined in the 'submenus' section.", menuItem.submenu));
                        continue;
                    }
                    let submenuRegistrations = _submenuMenuItems.get(menu.id.id);
                    if (!submenuRegistrations) {
                        submenuRegistrations = new Set();
                        _submenuMenuItems.set(menu.id.id, submenuRegistrations);
                    }
                    if (submenuRegistrations.has(submenu.id.id)) {
                        collector.warn(localize('submenuItem.duplicate', "The `{0}` submenu was already contributed to the `{1}` menu.", menuItem.submenu, entry[0]));
                        continue;
                    }
                    submenuRegistrations.add(submenu.id.id);
                    item = { submenu: submenu.id, icon: submenu.icon, title: submenu.label, group: undefined, order: undefined, when: undefined };
                }
                if (menuItem.group) {
                    const idx = menuItem.group.lastIndexOf('@');
                    if (idx > 0) {
                        item.group = menuItem.group.substr(0, idx);
                        item.order = Number(menuItem.group.substr(idx + 1)) || undefined;
                    }
                    else {
                        item.group = menuItem.group;
                    }
                }
                if (menu.id === MenuId.ViewContainerTitle && !menuItem.when?.includes('viewContainer == workbench.view.debug')) {
                    // Not a perfect check but enough to communicate that this proposed extension point is currently only for the debug view container
                    collector.error(localize('viewContainerTitle.when', "The {0} menu contribution must check {1} in its {2} clause.", '`viewContainer/title`', '`viewContainer == workbench.view.debug`', '"when"'));
                    continue;
                }
                item.when = ContextKeyExpr.deserialize(menuItem.when);
                _menuRegistrations.add(MenuRegistry.appendMenuItem(menu.id, item));
            }
        }
    }
});
let CommandsTableRenderer = class CommandsTableRenderer extends Disposable {
    constructor(_keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.commands;
    }
    render(manifest) {
        const rawCommands = manifest.contributes?.commands || [];
        const commands = rawCommands.map(c => ({
            id: c.command,
            title: c.title,
            keybindings: [],
            menus: []
        }));
        const byId = index(commands, c => c.id);
        const menus = manifest.contributes?.menus || {};
        // Add to commandPalette array any commands not explicitly contributed to it
        const implicitlyOnCommandPalette = index(commands, c => c.id);
        if (menus['commandPalette']) {
            for (const command of menus['commandPalette']) {
                delete implicitlyOnCommandPalette[command.command];
            }
        }
        if (Object.keys(implicitlyOnCommandPalette).length) {
            if (!menus['commandPalette']) {
                menus['commandPalette'] = [];
            }
            for (const command in implicitlyOnCommandPalette) {
                menus['commandPalette'].push({ command });
            }
        }
        for (const context in menus) {
            for (const menu of menus[context]) {
                // This typically happens for the commandPalette context
                if (menu.when === 'false') {
                    continue;
                }
                if (menu.command) {
                    let command = byId[menu.command];
                    if (command) {
                        if (!command.menus.includes(context)) {
                            command.menus.push(context);
                        }
                    }
                    else {
                        command = { id: menu.command, title: '', keybindings: [], menus: [context] };
                        byId[command.id] = command;
                        commands.push(command);
                    }
                }
            }
        }
        const rawKeybindings = manifest.contributes?.keybindings ? (Array.isArray(manifest.contributes.keybindings) ? manifest.contributes.keybindings : [manifest.contributes.keybindings]) : [];
        rawKeybindings.forEach(rawKeybinding => {
            const keybinding = this.resolveKeybinding(rawKeybinding);
            if (!keybinding) {
                return;
            }
            let command = byId[rawKeybinding.command];
            if (command) {
                command.keybindings.push(keybinding);
            }
            else {
                command = { id: rawKeybinding.command, title: '', keybindings: [keybinding], menus: [] };
                byId[command.id] = command;
                commands.push(command);
            }
        });
        if (!commands.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('command name', "ID"),
            localize('command title', "Title"),
            localize('keyboard shortcuts', "Keyboard Shortcuts"),
            localize('menuContexts', "Menu Contexts")
        ];
        const rows = commands.sort((a, b) => a.id.localeCompare(b.id))
            .map(command => {
            return [
                new MarkdownString().appendMarkdown(`\`${command.id}\``),
                typeof command.title === 'string' ? command.title : command.title.value,
                command.keybindings,
                new MarkdownString().appendMarkdown(`${command.menus.sort((a, b) => a.localeCompare(b)).map(menu => `\`${menu}\``).join('&nbsp;')}`),
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
    resolveKeybinding(rawKeyBinding) {
        let key;
        switch (platform) {
            case 'win32':
                key = rawKeyBinding.win;
                break;
            case 'linux':
                key = rawKeyBinding.linux;
                break;
            case 'darwin':
                key = rawKeyBinding.mac;
                break;
        }
        return this._keybindingService.resolveUserBinding(key ?? rawKeyBinding.key)[0];
    }
};
CommandsTableRenderer = __decorate([
    __param(0, IKeybindingService)
], CommandsTableRenderer);
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'commands',
    label: localize('commands', "Commands"),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(CommandsTableRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXNFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY3Rpb25zL2NvbW1vbi9tZW51c0V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBa0Qsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNuSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQTJCLE1BQU0sZ0RBQWdELENBQUM7QUFFL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTdFLE9BQU8sRUFBbUcsVUFBVSxJQUFJLDJCQUEyQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFbk4sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNB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