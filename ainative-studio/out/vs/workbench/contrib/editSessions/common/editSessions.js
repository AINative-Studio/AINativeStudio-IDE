/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { StringSHA1 } from '../../../../base/common/hash.js';
export const EDIT_SESSION_SYNC_CATEGORY = localize2('cloud changes', 'Cloud Changes');
export const IEditSessionsStorageService = createDecorator('IEditSessionsStorageService');
export const IEditSessionsLogService = createDecorator('IEditSessionsLogService');
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Addition"] = 1] = "Addition";
    ChangeType[ChangeType["Deletion"] = 2] = "Deletion";
})(ChangeType || (ChangeType = {}));
export var FileType;
(function (FileType) {
    FileType[FileType["File"] = 1] = "File";
})(FileType || (FileType = {}));
export const EditSessionSchemaVersion = 3;
export const EDIT_SESSIONS_SIGNED_IN_KEY = 'editSessionsSignedIn';
export const EDIT_SESSIONS_SIGNED_IN = new RawContextKey(EDIT_SESSIONS_SIGNED_IN_KEY, false);
export const EDIT_SESSIONS_PENDING_KEY = 'editSessionsPending';
export const EDIT_SESSIONS_PENDING = new RawContextKey(EDIT_SESSIONS_PENDING_KEY, false);
export const EDIT_SESSIONS_CONTAINER_ID = 'workbench.view.editSessions';
export const EDIT_SESSIONS_DATA_VIEW_ID = 'workbench.views.editSessions.data';
export const EDIT_SESSIONS_TITLE = localize2('cloud changes', 'Cloud Changes');
export const EDIT_SESSIONS_VIEW_ICON = registerIcon('edit-sessions-view-icon', Codicon.cloudDownload, localize('editSessionViewIcon', 'View icon of the cloud changes view.'));
export const EDIT_SESSIONS_SHOW_VIEW = new RawContextKey('editSessionsShowView', false);
export const EDIT_SESSIONS_SCHEME = 'vscode-edit-sessions';
export function decodeEditSessionFileContent(version, content) {
    switch (version) {
        case 1:
            return VSBuffer.fromString(content);
        case 2:
            return decodeBase64(content);
        default:
            throw new Error('Upgrade to a newer version to decode this content.');
    }
}
export function hashedEditSessionId(editSessionId) {
    const sha1 = new StringSHA1();
    sha1.update(editSessionId);
    return sha1.digest();
}
export const editSessionsLogId = 'editSessions';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9jb21tb24vZWRpdFNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRzdELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFJdEYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUE4Qiw2QkFBNkIsQ0FBQyxDQUFDO0FBdUJ2SCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLHlCQUF5QixDQUFDLENBQUM7QUFHM0csTUFBTSxDQUFOLElBQVksVUFHWDtBQUhELFdBQVksVUFBVTtJQUNyQixtREFBWSxDQUFBO0lBQ1osbURBQVksQ0FBQTtBQUNiLENBQUMsRUFIVyxVQUFVLEtBQVYsVUFBVSxRQUdyQjtBQUVELE1BQU0sQ0FBTixJQUFZLFFBRVg7QUFGRCxXQUFZLFFBQVE7SUFDbkIsdUNBQVEsQ0FBQTtBQUNULENBQUMsRUFGVyxRQUFRLEtBQVIsUUFBUSxRQUVuQjtBQXlCRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLENBQUM7QUFTMUMsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsc0JBQXNCLENBQUM7QUFDbEUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQVUsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFdEcsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcscUJBQXFCLENBQUM7QUFDL0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxhQUFhLENBQVUseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFbEcsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsNkJBQTZCLENBQUM7QUFDeEUsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsbUNBQW1DLENBQUM7QUFDOUUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQXFCLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFFakcsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsWUFBWSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUvSyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUVqRyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztBQUUzRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsT0FBZSxFQUFFLE9BQWU7SUFDNUUsUUFBUSxPQUFPLEVBQUUsQ0FBQztRQUNqQixLQUFLLENBQUM7WUFDTCxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsS0FBSyxDQUFDO1lBQ0wsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUI7WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7SUFDeEUsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsYUFBcUI7SUFDeEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQUMifQ==