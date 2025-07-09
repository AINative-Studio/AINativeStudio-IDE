/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LocalFileSearchWorkerHost {
    static { this.CHANNEL_NAME = 'localFileSearchWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(LocalFileSearchWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(LocalFileSearchWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoV29ya2VyVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vbG9jYWxGaWxlU2VhcmNoV29ya2VyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUErQ2hHLE1BQU0sT0FBZ0IseUJBQXlCO2FBQ2hDLGlCQUFZLEdBQUcsMkJBQTJCLENBQUM7SUFDbEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUE4QjtRQUN0RCxPQUFPLFlBQVksQ0FBQyxVQUFVLENBQTRCLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFDTSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQW1DLEVBQUUsR0FBOEI7UUFDM0YsWUFBWSxDQUFDLFVBQVUsQ0FBNEIseUJBQXlCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pHLENBQUMifQ==