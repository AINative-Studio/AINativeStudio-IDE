/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
export const NO_KEY_MODS = { ctrlCmd: false, alt: false };
export var QuickInputHideReason;
(function (QuickInputHideReason) {
    /**
     * Focus moved away from the quick input.
     */
    QuickInputHideReason[QuickInputHideReason["Blur"] = 1] = "Blur";
    /**
     * An explicit user gesture, e.g. pressing Escape key.
     */
    QuickInputHideReason[QuickInputHideReason["Gesture"] = 2] = "Gesture";
    /**
     * Anything else.
     */
    QuickInputHideReason[QuickInputHideReason["Other"] = 3] = "Other";
})(QuickInputHideReason || (QuickInputHideReason = {}));
/**
 * A collection of the different types of QuickInput
 */
export var QuickInputType;
(function (QuickInputType) {
    QuickInputType["QuickPick"] = "quickPick";
    QuickInputType["InputBox"] = "inputBox";
    QuickInputType["QuickWidget"] = "quickWidget";
})(QuickInputType || (QuickInputType = {}));
/**
 * Represents the activation behavior for items in a quick input. This means which item will be
 * "active" (aka focused).
 */
export var ItemActivation;
(function (ItemActivation) {
    /**
     * No item will be active.
     */
    ItemActivation[ItemActivation["NONE"] = 0] = "NONE";
    /**
     * First item will be active.
     */
    ItemActivation[ItemActivation["FIRST"] = 1] = "FIRST";
    /**
     * Second item will be active.
     */
    ItemActivation[ItemActivation["SECOND"] = 2] = "SECOND";
    /**
     * Last item will be active.
     */
    ItemActivation[ItemActivation["LAST"] = 3] = "LAST";
})(ItemActivation || (ItemActivation = {}));
/**
 * Represents the focus options for a quick pick.
 */
export var QuickPickFocus;
(function (QuickPickFocus) {
    /**
     * Focus the first item in the list.
     */
    QuickPickFocus[QuickPickFocus["First"] = 1] = "First";
    /**
     * Focus the second item in the list.
     */
    QuickPickFocus[QuickPickFocus["Second"] = 2] = "Second";
    /**
     * Focus the last item in the list.
     */
    QuickPickFocus[QuickPickFocus["Last"] = 3] = "Last";
    /**
     * Focus the next item in the list.
     */
    QuickPickFocus[QuickPickFocus["Next"] = 4] = "Next";
    /**
     * Focus the previous item in the list.
     */
    QuickPickFocus[QuickPickFocus["Previous"] = 5] = "Previous";
    /**
     * Focus the next page in the list.
     */
    QuickPickFocus[QuickPickFocus["NextPage"] = 6] = "NextPage";
    /**
     * Focus the previous page in the list.
     */
    QuickPickFocus[QuickPickFocus["PreviousPage"] = 7] = "PreviousPage";
    /**
     * Focus the first item under the next separator.
     */
    QuickPickFocus[QuickPickFocus["NextSeparator"] = 8] = "NextSeparator";
    /**
     * Focus the first item under the current separator.
     */
    QuickPickFocus[QuickPickFocus["PreviousSeparator"] = 9] = "PreviousSeparator";
})(QuickPickFocus || (QuickPickFocus = {}));
export var QuickInputButtonLocation;
(function (QuickInputButtonLocation) {
    /**
     * In the title bar.
     */
    QuickInputButtonLocation[QuickInputButtonLocation["Title"] = 1] = "Title";
    /**
     * To the right of the input box.
     */
    QuickInputButtonLocation[QuickInputButtonLocation["Inline"] = 2] = "Inline";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
export class QuickPickItemScorerAccessor {
    constructor(options) {
        this.options = options;
    }
    getItemLabel(entry) {
        return entry.label;
    }
    getItemDescription(entry) {
        if (this.options?.skipDescription) {
            return undefined;
        }
        return entry.description;
    }
    getItemPath(entry) {
        if (this.options?.skipPath) {
            return undefined;
        }
        if (entry.resource?.scheme === Schemas.file) {
            return entry.resource.fsPath;
        }
        return entry.resource?.path;
    }
}
export const quickPickItemScorerAccessor = new QuickPickItemScorerAccessor();
//#endregion
export const IQuickInputService = createDecorator('quickInputService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2NvbW1vbi9xdWlja0lucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQU05RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUE0RDFELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBYSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDO0FBdUhwRSxNQUFNLENBQU4sSUFBWSxvQkFnQlg7QUFoQkQsV0FBWSxvQkFBb0I7SUFFL0I7O09BRUc7SUFDSCwrREFBUSxDQUFBO0lBRVI7O09BRUc7SUFDSCxxRUFBTyxDQUFBO0lBRVA7O09BRUc7SUFDSCxpRUFBSyxDQUFBO0FBQ04sQ0FBQyxFQWhCVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBZ0IvQjtBQU1EOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGNBSWpCO0FBSkQsV0FBa0IsY0FBYztJQUMvQix5Q0FBdUIsQ0FBQTtJQUN2Qix1Q0FBcUIsQ0FBQTtJQUNyQiw2Q0FBMkIsQ0FBQTtBQUM1QixDQUFDLEVBSmlCLGNBQWMsS0FBZCxjQUFjLFFBSS9CO0FBMklEOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFZLGNBaUJYO0FBakJELFdBQVksY0FBYztJQUN6Qjs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFDSjs7T0FFRztJQUNILHFEQUFLLENBQUE7SUFDTDs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFDTjs7T0FFRztJQUNILG1EQUFJLENBQUE7QUFDTCxDQUFDLEVBakJXLGNBQWMsS0FBZCxjQUFjLFFBaUJ6QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksY0FxQ1g7QUFyQ0QsV0FBWSxjQUFjO0lBQ3pCOztPQUVHO0lBQ0gscURBQVMsQ0FBQTtJQUNUOztPQUVHO0lBQ0gsdURBQU0sQ0FBQTtJQUNOOztPQUVHO0lBQ0gsbURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gsbURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gsMkRBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsMkRBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsbUVBQVksQ0FBQTtJQUNaOztPQUVHO0lBQ0gscUVBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsNkVBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQXJDVyxjQUFjLEtBQWQsY0FBYyxRQXFDekI7QUF5U0QsTUFBTSxDQUFOLElBQVksd0JBVVg7QUFWRCxXQUFZLHdCQUF3QjtJQUNuQzs7T0FFRztJQUNILHlFQUFTLENBQUE7SUFFVDs7T0FFRztJQUNILDJFQUFVLENBQUE7QUFDWCxDQUFDLEVBVlcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQVVuQztBQStFRCxNQUFNLE9BQU8sMkJBQTJCO0lBRXZDLFlBQW9CLE9BQTJEO1FBQTNELFlBQU8sR0FBUCxPQUFPLENBQW9EO0lBQUksQ0FBQztJQUVwRixZQUFZLENBQUMsS0FBaUM7UUFDN0MsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxLQUFpQztRQUNuRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUMxQixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWlDO1FBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0MsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM5QixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQztJQUM3QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUM7QUFFN0UsWUFBWTtBQUVaLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQyJ9