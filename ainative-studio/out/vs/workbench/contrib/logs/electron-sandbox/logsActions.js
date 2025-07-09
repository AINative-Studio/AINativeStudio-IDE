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
import { Action } from '../../../../base/common/actions.js';
import * as nls from '../../../../nls.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
let OpenLogsFolderAction = class OpenLogsFolderAction extends Action {
    static { this.ID = 'workbench.action.openLogsFolder'; }
    static { this.TITLE = nls.localize2('openLogsFolder', "Open Logs Folder"); }
    constructor(id, label, environmentService, nativeHostService) {
        super(id, label);
        this.environmentService = environmentService;
        this.nativeHostService = nativeHostService;
    }
    run() {
        return this.nativeHostService.showItemInFolder(joinPath(this.environmentService.logsHome, 'main.log').with({ scheme: Schemas.file }).fsPath);
    }
};
OpenLogsFolderAction = __decorate([
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, INativeHostService)
], OpenLogsFolderAction);
export { OpenLogsFolderAction };
let OpenExtensionLogsFolderAction = class OpenExtensionLogsFolderAction extends Action {
    static { this.ID = 'workbench.action.openExtensionLogsFolder'; }
    static { this.TITLE = nls.localize2('openExtensionLogsFolder', "Open Extension Logs Folder"); }
    constructor(id, label, environmentSerice, fileService, nativeHostService) {
        super(id, label);
        this.environmentSerice = environmentSerice;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
    }
    async run() {
        const folderStat = await this.fileService.resolve(this.environmentSerice.extHostLogsPath);
        if (folderStat.children && folderStat.children[0]) {
            return this.nativeHostService.showItemInFolder(folderStat.children[0].resource.with({ scheme: Schemas.file }).fsPath);
        }
    }
};
OpenExtensionLogsFolderAction = __decorate([
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IFileService),
    __param(4, INativeHostService)
], OpenExtensionLogsFolderAction);
export { OpenExtensionLogsFolderAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9ncy9lbGVjdHJvbi1zYW5kYm94L2xvZ3NBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXRELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsTUFBTTthQUUvQixPQUFFLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO2FBQ3ZDLFVBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLEFBQXRELENBQXVEO0lBRTVFLFlBQVksRUFBVSxFQUFFLEtBQWEsRUFDaUIsa0JBQXNELEVBQ3RFLGlCQUFxQztRQUUxRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSG9DLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0M7UUFDdEUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUczRSxDQUFDO0lBRVEsR0FBRztRQUNYLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5SSxDQUFDOztBQWRXLG9CQUFvQjtJQU05QixXQUFBLGtDQUFrQyxDQUFBO0lBQ2xDLFdBQUEsa0JBQWtCLENBQUE7R0FQUixvQkFBb0IsQ0FlaEM7O0FBRU0sSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxNQUFNO2FBRXhDLE9BQUUsR0FBRywwQ0FBMEMsQUFBN0MsQ0FBOEM7YUFDaEQsVUFBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLENBQUMsQUFBekUsQ0FBMEU7SUFFL0YsWUFBWSxFQUFVLEVBQUUsS0FBYSxFQUNpQixpQkFBcUQsRUFDM0UsV0FBeUIsRUFDbkIsaUJBQXFDO1FBRTFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFKb0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQztRQUMzRSxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBRzNFLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMxRixJQUFJLFVBQVUsQ0FBQyxRQUFRLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2SCxDQUFDO0lBQ0YsQ0FBQzs7QUFsQlcsNkJBQTZCO0lBTXZDLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtCQUFrQixDQUFBO0dBUlIsNkJBQTZCLENBbUJ6QyJ9