/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from './process.js';
// Define the enumeration for Desktop Environments
var DesktopEnvironment;
(function (DesktopEnvironment) {
    DesktopEnvironment["UNKNOWN"] = "UNKNOWN";
    DesktopEnvironment["CINNAMON"] = "CINNAMON";
    DesktopEnvironment["DEEPIN"] = "DEEPIN";
    DesktopEnvironment["GNOME"] = "GNOME";
    DesktopEnvironment["KDE3"] = "KDE3";
    DesktopEnvironment["KDE4"] = "KDE4";
    DesktopEnvironment["KDE5"] = "KDE5";
    DesktopEnvironment["KDE6"] = "KDE6";
    DesktopEnvironment["PANTHEON"] = "PANTHEON";
    DesktopEnvironment["UNITY"] = "UNITY";
    DesktopEnvironment["XFCE"] = "XFCE";
    DesktopEnvironment["UKUI"] = "UKUI";
    DesktopEnvironment["LXQT"] = "LXQT";
})(DesktopEnvironment || (DesktopEnvironment = {}));
const kXdgCurrentDesktopEnvVar = 'XDG_CURRENT_DESKTOP';
const kKDESessionEnvVar = 'KDE_SESSION_VERSION';
export function getDesktopEnvironment() {
    const xdgCurrentDesktop = env[kXdgCurrentDesktopEnvVar];
    if (xdgCurrentDesktop) {
        const values = xdgCurrentDesktop.split(':').map(value => value.trim()).filter(value => value.length > 0);
        for (const value of values) {
            switch (value) {
                case 'Unity': {
                    const desktopSessionUnity = env['DESKTOP_SESSION'];
                    if (desktopSessionUnity && desktopSessionUnity.includes('gnome-fallback')) {
                        return DesktopEnvironment.GNOME;
                    }
                    return DesktopEnvironment.UNITY;
                }
                case 'Deepin':
                    return DesktopEnvironment.DEEPIN;
                case 'GNOME':
                    return DesktopEnvironment.GNOME;
                case 'X-Cinnamon':
                    return DesktopEnvironment.CINNAMON;
                case 'KDE': {
                    const kdeSession = env[kKDESessionEnvVar];
                    if (kdeSession === '5') {
                        return DesktopEnvironment.KDE5;
                    }
                    if (kdeSession === '6') {
                        return DesktopEnvironment.KDE6;
                    }
                    return DesktopEnvironment.KDE4;
                }
                case 'Pantheon':
                    return DesktopEnvironment.PANTHEON;
                case 'XFCE':
                    return DesktopEnvironment.XFCE;
                case 'UKUI':
                    return DesktopEnvironment.UKUI;
                case 'LXQt':
                    return DesktopEnvironment.LXQT;
            }
        }
    }
    const desktopSession = env['DESKTOP_SESSION'];
    if (desktopSession) {
        switch (desktopSession) {
            case 'deepin':
                return DesktopEnvironment.DEEPIN;
            case 'gnome':
            case 'mate':
                return DesktopEnvironment.GNOME;
            case 'kde4':
            case 'kde-plasma':
                return DesktopEnvironment.KDE4;
            case 'kde':
                if (kKDESessionEnvVar in env) {
                    return DesktopEnvironment.KDE4;
                }
                return DesktopEnvironment.KDE3;
            case 'xfce':
            case 'xubuntu':
                return DesktopEnvironment.XFCE;
            case 'ukui':
                return DesktopEnvironment.UKUI;
        }
    }
    if ('GNOME_DESKTOP_SESSION_ID' in env) {
        return DesktopEnvironment.GNOME;
    }
    if ('KDE_FULL_SESSION' in env) {
        if (kKDESessionEnvVar in env) {
            return DesktopEnvironment.KDE4;
        }
        return DesktopEnvironment.KDE3;
    }
    return DesktopEnvironment.UNKNOWN;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcEVudmlyb25tZW50SW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZGVza3RvcEVudmlyb25tZW50SW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRW5DLGtEQUFrRDtBQUNsRCxJQUFLLGtCQWNKO0FBZEQsV0FBSyxrQkFBa0I7SUFDdEIseUNBQW1CLENBQUE7SUFDbkIsMkNBQXFCLENBQUE7SUFDckIsdUNBQWlCLENBQUE7SUFDakIscUNBQWUsQ0FBQTtJQUNmLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYiwyQ0FBcUIsQ0FBQTtJQUNyQixxQ0FBZSxDQUFBO0lBQ2YsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQWRJLGtCQUFrQixLQUFsQixrQkFBa0IsUUFjdEI7QUFFRCxNQUFNLHdCQUF3QixHQUFHLHFCQUFxQixDQUFDO0FBQ3ZELE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLENBQUM7QUFFaEQsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3hELElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLFFBQVEsS0FBSyxFQUFFLENBQUM7Z0JBQ2YsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNkLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ25ELElBQUksbUJBQW1CLElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQzt3QkFDM0UsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7b0JBQ2pDLENBQUM7b0JBRUQsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQ0QsS0FBSyxRQUFRO29CQUNaLE9BQU8sa0JBQWtCLENBQUMsTUFBTSxDQUFDO2dCQUNsQyxLQUFLLE9BQU87b0JBQ1gsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7Z0JBQ2pDLEtBQUssWUFBWTtvQkFDaEIsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7Z0JBQ3BDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDWixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQUMsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQUMsQ0FBQztvQkFDM0QsSUFBSSxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQUMsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQUMsQ0FBQztvQkFDM0QsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hDLENBQUM7Z0JBQ0QsS0FBSyxVQUFVO29CQUNkLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxDQUFDO2dCQUNwQyxLQUFLLE1BQU07b0JBQ1YsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hDLEtBQUssTUFBTTtvQkFDVixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQztnQkFDaEMsS0FBSyxNQUFNO29CQUNWLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlDLElBQUksY0FBYyxFQUFFLENBQUM7UUFDcEIsUUFBUSxjQUFjLEVBQUUsQ0FBQztZQUN4QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7WUFDbEMsS0FBSyxPQUFPLENBQUM7WUFDYixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7WUFDakMsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLFlBQVk7Z0JBQ2hCLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ2hDLEtBQUssS0FBSztnQkFDVCxJQUFJLGlCQUFpQixJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUM5QixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQztnQkFDaEMsQ0FBQztnQkFDRCxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUNoQyxLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssU0FBUztnQkFDYixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUNoQyxLQUFLLE1BQU07Z0JBQ1YsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLDBCQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3ZDLE9BQU8sa0JBQWtCLENBQUMsS0FBSyxDQUFDO0lBQ2pDLENBQUM7SUFDRCxJQUFJLGtCQUFrQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQy9CLElBQUksaUJBQWlCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDOUIsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7UUFDaEMsQ0FBQztRQUNELE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxPQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztBQUNuQyxDQUFDIn0=