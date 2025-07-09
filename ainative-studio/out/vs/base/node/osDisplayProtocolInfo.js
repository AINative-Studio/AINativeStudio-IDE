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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NEaXNwbGF5UHJvdG9jb2xJbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9vc0Rpc3BsYXlQcm90b2NvbEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsSUFBSSxXQUFXLEVBQUUsUUFBUSxJQUFJLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUN0RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTNDLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUM7QUFDNUMsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7QUFDMUMsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7QUFFMUMsSUFBVyxtQkFLVjtBQUxELFdBQVcsbUJBQW1CO0lBQzdCLDBDQUFtQixDQUFBO0lBQ25CLDRDQUFxQixDQUFBO0lBQ3JCLGtDQUFXLENBQUE7SUFDWCwwQ0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTFUsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUs3QjtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsa0JBQWtCLENBQUMsV0FBaUM7SUFDekUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFN0MsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixrRkFBa0Y7UUFDbEYsb0ZBQW9GO1FBQ3BGLCtCQUErQjtRQUMvQixPQUFPLGNBQWMsZ0RBQWdDLElBQUksY0FBYyx3Q0FBNEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsNENBQTRCLENBQUM7SUFDcEosQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLHdEQUF3RDtZQUN4RCwyQ0FBK0I7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFM0MsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixxRUFBcUU7Z0JBQ3JFLG1EQUFtQztZQUNwQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUVBQWlFO2dCQUNqRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRTNELElBQUksQ0FBQztvQkFDSixNQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUU3RCxtREFBbUQ7b0JBQ25ELG1EQUFtQztnQkFDcEMsQ0FBQztnQkFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNkLG9FQUFvRTtvQkFDcEUsMEVBQTBFO29CQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pCLG1EQUFtQztnQkFDcEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFHRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsZUFBb0MsRUFBRSxhQUFpQztJQUM3RyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTyxlQUFlLGdEQUFnQyxDQUFDLENBQUMsK0NBQThCLENBQUMsb0NBQXdCLENBQUM7SUFDakgsQ0FBQztTQUFNLENBQUM7UUFDUCxRQUFRLGFBQWEsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssTUFBTTtnQkFDVixPQUFPLGVBQWUsQ0FBQztZQUN4QixLQUFLLEtBQUs7Z0JBQ1QsT0FBTyxlQUFlLGdEQUFnQyxDQUFDLENBQUMsK0NBQThCLENBQUMsb0NBQXdCLENBQUM7WUFDakgsS0FBSyxTQUFTO2dCQUNiLG1EQUFtQztZQUNwQztnQkFDQyxtREFBbUM7UUFDckMsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDIn0=