/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { app } from 'electron';
import { coalesce } from '../../../base/common/arrays.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { whenDeleted } from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IURLService } from '../../url/common/url.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
export const ID = 'launchMainService';
export const ILaunchMainService = createDecorator(ID);
let LaunchMainService = class LaunchMainService {
    constructor(logService, windowsMainService, urlService, configurationService) {
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.urlService = urlService;
        this.configurationService = configurationService;
    }
    async start(args, userEnv) {
        this.logService.trace('Received data from other instance: ', args, userEnv);
        // macOS: Electron > 7.x changed its behaviour to not
        // bring the application to the foreground when a window
        // is focused programmatically. Only via `app.focus` and
        // the option `steal: true` can you get the previous
        // behaviour back. The only reason to use this option is
        // when a window is getting focused while the application
        // is not in the foreground and since we got instructed
        // to open a new window from another instance, we ensure
        // that the app has focus.
        if (isMacintosh) {
            app.focus({ steal: true });
        }
        // Check early for open-url which is handled in URL service
        const urlsToOpen = this.parseOpenUrl(args);
        if (urlsToOpen.length) {
            let whenWindowReady = Promise.resolve();
            // Create a window if there is none
            if (this.windowsMainService.getWindowCount() === 0) {
                const window = (await this.windowsMainService.openEmptyWindow({ context: 4 /* OpenContext.DESKTOP */ })).at(0);
                if (window) {
                    whenWindowReady = window.ready();
                }
            }
            // Make sure a window is open, ready to receive the url event
            whenWindowReady.then(() => {
                for (const { uri, originalUrl } of urlsToOpen) {
                    this.urlService.open(uri, { originalUrl });
                }
            });
        }
        // Otherwise handle in windows service
        else {
            return this.startOpenWindow(args, userEnv);
        }
    }
    parseOpenUrl(args) {
        if (args['open-url'] && args._urls && args._urls.length > 0) {
            // --open-url must contain -- followed by the url(s)
            // process.argv is used over args._ as args._ are resolved to file paths at this point
            return coalesce(args._urls
                .map(url => {
                try {
                    return { uri: URI.parse(url), originalUrl: url };
                }
                catch (err) {
                    return null;
                }
            }));
        }
        return [];
    }
    async startOpenWindow(args, userEnv) {
        const context = isLaunchedFromCli(userEnv) ? 0 /* OpenContext.CLI */ : 4 /* OpenContext.DESKTOP */;
        let usedWindows = [];
        const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
        const remoteAuthority = args.remote || undefined;
        const baseConfig = {
            context,
            cli: args,
            /**
             * When opening a new window from a second instance that sent args and env
             * over to this instance, we want to preserve the environment only if that second
             * instance was spawned from the CLI or used the `--preserve-env` flag (example:
             * when using `open -n "VSCode.app" --args --preserve-env WORKSPACE_FOLDER`).
             *
             * This is done to ensure that the second window gets treated exactly the same
             * as the first window, for example, it gets the same resolved user shell environment.
             *
             * https://github.com/microsoft/vscode/issues/194736
             */
            userEnv: (args['preserve-env'] || context === 0 /* OpenContext.CLI */) ? userEnv : undefined,
            waitMarkerFileURI,
            remoteAuthority,
            forceProfile: args.profile,
            forceTempProfile: args['profile-temp']
        };
        // Special case extension development
        if (!!args.extensionDevelopmentPath) {
            await this.windowsMainService.openExtensionDevelopmentHostWindow(args.extensionDevelopmentPath, baseConfig);
        }
        // Start without file/folder arguments
        else if (!args._.length && !args['folder-uri'] && !args['file-uri']) {
            let openNewWindow = false;
            // Force new window
            if (args['new-window'] || baseConfig.forceProfile || baseConfig.forceTempProfile) {
                openNewWindow = true;
            }
            // Force reuse window
            else if (args['reuse-window']) {
                openNewWindow = false;
            }
            // Otherwise check for settings
            else {
                const windowConfig = this.configurationService.getValue('window');
                const openWithoutArgumentsInNewWindowConfig = windowConfig?.openWithoutArgumentsInNewWindow || 'default' /* default */;
                switch (openWithoutArgumentsInNewWindowConfig) {
                    case 'on':
                        openNewWindow = true;
                        break;
                    case 'off':
                        openNewWindow = false;
                        break;
                    default:
                        openNewWindow = !isMacintosh; // prefer to restore running instance on macOS
                }
            }
            // Open new Window
            if (openNewWindow) {
                usedWindows = await this.windowsMainService.open({
                    ...baseConfig,
                    forceNewWindow: true,
                    forceEmpty: true
                });
            }
            // Focus existing window or open if none opened
            else {
                const lastActive = this.windowsMainService.getLastActiveWindow();
                if (lastActive) {
                    this.windowsMainService.openExistingWindow(lastActive, baseConfig);
                    usedWindows = [lastActive];
                }
                else {
                    usedWindows = await this.windowsMainService.open({
                        ...baseConfig,
                        forceEmpty: true
                    });
                }
            }
        }
        // Start with file/folder arguments
        else {
            usedWindows = await this.windowsMainService.open({
                ...baseConfig,
                forceNewWindow: args['new-window'],
                preferNewWindow: !args['reuse-window'] && !args.wait,
                forceReuseWindow: args['reuse-window'],
                diffMode: args.diff,
                mergeMode: args.merge,
                addMode: args.add,
                removeMode: args.remove,
                noRecentEntry: !!args['skip-add-to-recently-opened'],
                gotoLineMode: args.goto
            });
        }
        // If the other instance is waiting to be killed, we hook up a window listener if one window
        // is being used and only then resolve the startup promise which will kill this second instance.
        // In addition, we poll for the wait marker file to be deleted to return.
        if (waitMarkerFileURI && usedWindows.length === 1 && usedWindows[0]) {
            return Promise.race([
                usedWindows[0].whenClosedOrLoaded,
                whenDeleted(waitMarkerFileURI.fsPath)
            ]).then(() => undefined, () => undefined);
        }
    }
    async getMainProcessId() {
        this.logService.trace('Received request for process ID from other instance.');
        return process.pid;
    }
};
LaunchMainService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, IURLService),
    __param(3, IConfigurationService)
], LaunchMainService);
export { LaunchMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGF1bmNoL2VsZWN0cm9uLW1haW4vbGF1bmNoTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBR3RELE9BQU8sRUFBc0IsbUJBQW1CLEVBQWUsTUFBTSx3Q0FBd0MsQ0FBQztBQUc5RyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsbUJBQW1CLENBQUM7QUFDdEMsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixFQUFFLENBQUMsQ0FBQztBQWdCbkUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFJN0IsWUFDK0IsVUFBdUIsRUFDZixrQkFBdUMsRUFDL0MsVUFBdUIsRUFDYixvQkFBMkM7UUFIckQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNmLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDL0MsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNiLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDaEYsQ0FBQztJQUVMLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBc0IsRUFBRSxPQUE0QjtRQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFNUUscURBQXFEO1FBQ3JELHdEQUF3RDtRQUN4RCx3REFBd0Q7UUFDeEQsb0RBQW9EO1FBQ3BELHdEQUF3RDtRQUN4RCx5REFBeUQ7UUFDekQsdURBQXVEO1FBQ3ZELHdEQUF3RDtRQUN4RCwwQkFBMEI7UUFDMUIsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLElBQUksZUFBZSxHQUFxQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFMUQsbUNBQW1DO1lBQ25DLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLE9BQU8sNkJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2RyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLGVBQWUsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBRUQsNkRBQTZEO1lBQzdELGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUN6QixLQUFLLE1BQU0sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxzQ0FBc0M7YUFDakMsQ0FBQztZQUNMLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsSUFBc0I7UUFDMUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUU3RCxvREFBb0Q7WUFDcEQsc0ZBQXNGO1lBRXRGLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLO2lCQUN4QixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDO29CQUNKLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUM7Z0JBQ2xELENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDZCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQXNCLEVBQUUsT0FBNEI7UUFDakYsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx5QkFBaUIsQ0FBQyw0QkFBb0IsQ0FBQztRQUNuRixJQUFJLFdBQVcsR0FBa0IsRUFBRSxDQUFDO1FBRXBDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMvRyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQztRQUVqRCxNQUFNLFVBQVUsR0FBdUI7WUFDdEMsT0FBTztZQUNQLEdBQUcsRUFBRSxJQUFJO1lBQ1Q7Ozs7Ozs7Ozs7ZUFVRztZQUNILE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxPQUFPLDRCQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNwRixpQkFBaUI7WUFDakIsZUFBZTtZQUNmLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTztZQUMxQixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDO1NBQ3RDLENBQUM7UUFFRixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdHLENBQUM7UUFFRCxzQ0FBc0M7YUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckUsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBRTFCLG1CQUFtQjtZQUNuQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxVQUFVLENBQUMsWUFBWSxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNsRixhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLENBQUM7WUFFRCxxQkFBcUI7aUJBQ2hCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDdkIsQ0FBQztZQUVELCtCQUErQjtpQkFDMUIsQ0FBQztnQkFDTCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUE4QixRQUFRLENBQUMsQ0FBQztnQkFDL0YsTUFBTSxxQ0FBcUMsR0FBRyxZQUFZLEVBQUUsK0JBQStCLElBQUksU0FBUyxDQUFDLGFBQWEsQ0FBQztnQkFDdkgsUUFBUSxxQ0FBcUMsRUFBRSxDQUFDO29CQUMvQyxLQUFLLElBQUk7d0JBQ1IsYUFBYSxHQUFHLElBQUksQ0FBQzt3QkFDckIsTUFBTTtvQkFDUCxLQUFLLEtBQUs7d0JBQ1QsYUFBYSxHQUFHLEtBQUssQ0FBQzt3QkFDdEIsTUFBTTtvQkFDUDt3QkFDQyxhQUFhLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyw4Q0FBOEM7Z0JBQzlFLENBQUM7WUFDRixDQUFDO1lBRUQsa0JBQWtCO1lBQ2xCLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQ2hELEdBQUcsVUFBVTtvQkFDYixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsVUFBVSxFQUFFLElBQUk7aUJBQ2hCLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCwrQ0FBK0M7aUJBQzFDLENBQUM7Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2pFLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBRW5FLFdBQVcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQzt3QkFDaEQsR0FBRyxVQUFVO3dCQUNiLFVBQVUsRUFBRSxJQUFJO3FCQUNoQixDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsbUNBQW1DO2FBQzlCLENBQUM7WUFDTCxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO2dCQUNoRCxHQUFHLFVBQVU7Z0JBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2xDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUNwRCxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUN0QyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ25CLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHO2dCQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ3ZCLGFBQWEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDO2dCQUNwRCxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDdkIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELDRGQUE0RjtRQUM1RixnR0FBZ0c7UUFDaEcseUVBQXlFO1FBQ3pFLElBQUksaUJBQWlCLElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNuQixXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO2dCQUNqQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDO2FBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQjtRQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1FBRTlFLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUNwQixDQUFDO0NBQ0QsQ0FBQTtBQWpNWSxpQkFBaUI7SUFLM0IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLGlCQUFpQixDQWlNN0IifQ==