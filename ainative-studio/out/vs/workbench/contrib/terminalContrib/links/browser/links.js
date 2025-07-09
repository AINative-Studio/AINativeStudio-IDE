/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const ITerminalLinkProviderService = createDecorator('terminalLinkProviderService');
export var TerminalBuiltinLinkType;
(function (TerminalBuiltinLinkType) {
    /**
     * The link is validated to be a file on the file system and will open an editor.
     */
    TerminalBuiltinLinkType["LocalFile"] = "LocalFile";
    /**
     * The link is validated to be a folder on the file system and is outside the workspace. It will
     * reveal the folder within the explorer.
     */
    TerminalBuiltinLinkType["LocalFolderOutsideWorkspace"] = "LocalFolderOutsideWorkspace";
    /**
     * The link is validated to be a folder on the file system and is within the workspace and will
     * reveal the folder within the explorer.
     */
    TerminalBuiltinLinkType["LocalFolderInWorkspace"] = "LocalFolderInWorkspace";
    /**
     * A low confidence link which will search for the file in the workspace. If there is a single
     * match, it will open the file; otherwise, it will present the matches in a quick pick.
     */
    TerminalBuiltinLinkType["Search"] = "Search";
    /**
     * A link whose text is a valid URI.
     */
    TerminalBuiltinLinkType["Url"] = "Url";
})(TerminalBuiltinLinkType || (TerminalBuiltinLinkType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvbGlua3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBVWhHLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FBK0IsNkJBQTZCLENBQUMsQ0FBQztBQXNHekgsTUFBTSxDQUFOLElBQWtCLHVCQTRCakI7QUE1QkQsV0FBa0IsdUJBQXVCO0lBQ3hDOztPQUVHO0lBQ0gsa0RBQXVCLENBQUE7SUFFdkI7OztPQUdHO0lBQ0gsc0ZBQTJELENBQUE7SUFFM0Q7OztPQUdHO0lBQ0gsNEVBQWlELENBQUE7SUFFakQ7OztPQUdHO0lBQ0gsNENBQWlCLENBQUE7SUFFakI7O09BRUc7SUFDSCxzQ0FBVyxDQUFBO0FBQ1osQ0FBQyxFQTVCaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQTRCeEMifQ==