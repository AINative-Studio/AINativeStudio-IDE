/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TelemetryAppenderChannel {
    constructor(appenders) {
        this.appenders = appenders;
    }
    listen(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, { eventName, data }) {
        this.appenders.forEach(a => a.log(eventName, data));
        return Promise.resolve(null);
    }
}
export class TelemetryAppenderClient {
    constructor(channel) {
        this.channel = channel;
    }
    log(eventName, data) {
        this.channel.call('log', { eventName, data })
            .then(undefined, err => `Failed to log telemetry: ${console.warn(err)}`);
        return Promise.resolve(null);
    }
    flush() {
        // TODO
        return Promise.resolve();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5SXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5SXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE1BQU0sT0FBTyx3QkFBd0I7SUFFcEMsWUFBb0IsU0FBK0I7UUFBL0IsY0FBUyxHQUFULFNBQVMsQ0FBc0I7SUFBSSxDQUFDO0lBRXhELE1BQU0sQ0FBSSxDQUFVLEVBQUUsS0FBYTtRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQWlCO1FBQ25FLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUVuQyxZQUFvQixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUksQ0FBQztJQUUxQyxHQUFHLENBQUMsU0FBaUIsRUFBRSxJQUFVO1FBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUMzQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsNEJBQTRCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87UUFDUCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0QifQ==