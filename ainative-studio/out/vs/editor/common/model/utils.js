/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Returns:
 *  - -1 => the line consists of whitespace
 *  - otherwise => the indent level is returned value
 */
export function computeIndentLevel(line, tabSize) {
    let indent = 0;
    let i = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            indent++;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            indent = indent - indent % tabSize + tabSize;
        }
        else {
            break;
        }
        i++;
    }
    if (i === len) {
        return -1; // line only consists of whitespace
    }
    return indent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRzs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVksRUFBRSxPQUFlO0lBQy9ELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFeEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxJQUFJLE1BQU0sNEJBQW1CLEVBQUUsQ0FBQztZQUMvQixNQUFNLEVBQUUsQ0FBQztRQUNWLENBQUM7YUFBTSxJQUFJLE1BQU0seUJBQWlCLEVBQUUsQ0FBQztZQUNwQyxNQUFNLEdBQUcsTUFBTSxHQUFHLE1BQU0sR0FBRyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTTtRQUNQLENBQUM7UUFDRCxDQUFDLEVBQUUsQ0FBQztJQUNMLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7SUFDL0MsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9