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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvY29tbW9uL3F1aWNrSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBTTlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQTREMUQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFhLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7QUF1SHBFLE1BQU0sQ0FBTixJQUFZLG9CQWdCWDtBQWhCRCxXQUFZLG9CQUFvQjtJQUUvQjs7T0FFRztJQUNILCtEQUFRLENBQUE7SUFFUjs7T0FFRztJQUNILHFFQUFPLENBQUE7SUFFUDs7T0FFRztJQUNILGlFQUFLLENBQUE7QUFDTixDQUFDLEVBaEJXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFnQi9CO0FBTUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsY0FJakI7QUFKRCxXQUFrQixjQUFjO0lBQy9CLHlDQUF1QixDQUFBO0lBQ3ZCLHVDQUFxQixDQUFBO0lBQ3JCLDZDQUEyQixDQUFBO0FBQzVCLENBQUMsRUFKaUIsY0FBYyxLQUFkLGNBQWMsUUFJL0I7QUEySUQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQVksY0FpQlg7QUFqQkQsV0FBWSxjQUFjO0lBQ3pCOztPQUVHO0lBQ0gsbURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gscURBQUssQ0FBQTtJQUNMOztPQUVHO0lBQ0gsdURBQU0sQ0FBQTtJQUNOOztPQUVHO0lBQ0gsbURBQUksQ0FBQTtBQUNMLENBQUMsRUFqQlcsY0FBYyxLQUFkLGNBQWMsUUFpQnpCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxjQXFDWDtBQXJDRCxXQUFZLGNBQWM7SUFDekI7O09BRUc7SUFDSCxxREFBUyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCx1REFBTSxDQUFBO0lBQ047O09BRUc7SUFDSCxtREFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCxtREFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCwyREFBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCwyREFBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCxtRUFBWSxDQUFBO0lBQ1o7O09BRUc7SUFDSCxxRUFBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCw2RUFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBckNXLGNBQWMsS0FBZCxjQUFjLFFBcUN6QjtBQXlTRCxNQUFNLENBQU4sSUFBWSx3QkFVWDtBQVZELFdBQVksd0JBQXdCO0lBQ25DOztPQUVHO0lBQ0gseUVBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsMkVBQVUsQ0FBQTtBQUNYLENBQUMsRUFWVyx3QkFBd0IsS0FBeEIsd0JBQXdCLFFBVW5DO0FBK0VELE1BQU0sT0FBTywyQkFBMkI7SUFFdkMsWUFBb0IsT0FBMkQ7UUFBM0QsWUFBTyxHQUFQLE9BQU8sQ0FBb0Q7SUFBSSxDQUFDO0lBRXBGLFlBQVksQ0FBQyxLQUFpQztRQUM3QyxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsQ0FBQztJQUVELGtCQUFrQixDQUFDLEtBQWlDO1FBQ25ELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBaUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QyxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO0lBQzdCLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQztBQUU3RSxZQUFZO0FBRVosTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFDIn0=