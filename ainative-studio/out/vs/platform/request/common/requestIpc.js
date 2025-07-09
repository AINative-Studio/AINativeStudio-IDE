/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, streamToBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
export class RequestChannel {
    constructor(service) {
        this.service = service;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    call(context, command, args, token = CancellationToken.None) {
        switch (command) {
            case 'request': return this.service.request(args[0], token)
                .then(async ({ res, stream }) => {
                const buffer = await streamToBuffer(stream);
                return [{ statusCode: res.statusCode, headers: res.headers }, buffer];
            });
            case 'resolveProxy': return this.service.resolveProxy(args[0]);
            case 'lookupAuthorization': return this.service.lookupAuthorization(args[0]);
            case 'lookupKerberosAuthorization': return this.service.lookupKerberosAuthorization(args[0]);
            case 'loadCertificates': return this.service.loadCertificates();
        }
        throw new Error('Invalid call');
    }
}
export class RequestChannelClient {
    constructor(channel) {
        this.channel = channel;
    }
    async request(options, token) {
        const [res, buffer] = await this.channel.call('request', [options], token);
        return { res, stream: bufferToStream(buffer) };
    }
    async resolveProxy(url) {
        return this.channel.call('resolveProxy', [url]);
    }
    async lookupAuthorization(authInfo) {
        return this.channel.call('lookupAuthorization', [authInfo]);
    }
    async lookupKerberosAuthorization(url) {
        return this.channel.call('lookupKerberosAuthorization', [url]);
    }
    async loadCertificates() {
        return this.channel.call('loadCertificates');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdElwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L2NvbW1vbi9yZXF1ZXN0SXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFZLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFjekUsTUFBTSxPQUFPLGNBQWM7SUFFMUIsWUFBNkIsT0FBd0I7UUFBeEIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7SUFBSSxDQUFDO0lBRTFELE1BQU0sQ0FBQyxPQUFZLEVBQUUsS0FBYTtRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFZLEVBQUUsT0FBZSxFQUFFLElBQVUsRUFBRSxRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBQ2hHLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxTQUFTLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7aUJBQ3pELElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDL0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzVDLE9BQXdCLENBQUMsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLENBQUMsQ0FBQyxDQUFDO1lBQ0osS0FBSyxjQUFjLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELEtBQUsscUJBQXFCLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0UsS0FBSyw2QkFBNkIsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RixLQUFLLGtCQUFrQixDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakUsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFvQjtJQUloQyxZQUE2QixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUksQ0FBQztJQUVuRCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQXdCLEVBQUUsS0FBd0I7UUFDL0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFrQixTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQXFCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFrQjtRQUMzQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFxRCxxQkFBcUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDakgsQ0FBQztJQUVELEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxHQUFXO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQXFCLDZCQUE2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQjtRQUNyQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFXLGtCQUFrQixDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUNEIn0=