/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
export function getRemoteAuthority(uri) {
    return uri.scheme === Schemas.vscodeRemote ? uri.authority : undefined;
}
export function getRemoteName(authority) {
    if (!authority) {
        return undefined;
    }
    const pos = authority.indexOf('+');
    if (pos < 0) {
        // e.g. localhost:8000
        return authority;
    }
    return authority.substr(0, pos);
}
export function parseAuthorityWithPort(authority) {
    const { host, port } = parseAuthority(authority);
    if (typeof port === 'undefined') {
        throw new Error(`Invalid remote authority: ${authority}. It must either be a remote of form <remoteName>+<arg> or a remote host of form <host>:<port>.`);
    }
    return { host, port };
}
export function parseAuthorityWithOptionalPort(authority, defaultPort) {
    let { host, port } = parseAuthority(authority);
    if (typeof port === 'undefined') {
        port = defaultPort;
    }
    return { host, port };
}
function parseAuthority(authority) {
    // check for ipv6 with port
    const m1 = authority.match(/^(\[[0-9a-z:]+\]):(\d+)$/);
    if (m1) {
        return { host: m1[1], port: parseInt(m1[2], 10) };
    }
    // check for ipv6 without port
    const m2 = authority.match(/^(\[[0-9a-z:]+\])$/);
    if (m2) {
        return { host: m2[1], port: undefined };
    }
    // anything with a trailing port
    const m3 = authority.match(/(.*):(\d+)$/);
    if (m3) {
        return { host: m3[1], port: parseInt(m3[2], 10) };
    }
    // doesn't contain a port
    return { host: authority, port: undefined };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9yZW1vdGVIb3N0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHMUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVE7SUFDMUMsT0FBTyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN4RSxDQUFDO0FBS0QsTUFBTSxVQUFVLGFBQWEsQ0FBQyxTQUE2QjtJQUMxRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDYixzQkFBc0I7UUFDdEIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDakMsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxTQUFpQjtJQUN2RCxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLFNBQVMsaUdBQWlHLENBQUMsQ0FBQztJQUMxSixDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLFNBQWlCLEVBQUUsV0FBbUI7SUFDcEYsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0MsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNqQyxJQUFJLEdBQUcsV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxTQUFpQjtJQUN4QywyQkFBMkI7SUFDM0IsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3ZELElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2pELElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzFDLElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFRCx5QkFBeUI7SUFDekIsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQzdDLENBQUMifQ==