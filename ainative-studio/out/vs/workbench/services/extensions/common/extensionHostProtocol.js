/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
export var UIKind;
(function (UIKind) {
    UIKind[UIKind["Desktop"] = 1] = "Desktop";
    UIKind[UIKind["Web"] = 2] = "Web";
})(UIKind || (UIKind = {}));
export var ExtensionHostExitCode;
(function (ExtensionHostExitCode) {
    // nodejs uses codes 1-13 and exit codes >128 are signal exits
    ExtensionHostExitCode[ExtensionHostExitCode["VersionMismatch"] = 55] = "VersionMismatch";
    ExtensionHostExitCode[ExtensionHostExitCode["UnexpectedError"] = 81] = "UnexpectedError";
})(ExtensionHostExitCode || (ExtensionHostExitCode = {}));
export var MessageType;
(function (MessageType) {
    MessageType[MessageType["Initialized"] = 0] = "Initialized";
    MessageType[MessageType["Ready"] = 1] = "Ready";
    MessageType[MessageType["Terminate"] = 2] = "Terminate";
})(MessageType || (MessageType = {}));
export function createMessageOfType(type) {
    const result = VSBuffer.alloc(1);
    switch (type) {
        case 0 /* MessageType.Initialized */:
            result.writeUInt8(1, 0);
            break;
        case 1 /* MessageType.Ready */:
            result.writeUInt8(2, 0);
            break;
        case 2 /* MessageType.Terminate */:
            result.writeUInt8(3, 0);
            break;
    }
    return result;
}
export function isMessageOfType(message, type) {
    if (message.byteLength !== 1) {
        return false;
    }
    switch (message.readUInt8(0)) {
        case 1: return type === 0 /* MessageType.Initialized */;
        case 2: return type === 1 /* MessageType.Ready */;
        case 3: return type === 2 /* MessageType.Terminate */;
        default: return false;
    }
}
export var NativeLogMarkers;
(function (NativeLogMarkers) {
    NativeLogMarkers["Start"] = "START_NATIVE_LOG";
    NativeLogMarkers["End"] = "END_NATIVE_LOG";
})(NativeLogMarkers || (NativeLogMarkers = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25Ib3N0UHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBcUY3RCxNQUFNLENBQU4sSUFBWSxNQUdYO0FBSEQsV0FBWSxNQUFNO0lBQ2pCLHlDQUFXLENBQUE7SUFDWCxpQ0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhXLE1BQU0sS0FBTixNQUFNLFFBR2pCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyw4REFBOEQ7SUFDOUQsd0ZBQW9CLENBQUE7SUFDcEIsd0ZBQW9CLENBQUE7QUFDckIsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBa0JELE1BQU0sQ0FBTixJQUFrQixXQUlqQjtBQUpELFdBQWtCLFdBQVc7SUFDNUIsMkRBQVcsQ0FBQTtJQUNYLCtDQUFLLENBQUE7SUFDTCx1REFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUppQixXQUFXLEtBQVgsV0FBVyxRQUk1QjtBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxJQUFpQjtJQUNwRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWpDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZDtZQUE4QixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUFDLE1BQU07UUFDN0Q7WUFBd0IsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQ3ZEO1lBQTRCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTTtJQUM1RCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxPQUFpQixFQUFFLElBQWlCO0lBQ25FLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM5QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxRQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM5QixLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxvQ0FBNEIsQ0FBQztRQUNoRCxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSw4QkFBc0IsQ0FBQztRQUMxQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxrQ0FBMEIsQ0FBQztRQUM5QyxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQztJQUN2QixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFHakI7QUFIRCxXQUFrQixnQkFBZ0I7SUFDakMsOENBQTBCLENBQUE7SUFDMUIsMENBQXNCLENBQUE7QUFDdkIsQ0FBQyxFQUhpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBR2pDIn0=