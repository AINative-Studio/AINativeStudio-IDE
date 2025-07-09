/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse as parseUrl } from 'url';
import { isBoolean } from '../../../base/common/types.js';
function getSystemProxyURI(requestURL, env) {
    if (requestURL.protocol === 'http:') {
        return env.HTTP_PROXY || env.http_proxy || null;
    }
    else if (requestURL.protocol === 'https:') {
        return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || null;
    }
    return null;
}
export async function getProxyAgent(rawRequestURL, env, options = {}) {
    const requestURL = parseUrl(rawRequestURL);
    const proxyURL = options.proxyUrl || getSystemProxyURI(requestURL, env);
    if (!proxyURL) {
        return null;
    }
    const proxyEndpoint = parseUrl(proxyURL);
    if (!/^https?:$/.test(proxyEndpoint.protocol || '')) {
        return null;
    }
    const opts = {
        host: proxyEndpoint.hostname || '',
        port: (proxyEndpoint.port ? +proxyEndpoint.port : 0) || (proxyEndpoint.protocol === 'https' ? 443 : 80),
        auth: proxyEndpoint.auth,
        rejectUnauthorized: isBoolean(options.strictSSL) ? options.strictSSL : true,
    };
    if (requestURL.protocol === 'http:') {
        const { default: mod } = await import('http-proxy-agent');
        return new mod.HttpProxyAgent(proxyURL, opts);
    }
    else {
        const { default: mod } = await import('https-proxy-agent');
        return new mod.HttpsProxyAgent(proxyURL, opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC9ub2RlL3Byb3h5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLElBQUksUUFBUSxFQUFPLE1BQU0sS0FBSyxDQUFDO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUkxRCxTQUFTLGlCQUFpQixDQUFDLFVBQWUsRUFBRSxHQUF1QjtJQUNsRSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDckMsT0FBTyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDO0lBQ2pELENBQUM7U0FBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDN0MsT0FBTyxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztJQUN2RixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBT0QsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQUMsYUFBcUIsRUFBRSxHQUF1QixFQUFFLFVBQW9CLEVBQUU7SUFDekcsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLElBQUksaUJBQWlCLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXhFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV6QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDckQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxJQUFJLEdBQUc7UUFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLFFBQVEsSUFBSSxFQUFFO1FBQ2xDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdkcsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJO1FBQ3hCLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUk7S0FDM0UsQ0FBQztJQUVGLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNyQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsT0FBTyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9DLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNELE9BQU8sSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRCxDQUFDO0FBQ0YsQ0FBQyJ9