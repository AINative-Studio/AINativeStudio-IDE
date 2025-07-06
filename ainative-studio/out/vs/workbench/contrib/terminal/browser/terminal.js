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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQXVCN0YsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFDO0FBQ3JGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsOEJBQThCLENBQUMsQ0FBQztBQUM1SCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUM7QUFDdkcsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBQ3BHLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQztBQTREN0csTUFBTSxDQUFOLElBQWtCLFNBS2pCO0FBTEQsV0FBa0IsU0FBUztJQUMxQix5Q0FBUSxDQUFBO0lBQ1IsMkNBQVMsQ0FBQTtJQUNULHFDQUFNLENBQUE7SUFDTix5Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxpQixTQUFTLEtBQVQsU0FBUyxRQUsxQjtBQXFERCxNQUFNLENBQU4sSUFBa0IsdUJBR2pCO0FBSEQsV0FBa0IsdUJBQXVCO0lBQ3hDLGlGQUFVLENBQUE7SUFDViwrRUFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUhpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBR3hDO0FBbUZELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsQ0FBZ0QsRUFBa0MsRUFBRSxDQUFDLE9BQVEsQ0FBdUIsQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDO0FBeUl4TCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtDQUV6RDtBQXdCRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztBQWdvQmpELE1BQU0sQ0FBTixJQUFrQixzQkFFakI7QUFGRCxXQUFrQixzQkFBc0I7SUFDdkMsdUdBQTRCLENBQUE7QUFDN0IsQ0FBQyxFQUZpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBRXZDO0FBeU1ELE1BQU0sQ0FBTixJQUFrQixXQUlqQjtBQUpELFdBQWtCLFdBQVc7SUFDNUIsbURBQVcsQ0FBQTtJQUNYLGlEQUFVLENBQUE7SUFDVixpREFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUppQixXQUFXLEtBQVgsV0FBVyxRQUk1QjtBQUVELE1BQU0sQ0FBTixJQUFrQixxQkFFakI7QUFGRCxXQUFrQixxQkFBcUI7SUFDdEMsZ0RBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQUZpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBRXRDIn0=