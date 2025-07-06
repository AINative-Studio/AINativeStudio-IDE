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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBb0VoRyxJQUFXLFNBUVY7QUFSRCxXQUFXLFNBQVM7SUFDbkI7Ozs7O09BS0c7SUFDSCxvRUFBc0IsQ0FBQTtBQUN2QixDQUFDLEVBUlUsU0FBUyxLQUFULFNBQVMsUUFRbkI7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFDLElBQVk7SUFDdEMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBQzVCLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFDO1FBQ0MsbUNBQW1DO1FBQ25DLENBQUMsR0FBRyxtQkFBbUIsR0FBRyxDQUFDLHdDQUErQjtZQUMxRCxvRkFBb0Y7WUFDcEYsWUFBWTtZQUNaLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssTUFBTSxFQUNyQixDQUFDO1lBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELG1CQUFtQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUIsbUVBQW1FO1lBQ25FLENBQUMsRUFBRSxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFDRCxtQkFBbUI7SUFDbkIsSUFBSSxtQkFBbUIsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIn0=