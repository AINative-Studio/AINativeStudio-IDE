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
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILoggerService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { TelemetryLogGroup, isLoggingOnly, telemetryLogId, validateTelemetryData } from './telemetryUtils.js';
let TelemetryLogAppender = class TelemetryLogAppender extends Disposable {
    constructor(prefix, remote, loggerService, environmentService, productService) {
        super();
        this.prefix = prefix;
        const id = remote ? 'remoteTelemetry' : telemetryLogId;
        const logger = loggerService.getLogger(id);
        if (logger) {
            this.logger = this._register(logger);
        }
        else {
            // Not a perfect check, but a nice way to indicate if we only have logging enabled for debug purposes and nothing is actually being sent
            const justLoggingAndNotSending = isLoggingOnly(productService, environmentService);
            const logSuffix = justLoggingAndNotSending ? ' (Not Sent)' : '';
            this.logger = this._register(loggerService.createLogger(id, {
                name: localize('telemetryLog', "Telemetry{0}", logSuffix),
                group: TelemetryLogGroup,
                hidden: true
            }));
        }
    }
    flush() {
        return Promise.resolve();
    }
    log(eventName, data) {
        this.logger.trace(`${this.prefix}telemetry/${eventName}`, validateTelemetryData(data));
    }
};
TelemetryLogAppender = __decorate([
    __param(2, ILoggerService),
    __param(3, IEnvironmentService),
    __param(4, IProductService)
], TelemetryLogAppender);
export { TelemetryLogAppender };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnlMb2dBcHBlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBVyxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFzQixpQkFBaUIsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFM0gsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBSW5ELFlBQ2tCLE1BQWMsRUFDL0IsTUFBZSxFQUNDLGFBQTZCLEVBQ3hCLGtCQUF1QyxFQUMzQyxjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQztRQU5TLFdBQU0sR0FBTixNQUFNLENBQVE7UUFRL0IsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDO2FBQU0sQ0FBQztZQUNQLHdJQUF3STtZQUN4SSxNQUFNLHdCQUF3QixHQUFHLGFBQWEsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNuRixNQUFNLFNBQVMsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUN6RDtnQkFDQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDO2dCQUN6RCxLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELEdBQUcsQ0FBQyxTQUFpQixFQUFFLElBQVM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxhQUFhLFNBQVMsRUFBRSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNELENBQUE7QUFyQ1ksb0JBQW9CO0lBTzlCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGVBQWUsQ0FBQTtHQVRMLG9CQUFvQixDQXFDaEMifQ==