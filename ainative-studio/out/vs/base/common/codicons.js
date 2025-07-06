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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kaWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvZGljb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHdkQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYztJQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixXQUFXLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUM7SUFDOUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUM7SUFDcEQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDO0lBQzNDLFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQztJQUM5QyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxDQUFDLEVBQUUsa0NBQWtDO0lBQ3BHLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxhQUFhLENBQUM7SUFDckUsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGdCQUFnQixDQUFDO0lBQzFFLGVBQWUsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDO0lBQ3ZELGVBQWUsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDO0lBQ3pELGFBQWEsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDO0lBQ2xELFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztJQUN0RCxXQUFXLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7SUFDN0MsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQztJQUN2RSxvQkFBb0IsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZ0JBQWdCLENBQUM7SUFDMUUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGFBQWEsQ0FBQztJQUNqRSxtQkFBbUIsRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxDQUFDO0lBQ3ZFLFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUM3QyxjQUFjLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQztJQUMxRCxjQUFjLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDO0lBQ3pELFVBQVUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztJQUN0QyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDO0lBQy9ELE9BQU8sRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQztJQUNwQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDO0lBQ3ZELGNBQWMsRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDO0lBQ25ELFFBQVEsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQztJQUN2Qyx1QkFBdUIsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsTUFBTSxDQUFDO0lBQ3RFLHNCQUFzQixFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxNQUFNLENBQUM7Q0FFM0QsQ0FBQztBQUVYOzs7Ozs7R0FNRztBQUNILE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRztJQUN0QixHQUFHLGVBQWU7SUFDbEIsR0FBRyxlQUFlO0NBRVQsQ0FBQyJ9