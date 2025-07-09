/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
/**
 * Provides extensions to the xterm object in a modular, testable way.
 */
export class LineDataEventAddon extends Disposable {
    constructor(_initializationPromise) {
        super();
        this._initializationPromise = _initializationPromise;
        this._isOsSet = false;
        this._onLineData = this._register(new Emitter());
        this.onLineData = this._onLineData.event;
    }
    async activate(xterm) {
        this._xterm = xterm;
        // IMPORTANT: Instantiate the buffer namespace object here before it's disposed.
        const buffer = xterm.buffer;
        // If there is an initialization promise, wait for it before registering the event
        await this._initializationPromise;
        // Fire onLineData when a line feed occurs, taking into account wrapped lines
        this._register(xterm.onLineFeed(() => {
            const newLine = buffer.active.getLine(buffer.active.baseY + buffer.active.cursorY);
            if (newLine && !newLine.isWrapped) {
                this._sendLineData(buffer.active, buffer.active.baseY + buffer.active.cursorY - 1);
            }
        }));
        // Fire onLineData when disposing object to flush last line
        this._register(toDisposable(() => {
            this._sendLineData(buffer.active, buffer.active.baseY + buffer.active.cursorY);
        }));
    }
    setOperatingSystem(os) {
        if (this._isOsSet || !this._xterm) {
            return;
        }
        this._isOsSet = true;
        // Force line data to be sent when the cursor is moved, the main purpose for
        // this is because ConPTY will often not do a line feed but instead move the
        // cursor, in which case we still want to send the current line's data to tasks.
        if (os === 1 /* OperatingSystem.Windows */) {
            const xterm = this._xterm;
            this._register(xterm.parser.registerCsiHandler({ final: 'H' }, () => {
                const buffer = xterm.buffer;
                this._sendLineData(buffer.active, buffer.active.baseY + buffer.active.cursorY);
                return false;
            }));
        }
    }
    _sendLineData(buffer, lineIndex) {
        let line = buffer.getLine(lineIndex);
        if (!line) {
            return;
        }
        let lineData = line.translateToString(true);
        while (lineIndex > 0 && line.isWrapped) {
            line = buffer.getLine(--lineIndex);
            if (!line) {
                break;
            }
            lineData = line.translateToString(false) + lineData;
        }
        this._onLineData.fire(lineData);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURhdGFFdmVudEFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0vbGluZURhdGFFdmVudEFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSW5GOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFRakQsWUFBNkIsc0JBQXNDO1FBQ2xFLEtBQUssRUFBRSxDQUFDO1FBRG9CLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBZ0I7UUFMM0QsYUFBUSxHQUFHLEtBQUssQ0FBQztRQUVSLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFDNUQsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0lBSTdDLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQW9CO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBRXBCLGdGQUFnRjtRQUNoRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBRTVCLGtGQUFrRjtRQUNsRixNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztRQUVsQyw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNwQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxD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