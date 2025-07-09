/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestEditorWorkerService {
    canComputeUnicodeHighlights(uri) { return false; }
    async computedUnicodeHighlights(uri) { return { ranges: [], hasMore: false, ambiguousCharacterCount: 0, invisibleCharacterCount: 0, nonBasicAsciiCharacterCount: 0 }; }
    async computeDiff(original, modified, options, algorithm) { return null; }
    canComputeDirtyDiff(original, modified) { return false; }
    async computeDirtyDiff(original, modified, ignoreTrimWhitespace) { return null; }
    async computeMoreMinimalEdits(resource, edits) { return undefined; }
    async computeHumanReadableDiff(resource, edits) { return undefined; }
    canComputeWordRanges(resource) { return false; }
    async computeWordRanges(resource, range) { return null; }
    canNavigateValueSet(resource) { return false; }
    async navigateValueSet(resource, range, up) { return null; }
    async findSectionHeaders(uri) { return []; }
    async computeDefaultDocumentColors(uri) { return null; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEVkaXRvcldvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3Rlc3RFZGl0b3JXb3JrZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE1BQU0sT0FBTyx1QkFBdUI7SUFJbkMsMkJBQTJCLENBQUMsR0FBUSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUMseUJBQXlCLENBQUMsR0FBUSxJQUF1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUMsRUFBRSx1QkFBdUIsRUFBRSxDQUFDLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9NLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBYSxFQUFFLFFBQWEsRUFBRSxPQUFxQyxFQUFFLFNBQTRCLElBQW1DLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwSyxtQkFBbUIsQ0FBQyxRQUFhLEVBQUUsUUFBYSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM1RSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBYSxFQUFFLFFBQWEsRUFBRSxvQkFBNkIsSUFBK0IsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9ILEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUFhLEVBQUUsS0FBb0MsSUFBcUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3pJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxRQUFhLEVBQUUsS0FBb0MsSUFBcUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzFJLG9CQUFvQixDQUFDLFFBQWEsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDOUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQWEsRUFBRSxLQUFhLElBQWtELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwSCxtQkFBbUIsQ0FBQyxRQUFhLElBQWEsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzdELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFhLEVBQUUsS0FBYSxFQUFFLEVBQVcsSUFBa0QsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2hJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRLElBQThCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRSxLQUFLLENBQUMsNEJBQTRCLENBQUMsR0FBUSxJQUF5QyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDbEcifQ==