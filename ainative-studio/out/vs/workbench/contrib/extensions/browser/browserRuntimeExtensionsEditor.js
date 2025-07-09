/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractRuntimeExtensionsEditor } from './abstractRuntimeExtensionsEditor.js';
import { ReportExtensionIssueAction } from '../common/reportExtensionIssueAction.js';
export class RuntimeExtensionsEditor extends AbstractRuntimeExtensionsEditor {
    _getProfileInfo() {
        return null;
    }
    _getUnresponsiveProfile(extensionId) {
        return undefined;
    }
    _createSlowExtensionAction(element) {
        return null;
    }
    _createReportExtensionIssueAction(element) {
        if (element.marketplaceInfo) {
            return this._instantiationService.createInstance(ReportExtensionIssueAction, element.description);
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclJ1bnRpbWVFeHRlbnNpb25zRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9icm93c2VyUnVudGltZUV4dGVuc2lvbnNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLCtCQUErQixFQUFxQixNQUFNLHNDQUFzQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSwrQkFBK0I7SUFFakUsZUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFUyx1QkFBdUIsQ0FBQyxXQUFnQztRQUNqRSxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRVMsMEJBQTBCLENBQUMsT0FBMEI7UUFDOUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRVMsaUNBQWlDLENBQUMsT0FBMEI7UUFDckUsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuRyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==