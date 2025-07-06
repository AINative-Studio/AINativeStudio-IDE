"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function () {
    const preloadGlobals = window.vscode; // defined by preload.ts
    const safeProcess = preloadGlobals.process;
    async function load(esModule, options) {
        // Window Configuration from Preload Script
        const configuration = await resolveWindowConfiguration();
        // Signal before import()
        options?.beforeImport?.(configuration);
        // Developer settings
        const { enableDeveloperKeybindings, removeDeveloperKeybindingsAfterLoad, developerDeveloperKeybindingsDisposable, forceDisableShowDevtoolsOnError } = setupDeveloperKeybindings(configuration, options);
        // NLS
        setupNLS(configuration);
        // Compute base URL and set as global
        const baseUrl = new URL(`${fileUriFromPath(configuration.appRoot, { isWindows: safeProcess.platform === 'win32', scheme: 'vscode-file', fallbackAuthority: 'vscode-app' })}/out/`);
        globalThis._VSCODE_FILE_ROOT = baseUrl.toString();
        // Dev only: CSS import map tricks
        setupCSSImportMaps(configuration, baseUrl);
        // ESM Import
        try {
            const result = await import(new URL(`${esModule}.js`, baseUrl).href);
            if (developerDeveloperKeybindingsDisposable && removeDeveloperKeybindingsAfterLoad) {
                developerDeveloperKeybindingsDisposable();
            }
            return { result, configuration };
        }
        catch (error) {
            onUnexpectedError(error, enableDeveloperKeybindings && !forceDisableShowDevtoolsOnError);
            throw error;
        }
    }
    async function resolveWindowConfiguration() {
        const timeout = setTimeout(() => { console.error(`[resolve window config] Could not resolve window configuration within 10 seconds, but will continue to wait...`); }, 10000);
        performance.mark('code/willWaitForWindowConfig');
        const configuration = await preloadGlobals.context.resolveConfiguration();
        performance.mark('code/didWaitForWindowConfig');
        clearTimeout(timeout);
        return configuration;
    }
    function setupDeveloperKeybindings(configuration, options) {
        const { forceEnableDeveloperKeybindings, disallowReloadKeybinding, removeDeveloperKeybindingsAfterLoad, forceDisableShowDevtoolsOnError } = typeof options?.configureDeveloperSettings === 'function' ? options.configureDeveloperSettings(configuration) : {
            forceEnableDeveloperKeybindings: false,
            disallowReloadKeybinding: false,
            removeDeveloperKeybindingsAfterLoad: false,
            forceDisableShowDevtoolsOnError: false
        };
        const isDev = !!safeProcess.env['VSCODE_DEV'];
        const enableDeveloperKeybindings = Boolean(isDev || forceEnableDeveloperKeybindings);
        let developerDeveloperKeybindingsDisposable = undefined;
        if (enableDeveloperKeybindings) {
            developerDeveloperKeybindingsDisposable = registerDeveloperKeybindings(disallowReloadKeybinding);
        }
        return {
            enableDeveloperKeybindings,
            removeDeveloperKeybindingsAfterLoad,
            developerDeveloperKeybindingsDisposable,
            forceDisableShowDevtoolsOnError
        };
    }
    function registerDeveloperKeybindings(disallowReloadKeybinding) {
        const ipcRenderer = preloadGlobals.ipcRenderer;
        const extractKey = function (e) {
            return [
                e.ctrlKey ? 'ctrl-' : '',
                e.metaKey ? 'meta-' : '',
                e.altKey ? 'alt-' : '',
                e.shiftKey ? 'shift-' : '',
                e.keyCode
            ].join('');
        };
        // Devtools & reload support
        const TOGGLE_DEV_TOOLS_KB = (safeProcess.platform === 'darwin' ? 'meta-alt-73' : 'ctrl-shift-73'); // mac: Cmd-Alt-I, rest: Ctrl-Shift-I
        const TOGGLE_DEV_TOOLS_KB_ALT = '123'; // F12
        const RELOAD_KB = (safeProcess.platform === 'darwin' ? 'meta-82' : 'ctrl-82'); // mac: Cmd-R, rest: Ctrl-R
        let listener = function (e) {
            const key = extractKey(e);
            if (key === TOGGLE_DEV_TOOLS_KB || key === TOGGLE_DEV_TOOLS_KB_ALT) {
                ipcRenderer.send('vscode:toggleDevTools');
            }
            else if (key === RELOAD_KB && !disallowReloadKeybinding) {
                ipcRenderer.send('vscode:reloadWindow');
            }
        };
        window.addEventListener('keydown', listener);
        return function () {
            if (listener) {
                window.removeEventListener('keydown', listener);
                listener = undefined;
            }
        };
    }
    function setupNLS(configuration) {
        globalThis._VSCODE_NLS_MESSAGES = configuration.nls.messages;
        globalThis._VSCODE_NLS_LANGUAGE = configuration.nls.language;
        let language = configuration.nls.language || 'en';
        if (language === 'zh-tw') {
            language = 'zh-Hant';
        }
        else if (language === 'zh-cn') {
            language = 'zh-Hans';
        }
        window.document.documentElement.setAttribute('lang', language);
    }
    function onUnexpectedError(error, showDevtoolsOnError) {
        if (showDevtoolsOnError) {
            const ipcRenderer = preloadGlobals.ipcRenderer;
            ipcRenderer.send('vscode:openDevTools');
        }
        console.error(`[uncaught exception]: ${error}`);
        if (error && typeof error !== 'string' && error.stack) {
            console.error(error.stack);
        }
    }
    function fileUriFromPath(path, config) {
        // Since we are building a URI, we normalize any backslash
        // to slashes and we ensure that the path begins with a '/'.
        let pathName = path.replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = `/${pathName}`;
        }
        let uri;
        // Windows: in order to support UNC paths (which start with '//')
        // that have their own authority, we do not use the provided authority
        // but rather preserve it.
        if (config.isWindows && pathName.startsWith('//')) {
            uri = encodeURI(`${config.scheme || 'file'}:${pathName}`);
        }
        // Otherwise we optionally add the provided authority if specified
        else {
            uri = encodeURI(`${config.scheme || 'file'}://${config.fallbackAuthority || ''}${pathName}`);
        }
        return uri.replace(/#/g, '%23');
    }
    function setupCSSImportMaps(configuration, baseUrl) {
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: For each CSS modules that we have we defined an entry in the import map that maps to
        // DEV: a blob URL that loads the CSS via a dynamic @import-rule.
        // DEV ---------------------------------------------------------------------------------------
        if (Array.isArray(configuration.cssModules) && configuration.cssModules.length > 0) {
            performance.mark('code/willAddCssLoader');
            const style = document.createElement('style');
            style.type = 'text/css';
            style.media = 'screen';
            style.id = 'vscode-css-loading';
            document.head.appendChild(style);
            globalThis._VSCODE_CSS_LOAD = function (url) {
                style.textContent += `@import url(${url});\n`;
            };
            const importMap = { imports: {} };
            for (const cssModule of configuration.cssModules) {
                const cssUrl = new URL(cssModule, baseUrl).href;
                const jsSrc = `globalThis._VSCODE_CSS_LOAD('${cssUrl}');\n`;
                const blob = new Blob([jsSrc], { type: 'application/javascript' });
                importMap.imports[cssUrl] = URL.createObjectURL(blob);
            }
            const ttp = window.trustedTypes?.createPolicy('vscode-bootstrapImportMap', { createScript(value) { return value; }, });
            const importMapSrc = JSON.stringify(importMap, undefined, 2);
            const importMapScript = document.createElement('script');
            importMapScript.type = 'importmap';
            importMapScript.setAttribute('nonce', '0c6a828f1297');
            // @ts-ignore
            importMapScript.textContent = ttp?.createScript(importMapSrc) ?? importMapSrc;
            document.head.appendChild(importMapScript);
            performance.mark('code/didAddCssLoader');
        }
    }
    globalThis.MonacoBootstrapWindow = { load };
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC13aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLENBQUM7SUFPQSxNQUFNLGNBQWMsR0FBK0IsTUFBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHdCQUF3QjtJQUNsRyxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO0lBRTNDLEtBQUssVUFBVSxJQUFJLENBQXFDLFFBQWdCLEVBQUUsT0FBd0I7UUFFakcsMkNBQTJDO1FBQzNDLE1BQU0sYUFBYSxHQUFHLE1BQU0sMEJBQTBCLEVBQUssQ0FBQztRQUU1RCx5QkFBeUI7UUFDekIsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXZDLHFCQUFxQjtRQUNyQixNQUFNLEVBQUUsMEJBQTBCLEVBQUUsbUNBQW1DLEVBQUUsdUNBQXVDLEVBQUUsK0JBQStCLEVBQUUsR0FBRyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFeE0sTUFBTTtRQUNOLFFBQVEsQ0FBSSxhQUFhLENBQUMsQ0FBQztRQUUzQixxQ0FBcUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25MLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFbEQsa0NBQWtDO1FBQ2xDLGtCQUFrQixDQUFJLGFBQWEsRUFB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