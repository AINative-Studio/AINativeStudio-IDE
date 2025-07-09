"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function () {
    const { ipcRenderer, webFrame, contextBridge } = require('electron');
    function validateIPC(channel) {
        if (!channel || !channel.startsWith('vscode:')) {
            throw new Error(`Unsupported event IPC channel '${channel}'`);
        }
        return true;
    }
    const globals = {
        /**
         * A minimal set of methods exposed from Electron's `ipcRenderer`
         * to support communication to main process.
         */
        ipcRenderer: {
            send(channel, ...args) {
                if (validateIPC(channel)) {
                    ipcRenderer.send(channel, ...args);
                }
            },
            invoke(channel, ...args) {
                validateIPC(channel);
                return ipcRenderer.invoke(channel, ...args);
            }
        },
        /**
         * Support for subset of methods of Electron's `webFrame` type.
         */
        webFrame: {
            setZoomLevel(level) {
                if (typeof level === 'number') {
                    webFrame.setZoomLevel(level);
                }
            }
        }
    };
    try {
        contextBridge.exposeInMainWorld('vscode', globals);
    }
    catch (error) {
        console.error(error);
    }
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC1hdXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9zYW5kYm94L2VsZWN0cm9uLXNhbmRib3gvcHJlbG9hZC1hdXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLENBQUM7SUFFQSxNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFckUsU0FBUyxXQUFXLENBQUMsT0FBZTtRQUNuQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHO1FBRWY7OztXQUdHO1FBQ0gsV0FBVyxFQUFFO1lBRVosSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7Z0JBQ25DLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzFCLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7Z0JBQ3JDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFckIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzdDLENBQUM7U0FDRDtRQUVEOztXQUVHO1FBQ0gsUUFBUSxFQUFFO1lBRVQsWUFBWSxDQUFDLEtBQWE7Z0JBQ3pCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQy9CLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1NBQ0Q7S0FDRCxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0osYUFBYSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7QUFDRixDQUFDLEVBQUUsQ0FBQyxDQUFDIn0=