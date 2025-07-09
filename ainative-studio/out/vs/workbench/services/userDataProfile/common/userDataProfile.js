/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUndefined } from '../../../../base/common/types.js';
import { localize, localize2 } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
export const IUserDataProfileService = createDecorator('IUserDataProfileService');
export const IUserDataProfileManagementService = createDecorator('IUserDataProfileManagementService');
export function isUserDataProfileTemplate(thing) {
    const candidate = thing;
    return !!(candidate && typeof candidate === 'object'
        && (isUndefined(candidate.settings) || typeof candidate.settings === 'string')
        && (isUndefined(candidate.globalState) || typeof candidate.globalState === 'string')
        && (isUndefined(candidate.extensions) || typeof candidate.extensions === 'string'));
}
export const PROFILE_URL_AUTHORITY = 'profile';
export function toUserDataProfileUri(path, productService) {
    return URI.from({
        scheme: productService.urlProtocol,
        authority: PROFILE_URL_AUTHORITY,
        path: path.startsWith('/') ? path : `/${path}`
    });
}
export const PROFILE_URL_AUTHORITY_PREFIX = 'profile-';
export function isProfileURL(uri) {
    return uri.authority === PROFILE_URL_AUTHORITY || new RegExp(`^${PROFILE_URL_AUTHORITY_PREFIX}`).test(uri.authority);
}
export const IUserDataProfileImportExportService = createDecorator('IUserDataProfileImportExportService');
export const defaultUserDataProfileIcon = registerIcon('defaultProfile-icon', Codicon.settings, localize('defaultProfileIcon', 'Icon for Default Profile.'));
export const PROFILES_TITLE = localize2('profiles', 'Profiles');
export const PROFILES_CATEGORY = { ...PROFILES_TITLE };
export const PROFILE_EXTENSION = 'code-profile';
export const PROFILE_FILTER = [{ name: localize('profile', "Profile"), extensions: [PROFILE_EXTENSION] }];
export const CURRENT_PROFILE_CONTEXT = new RawContextKey('currentProfile', '');
export const IS_CURRENT_PROFILE_TRANSIENT_CONTEXT = new RawContextKey('isCurrentProfileTransient', false);
export const HAS_PROFILES_CONTEXT = new RawContextKey('hasProfiles', false);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBWTlELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FBMEIseUJBQXlCLENBQUMsQ0FBQztBQWEzRyxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLG1DQUFtQyxDQUFDLENBQUM7QUF5QnpJLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFjO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLEtBQTZDLENBQUM7SUFFaEUsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUTtXQUNoRCxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztXQUMzRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQztXQUNqRixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFNBQVMsQ0FBQztBQUMvQyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWSxFQUFFLGNBQStCO0lBQ2pGLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSxjQUFjLENBQUMsV0FBVztRQUNsQyxTQUFTLEVBQUUscUJBQXFCO1FBQ2hDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFO0tBQzlDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxVQUFVLENBQUM7QUFDdkQsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFRO0lBQ3BDLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxxQkFBcUIsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLDRCQUE0QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RILENBQUM7QUFhRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUM7QUFnRC9JLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLENBQUM7QUFFN0osTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDaEUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFDO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQztBQUNoRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFTLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZGLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFVLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ25ILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLElBQUksYUFBYSxDQUFVLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQyJ9