/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import { URI } from '../../../base/common/uri.js';
import { Disposable } from './extHostTypes.js';
import { MainContext } from './extHost.protocol.js';
import { Schemas } from '../../../base/common/network.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { splitLines } from '../../../base/common/strings.js';
export class ExtHostDocumentContentProvider {
    static { this._handlePool = 0; }
    constructor(mainContext, _documentsAndEditors, _logService) {
        this._documentsAndEditors = _documentsAndEditors;
        this._logService = _logService;
        this._documentContentProviders = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadDocumentContentProviders);
    }
    registerTextDocumentContentProvider(scheme, provider) {
        // todo@remote
        // check with scheme from fs-providers!
        if (Object.keys(Schemas).indexOf(scheme) >= 0) {
            throw new Error(`scheme '${scheme}' already registered`);
        }
        const handle = ExtHostDocumentContentProvider._handlePool++;
        this._documentContentProviders.set(handle, provider);
        this._proxy.$registerTextContentProvider(handle, scheme);
        let subscription;
        if (typeof provider.onDidChange === 'function') {
            let lastEvent;
            subscription = provider.onDidChange(async (uri) => {
                if (uri.scheme !== scheme) {
                    this._logService.warn(`Provider for scheme '${scheme}' is firing event for schema '${uri.scheme}' which will be IGNORED`);
                    return;
                }
                if (!this._documentsAndEditors.getDocument(uri)) {
                    // ignore event if document isn't open
                    return;
                }
                if (lastEvent) {
                    await lastEvent;
                }
                const thisEvent = this.$provideTextDocumentContent(handle, uri)
                    .then(async (value) => {
                    if (!value && typeof value !== 'string') {
                        return;
                    }
                    const document = this._documentsAndEditors.getDocument(uri);
                    if (!document) {
                        // disposed in the meantime
                        return;
                    }
                    // create lines and compare
                    const lines = splitLines(value);
                    // broadcast event when content changed
                    if (!document.equalLines(lines)) {
                        return this._proxy.$onVirtualDocumentChange(uri, value);
                    }
                })
                    .catch(onUnexpectedError)
                    .finally(() => {
                    if (lastEvent === thisEvent) {
                        lastEvent = undefined;
                    }
                });
                lastEvent = thisEvent;
            });
        }
        return new Disposable(() => {
            if (this._documentContentProviders.delete(handle)) {
                this._proxy.$unregisterTextContentProvider(handle);
            }
            if (subscription) {
                subscription.dispose();
                subscription = undefined;
            }
        });
    }
    $provideTextDocumentContent(handle, uri) {
        const provider = this._documentContentProviders.get(handle);
        if (!provider) {
            return Promise.reject(new Error(`unsupported uri-scheme: ${uri.scheme}`));
        }
        return Promise.resolve(provider.provideTextDocumentContent(URI.revive(uri), CancellationToken.None));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RG9jdW1lbnRDb250ZW50UHJvdmlkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxXQUFXLEVBQStGLE1BQU0sdUJBQXVCLENBQUM7QUFFakosT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxNQUFNLE9BQU8sOEJBQThCO2FBRTNCLGdCQUFXLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFLL0IsWUFDQyxXQUF5QixFQUNSLG9CQUFnRCxFQUNoRCxXQUF3QjtRQUR4Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTRCO1FBQ2hELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTnpCLDhCQUF5QixHQUFHLElBQUksR0FBRyxFQUE4QyxDQUFDO1FBUWxHLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsbUNBQW1DLENBQUMsTUFBYyxFQUFFLFFBQTRDO1FBQy9GLGNBQWM7UUFDZCx1Q0FBdUM7UUFDdkMsSUFBSSxN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