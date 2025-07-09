/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { extractLocalHostUriMetaDataForPortMapping } from '../../tunnel/common/tunnel.js';
/**
 * Manages port mappings for a single webview.
 */
export class WebviewPortMappingManager {
    constructor(_getExtensionLocation, _getMappings, tunnelService) {
        this._getExtensionLocation = _getExtensionLocation;
        this._getMappings = _getMappings;
        this.tunnelService = tunnelService;
        this._tunnels = new Map();
    }
    async getRedirect(resolveAuthority, url) {
        const uri = URI.parse(url);
        const requestLocalHostInfo = extractLocalHostUriMetaDataForPortMapping(uri);
        if (!requestLocalHostInfo) {
            return undefined;
        }
        for (const mapping of this._getMappings()) {
            if (mapping.webviewPort === requestLocalHostInfo.port) {
                const extensionLocation = this._getExtensionLocation();
                if (extensionLocation && extensionLocation.scheme === Schemas.vscodeRemote) {
                    const tunnel = resolveAuthority && await this.getOrCreateTunnel(resolveAuthority, mapping.extensionHostPort);
                    if (tunnel) {
                        if (tunnel.tunnelLocalPort === mapping.webviewPort) {
                            return undefined;
                        }
                        return encodeURI(uri.with({
                            authority: `127.0.0.1:${tunnel.tunnelLocalPort}`,
                        }).toString(true));
                    }
                }
                if (mapping.webviewPort !== mapping.extensionHostPort) {
                    return encodeURI(uri.with({
                        authority: `${requestLocalHostInfo.address}:${mapping.extensionHostPort}`
                    }).toString(true));
                }
            }
        }
        return undefined;
    }
    async dispose() {
        for (const tunnel of this._tunnels.values()) {
            await tunnel.dispose();
        }
        this._tunnels.clear();
    }
    async getOrCreateTunnel(remoteAuthority, remotePort) {
        const existing = this._tunnels.get(remotePort);
        if (existing) {
            return existing;
        }
        const tunnelOrError = await this.tunnelService.openTunnel({ getAddress: async () => remoteAuthority }, undefined, remotePort);
        let tunnel;
        if (typeof tunnelOrError === 'string') {
            tunnel = undefined;
        }
        if (tunnel) {
            this._tunnels.set(remotePort, tunnel);
        }
        return tunnel;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1BvcnRNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYnZpZXcvY29tbW9uL3dlYnZpZXdQb3J0TWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSx5Q0FBeUMsRUFBZ0MsTUFBTSwrQkFBK0IsQ0FBQztBQU94SDs7R0FFRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFJckMsWUFDa0IscUJBQTRDLEVBQzVDLFlBQWtELEVBQ2xELGFBQTZCO1FBRjdCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsaUJBQVksR0FBWixZQUFZLENBQXNDO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUw5QixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7SUFNeEQsQ0FBQztJQUVFLEtBQUssQ0FBQyxXQUFXLENBQUMsZ0JBQTZDLEVBQUUsR0FBVztRQUNsRixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sb0JBQW9CLEdBQUcseUNBQXlDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLGlCQUFpQixJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQzVFLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixJQUFJLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO29CQUM3RyxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7NEJBQ3BELE9BQU8sU0FBUyxDQUFDO3dCQUNsQixDQUFDO3dCQUNELE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7NEJBQ3pCLFNBQVMsRUFBRSxhQUFhLE1BQU0sQ0FBQyxlQUFlLEVBQUU7eUJBQ2hELENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDcEIsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksT0FBTyxDQUFDLFdBQVcsS0FBSyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkQsT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzt3QkFDekIsU0FBUyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtxQkFDekUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU87UUFDWixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUM3QyxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQXlCLEVBQUUsVUFBa0I7UUFDNUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlILElBQUksTUFBZ0MsQ0FBQztRQUNyQyxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEIn0=