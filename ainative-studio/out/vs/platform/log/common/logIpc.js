/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { Event } from '../../../base/common/event.js';
import { AbstractLoggerService, AbstractMessageLogger, AdapterLogger, isLogLevel } from './log.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export class LoggerChannelClient extends AbstractLoggerService {
    constructor(windowId, logLevel, logsHome, loggers, channel) {
        super(logLevel, logsHome, loggers);
        this.windowId = windowId;
        this.channel = channel;
        this._register(channel.listen('onDidChangeLogLevel', windowId)(arg => {
            if (isLogLevel(arg)) {
                super.setLogLevel(arg);
            }
            else {
                super.setLogLevel(URI.revive(arg[0]), arg[1]);
            }
        }));
        this._register(channel.listen('onDidChangeVisibility', windowId)(([resource, visibility]) => super.setVisibility(URI.revive(resource), visibility)));
        this._register(channel.listen('onDidChangeLoggers', windowId)(({ added, removed }) => {
            for (const loggerResource of added) {
                super.registerLogger({ ...loggerResource, resource: URI.revive(loggerResource.resource) });
            }
            for (const loggerResource of removed) {
                super.deregisterLogger(loggerResource.resource);
            }
        }));
    }
    createConsoleMainLogger() {
        return new AdapterLogger({
            log: (level, args) => {
                this.channel.call('consoleLog', [level, args]);
            }
        });
    }
    registerLogger(logger) {
        super.registerLogger(logger);
        this.channel.call('registerLogger', [logger, this.windowId]);
    }
    deregisterLogger(resource) {
        super.deregisterLogger(resource);
        this.channel.call('deregisterLogger', [resource, this.windowId]);
    }
    setLogLevel(arg1, arg2) {
        super.setLogLevel(arg1, arg2);
        this.channel.call('setLogLevel', [arg1, arg2]);
    }
    setVisibility(resourceOrId, visibility) {
        super.setVisibility(resourceOrId, visibility);
        this.channel.call('setVisibility', [this.toResource(resourceOrId), visibility]);
    }
    doCreateLogger(file, logLevel, options) {
        return new Logger(this.channel, file, logLevel, options, this.windowId);
    }
    static setLogLevel(channel, arg1, arg2) {
        return channel.call('setLogLevel', [arg1, arg2]);
    }
}
class Logger extends AbstractMessageLogger {
    constructor(channel, file, logLevel, loggerOptions, windowId) {
        super(loggerOptions?.logLevel === 'always');
        this.channel = channel;
        this.file = file;
        this.isLoggerCreated = false;
        this.buffer = [];
        this.setLevel(logLevel);
        this.channel.call('createLogger', [file, loggerOptions, windowId])
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
        this.channel.call('log', [this.file, messages]);
    }
}
export class LoggerChannel {
    constructor(loggerService, getUriTransformer) {
        this.loggerService = loggerService;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onDidChangeLoggers': return Event.map(this.loggerService.onDidChangeLoggers, (e) => ({
                added: [...e.added].map(logger => this.transformLogger(logger, uriTransformer)),
                removed: [...e.removed].map(logger => this.transformLogger(logger, uriTransformer)),
            }));
            case 'onDidChangeVisibility': return Event.map(this.loggerService.onDidChangeVisibility, e => [uriTransformer.transformOutgoingURI(e[0]), e[1]]);
            case 'onDidChangeLogLevel': return Event.map(this.loggerService.onDidChangeLogLevel, e => isLogLevel(e) ? e : [uriTransformer.transformOutgoingURI(e[0]), e[1]]);
        }
        throw new Error(`Event not found: ${event}`);
    }
    async call(context, command, arg) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'setLogLevel': return isLogLevel(arg[0]) ? this.loggerService.setLogLevel(arg[0]) : this.loggerService.setLogLevel(URI.revive(uriTransformer.transformIncoming(arg[0][0])), arg[0][1]);
            case 'getRegisteredLoggers': return Promise.resolve([...this.loggerService.getRegisteredLoggers()].map(logger => this.transformLogger(logger, uriTransformer)));
        }
        throw new Error(`Call not found: ${command}`);
    }
    transformLogger(logger, transformer) {
        return {
            ...logger,
            resource: transformer.transformOutgoingURI(logger.resource)
        };
    }
}
export class RemoteLoggerChannelClient extends Disposable {
    constructor(loggerService, channel) {
        super();
        channel.call('setLogLevel', [loggerService.getLogLevel()]);
        this._register(loggerService.onDidChangeLogLevel(arg => channel.call('setLogLevel', [arg])));
        channel.call('getRegisteredLoggers').then(loggers => {
            for (const loggerResource of loggers) {
                loggerService.registerLogger({ ...loggerResource, resource: URI.revive(loggerResource.resource) });
            }
        });
        this._register(channel.listen('onDidChangeVisibility')(([resource, visibility]) => loggerService.setVisibility(URI.revive(resource), visibility)));
        this._register(channel.listen('onDidChangeLoggers')(({ added, removed }) => {
            for (const loggerResource of added) {
                loggerService.registerLogger({ ...loggerResource, resource: URI.revive(loggerResource.resource) });
            }
            for (const loggerResource of removed) {
                loggerService.deregisterLogger(loggerResource.resource);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9jb21tb24vbG9nSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBbUYsVUFBVSxFQUFZLE1BQU0sVUFBVSxDQUFDO0FBQzlMLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUcvRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEscUJBQXFCO0lBRTdELFlBQTZCLFFBQTRCLEVBQUUsUUFBa0IsRUFBRSxRQUFhLEVBQUUsT0FBMEIsRUFBbUIsT0FBaUI7UUFDM0osS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFEUCxhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQUFrRixZQUFPLEdBQVAsT0FBTyxDQUFVO1FBRTNKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBNkIscUJBQXFCLEVBQUUsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDaEcsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFpQix1QkFBdUIsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JLLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBd0Isb0JBQW9CLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQzNHLEtBQUssTUFBTSxjQUFjLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3BDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVGLENBQUM7WUFDRCxLQUFLLE1BQU0sY0FBYyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUN0QyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixPQUFPLElBQUksYUFBYSxDQUFDO1lBQ3hCLEdBQUcsRUFBRSxDQUFDLEtBQWUsRUFBRSxJQUFXLEVBQUUsRUFBRTtnQkFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEQsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxjQUFjLENBQUMsTUFBdUI7UUFDOUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRVEsZ0JBQWdCLENBQUMsUUFBYTtRQUN0QyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUlRLFdBQVcsQ0FBQyxJQUFTLEVBQUUsSUFBVTtRQUN6QyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRVEsYUFBYSxDQUFDLFlBQTBCLEVBQUUsVUFBbUI7UUFDckUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFUyxjQUFjLENBQUMsSUFBUyxFQUFFLFFBQWtCLEVBQUUsT0FBd0I7UUFDL0UsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBSU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFpQixFQUFFLElBQVMsRUFBRSxJQUFVO1FBQ2pFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBRUQ7QUFFRCxNQUFNLE1BQU8sU0FBUSxxQkFBcUI7SUFLekMsWUFDa0IsT0FBaUIsRUFDakIsSUFBUyxFQUMxQixRQUFrQixFQUNsQixhQUE4QixFQUM5QixRQUE2QjtRQUU3QixLQUFLLENBQUMsYUFBYSxFQUFFLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQztRQU4zQixZQUFPLEdBQVAsT0FBTyxDQUFVO1FBQ2pCLFNBQUksR0FBSixJQUFJLENBQUs7UUFMbkIsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDakMsV0FBTSxHQUF5QixFQUFFLENBQUM7UUFVekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ2hFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDVixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxHQUFHLENBQUMsS0FBZSxFQUFFLE9BQWU7UUFDN0MsTUFBTSxRQUFRLEdBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMxRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUE4QjtRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFFekIsWUFBNkIsYUFBNkIsRUFBVSxpQkFBMkQ7UUFBbEcsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQVUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEwQztJQUFJLENBQUM7SUFFcEksTUFBTSxDQUFDLE9BQVksRUFBRSxLQUFhO1FBQ2pDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBK0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3ZJLENBQUM7Z0JBQ0EsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQy9FLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2FBQ25GLENBQUMsQ0FBQyxDQUFDO1lBQ0osS0FBSyx1QkFBdUIsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBaUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakwsS0FBSyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBeUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFOLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQVksRUFBRSxPQUFlLEVBQUUsR0FBUztRQUNsRCxNQUFNLGNBQWMsR0FBMkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUwsS0FBSyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pLLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTyxlQUFlLENBQUMsTUFBdUIsRUFBRSxXQUE0QjtRQUM1RSxPQUFPO1lBQ04sR0FBRyxNQUFNO1lBQ1QsUUFBUSxFQUFFLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1NBQzNELENBQUM7SUFDSCxDQUFDO0NBRUQ7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUV4RCxZQUFZLGFBQTZCLEVBQUUsT0FBaUI7UUFDM0QsS0FBSyxFQUFFLENBQUM7UUFFUixPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdGLE9BQU8sQ0FBQyxJQUFJLENBQW9CLHNCQUFzQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3RFLEtBQUssTUFBTSxjQUFjLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BHLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBaUIsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5LLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBd0Isb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDakcsS0FBSyxNQUFNLGNBQWMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDcEMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEdBQUcsY0FBYyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDcEcsQ0FBQztZQUNELEtBQUssTUFBTSxjQUFjLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDO0NBQ0QifQ==