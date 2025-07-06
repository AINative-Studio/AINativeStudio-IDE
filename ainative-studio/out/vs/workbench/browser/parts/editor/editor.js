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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFNNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRy9JLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQU03RCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDcEUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRS9HLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUF1QjtJQUM5RCxRQUFRLEVBQUUsVUFBVTtJQUNwQixxQkFBcUIsRUFBRSxLQUFLO0lBQzVCLGlCQUFpQixFQUFFLE9BQU87SUFDMUIsd0JBQXdCLEVBQUUsSUFBSTtJQUM5Qix3QkFBd0IsRUFBRSxJQUFJO0lBQzlCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsU0FBUyxFQUFFLEtBQUs7SUFDaEIsc0JBQXNCLEVBQUUsRUFBRTtJQUMxQixzQkFBc0IsRUFBRSxHQUFHO0lBQzNCLGVBQWUsRUFBRSxRQUFRO0lBQ3pCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsU0FBUyxFQUFFLFNBQVM7SUFDcEIsd0JBQXdCLEVBQUUsa0JBQWtCO0lBQzVDLG9CQUFvQixFQUFFLFNBQVM7SUFDL0IsMkJBQTJCLEVBQUUsSUFBSTtJQUNqQyxTQUFTLEVBQUUsSUFBSTtJQUNmLFFBQVEsRUFBRSxJQUFJLEVBQUUsc0NBQXNDO0lBQ3RELGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxPQUFPO0lBQ3hCLHVCQUF1QixFQUFFLE9BQU87SUFDaEMsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixXQUFXLEVBQUUsU0FBUztJQUN0QixXQUFXLEVBQUUsTUFBTTtJQUNuQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsd0JBQXdCLEVBQUUsS0FBSztJQUMvQixzQ0FBc0MsRUFBRSxRQUFRO0lBQ2hELHFCQUFxQixFQUFFLFNBQVM7SUFDaEMsUUFBUSxFQUFFLEtBQUs7SUFDZiwwQkFBMEIsRUFBRSxLQUFLO0lBQ2pDLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsK0JBQStCLEVBQUUsS0FBSztJQUN0QyxpQkFBaUIsRUFBRSxLQUFLO0lBQ3hCLDBCQUEwQixFQUFFLElBQUk7SUFDaEMsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixrQkFBa0IsRUFBRSxZQUFZO0lBQ2hDLFlBQVksRUFBRSxLQUFLO0lBQ25CLDREQUE0RDtJQUM1RCxvREFBb0Q7SUFDcEQsSUFBSSxLQUFLLEtBQThCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFILElBQUksV0FBVyxLQUFtQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFGLElBQUksY0FBYyxLQUFrQixPQUFPLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQyxDQUFDO0NBQy9ELENBQUM7QUFFRixNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBZ0M7SUFDeEUsT0FBTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUM1SixDQUFDO0FBRUQsTUFBTSxVQUFVLG9CQUFvQixDQUFDLG9CQUEyQyxFQUFFLFlBQTJCO0lBQzVHLE1BQU0sT0FBTyxHQUFHO1FBQ2YsR0FBRywyQkFBMkI7UUFDOUIsUUFBUSxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFlBQVk7S0FDdEQsQ0FBQztJQUVGLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBaUMsQ0FBQztJQUM5RSxJQUFJLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFFL0IsMENBQTBDO1FBQzFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEQsZ0RBQWdEO1FBQ2hELElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEQsT0FBTyxDQUFDLGNBQWMsR0FBRywyQkFBMkIsQ0FBQyxjQUFjLENBQUM7WUFFcEUsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDN0YsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3pCLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLGNBQWMsR0FBRywyQkFBMkIsQ0FBQyxjQUFjLENBQUM7UUFDckUsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXlCLENBQUM7SUFDNUUsSUFBSSxZQUFZLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQztRQUNwRCxPQUFPLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztJQUNqRSxDQUFDO0lBRUQsT0FBTyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxPQUEyQjtJQUU3RCwyRkFBMkY7SUFDM0YsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUM3RCxDQUFDO0lBRUQsT0FBTyxZQUFZLENBQXFCO1FBQ3ZDLFVBQVUsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4RSxvQkFBb0IsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzVGLHVCQUF1QixFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDbEcsMEJBQTBCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN4RywwQkFBMEIsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hHLHlCQUF5QixFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEcseUJBQXlCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN0Ryw2QkFBNkIsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzlHLFdBQVcsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxRSxlQUFlLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEYsNEJBQTRCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUM1RyxpQ0FBaUMsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3RILG1CQUFtQixFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDMUYsa0JBQWtCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN4RixjQUFjLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDaEYsNEJBQTRCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUM1RyxrQkFBa0IsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hGLG9CQUFvQixFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDNUYsa0JBQWtCLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN4RiwwQkFBMEIsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hHLFVBQVUsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4RSx3QkFBd0IsRUFBRSxJQUFJLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ25HLHdCQUF3QixFQUFFLElBQUksY0FBYyxDQUFDLDJCQUEyQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFbkcsVUFBVSxFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyRyxtQkFBbUIsRUFBRSxJQUFJLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFHLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkcsaUJBQWlCLEVBQUUsSUFBSSxZQUFZLENBQUMsMkJBQTJCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEgsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9GLDBCQUEwQixFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pKLHNCQUFzQixFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkgsaUJBQWlCLEVBQUUsSUFBSSxZQUFZLENBQUMsMkJBQTJCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZILHlCQUF5QixFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEgsYUFBYSxFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkgsb0JBQW9CLEVBQUUsSUFBSSxZQUFZLENBQUMsMkJBQTJCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNySCxhQUFhLEVBQUUsSUFBSSxZQUFZLENBQUMsMkJBQTJCLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVHLHdDQUF3QyxFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLHdDQUF3QyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hLLHVCQUF1QixFQUFFLElBQUksWUFBWSxDQUFDLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xJLGdCQUFnQixFQUFFLElBQUksV0FBVyxDQUFTLDJCQUEyQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFeEYsT0FBTyxFQUFFLElBQUksY0FBYyxDQUEwQiwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxRixTQUFTLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0UsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFFLGdCQUFnQixFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDN0YsY0FBYyxFQUFFLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ3pGLENBQUM7UUFDRixhQUFhLEVBQUUsSUFBSSxjQUFjLENBQStCLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQzNHLFFBQVEsRUFBRSxJQUFJLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuRixRQUFRLEVBQUUsSUFBSSxlQUFlLENBQUMsMkJBQTJCLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbkYsQ0FBQztLQUNGLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDYixDQUFDO0FBcUhELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFtQixFQUFFLG9CQUFrQyxFQUFFLGFBQThCO0lBQ2hJLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQ3RHLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixHQUFHLGFBQWE7WUFDaEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQUU7U0FDakQsQ0FBQztRQUVGLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxPQUFPLGFBQWEsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsV0FBeUIsRUFBRSxPQUFzQixFQUFFLGFBQXVCO0lBQ2hILElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7SUFFeEQsSUFBSSxZQUFxQyxDQUFDO0lBQzFDLE1BQU0sZUFBZSxHQUFrQixFQUFFLENBQUM7SUFDMUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsWUFBWSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQixZQUFZLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMseURBQXlEO0lBQ2xHLENBQUM7SUFFRCxrRUFBa0U7SUFDbEUsb0VBQW9FO0lBQ3BFLGdFQUFnRTtJQUNoRSxrRUFBa0U7SUFDbEUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ25FLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUN2QixNQUFNO1lBQ04sT0FBTyxFQUFFO2dCQUNSLE1BQU0sRUFBRSxJQUFJO2dCQUNaLE1BQU0sRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDcEMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNmLGFBQWE7YUFDYjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLGtCQUFrQixDQUFDO0FBQzNCLENBQUMifQ==