/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LanguageDetectionWorkerHost {
    static { this.CHANNEL_NAME = 'languageDetectionWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(LanguageDetectionWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(LanguageDetectionWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXIucHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhbmd1YWdlRGV0ZWN0aW9uL2Jyb3dzZXIvbGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXIucHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFnQiwyQkFBMkI7YUFDbEMsaUJBQVksR0FBRyw2QkFBNkIsQ0FBQztJQUNwRCxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQThCO1FBQ3RELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBOEIsMkJBQTJCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUNNLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBbUMsRUFBRSxHQUFnQztRQUM3RixZQUFZLENBQUMsVUFBVSxDQUE4QiwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckcsQ0FBQyJ9