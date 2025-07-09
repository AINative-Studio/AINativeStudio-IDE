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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9yZXF1ZXN0L2NvbW1vbi9yZXF1ZXN0SW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQThDLFlBQVksRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV4RixNQUFNLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxPQUF3QixFQUFFLEtBQXdCLEVBQUUsUUFBd0I7SUFDekcsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLFFBQVEsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzNDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM3RSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO1FBQ2hELFlBQVksQ0FBQyxNQUFNO1FBQ25CLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztLQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7SUFFekIsSUFBSSxDQUFDO1FBQ0osTUFBTSxTQUFTLEdBQWdCO1lBQzlCLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLEtBQUs7WUFDN0IsT0FBTyxFQUFFLGlCQUFp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