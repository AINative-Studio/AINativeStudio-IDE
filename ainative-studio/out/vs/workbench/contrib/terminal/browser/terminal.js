/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ITerminalService = createDecorator('terminalService');
export const ITerminalConfigurationService = createDecorator('terminalConfigurationService');
export const ITerminalEditorService = createDecorator('terminalEditorService');
export const ITerminalGroupService = createDecorator('terminalGroupService');
export const ITerminalInstanceService = createDecorator('terminalInstanceService');
export var Direction;
(function (Direction) {
    Direction[Direction["Left"] = 0] = "Left";
    Direction[Direction["Right"] = 1] = "Right";
    Direction[Direction["Up"] = 2] = "Up";
    Direction[Direction["Down"] = 3] = "Down";
})(Direction || (Direction = {}));
export var TerminalConnectionState;
(function (TerminalConnectionState) {
    TerminalConnectionState[TerminalConnectionState["Connecting"] = 0] = "Connecting";
    TerminalConnectionState[TerminalConnectionState["Connected"] = 1] = "Connected";
})(TerminalConnectionState || (TerminalConnectionState = {}));
export const isDetachedTerminalInstance = (t) => typeof t.instanceId !== 'number';
export class TerminalLinkQuickPickEvent extends MouseEvent {
}
export const terminalEditorId = 'terminalEditor';
export var XtermTerminalConstants;
(function (XtermTerminalConstants) {
    XtermTerminalConstants[XtermTerminalConstants["SearchHighlightLimit"] = 20000] = "SearchHighlightLimit";
})(XtermTerminalConstants || (XtermTerminalConstants = {}));
export var LinuxDistro;
(function (LinuxDistro) {
    LinuxDistro[LinuxDistro["Unknown"] = 1] = "Unknown";
    LinuxDistro[LinuxDistro["Fedora"] = 2] = "Fedora";
    LinuxDistro[LinuxDistro["Ubuntu"] = 3] = "Ubuntu";
})(LinuxDistro || (LinuxDistro = {}));
export var TerminalDataTransfers;
(function (TerminalDataTransfers) {
    TerminalDataTransfers["Terminals"] = "Terminals";
})(TerminalDataTransfers || (TerminalDataTransfers = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBdUI3RixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGlCQUFpQixDQUFDLENBQUM7QUFDckYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUFnQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzVILE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsdUJBQXVCLENBQUMsQ0FBQztBQUN2RyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUM7QUFDcEcsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFDO0FBNEQ3RyxNQUFNLENBQU4sSUFBa0IsU0FLakI7QUFMRCxXQUFrQixTQUFTO0lBQzFCLHlDQUFRLENBQUE7SUFDUiwyQ0FBUyxDQUFBO0lBQ1QscUNBQU0sQ0FBQTtJQUNOLHlDQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLFNBQVMsS0FBVCxTQUFTLFFBSzFCO0FBcURELE1BQU0sQ0FBTixJQUFrQix1QkFHakI7QUFIRCxXQUFrQix1QkFBdUI7SUFDeEMsaUZBQVUsQ0FBQTtJQUNWLCtFQUFTLENBQUE7QUFDVixDQUFDLEVBSGlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFHeEM7QUFtRkQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxDQUFnRCxFQUFrQyxFQUFFLENBQUMsT0FBUSxDQUF1QixDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUM7QUF5SXhMLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0NBRXpEO0FBd0JELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0FBZ29CakQsTUFBTSxDQUFOLElBQWtCLHNCQUVqQjtBQUZELFdBQWtCLHNCQUFzQjtJQUN2Qyx1R0FBNEIsQ0FBQTtBQUM3QixDQUFDLEVBRmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFFdkM7QUF5TUQsTUFBTSxDQUFOLElBQWtCLFdBSWpCO0FBSkQsV0FBa0IsV0FBVztJQUM1QixtREFBVyxDQUFBO0lBQ1gsaURBQVUsQ0FBQTtJQUNWLGlEQUFVLENBQUE7QUFDWCxDQUFDLEVBSmlCLFdBQVcsS0FBWCxXQUFXLFFBSTVCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUVqQjtBQUZELFdBQWtCLHFCQUFxQjtJQUN0QyxnREFBdUIsQ0FBQTtBQUN4QixDQUFDLEVBRmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFFdEMifQ==