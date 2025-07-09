/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from './cursorColumns.js';
function _normalizeIndentationFromWhitespace(str, indentSize, insertSpaces) {
    let spacesCnt = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.charAt(i) === '\t') {
            spacesCnt = CursorColumns.nextIndentTabStop(spacesCnt, indentSize);
        }
        else {
            spacesCnt++;
        }
    }
    let result = '';
    if (!insertSpaces) {
        const tabsCnt = Math.floor(spacesCnt / indentSize);
        spacesCnt = spacesCnt % indentSize;
        for (let i = 0; i < tabsCnt; i++) {
            result += '\t';
        }
    }
    for (let i = 0; i < spacesCnt; i++) {
        result += ' ';
    }
    return result;
}
export function normalizeIndentation(str, indentSize, insertSpaces) {
    let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(str);
    if (firstNonWhitespaceIndex === -1) {
        firstNonWhitespaceIndex = str.length;
    }
    return _normalizeIndentationFromWhitespace(str.substring(0, firstNonWhitespaceIndex), indentSize, insertSpaces) + str.substring(firstNonWhitespaceIndex);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2luZGVudGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELFNBQVMsbUNBQW1DLENBQUMsR0FBVyxFQUFFLFVBQWtCLEVBQUUsWUFBcUI7SUFDbEcsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVCLFNBQVMsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxFQUFFLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNoQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDbkQsU0FBUyxHQUFHLFNBQVMsR0FBRyxVQUFVLENBQUM7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxJQUFJLENBQUM7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLEdBQUcsQ0FBQztJQUNmLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsR0FBVyxFQUFFLFVBQWtCLEVBQUUsWUFBcUI7SUFDMUYsSUFBSSx1QkFBdUIsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkUsSUFBSSx1QkFBdUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3BDLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDdEMsQ0FBQztJQUNELE9BQU8sbUNBQW1DLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzFKLENBQUMifQ==