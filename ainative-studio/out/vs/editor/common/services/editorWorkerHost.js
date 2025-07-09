/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class EditorWorkerHost {
    static { this.CHANNEL_NAME = 'editorWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(EditorWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(EditorWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV29ya2VySG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2VkaXRvcldvcmtlckhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFnQixnQkFBZ0I7YUFDdkIsaUJBQVksR0FBRyxrQkFBa0IsQ0FBQztJQUN6QyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQThCO1FBQ3RELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBbUIsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUNNLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBbUMsRUFBRSxHQUFxQjtRQUNsRixZQUFZLENBQUMsVUFBVSxDQUFtQixnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0UsQ0FBQyJ9