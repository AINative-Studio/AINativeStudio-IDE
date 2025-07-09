/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * The Electron `Protocol` leverages Electron style IPC communication (`ipcRenderer`, `ipcMain`)
 * for the implementation of the `IMessagePassingProtocol`. That style of API requires a channel
 * name for sending data.
 */
export class Protocol {
    constructor(sender, onMessage) {
        this.sender = sender;
        this.onMessage = onMessage;
    }
    send(message) {
        try {
            this.sender.send('vscode:message', message.buffer);
        }
        catch (e) {
            // systems are going down
        }
    }
    disconnect() {
        this.sender.send('vscode:disconnect', null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2NvbW1vbi9pcGMuZWxlY3Ryb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEc7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBRXBCLFlBQW9CLE1BQWMsRUFBVyxTQUEwQjtRQUFuRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVcsY0FBUyxHQUFULFNBQVMsQ0FBaUI7SUFBSSxDQUFDO0lBRTVFLElBQUksQ0FBQyxPQUFpQjtRQUNyQixJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUI7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsQ0FBQztDQUNEIn0=