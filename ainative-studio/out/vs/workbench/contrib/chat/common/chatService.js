/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export function isIDocumentContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'uri' in obj && obj.uri instanceof URI &&
        'version' in obj && typeof obj.version === 'number' &&
        'ranges' in obj && Array.isArray(obj.ranges) && obj.ranges.every(Range.isIRange));
}
export function isIUsedContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'documents' in obj &&
        Array.isArray(obj.documents) &&
        obj.documents.every(isIDocumentContext));
}
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatAgentVoteDirection;
(function (ChatAgentVoteDirection) {
    ChatAgentVoteDirection[ChatAgentVoteDirection["Down"] = 0] = "Down";
    ChatAgentVoteDirection[ChatAgentVoteDirection["Up"] = 1] = "Up";
})(ChatAgentVoteDirection || (ChatAgentVoteDirection = {}));
export var ChatAgentVoteDownReason;
(function (ChatAgentVoteDownReason) {
    ChatAgentVoteDownReason["IncorrectCode"] = "incorrectCode";
    ChatAgentVoteDownReason["DidNotFollowInstructions"] = "didNotFollowInstructions";
    ChatAgentVoteDownReason["IncompleteCode"] = "incompleteCode";
    ChatAgentVoteDownReason["MissingContext"] = "missingContext";
    ChatAgentVoteDownReason["PoorlyWrittenOrFormatted"] = "poorlyWrittenOrFormatted";
    ChatAgentVoteDownReason["RefusedAValidRequest"] = "refusedAValidRequest";
    ChatAgentVoteDownReason["OffensiveOrUnsafe"] = "offensiveOrUnsafe";
    ChatAgentVoteDownReason["Other"] = "other";
    ChatAgentVoteDownReason["WillReportIssue"] = "willReportIssue";
})(ChatAgentVoteDownReason || (ChatAgentVoteDownReason = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    // Keyboard shortcut or context menu
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export const IChatService = createDecorator('IChatService');
export const KEYWORD_ACTIVIATION_SETTING_ID = 'accessibility.voice.keywordActivation';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUl4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFnQjdGLE1BQU0sQ0FBTixJQUFZLGNBSVg7QUFKRCxXQUFZLGNBQWM7SUFDekIsbURBQVEsQ0FBQTtJQUNSLHlEQUFXLENBQUE7SUFDWCxxREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUpXLGNBQWMsS0FBZCxjQUFjLFFBSXpCO0FBd0JELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFZO0lBQzlDLE9BQU8sQ0FDTixDQUFDLENBQUMsR0FBRztRQUNMLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsS0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxZQUFZLEdBQUc7UUFDdEMsU0FBUyxJQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsQ0FBQyxPQUFPLEtBQUssUUFBUTtRQUNuRCxRQUFRLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDaEYsQ0FBQztBQUNILENBQUM7QUFPRCxNQUFNLFVBQVUsY0FBYyxDQUFDLEdBQVk7SUFDMUMsT0FBTyxDQUNOLENBQUMsQ0FBQyxHQUFHO1FBQ0wsT0FBTyxHQUFHLEtBQUssUUFBUTtRQUN2QixXQUFXLElBQUksR0FBRztRQUNsQixLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7UUFDNUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FDdkMsQ0FBQztBQUNILENBQUM7QUFPRCxNQUFNLENBQU4sSUFBWSxtQ0FJWDtBQUpELFdBQVksbUNBQW1DO0lBQzlDLHFHQUFZLENBQUE7SUFDWixtR0FBVyxDQUFBO0lBQ1gsbUdBQVcsQ0FBQTtBQUNaLENBQUMsRUFKVyxtQ0FBbUMsS0FBbkMsbUNBQW1DLFFBSTlDO0FBc01ELE1BQU0sQ0FBTixJQUFZLHNCQUdYO0FBSEQsV0FBWSxzQkFBc0I7SUFDakMsbUVBQVEsQ0FBQTtJQUNSLCtEQUFNLENBQUE7QUFDUCxDQUFDLEVBSFcsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUdqQztBQUVELE1BQU0sQ0FBTixJQUFZLHVCQVVYO0FBVkQsV0FBWSx1QkFBdUI7SUFDbEMsMERBQStCLENBQUE7SUFDL0IsZ0ZBQXFELENBQUE7SUFDckQsNERBQWlDLENBQUE7SUFDakMsNERBQWlDLENBQUE7SUFDakMsZ0ZBQXFELENBQUE7SUFDckQsd0VBQTZDLENBQUE7SUFDN0Msa0VBQXVDLENBQUE7SUFDdkMsMENBQWUsQ0FBQTtJQUNmLDhEQUFtQyxDQUFBO0FBQ3BDLENBQUMsRUFWVyx1QkFBdUIsS0FBdkIsdUJBQXVCLFFBVWxDO0FBUUQsTUFBTSxDQUFOLElBQVksWUFJWDtBQUpELFdBQVksWUFBWTtJQUN2QixvQ0FBb0M7SUFDcEMsbURBQVUsQ0FBQTtJQUNWLHFEQUFXLENBQUE7QUFDWixDQUFDLEVBSlcsWUFBWSxLQUFaLFlBQVksUUFJdkI7QUFxS0QsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBZSxjQUFjLENBQUMsQ0FBQztBQTRDMUUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsdUNBQXVDLENBQUMifQ==