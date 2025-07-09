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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVzcG9uZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxDb250cmliL2F1dG9SZXBsaWVzL3Rlcm1pbmFsQXV0b1Jlc3BvbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUluRTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUFVcEQsWUFDQyxJQUEyQixFQUMzQixTQUFpQixFQUNqQixRQUFnQixFQUNoQixVQUF1QjtRQUV2QixLQUFLLEVBQUUsQ0FBQztRQWZELGFBQVEsR0FBRyxDQUFDLENBQUM7UUFDYixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBRXhCOzs7V0FHRztRQUNLLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFVMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JDLE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUMxQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2YsQ0FBQztnQkFDRCx1QkFBdUI7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLFNBQVMsaUJBQWlCLFFBQVEsR0FBRyxDQUFDLENBQUM7b0JBQzlFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ2xELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7O09BR0c7SUFDSCxZQUFZO1FBQ1gsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVztRQUNWLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLENBQUM7Q0FDRCJ9