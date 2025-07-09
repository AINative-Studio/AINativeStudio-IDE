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
import { timeout } from '../../../base/common/async.js';
import { ILogService } from '../../log/common/log.js';
let WindowProfiler = class WindowProfiler {
    constructor(_window, _sessionId, _logService) {
        this._window = _window;
        this._sessionId = _sessionId;
        this._logService = _logService;
    }
    async inspect(duration) {
        await this._connect();
        const inspector = this._window.webContents.debugger;
        await inspector.sendCommand('Profiler.start');
        this._logService.warn('[perf] profiling STARTED', this._sessionId);
        await timeout(duration);
        const data = await inspector.sendCommand('Profiler.stop');
        this._logService.warn('[perf] profiling DONE', this._sessionId);
        await this._disconnect();
        return data.profile;
    }
    async _connect() {
        const inspector = this._window.webContents.debugger;
        inspector.attach();
        await inspector.sendCommand('Profiler.enable');
    }
    async _disconnect() {
        const inspector = this._window.webContents.debugger;
        await inspector.sendCommand('Profiler.disable');
        inspector.detach();
    }
};
WindowProfiler = __decorate([
    __param(2, ILogService)
], WindowProfiler);
export { WindowProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93UHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9lbGVjdHJvbi1tYWluL3dpbmRvd1Byb2ZpbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRy9DLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFFMUIsWUFDa0IsT0FBc0IsRUFDdEIsVUFBa0IsRUFDTCxXQUF3QjtRQUZyQyxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQ3RCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDTCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtJQUNuRCxDQUFDO0lBRUwsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQjtRQUU3QixNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUV0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7UUFDcEQsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sSUFBSSxHQUFrQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLFFBQVE7UUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1FBQ3BELFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVc7UUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1FBQ3BELE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hELFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNwQixDQUFDO0NBQ0QsQ0FBQTtBQWxDWSxjQUFjO0lBS3hCLFdBQUEsV0FBVyxDQUFBO0dBTEQsY0FBYyxDQWtDMUIifQ==