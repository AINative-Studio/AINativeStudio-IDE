/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { DocumentSelector, Range } from './extHostTypeConverters.js';
import { URI } from '../../../base/common/uri.js';
export class ExtHostShare {
    static { this.handlePool = 0; }
    constructor(mainContext, uriTransformer) {
        this.uriTransformer = uriTransformer;
        this.providers = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadShare);
    }
    async $provideShare(handle, shareableItem, token) {
        const provider = this.providers.get(handle);
        const result = await provider?.provideShare({ selection: Range.to(shareableItem.selection), resourceUri: URI.revive(shareableItem.resourceUri) }, token);
        return result ?? undefined;
    }
    registerShareProvider(selector, provider) {
        const handle = ExtHostShare.handlePool++;
        this.providers.set(handle, provider);
        this.proxy.$registerShareProvider(handle, DocumentSelector.from(selector, this.uriTransformer), provider.id, provider.label, provider.priority);
        return {
            dispose: () => {
                this.proxy.$unregisterShareProvider(handle);
                this.providers.delete(handle);
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNoYXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQXNELFdBQVcsRUFBd0IsTUFBTSx1QkFBdUIsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHckUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUVqRSxNQUFNLE9BQU8sWUFBWTthQUNULGVBQVUsR0FBVyxDQUFDLEFBQVosQ0FBYTtJQUt0QyxZQUNDLFdBQXlCLEVBQ1IsY0FBMkM7UUFBM0MsbUJBQWMsR0FBZCxjQUFjLENBQTZCO1FBSnJELGNBQVMsR0FBc0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQU1oRSxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQWMsRUFBRSxhQUFnQyxFQUFFLEtBQXdCO1FBQzdGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxFQUFFLFlBQVksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6SixPQUFPLE1BQU0sSUFBSSxTQUFTLENBQUM7SUFDNUIsQ0FBQztJQUVELHFCQUFxQixDQUFDLFFBQWlDLEVBQUUsUUFBOEI7UUFDdEYsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hKLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9CLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQyJ9