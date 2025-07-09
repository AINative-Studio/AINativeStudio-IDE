/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Formats a message from the product to be written to the terminal.
 */
export function formatMessageForTerminal(message, options = {}) {
    let result = '';
    if (!options.excludeLeadingNewLine) {
        result += '\r\n';
    }
    result += '\x1b[0m\x1b[7m * ';
    if (options.loudFormatting) {
        result += '\x1b[0;104m';
    }
    else {
        result += '\x1b[0m';
    }
    result += ` ${message} \x1b[0m\n\r`;
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFN0cmluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFjaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsT0FBZSxFQUFFLFVBQXlDLEVBQUU7SUFDcEcsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNwQyxNQUFNLElBQUksTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxNQUFNLElBQUksbUJBQW1CLENBQUM7SUFDOUIsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDNUIsTUFBTSxJQUFJLGFBQWEsQ0FBQztJQUN6QixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sSUFBSSxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUNELE1BQU0sSUFBSSxJQUFJLE9BQU8sY0FBYyxDQUFDO0lBQ3BDLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9