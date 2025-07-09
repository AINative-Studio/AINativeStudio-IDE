/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getSpaceCnt(str, tabSize) {
    let spacesCnt = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.charAt(i) === '\t') {
            spacesCnt += tabSize;
        }
        else {
            spacesCnt++;
        }
    }
    return spacesCnt;
}
export function generateIndent(spacesCnt, tabSize, insertSpaces) {
    spacesCnt = spacesCnt < 0 ? 0 : spacesCnt;
    let result = '';
    if (!insertSpaces) {
        const tabsCnt = Math.floor(spacesCnt / tabSize);
        spacesCnt = spacesCnt % tabSize;
        for (let i = 0; i < tabsCnt; i++) {
            result += '\t';
        }
    }
    for (let i = 0; i < spacesCnt; i++) {
        result += ' ';
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5kZW50YXRpb24vY29tbW9uL2luZGVudFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sVUFBVSxXQUFXLENBQUMsR0FBVyxFQUFFLE9BQWU7SUFDdkQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWxCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVCLFNBQVMsSUFBSSxPQUFPLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLEVBQUUsQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsU0FBaUIsRUFBRSxPQUFlLEVBQUUsWUFBcUI7SUFDdkYsU0FBUyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBRTFDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNoQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDaEQsU0FBUyxHQUFHLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxJQUFJLENBQUM7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLEdBQUcsQ0FBQztJQUNmLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==