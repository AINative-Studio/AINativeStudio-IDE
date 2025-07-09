/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux } from './platform.js';
export var Source;
(function (Source) {
    Source[Source["stdout"] = 0] = "stdout";
    Source[Source["stderr"] = 1] = "stderr";
})(Source || (Source = {}));
export var TerminateResponseCode;
(function (TerminateResponseCode) {
    TerminateResponseCode[TerminateResponseCode["Success"] = 0] = "Success";
    TerminateResponseCode[TerminateResponseCode["Unknown"] = 1] = "Unknown";
    TerminateResponseCode[TerminateResponseCode["AccessDenied"] = 2] = "AccessDenied";
    TerminateResponseCode[TerminateResponseCode["ProcessNotFound"] = 3] = "ProcessNotFound";
})(TerminateResponseCode || (TerminateResponseCode = {}));
/**
 * Sanitizes a VS Code process environment by removing all Electron/VS Code-related values.
 */
export function sanitizeProcessEnvironment(env, ...preserve) {
    const set = preserve.reduce((set, key) => {
        set[key] = true;
        return set;
    }, {});
    const keysToRemove = [
        /^ELECTRON_.+$/,
        /^VSCODE_(?!(PORTABLE|SHELL_LOGIN|ENV_REPLACE|ENV_APPEND|ENV_PREPEND)).+$/,
        /^SNAP(|_.*)$/,
        /^GDK_PIXBUF_.+$/,
    ];
    const envKeys = Object.keys(env);
    envKeys
        .filter(key => !set[key])
        .forEach(envKey => {
        for (let i = 0; i < keysToRemove.length; i++) {
            if (envKey.search(keysToRemove[i]) !== -1) {
                delete env[envKey];
                break;
            }
        }
    });
}
/**
 * Remove dangerous environment variables that have caused crashes
 * in forked processes (i.e. in ELECTRON_RUN_AS_NODE processes)
 *
 * @param env The env object to change
 */
export function removeDangerousEnvVariables(env) {
    if (!env) {
        return;
    }
    // Unset `DEBUG`, as an invalid value might lead to process crashes
    // See https://github.com/microsoft/vscode/issues/130072
    delete env['DEBUG'];
    if (isLinux) {
        // Unset `LD_PRELOAD`, as it might lead to process crashes
        // See https://github.com/microsoft/vscode/issues/134177
        delete env['LD_PRELOAD'];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Byb2Nlc3Nlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXVCLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQStDN0QsTUFBTSxDQUFOLElBQWtCLE1BR2pCO0FBSEQsV0FBa0IsTUFBTTtJQUN2Qix1Q0FBTSxDQUFBO0lBQ04sdUNBQU0sQ0FBQTtBQUNQLENBQUMsRUFIaUIsTUFBTSxLQUFOLE1BQU0sUUFHdkI7QUEyQkQsTUFBTSxDQUFOLElBQWtCLHFCQUtqQjtBQUxELFdBQWtCLHFCQUFxQjtJQUN0Qyx1RUFBVyxDQUFBO0lBQ1gsdUVBQVcsQ0FBQTtJQUNYLGlGQUFnQixDQUFBO0lBQ2hCLHVGQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFMaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUt0QztBQWFEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEdBQXdCLEVBQUUsR0FBRyxRQUFrQjtJQUN6RixNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUEwQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ1AsTUFBTSxZQUFZLEdBQUc7UUFDcEIsZUFBZTtRQUNmLDBFQUEwRTtRQUMxRSxjQUFjO1FBQ2QsaUJBQWlCO0tBQ2pCLENBQUM7SUFDRixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLE9BQU87U0FDTCxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25CLE1BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEdBQW9DO0lBQy9FLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU87SUFDUixDQUFDO0lBRUQsbUVBQW1FO0lBQ25FLHdEQUF3RDtJQUN4RCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVwQixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsMERBQTBEO1FBQzFELHdEQUF3RDtRQUN4RCxPQUFPLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxQixDQUFDO0FBQ0YsQ0FBQyJ9