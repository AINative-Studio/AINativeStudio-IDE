/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { Toggle } from '../toggle/toggle.js';
import { Codicon } from '../../../common/codicons.js';
import * as nls from '../../../../nls.js';
const NLS_CASE_SENSITIVE_TOGGLE_LABEL = nls.localize('caseDescription', "Match Case");
const NLS_WHOLE_WORD_TOGGLE_LABEL = nls.localize('wordsDescription', "Match Whole Word");
const NLS_REGEX_TOGGLE_LABEL = nls.localize('regexDescription', "Use Regular Expression");
export class CaseSensitiveToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.caseSensitive,
            title: NLS_CASE_SENSITIVE_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground
        });
    }
}
export class WholeWordsToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.wholeWord,
            title: NLS_WHOLE_WORD_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground
        });
    }
}
export class RegexToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.regex,
            title: NLS_REGEX_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZElucHV0VG9nZ2xlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9maW5kaW5wdXQvZmluZElucHV0VG9nZ2xlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFXMUMsTUFBTSwrQkFBK0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3RGLE1BQU0sMkJBQTJCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3pGLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0FBRTFGLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxNQUFNO0lBQzlDLFlBQVksSUFBMEI7UUFDckMsS0FBSyxDQUFDO1lBQ0wsSUFBSSxFQUFFLE9BQU8sQ0FBQyxhQUFhO1lBQzNCLEtBQUssRUFBRSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsV0FBVztZQUN6RCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDO1lBQ3ZFLHVCQUF1QixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDckQsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQjtZQUM3RCwyQkFBMkIsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1NBQzdELENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxNQUFNO0lBQzNDLFlBQVksSUFBMEI7UUFDckMsS0FBSyxDQUFDO1lBQ0wsSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQ3ZCLEtBQUssRUFBRSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsV0FBVztZQUNyRCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDO1lBQ3ZFLHVCQUF1QixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDckQsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQjtZQUM3RCwyQkFBMkIsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1NBQzdELENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFZLFNBQVEsTUFBTTtJQUN0QyxZQUFZLElBQTBCO1FBQ3JDLEtBQUssQ0FBQztZQUNMLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztZQUNuQixLQUFLLEVBQUUsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFdBQVc7WUFDaEQsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQztZQUN2RSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQ3JELDJCQUEyQixFQUFFLElBQUksQ0FBQywyQkFBMkI7WUFDN0QsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQjtTQUM3RCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==