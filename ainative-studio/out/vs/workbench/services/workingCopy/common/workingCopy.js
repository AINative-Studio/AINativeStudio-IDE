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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsTUFBTSxDQUFOLElBQWtCLHVCQW9CakI7QUFwQkQsV0FBa0IsdUJBQXVCO0lBRXhDOztPQUVHO0lBQ0gscUVBQVEsQ0FBQTtJQUVSOzs7O09BSUc7SUFDSCw2RUFBaUIsQ0FBQTtJQUVqQjs7OztPQUlHO0lBQ0gsaUZBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQXBCaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQW9CeEM7QUEwQ0Q7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyJ9