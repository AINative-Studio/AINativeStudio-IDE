/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IEncryptionService = createDecorator('encryptionService');
export const IEncryptionMainService = createDecorator('encryptionMainService');
// The values provided to the `password-store` command line switch.
// Notice that they are not the same as the values returned by
// `getSelectedStorageBackend` in the `safeStorage` API.
export var PasswordStoreCLIOption;
(function (PasswordStoreCLIOption) {
    PasswordStoreCLIOption["kwallet"] = "kwallet";
    PasswordStoreCLIOption["kwallet5"] = "kwallet5";
    PasswordStoreCLIOption["gnomeLibsecret"] = "gnome-libsecret";
    PasswordStoreCLIOption["basic"] = "basic";
})(PasswordStoreCLIOption || (PasswordStoreCLIOption = {}));
// The values returned by `getSelectedStorageBackend` in the `safeStorage` API.
export var KnownStorageProvider;
(function (KnownStorageProvider) {
    KnownStorageProvider["unknown"] = "unknown";
    KnownStorageProvider["basicText"] = "basic_text";
    // Linux
    KnownStorageProvider["gnomeAny"] = "gnome_any";
    KnownStorageProvider["gnomeLibsecret"] = "gnome_libsecret";
    KnownStorageProvider["gnomeKeyring"] = "gnome_keyring";
    KnownStorageProvider["kwallet"] = "kwallet";
    KnownStorageProvider["kwallet5"] = "kwallet5";
    KnownStorageProvider["kwallet6"] = "kwallet6";
    // The rest of these are not returned by `getSelectedStorageBackend`
    // but these were added for platform completeness.
    // Windows
    KnownStorageProvider["dplib"] = "dpapi";
    // macOS
    KnownStorageProvider["keychainAccess"] = "keychain_access";
})(KnownStorageProvider || (KnownStorageProvider = {}));
export function isKwallet(backend) {
    return backend === "kwallet" /* KnownStorageProvider.kwallet */
        || backend === "kwallet5" /* KnownStorageProvider.kwallet5 */
        || backend === "kwallet6" /* KnownStorageProvider.kwallet6 */;
}
export function isGnome(backend) {
    return backend === "gnome_any" /* KnownStorageProvider.gnomeAny */
        || backend === "gnome_libsecret" /* KnownStorageProvider.gnomeLibsecret */
        || backend === "gnome_keyring" /* KnownStorageProvider.gnomeKeyring */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2VuY3J5cHRpb24vY29tbW9uL2VuY3J5cHRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUM7QUFNM0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBY3ZHLG1FQUFtRTtBQUNuRSw4REFBOEQ7QUFDOUQsd0RBQXdEO0FBQ3hELE1BQU0sQ0FBTixJQUFrQixzQkFLakI7QUFMRCxXQUFrQixzQkFBc0I7SUFDdkMsNkNBQW1CLENBQUE7SUFDbkIsK0NBQXFCLENBQUE7SUFDckIsNERBQWtDLENBQUE7SUFDbEMseUNBQWUsQ0FBQTtBQUNoQixDQUFDLEVBTGlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFLdkM7QUFFRCwrRUFBK0U7QUFDL0UsTUFBTSxDQUFOLElBQWtCLG9CQW9CakI7QUFwQkQsV0FBa0Isb0JBQW9CO0lBQ3JDLDJDQUFtQixDQUFBO0lBQ25CLGdEQUF3QixDQUFBO0lBRXhCLFFBQVE7SUFDUiw4Q0FBc0IsQ0FBQTtJQUN0QiwwREFBa0MsQ0FBQTtJQUNsQyxzREFBOEIsQ0FBQTtJQUM5QiwyQ0FBbUIsQ0FBQTtJQUNuQiw2Q0FBcUIsQ0FBQTtJQUNyQiw2Q0FBcUIsQ0FBQTtJQUVyQixvRUFBb0U7SUFDcEUsa0RBQWtEO0lBRWxELFVBQVU7SUFDVix1Q0FBZSxDQUFBO0lBRWYsUUFBUTtJQUNSLDBEQUFrQyxDQUFBO0FBQ25DLENBQUMsRUFwQmlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFvQnJDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxPQUFlO0lBQ3hDLE9BQU8sT0FBTyxpREFBaUM7V0FDM0MsT0FBTyxtREFBa0M7V0FDekMsT0FBTyxtREFBa0MsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxPQUFlO0lBQ3RDLE9BQU8sT0FBTyxvREFBa0M7V0FDNUMsT0FBTyxnRUFBd0M7V0FDL0MsT0FBTyw0REFBc0MsQ0FBQztBQUNuRCxDQUFDIn0=