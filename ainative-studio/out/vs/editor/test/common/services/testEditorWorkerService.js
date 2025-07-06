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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEVkaXRvcldvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy90ZXN0RWRpdG9yV29ya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxNQUFNLE9BQU8sdUJBQXVCO0lBSW5DLDJCQUEyQixDQUFDLEdBQVEsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEUsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEdBQVEsSUFBdUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxDQUFDLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxFQUFFLDJCQUEyQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvTSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQWEsRUFBRSxRQUFhLEVBQUUsT0FBcUMsRUFBRSxTQUE0QixJQUFtQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEssbUJBQW1CLENBQUMsUUFBYSxFQUFFLFFBQWEsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDNUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQWEsRUFBRSxRQUFhLEVBQUUsb0JBQTZCLElBQStCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMvSCxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBYSxFQUFFLEtBQW9DLElBQXFDLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN6SSxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBYSxFQUFFLEtBQW9DLElBQXFDLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMxSSxvQkFBb0IsQ0FBQyxRQUFhLElBQWEsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzlELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFhLEVBQUUsS0FBYSxJQUFrRCxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEgsbUJBQW1CLENBQUMsUUFBYSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3RCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBYSxFQUFFLEtBQWEsRUFBRSxFQUFXLElBQWtELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBUSxJQUE4QixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0UsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEdBQVEsSUFBeUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2xHIn0=