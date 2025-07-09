/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
export class ExtHostRelatedInformation {
    constructor(mainContext) {
        this._relatedInformationProviders = new Map();
        this._nextHandle = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadAiRelatedInformation);
    }
    async $provideAiRelatedInformation(handle, query, token) {
        if (this._relatedInformationProviders.size === 0) {
            throw new Error('No related information providers registered');
        }
        const provider = this._relatedInformationProviders.get(handle);
        if (!provider) {
            throw new Error('related information provider not found');
        }
        const result = await provider.provideRelatedInformation(query, token) ?? [];
        return result;
    }
    getRelatedInformation(extension, query, types) {
        return this._proxy.$getAiRelatedInformation(query, types);
    }
    registerRelatedInformationProvider(extension, type, provider) {
        const handle = this._nextHandle;
        this._nextHandle++;
        this._relatedInformationProviders.set(handle, provider);
        this._proxy.$registerAiRelatedInformationProvider(handle, type);
        return new Disposable(() => {
            this._proxy.$unregisterAiRelatedInformationProvider(handle);
            this._relatedInformationProviders.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFpUmVsYXRlZEluZm9ybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RBaVJlbGF0ZWRJbmZvcm1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWtELFdBQVcsRUFBdUMsTUFBTSx1QkFBdUIsQ0FBQztBQUV6SSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsTUFBTSxPQUFPLHlCQUF5QjtJQU1yQyxZQUFZLFdBQXlCO1FBTDdCLGlDQUE0QixHQUE0QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2xGLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBS3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsS0FBSyxDQUFDLDRCQUE0QixDQUFDLE1BQWMsRUFBRSxLQUFhLEVBQUUsS0FBd0I7UUFDekYsSUFBSSxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUUsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQscUJBQXFCLENBQUMsU0FBZ0MsRUFBRSxLQUFhLEVBQUUsS0FBK0I7UUFDckcsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsa0NBQWtDLENBQUMsU0FBZ0MsRUFBRSxJQUE0QixFQUFFLFFBQW9DO1FBQ3RJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDaEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxNQUFNLENBQUMscUNBQXFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsdUNBQXVDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9