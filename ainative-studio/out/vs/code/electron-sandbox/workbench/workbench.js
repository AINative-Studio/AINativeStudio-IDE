"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
(async function () {
    // Add a perf entry right from the top
    performance.mark('code/didStartRenderer');
    const bootstrapWindow = window.MonacoBootstrapWindow; // defined by bootstrap-window.ts
    const preloadGlobals = window.vscode; // defined by preload.ts
    //#region Splash Screen Helpers
    function showSplash(configuration) {
        performance.mark('code/willShowPartsSplash');
        let data = configuration.partsSplash;
        if (data) {
            if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'hc-black') || (!configuration.colorScheme.dark && data.baseTheme !== 'hc-light')) {
                    data = undefined; // high contrast mode has been turned by the OS -> ignore stored colors and layouts
                }
            }
            else if (configuration.autoDetectColorScheme) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'vs-dark') || (!configuration.colorScheme.dark && data.baseTheme !== 'vs')) {
                    data = undefined; // OS color scheme is tracked and has changed
                }
            }
        }
        // developing an extension -> ignore stored layouts
        if (data && configuration.extensionDevelopmentPath) {
            data.layoutInfo = undefined;
        }
        // minimal color configuration (works with or without persisted data)
        let baseTheme;
        let shellBackground;
        let shellForeground;
        if (data) {
            baseTheme = data.baseTheme;
            shellBackground = data.colorInfo.editorBackground;
            shellForeground = data.colorInfo.foreground;
        }
        else if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'hc-black';
                shellBackground = '#000000';
                shellForeground = '#FFFFFF';
            }
            else {
                baseTheme = 'hc-light';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        else if (configuration.autoDetectColorScheme) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'vs-dark';
                shellBackground = '#1E1E1E';
                shellForeground = '#CCCCCC';
            }
            else {
                baseTheme = 'vs';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        const style = document.createElement('style');
        style.className = 'initialShellColors';
        window.document.head.appendChild(style);
        style.textContent = `body {	background-color: ${shellBackground}; color: ${shellForeground}; margin: 0; padding: 0; }`;
        // set zoom level as soon as possible
        if (typeof data?.zoomLevel === 'number' && typeof preloadGlobals?.webFrame?.setZoomLevel === 'function') {
            preloadGlobals.webFrame.setZoomLevel(data.zoomLevel);
        }
        // restore parts if possible (we might not always store layout info)
        if (data?.layoutInfo) {
            const { layoutInfo, colorInfo } = data;
            const splash = document.createElement('div');
            splash.id = 'monaco-parts-splash';
            splash.className = baseTheme ?? 'vs-dark';
            if (layoutInfo.windowBorder && colorInfo.windowBorder) {
                const borderElement = document.createElement('div');
                borderElement.style.position = 'absolute';
                borderElement.style.width = 'calc(100vw - 2px)';
                borderElement.style.height = 'calc(100vh - 2px)';
                borderElement.style.zIndex = '1'; // allow border above other elements
                borderElement.style.border = `1px solid var(--window-border-color)`;
                borderElement.style.setProperty('--window-border-color', colorInfo.windowBorder);
                if (layoutInfo.windowBorderRadius) {
                    borderElement.style.borderRadius = layoutInfo.windowBorderRadius;
                }
                splash.appendChild(borderElement);
            }
            // ensure there is enough space
            layoutInfo.auxiliarySideBarWidth = Math.min(layoutInfo.auxiliarySideBarWidth, window.innerWidth - (layoutInfo.activityBarWidth + layoutInfo.editorPartMinWidth + layoutInfo.sideBarWidth));
            layoutInfo.sideBarWidth = Math.min(layoutInfo.sideBarWidth, window.innerWidth - (layoutInfo.activityBarWidth + layoutInfo.editorPartMinWidth + layoutInfo.auxiliarySideBarWidth));
            // part: title
            if (layoutInfo.titleBarHeight > 0) {
                const titleDiv = document.createElement('div');
                titleDiv.style.position = 'absolute';
                titleDiv.style.width = '100%';
                titleDiv.style.height = `${layoutInfo.titleBarHeight}px`;
                titleDiv.style.left = '0';
                titleDiv.style.top = '0';
                titleDiv.style.backgroundColor = `${colorInfo.titleBarBackground}`;
                titleDiv.style['-webkit-app-region'] = 'drag';
                splash.appendChild(titleDiv);
                if (colorInfo.titleBarBorder) {
                    const titleBorder = document.createElement('div');
                    titleBorder.style.position = 'absolute';
                    titleBorder.style.width = '100%';
                    titleBorder.style.height = '1px';
                    titleBorder.style.left = '0';
                    titleBorder.style.bottom = '0';
                    titleBorder.style.borderBottom = `1px solid ${colorInfo.titleBarBorder}`;
                    titleDiv.appendChild(titleBorder);
                }
            }
            // part: activity bar
            if (layoutInfo.activityBarWidth > 0) {
                const activityDiv = document.createElement('div');
                activityDiv.style.position = 'absolute';
                activityDiv.style.width = `${layoutInfo.activityBarWidth}px`;
                activityDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                activityDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    activityDiv.style.left = '0';
                }
                else {
                    activityDiv.style.right = '0';
                }
                activityDiv.style.backgroundColor = `${colorInfo.activityBarBackground}`;
                splash.appendChild(activityDiv);
                if (colorInfo.activityBarBorder) {
                    const activityBorderDiv = document.createElement('div');
                    activityBorderDiv.style.position = 'absolute';
                    activityBorderDiv.style.width = '1px';
                    activityBorderDiv.style.height = '100%';
                    activityBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        activityBorderDiv.style.right = '0';
                        activityBorderDiv.style.borderRight = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    else {
                        activityBorderDiv.style.left = '0';
                        activityBorderDiv.style.borderLeft = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    activityDiv.appendChild(activityBorderDiv);
                }
            }
            // part: side bar (only when opening workspace/folder)
            if (configuration.workspace && layoutInfo.sideBarWidth > 0) {
                const sideDiv = document.createElement('div');
                sideDiv.style.position = 'absolute';
                sideDiv.style.width = `${layoutInfo.sideBarWidth}px`;
                sideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                sideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    sideDiv.style.left = `${layoutInfo.activityBarWidth}px`;
                }
                else {
                    sideDiv.style.right = `${layoutInfo.activityBarWidth}px`;
                }
                sideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(sideDiv);
                if (colorInfo.sideBarBorder) {
                    const sideBorderDiv = document.createElement('div');
                    sideBorderDiv.style.position = 'absolute';
                    sideBorderDiv.style.width = '1px';
                    sideBorderDiv.style.height = '100%';
                    sideBorderDiv.style.top = '0';
                    sideBorderDiv.style.right = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        sideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        sideBorderDiv.style.left = '0';
                        sideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    sideDiv.appendChild(sideBorderDiv);
                }
            }
            // part: auxiliary sidebar
            if (layoutInfo.auxiliarySideBarWidth > 0) {
                const auxSideDiv = document.createElement('div');
                auxSideDiv.style.position = 'absolute';
                auxSideDiv.style.width = `${layoutInfo.auxiliarySideBarWidth}px`;
                auxSideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                auxSideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    auxSideDiv.style.right = '0';
                }
                else {
                    auxSideDiv.style.left = '0';
                }
                auxSideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(auxSideDiv);
                if (colorInfo.sideBarBorder) {
                    const auxSideBorderDiv = document.createElement('div');
                    auxSideBorderDiv.style.position = 'absolute';
                    auxSideBorderDiv.style.width = '1px';
                    auxSideBorderDiv.style.height = '100%';
                    auxSideBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        auxSideBorderDiv.style.left = '0';
                        auxSideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        auxSideBorderDiv.style.right = '0';
                        auxSideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    auxSideDiv.appendChild(auxSideBorderDiv);
                }
            }
            // part: statusbar
            if (layoutInfo.statusBarHeight > 0) {
                const statusDiv = document.createElement('div');
                statusDiv.style.position = 'absolute';
                statusDiv.style.width = '100%';
                statusDiv.style.height = `${layoutInfo.statusBarHeight}px`;
                statusDiv.style.bottom = '0';
                statusDiv.style.left = '0';
                if (configuration.workspace && colorInfo.statusBarBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarBackground;
                }
                else if (!configuration.workspace && colorInfo.statusBarNoFolderBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarNoFolderBackground;
                }
                splash.appendChild(statusDiv);
                if (colorInfo.statusBarBorder) {
                    const statusBorderDiv = document.createElement('div');
                    statusBorderDiv.style.position = 'absolute';
                    statusBorderDiv.style.width = '100%';
                    statusBorderDiv.style.height = '1px';
                    statusBorderDiv.style.top = '0';
                    statusBorderDiv.style.borderTop = `1px solid ${colorInfo.statusBarBorder}`;
                    statusDiv.appendChild(statusBorderDiv);
                }
            }
            window.document.body.appendChild(splash);
        }
        performance.mark('code/didShowPartsSplash');
    }
    //#endregion
    const { result, configuration } = await bootstrapWindow.load('vs/workbench/workbench.desktop.main', {
        configureDeveloperSettings: function (windowConfig) {
            return {
                // disable automated devtools opening on error when running extension tests
                // as this can lead to nondeterministic test execution (devtools steals focus)
                forceDisableShowDevtoolsOnError: typeof windowConfig.extensionTestsPath === 'string' || windowConfig['enable-smoke-test-driver'] === true,
                // enable devtools keybindings in extension development window
                forceEnableDeveloperKeybindings: Array.isArray(windowConfig.extensionDevelopmentPath) && windowConfig.extensionDevelopmentPath.length > 0,
                removeDeveloperKeybindingsAfterLoad: true
            };
        },
        beforeImport: function (windowConfig) {
            // Show our splash as early as possible
            showSplash(windowConfig);
            // Code windows have a `vscodeWindowId` property to identify them
            Object.defineProperty(window, 'vscodeWindowId', {
                get: () => windowConfig.windowId
            });
            // It looks like browsers only lazily enable
            // the <canvas> element when needed. Since we
            // leverage canvas elements in our code in many
            // locations, we try to help the browser to
            // initialize canvas when it is idle, right
            // before we wait for the scripts to be loaded.
            window.requestIdleCallback(() => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                context?.clearRect(0, 0, canvas.width, canvas.height);
                canvas.remove();
            }, { timeout: 50 });
            // Track import() perf
            performance.mark('code/willLoadWorkbenchMain');
        }
    });
    // Mark start of workbench
    performance.mark('code/didLoadWorkbenchMain');
    // Load workbench
    result.main(configuration);
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tc2FuZGJveC93b3JrYmVuY2gvd29ya2JlbmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRztBQUVoRywwQ0FBMEM7QUFFMUMsQ0FBQyxLQUFLO0lBRUwsc0NBQXNDO0lBQ3RDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQU8xQyxNQUFNLGVBQWUsR0FBc0IsTUFBYyxDQUFDLHFCQUFxQixDQUFDLENBQUUsaUNBQWlDO0lBQ25ILE1BQU0sY0FBYyxHQUErQixNQUFjLENBQUMsTUFBTSxDQUFDLENBQUksd0JBQXdCO0lBRXJHLCtCQUErQjtJQUUvQixTQUFTLFVBQVUsQ0FBQyxhQUF5QztRQUM1RCxXQUFXLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFFN0MsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxhQUFhLENBQUMsc0JBQXNCLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDcEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDN0ksSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLG1GQUFtRjtnQkFDdEcsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxhQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxD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