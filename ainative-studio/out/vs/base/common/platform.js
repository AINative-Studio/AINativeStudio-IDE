/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export const LANGUAGE_DEFAULT = 'en';
let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isLinuxSnap = false;
let _isNative = false;
let _isWeb = false;
let _isElectron = false;
let _isIOS = false;
let _isCI = false;
let _isMobile = false;
let _locale = undefined;
let _language = LANGUAGE_DEFAULT;
let _platformLocale = LANGUAGE_DEFAULT;
let _translationsConfigFile = undefined;
let _userAgent = undefined;
const $globalThis = globalThis;
let nodeProcess = undefined;
if (typeof $globalThis.vscode !== 'undefined' && typeof $globalThis.vscode.process !== 'undefined') {
    // Native environment (sandboxed)
    nodeProcess = $globalThis.vscode.process;
}
else if (typeof process !== 'undefined' && typeof process?.versions?.node === 'string') {
    // Native environment (non-sandboxed)
    nodeProcess = process;
}
const isElectronProcess = typeof nodeProcess?.versions?.electron === 'string';
const isElectronRenderer = isElectronProcess && nodeProcess?.type === 'renderer';
// Native environment
if (typeof nodeProcess === 'object') {
    _isWindows = (nodeProcess.platform === 'win32');
    _isMacintosh = (nodeProcess.platform === 'darwin');
    _isLinux = (nodeProcess.platform === 'linux');
    _isLinuxSnap = _isLinux && !!nodeProcess.env['SNAP'] && !!nodeProcess.env['SNAP_REVISION'];
    _isElectron = isElectronProcess;
    _isCI = !!nodeProcess.env['CI'] || !!nodeProcess.env['BUILD_ARTIFACTSTAGINGDIRECTORY'];
    _locale = LANGUAGE_DEFAULT;
    _language = LANGUAGE_DEFAULT;
    const rawNlsConfig = nodeProcess.env['VSCODE_NLS_CONFIG'];
    if (rawNlsConfig) {
        try {
            const nlsConfig = JSON.parse(rawNlsConfig);
            _locale = nlsConfig.userLocale;
            _platformLocale = nlsConfig.osLocale;
            _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
            _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
        }
        catch (e) {
        }
    }
    _isNative = true;
}
// Web environment
else if (typeof navigator === 'object' && !isElectronRenderer) {
    _userAgent = navigator.userAgent;
    _isWindows = _userAgent.indexOf('Windows') >= 0;
    _isMacintosh = _userAgent.indexOf('Macintosh') >= 0;
    _isIOS = (_userAgent.indexOf('Macintosh') >= 0 || _userAgent.indexOf('iPad') >= 0 || _userAgent.indexOf('iPhone') >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
    _isLinux = _userAgent.indexOf('Linux') >= 0;
    _isMobile = _userAgent?.indexOf('Mobi') >= 0;
    _isWeb = true;
    _language = nls.getNLSLanguage() || LANGUAGE_DEFAULT;
    _locale = navigator.language.toLowerCase();
    _platformLocale = _locale;
}
// Unknown environment
else {
    console.error('Unable to resolve platform.');
}
export var Platform;
(function (Platform) {
    Platform[Platform["Web"] = 0] = "Web";
    Platform[Platform["Mac"] = 1] = "Mac";
    Platform[Platform["Linux"] = 2] = "Linux";
    Platform[Platform["Windows"] = 3] = "Windows";
})(Platform || (Platform = {}));
export function PlatformToString(platform) {
    switch (platform) {
        case 0 /* Platform.Web */: return 'Web';
        case 1 /* Platform.Mac */: return 'Mac';
        case 2 /* Platform.Linux */: return 'Linux';
        case 3 /* Platform.Windows */: return 'Windows';
    }
}
let _platform = 0 /* Platform.Web */;
if (_isMacintosh) {
    _platform = 1 /* Platform.Mac */;
}
else if (_isWindows) {
    _platform = 3 /* Platform.Windows */;
}
else if (_isLinux) {
    _platform = 2 /* Platform.Linux */;
}
export const isWindows = _isWindows;
export const isMacintosh = _isMacintosh;
export const isLinux = _isLinux;
export const isLinuxSnap = _isLinuxSnap;
export const isNative = _isNative;
export const isElectron = _isElectron;
export const isWeb = _isWeb;
export const isWebWorker = (_isWeb && typeof $globalThis.importScripts === 'function');
export const webWorkerOrigin = isWebWorker ? $globalThis.origin : undefined;
export const isIOS = _isIOS;
export const isMobile = _isMobile;
/**
 * Whether we run inside a CI environment, such as
 * GH actions or Azure Pipelines.
 */
export const isCI = _isCI;
export const platform = _platform;
export const userAgent = _userAgent;
/**
 * The language used for the user interface. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese or de for German)
 */
export const language = _language;
export var Language;
(function (Language) {
    function value() {
        return language;
    }
    Language.value = value;
    function isDefaultVariant() {
        if (language.length === 2) {
            return language === 'en';
        }
        else if (language.length >= 3) {
            return language[0] === 'e' && language[1] === 'n' && language[2] === '-';
        }
        else {
            return false;
        }
    }
    Language.isDefaultVariant = isDefaultVariant;
    function isDefault() {
        return language === 'en';
    }
    Language.isDefault = isDefault;
})(Language || (Language = {}));
/**
 * Desktop: The OS locale or the locale specified by --locale or `argv.json`.
 * Web: matches `platformLocale`.
 *
 * The UI is not necessarily shown in the provided locale.
 */
export const locale = _locale;
/**
 * This will always be set to the OS/browser's locale regardless of
 * what was specified otherwise. The format of the string is all
 * lower case (e.g. zh-tw for Traditional Chinese). The UI is not
 * necessarily shown in the provided locale.
 */
export const platformLocale = _platformLocale;
/**
 * The translations that are available through language packs.
 */
export const translationsConfigFile = _translationsConfigFile;
export const setTimeout0IsFaster = (typeof $globalThis.postMessage === 'function' && !$globalThis.importScripts);
/**
 * See https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#:~:text=than%204%2C%20then-,set%20timeout%20to%204,-.
 *
 * Works similarly to `setTimeout(0)` but doesn't suffer from the 4ms artificial delay
 * that browsers set when the nesting level is > 5.
 */
export const setTimeout0 = (() => {
    if (setTimeout0IsFaster) {
        const pending = [];
        $globalThis.addEventListener('message', (e) => {
            if (e.data && e.data.vscodeScheduleAsyncWork) {
                for (let i = 0, len = pending.length; i < len; i++) {
                    const candidate = pending[i];
                    if (candidate.id === e.data.vscodeScheduleAsyncWork) {
                        pending.splice(i, 1);
                        candidate.callback();
                        return;
                    }
                }
            }
        });
        let lastId = 0;
        return (callback) => {
            const myId = ++lastId;
            pending.push({
                id: myId,
                callback: callback
            });
            $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, '*');
        };
    }
    return (callback) => setTimeout(callback);
})();
export var OperatingSystem;
(function (OperatingSystem) {
    OperatingSystem[OperatingSystem["Windows"] = 1] = "Windows";
    OperatingSystem[OperatingSystem["Macintosh"] = 2] = "Macintosh";
    OperatingSystem[OperatingSystem["Linux"] = 3] = "Linux";
})(OperatingSystem || (OperatingSystem = {}));
export const OS = (_isMacintosh || _isIOS ? 2 /* OperatingSystem.Macintosh */ : (_isWindows ? 1 /* OperatingSystem.Windows */ : 3 /* OperatingSystem.Linux */));
let _isLittleEndian = true;
let _isLittleEndianComputed = false;
export function isLittleEndian() {
    if (!_isLittleEndianComputed) {
        _isLittleEndianComputed = true;
        const test = new Uint8Array(2);
        test[0] = 1;
        test[1] = 2;
        const view = new Uint16Array(test.buffer);
        _isLittleEndian = (view[0] === (2 << 8) + 1);
    }
    return _isLittleEndian;
}
export const isChrome = !!(userAgent && userAgent.indexOf('Chrome') >= 0);
export const isFirefox = !!(userAgent && userAgent.indexOf('Firefox') >= 0);
export const isSafari = !!(!isChrome && (userAgent && userAgent.indexOf('Safari') >= 0));
export const isEdge = !!(userAgent && userAgent.indexOf('Edg/') >= 0);
export const isAndroid = !!(userAgent && userAgent.indexOf('Android') >= 0);
export function isBigSurOrNewer(osVersion) {
    return parseFloat(osVersion) >= 20;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcGxhdGZvcm0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFFcEMsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBRXJDLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztBQUN2QixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDekIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztBQUN6QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDdEIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQ25CLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztBQUN4QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDbkIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2xCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN0QixJQUFJLE9BQU8sR0FBdUIsU0FBUyxDQUFDO0FBQzVDLElBQUksU0FBUyxHQUFXLGdCQUFnQixDQUFDO0FBQ3pDLElBQUksZUFBZSxHQUFXLGdCQUFnQixDQUFDO0FBQy9DLElBQUksdUJBQXVCLEdBQXVCLFNBQVMsQ0FBQztBQUM1RCxJQUFJLFVBQVUsR0FBdUIsU0FBUyxDQUFDO0FBNEIvQyxNQUFNLFdBQVcsR0FBUSxVQUFVLENBQUM7QUFFcEMsSUFBSSxXQUFXLEdBQTZCLFNBQVMsQ0FBQztBQUN0RCxJQUFJLE9BQU8sV0FBVyxDQUFDLE1BQU0sS0FBSyxXQUFXLElBQUksT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQUUs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