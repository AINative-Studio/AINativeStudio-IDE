/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ICanonicalUriService } from '../../../../platform/workspace/common/canonicalUri.js';
export class CanonicalUriService {
    constructor() {
        this._providers = new Map();
    }
    registerCanonicalUriProvider(provider) {
        this._providers.set(provider.scheme, provider);
        return {
            dispose: () => this._providers.delete(provider.scheme)
        };
    }
    async provideCanonicalUri(uri, targetScheme, token) {
        const provider = this._providers.get(uri.scheme);
        if (provider) {
            return provider.provideCanonicalUri(uri, targetScheme, token);
        }
        return undefined;
    }
}
registerSingleton(ICanonicalUriService, CanonicalUriService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Fub25pY2FsVXJpU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9jb21tb24vY2Fub25pY2FsVXJpU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLG9CQUFvQixFQUF5QixNQUFNLHVEQUF1RCxDQUFDO0FBRXBILE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFHa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO0lBZ0J4RSxDQUFDO0lBZEEsNEJBQTRCLENBQUMsUUFBK0I7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEQsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBUSxFQUFFLFlBQW9CLEVBQUUsS0FBd0I7UUFDakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsb0NBQTRCLENBQUMifQ==