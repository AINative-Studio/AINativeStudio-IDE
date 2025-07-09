/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { AbstractMessageLogger, DEFAULT_LOG_LEVEL, log } from './log.js';
export class BufferLogger extends AbstractMessageLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.buffer = [];
        this._logger = undefined;
        this._logLevelDisposable = this._register(new MutableDisposable());
        this.setLevel(logLevel);
    }
    set logger(logger) {
        this._logger = logger;
        this.setLevel(logger.getLevel());
        this._logLevelDisposable.value = logger.onDidChangeLogLevel(this.setLevel, this);
        for (const { level, message } of this.buffer) {
            log(logger, level, message);
        }
        this.buffer = [];
    }
    log(level, message) {
        if (this._logger) {
            log(this._logger, level, message);
        }
        else if (this.getLevel() <= level) {
            this.buffer.push({ level, message });
        }
    }
    dispose() {
        this._logger?.dispose();
        super.dispose();
    }
    flush() {
        this._logger?.flush();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyTG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9jb21tb24vYnVmZmVyTG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBVyxHQUFHLEVBQVksTUFBTSxVQUFVLENBQUM7QUFPNUYsTUFBTSxPQUFPLFlBQWEsU0FBUSxxQkFBcUI7SUFPdEQsWUFBWSxXQUFxQixpQkFBaUI7UUFDakQsS0FBSyxFQUFFLENBQUM7UUFMRCxXQUFNLEdBQVcsRUFBRSxDQUFDO1FBQ3BCLFlBQU8sR0FBd0IsU0FBUyxDQUFDO1FBQ2hDLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFJOUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsTUFBZTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakYsS0FBSyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QyxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVTLEdBQUcsQ0FBQyxLQUFlLEVBQUUsT0FBZTtRQUM3QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN4QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVRLEtBQUs7UUFDYixJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCJ9