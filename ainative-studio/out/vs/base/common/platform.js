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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wbGF0Zm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUVwQyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFFckMsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztBQUN6QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDckIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO0FBQ3pCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN0QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDbkIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQ3hCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztBQUNuQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQ3RCLElBQUksT0FBTyxHQUF1QixTQUFTLENBQUM7QUFDNUMsSUFBSSxTQUFTLEdBQVcsZ0JBQWdCLENBQUM7QUFDekMsSUFBSSxlQUFlLEdBQVcsZ0JBQWdCLENBQUM7QUFDL0MsSUFBSSx1QkFBdUIsR0FBdUIsU0FBUyxDQUFDO0FBQzVELElBQUksVUFBVSxHQUF1QixTQUFTLENBQUM7QUE0Qi9DLE1BQU0sV0FBVyxHQUFRLFVBQVUsQ0FBQztBQUVwQyxJQUFJLFdBQVcsR0FBNkIsU0FBUyxDQUFDO0FBQ3RELElBQUksT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLFdBQVcsSUFBSSxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxD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