/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TextMateWorkerHost {
    static { this.CHANNEL_NAME = 'textMateWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(TextMateWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(TextMateWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJIb3N0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL2JhY2tncm91bmRUb2tlbml6YXRpb24vd29ya2VyL3RleHRNYXRlV29ya2VySG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQWdCLGtCQUFrQjthQUN6QixpQkFBWSxHQUFHLG9CQUFvQixDQUFDO0lBQzNDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBOEI7UUFDdEQsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFxQixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQ00sTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFtQyxFQUFFLEdBQXVCO1FBQ3BGLFlBQVksQ0FBQyxVQUFVLENBQXFCLGtCQUFrQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNuRixDQUFDIn0=