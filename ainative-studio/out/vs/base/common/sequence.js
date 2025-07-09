/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
export class Sequence {
    constructor() {
        this.elements = [];
        this._onDidSplice = new Emitter();
        this.onDidSplice = this._onDidSplice.event;
    }
    splice(start, deleteCount, toInsert = []) {
        this.elements.splice(start, deleteCount, ...toInsert);
        this._onDidSplice.fire({ start, deleteCount, toInsert });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VxdWVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc2VxdWVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLFlBQVksQ0FBQztBQWlCNUMsTUFBTSxPQUFPLFFBQVE7SUFBckI7UUFFVSxhQUFRLEdBQVEsRUFBRSxDQUFDO1FBRVgsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBYyxDQUFDO1FBQ2pELGdCQUFXLEdBQXNCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO0lBTW5FLENBQUM7SUFKQSxNQUFNLENBQUMsS0FBYSxFQUFFLFdBQW1CLEVBQUUsV0FBeUIsRUFBRTtRQUNyRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNEIn0=