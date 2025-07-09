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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUF1QjdGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQztBQUNyRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxlQUFlLENBQWdDLDhCQUE4QixDQUFDLENBQUM7QUFDNUgsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBQ3ZHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQztBQUNwRyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUM7QUE0RDdHLE1BQU0sQ0FBTixJQUFrQixTQUtqQjtBQUxELFdBQWtCLFNBQVM7SUFDMUIseUNBQVEsQ0FBQTtJQUNSLDJDQUFTLENBQUE7SUFDVCxxQ0FBTSxDQUFBO0lBQ04seUNBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsU0FBUyxLQUFULFNBQVMsUUFLMUI7QUFxREQsTUFBTSxDQUFOLElBQWtCLHVCQUdqQjtBQUhELFdBQWtCLHVCQUF1QjtJQUN4QyxpRkFBVSxDQUFBO0lBQ1YsK0VBQVMsQ0FBQTtBQUNWLENBQUMsRUFIaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUd4QztBQW1GRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQWdELEVBQWtDLEVBQUUsQ0FBQyxPQUFRLENBQXVCLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQztBQXlJeEwsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7Q0FFekQ7QUF3QkQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7QUFnb0JqRCxNQUFNLENBQU4sSUFBa0Isc0JBRWpCO0FBRkQsV0FBa0Isc0JBQXNCO0lBQ3ZDLHVHQUE0QixDQUFBO0FBQzdCLENBQUMsRUFGaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUV2QztBQXlNRCxNQUFNLENBQU4sSUFBa0IsV0FJakI7QUFKRCxXQUFrQixXQUFXO0lBQzVCLG1EQUFXLENBQUE7SUFDWCxpREFBVSxDQUFBO0lBQ1YsaURBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIsV0FBVyxLQUFYLFdBQVcsUUFJNUI7QUFFRCxNQUFNLENBQU4sSUFBa0IscUJBRWpCO0FBRkQsV0FBa0IscUJBQXFCO0lBQ3RDLGdEQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFGaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUV0QyJ9