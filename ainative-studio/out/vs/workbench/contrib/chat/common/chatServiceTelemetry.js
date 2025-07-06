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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2VydmljZVRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxFQUF3QixNQUFNLGtCQUFrQixDQUFDO0FBd0d2RixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUNoQyxZQUNxQyxnQkFBbUM7UUFBbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUNwRSxDQUFDO0lBRUwsZ0JBQWdCLENBQUMsTUFBNEI7UUFDNUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUF3Qyx3QkFBd0IsRUFBRTtnQkFDakcsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUNoRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFO2dCQUM3QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87Z0JBQ3ZCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU07YUFDNUIsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBd0Msd0JBQXdCLEVBQUU7Z0JBQ2pHLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQy9FLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTzthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE0QywwQkFBMEIsRUFBRTtnQkFDdkcsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU87Z0JBQ2hDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTzthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUEwQyx5QkFBeUIsRUFBRTtnQkFDcEcsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU87Z0JBQ2hDLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVU7Z0JBQ3BDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsYUFBYSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWE7YUFDNUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBZ0QsaUNBQWlDLEVBQUU7Z0JBQ2xILFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsSUFBSSxFQUFFO2dCQUMxQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFO2dCQUM3QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87YUFDdkIsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBZ0QscUJBQXFCLEVBQUU7Z0JBQ3RHLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTzthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLE9BQWUsRUFBRSxPQUEyQixFQUFFLFlBQW9CO1FBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQW9FLHdCQUF3QixFQUFFO1lBQzdILE9BQU87WUFDUCxPQUFPO1lBQ1AsWUFBWTtTQUNaLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBdERZLG9CQUFvQjtJQUU5QixXQUFBLGlCQUFpQixDQUFBO0dBRlAsb0JBQW9CLENBc0RoQyJ9