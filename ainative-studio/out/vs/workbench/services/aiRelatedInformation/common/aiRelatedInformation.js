/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IAiRelatedInformationService = createDecorator('IAiRelatedInformationService');
export var RelatedInformationType;
(function (RelatedInformationType) {
    RelatedInformationType[RelatedInformationType["SymbolInformation"] = 1] = "SymbolInformation";
    RelatedInformationType[RelatedInformationType["CommandInformation"] = 2] = "CommandInformation";
    RelatedInformationType[RelatedInformationType["SearchInformation"] = 3] = "SearchInformation";
    RelatedInformationType[RelatedInformationType["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FpUmVsYXRlZEluZm9ybWF0aW9uL2NvbW1vbi9haVJlbGF0ZWRJbmZvcm1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUErQiw4QkFBOEIsQ0FBQyxDQUFDO0FBRTFILE1BQU0sQ0FBTixJQUFZLHNCQUtYO0FBTEQsV0FBWSxzQkFBc0I7SUFDakMsNkZBQXFCLENBQUE7SUFDckIsK0ZBQXNCLENBQUE7SUFDdEIsNkZBQXFCLENBQUE7SUFDckIsK0ZBQXNCLENBQUE7QUFDdkIsQ0FBQyxFQUxXLHNCQUFzQixLQUF0QixzQkFBc0IsUUFLakMifQ==