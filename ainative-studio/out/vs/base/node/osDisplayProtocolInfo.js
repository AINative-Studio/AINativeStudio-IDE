/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants as FSConstants, promises as FSPromises } from 'fs';
import { join } from '../common/path.js';
import { env } from '../common/process.js';
const XDG_SESSION_TYPE = 'XDG_SESSION_TYPE';
const WAYLAND_DISPLAY = 'WAYLAND_DISPLAY';
const XDG_RUNTIME_DIR = 'XDG_RUNTIME_DIR';
var DisplayProtocolType;
(function (DisplayProtocolType) {
    DisplayProtocolType["Wayland"] = "wayland";
    DisplayProtocolType["XWayland"] = "xwayland";
    DisplayProtocolType["X11"] = "x11";
    DisplayProtocolType["Unknown"] = "unknown";
})(DisplayProtocolType || (DisplayProtocolType = {}));
export async function getDisplayProtocol(errorLogger) {
    const xdgSessionType = env[XDG_SESSION_TYPE];
    if (xdgSessionType) {
        // If XDG_SESSION_TYPE is set, return its value if it's either 'wayland' or 'x11'.
        // We assume that any value other than 'wayland' or 'x11' is an error or unexpected,
        // hence 'unknown' is returned.
        return xdgSessionType === "wayland" /* DisplayProtocolType.Wayland */ || xdgSessionType === "x11" /* DisplayProtocolType.X11 */ ? xdgSessionType : "unknown" /* DisplayProtocolType.Unknown */;
    }
    else {
        const waylandDisplay = env[WAYLAND_DISPLAY];
        if (!waylandDisplay) {
            // If WAYLAND_DISPLAY is empty, then the session is x11.
            return "x11" /* DisplayProtocolType.X11 */;
        }
        else {
            const xdgRuntimeDir = env[XDG_RUNTIME_DIR];
            if (!xdgRuntimeDir) {
                // If XDG_RUNTIME_DIR is empty, then the session can only be guessed.
                return "unknown" /* DisplayProtocolType.Unknown */;
            }
            else {
                // Check for the presence of the file $XDG_RUNTIME_DIR/wayland-0.
                const waylandServerPipe = join(xdgRuntimeDir, 'wayland-0');
                try {
                    await FSPromises.access(waylandServerPipe, FSConstants.R_OK);
                    // If the file exists, then the session is wayland.
                    return "wayland" /* DisplayProtocolType.Wayland */;
                }
                catch (err) {
                    // If the file does not exist or an error occurs, we guess 'unknown'
                    // since WAYLAND_DISPLAY was set but no wayland-0 pipe could be confirmed.
                    errorLogger(err);
                    return "unknown" /* DisplayProtocolType.Unknown */;
                }
            }
        }
    }
}
export function getCodeDisplayProtocol(displayProtocol, ozonePlatform) {
    if (!ozonePlatform) {
        return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */ ? "xwayland" /* DisplayProtocolType.XWayland */ : "x11" /* DisplayProtocolType.X11 */;
    }
    else {
        switch (ozonePlatform) {
            case 'auto':
                return displayProtocol;
            case 'x11':
                return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */ ? "xwayland" /* DisplayProtocolType.XWayland */ : "x11" /* DisplayProtocolType.X11 */;
            case 'wayland':
                return "wayland" /* DisplayProtocolType.Wayland */;
            default:
                return "unknown" /* DisplayProtocolType.Unknown */;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NEaXNwbGF5UHJvdG9jb2xJbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvb3NEaXNwbGF5UHJvdG9jb2xJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLElBQUksV0FBVyxFQUFFLFFBQVEsSUFBSSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUUzQyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0FBQzVDLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDO0FBQzFDLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDO0FBRTFDLElBQVcsbUJBS1Y7QUFMRCxXQUFXLG1CQUFtQjtJQUM3QiwwQ0FBbUIsQ0FBQTtJQUNuQiw0Q0FBcUIsQ0FBQTtJQUNyQixrQ0FBVyxDQUFBO0lBQ1gsMENBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxVLG1CQUFtQixLQUFuQixtQkFBbUIsUUFLN0I7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUFDLFdBQWlDO0lBQ3pFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRTdDLElBQUksY0FBYyxFQUFFLENBQUM7UUFDcEIsa0ZBQWtGO1FBQ2xGLG9GQUFvRjtRQUNwRiwrQkFBK0I7UUFDL0IsT0FBTyxjQUFjLGdEQUFnQyxJQUFJLGNBQWMsd0NBQTRCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLDRDQUE0QixDQUFDO0lBQ3BKLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQix3REFBd0Q7WUFDeEQsMkNBQStCO1FBQ2hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRTNDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIscUVBQXFFO2dCQUNyRSxtREFBbUM7WUFDcEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlFQUFpRTtnQkFDakUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUUzRCxJQUFJLENBQUM7b0JBQ0osTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFFN0QsbURBQW1EO29CQUNuRCxtREFBbUM7Z0JBQ3BDLENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDZCxvRUFBb0U7b0JBQ3BFLDBFQUEwRTtvQkFDMUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNqQixtREFBbUM7Z0JBQ3BDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBR0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLGVBQW9DLEVBQUUsYUFBaUM7SUFDN0csSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sZUFBZSxnREFBZ0MsQ0FBQyxDQUFDLCtDQUE4QixDQUFDLG9DQUF3QixDQUFDO0lBQ2pILENBQUM7U0FBTSxDQUFDO1FBQ1AsUUFBUSxhQUFhLEVBQUUsQ0FBQztZQUN2QixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxlQUFlLENBQUM7WUFDeEIsS0FBSyxLQUFLO2dCQUNULE9BQU8sZUFBZSxnREFBZ0MsQ0FBQyxDQUFDLCtDQUE4QixDQUFDLG9DQUF3QixDQUFDO1lBQ2pILEtBQUssU0FBUztnQkFDYixtREFBbUM7WUFDcEM7Z0JBQ0MsbURBQW1DO1FBQ3JDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyJ9