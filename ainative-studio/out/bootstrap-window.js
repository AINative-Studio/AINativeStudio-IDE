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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRztBQUVoRyxDQUFDO0lBT0EsTUFBTSxjQUFjLEdBQStCLE1BQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyx3QkFBd0I7SUFDbEcsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztJQUUzQyxLQUFLLFVBQVUsSUFBSSxDQUFxQyxRQUFnQixFQUFFLE9BQXdCO1FBRWpHLDJDQUEyQztRQUMzQyxNQUFNLGFBQWEsR0FBRyxNQUFNLDBCQUEwQixFQUFLLENBQUM7UUFFNUQseUJBQXlCO1FBQ3pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV2QyxxQkFBcUI7UUFDckIsTUFBTSxFQUFFLDBCQUEwQixFQUFFLG1DQUFtQyxFQUFFLHVDQUF1QyxFQUFFLCtCQUErQixFQUFFLEdBQUcseUJBQXlCLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhNLE1BQU07UUFDTixRQUFRLENBQUksYUFBYSxDQUFDLENBQUM7UUFFM0IscUNBQXFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuTCxVQUFVLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWxELGtDQUFrQztRQUNsQyxrQkFBa0IsQ0FBSSxhQUFhLEVB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