/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IMultiDiffSourceResolverService = createDecorator('multiDiffSourceResolverService');
export class MultiDiffEditorItem {
    constructor(originalUri, modifiedUri, goToFileUri, contextKeys) {
        this.originalUri = originalUri;
        this.modifiedUri = modifiedUri;
        this.goToFileUri = goToFileUri;
        this.contextKeys = contextKeys;
        if (!originalUri && !modifiedUri) {
            throw new BugIndicatingError('Invalid arguments');
        }
    }
    getKey() {
        return JSON.stringify([this.modifiedUri?.toString(), this.originalUri?.toString()]);
    }
}
export class MultiDiffSourceResolverService {
    constructor() {
        this._resolvers = new Set();
    }
    registerResolver(resolver) {
        // throw on duplicate
        if (this._resolvers.has(resolver)) {
            throw new BugIndicatingError('Duplicate resolver');
        }
        this._resolvers.add(resolver);
        return toDisposable(() => this._resolvers.delete(resolver));
    }
    resolve(uri) {
        for (const resolver of this._resolvers) {
            if (resolver.canHandleUri(uri)) {
                return resolver.resolveDiffSource(uri);
            }
        }
        return Promise.resolve(undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmU291cmNlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL211bHRpRGlmZlNvdXJjZVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV2RSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FBa0MsZ0NBQWdDLENBQUMsQ0FBQztBQXFCbEksTUFBTSxPQUFPLG1CQUFtQjtJQUMvQixZQUNVLFdBQTRCLEVBQzVCLFdBQTRCLEVBQzVCLFdBQTRCLEVBQzVCLFdBQTZDO1FBSDdDLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtRQUM1QixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDNUIsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFrQztRQUV0RCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sOEJBQThCO0lBQTNDO1FBR2tCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztJQW1CbkUsQ0FBQztJQWpCQSxnQkFBZ0IsQ0FBQyxRQUFrQztRQUNsRCxxQkFBcUI7UUFDckIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxPQUFPLENBQUMsR0FBUTtRQUNmLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hDLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0QifQ==