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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcEVudmlyb25tZW50SW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9kZXNrdG9wRW52aXJvbm1lbnRJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFbkMsa0RBQWtEO0FBQ2xELElBQUssa0JBY0o7QUFkRCxXQUFLLGtCQUFrQjtJQUN0Qix5Q0FBbUIsQ0FBQTtJQUNuQiwyQ0FBcUIsQ0FBQTtJQUNyQix1Q0FBaUIsQ0FBQTtJQUNqQixxQ0FBZSxDQUFBO0lBQ2YsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtJQUNiLDJDQUFxQixDQUFBO0lBQ3JCLHFDQUFlLENBQUE7SUFDZixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7QUFDZCxDQUFDLEVBZEksa0JBQWtCLEtBQWxCLGtCQUFrQixRQWN0QjtBQUVELE1BQU0sd0JBQXdCLEdBQUcscUJBQXFCLENBQUM7QUFDdkQsTUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQztBQUVoRCxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDeEQsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxH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