/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class DebugCompoundRoot {
    constructor() {
        this.stopped = false;
        this.stopEmitter = new Emitter();
        this.onDidSessionStop = this.stopEmitter.event;
    }
    sessionStopped() {
        if (!this.stopped) { // avoid sending extranous terminate events
            this.stopped = true;
            this.stopEmitter.fire();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21wb3VuZFJvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnQ29tcG91bmRSb290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxNQUFNLE9BQU8saUJBQWlCO0lBQTlCO1FBQ1MsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUNoQixnQkFBVyxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFFMUMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7SUFRM0MsQ0FBQztJQU5BLGNBQWM7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsMkNBQTJDO1lBQy9ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9