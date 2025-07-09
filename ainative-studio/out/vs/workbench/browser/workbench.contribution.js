/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../platform/registry/common/platform.js';
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import { isMacintosh, isWindows, isLinux, isWeb, isNative } from '../../base/common/platform.js';
import { ConfigurationMigrationWorkbenchContribution, DynamicWorkbenchSecurityConfiguration, workbenchConfigurationNodeBase, Extensions, problemsConfigurationNodeBase, windowConfigurationNodeBase, DynamicWindowConfiguration } from '../common/configuration.js';
import { isStandalone } from '../../base/browser/browser.js';
import { registerWorkbenchContribution2 } from '../common/contributions.js';
import { defaultWindowTitle, defaultWindowTitleSeparator } from './parts/titlebar/windowTitle.js';
import { CustomEditorLabelService } from '../services/editor/common/customEditorLabelService.js';
const registry = Registry.as(ConfigurationExtensions.Configuration);
// Configuration
(function registerConfiguration() {
    // Migration support
    registerWorkbenchContribution2(ConfigurationMigrationWorkbenchContribution.ID, ConfigurationMigrationWorkbenchContribution, 4 /* WorkbenchPhase.Eventually */);
    // Dynamic Configuration
    registerWorkbenchContribution2(DynamicWorkbenchSecurityConfiguration.ID, DynamicWorkbenchSecurityConfiguration, 3 /* WorkbenchPhase.AfterRestored */);
    // Workbench
    registry.registerConfiguration({
        ...workbenchConfigurationNodeBase,
        'properties': {
            'workbench.externalBrowser': {
                type: 'string',
                markdownDescription: localize('browser', "Configure the browser to use for opening http or https links externally. This can either be the name of the browser (`edge`, `chrome`, `firefox`) or an absolute path to the browser's executable. Will use the system default if not set."),
                included: isNative,
                restricted: true
            },
            'workbench.editor.titleScrollbarSizing': {
                type: 'string',
                enum: ['default', 'large'],
                enumDescriptions: [
                    localize('workbench.editor.titleScrollbarSizing.default', "The default size."),
                    localize('workbench.editor.titleScrollbarSizing.large', "Increases the size, so it can be grabbed more easily with the mouse.")
                ],
                description: localize('tabScrollbarHeight', "Controls the height of the scrollbars used for tabs and breadcrumbs in the editor title area."),
                default: 'default',
            },
            ["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */]: {
                'type': 'string',
                'enum': ["multiple" /* EditorTabsMode.MULTIPLE */, "single" /* EditorTabsMode.SINGLE */, "none" /* EditorTabsMode.NONE */],
                'enumDescriptions': [
                    localize('workbench.editor.showTabs.multiple', "Each editor is displayed as a tab in the editor title area."),
                    localize('workbench.editor.showTabs.single', "The active editor is displayed as a single large tab in the editor title area."),
                    localize('workbench.editor.showTabs.none', "The editor title area is not displayed."),
                ],
                'description': localize('showEditorTabs', "Controls whether opened editors should show as individual tabs, one single large tab or if the title area should not be shown."),
                'default': 'multiple'
            },
            ["workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */]: {
                'type': 'string',
                'enum': ["default" /* EditorActionsLocation.DEFAULT */, "titleBar" /* EditorActionsLocation.TITLEBAR */, "hidden" /* EditorActionsLocation.HIDDEN */],
                'markdownEnumDescriptions': [
                    localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'workbench.editor.editorActionsLocation.default' }, "Show editor actions in the window title bar when {0} is set to {1}. Otherwise, editor actions are shown in the editor tab bar.", '`#workbench.editor.showTabs#`', '`none`'),
                    localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'workbench.editor.editorActionsLocation.titleBar' }, "Show editor actions in the window title bar. If {0} is set to {1}, editor actions are hidden.", '`#window.customTitleBarVisibility#`', '`never`'),
                    localize('workbench.editor.editorActionsLocation.hidden', "Editor actions are not shown."),
                ],
                'markdownDescription': localize('editorActionsLocation', "Controls where the editor actions are shown."),
                'default': 'default'
            },
            'workbench.editor.alwaysShowEditorActions': {
                'type': 'boolean',
                'markdownDescription': localize('alwaysShowEditorActions', "Controls whether to always show the editor actions, even when the editor group is not active."),
                'default': false
            },
            'workbench.editor.wrapTabs': {
                'type': 'boolean',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'wrapTabs' }, "Controls whether tabs should be wrapped over multiple lines when exceeding available space or whether a scrollbar should appear instead. This value is ignored when {0} is not set to '{1}'.", '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.scrollToSwitchTabs': {
                'type': 'boolean',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'scrollToSwitchTabs' }, "Controls whether scrolling over tabs will open them or not. By default tabs will only reveal upon scrolling, but not open. You can press and hold the Shift-key while scrolling to change this behavior for that duration. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.highlightModifiedTabs': {
                'type': 'boolean',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'highlightModifiedTabs' }, "Controls whether a top border is drawn on tabs for editors that have unsaved changes. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', `multiple`),
                'default': false
            },
            'workbench.editor.decorations.badges': {
                'type': 'boolean',
                'markdownDescription': localize('decorations.badges', "Controls whether editor file decorations should use badges."),
                'default': true
            },
            'workbench.editor.decorations.colors': {
                'type': 'boolean',
                'markdownDescription': localize('decorations.colors', "Controls whether editor file decorations should use colors."),
                'default': true
            },
            [CustomEditorLabelService.SETTING_ID_ENABLED]: {
                'type': 'boolean',
                'markdownDescription': localize('workbench.editor.label.enabled', "Controls whether the custom workbench editor labels should be applied."),
                'default': true,
            },
            [CustomEditorLabelService.SETTING_ID_PATTERNS]: {
                'type': 'object',
                'markdownDescription': (() => {
                    let customEditorLabelDescription = localize('workbench.editor.label.patterns', "Controls the rendering of the editor label. Each __Item__ is a pattern that matches a file path. Both relative and absolute file paths are supported. The relative path must include the WORKSPACE_FOLDER (e.g `WORKSPACE_FOLDER/src/**.tsx` or `*/src/**.tsx`). Absolute patterns must start with a `/`. In case multiple patterns match, the longest matching path will be picked. Each __Value__ is the template for the rendered editor when the __Item__ matches. Variables are substituted based on the context:");
                    customEditorLabelDescription += '\n- ' + [
                        localize('workbench.editor.label.dirname', "`${dirname}`: name of the folder in which the file is located (e.g. `WORKSPACE_FOLDER/folder/file.txt -> folder`)."),
                        localize('workbench.editor.label.nthdirname', "`${dirname(N)}`: name of the nth parent folder in which the file is located (e.g. `N=2: WORKSPACE_FOLDER/static/folder/file.txt -> WORKSPACE_FOLDER`). Folders can be picked from the start of the path by using negative numbers (e.g. `N=-1: WORKSPACE_FOLDER/folder/file.txt -> WORKSPACE_FOLDER`). If the __Item__ is an absolute pattern path, the first folder (`N=-1`) refers to the first folder in the absolute path, otherwise it corresponds to the workspace folder."),
                        localize('workbench.editor.label.filename', "`${filename}`: name of the file without the file extension (e.g. `WORKSPACE_FOLDER/folder/file.txt -> file`)."),
                        localize('workbench.editor.label.extname', "`${extname}`: the file extension (e.g. `WORKSPACE_FOLDER/folder/file.txt -> txt`)."),
                        localize('workbench.editor.label.nthextname', "`${extname(N)}`: the nth extension of the file separated by '.' (e.g. `N=2: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext1`). Extension can be picked from the start of the extension by using negative numbers (e.g. `N=-1: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext2`)."),
                    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
                    customEditorLabelDescription += '\n\n' + localize('customEditorLabelDescriptionExample', "Example: `\"**/static/**/*.html\": \"${filename} - ${dirname} (${extname})\"` will render a file `WORKSPACE_FOLDER/static/folder/file.html` as `file - folder (html)`.");
                    return customEditorLabelDescription;
                })(),
                additionalProperties: {
                    type: ['string', 'null'],
                    markdownDescription: localize('workbench.editor.label.template', "The template which should be rendered when the pattern matches. May include the variables ${dirname}, ${filename} and ${extname}."),
                    minLength: 1,
                    pattern: '.*[a-zA-Z0-9].*'
                },
                'default': {}
            },
            'workbench.editor.labelFormat': {
                'type': 'string',
                'enum': ['default', 'short', 'medium', 'long'],
                'enumDescriptions': [
                    localize('workbench.editor.labelFormat.default', "Show the name of the file. When tabs are enabled and two files have the same name in one group the distinguishing sections of each file's path are added. When tabs are disabled, the path relative to the workspace folder is shown if the editor is active."),
                    localize('workbench.editor.labelFormat.short', "Show the name of the file followed by its directory name."),
                    localize('workbench.editor.labelFormat.medium', "Show the name of the file followed by its path relative to the workspace folder."),
                    localize('workbench.editor.labelFormat.long', "Show the name of the file followed by its absolute path.")
                ],
                'default': 'default',
                'description': localize('tabDescription', "Controls the format of the label for an editor."),
            },
            'workbench.editor.untitled.labelFormat': {
                'type': 'string',
                'enum': ['content', 'name'],
                'enumDescriptions': [
                    localize('workbench.editor.untitled.labelFormat.content', "The name of the untitled file is derived from the contents of its first line unless it has an associated file path. It will fallback to the name in case the line is empty or contains no word characters."),
                    localize('workbench.editor.untitled.labelFormat.name', "The name of the untitled file is not derived from the contents of the file."),
                ],
                'default': 'content',
                'description': localize('untitledLabelFormat', "Controls the format of the label for an untitled editor."),
            },
            'workbench.editor.empty.hint': {
                'type': 'string',
                'enum': ['text', 'hidden'],
                'default': 'text',
                'markdownDescription': localize("workbench.editor.empty.hint", "Controls if the empty editor text hint should be visible in the editor.")
            },
            'workbench.editor.languageDetection': {
                type: 'boolean',
                default: true,
                description: localize('workbench.editor.languageDetection', "Controls whether the language in a text editor is automatically detected unless the language has been explicitly set by the language picker. This can also be scoped by language so you can specify which languages you do not want to be switched off of. This is useful for languages like Markdown that often contain other languages that might trick language detection into thinking it's the embedded language and not Markdown."),
                scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.historyBasedLanguageDetection': {
                type: 'boolean',
                default: true,
                description: localize('workbench.editor.historyBasedLanguageDetection', "Enables use of editor history in language detection. This causes automatic language detection to favor languages that have been recently opened and allows for automatic language detection to operate with smaller inputs."),
            },
            'workbench.editor.preferHistoryBasedLanguageDetection': {
                type: 'boolean',
                default: false,
                description: localize('workbench.editor.preferBasedLanguageDetection', "When enabled, a language detection model that takes into account editor history will be given higher precedence."),
            },
            'workbench.editor.languageDetectionHints': {
                type: 'object',
                default: { 'untitledEditors': true, 'notebookEditors': true },
                description: localize('workbench.editor.showLanguageDetectionHints', "When enabled, shows a Status bar Quick Fix when the editor language doesn't match detected content language."),
                additionalProperties: false,
                properties: {
                    untitledEditors: {
                        type: 'boolean',
                        description: localize('workbench.editor.showLanguageDetectionHints.editors', "Show in untitled text editors"),
                    },
                    notebookEditors: {
                        type: 'boolean',
                        description: localize('workbench.editor.showLanguageDetectionHints.notebook', "Show in notebook editors"),
                    }
                }
            },
            'workbench.editor.tabActionLocation': {
                type: 'string',
                enum: ['left', 'right'],
                default: 'right',
                markdownDescription: localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'tabActionLocation' }, "Controls the position of the editor's tabs action buttons (close, unpin). This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabActionCloseVisibility': {
                type: 'boolean',
                default: true,
                description: localize('workbench.editor.tabActionCloseVisibility', "Controls the visibility of the tab close action button.")
            },
            'workbench.editor.tabActionUnpinVisibility': {
                type: 'boolean',
                default: true,
                description: localize('workbench.editor.tabActionUnpinVisibility', "Controls the visibility of the tab unpin action button.")
            },
            'workbench.editor.tabSizing': {
                'type': 'string',
                'enum': ['fit', 'shrink', 'fixed'],
                'default': 'fit',
                'enumDescriptions': [
                    localize('workbench.editor.tabSizing.fit', "Always keep tabs large enough to show the full editor label."),
                    localize('workbench.editor.tabSizing.shrink', "Allow tabs to get smaller when the available space is not enough to show all tabs at once."),
                    localize('workbench.editor.tabSizing.fixed', "Make all tabs the same size, while allowing them to get smaller when the available space is not enough to show all tabs at once.")
                ],
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'tabSizing' }, "Controls the size of editor tabs. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabSizingFixedMinWidth': {
                'type': 'number',
                'default': 50,
                'minimum': 38,
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMinWidth' }, "Controls the minimum width of tabs when {0} size is set to {1}.", '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'workbench.editor.tabSizingFixedMaxWidth': {
                'type': 'number',
                'default': 160,
                'minimum': 38,
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMaxWidth' }, "Controls the maximum width of tabs when {0} size is set to {1}.", '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'window.density.editorTabHeight': {
                'type': 'string',
                'enum': ['default', 'compact'],
                'default': 'default',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabHeight' }, "Controls the height of editor tabs. Also applies to the title control bar when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabSizing': {
                'type': 'string',
                'enum': ['normal', 'compact', 'shrink'],
                'default': 'normal',
                'enumDescriptions': [
                    localize('workbench.editor.pinnedTabSizing.normal', "A pinned tab inherits the look of non pinned tabs."),
                    localize('workbench.editor.pinnedTabSizing.compact', "A pinned tab will show in a compact form with only icon or first letter of the editor name."),
                    localize('workbench.editor.pinnedTabSizing.shrink', "A pinned tab shrinks to a compact fixed size showing parts of the editor name.")
                ],
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'pinnedTabSizing' }, "Controls the size of pinned editor tabs. Pinned tabs are sorted to the beginning of all opened tabs and typically do not close until unpinned. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabsOnSeparateRow': {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.pinnedTabsOnSeparateRow' }, "When enabled, displays pinned tabs in a separate row above all other tabs. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
            },
            'workbench.editor.preventPinnedEditorClose': {
                'type': 'string',
                'enum': ['keyboardAndMouse', 'keyboard', 'mouse', 'never'],
                'default': 'keyboardAndMouse',
                'enumDescriptions': [
                    localize('workbench.editor.preventPinnedEditorClose.always', "Always prevent closing the pinned editor when using mouse middle click or keyboard."),
                    localize('workbench.editor.preventPinnedEditorClose.onlyKeyboard', "Prevent closing the pinned editor when using the keyboard."),
                    localize('workbench.editor.preventPinnedEditorClose.onlyMouse', "Prevent closing the pinned editor when using mouse middle click."),
                    localize('workbench.editor.preventPinnedEditorClose.never', "Never prevent closing a pinned editor.")
                ],
                description: localize('workbench.editor.preventPinnedEditorClose', "Controls whether pinned editors should close when keyboard or middle mouse click is used for closing."),
            },
            'workbench.editor.splitSizing': {
                'type': 'string',
                'enum': ['auto', 'distribute', 'split'],
                'default': 'auto',
                'enumDescriptions': [
                    localize('workbench.editor.splitSizingAuto', "Splits the active editor group to equal parts, unless all editor groups are already in equal parts. In that case, splits all the editor groups to equal parts."),
                    localize('workbench.editor.splitSizingDistribute', "Splits all the editor groups to equal parts."),
                    localize('workbench.editor.splitSizingSplit', "Splits the active editor group to equal parts.")
                ],
                'description': localize('splitSizing', "Controls the size of editor groups when splitting them.")
            },
            'workbench.editor.splitOnDragAndDrop': {
                'type': 'boolean',
                'default': true,
                'description': localize('splitOnDragAndDrop', "Controls if editor groups can be split from drag and drop operations by dropping an editor or file on the edges of the editor area.")
            },
            'workbench.editor.dragToOpenWindow': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('dragToOpenWindow', "Controls if editors can be dragged out of the window to open them in a new window. Press and hold the `Alt` key while dragging to toggle this dynamically.")
            },
            'workbench.editor.focusRecentEditorAfterClose': {
                'type': 'boolean',
                'description': localize('focusRecentEditorAfterClose', "Controls whether editors are closed in most recently used order or from left to right."),
                'default': true
            },
            'workbench.editor.showIcons': {
                'type': 'boolean',
                'description': localize('showIcons', "Controls whether opened editors should show with an icon or not. This requires a file icon theme to be enabled as well."),
                'default': true
            },
            'workbench.editor.enablePreview': {
                'type': 'boolean',
                'description': localize('enablePreview', "Controls whether preview mode is used when editors open. There is a maximum of one preview mode editor per editor group. This editor displays its filename in italics on its tab or title label and in the Open Editors view. Its contents will be replaced by the next editor opened in preview mode. Making a change in a preview mode editor will persist it, as will a double-click on its label, or the 'Keep Open' option in its label context menu. Opening a file from Explorer with a double-click persists its editor immediately."),
                'default': true
            },
            'workbench.editor.enablePreviewFromQuickOpen': {
                'type': 'boolean',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'enablePreviewFromQuickOpen' }, "Controls whether editors opened from Quick Open show as preview editors. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). When enabled, hold Ctrl before selection to open an editor as a non-preview. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.enablePreviewFromCodeNavigation': {
                'type': 'boolean',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'enablePreviewFromCodeNavigation' }, "Controls whether editors remain in preview when a code navigation is started from them. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.closeOnFileDelete': {
                'type': 'boolean',
                'description': localize('closeOnFileDelete', "Controls whether editors showing a file that was opened during the session should close automatically when getting deleted or renamed by some other process. Disabling this will keep the editor open  on such an event. Note that deleting from within the application will always close the editor and that editors with unsaved changes will never close to preserve your data."),
                'default': false
            },
            'workbench.editor.openPositioning': {
                'type': 'string',
                'enum': ['left', 'right', 'first', 'last'],
                'default': 'right',
                'markdownDescription': localize({ comment: ['{0}, {1}, {2}, {3} will be a setting name rendered as a link'], key: 'editorOpenPositioning' }, "Controls where editors open. Select {0} or {1} to open editors to the left or right of the currently active one. Select {2} or {3} to open editors independently from the currently active one.", '`left`', '`right`', '`first`', '`last`')
            },
            'workbench.editor.openSideBySideDirection': {
                'type': 'string',
                'enum': ['right', 'down'],
                'default': 'right',
                'markdownDescription': localize('sideBySideDirection', "Controls the default direction of editors that are opened side by side (for example, from the Explorer). By default, editors will open on the right hand side of the currently active one. If changed to `down`, the editors will open below the currently active one.")
            },
            'workbench.editor.closeEmptyGroups': {
                'type': 'boolean',
                'description': localize('closeEmptyGroups', "Controls the behavior of empty editor groups when the last tab in the group is closed. When enabled, empty groups will automatically close. When disabled, empty groups will remain part of the grid."),
                'default': true
            },
            'workbench.editor.revealIfOpen': {
                'type': 'boolean',
                'description': localize('revealIfOpen', "Controls whether an editor is revealed in any of the visible groups if opened. If disabled, an editor will prefer to open in the currently active editor group. If enabled, an already opened editor will be revealed instead of opened again in the currently active editor group. Note that there are some cases where this setting is ignored, such as when forcing an editor to open in a specific group or to the side of the currently active group."),
                'default': false
            },
            'workbench.editor.mouseBackForwardToNavigate': {
                'type': 'boolean',
                'description': localize('mouseBackForwardToNavigate', "Enables the use of mouse buttons four and five for commands 'Go Back' and 'Go Forward'."),
                'default': true
            },
            'workbench.editor.navigationScope': {
                'type': 'string',
                'enum': ['default', 'editorGroup', 'editor'],
                'default': 'default',
                'markdownDescription': localize('navigationScope', "Controls the scope of history navigation in editors for commands such as 'Go Back' and 'Go Forward'."),
                'enumDescriptions': [
                    localize('workbench.editor.navigationScopeDefault', "Navigate across all opened editors and editor groups."),
                    localize('workbench.editor.navigationScopeEditorGroup', "Navigate only in editors of the active editor group."),
                    localize('workbench.editor.navigationScopeEditor', "Navigate only in the active editor.")
                ],
            },
            'workbench.editor.restoreViewState': {
                'type': 'boolean',
                'markdownDescription': localize('restoreViewState', "Restores the last editor view state (such as scroll position) when re-opening editors after they have been closed. Editor view state is stored per editor group and discarded when a group closes. Use the {0} setting to use the last known view state across all editor groups in case no previous view state was found for a editor group.", '`#workbench.editor.sharedViewState#`'),
                'default': true,
                'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.sharedViewState': {
                'type': 'boolean',
                'description': localize('sharedViewState', "Preserves the most recent editor view state (such as scroll position) across all editor groups and restores that if no specific editor view state is found for the editor group."),
                'default': false
            },
            'workbench.editor.splitInGroupLayout': {
                'type': 'string',
                'enum': ['vertical', 'horizontal'],
                'default': 'horizontal',
                'markdownDescription': localize('splitInGroupLayout', "Controls the layout for when an editor is split in an editor group to be either vertical or horizontal."),
                'enumDescriptions': [
                    localize('workbench.editor.splitInGroupLayoutVertical', "Editors are positioned from top to bottom."),
                    localize('workbench.editor.splitInGroupLayoutHorizontal', "Editors are positioned from left to right.")
                ]
            },
            'workbench.editor.centeredLayoutAutoResize': {
                'type': 'boolean',
                'default': true,
                'description': localize('centeredLayoutAutoResize', "Controls if the centered layout should automatically resize to maximum width when more than one group is open. Once only one group is open it will resize back to the original centered width.")
            },
            'workbench.editor.centeredLayoutFixedWidth': {
                'type': 'boolean',
                'default': false,
                'description': localize('centeredLayoutDynamicWidth', "Controls whether the centered layout tries to maintain constant width when the window is resized.")
            },
            'workbench.editor.doubleClickTabToToggleEditorGroupSizes': {
                'type': 'string',
                'enum': ['maximize', 'expand', 'off'],
                'default': 'expand',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'doubleClickTabToToggleEditorGroupSizes' }, "Controls how the editor group is resized when double clicking on a tab. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
                'enumDescriptions': [
                    localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.maximize', "All other editor groups are hidden and the current editor group is maximized to take up the entire editor area."),
                    localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.expand', "The editor group takes as much space as possible by making all other editor groups as small as possible."),
                    localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.off', "No editor group is resized when double clicking on a tab.")
                ]
            },
            'workbench.editor.limit.enabled': {
                'type': 'boolean',
                'default': false,
                'description': localize('limitEditorsEnablement', "Controls if the number of opened editors should be limited or not. When enabled, less recently used editors will close to make space for newly opening editors.")
            },
            'workbench.editor.limit.value': {
                'type': 'number',
                'default': 10,
                'exclusiveMinimum': 0,
                'markdownDescription': localize('limitEditorsMaximum', "Controls the maximum number of opened editors. Use the {0} setting to control this limit per editor group or across all groups.", '`#workbench.editor.limit.perEditorGroup#`')
            },
            'workbench.editor.limit.excludeDirty': {
                'type': 'boolean',
                'default': false,
                'description': localize('limitEditorsExcludeDirty', "Controls if the maximum number of opened editors should exclude dirty editors for counting towards the configured limit.")
            },
            'workbench.editor.limit.perEditorGroup': {
                'type': 'boolean',
                'default': false,
                'description': localize('perEditorGroup', "Controls if the limit of maximum opened editors should apply per editor group or across all editor groups.")
            },
            'workbench.localHistory.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize('localHistoryEnabled', "Controls whether local file history is enabled. When enabled, the file contents of an editor that is saved will be stored to a backup location to be able to restore or review the contents later. Changing this setting has no effect on existing local file history entries."),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileSize': {
                'type': 'number',
                'default': 256,
                'minimum': 1,
                'description': localize('localHistoryMaxFileSize', "Controls the maximum size of a file (in KB) to be considered for local file history. Files that are larger will not be added to the local file history. Changing this setting has no effect on existing local file history entries."),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileEntries': {
                'type': 'number',
                'default': 50,
                'minimum': 0,
                'description': localize('localHistoryMaxFileEntries', "Controls the maximum number of local file history entries per file. When the number of local file history entries exceeds this number for a file, the oldest entries will be discarded."),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.exclude': {
                'type': 'object',
                'patternProperties': {
                    '.*': { 'type': 'boolean' }
                },
                'markdownDescription': localize('exclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files from the local file history. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Changing this setting has no effect on existing local file history entries."),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.mergeWindow': {
                'type': 'number',
                'default': 10,
                'minimum': 1,
                'markdownDescription': localize('mergeWindow', "Configure an interval in seconds during which the last entry in local file history is replaced with the entry that is being added. This helps reduce the overall number of entries that are added, for example when auto save is enabled. This setting is only applied to entries that have the same source of origin. Changing this setting has no effect on existing local file history entries."),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.commandPalette.history': {
                'type': 'number',
                'description': localize('commandHistory', "Controls the number of recently used commands to keep in history for the command palette. Set to 0 to disable command history."),
                'default': 50,
                'minimum': 0
            },
            'workbench.commandPalette.preserveInput': {
                'type': 'boolean',
                'description': localize('preserveInput', "Controls whether the last typed input to the command palette should be restored when opening it the next time."),
                'default': false
            },
            'workbench.commandPalette.experimental.suggestCommands': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize('suggestCommands', "Controls whether the command palette should have a list of commonly used commands."),
                'default': false
            },
            'workbench.commandPalette.experimental.askChatLocation': {
                'type': 'string',
                tags: ['experimental'],
                'description': localize('askChatLocation', "Controls where the command palette should ask chat questions."),
                'default': 'chatView',
                enum: ['chatView', 'quickChat'],
                enumDescriptions: [
                    localize('askChatLocation.chatView', "Ask chat questions in the Chat view."),
                    localize('askChatLocation.quickChat', "Ask chat questions in Quick Chat.")
                ]
            },
            'workbench.commandPalette.experimental.enableNaturalLanguageSearch': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize('enableNaturalLanguageSearch', "Controls whether the command palette should include similar commands. You must have an extension installed that provides Natural Language support."),
                'default': true
            },
            'workbench.quickOpen.closeOnFocusLost': {
                'type': 'boolean',
                'description': localize('closeOnFocusLost', "Controls whether Quick Open should close automatically once it loses focus."),
                'default': true
            },
            'workbench.quickOpen.preserveInput': {
                'type': 'boolean',
                'description': localize('workbench.quickOpen.preserveInput', "Controls whether the last typed input to Quick Open should be restored when opening it the next time."),
                'default': false
            },
            'workbench.settings.openDefaultSettings': {
                'type': 'boolean',
                'description': localize('openDefaultSettings', "Controls whether opening settings also opens an editor showing all default settings."),
                'default': false
            },
            'workbench.settings.useSplitJSON': {
                'type': 'boolean',
                'markdownDescription': localize('useSplitJSON', "Controls whether to use the split JSON editor when editing settings as JSON."),
                'default': false
            },
            'workbench.settings.openDefaultKeybindings': {
                'type': 'boolean',
                'description': localize('openDefaultKeybindings', "Controls whether opening keybinding settings also opens an editor showing all default keybindings."),
                'default': false
            },
            'workbench.sideBar.location': {
                'type': 'string',
                'enum': ['left', 'right'],
                'default': 'left',
                'description': localize('sideBarLocation', "Controls the location of the primary side bar and activity bar. They can either show on the left or right of the workbench. The Void side bar will show on the opposite side of the workbench.")
            },
            'workbench.panel.showLabels': {
                'type': 'boolean',
                'default': true,
                'description': localize('panelShowLabels', "Controls whether activity items in the panel title are shown as label or icon."),
            },
            'workbench.panel.defaultLocation': {
                'type': 'string',
                'enum': ['left', 'bottom', 'top', 'right'],
                'default': 'bottom',
                'description': localize('panelDefaultLocation', "Controls the default location of the panel (Terminal, Debug Console, Output, Problems) in a new workspace. It can either show at the bottom, top, right, or left of the editor area."),
            },
            'workbench.panel.opensMaximized': {
                'type': 'string',
                'enum': ['always', 'never', 'preserve'],
                'default': 'preserve',
                'description': localize('panelOpensMaximized', "Controls whether the panel opens maximized. It can either always open maximized, never open maximized, or open to the last state it was in before being closed."),
                'enumDescriptions': [
                    localize('workbench.panel.opensMaximized.always', "Always maximize the panel when opening it."),
                    localize('workbench.panel.opensMaximized.never', "Never maximize the panel when opening it. The panel will open un-maximized."),
                    localize('workbench.panel.opensMaximized.preserve', "Open the panel to the state that it was in, before it was closed.")
                ]
            },
            'workbench.secondarySideBar.showLabels': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('secondarySideBarShowLabels', "Controls whether activity items in the secondary sidebar title are shown as label or icon. This setting only has an effect when {0} is not set to {1}.", '`#workbench.activityBar.location#`', '`top`'),
            },
            'workbench.statusBar.visible': {
                'type': 'boolean',
                'default': true,
                'description': localize('statusBarVisibility', "Controls the visibility of the status bar at the bottom of the workbench.")
            },
            ["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */]: {
                'type': 'string',
                'enum': ['default', 'top', 'bottom', 'hidden'],
                'default': 'default',
                'markdownDescription': localize({ comment: ['This is the description for a setting'], key: 'activityBarLocation' }, "Controls the location of the Activity Bar relative to the Primary and Void Side Bars."), // Void side bar
                'enumDescriptions': [
                    localize('workbench.activityBar.location.default', "Show the Activity Bar on the side of the Primary Side Bar and on top of the Void Side Bar."), // Void side bar
                    localize('workbench.activityBar.location.top', "Show the Activity Bar on top of the Primary and Void Side Bars."), // Void side bar
                    localize('workbench.activityBar.location.bottom', "Show the Activity Bar at the bottom of the Primary and Void Side Bars."), // Void side bar
                    localize('workbench.activityBar.location.hide', "Hide the Activity Bar in the Primary and Void Side Bars.") // Void side bar
                ],
            },
            'workbench.activityBar.iconClickBehavior': {
                'type': 'string',
                'enum': ['toggle', 'focus'],
                'default': 'toggle',
                'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'activityBarIconClickBehavior' }, "Controls the behavior of clicking an Activity Bar icon in the workbench. This value is ignored when {0} is not set to {1}.", '`#workbench.activityBar.location#`', '`default`'),
                'enumDescriptions': [
                    localize('workbench.activityBar.iconClickBehavior.toggle', "Hide the Primary Side Bar if the clicked item is already visible."),
                    localize('workbench.activityBar.iconClickBehavior.focus', "Focus the Primary Side Bar if the clicked item is already visible.")
                ]
            },
            'workbench.view.alwaysShowHeaderActions': {
                'type': 'boolean',
                'default': false,
                'description': localize('viewVisibility', "Controls the visibility of view header actions. View header actions may either be always visible, or only visible when that view is focused or hovered over.")
            },
            'workbench.view.showQuietly': {
                'type': 'object',
                'description': localize('workbench.view.showQuietly', "If an extension requests a hidden view to be shown, display a clickable status bar indicator instead."),
                'scope': 4 /* ConfigurationScope.WINDOW */,
                'properties': {
                    'workbench.panel.output': {
                        'type': 'boolean',
                        'description': localize('workbench.panel.output', "Output view")
                    }
                },
                'additionalProperties': false
            },
            'workbench.fontAliasing': {
                'type': 'string',
                'enum': ['default', 'antialiased', 'none', 'auto'],
                'default': 'default',
                'description': localize('fontAliasing', "Controls font aliasing method in the workbench."),
                'enumDescriptions': [
                    localize('workbench.fontAliasing.default', "Sub-pixel font smoothing. On most non-retina displays this will give the sharpest text."),
                    localize('workbench.fontAliasing.antialiased', "Smooth the font on the level of the pixel, as opposed to the subpixel. Can make the font appear lighter overall."),
                    localize('workbench.fontAliasing.none', "Disables font smoothing. Text will show with jagged sharp edges."),
                    localize('workbench.fontAliasing.auto', "Applies `default` or `antialiased` automatically based on the DPI of displays.")
                ],
                'included': isMacintosh
            },
            'workbench.settings.editor': {
                'type': 'string',
                'enum': ['ui', 'json'],
                'enumDescriptions': [
                    localize('settings.editor.ui', "Use the settings UI editor."),
                    localize('settings.editor.json', "Use the JSON file editor."),
                ],
                'description': localize('settings.editor.desc', "Determines which settings editor to use by default."),
                'default': 'ui',
                'scope': 4 /* ConfigurationScope.WINDOW */
            },
            'workbench.hover.delay': {
                'type': 'number',
                'description': localize('workbench.hover.delay', "Controls the delay in milliseconds after which the hover is shown for workbench items (ex. some extension provided tree view items). Already visible items may require a refresh before reflecting this setting change."),
                // Testing has indicated that on Windows and Linux 500 ms matches the native hovers most closely.
                // On Mac, the delay is 1500.
                'default': 300, // Void changed this from isMacintosh ? 1500 : 500,
                'minimum': 0
            },
            'workbench.reduceMotion': {
                type: 'string',
                description: localize('workbench.reduceMotion', "Controls whether the workbench should render with fewer animations."),
                'enumDescriptions': [
                    localize('workbench.reduceMotion.on', "Always render with reduced motion."),
                    localize('workbench.reduceMotion.off', "Do not render with reduced motion"),
                    localize('workbench.reduceMotion.auto', "Render with reduced motion based on OS configuration."),
                ],
                default: 'auto',
                tags: ['accessibility'],
                enum: ['on', 'off', 'auto']
            },
            'workbench.navigationControl.enabled': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize('navigationControlEnabledWeb', "Controls whether the navigation control in the title bar is shown.") :
                    localize({ key: 'navigationControlEnabled', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "Controls whether the navigation control is shown in the custom title bar. This setting only has an effect when {0} is not set to {1}.", '`#window.customTitleBarVisibility#`', '`never`')
            },
            ["workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */]: {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize('layoutControlEnabledWeb', "Controls whether the layout control in the title bar is shown.") :
                    localize({ key: 'layoutControlEnabled', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "Controls whether the layout control is shown in the custom title bar. This setting only has an effect when {0} is not set to {1}.", '`#window.customTitleBarVisibility#`', '`never`')
            },
            'workbench.layoutControl.type': {
                'type': 'string',
                'enum': ['menu', 'toggles', 'both'],
                'enumDescriptions': [
                    localize('layoutcontrol.type.menu', "Shows a single button with a dropdown of layout options."),
                    localize('layoutcontrol.type.toggles', "Shows several buttons for toggling the visibility of the panels and side bar."),
                    localize('layoutcontrol.type.both', "Shows both the dropdown and toggle buttons."),
                ],
                'default': 'both',
                'description': localize('layoutControlType', "Controls whether the layout control in the custom title bar is displayed as a single menu button or with multiple UI toggles."),
            },
            'workbench.tips.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize('tips.enabled', "When enabled, will show the watermark tips when no editor is open.")
            },
        }
    });
    // Window
    let windowTitleDescription = localize('windowTitle', "Controls the window title based on the current context such as the opened workspace or active editor. Variables are substituted based on the context:");
    windowTitleDescription += '\n- ' + [
        localize('activeEditorShort', "`${activeEditorShort}`: the file name (e.g. myFile.txt)."),
        localize('activeEditorMedium', "`${activeEditorMedium}`: the path of the file relative to the workspace folder (e.g. myFolder/myFileFolder/myFile.txt)."),
        localize('activeEditorLong', "`${activeEditorLong}`: the full path of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt)."),
        localize('activeFolderShort', "`${activeFolderShort}`: the name of the folder the file is contained in (e.g. myFileFolder)."),
        localize('activeFolderMedium', "`${activeFolderMedium}`: the path of the folder the file is contained in, relative to the workspace folder (e.g. myFolder/myFileFolder)."),
        localize('activeFolderLong', "`${activeFolderLong}`: the full path of the folder the file is contained in (e.g. /Users/Development/myFolder/myFileFolder)."),
        localize('folderName', "`${folderName}`: name of the workspace folder the file is contained in (e.g. myFolder)."),
        localize('folderPath', "`${folderPath}`: file path of the workspace folder the file is contained in (e.g. /Users/Development/myFolder)."),
        localize('rootName', "`${rootName}`: name of the workspace with optional remote name and workspace indicator if applicable (e.g. myFolder, myRemoteFolder [SSH] or myWorkspace (Workspace))."),
        localize('rootNameShort', "`${rootNameShort}`: shortened name of the workspace without suffixes (e.g. myFolder, myRemoteFolder or myWorkspace)."),
        localize('rootPath', "`${rootPath}`: file path of the opened workspace or folder (e.g. /Users/Development/myWorkspace)."),
        localize('profileName', "`${profileName}`: name of the profile in which the workspace is opened (e.g. Data Science (Profile)). Ignored if default profile is used."),
        localize('appName', "`${appName}`: e.g. VS Code."),
        localize('remoteName', "`${remoteName}`: e.g. SSH"),
        localize('dirty', "`${dirty}`: an indicator for when the active editor has unsaved changes."),
        localize('focusedView', "`${focusedView}`: the name of the view that is currently focused."),
        localize('activeRepositoryName', "`${activeRepositoryName}`: the name of the active repository (e.g. vscode)."),
        localize('activeRepositoryBranchName', "`${activeRepositoryBranchName}`: the name of the active branch in the active repository (e.g. main)."),
        localize('activeEditorState', "`${activeEditorState}`: provides information about the state of the active editor (e.g. modified). This will be appended by default when in screen reader mode with {0} enabled.", '`accessibility.windowTitleOptimized`'),
        localize('separator', "`${separator}`: a conditional separator (\" - \") that only shows when surrounded by variables with values or static text.")
    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
    registry.registerConfiguration({
        ...windowConfigurationNodeBase,
        'properties': {
            'window.title': {
                'type': 'string',
                'default': defaultWindowTitle,
                'markdownDescription': windowTitleDescription
            },
            'window.titleSeparator': {
                'type': 'string',
                'default': defaultWindowTitleSeparator,
                'markdownDescription': localize("window.titleSeparator", "Separator used by {0}.", '`#window.title#`')
            },
            ["window.commandCenter" /* LayoutSettings.COMMAND_CENTER */]: {
                type: 'boolean',
                default: true,
                markdownDescription: isWeb ?
                    localize('window.commandCenterWeb', "Show command launcher together with the window title.") :
                    localize({ key: 'window.commandCenter', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "Show command launcher together with the window title. This setting only has an effect when {0} is not set to {1}.", '`#window.customTitleBarVisibility#`', '`never`')
            },
            'window.menuBarVisibility': {
                'type': 'string',
                'enum': ['classic', 'visible', 'toggle', 'hidden', 'compact'],
                'markdownEnumDescriptions': [
                    localize('window.menuBarVisibility.classic', "Menu is displayed at the top of the window and only hidden in full screen mode."),
                    localize('window.menuBarVisibility.visible', "Menu is always visible at the top of the window even in full screen mode."),
                    isMacintosh ?
                        localize('window.menuBarVisibility.toggle.mac', "Menu is hidden but can be displayed at the top of the window by executing the `Focus Application Menu` command.") :
                        localize('window.menuBarVisibility.toggle', "Menu is hidden but can be displayed at the top of the window via the Alt key."),
                    localize('window.menuBarVisibility.hidden', "Menu is always hidden."),
                    isWeb ?
                        localize('window.menuBarVisibility.compact.web', "Menu is displayed as a compact button in the side bar.") :
                        localize({ key: 'window.menuBarVisibility.compact', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "Menu is displayed as a compact button in the side bar. This value is ignored when {0} is {1}.", '`#window.titleBarStyle#`', '`native`')
                ],
                'default': isWeb ? 'compact' : 'classic',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize('menuBarVisibility.mac', "Control the visibility of the menu bar. A setting of 'toggle' means that the menu bar is hidden and executing `Focus Application Menu` will show it. A setting of 'compact' will move the menu into the side bar.") :
                    localize('menuBarVisibility', "Control the visibility of the menu bar. A setting of 'toggle' means that the menu bar is hidden and a single press of the Alt key will show it. A setting of 'compact' will move the menu into the side bar."),
                'included': isWindows || isLinux || isWeb
            },
            'window.enableMenuBarMnemonics': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('enableMenuBarMnemonics', "Controls whether the main menus can be opened via Alt-key shortcuts. Disabling mnemonics allows to bind these Alt-key shortcuts to editor commands instead."),
                'included': isWindows || isLinux
            },
            'window.customMenuBarAltFocus': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('customMenuBarAltFocus', "Controls whether the menu bar will be focused by pressing the Alt-key. This setting has no effect on toggling the menu bar with the Alt-key."),
                'included': isWindows || isLinux
            },
            'window.openFilesInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize('window.openFilesInNewWindow.on', "Files will open in a new window."),
                    localize('window.openFilesInNewWindow.off', "Files will open in the window with the files' folder open or the last active window."),
                    isMacintosh ?
                        localize('window.openFilesInNewWindow.defaultMac', "Files will open in the window with the files' folder open or the last active window unless opened via the Dock or from Finder.") :
                        localize('window.openFilesInNewWindow.default', "Files will open in a new window unless picked from within the application (e.g. via the File menu).")
                ],
                'default': 'off',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize('openFilesInNewWindowMac', "Controls whether files should open in a new window when using a command line or file dialog.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).") :
                    localize('openFilesInNewWindow', "Controls whether files should open in a new window when using a command line or file dialog.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
            },
            'window.openFoldersInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize('window.openFoldersInNewWindow.on', "Folders will open in a new window."),
                    localize('window.openFoldersInNewWindow.off', "Folders will replace the last active window."),
                    localize('window.openFoldersInNewWindow.default', "Folders will open in a new window unless a folder is picked from within the application (e.g. via the File menu).")
                ],
                'default': 'default',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('openFoldersInNewWindow', "Controls whether folders should open in a new window or replace the last active window.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
            },
            'window.confirmBeforeClose': {
                'type': 'string',
                'enum': ['always', 'keyboardOnly', 'never'],
                'enumDescriptions': [
                    isWeb ?
                        localize('window.confirmBeforeClose.always.web', "Always try to ask for confirmation. Note that browsers may still decide to close a tab or window without confirmation.") :
                        localize('window.confirmBeforeClose.always', "Always ask for confirmation."),
                    isWeb ?
                        localize('window.confirmBeforeClose.keyboardOnly.web', "Only ask for confirmation if a keybinding was used to close the window. Note that detection may not be possible in some cases.") :
                        localize('window.confirmBeforeClose.keyboardOnly', "Only ask for confirmation if a keybinding was used."),
                    isWeb ?
                        localize('window.confirmBeforeClose.never.web', "Never explicitly ask for confirmation unless data loss is imminent.") :
                        localize('window.confirmBeforeClose.never', "Never explicitly ask for confirmation.")
                ],
                'default': (isWeb && !isStandalone()) ? 'keyboardOnly' : 'never', // on by default in web, unless PWA, never on desktop
                'markdownDescription': isWeb ?
                    localize('confirmBeforeCloseWeb', "Controls whether to show a confirmation dialog before closing the browser tab or window. Note that even if enabled, browsers may still decide to close a tab or window without confirmation and that this setting is only a hint that may not work in all cases.") :
                    localize('confirmBeforeClose', "Controls whether to show a confirmation dialog before closing a window or quitting the application."),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            }
        }
    });
    // Dynamic Window Configuration
    registerWorkbenchContribution2(DynamicWindowConfiguration.ID, DynamicWindowConfiguration, 4 /* WorkbenchPhase.Eventually */);
    // Problems
    registry.registerConfiguration({
        ...problemsConfigurationNodeBase,
        'properties': {
            'problems.visibility': {
                'type': 'boolean',
                'default': true,
                'description': localize('problems.visibility', "Controls whether the problems are visible throughout the editor and workbench."),
            },
        }
    });
    // Zen Mode
    registry.registerConfiguration({
        'id': 'zenMode',
        'order': 9,
        'title': localize('zenModeConfigurationTitle', "Zen Mode"),
        'type': 'object',
        'properties': {
            'zenMode.fullScreen': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.fullScreen', "Controls whether turning on Zen Mode also puts the workbench into full screen mode.")
            },
            'zenMode.centerLayout': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.centerLayout', "Controls whether turning on Zen Mode also centers the layout.")
            },
            'zenMode.showTabs': {
                'type': 'string',
                'enum': ['multiple', 'single', 'none'],
                'description': localize('zenMode.showTabs', "Controls whether turning on Zen Mode should show multiple editor tabs, a single editor tab, or hide the editor title area completely."),
                'enumDescriptions': [
                    localize('zenMode.showTabs.multiple', "Each editor is displayed as a tab in the editor title area."),
                    localize('zenMode.showTabs.single', "The active editor is displayed as a single large tab in the editor title area."),
                    localize('zenMode.showTabs.none', "The editor title area is not displayed."),
                ],
                'default': 'multiple'
            },
            'zenMode.hideStatusBar': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.hideStatusBar', "Controls whether turning on Zen Mode also hides the status bar at the bottom of the workbench.")
            },
            'zenMode.hideActivityBar': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.hideActivityBar', "Controls whether turning on Zen Mode also hides the activity bar either at the left or right of the workbench.")
            },
            'zenMode.hideLineNumbers': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.hideLineNumbers', "Controls whether turning on Zen Mode also hides the editor line numbers.")
            },
            'zenMode.restore': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.restore', "Controls whether a window should restore to Zen Mode if it was exited in Zen Mode.")
            },
            'zenMode.silentNotifications': {
                'type': 'boolean',
                'default': true,
                'description': localize('zenMode.silentNotifications', "Controls whether notifications do not disturb mode should be enabled while in Zen Mode. If true, only error notifications will pop out.")
            }
        }
    });
})();
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.activityBar.visible', migrateFn: (value) => {
            const result = [];
            if (value !== undefined) {
                result.push(['workbench.activityBar.visible', { value: undefined }]);
            }
            if (value === false) {
                result.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "hidden" /* ActivityBarPosition.HIDDEN */ }]);
            }
            return result;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, migrateFn: (value) => {
            const results = [];
            if (value === 'side') {
                results.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "default" /* ActivityBarPosition.DEFAULT */ }]);
            }
            return results;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.editor.doubleClickTabToToggleEditorGroupSizes', migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? 'expand' : 'off';
                results.push(['workbench.editor.doubleClickTabToToggleEditorGroupSizes', { value }]);
            }
            return results;
        }
    }, {
        key: "workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? "multiple" /* EditorTabsMode.MULTIPLE */ : "single" /* EditorTabsMode.SINGLE */;
                results.push(["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, { value }]);
            }
            return results;
        }
    }, {
        key: 'workbench.editor.tabCloseButton', migrateFn: (value) => {
            const result = [];
            if (value === 'left' || value === 'right') {
                result.push(['workbench.editor.tabActionLocation', { value }]);
            }
            else if (value === 'off') {
                result.push(['workbench.editor.tabActionCloseVisibility', { value: false }]);
            }
            return result;
        }
    }, {
        key: 'zenMode.hideTabs', migrateFn: (value) => {
            const result = [['zenMode.hideTabs', { value: undefined }]];
            if (value === true) {
                result.push(['zenMode.showTabs', { value: 'single' }]);
            }
            return result;
        }
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93b3JrYmVuY2guY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixNQUFNLDhEQUE4RCxDQUFDO0FBQ2pLLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakcsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLHFDQUFxQyxFQUFtQyw4QkFBOEIsRUFBRSxVQUFVLEVBQThCLDZCQUE2QixFQUFFLDJCQUEyQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDalUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUU1RixnQkFBZ0I7QUFDaEIsQ0FBQyxTQUFTLHFCQUFxQjtJQUU5QixvQkFBb0I7SUFDcEIsOEJBQThCLENBQUMsMkNBQTJD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