/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../base/common/platform.js';
import * as performance from '../../base/common/performance.js';
import { URI } from '../../base/common/uri.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { transformOutgoingURIs } from '../../base/common/uriIpc.js';
import { listProcesses } from '../../base/node/ps.js';
import { getMachineInfo, collectWorkspaceStats } from '../../platform/diagnostics/node/diagnosticsService.js';
import { basename } from '../../base/common/path.js';
import { joinPath } from '../../base/common/resources.js';
export class RemoteAgentEnvironmentChannel {
    static { this._namePool = 1; }
    constructor(_connectionToken, _environmentService, _userDataProfilesService, _extensionHostStatusService) {
        this._connectionToken = _connectionToken;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._extensionHostStatusService = _extensionHostStatusService;
    }
    async call(_, command, arg) {
        switch (command) {
            case 'getEnvironmentData': {
                const args = arg;
                const uriTransformer = createURITransformer(args.remoteAuthority);
                let environmentData = await this._getEnvironmentData(args.profile);
                environmentData = transformOutgoingURIs(environmentData, uriTransformer);
                return environmentData;
            }
            case 'getExtensionHostExitInfo': {
                const args = arg;
                return this._extensionHostStatusService.getExitInfo(args.reconnectionToken);
            }
            case 'getDiagnosticInfo': {
                const options = arg;
                const diagnosticInfo = {
                    machineInfo: getMachineInfo()
                };
                const processesPromise = options.includeProcesses ? listProcesses(process.pid) : Promise.resolve();
                let workspaceMetadataPromises = [];
                const workspaceMetadata = {};
                if (options.folders) {
                    // only incoming paths are transformed, so remote authority is unneeded.
                    const uriTransformer = createURITransformer('');
                    const folderPaths = options.folders
                        .map(folder => URI.revive(uriTransformer.transformIncoming(folder)))
                        .filter(uri => uri.scheme === 'file');
                    workspaceMetadataPromises = folderPaths.map(folder => {
                        return collectWorkspaceStats(folder.fsPath, ['node_modules', '.git'])
                            .then(stats => {
                            workspaceMetadata[basename(folder.fsPath)] = stats;
                        });
                    });
                }
                return Promise.all([processesPromise, ...workspaceMetadataPromises]).then(([processes, _]) => {
                    diagnosticInfo.processes = processes || undefined;
                    diagnosticInfo.workspaceMetadata = options.folders ? workspaceMetadata : undefined;
                    return diagnosticInfo;
                });
            }
        }
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        throw new Error('Not supported');
    }
    async _getEnvironmentData(profile) {
        if (profile && !this._userDataProfilesService.profiles.some(p => p.id === profile)) {
            await this._userDataProfilesService.createProfile(profile, profile);
        }
        let isUnsupportedGlibc = false;
        if (process.platform === 'linux') {
            const glibcVersion = process.glibcVersion;
            const minorVersion = glibcVersion ? parseInt(glibcVersion.split('.')[1]) : 28;
            isUnsupportedGlibc = (minorVersion <= 27) || !!process.env['VSCODE_SERVER_CUSTOM_GLIBC_LINKER'];
        }
        return {
            pid: process.pid,
            connectionToken: (this._connectionToken.type !== 0 /* ServerConnectionTokenType.None */ ? this._connectionToken.value : ''),
            appRoot: URI.file(this._environmentService.appRoot),
            settingsPath: this._environmentService.machineSettingsResource,
            logsPath: this._environmentService.logsHome,
            extensionHostLogsPath: joinPath(this._environmentService.logsHome, `exthost${RemoteAgentEnvironmentChannel._namePool++}`),
            globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
            workspaceStorageHome: this._environmentService.workspaceStorageHome,
            localHistoryHome: this._environmentService.localHistoryHome,
            userHome: this._environmentService.userHome,
            os: platform.OS,
            arch: process.arch,
            marks: performance.getMarks(),
            useHostProxy: !!this._environmentService.args['use-host-proxy'],
            profiles: {
                home: this._userDataProfilesService.profilesHome,
                all: [...this._userDataProfilesService.profiles].map(profile => ({ ...profile }))
            },
            isUnsupportedGlibc
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRFbnZpcm9ubWVudEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlQWdlbnRFbnZpcm9ubWVudEltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEtBQUssV0FBVyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUlsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUtyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsTUFBTSxPQUFPLDZCQUE2QjthQUUxQixjQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRTdCLFlBQ2tCLGdCQUF1QyxFQUN2QyxtQkFBOEMsRUFDOUMsd0JBQWtELEVBQ2xELDJCQUF3RDtRQUh4RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXVCO1FBQ3ZDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBMkI7UUFDOUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUNsRCxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO0lBRTFFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQU0sRUFB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