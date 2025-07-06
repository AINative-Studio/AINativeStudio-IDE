/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Constants;
(function (Constants) {
    /**
     * Writing large amounts of data can be corrupted for some reason, after looking into this is
     * appears to be a race condition around writing to the FD which may be based on how powerful
     * the hardware is. The workaround for this is to space out when large amounts of data is being
     * written to the terminal. See https://github.com/microsoft/vscode/issues/38137
     */
    Constants[Constants["WriteMaxChunkSize"] = 50] = "WriteMaxChunkSize";
})(Constants || (Constants = {}));
/**
 * Splits incoming pty data into chunks to try prevent data corruption that could occur when pasting
 * large amounts of data.
 */
export function chunkInput(data) {
    const chunks = [];
    let nextChunkStartIndex = 0;
    for (let i = 0; i < data.length - 1; i++) {
        if (
        // If the max chunk size is reached
        i - nextChunkStartIndex + 1 >= 50 /* Constants.WriteMaxChunkSize */ ||
            // If the next character is ESC, send the pending data to avoid splitting the escape
            // sequence.
            data[i + 1] === '\x1b') {
            chunks.push(data.substring(nextChunkStartIndex, i + 1));
            nextChunkStartIndex = i + 1;
            // Skip the next character as the chunk would be a single character
            i++;
        }
    }
    // Push final chunk
    if (nextChunkStartIndex !== data.length) {
        chunks.push(data.substring(nextChunkStartIndex));
    }
    return chunks;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsUHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQW9FaEcsSUFBVyxTQVFWO0FBUkQsV0FBVyxTQUFTO0lBQ25COzs7OztPQUtHO0lBQ0gsb0VBQXNCLENBQUE7QUFDdkIsQ0FBQyxFQVJVLFNBQVMsS0FBVCxTQUFTLFFBUW5CO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFZO0lBQ3RDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQztJQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMxQztRQUNDLG1DQUFtQztRQUNuQyxDQUFDLEdBQUcsbUJBQW1CLEdBQUcsQ0FBQyx3Q0FBK0I7WUFDMUQsb0ZBQW9GO1lBQ3BGLFlBQVk7WUFDWixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLE1BQU0sRUFDckIsQ0FBQztZQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxtQkFBbUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLG1FQUFtRTtZQUNuRSxDQUFDLEVBQUUsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0lBQ0QsbUJBQW1CO0lBQ25CLElBQUksbUJBQW1CLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9