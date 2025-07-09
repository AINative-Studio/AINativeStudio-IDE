/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RemoteStorageService } from '../../../../platform/storage/common/storageService.js';
export class NativeWorkbenchStorageService extends RemoteStorageService {
    constructor(workspace, userDataProfileService, userDataProfilesService, mainProcessService, environmentService) {
        super(workspace, { currentProfile: userDataProfileService.currentProfile, defaultProfile: userDataProfilesService.defaultProfile }, mainProcessService, environmentService);
        this.userDataProfileService = userDataProfileService;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => e.join(this.switchToProfile(e.profile))));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N0b3JhZ2UvZWxlY3Ryb24tc2FuZGJveC9zdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUs3RixNQUFNLE9BQU8sNkJBQThCLFNBQVEsb0JBQW9CO0lBRXRFLFlBQ0MsU0FBOEMsRUFDN0Isc0JBQStDLEVBQ2hFLHVCQUFpRCxFQUNqRCxrQkFBdUMsRUFDdkMsa0JBQXVDO1FBRXZDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxjQUFjLEVBQUUsc0JBQXNCLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBTDNKLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFPaEUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckgsQ0FBQztDQUNEIn0=