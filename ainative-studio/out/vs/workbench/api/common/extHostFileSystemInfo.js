/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { ExtUri } from '../../../base/common/resources.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostFileSystemInfo {
    constructor() {
        this._systemSchemes = new Set(Object.keys(Schemas));
        this._providerInfo = new Map();
        this.extUri = new ExtUri(uri => {
            const capabilities = this._providerInfo.get(uri.scheme);
            if (capabilities === undefined) {
                // default: not ignore
                return false;
            }
            if (capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */) {
                // configured as case sensitive
                return false;
            }
            return true;
        });
    }
    $acceptProviderInfos(uri, capabilities) {
        if (capabilities === null) {
            this._providerInfo.delete(uri.scheme);
        }
        else {
            this._providerInfo.set(uri.scheme, capabilities);
        }
    }
    isFreeScheme(scheme) {
        return !this._providerInfo.has(scheme) && !this._systemSchemes.has(scheme);
    }
    getCapabilities(scheme) {
        return this._providerInfo.get(scheme);
    }
}
export const IExtHostFileSystemInfo = createDecorator('IExtHostFileSystemInfo');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1JbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RGaWxlU3lzdGVtSW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG1DQUFtQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUcxRixNQUFNLE9BQU8scUJBQXFCO0lBU2pDO1FBTGlCLG1CQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9DLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFLMUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM5QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLHNCQUFzQjtnQkFDdEIsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBQ0QsSUFBSSxZQUFZLDhEQUFtRCxFQUFFLENBQUM7Z0JBQ3JFLCtCQUErQjtnQkFDL0IsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxHQUFrQixFQUFFLFlBQTJCO1FBQ25FLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYztRQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsZUFBZSxDQUFDLE1BQWM7UUFDN0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Q7QUFLRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUMifQ==