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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXNFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWN0aW9ucy9jb21tb24vbWVudXNFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQWtELGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbkksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUEyQixNQUFNLGdEQUFnRCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3RSxPQUFPLEVBQW1HLFVBQVUsSUFBSSwyQkFBMkIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRW5OLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxj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