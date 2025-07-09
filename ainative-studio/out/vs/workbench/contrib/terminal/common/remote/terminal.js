/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';
export var RemoteTerminalChannelEvent;
(function (RemoteTerminalChannelEvent) {
    RemoteTerminalChannelEvent["OnPtyHostExitEvent"] = "$onPtyHostExitEvent";
    RemoteTerminalChannelEvent["OnPtyHostStartEvent"] = "$onPtyHostStartEvent";
    RemoteTerminalChannelEvent["OnPtyHostUnresponsiveEvent"] = "$onPtyHostUnresponsiveEvent";
    RemoteTerminalChannelEvent["OnPtyHostResponsiveEvent"] = "$onPtyHostResponsiveEvent";
    RemoteTerminalChannelEvent["OnPtyHostRequestResolveVariablesEvent"] = "$onPtyHostRequestResolveVariablesEvent";
    RemoteTerminalChannelEvent["OnProcessDataEvent"] = "$onProcessDataEvent";
    RemoteTerminalChannelEvent["OnProcessReadyEvent"] = "$onProcessReadyEvent";
    RemoteTerminalChannelEvent["OnProcessExitEvent"] = "$onProcessExitEvent";
    RemoteTerminalChannelEvent["OnProcessReplayEvent"] = "$onProcessReplayEvent";
    RemoteTerminalChannelEvent["OnProcessOrphanQuestion"] = "$onProcessOrphanQuestion";
    RemoteTerminalChannelEvent["OnExecuteCommand"] = "$onExecuteCommand";
    RemoteTerminalChannelEvent["OnDidRequestDetach"] = "$onDidRequestDetach";
    RemoteTerminalChannelEvent["OnDidChangeProperty"] = "$onDidChangeProperty";
})(RemoteTerminalChannelEvent || (RemoteTerminalChannelEvent = {}));
export var RemoteTerminalChannelRequest;
(function (RemoteTerminalChannelRequest) {
    RemoteTerminalChannelRequest["RestartPtyHost"] = "$restartPtyHost";
    RemoteTerminalChannelRequest["CreateProcess"] = "$createProcess";
    RemoteTerminalChannelRequest["AttachToProcess"] = "$attachToProcess";
    RemoteTerminalChannelRequest["DetachFromProcess"] = "$detachFromProcess";
    RemoteTerminalChannelRequest["ListProcesses"] = "$listProcesses";
    RemoteTerminalChannelRequest["GetLatency"] = "$getLatency";
    RemoteTerminalChannelRequest["GetPerformanceMarks"] = "$getPerformanceMarks";
    RemoteTerminalChannelRequest["OrphanQuestionReply"] = "$orphanQuestionReply";
    RemoteTerminalChannelRequest["AcceptPtyHostResolvedVariables"] = "$acceptPtyHostResolvedVariables";
    RemoteTerminalChannelRequest["Start"] = "$start";
    RemoteTerminalChannelRequest["Input"] = "$input";
    RemoteTerminalChannelRequest["AcknowledgeDataEvent"] = "$acknowledgeDataEvent";
    RemoteTerminalChannelRequest["Shutdown"] = "$shutdown";
    RemoteTerminalChannelRequest["Resize"] = "$resize";
    RemoteTerminalChannelRequest["ClearBuffer"] = "$clearBuffer";
    RemoteTerminalChannelRequest["GetInitialCwd"] = "$getInitialCwd";
    RemoteTerminalChannelRequest["GetCwd"] = "$getCwd";
    RemoteTerminalChannelRequest["ProcessBinary"] = "$processBinary";
    RemoteTerminalChannelRequest["SendCommandResult"] = "$sendCommandResult";
    RemoteTerminalChannelRequest["InstallAutoReply"] = "$installAutoReply";
    RemoteTerminalChannelRequest["UninstallAllAutoReplies"] = "$uninstallAllAutoReplies";
    RemoteTerminalChannelRequest["GetDefaultSystemShell"] = "$getDefaultSystemShell";
    RemoteTerminalChannelRequest["GetProfiles"] = "$getProfiles";
    RemoteTerminalChannelRequest["GetEnvironment"] = "$getEnvironment";
    RemoteTerminalChannelRequest["GetWslPath"] = "$getWslPath";
    RemoteTerminalChannelRequest["GetTerminalLayoutInfo"] = "$getTerminalLayoutInfo";
    RemoteTerminalChannelRequest["SetTerminalLayoutInfo"] = "$setTerminalLayoutInfo";
    RemoteTerminalChannelRequest["SerializeTerminalState"] = "$serializeTerminalState";
    RemoteTerminalChannelRequest["ReviveTerminalProcesses"] = "$reviveTerminalProcesses";
    RemoteTerminalChannelRequest["GetRevivedPtyNewId"] = "$getRevivedPtyNewId";
    RemoteTerminalChannelRequest["SetUnicodeVersion"] = "$setUnicodeVersion";
    RemoteTerminalChannelRequest["ReduceConnectionGraceTime"] = "$reduceConnectionGraceTime";
    RemoteTerminalChannelRequest["UpdateIcon"] = "$updateIcon";
    RemoteTerminalChannelRequest["UpdateTitle"] = "$updateTitle";
    RemoteTerminalChannelRequest["UpdateProperty"] = "$updateProperty";
    RemoteTerminalChannelRequest["RefreshProperty"] = "$refreshProperty";
    RemoteTerminalChannelRequest["RequestDetachInstance"] = "$requestDetachInstance";
    RemoteTerminalChannelRequest["AcceptDetachInstanceReply"] = "$acceptDetachInstanceReply";
    RemoteTerminalChannelRequest["AcceptDetachedInstance"] = "$acceptDetachedInstance";
    RemoteTerminalChannelRequest["FreePortKillProcess"] = "$freePortKillProcess";
})(RemoteTerminalChannelRequest || (RemoteTerminalChannelRequest = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3JlbW90ZS90ZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxnQkFBZ0IsQ0FBQztBQWlDN0QsTUFBTSxDQUFOLElBQWtCLDBCQWNqQjtBQWRELFdBQWtCLDBCQUEwQjtJQUMzQyx3RUFBMEMsQ0FBQTtJQUMxQywwRUFBNEMsQ0FBQTtJQUM1Qyx3RkFBMEQsQ0FBQTtJQUMxRCxvRkFBc0QsQ0FBQTtJQUN0RCw4R0FBZ0YsQ0FBQTtJQUNoRix3RUFBMEMsQ0FBQTtJQUMxQywwRUFBNEMsQ0FBQTtJQUM1Qyx3RUFBMEMsQ0FBQTtJQUMxQyw0RUFBOEMsQ0FBQTtJQUM5QyxrRkFBb0QsQ0FBQTtJQUNwRCxvRUFBc0MsQ0FBQTtJQUN0Qyx3RUFBMEMsQ0FBQTtJQUMxQywwRUFBNEMsQ0FBQTtBQUM3QyxDQUFDLEVBZGlCLDBCQUEwQixLQUExQiwwQkFBMEIsUUFjM0M7QUFFRCxNQUFNLENBQU4sSUFBa0IsNEJBeUNqQjtBQXpDRCxXQUFrQiw0QkFBNEI7SUFDN0Msa0VBQWtDLENBQUE7SUFDbEMsZ0VBQWdDLENBQUE7SUFDaEMsb0VBQW9DLENBQUE7SUFDcEMsd0VBQXdDLENBQUE7SUFDeEMsZ0VBQWdDLENBQUE7SUFDaEMsMERBQTBCLENBQUE7SUFDMUIsNEVBQTRDLENBQUE7SUFDNUMsNEVBQTRDLENBQUE7SUFDNUMsa0dBQWtFLENBQUE7SUFDbEUsZ0RBQWdCLENBQUE7SUFDaEIsZ0RBQWdCLENBQUE7SUFDaEIsOEVBQThDLENBQUE7SUFDOUMsc0RBQXNCLENBQUE7SUFDdEIsa0RBQWtCLENBQUE7SUFDbEIsNERBQTRCLENBQUE7SUFDNUIsZ0VBQWdDLENBQUE7SUFDaEMsa0RBQWtCLENBQUE7SUFDbEIsZ0VBQWdDLENBQUE7SUFDaEMsd0VBQXdDLENBQUE7SUFDeEMsc0VBQXNDLENBQUE7SUFDdEMsb0ZBQW9ELENBQUE7SUFDcEQsZ0ZBQWdELENBQUE7SUFDaEQsNERBQTRCLENBQUE7SUFDNUIsa0VBQWtDLENBQUE7SUFDbEMsMERBQTBCLENBQUE7SUFDMUIsZ0ZBQWdELENBQUE7SUFDaEQsZ0ZBQWdELENBQUE7SUFDaEQsa0ZBQWtELENBQUE7SUFDbEQsb0ZBQW9ELENBQUE7SUFDcEQsMEVBQTBDLENBQUE7SUFDMUMsd0VBQXdDLENBQUE7SUFDeEMsd0ZBQXdELENBQUE7SUFDeEQsMERBQTBCLENBQUE7SUFDMUIsNERBQTRCLENBQUE7SUFDNUIsa0VBQWtDLENBQUE7SUFDbEMsb0VBQW9DLENBQUE7SUFDcEMsZ0ZBQWdELENBQUE7SUFDaEQsd0ZBQXdELENBQUE7SUFDeEQsa0ZBQWtELENBQUE7SUFDbEQsNEVBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQXpDaUIsNEJBQTRCLEtBQTVCLDRCQUE0QixRQXlDN0MifQ==