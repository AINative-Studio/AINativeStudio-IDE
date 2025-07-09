/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../common/event.js';
export class DomEmitter {
    get event() {
        return this.emitter.event;
    }
    constructor(element, type, useCapture) {
        const fn = (e) => this.emitter.fire(e);
        this.emitter = new Emitter({
            onWillAddFirstListener: () => element.addEventListener(type, fn, useCapture),
            onDidRemoveLastListener: () => element.removeEventListener(type, fn, useCapture)
        });
    }
    dispose() {
        this.emitter.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQXNCLE1BQU0sb0JBQW9CLENBQUM7QUFxQmpFLE1BQU0sT0FBTyxVQUFVO0lBSXRCLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUtELFlBQVksT0FBcUIsRUFBRSxJQUFPLEVBQUUsVUFBb0I7UUFDL0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQW1CLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDO1lBQzFCLHNCQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQztZQUM1RSx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUM7U0FDaEYsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCJ9