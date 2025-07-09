/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { activityErrorBadgeBackground, activityErrorBadgeForeground, activityWarningBadgeBackground, activityWarningBadgeForeground } from '../../../../platform/theme/common/colors/miscColors.js';
export const IActivityService = createDecorator('activityService');
class BaseBadge {
    constructor(descriptorFn, stylesFn) {
        this.descriptorFn = descriptorFn;
        this.stylesFn = stylesFn;
    }
    getDescription() {
        return this.descriptorFn(null);
    }
    getColors(theme) {
        return this.stylesFn?.(theme);
    }
}
export class NumberBadge extends BaseBadge {
    constructor(number, descriptorFn) {
        super(descriptorFn, undefined);
        this.number = number;
        this.number = number;
    }
    getDescription() {
        return this.descriptorFn(this.number);
    }
}
export class IconBadge extends BaseBadge {
    constructor(icon, descriptorFn, stylesFn) {
        super(descriptorFn, stylesFn);
        this.icon = icon;
    }
}
export class ProgressBadge extends BaseBadge {
    constructor(descriptorFn) {
        super(descriptorFn, undefined);
    }
}
export class WarningBadge extends IconBadge {
    constructor(descriptorFn) {
        super(Codicon.warning, descriptorFn, (theme) => ({
            badgeBackground: theme.getColor(activityWarningBadgeBackground),
            badgeForeground: theme.getColor(activityWarningBadgeForeground),
            badgeBorder: undefined,
        }));
    }
}
export class ErrorBadge extends IconBadge {
    constructor(descriptorFn) {
        super(Codicon.error, descriptorFn, (theme) => ({
            badgeBackground: theme.getColor(activityErrorBadgeBackground),
            badgeForeground: theme.getColor(activityErrorBadgeForeground),
            badgeBorder: undefined,
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjdGl2aXR5L2NvbW1vbi9hY3Rpdml0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFLOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSw4QkFBOEIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBUXBNLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQztBQXFEckYsTUFBTSxTQUFTO0lBRWQsWUFDb0IsWUFBa0MsRUFDcEMsUUFBd0U7UUFEdEUsaUJBQVksR0FBWixZQUFZLENBQXNCO1FBQ3BDLGFBQVEsR0FBUixRQUFRLENBQWdFO0lBRTFGLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBa0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxTQUFTO0lBRXpDLFlBQXFCLE1BQWMsRUFBRSxZQUFxQztRQUN6RSxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRFgsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUdsQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRVEsY0FBYztRQUN0QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsU0FBUztJQUN2QyxZQUNVLElBQWUsRUFDeEIsWUFBMEIsRUFDMUIsUUFBMkQ7UUFFM0QsS0FBSyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUpyQixTQUFJLEdBQUosSUFBSSxDQUFXO0lBS3pCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEsU0FBUztJQUMzQyxZQUFZLFlBQTBCO1FBQ3JDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxTQUFTO0lBQzFDLFlBQVksWUFBMEI7UUFDckMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RCxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQztZQUMvRCxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQztZQUMvRCxXQUFXLEVBQUUsU0FBUztTQUN0QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFXLFNBQVEsU0FBUztJQUN4QyxZQUFZLFlBQTBCO1FBQ3JDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLEtBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDM0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7WUFDN0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7WUFDN0QsV0FBVyxFQUFFLFNBQVM7U0FDdEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QifQ==