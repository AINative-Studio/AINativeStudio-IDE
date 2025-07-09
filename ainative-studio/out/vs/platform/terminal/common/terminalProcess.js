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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFvRWhHLElBQVcsU0FRVjtBQVJELFdBQVcsU0FBUztJQUNuQjs7Ozs7T0FLRztJQUNILG9FQUFzQixDQUFBO0FBQ3ZCLENBQUMsRUFSVSxTQUFTLEtBQVQsU0FBUyxRQVFuQjtBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBWTtJQUN0QyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDNUIsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7SUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUM7UUFDQyxtQ0FBbUM7UUFDbkMsQ0FBQyxHQUFHLG1CQUFtQixHQUFHLENBQUMsd0NBQStCO1lBQzFELG9GQUFvRjtZQUNwRixZQUFZO1lBQ1osSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxNQUFNLEVBQ3JCLENBQUM7WUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QixtRUFBbUU7WUFDbkUsQ0FBQyxFQUFFLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQztJQUNELG1CQUFtQjtJQUNuQixJQUFJLG1CQUFtQixLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==