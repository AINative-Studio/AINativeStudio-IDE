/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
let BufferContentTracker = class BufferContentTracker extends Disposable {
    get lines() { return this._lines; }
    constructor(_xterm, _configurationService, _logService) {
        super();
        this._xterm = _xterm;
        this._configurationService = _configurationService;
        this._logService = _logService;
        /**
         * The number of wrapped lines in the viewport when the last cached marker was set
         */
        this._priorEditorViewportLineCount = 0;
        this._lines = [];
        this.bufferToEditorLineMapping = new Map();
    }
    reset() {
        this._lines = [];
        this._lastCachedMarker = undefined;
        this.update();
    }
    update() {
        if (this._lastCachedMarker?.isDisposed) {
            // the terminal was cleared, reset the cache
            this._lines = [];
            this._lastCachedMarker = undefined;
        }
        this._removeViewportContent();
        this._updateCachedContent();
        this._updateViewportContent();
        this._lastCachedMarker = this._register(this._xterm.raw.registerMarker());
        this._logService.debug('Buffer content tracker: set ', this._lines.length, ' lines');
    }
    _updateCachedContent() {
        const buffer = this._xterm.raw.buffer.active;
        const start = this._lastCachedMarker?.line ? this._lastCachedMarker.line - this._xterm.raw.rows + 1 : 0;
        const end = buffer.baseY;
        if (start < 0 || start > end) {
            // in the viewport, no need to cache
            return;
        }
        // to keep the cache size down, remove any lines that are no longer in the scrollback
        const scrollback = this._configurationService.getValue("terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */);
        const maxBufferSize = scrollback + this._xterm.raw.rows - 1;
        const linesToAdd = end - start;
        if (linesToAdd + this._lines.length > maxBufferSize) {
            const numToRemove = linesToAdd + this._lines.length - maxBufferSize;
            for (let i = 0; i < numToRemove; i++) {
                this._lines.shift();
            }
            this._logService.debug('Buffer content tracker: removed ', numToRemove, ' lines from top of cached lines, now ', this._lines.length, ' lines');
        }
        // iterate through the buffer lines and add them to the editor line cache
        const cachedLines = [];
        let currentLine = '';
        for (let i = start; i < end; i++) {
            const line = buffer.getLine(i);
            if (!line) {
                continue;
            }
            this.bufferToEditorLineMapping.set(i, this._lines.length + cachedLines.length);
            const isWrapped = buffer.getLine(i + 1)?.isWrapped;
            currentLine += line.translateToString(!isWrapped);
            if (currentLine && !isWrapped || i === (buffer.baseY + this._xterm.raw.rows - 1)) {
                if (line.length) {
                    cachedLines.push(currentLine);
                    currentLine = '';
                }
            }
        }
        this._logService.debug('Buffer content tracker:', cachedLines.length, ' lines cached');
        this._lines.push(...cachedLines);
    }
    _removeViewportContent() {
        if (!this._lines.length) {
            return;
        }
        // remove previous viewport content in case it has changed
        let linesToRemove = this._priorEditorViewportLineCount;
        let index = 1;
        while (linesToRemove) {
            this.bufferToEditorLineMapping.forEach((value, key) => { if (value === this._lines.length - index) {
                this.bufferToEditorLineMapping.delete(key);
            } });
            this._lines.pop();
            index++;
            linesToRemove--;
        }
        this._logService.debug('Buffer content tracker: removed lines from viewport, now ', this._lines.length, ' lines cached');
    }
    _updateViewportContent() {
        const buffer = this._xterm.raw.buffer.active;
        this._priorEditorViewportLineCount = 0;
        let currentLine = '';
        for (let i = buffer.baseY; i < buffer.baseY + this._xterm.raw.rows; i++) {
            const line = buffer.getLine(i);
            if (!line) {
                continue;
            }
            this.bufferToEditorLineMapping.set(i, this._lines.length);
            const isWrapped = buffer.getLine(i + 1)?.isWrapped;
            currentLine += line.translateToString(!isWrapped);
            if (currentLine && !isWrapped || i === (buffer.baseY + this._xterm.raw.rows - 1)) {
                if (currentLine.length) {
                    this._priorEditorViewportLineCount++;
                    this._lines.push(currentLine);
                    currentLine = '';
                }
            }
        }
        this._logService.debug('Viewport content update complete, ', this._lines.length, ' lines in the viewport');
    }
};
BufferContentTracker = __decorate([
    __param(1, IConfigurationService),
    __param(2, ITerminalLogService)
], BufferContentTracker);
export { BufferContentTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9idWZmZXJDb250ZW50VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFxQixNQUFNLHFEQUFxRCxDQUFDO0FBSXRHLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQVduRCxJQUFJLEtBQUssS0FBZSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBSTdDLFlBQ2tCLE1BQTJELEVBQ3JELHFCQUE2RCxFQUMvRCxXQUFpRDtRQUV0RSxLQUFLLEVBQUUsQ0FBQztRQUpTLFdBQU0sR0FBTixNQUFNLENBQXFEO1FBQ3BDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBYnZFOztXQUVHO1FBQ0ssa0NBQTZCLEdBQVcsQ0FBQyxDQUFDO1FBRTFDLFdBQU0sR0FBYSxFQUFFLENBQUM7UUFHOUIsOEJBQXlCLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7SUFRM0QsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDeEMsNENBQTRDO1lBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQzdDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDekIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUM5QixvQ0FBb0M7WUFDcEMsT0FBTztRQUNSLENBQUM7UUFFRCxxRkFBcUY7UUFDckYsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEscUVBQThCLENBQUM7UUFDN0YsTUFBTSxhQUFhLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDNUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztRQUMvQixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUNyRCxNQUFNLFdBQVcsR0FBRyxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDO1lBQ3BFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsV0FBVyxFQUFFLHVDQUF1QyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hKLENBQUM7UUFFRCx5RUFBeUU7UUFDekUsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksV0FBVyxHQUFXLEVBQUUsQ0FBQztRQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsU0FBUztZQUNWLENBQUM7WUFDRCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0UsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDO1lBQ25ELFdBQVcsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsRCxJQUFJLFdBQVcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsRixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDakIsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDOUIsV0FBVyxHQUFHLEVBQUUsQ0FBQztnQkFDbEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFDRCwwREFBMEQ7UUFDMUQsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDO1FBQ3ZELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sYUFBYSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEosSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNsQixLQUFLLEVBQUUsQ0FBQztZQUNSLGFBQWEsRUFBRSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywyREFBMkQsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMxSCxDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDN0MsSUFBSSxDQUFDLDZCQUE2QixHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLFdBQVcsR0FBVyxFQUFFLENBQUM7UUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUM7WUFDbkQsV0FBVyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELElBQUksV0FBVyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xGLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQzlCLFdBQVcsR0FBRyxFQUFFLENBQUM7Z0JBQ2xCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDNUcsQ0FBQztDQUNELENBQUE7QUEzSFksb0JBQW9CO0lBaUI5QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7R0FsQlQsb0JBQW9CLENBMkhoQyJ9