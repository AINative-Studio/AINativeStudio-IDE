/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
export class ExtHostUriOpeners {
    static { this.supportedSchemes = new Set([Schemas.http, Schemas.https]); }
    constructor(mainContext) {
        this._openers = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadUriOpeners);
    }
    registerExternalUriOpener(extensionId, id, opener, metadata) {
        if (this._openers.has(id)) {
            throw new Error(`Opener with id '${id}' already registered`);
        }
        const invalidScheme = metadata.schemes.find(scheme => !ExtHostUriOpeners.supportedSchemes.has(scheme));
        if (invalidScheme) {
            throw new Error(`Scheme '${invalidScheme}' is not supported. Only http and https are currently supported.`);
        }
        this._openers.set(id, opener);
        this._proxy.$registerUriOpener(id, metadata.schemes, extensionId, metadata.label);
        return toDisposable(() => {
            this._openers.delete(id);
            this._proxy.$unregisterUriOpener(id);
        });
    }
    async $canOpenUri(id, uriComponents, token) {
        const opener = this._openers.get(id);
        if (!opener) {
            throw new Error(`Unknown opener with id: ${id}`);
        }
        const uri = URI.revive(uriComponents);
        return opener.canOpenExternalUri(uri, token);
    }
    async $openUri(id, context, token) {
        const opener = this._openers.get(id);
        if (!opener) {
            throw new Error(`Unknown opener id: '${id}'`);
        }
        return opener.openExternalUri(URI.revive(context.resolvedUri), {
            sourceUri: URI.revive(context.sourceUri)
        }, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFVyaU9wZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VXJpT3BlbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUlqRSxPQUFPLEVBQXdDLFdBQVcsRUFBNkIsTUFBTSx1QkFBdUIsQ0FBQztBQUdySCxNQUFNLE9BQU8saUJBQWlCO2FBRUwscUJBQWdCLEdBQUcsSUFBSSxHQUFHLENBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxBQUFqRCxDQUFrRDtJQU0xRixZQUNDLFdBQXlCO1FBSFQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBS3ZFLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQseUJBQXlCLENBQ3hCLFdBQWdDLEVBQ2hDLEVBQVUsRUFDVixNQUFnQyxFQUNoQyxRQUEwQztRQUUxQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdkcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsYUFBYSxrRUFBa0UsQ0FBQyxDQUFDO1FBQzdHLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWxGLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBVSxFQUFFLGFBQTRCLEVBQUUsS0FBd0I7UUFDbkYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0QyxPQUFPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBVSxFQUFFLE9BQWlFLEVBQUUsS0FBd0I7UUFDckgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzlELFNBQVMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDeEMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNYLENBQUMifQ==