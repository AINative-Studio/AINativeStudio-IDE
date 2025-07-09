/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    /**
     * The minimum size of the prompt in which to assume the line is a command.
     */
    Constants[Constants["MinimumPromptLength"] = 2] = "MinimumPromptLength";
})(Constants || (Constants = {}));
/**
 * This capability guesses where commands are based on where the cursor was when enter was pressed.
 * It's very hit or miss but it's often correct and better than nothing.
 */
export class PartialCommandDetectionCapability extends DisposableStore {
    get commands() { return this._commands; }
    constructor(_terminal) {
        super();
        this._terminal = _terminal;
        this.type = 3 /* TerminalCapability.PartialCommandDetection */;
        this._commands = [];
        this._onCommandFinished = this.add(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this.add(this._terminal.onData(e => this._onData(e)));
        this.add(this._terminal.parser.registerCsiHandler({ final: 'J' }, params => {
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                this._clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
    }
    _onData(data) {
        if (data === '\x0d') {
            this._onEnter();
        }
    }
    _onEnter() {
        if (!this._terminal) {
            return;
        }
        if (this._terminal.buffer.active.cursorX >= 2 /* Constants.MinimumPromptLength */) {
            const marker = this._terminal.registerMarker(0);
            if (marker) {
                this._commands.push(marker);
                this._onCommandFinished.fire(marker);
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            if (this._commands[i].line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        this._commands.splice(this._commands.length - count, count);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvcGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJdkUsSUFBVyxTQUtWO0FBTEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsdUVBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQUxVLFNBQVMsS0FBVCxTQUFTLFFBS25CO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLGVBQWU7SUFLckUsSUFBSSxRQUFRLEtBQXlCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFLN0QsWUFDa0IsU0FBbUI7UUFFcEMsS0FBSyxFQUFFLENBQUM7UUFGUyxjQUFTLEdBQVQsU0FBUyxDQUFVO1FBVjVCLFNBQUksc0RBQThDO1FBRTFDLGNBQVMsR0FBYyxFQUFFLENBQUM7UUFJMUIsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDOUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQU0xRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRTtZQUMxRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDakMsQ0FBQztZQUNELHdFQUF3RTtZQUN4RSxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sT0FBTyxDQUFDLElBQVk7UUFDM0IsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLHlDQUFpQyxFQUFFLENBQUM7WUFDM0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0Isd0ZBQXdGO1FBQ3hGLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDakUsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLEVBQUUsQ0FBQztRQUNULENBQUM7UUFDRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRCJ9