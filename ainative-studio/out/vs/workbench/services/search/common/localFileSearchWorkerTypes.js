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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoV29ya2VyVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL2xvY2FsRmlsZVNlYXJjaFdvcmtlclR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBK0NoRyxNQUFNLE9BQWdCLHlCQUF5QjthQUNoQyxpQkFBWSxHQUFHLDJCQUEyQixDQUFDO0lBQ2xELE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBOEI7UUFDdEQsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUE0Qix5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuRyxDQUFDO0lBQ00sTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFtQyxFQUFFLEdBQThCO1FBQzNGLFlBQVksQ0FBQyxVQUFVLENBQTRCLHlCQUF5QixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRyxDQUFDIn0=