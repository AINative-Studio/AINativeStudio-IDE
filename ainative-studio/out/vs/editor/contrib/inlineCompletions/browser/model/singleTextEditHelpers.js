/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commonPrefixLength } from '../../../../../base/common/strings.js';
import { Range } from '../../../../common/core/range.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
export function singleTextRemoveCommonPrefix(edit, model, validModelRange) {
    const modelRange = validModelRange ? edit.range.intersectRanges(validModelRange) : edit.range;
    if (!modelRange) {
        return edit;
    }
    const normalizedText = edit.text.replaceAll('\r\n', '\n');
    const valueToReplace = model.getValueInRange(modelRange, 1 /* EndOfLinePreference.LF */);
    const commonPrefixLen = commonPrefixLength(valueToReplace, normalizedText);
    const start = TextLength.ofText(valueToReplace.substring(0, commonPrefixLen)).addToPosition(edit.range.getStartPosition());
    const text = normalizedText.substring(commonPrefixLen);
    const range = Range.fromPositions(start, edit.range.getEndPosition());
    return new SingleTextEdit(range, text);
}
export function singleTextEditAugments(edit, base) {
    // The augmented completion must replace the base range, but can replace even more
    return edit.text.startsWith(base.text) && rangeExtends(edit.range, base.range);
}
function rangeExtends(extendingRange, rangeToExtend) {
    return rangeToExtend.getStartPosition().equals(extendingRange.getStartPosition())
        && rangeToExtend.getEndPosition().isBeforeOrEqual(extendingRange.getEndPosition());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlVGV4dEVkaXRIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvc2luZ2xlVGV4dEVkaXRIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3JFLE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxJQUFvQixFQUFFLEtBQWlCLEVBQUUsZUFBdUI7SUFDNUcsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUM5RixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQztJQUNqRixNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDM0UsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUMzSCxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3ZELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUN0RSxPQUFPLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLElBQW9CLEVBQUUsSUFBb0I7SUFDaEYsa0ZBQWtGO0lBQ2xGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoRixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsY0FBcUIsRUFBRSxhQUFvQjtJQUNoRSxPQUFPLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztXQUM3RSxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLENBQUMifQ==