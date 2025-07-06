/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
/**
 * Tracks a terminal process's data stream and responds immediately when a matching string is
 * received. This is done in a low overhead way and is ideally run on the same process as the
 * where the process is handled to minimize latency.
 */
export class TerminalAutoResponder extends Disposable {
    constructor(proc, matchWord, response, logService) {
        super();
        this._pointer = 0;
        this._paused = false;
        /**
         * Each reply is throttled by a second to avoid resource starvation and responding to screen
         * reprints on Winodws.
         */
        this._throttled = false;
        this._register(proc.onProcessData(e => {
            if (this._paused || this._throttled) {
                return;
            }
            const data = typeof e === 'string' ? e : e.data;
            for (let i = 0; i < data.length; i++) {
                if (data[i] === matchWord[this._pointer]) {
                    this._pointer++;
                }
                else {
                    this._reset();
                }
                // Auto reply and reset
                if (this._pointer === matchWord.length) {
                    logService.debug(`Auto reply match: "${matchWord}", response: "${response}"`);
                    proc.input(response);
                    this._throttled = true;
                    timeout(1000).then(() => this._throttled = false);
                    this._reset();
                }
            }
        }));
    }
    _reset() {
        this._pointer = 0;
    }
    /**
     * No auto response will happen after a resize on Windows in case the resize is a result of
     * reprinting the screen.
     */
    handleResize() {
        if (isWindows) {
            this._paused = true;
        }
    }
    handleInput() {
        this._paused = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVzcG9uZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbENvbnRyaWIvYXV0b1JlcGxpZXMvdGVybWluYWxBdXRvUmVzcG9uZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBSW5FOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsVUFBVTtJQVVwRCxZQUNDLElBQTJCLEVBQzNCLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLFVBQXVCO1FBRXZCLEtBQUssRUFBRSxDQUFDO1FBZkQsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUNiLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFeEI7OztXQUdHO1FBQ0ssZUFBVSxHQUFHLEtBQUssQ0FBQztRQVUxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDckMsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDakIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZixDQUFDO2dCQUNELHVCQUF1QjtnQkFDdkIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDeEMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsU0FBUyxpQkFBaUIsUUFBUSxHQUFHLENBQUMsQ0FBQztvQkFDOUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQztvQkFDbEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNmLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFlBQVk7UUFDWCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXO1FBQ1YsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQztDQUNEIn0=