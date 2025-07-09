/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Dimension } from '../../../../base/browser/dom.js';
import { isObject } from '../../../../base/common/types.js';
import { BooleanVerifier, EnumVerifier, NumberVerifier, ObjectVerifier, SetVerifier, verifyObject } from '../../../../base/common/verifier.js';
import { coalesce } from '../../../../base/common/arrays.js';
export const DEFAULT_EDITOR_MIN_DIMENSIONS = new Dimension(220, 70);
export const DEFAULT_EDITOR_MAX_DIMENSIONS = new Dimension(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
export const DEFAULT_EDITOR_PART_OPTIONS = {
    showTabs: 'multiple',
    highlightModifiedTabs: false,
    tabActionLocation: 'right',
    tabActionCloseVisibility: true,
    tabActionUnpinVisibility: true,
    alwaysShowEditorActions: false,
    tabSizing: 'fit',
    tabSizingFixedMinWidth: 50,
    tabSizingFixedMaxWidth: 160,
    pinnedTabSizing: 'normal',
    pinnedTabsOnSeparateRow: false,
    tabHeight: 'default',
    preventPinnedEditorClose: 'keyboardAndMouse',
    titleScrollbarSizing: 'default',
    focusRecentEditorAfterClose: true,
    showIcons: true,
    hasIcons: true, // 'vs-seti' is our default icon theme
    enablePreview: true,
    openPositioning: 'right',
    openSideBySideDirection: 'right',
    closeEmptyGroups: true,
    labelFormat: 'default',
    splitSizing: 'auto',
    splitOnDragAndDrop: true,
    dragToOpenWindow: true,
    centeredLayoutFixedWidth: false,
    doubleClickTabToToggleEditorGroupSizes: 'expand',
    editorActionsLocation: 'default',
    wrapTabs: false,
    enablePreviewFromQuickOpen: false,
    scrollToSwitchTabs: false,
    enablePreviewFromCodeNavigation: false,
    closeOnFileDelete: false,
    mouseBackForwardToNavigate: true,
    restoreViewState: true,
    splitInGroupLayout: 'horizontal',
    revealIfOpen: false,
    // Properties that are Objects have to be defined as getters
    // to ensure no consumer modifies the default values
    get limit() { return { enabled: false, value: 10, perEditorGroup: false, excludeDirty: false }; },
    get decorations() { return { badges: true, colors: true }; },
    get autoLockGroups() { return new Set(); }
};
export function impactsEditorPartOptions(event) {
    return event.affectsConfiguration('workbench.editor') || event.affectsConfiguration('workbench.iconTheme') || event.affectsConfiguration('window.density');
}
export function getEditorPartOptions(configurationService, themeService) {
    const options = {
        ...DEFAULT_EDITOR_PART_OPTIONS,
        hasIcons: themeService.getFileIconTheme().hasFileIcons
    };
    const config = configurationService.getValue();
    if (config?.workbench?.editor) {
        // Assign all primitive configuration over
        Object.assign(options, config.workbench.editor);
        // Special handle array types and convert to Set
        if (isObject(config.workbench.editor.autoLockGroups)) {
            options.autoLockGroups = DEFAULT_EDITOR_PART_OPTIONS.autoLockGroups;
            for (const [editorId, enablement] of Object.entries(config.workbench.editor.autoLockGroups)) {
                if (enablement === true) {
                    options.autoLockGroups.add(editorId);
                }
            }
        }
        else {
            options.autoLockGroups = DEFAULT_EDITOR_PART_OPTIONS.autoLockGroups;
        }
    }
    const windowConfig = configurationService.getValue();
    if (windowConfig?.window?.density?.editorTabHeight) {
        options.tabHeight = windowConfig.window.density.editorTabHeight;
    }
    return validateEditorPartOptions(options);
}
function validateEditorPartOptions(options) {
    // Migrate: Show tabs (config migration kicks in very late and can cause flicker otherwise)
    if (typeof options.showTabs === 'boolean') {
        options.showTabs = options.showTabs ? 'multiple' : 'single';
    }
    return verifyObject({
        'wrapTabs': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['wrapTabs']),
        'scrollToSwitchTabs': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['scrollToSwitchTabs']),
        'highlightModifiedTabs': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['highlightModifiedTabs']),
        'tabActionCloseVisibility': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionCloseVisibility']),
        'tabActionUnpinVisibility': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionUnpinVisibility']),
        'alwaysShowEditorActions': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['alwaysShowEditorActions']),
        'pinnedTabsOnSeparateRow': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['pinnedTabsOnSeparateRow']),
        'focusRecentEditorAfterClose': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['focusRecentEditorAfterClose']),
        'showIcons': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['showIcons']),
        'enablePreview': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreview']),
        'enablePreviewFromQuickOpen': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreviewFromQuickOpen']),
        'enablePreviewFromCodeNavigation': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreviewFromCodeNavigation']),
        'closeOnFileDelete': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['closeOnFileDelete']),
        'closeEmptyGroups': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['closeEmptyGroups']),
        'revealIfOpen': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['revealIfOpen']),
        'mouseBackForwardToNavigate': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['mouseBackForwardToNavigate']),
        'restoreViewState': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['restoreViewState']),
        'splitOnDragAndDrop': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitOnDragAndDrop']),
        'dragToOpenWindow': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['dragToOpenWindow']),
        'centeredLayoutFixedWidth': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['centeredLayoutFixedWidth']),
        'hasIcons': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['hasIcons']),
        'tabSizingFixedMinWidth': new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizingFixedMinWidth']),
        'tabSizingFixedMaxWidth': new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizingFixedMaxWidth']),
        'showTabs': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['showTabs'], ['multiple', 'single', 'none']),
        'tabActionLocation': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionLocation'], ['left', 'right']),
        'tabSizing': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizing'], ['fit', 'shrink', 'fixed']),
        'pinnedTabSizing': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['pinnedTabSizing'], ['normal', 'compact', 'shrink']),
        'tabHeight': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabHeight'], ['default', 'compact']),
        'preventPinnedEditorClose': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['preventPinnedEditorClose'], ['keyboardAndMouse', 'keyboard', 'mouse', 'never']),
        'titleScrollbarSizing': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['titleScrollbarSizing'], ['default', 'large']),
        'openPositioning': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['openPositioning'], ['left', 'right', 'first', 'last']),
        'openSideBySideDirection': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['openSideBySideDirection'], ['right', 'down']),
        'labelFormat': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['labelFormat'], ['default', 'short', 'medium', 'long']),
        'splitInGroupLayout': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitInGroupLayout'], ['vertical', 'horizontal']),
        'splitSizing': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitSizing'], ['distribute', 'split', 'auto']),
        'doubleClickTabToToggleEditorGroupSizes': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['doubleClickTabToToggleEditorGroupSizes'], ['maximize', 'expand', 'off']),
        'editorActionsLocation': new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['editorActionsLocation'], ['default', 'titleBar', 'hidden']),
        'autoLockGroups': new SetVerifier(DEFAULT_EDITOR_PART_OPTIONS['autoLockGroups']),
        'limit': new ObjectVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit'], {
            'enabled': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['enabled']),
            'value': new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['value']),
            'perEditorGroup': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['perEditorGroup']),
            'excludeDirty': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['excludeDirty'])
        }),
        'decorations': new ObjectVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations'], {
            'badges': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations']['badges']),
            'colors': new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations']['colors'])
        }),
    }, options);
}
export function fillActiveEditorViewState(group, expectedActiveEditor, presetOptions) {
    if (!expectedActiveEditor || !group.activeEditor || expectedActiveEditor.matches(group.activeEditor)) {
        const options = {
            ...presetOptions,
            viewState: group.activeEditorPane?.getViewState()
        };
        return options;
    }
    return presetOptions || Object.create(null);
}
export function prepareMoveCopyEditors(sourceGroup, editors, preserveFocus) {
    if (editors.length === 0) {
        return [];
    }
    const editorsWithOptions = [];
    let activeEditor;
    const inactiveEditors = [];
    for (const editor of editors) {
        if (!activeEditor && sourceGroup.isActive(editor)) {
            activeEditor = editor;
        }
        else {
            inactiveEditors.push(editor);
        }
    }
    if (!activeEditor) {
        activeEditor = inactiveEditors.shift(); // just take the first editor as active if none is active
    }
    // ensure inactive editors are then sorted by inverse visual order
    // so that we can preserve the order in the target group. we inverse
    // because editors will open to the side of the active editor as
    // inactive editors, and the active editor is always the reference
    inactiveEditors.sort((a, b) => sourceGroup.getIndexOfEditor(b) - sourceGroup.getIndexOfEditor(a));
    const sortedEditors = coalesce([activeEditor, ...inactiveEditors]);
    for (let i = 0; i < sortedEditors.length; i++) {
        const editor = sortedEditors[i];
        editorsWithOptions.push({
            editor,
            options: {
                pinned: true,
                sticky: sourceGroup.isSticky(editor),
                inactive: i > 0,
                preserveFocus
            }
        });
    }
    return editorsWithOptions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBTTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUc1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUcvSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFNN0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUUvRyxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBdUI7SUFDOUQsUUFBUSxFQUFFLFVBQVU7SUFDcEIscUJBQXFCLEVBQUUsS0FBSztJQUM1QixpQkFBaUIsRUFBRSxPQUFPO0lBQzFCLHdCQUF3QixFQUFFLElBQUk7SUFDOUIsd0JBQXdCLEVBQUUsSUFBSTtJQUM5Qix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLFNBQVMsRUFBRSxLQUFLO0lBQ2hCLHNCQUFzQixFQUFFLEVBQUU7SUFDMUIsc0JBQXNCLEVBQUUsR0FBRztJQUMzQixlQUFlLEVBQUUsUUFBUTtJQUN6Qix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLFNBQVMsRUFBRSxTQUFT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