import { register } from './codiconsUtil.js';
import { codiconsLibrary } from './codiconsLibrary.js';
/**
 * Only to be used by the iconRegistry.
 */
export function getAllCodicons() {
    return Object.values(Codicon);
}
/**
 * Derived icons, that could become separate icons.
 * These mappings should be moved into the mapping file in the vscode-codicons repo at some point.
 */
export const codiconsDerived = {
    dialogError: register('dialog-error', 'error'),
    dialogWarning: register('dialog-warning', 'warning'),
    dialogInfo: register('dialog-info', 'info'),
    dialogClose: register('dialog-close', 'close'),
    treeItemExpanded: register('tree-item-expanded', 'chevron-down'), // collapsed is done with rotation
    treeFilterOnTypeOn: register('tree-filter-on-type-on', 'list-filter'),
    treeFilterOnTypeOff: register('tree-filter-on-type-off', 'list-selection'),
    treeFilterClear: register('tree-filter-clear', 'close'),
    treeItemLoading: register('tree-item-loading', 'loading'),
    menuSelection: register('menu-selection', 'check'),
    menuSubmenu: register('menu-submenu', 'chevron-right'),
    menuBarMore: register('menubar-more', 'more'),
    scrollbarButtonLeft: register('scrollbar-button-left', 'triangle-left'),
    scrollbarButtonRight: register('scrollbar-button-right', 'triangle-right'),
    scrollbarButtonUp: register('scrollbar-button-up', 'triangle-up'),
    scrollbarButtonDown: register('scrollbar-button-down', 'triangle-down'),
    toolBarMore: register('toolbar-more', 'more'),
    quickInputBack: register('quick-input-back', 'arrow-left'),
    dropDownButton: register('drop-down-button', 0xeab4),
    symbolCustomColor: register('symbol-customcolor', 0xeb5c),
    exportIcon: register('export', 0xebac),
    workspaceUnspecified: register('workspace-unspecified', 0xebc3),
    newLine: register('newline', 0xebea),
    thumbsDownFilled: register('thumbsdown-filled', 0xec13),
    thumbsUpFilled: register('thumbsup-filled', 0xec14),
    gitFetch: register('git-fetch', 0xec1d),
    lightbulbSparkleAutofix: register('lightbulb-sparkle-autofix', 0xec1f),
    debugBreakpointPending: register('debug-breakpoint-pending', 0xebd9),
};
/**
 * The Codicon library is a set of default icons that are built-in in VS Code.
 *
 * In the product (outside of base) Codicons should only be used as defaults. In order to have all icons in VS Code
 * themeable, component should define new, UI component specific icons using `iconRegistry.registerIcon`.
 * In that call a Codicon can be named as default.
 */
export const Codicon = {
    ...codiconsLibrary,
    ...codiconsDerived
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kaWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29kaWNvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUd2RDs7R0FFRztBQUNILE1BQU0sVUFBVSxjQUFjO0lBQzdCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHO0lBQzlCLFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQztJQUM5QyxhQUFhLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQztJQUNwRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUM7SUFDM0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO0lBQzlDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxjQUFjLENBQUMsRUFBRSxrQ0FBa0M7SUFDcEcsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGFBQWEsQ0FBQztJQUNyRSxtQkFBbUIsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsZ0JBQWdCLENBQUM7SUFDMUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUM7SUFDdkQsZUFBZSxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUM7SUFDekQsYUFBYSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUM7SUFDbEQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO0lBQ3RELFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUM3QyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxDQUFDO0lBQ3ZFLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxnQkFBZ0IsQ0FBQztJQUMxRSxpQkFBaUIsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsYUFBYSxDQUFDO0lBQ2pFLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxlQUFlLENBQUM7SUFDdkUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO0lBQzdDLGNBQWMsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDO0lBQzFELGNBQWMsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDO0lBQ3BELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUM7SUFDekQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO0lBQ3RDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUM7SUFDL0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDO0lBQ3BDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUM7SUFDdkQsY0FBYyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUM7SUFDbkQsUUFBUSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDO0lBQ3ZDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxNQUFNLENBQUM7SUFDdEUsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLE1BQU0sQ0FBQztDQUUzRCxDQUFDO0FBRVg7Ozs7OztHQU1HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHO0lBQ3RCLEdBQUcsZUFBZTtJQUNsQixHQUFHLGVBQWU7Q0FFVCxDQUFDIn0=