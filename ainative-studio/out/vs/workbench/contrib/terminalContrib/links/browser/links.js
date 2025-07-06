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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL2xpbmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQVVoRyxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQStCLDZCQUE2QixDQUFDLENBQUM7QUFzR3pILE1BQU0sQ0FBTixJQUFrQix1QkE0QmpCO0FBNUJELFdBQWtCLHVCQUF1QjtJQUN4Qzs7T0FFRztJQUNILGtEQUF1QixDQUFBO0lBRXZCOzs7T0FHRztJQUNILHNGQUEyRCxDQUFBO0lBRTNEOzs7T0FHRztJQUNILDRFQUFpRCxDQUFBO0lBRWpEOzs7T0FHRztJQUNILDRDQUFpQixDQUFBO0lBRWpCOztPQUVHO0lBQ0gsc0NBQVcsQ0FBQTtBQUNaLENBQUMsRUE1QmlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUE0QnhDIn0=