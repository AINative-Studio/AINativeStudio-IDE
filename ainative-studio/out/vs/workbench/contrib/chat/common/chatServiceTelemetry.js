/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ChatAgentVoteDirection, ChatCopyKind } from './chatService.js';
let ChatServiceTelemetry = class ChatServiceTelemetry {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
    }
    notifyUserAction(action) {
        if (action.action.kind === 'vote') {
            this.telemetryService.publicLog2('interactiveSessionVote', {
                direction: action.action.direction === ChatAgentVoteDirection.Up ? 'up' : 'down',
                agentId: action.agentId ?? '',
                command: action.command,
                reason: action.action.reason,
            });
        }
        else if (action.action.kind === 'copy') {
            this.telemetryService.publicLog2('interactiveSessionCopy', {
                copyKind: action.action.copyKind === ChatCopyKind.Action ? 'action' : 'toolbar',
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'insert') {
            this.telemetryService.publicLog2('interactiveSessionInsert', {
                newFile: !!action.action.newFile,
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'apply') {
            this.telemetryService.publicLog2('interactiveSessionApply', {
                newFile: !!action.action.newFile,
                codeMapper: action.action.codeMapper,
                agentId: action.agentId ?? '',
                command: action.command,
                editsProposed: !!action.action.editsProposed,
            });
        }
        else if (action.action.kind === 'runInTerminal') {
            this.telemetryService.publicLog2('interactiveSessionRunInTerminal', {
                languageId: action.action.languageId ?? '',
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'followUp') {
            this.telemetryService.publicLog2('chatFollowupClicked', {
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
    }
    retrievedFollowups(agentId, command, numFollowups) {
        this.telemetryService.publicLog2('chatFollowupsRetrieved', {
            agentId,
            command,
            numFollowups,
        });
    }
};
ChatServiceTelemetry = __decorate([
    __param(0, ITelemetryService)
], ChatServiceTelemetry);
export { ChatServiceTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlcnZpY2VUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBd0IsTUFBTSxrQkFBa0IsQ0FBQztBQXdHdkYsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFDaEMsWUFDcUMsZ0JBQW1DO1FBQW5DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7SUFDcEUsQ0FBQztJQUVMLGdCQUFnQixDQUFDLE1BQTRCO1FBQzVDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBd0Msd0JBQXdCLEVBQUU7Z0JBQ2pHLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDaEYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2dCQUN2QixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNO2FBQzVCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FB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