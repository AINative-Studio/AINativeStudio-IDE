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
import { AbstractMessageLogger, AbstractLoggerService } from '../../../platform/log/common/log.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { URI } from '../../../base/common/uri.js';
import { revive } from '../../../base/common/marshalling.js';
let ExtHostLoggerService = class ExtHostLoggerService extends AbstractLoggerService {
    constructor(rpc, initData) {
        super(initData.logLevel, initData.logsLocation, initData.loggers.map(logger => revive(logger)));
        this._proxy = rpc.getProxy(MainContext.MainThreadLogger);
    }
    $setLogLevel(logLevel, resource) {
        if (resource) {
            this.setLogLevel(URI.revive(resource), logLevel);
        }
        else {
            this.setLogLevel(logLevel);
        }
    }
    setVisibility(resource, visibility) {
        super.setVisibility(resource, visibility);
        this._proxy.$setVisibility(resource, visibility);
    }
    doCreateLogger(resource, logLevel, options) {
        return new Logger(this._proxy, resource, logLevel, options);
    }
};
ExtHostLoggerService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], ExtHostLoggerService);
export { ExtHostLoggerService };
class Logger extends AbstractMessageLogger {
    constructor(proxy, file, logLevel, loggerOptions) {
        super(loggerOptions?.logLevel === 'always');
        this.proxy = proxy;
        this.file = file;
        this.isLoggerCreated = false;
        this.buffer = [];
        this.setLevel(logLevel);
        this.proxy.$createLogger(file, loggerOptions)
            .then(() => {
            this.doLog(this.buffer);
            this.isLoggerCreated = true;
        });
    }
    log(level, message) {
        const messages = [[level, message]];
        if (this.isLoggerCreated) {
            this.doLog(messages);
        }
        else {
            this.buffer.push(...messages);
        }
    }
    doLog(messages) {
        this.proxy.$log(this.file, messages);
    }
    flush() {
        this.proxy.$flush(this.file);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExvZ2dlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEyQixxQkFBcUIsRUFBWSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RJLE9BQU8sRUFBeUIsV0FBVyxFQUE4RCxNQUFNLHVCQUF1QixDQUFDO0FBQ3ZJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXRELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEscUJBQXFCO0lBSzlELFlBQ3FCLEdBQXVCLEVBQ2xCLFFBQWlDO1FBRTFELEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsWUFBWSxDQUFDLFFBQWtCLEVBQUUsUUFBd0I7UUFDeEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFFUSxhQUFhLENBQUMsUUFBYSxFQUFFLFVBQW1CO1FBQ3hELEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRVMsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFrQixFQUFFLE9BQXdCO1FBQ25GLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRCxDQUFBO0FBN0JZLG9CQUFvQjtJQU05QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7R0FQYixvQkFBb0IsQ0E2QmhDOztBQUVELE1BQU0sTUFBTyxTQUFRLHFCQUFxQjtJQUt6QyxZQUNrQixLQUE0QixFQUM1QixJQUFTLEVBQzFCLFFBQWtCLEVBQ2xCLGFBQThCO1FBRTlCLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBTDNCLFVBQUssR0FBTCxLQUFLLENBQXVCO1FBQzVCLFNBQUksR0FBSixJQUFJLENBQUs7UUFMbkIsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDakMsV0FBTSxHQUF5QixFQUFFLENBQUM7UUFTekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDO2FBQzNDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDVixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxHQUFHLENBQUMsS0FBZSxFQUFFLE9BQWU7UUFDN0MsTUFBTSxRQUFRLEdBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMxRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUE4QjtRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFUSxLQUFLO1FBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7Q0FDRCJ9