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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX } from '../../../../platform/accessibility/common/accessibility.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IAccessibleViewInformationService = createDecorator('accessibleViewInformationService');
let AccessibleViewInformationService = class AccessibleViewInformationService extends Disposable {
    constructor(_storageService) {
        super();
        this._storageService = _storageService;
    }
    hasShownAccessibleView(viewId) {
        return this._storageService.getBoolean(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${viewId}`, -1 /* StorageScope.APPLICATION */, false) === true;
    }
};
AccessibleViewInformationService = __decorate([
    __param(0, IStorageService)
], AccessibleViewInformationService);
export { AccessibleViewInformationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdJbmZvcm1hdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjY2Vzc2liaWxpdHkvY29tbW9uL2FjY2Vzc2libGVWaWV3SW5mb3JtYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQU8vRixNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLGtDQUFrQyxDQUFDLENBQUM7QUFFakksSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO0lBRS9ELFlBQThDLGVBQWdDO1FBQzdFLEtBQUssRUFBRSxDQUFDO1FBRHFDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtJQUU5RSxDQUFDO0lBQ0Qsc0JBQXNCLENBQUMsTUFBYztRQUNwQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEdBQUcsb0NBQW9DLEdBQUcsTUFBTSxFQUFFLHFDQUE0QixLQUFLLENBQUMsS0FBSyxJQUFJLENBQUM7SUFDdEksQ0FBQztDQUNELENBQUE7QUFSWSxnQ0FBZ0M7SUFFL0IsV0FBQSxlQUFlLENBQUE7R0FGaEIsZ0NBQWdDLENBUTVDIn0=