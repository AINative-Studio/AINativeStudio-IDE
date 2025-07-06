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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9jb21tb24vcXVpY2tJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFNOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBNEQxRCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQWEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQXVIcEUsTUFBTSxDQUFOLElBQVksb0JBZ0JYO0FBaEJELFdBQVksb0JBQW9CO0lBRS9COztPQUVHO0lBQ0gsK0RBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gscUVBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gsaUVBQUssQ0FBQTtBQUNOLENBQUMsRUFoQlcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQWdCL0I7QUFNRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixjQUlqQjtBQUpELFdBQWtCLGNBQWM7SUFDL0IseUNBQXVCLENBQUE7SUFDdkIsdUNBQXFCLENBQUE7SUFDckIsNkNBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUppQixjQUFjLEtBQWQsY0FBYyxRQUkvQjtBQTJJRDs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBWSxjQWlCWDtBQWpCRCxXQUFZLGNBQWM7SUFDekI7O09BRUc7SUFDSCxtREFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCxxREFBSyxDQUFBO0lBQ0w7O09BRUc7SUFDSCx1REFBTSxDQUFBO0lBQ047O09BRUc7SUFDSCxtREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQWpCVyxjQUFjLEtBQWQsY0FBYyxRQWlCekI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGNBcUNYO0FBckNELFdBQVksY0FBYztJQUN6Qjs7T0FFRztJQUNILHFEQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFDTjs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFDSjs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFDSjs7T0FFRztJQUNILDJEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILDJEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILG1FQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILHFFQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILDZFQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFyQ1csY0FBYyxLQUFkLGNBQWMsUUFxQ3pCO0FBeVNELE1BQU0sQ0FBTixJQUFZLHdCQVVYO0FBVkQsV0FBWSx3QkFBd0I7SUFDbkM7O09BRUc7SUFDSCx5RUFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCwyRUFBVSxDQUFBO0FBQ1gsQ0FBQyxFQVZXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFVbkM7QUErRUQsTUFBTSxPQUFPLDJCQUEyQjtJQUV2QyxZQUFvQixPQUEyRDtRQUEzRCxZQUFPLEdBQVAsT0FBTyxDQUFvRDtJQUFJLENBQUM7SUFFcEYsWUFBWSxDQUFDLEtBQWlDO1FBQzdDLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsa0JBQWtCLENBQUMsS0FBaUM7UUFDbkQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUM7SUFDMUIsQ0FBQztJQUVELFdBQVcsQ0FBQyxLQUFpQztRQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDOUIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO0FBRTdFLFlBQVk7QUFFWixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUMifQ==