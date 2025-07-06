/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, VSBuffer } from '../../../common/buffer.js';
import { canceled } from '../../../common/errors.js';
import { OfflineError } from './request.js';
export async function request(options, token, isOnline) {
    if (token.isCancellationRequested) {
        throw canceled();
    }
    const cancellation = new AbortController();
    const disposable = token.onCancellationRequested(() => cancellation.abort());
    const signal = options.timeout ? AbortSignal.any([
        cancellation.signal,
        AbortSignal.timeout(options.timeout),
    ]) : cancellation.signal;
    try {
        const fetchInit = {
            method: options.type || 'GET',
            headers: getRequestHeaders(options),
            body: options.data,
            signal
        };
        if (options.disableCache) {
            fetchInit.cache = 'no-store';
        }
        const res = await fetch(options.url || '', fetchInit);
        return {
            res: {
                statusCode: res.status,
                headers: getResponseHeaders(res),
            },
            stream: bufferToStream(VSBuffer.wrap(new Uint8Array(await res.arrayBuffer()))),
        };
    }
    catch (err) {
        if (isOnline && !isOnline()) {
            throw new OfflineError();
        }
        if (err?.name === 'AbortError') {
            throw canceled();
        }
        if (err?.name === 'TimeoutError') {
            throw new Error(`Fetch timeout: ${options.timeout}ms`);
        }
        throw err;
    }
    finally {
        disposable.dispose();
    }
}
function getRequestHeaders(options) {
    if (options.headers || options.user || options.password || options.proxyAuthorization) {
        const headers = new Headers();
        outer: for (const k in options.headers) {
            switch (k.toLowerCase()) {
                case 'user-agent':
                case 'accept-encoding':
                case 'content-length':
                    // unsafe headers
                    continue outer;
            }
            const header = options.headers[k];
            if (typeof header === 'string') {
                headers.set(k, header);
            }
            else if (Array.isArray(header)) {
                for (const h of header) {
                    headers.append(k, h);
                }
            }
        }
        if (options.user || options.password) {
            headers.set('Authorization', 'Basic ' + btoa(`${options.user || ''}:${options.password || ''}`));
        }
        if (options.proxyAuthorization) {
            headers.set('Proxy-Authorization', options.proxyAuthorization);
        }
        return headers;
    }
    return undefined;
}
function getResponseHeaders(res) {
    const headers = Object.create(null);
    res.headers.forEach((value, key) => {
        if (headers[key]) {
            if (Array.isArray(headers[key])) {
                headers[key].push(value);
            }
            else {
                headers[key] = [headers[key], value];
            }
        }
        else {
            headers[key] = value;
        }
    });
    return headers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvcmVxdWVzdC9jb21tb24vcmVxdWVzdEltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUE4QyxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFeEYsTUFBTSxDQUFDLEtBQUssVUFBVSxPQUFPLENBQUMsT0FBd0IsRUFBRSxLQUF3QixFQUFFLFFBQXdCO0lBQ3pHLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMzQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDN0UsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztRQUNoRCxZQUFZLENBQUMsTUFBTTtRQUNuQixXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7S0FDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBRXpCLElBQUksQ0FBQztRQUNKLE1BQU0sU0FBUyxHQUFnQjtZQUM5QixNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxLQUFLO1lBQzdCLE9BQU8sRUFBRSxp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