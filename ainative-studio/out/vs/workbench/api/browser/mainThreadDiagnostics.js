/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
let MainThreadDiagnostics = class MainThreadDiagnostics {
    constructor(extHostContext, _markerService, _uriIdentService) {
        this._markerService = _markerService;
        this._uriIdentService = _uriIdentService;
        this._activeOwners = new Set();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDiagnostics);
        this._markerListener = this._markerService.onMarkerChanged(this._forwardMarkers, this);
    }
    dispose() {
        this._markerListener.dispose();
        this._activeOwners.forEach(owner => this._markerService.changeAll(owner, []));
        this._activeOwners.clear();
    }
    _forwardMarkers(resources) {
        const data = [];
        for (const resource of resources) {
            const allMarkerData = this._markerService.read({ resource });
            if (allMarkerData.length === 0) {
                data.push([resource, []]);
            }
            else {
                const forgeinMarkerData = allMarkerData.filter(marker => !this._activeOwners.has(marker.owner));
                if (forgeinMarkerData.length > 0) {
                    data.push([resource, forgeinMarkerData]);
                }
            }
        }
        if (data.length > 0) {
            this._proxy.$acceptMarkersChange(data);
        }
    }
    $changeMany(owner, entries) {
        for (const entry of entries) {
            const [uri, markers] = entry;
            if (markers) {
                for (const marker of markers) {
                    if (marker.relatedInformation) {
                        for (const relatedInformation of marker.relatedInformation) {
                            relatedInformation.resource = URI.revive(relatedInformation.resource);
                        }
                    }
                    if (marker.code && typeof marker.code !== 'string') {
                        marker.code.target = URI.revive(marker.code.target);
                    }
                }
            }
            this._markerService.changeOne(owner, this._uriIdentService.asCanonicalUri(URI.revive(uri)), markers);
        }
        this._activeOwners.add(owner);
    }
    $clear(owner) {
        this._markerService.changeAll(owner, []);
        this._activeOwners.delete(owner);
    }
};
MainThreadDiagnostics = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDiagnostics),
    __param(1, IMarkerService),
    __param(2, IUriIdentityService)
], MainThreadDiagnostics);
export { MainThreadDiagnostics };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWdub3N0aWNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBZSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUE4QixXQUFXLEVBQTJCLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUU3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUduRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQU9qQyxZQUNDLGNBQStCLEVBQ2YsY0FBK0MsRUFDMUMsZ0JBQXNEO1FBRDFDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXFCO1FBUjNELGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQVVsRCxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFekUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLGVBQWUsQ0FBQyxTQUF5QjtRQUNoRCxNQUFNLElBQUksR0FBcUMsRUFBRSxDQUFDO1FBQ2xELEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzdELElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNoRyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWEsRUFBRSxPQUF5QztRQUNuRSxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQzdCLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzt3QkFDL0IsS0FBSyxNQUFNLGtCQUFrQixJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDOzRCQUM1RCxrQkFBa0IsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDdkUsQ0FBQztvQkFDRixDQUFDO29CQUNELElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQ3BELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckQsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFhO1FBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0NBQ0QsQ0FBQTtBQWpFWSxxQkFBcUI7SUFEakMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDO0lBVXJELFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtHQVZULHFCQUFxQixDQWlFakMifQ==