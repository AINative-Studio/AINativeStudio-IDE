/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export class URLHandlerChannel {
    constructor(handler) {
        this.handler = handler;
    }
    listen(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, arg) {
        switch (command) {
            case 'handleURL': return this.handler.handleURL(URI.revive(arg[0]), arg[1]);
        }
        throw new Error(`Call not found: ${command}`);
    }
}
export class URLHandlerChannelClient {
    constructor(channel) {
        this.channel = channel;
    }
    handleURL(uri, options) {
        return this.channel.call('handleURL', [uri.toJSON(), options]);
    }
}
export class URLHandlerRouter {
    constructor(next, logService) {
        this.next = next;
        this.logService = logService;
    }
    async routeCall(hub, command, arg, cancellationToken) {
        if (command !== 'handleURL') {
            throw new Error(`Call not found: ${command}`);
        }
        if (Array.isArray(arg) && arg.length > 0) {
            const uri = URI.revive(arg[0]);
            this.logService.trace('URLHandlerRouter#routeCall() with URI argument', uri.toString(true));
            if (uri.query) {
                const match = /\bwindowId=(\d+)/.exec(uri.query);
                if (match) {
                    const windowId = match[1];
                    this.logService.trace(`URLHandlerRouter#routeCall(): found windowId query parameter with value "${windowId}"`, uri.toString(true));
                    const regex = new RegExp(`window:${windowId}`);
                    const connection = hub.connections.find(c => {
                        this.logService.trace('URLHandlerRouter#routeCall(): testing connection', c.ctx);
                        return regex.test(c.ctx);
                    });
                    if (connection) {
                        this.logService.trace('URLHandlerRouter#routeCall(): found a connection to route', uri.toString(true));
                        return connection;
                    }
                    else {
                        this.logService.trace('URLHandlerRouter#routeCall(): did not find a connection to route', uri.toString(true));
                    }
                }
                else {
                    this.logService.trace('URLHandlerRouter#routeCall(): did not find windowId query parameter', uri.toString(true));
                }
            }
        }
        else {
            this.logService.trace('URLHandlerRouter#routeCall() without URI argument');
        }
        return this.next.routeCall(hub, command, arg, cancellationToken);
    }
    routeEvent(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VybC9jb21tb24vdXJsSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUtsRCxNQUFNLE9BQU8saUJBQWlCO0lBRTdCLFlBQW9CLE9BQW9CO1FBQXBCLFlBQU8sR0FBUCxPQUFPLENBQWE7SUFBSSxDQUFDO0lBRTdDLE1BQU0sQ0FBSSxDQUFVLEVBQUUsS0FBYTtRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQzFDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxXQUFXLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUVuQyxZQUFvQixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUksQ0FBQztJQUUxQyxTQUFTLENBQUMsR0FBUSxFQUFFLE9BQXlCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFD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