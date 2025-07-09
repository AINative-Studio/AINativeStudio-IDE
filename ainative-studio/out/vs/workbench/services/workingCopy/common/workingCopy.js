/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var WorkingCopyCapabilities;
(function (WorkingCopyCapabilities) {
    /**
     * Signals no specific capability for the working copy.
     */
    WorkingCopyCapabilities[WorkingCopyCapabilities["None"] = 0] = "None";
    /**
     * Signals that the working copy requires
     * additional input when saving, e.g. an
     * associated path to save to.
     */
    WorkingCopyCapabilities[WorkingCopyCapabilities["Untitled"] = 2] = "Untitled";
    /**
     * The working copy will not indicate that
     * it is dirty and unsaved content will be
     * discarded without prompting if closed.
     */
    WorkingCopyCapabilities[WorkingCopyCapabilities["Scratchpad"] = 4] = "Scratchpad";
})(WorkingCopyCapabilities || (WorkingCopyCapabilities = {}));
/**
 * @deprecated it is important to provide a type identifier
 * for working copies to enable all capabilities.
 */
export const NO_TYPE_ID = '';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxNQUFNLENBQU4sSUFBa0IsdUJBb0JqQjtBQXBCRCxXQUFrQix1QkFBdUI7SUFFeEM7O09BRUc7SUFDSCxxRUFBUSxDQUFBO0lBRVI7Ozs7T0FJRztJQUNILDZFQUFpQixDQUFBO0lBRWpCOzs7O09BSUc7SUFDSCxpRkFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBcEJpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBb0J4QztBQTBDRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDIn0=