/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { registerColor, editorBackground, contrastBorder, transparent, editorWidgetBackground, textLinkForeground, lighten, darken, focusBorder, activeContrastBorder, editorWidgetForeground, editorErrorForeground, editorWarningForeground, editorInfoForeground, treeIndentGuidesStroke, errorForeground, listActiveSelectionBackground, listActiveSelectionForeground, editorForeground, toolbarHoverBackground, inputBorder, widgetBorder, scrollbarShadow } from '../../platform/theme/common/colorRegistry.js';
import { Color } from '../../base/common/color.js';
import { ColorScheme } from '../../platform/theme/common/theme.js';
// < --- Workbench (not customizable) --- >
export function WORKBENCH_BACKGROUND(theme) {
    switch (theme.type) {
        case ColorScheme.LIGHT:
            return Color.fromHex('#F3F3F3');
        case ColorScheme.HIGH_CONTRAST_LIGHT:
            return Color.fromHex('#FFFFFF');
        case ColorScheme.HIGH_CONTRAST_DARK:
            return Color.fromHex('#000000');
        default:
            return Color.fromHex('#252526');
    }
}
// < --- Tabs --- >
//#region Tab Background
export const TAB_ACTIVE_BACKGROUND = registerColor('tab.activeBackground', editorBackground, localize('tabActiveBackground', "Active tab background color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('tab.unfocusedActiveBackground', TAB_ACTIVE_BACKGROUND, localize('tabUnfocusedActiveBackground', "Active tab background color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_INACTIVE_BACKGROUND = registerColor('tab.inactiveBackground', {
    dark: '#2D2D2D',
    light: '#ECECEC',
    hcDark: null,
    hcLight: null,
}, localize('tabInactiveBackground', "Inactive tab background color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('tab.unfocusedInactiveBackground', TAB_INACTIVE_BACKGROUND, localize('tabUnfocusedInactiveBackground', "Inactive tab background color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
//#region Tab Foreground
export const TAB_ACTIVE_FOREGROUND = registerColor('tab.activeForeground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.white,
    hcLight: '#292929'
}, localize('tabActiveForeground', "Active tab foreground color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_INACTIVE_FOREGROUND = registerColor('tab.inactiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize('tabInactiveForeground', "Inactive tab foreground color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('tab.unfocusedActiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize('tabUnfocusedActiveForeground', "Active tab foreground color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('tab.unfocusedInactiveForeground', {
    dark: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize('tabUnfocusedInactiveForeground', "Inactive tab foreground color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
//#region Tab Hover Foreground/Background
export const TAB_HOVER_BACKGROUND = registerColor('tab.hoverBackground', null, localize('tabHoverBackground', "Tab background color when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('tab.unfocusedHoverBackground', {
    dark: transparent(TAB_HOVER_BACKGROUND, 0.5),
    light: transparent(TAB_HOVER_BACKGROUND, 0.7),
    hcDark: null,
    hcLight: null
}, localize('tabUnfocusedHoverBackground', "Tab background color in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_HOVER_FOREGROUND = registerColor('tab.hoverForeground', null, localize('tabHoverForeground', "Tab foreground color when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('tab.unfocusedHoverForeground', {
    dark: transparent(TAB_HOVER_FOREGROUND, 0.5),
    light: transparent(TAB_HOVER_FOREGROUND, 0.5),
    hcDark: null,
    hcLight: null
}, localize('tabUnfocusedHoverForeground', "Tab foreground color in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
//#region Tab Borders
export const TAB_BORDER = registerColor('tab.border', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('tabBorder', "Border to separate tabs from each other. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_LAST_PINNED_BORDER = registerColor('tab.lastPinnedBorder', {
    dark: treeIndentGuidesStroke,
    light: treeIndentGuidesStroke,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('lastPinnedTabBorder', "Border to separate pinned tabs from other tabs. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_ACTIVE_BORDER = registerColor('tab.activeBorder', null, localize('tabActiveBorder', "Border on the bottom of an active tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('tab.unfocusedActiveBorder', {
    dark: transparent(TAB_ACTIVE_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_BORDER, 0.7),
    hcDark: null,
    hcLight: null
}, localize('tabActiveUnfocusedBorder', "Border on the bottom of an active tab in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_ACTIVE_BORDER_TOP = registerColor('tab.activeBorderTop', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize('tabActiveBorderTop', "Border to the top of an active tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('tab.unfocusedActiveBorderTop', {
    dark: transparent(TAB_ACTIVE_BORDER_TOP, 0.5),
    light: transparent(TAB_ACTIVE_BORDER_TOP, 0.7),
    hcDark: null,
    hcLight: '#B5200D'
}, localize('tabActiveUnfocusedBorderTop', "Border to the top of an active tab in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_SELECTED_BORDER_TOP = registerColor('tab.selectedBorderTop', TAB_ACTIVE_BORDER_TOP, localize('tabSelectedBorderTop', "Border to the top of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_SELECTED_BACKGROUND = registerColor('tab.selectedBackground', TAB_ACTIVE_BACKGROUND, localize('tabSelectedBackground', "Background of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_SELECTED_FOREGROUND = registerColor('tab.selectedForeground', TAB_ACTIVE_FOREGROUND, localize('tabSelectedForeground', "Foreground of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_HOVER_BORDER = registerColor('tab.hoverBorder', null, localize('tabHoverBorder', "Border to highlight tabs when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('tab.unfocusedHoverBorder', {
    dark: transparent(TAB_HOVER_BORDER, 0.5),
    light: transparent(TAB_HOVER_BORDER, 0.7),
    hcDark: null,
    hcLight: contrastBorder
}, localize('tabUnfocusedHoverBorder', "Border to highlight tabs in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
//#region Tab Drag and Drop Border
export const TAB_DRAG_AND_DROP_BORDER = registerColor('tab.dragAndDropBorder', {
    dark: TAB_ACTIVE_FOREGROUND,
    light: TAB_ACTIVE_FOREGROUND,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder
}, localize('tabDragAndDropBorder', "Border between tabs to indicate that a tab can be inserted between two tabs. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
//#region Tab Modified Border
export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('tab.activeModifiedBorder', {
    dark: '#3399CC',
    light: '#33AAEE',
    hcDark: null,
    hcLight: contrastBorder
}, localize('tabActiveModifiedBorder', "Border on the top of modified active tabs in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('tab.inactiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize('tabInactiveModifiedBorder', "Border on the top of modified inactive tabs in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedActiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize('unfocusedActiveModifiedBorder', "Border on the top of modified active tabs in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedInactiveModifiedBorder', {
    dark: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize('unfocusedINactiveModifiedBorder', "Border on the top of modified inactive tabs in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups."));
//#endregion
// < --- Editors --- >
export const EDITOR_PANE_BACKGROUND = registerColor('editorPane.background', editorBackground, localize('editorPaneBackground', "Background color of the editor pane visible on the left and right side of the centered editor layout."));
export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBackground', null, localize('editorGroupEmptyBackground', "Background color of an empty editor group. Editor groups are the containers of editors."));
export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder
}, localize('editorGroupFocusedEmptyBorder', "Border color of an empty editor group that is focused. Editor groups are the containers of editors."));
export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeader.tabsBackground', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: null,
    hcLight: null
}, localize('tabsContainerBackground', "Background color of the editor group title header when tabs are enabled. Editor groups are the containers of editors."));
export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeader.tabsBorder', null, localize('tabsContainerBorder', "Border color of the editor group title header when tabs are enabled. Editor groups are the containers of editors."));
export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeader.noTabsBackground', editorBackground, localize('editorGroupHeaderBackground', "Background color of the editor group title header when (`\"workbench.editor.showTabs\": \"single\"`). Editor groups are the containers of editors."));
export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeader.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('editorTitleContainerBorder', "Border color of the editor group title header. Editor groups are the containers of editors."));
export const EDITOR_GROUP_BORDER = registerColor('editorGroup.border', {
    dark: '#444444',
    light: '#E7E7E7',
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('editorGroupBorder', "Color to separate multiple editor groups from each other. Editor groups are the containers of editors."));
export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBackground', {
    dark: Color.fromHex('#53595D').transparent(0.5),
    light: Color.fromHex('#2677CB').transparent(0.18),
    hcDark: null,
    hcLight: Color.fromHex('#0F4A85').transparent(0.50)
}, localize('editorDragAndDropBackground', "Background color when dragging editors around. The color should have transparency so that the editor contents can still shine through."));
export const EDITOR_DROP_INTO_PROMPT_FOREGROUND = registerColor('editorGroup.dropIntoPromptForeground', editorWidgetForeground, localize('editorDropIntoPromptForeground', "Foreground color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor."));
export const EDITOR_DROP_INTO_PROMPT_BACKGROUND = registerColor('editorGroup.dropIntoPromptBackground', editorWidgetBackground, localize('editorDropIntoPromptBackground', "Background color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor."));
export const EDITOR_DROP_INTO_PROMPT_BORDER = registerColor('editorGroup.dropIntoPromptBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('editorDropIntoPromptBorder', "Border color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor."));
export const SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER = registerColor('sideBySideEditor.horizontalBorder', EDITOR_GROUP_BORDER, localize('sideBySideEditor.horizontalBorder', "Color to separate two editors from each other when shown side by side in an editor group from top to bottom."));
export const SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER = registerColor('sideBySideEditor.verticalBorder', EDITOR_GROUP_BORDER, localize('sideBySideEditor.verticalBorder', "Color to separate two editors from each other when shown side by side in an editor group from left to right."));
// < --- Output Editor -->
const OUTPUT_VIEW_BACKGROUND = registerColor('outputView.background', null, localize('outputViewBackground', "Output view background color."));
registerColor('outputViewStickyScroll.background', OUTPUT_VIEW_BACKGROUND, localize('outputViewStickyScrollBackground', "Output view sticky scroll background color."));
// < --- Banner --- >
export const BANNER_BACKGROUND = registerColor('banner.background', {
    dark: listActiveSelectionBackground,
    light: darken(listActiveSelectionBackground, 0.3),
    hcDark: listActiveSelectionBackground,
    hcLight: listActiveSelectionBackground
}, localize('banner.background', "Banner background color. The banner is shown under the title bar of the window."));
export const BANNER_FOREGROUND = registerColor('banner.foreground', listActiveSelectionForeground, localize('banner.foreground', "Banner foreground color. The banner is shown under the title bar of the window."));
export const BANNER_ICON_FOREGROUND = registerColor('banner.iconForeground', editorInfoForeground, localize('banner.iconForeground', "Banner icon color. The banner is shown under the title bar of the window."));
// < --- Status --- >
export const STATUS_BAR_FOREGROUND = registerColor('statusBar.foreground', {
    dark: '#FFFFFF',
    light: '#FFFFFF',
    hcDark: '#FFFFFF',
    hcLight: editorForeground
}, localize('statusBarForeground', "Status bar foreground color when a workspace or folder is opened. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('statusBar.noFolderForeground', STATUS_BAR_FOREGROUND, localize('statusBarNoFolderForeground', "Status bar foreground color when no folder is opened. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_BACKGROUND = registerColor('statusBar.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: null,
    hcLight: null,
}, localize('statusBarBackground', "Status bar background color when a workspace or folder is opened. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('statusBar.noFolderBackground', {
    dark: '#68217A',
    light: '#68217A',
    hcDark: null,
    hcLight: null,
}, localize('statusBarNoFolderBackground', "Status bar background color when no folder is opened. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_BORDER = registerColor('statusBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('statusBarBorder', "Status bar border color separating to the sidebar and editor. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_FOCUS_BORDER = registerColor('statusBar.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: STATUS_BAR_FOREGROUND
}, localize('statusBarFocusBorder', "Status bar border color when focused on keyboard navigation. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('statusBar.noFolderBorder', STATUS_BAR_BORDER, localize('statusBarNoFolderBorder', "Status bar border color separating to the sidebar and editor when no folder is opened. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('statusBarItem.activeBackground', {
    dark: Color.white.transparent(0.18),
    light: Color.white.transparent(0.18),
    hcDark: Color.white.transparent(0.18),
    hcLight: Color.black.transparent(0.18)
}, localize('statusBarItemActiveBackground', "Status bar item background color when clicking. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ITEM_FOCUS_BORDER = registerColor('statusBarItem.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: activeContrastBorder
}, localize('statusBarItemFocusBorder', "Status bar item border color when focused on keyboard navigation. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.hoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.white.transparent(0.12),
    hcDark: Color.white.transparent(0.12),
    hcLight: Color.black.transparent(0.12)
}, localize('statusBarItemHoverBackground', "Status bar item background color when hovering. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.hoverForeground', STATUS_BAR_FOREGROUND, localize('statusBarItemHoverForeground', "Status bar item foreground color when hovering. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND = registerColor('statusBarItem.compactHoverBackground', {
    dark: Color.white.transparent(0.20),
    light: Color.white.transparent(0.20),
    hcDark: Color.white.transparent(0.20),
    hcLight: Color.black.transparent(0.20)
}, localize('statusBarItemCompactHoverBackground', "Status bar item background color when hovering an item that contains two hovers. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('statusBarItem.prominentForeground', STATUS_BAR_FOREGROUND, localize('statusBarProminentItemForeground', "Status bar prominent items foreground color. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('statusBarItem.prominentBackground', Color.black.transparent(0.5), localize('statusBarProminentItemBackground', "Status bar prominent items background color. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.prominentHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarProminentItemHoverForeground', "Status bar prominent items foreground color when hovering. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.prominentHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarProminentItemHoverBackground', "Status bar prominent items background color when hovering. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ERROR_ITEM_BACKGROUND = registerColor('statusBarItem.errorBackground', {
    dark: darken(errorForeground, .4),
    light: darken(errorForeground, .4),
    hcDark: null,
    hcLight: '#B5200D'
}, localize('statusBarErrorItemBackground', "Status bar error items background color. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ERROR_ITEM_FOREGROUND = registerColor('statusBarItem.errorForeground', Color.white, localize('statusBarErrorItemForeground', "Status bar error items foreground color. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ERROR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.errorHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarErrorItemHoverForeground', "Status bar error items foreground color when hovering. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_ERROR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.errorHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarErrorItemHoverBackground', "Status bar error items background color when hovering. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_WARNING_ITEM_BACKGROUND = registerColor('statusBarItem.warningBackground', {
    dark: darken(editorWarningForeground, .4),
    light: darken(editorWarningForeground, .4),
    hcDark: null,
    hcLight: '#895503'
}, localize('statusBarWarningItemBackground', "Status bar warning items background color. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_WARNING_ITEM_FOREGROUND = registerColor('statusBarItem.warningForeground', Color.white, localize('statusBarWarningItemForeground', "Status bar warning items foreground color. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_WARNING_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.warningHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarWarningItemHoverForeground', "Status bar warning items foreground color when hovering. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window."));
export const STATUS_BAR_WARNING_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.warningHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarWarningItemHoverBackground', "Status bar warning items background color when hovering. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window."));
// < --- Activity Bar --- >
export const ACTIVITY_BAR_BACKGROUND = registerColor('activityBar.background', {
    dark: '#333333',
    light: '#2C2C2C',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize('activityBarBackground', "Activity bar background color. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_FOREGROUND = registerColor('activityBar.foreground', {
    dark: Color.white,
    light: Color.white,
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('activityBarForeground', "Activity bar item foreground color when it is active. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('activityBar.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    light: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('activityBarInActiveForeground', "Activity bar item foreground color when it is inactive. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_BORDER = registerColor('activityBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('activityBarBorder', "Activity bar border color separating to the side bar. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('activityBar.activeBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('activityBarActiveBorder', "Activity bar border color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('activityBar.activeFocusBorder', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize('activityBarActiveFocusBorder', "Activity bar focus border color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('activityBar.activeBackground', null, localize('activityBarActiveBackground', "Activity bar background color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('activityBar.dropBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: null,
    hcLight: null,
}, localize('activityBarDragAndDropBorder', "Drag and drop feedback color for the activity bar items. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('activityBarBadge.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: '#000000',
    hcLight: '#0F4A85'
}, localize('activityBarBadgeBackground', "Activity notification badge background color. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('activityBarBadge.foreground', Color.white, localize('activityBarBadgeForeground', "Activity notification badge foreground color. The activity bar is showing on the far left or right and allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_FOREGROUND = registerColor('activityBarTop.foreground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('activityBarTop', "Active foreground color of the item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_ACTIVE_BORDER = registerColor('activityBarTop.activeBorder', {
    dark: ACTIVITY_BAR_TOP_FOREGROUND,
    light: ACTIVITY_BAR_TOP_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize('activityBarTopActiveFocusBorder', "Focus border color for the active item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_ACTIVE_BACKGROUND = registerColor('activityBarTop.activeBackground', null, localize('activityBarTopActiveBackground', "Background color for the active item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND = registerColor('activityBarTop.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.6),
    light: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('activityBarTopInActiveForeground', "Inactive foreground color of the item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER = registerColor('activityBarTop.dropBorder', ACTIVITY_BAR_TOP_FOREGROUND, localize('activityBarTopDragAndDropBorder', "Drag and drop feedback color for the items in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar."));
export const ACTIVITY_BAR_TOP_BACKGROUND = registerColor('activityBarTop.background', null, localize('activityBarTopBackground', "Background color of the activity bar when set to top / bottom."));
// < --- Panels --- >
export const PANEL_BACKGROUND = registerColor('panel.background', editorBackground, localize('panelBackground', "Panel background color. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_BORDER = registerColor('panel.border', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('panelBorder', "Panel border color to separate the panel from the editor. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_TITLE_BORDER = registerColor('panelTitle.border', {
    dark: null,
    light: null,
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, localize('panelTitleBorder', "Panel title border color on the bottom, separating the title from the views. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.activeForeground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('panelActiveTitleForeground', "Title color for the active panel. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.inactiveForeground', {
    dark: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
    light: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize('panelInactiveTitleForeground', "Title color for the inactive panel. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_ACTIVE_TITLE_BORDER = registerColor('panelTitle.activeBorder', {
    dark: PANEL_ACTIVE_TITLE_FOREGROUND,
    light: PANEL_ACTIVE_TITLE_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize('panelActiveTitleBorder', "Border color for the active panel title. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_TITLE_BADGE_BACKGROUND = registerColor('panelTitleBadge.background', ACTIVITY_BAR_BADGE_BACKGROUND, localize('panelTitleBadgeBackground', "Panel title badge background color. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_TITLE_BADGE_FOREGROUND = registerColor('panelTitleBadge.foreground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('panelTitleBadgeForeground', "Panel title badge foreground color. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_INPUT_BORDER = registerColor('panelInput.border', {
    dark: inputBorder,
    light: Color.fromHex('#ddd'),
    hcDark: inputBorder,
    hcLight: inputBorder
}, localize('panelInputBorder', "Input box border for inputs in the panel."));
export const PANEL_DRAG_AND_DROP_BORDER = registerColor('panel.dropBorder', PANEL_ACTIVE_TITLE_FOREGROUND, localize('panelDragAndDropBorder', "Drag and drop feedback color for the panel titles. Panels are shown below the editor area and contain views like output and integrated terminal."));
export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('panelSection.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize('panelSectionDragAndDropBackground', "Drag and drop feedback color for the panel sections. The color should have transparency so that the panel sections can still shine through. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));
export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('panelSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null,
}, localize('panelSectionHeaderBackground', "Panel section header background color. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));
export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('panelSectionHeader.foreground', null, localize('panelSectionHeaderForeground', "Panel section header foreground color. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));
export const PANEL_SECTION_HEADER_BORDER = registerColor('panelSectionHeader.border', contrastBorder, localize('panelSectionHeaderBorder', "Panel section header border color used when multiple views are stacked vertically in the panel. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));
export const PANEL_SECTION_BORDER = registerColor('panelSection.border', PANEL_BORDER, localize('panelSectionBorder', "Panel section border color used when multiple views are stacked horizontally in the panel. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));
export const PANEL_STICKY_SCROLL_BACKGROUND = registerColor('panelStickyScroll.background', PANEL_BACKGROUND, localize('panelStickyScrollBackground', "Background color of sticky scroll in the panel."));
export const PANEL_STICKY_SCROLL_BORDER = registerColor('panelStickyScroll.border', null, localize('panelStickyScrollBorder', "Border color of sticky scroll in the panel."));
export const PANEL_STICKY_SCROLL_SHADOW = registerColor('panelStickyScroll.shadow', scrollbarShadow, localize('panelStickyScrollShadow', "Shadow color of sticky scroll in the panel."));
// < --- Profiles --- >
export const PROFILE_BADGE_BACKGROUND = registerColor('profileBadge.background', {
    dark: '#4D4D4D',
    light: '#C4C4C4',
    hcDark: Color.white,
    hcLight: Color.black
}, localize('profileBadgeBackground', "Profile badge background color. The profile badge shows on top of the settings gear icon in the activity bar."));
export const PROFILE_BADGE_FOREGROUND = registerColor('profileBadge.foreground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.black,
    hcLight: Color.white
}, localize('profileBadgeForeground', "Profile badge foreground color. The profile badge shows on top of the settings gear icon in the activity bar."));
// < --- Remote --- >
export const STATUS_BAR_REMOTE_ITEM_BACKGROUND = registerColor('statusBarItem.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize('statusBarItemRemoteBackground', "Background color for the remote indicator on the status bar."));
export const STATUS_BAR_REMOTE_ITEM_FOREGROUND = registerColor('statusBarItem.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('statusBarItemRemoteForeground', "Foreground color for the remote indicator on the status bar."));
export const STATUS_BAR_REMOTE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.remoteHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarRemoteItemHoverForeground', "Foreground color for the remote indicator on the status bar when hovering."));
export const STATUS_BAR_REMOTE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.remoteHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize('statusBarRemoteItemHoverBackground', "Background color for the remote indicator on the status bar when hovering."));
export const STATUS_BAR_OFFLINE_ITEM_BACKGROUND = registerColor('statusBarItem.offlineBackground', '#6c1717', localize('statusBarItemOfflineBackground', "Status bar item background color when the workbench is offline."));
export const STATUS_BAR_OFFLINE_ITEM_FOREGROUND = registerColor('statusBarItem.offlineForeground', STATUS_BAR_REMOTE_ITEM_FOREGROUND, localize('statusBarItemOfflineForeground', "Status bar item foreground color when the workbench is offline."));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.offlineHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarOfflineItemHoverForeground', "Status bar item foreground hover color when the workbench is offline."));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.offlineHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize('statusBarOfflineItemHoverBackground', "Status bar item background hover color when the workbench is offline."));
export const EXTENSION_BADGE_REMOTE_BACKGROUND = registerColor('extensionBadge.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize('extensionBadge.remoteBackground', "Background color for the remote badge in the extensions view."));
export const EXTENSION_BADGE_REMOTE_FOREGROUND = registerColor('extensionBadge.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('extensionBadge.remoteForeground', "Foreground color for the remote badge in the extensions view."));
// < --- Side Bar --- >
export const SIDE_BAR_BACKGROUND = registerColor('sideBar.background', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize('sideBarBackground', "Side bar background color. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_FOREGROUND = registerColor('sideBar.foreground', null, localize('sideBarForeground', "Side bar foreground color. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_BORDER = registerColor('sideBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('sideBarBorder', "Side bar border color on the side separating to the editor. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_TITLE_BACKGROUND = registerColor('sideBarTitle.background', SIDE_BAR_BACKGROUND, localize('sideBarTitleBackground', "Side bar title background color. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBarTitle.foreground', SIDE_BAR_FOREGROUND, localize('sideBarTitleForeground', "Side bar title foreground color. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_TITLE_BORDER = registerColor('sideBarTitle.border', {
    dark: null,
    light: null,
    hcDark: SIDE_BAR_BORDER,
    hcLight: SIDE_BAR_BORDER
}, localize('sideBarTitleBorder', "Side bar title border color on the bottom, separating the title from the views. The side bar is the container for views like explorer and search."));
export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBar.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize('sideBarDragAndDropBackground', "Drag and drop feedback color for the side bar sections. The color should have transparency so that the side bar sections can still shine through. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar."));
export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBarSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null
}, localize('sideBarSectionHeaderBackground', "Side bar section header background color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar."));
export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBarSectionHeader.foreground', SIDE_BAR_FOREGROUND, localize('sideBarSectionHeaderForeground', "Side bar section header foreground color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar."));
export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBarSectionHeader.border', contrastBorder, localize('sideBarSectionHeaderBorder', "Side bar section header border color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar."));
export const ACTIVITY_BAR_TOP_BORDER = registerColor('sideBarActivityBarTop.border', SIDE_BAR_SECTION_HEADER_BORDER, localize('sideBarActivityBarTopBorder', "Border color between the activity bar at the top/bottom and the views."));
export const SIDE_BAR_STICKY_SCROLL_BACKGROUND = registerColor('sideBarStickyScroll.background', SIDE_BAR_BACKGROUND, localize('sideBarStickyScrollBackground', "Background color of sticky scroll in the side bar."));
export const SIDE_BAR_STICKY_SCROLL_BORDER = registerColor('sideBarStickyScroll.border', null, localize('sideBarStickyScrollBorder', "Border color of sticky scroll in the side bar."));
export const SIDE_BAR_STICKY_SCROLL_SHADOW = registerColor('sideBarStickyScroll.shadow', scrollbarShadow, localize('sideBarStickyScrollShadow', "Shadow color of sticky scroll in the side bar."));
// < --- Title Bar --- >
export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBar.activeForeground', {
    dark: '#CCCCCC',
    light: '#333333',
    hcDark: '#FFFFFF',
    hcLight: '#292929'
}, localize('titleBarActiveForeground', "Title bar foreground when the window is active."));
export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBar.inactiveForeground', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    hcDark: null,
    hcLight: '#292929'
}, localize('titleBarInactiveForeground', "Title bar foreground when the window is inactive."));
export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBar.activeBackground', {
    dark: '#3C3C3C',
    light: '#DDDDDD',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize('titleBarActiveBackground', "Title bar background when the window is active."));
export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBar.inactiveBackground', {
    dark: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    hcDark: null,
    hcLight: null,
}, localize('titleBarInactiveBackground', "Title bar background when the window is inactive."));
export const TITLE_BAR_BORDER = registerColor('titleBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('titleBarBorder', "Title bar border color."));
// < --- Menubar --- >
export const MENUBAR_SELECTION_FOREGROUND = registerColor('menubar.selectionForeground', TITLE_BAR_ACTIVE_FOREGROUND, localize('menubarSelectionForeground', "Foreground color of the selected menu item in the menubar."));
export const MENUBAR_SELECTION_BACKGROUND = registerColor('menubar.selectionBackground', {
    dark: toolbarHoverBackground,
    light: toolbarHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize('menubarSelectionBackground', "Background color of the selected menu item in the menubar."));
export const MENUBAR_SELECTION_BORDER = registerColor('menubar.selectionBorder', {
    dark: null,
    light: null,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
}, localize('menubarSelectionBorder', "Border color of the selected menu item in the menubar."));
// < --- Command Center --- >
// foreground (inactive and active)
export const COMMAND_CENTER_FOREGROUND = registerColor('commandCenter.foreground', TITLE_BAR_ACTIVE_FOREGROUND, localize('commandCenter-foreground', "Foreground color of the command center"), false);
export const COMMAND_CENTER_ACTIVEFOREGROUND = registerColor('commandCenter.activeForeground', MENUBAR_SELECTION_FOREGROUND, localize('commandCenter-activeForeground', "Active foreground color of the command center"), false);
export const COMMAND_CENTER_INACTIVEFOREGROUND = registerColor('commandCenter.inactiveForeground', TITLE_BAR_INACTIVE_FOREGROUND, localize('commandCenter-inactiveForeground', "Foreground color of the command center when the window is inactive"), false);
// background (inactive and active)
export const COMMAND_CENTER_BACKGROUND = registerColor('commandCenter.background', { dark: Color.white.transparent(0.05), hcDark: null, light: Color.black.transparent(0.05), hcLight: null }, localize('commandCenter-background', "Background color of the command center"), false);
export const COMMAND_CENTER_ACTIVEBACKGROUND = registerColor('commandCenter.activeBackground', { dark: Color.white.transparent(0.08), hcDark: MENUBAR_SELECTION_BACKGROUND, light: Color.black.transparent(0.08), hcLight: MENUBAR_SELECTION_BACKGROUND }, localize('commandCenter-activeBackground', "Active background color of the command center"), false);
// border: active and inactive. defaults to active background
export const COMMAND_CENTER_BORDER = registerColor('commandCenter.border', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcDark: contrastBorder, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcLight: contrastBorder }, localize('commandCenter-border', "Border color of the command center"), false);
export const COMMAND_CENTER_ACTIVEBORDER = registerColor('commandCenter.activeBorder', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcDark: TITLE_BAR_ACTIVE_FOREGROUND, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcLight: TITLE_BAR_ACTIVE_FOREGROUND }, localize('commandCenter-activeBorder', "Active border color of the command center"), false);
// border: defaults to active background
export const COMMAND_CENTER_INACTIVEBORDER = registerColor('commandCenter.inactiveBorder', transparent(TITLE_BAR_INACTIVE_FOREGROUND, .25), localize('commandCenter-inactiveBorder', "Border color of the command center when the window is inactive"), false);
// < --- Notifications --- >
export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificationCenter.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('notificationCenterBorder', "Notifications center border color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificationToast.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('notificationToastBorder', "Notification toast border color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_FOREGROUND = registerColor('notifications.foreground', editorWidgetForeground, localize('notificationsForeground', "Notifications foreground color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_BACKGROUND = registerColor('notifications.background', editorWidgetBackground, localize('notificationsBackground', "Notifications background color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_LINKS = registerColor('notificationLink.foreground', textLinkForeground, localize('notificationsLink', "Notification links foreground color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificationCenterHeader.foreground', null, localize('notificationCenterHeaderForeground', "Notifications center header foreground color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificationCenterHeader.background', {
    dark: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
    light: darken(NOTIFICATIONS_BACKGROUND, 0.05),
    hcDark: NOTIFICATIONS_BACKGROUND,
    hcLight: NOTIFICATIONS_BACKGROUND
}, localize('notificationCenterHeaderBackground', "Notifications center header background color. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_BORDER = registerColor('notifications.border', NOTIFICATIONS_CENTER_HEADER_BACKGROUND, localize('notificationsBorder', "Notifications border color separating from other notifications in the notifications center. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificationsErrorIcon.foreground', editorErrorForeground, localize('notificationsErrorIconForeground', "The color used for the icon of error notifications. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificationsWarningIcon.foreground', editorWarningForeground, localize('notificationsWarningIconForeground', "The color used for the icon of warning notifications. Notifications slide in from the bottom right of the window."));
export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificationsInfoIcon.foreground', editorInfoForeground, localize('notificationsInfoIconForeground', "The color used for the icon of info notifications. Notifications slide in from the bottom right of the window."));
export const WINDOW_ACTIVE_BORDER = registerColor('window.activeBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('windowActiveBorder', "The color used for the border of the window when it is active on macOS or Linux. Requires custom title bar style and custom or hidden window controls on Linux."));
export const WINDOW_INACTIVE_BORDER = registerColor('window.inactiveBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('windowInactiveBorder', "The color used for the border of the window when it is inactive on macOS or Linux. Requires custom title bar style and custom or hidden window controls on Linux."));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL3RoZW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXZmLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbkUsMkNBQTJDO0FBRTNDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFrQjtJQUN0RCxRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQixLQUFLLFdBQVcsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxLQUFLLFdBQVcsQ0FBQyxtQkFBbUI7WUFDbkMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLEtBQUssV0FBVyxDQUFDLGtCQUFrQjtZQUNsQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxD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