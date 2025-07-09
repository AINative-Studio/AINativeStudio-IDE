/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["UnifiedChatView"] = "chat.unifiedChatView";
    ChatConfiguration["UseFileStorage"] = "chat.useFileStorage";
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
})(ChatConfiguration || (ChatConfiguration = {}));
export var ChatMode;
(function (ChatMode) {
    ChatMode["Ask"] = "ask";
    ChatMode["Edit"] = "edit";
    ChatMode["Agent"] = "agent";
})(ChatMode || (ChatMode = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatMode.Ask:
        case ChatMode.Edit:
        case ChatMode.Agent:
            return mode;
        default:
            return undefined;
    }
}
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    ChatAgentLocation["Panel"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    ChatAgentLocation["Editor"] = "editor";
    ChatAgentLocation["EditingSession"] = "editing-session";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Panel;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.Editor;
            case 'editing-session': return ChatAgentLocation.EditingSession;
        }
        return ChatAgentLocation.Panel;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBWSxpQkFNWDtBQU5ELFdBQVksaUJBQWlCO0lBQzVCLDZEQUF3QyxDQUFBO0lBQ3hDLDJEQUFzQyxDQUFBO0lBQ3RDLHdEQUFtQyxDQUFBO0lBQ25DLDBEQUFxQyxDQUFBO0lBQ3JDLDBFQUFxRCxDQUFBO0FBQ3RELENBQUMsRUFOVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBTTVCO0FBRUQsTUFBTSxDQUFOLElBQVksUUFJWDtBQUpELFdBQVksUUFBUTtJQUNuQix1QkFBVyxDQUFBO0lBQ1gseUJBQWEsQ0FBQTtJQUNiLDJCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUpXLFFBQVEsS0FBUixRQUFRLFFBSW5CO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQWE7SUFDN0MsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUNsQixLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDbkIsS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixPQUFPLElBQWdCLENBQUM7UUFDekI7WUFDQyxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0FBQ0YsQ0FBQztBQUlELE1BQU0sQ0FBTixJQUFZLGlCQU1YO0FBTkQsV0FBWSxpQkFBaUI7SUFDNUIsb0NBQWUsQ0FBQTtJQUNmLDBDQUFxQixDQUFBO0lBQ3JCLDBDQUFxQixDQUFBO0lBQ3JCLHNDQUFpQixDQUFBO0lBQ2pCLHVEQUFrQyxDQUFBO0FBQ25DLENBQUMsRUFOVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBTTVCO0FBRUQsV0FBaUIsaUJBQWlCO0lBQ2pDLFNBQWdCLE9BQU8sQ0FBQyxLQUEwQztRQUNqRSxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQztZQUM3QyxLQUFLLFVBQVUsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDO1lBQ25ELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7WUFDbkQsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUMvQyxLQUFLLGlCQUFpQixDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUM7UUFDakUsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBQ2hDLENBQUM7SUFUZSx5QkFBTyxVQVN0QixDQUFBO0FBQ0YsQ0FBQyxFQVhnQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBV2pDIn0=