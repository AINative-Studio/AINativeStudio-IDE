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
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
let WorkingCopyFileOperationParticipant = class WorkingCopyFileOperationParticipant extends Disposable {
    constructor(logService, configurationService) {
        super();
        this.logService = logService;
        this.configurationService = configurationService;
        this.participants = new LinkedList();
    }
    addFileOperationParticipant(participant) {
        const remove = this.participants.push(participant);
        return toDisposable(() => remove());
    }
    async participate(files, operation, undoInfo, token) {
        const timeout = this.configurationService.getValue('files.participants.timeout');
        if (typeof timeout !== 'number' || timeout <= 0) {
            return; // disabled
        }
        // For each participant
        for (const participant of this.participants) {
            try {
                await participant.participate(files, operation, undoInfo, timeout, token);
            }
            catch (err) {
                this.logService.warn(err);
            }
        }
    }
    dispose() {
        this.participants.clear();
        super.dispose();
    }
};
WorkingCopyFileOperationParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], WorkingCopyFileOperationParticipant);
export { WorkingCopyFileOperationParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlT3BlcmF0aW9uUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weUZpbGVPcGVyYXRpb25QYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFlLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUc3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFNUQsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxVQUFVO0lBSWxFLFlBQ2MsVUFBd0MsRUFDOUIsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBSHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDYix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSm5FLGlCQUFZLEdBQUcsSUFBSSxVQUFVLEVBQXdDLENBQUM7SUFPdkYsQ0FBQztJQUVELDJCQUEyQixDQUFDLFdBQWlEO1FBQzVFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5ELE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBeUIsRUFBRSxTQUF3QixFQUFFLFFBQWdELEVBQUUsS0FBd0I7UUFDaEosTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pGLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxPQUFPLENBQUMsV0FBVztRQUNwQixDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQztnQkFDSixNQUFNLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNFLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQXRDWSxtQ0FBbUM7SUFLN0MsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0dBTlgsbUNBQW1DLENBc0MvQyJ9