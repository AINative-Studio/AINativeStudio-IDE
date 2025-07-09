/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// import * as DOM from 'vs/base/browser/dom';
class NotebookLogger {
    constructor() {
        this._frameId = 0;
        this._domFrameLog();
    }
    _domFrameLog() {
        // DOM.scheduleAtNextAnimationFrame(() => {
        // 	this._frameId++;
        // 	this._domFrameLog();
        // }, 1000000);
    }
    debug(...args) {
        const date = new Date();
        console.log(`${date.getSeconds()}:${date.getMilliseconds().toString().padStart(3, '0')}`, `frame #${this._frameId}: `, ...args);
    }
}
const instance = new NotebookLogger();
export function notebookDebug(...args) {
    instance.debug(...args);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyw4Q0FBOEM7QUFFOUMsTUFBTSxjQUFjO0lBQ25CO1FBR1EsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUZwQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVPLFlBQVk7UUFDbkIsMkNBQTJDO1FBQzNDLG9CQUFvQjtRQUVwQix3QkFBd0I7UUFDeEIsZUFBZTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsSUFBVztRQUNuQixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxVQUFVLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2pJLENBQUM7Q0FDRDtBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7QUFDdEMsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFHLElBQVc7SUFDM0MsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3pCLENBQUMifQ==