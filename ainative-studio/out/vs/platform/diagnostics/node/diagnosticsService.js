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
import * as fs from 'fs';
import * as osLib from 'os';
import { Promises } from '../../../base/common/async.js';
import { getNodeType, parse } from '../../../base/common/json.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, join } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { URI } from '../../../base/common/uri.js';
import { virtualMachineHint } from '../../../base/node/id.js';
import { Promises as pfs } from '../../../base/node/pfs.js';
import { listProcesses } from '../../../base/node/ps.js';
import { isRemoteDiagnosticError } from '../common/diagnostics.js';
import { ByteSize } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
const workspaceStatsCache = new Map();
export async function collectWorkspaceStats(folder, filter) {
    const cacheKey = `${folder}::${filter.join(':')}`;
    const cached = workspaceStatsCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const configFilePatterns = [
        { tag: 'grunt.js', filePattern: /^gruntfile\.js$/i },
        { tag: 'gulp.js', filePattern: /^gulpfile\.js$/i },
        { tag: 'tsconfig.json', filePattern: /^tsconfig\.json$/i },
        { tag: 'package.json', filePattern: /^package\.json$/i },
        { tag: 'jsconfig.json', filePattern: /^jsconfig\.json$/i },
        { tag: 'tslint.json', filePattern: /^tslint\.json$/i },
        { tag: 'eslint.json', filePattern: /^eslint\.json$/i },
        { tag: 'tasks.json', filePattern: /^tasks\.json$/i },
        { tag: 'launch.json', filePattern: /^launch\.json$/i },
        { tag: 'mcp.json', filePattern: /^mcp\.json$/i },
        { tag: 'settings.json', filePattern: /^settings\.json$/i },
        { tag: 'webpack.config.js', filePattern: /^webpack\.config\.js$/i },
        { tag: 'project.json', filePattern: /^project\.json$/i },
        { tag: 'makefile', filePattern: /^makefile$/i },
        { tag: 'sln', filePattern: /^.+\.sln$/i },
        { tag: 'csproj', filePattern: /^.+\.csproj$/i },
        { tag: 'cmake', filePattern: /^.+\.cmake$/i },
        { tag: 'github-actions', filePattern: /^.+\.ya?ml$/i, relativePathPattern: /^\.github(?:\/|\\)workflows$/i },
        { tag: 'devcontainer.json', filePattern: /^devcontainer\.json$/i },
        { tag: 'dockerfile', filePattern: /^(dockerfile|docker\-compose\.ya?ml)$/i },
        { tag: 'cursorrules', filePattern: /^\.cursorrules$/i },
    ];
    const fileTypes = new Map();
    const configFiles = new Map();
    const MAX_FILES = 20000;
    function collect(root, dir, filter, token) {
        const relativePath = dir.substring(root.length + 1);
        return Promises.withAsyncBody(async (resolve) => {
            let files;
            token.readdirCount++;
            try {
                files = await pfs.readdir(dir, { withFileTypes: true });
            }
            catch (error) {
                // Ignore folders that can't be read
                resolve();
                return;
            }
            if (token.count >= MAX_FILES) {
                token.count += files.length;
                token.maxReached = true;
                resolve();
                return;
            }
            let pending = files.length;
            if (pending === 0) {
                resolve();
                return;
            }
            let filesToRead = files;
            if (token.count + files.length > MAX_FILES) {
                token.maxReached = true;
                pending = MAX_FILES - token.count;
                filesToRead = files.slice(0, pending);
            }
            token.count += files.length;
            for (const file of filesToRead) {
                if (file.isDirectory()) {
                    if (!filter.includes(file.name)) {
                        await collect(root, join(dir, file.name), filter, token);
                    }
                    if (--pending === 0) {
                        resolve();
                        return;
                    }
                }
                else {
                    const index = file.name.lastIndexOf('.');
                    if (index >= 0) {
                        const fileType = file.name.substring(index + 1);
                        if (fileType) {
                            fileTypes.set(fileType, (fileTypes.get(fileType) ?? 0) + 1);
                        }
                    }
                    for (const configFile of configFilePatterns) {
                        if (configFile.relativePathPattern?.test(relativePath) !== false && configFile.filePattern.test(file.name)) {
                            configFiles.set(configFile.tag, (configFiles.get(configFile.tag) ?? 0) + 1);
                        }
                    }
                    if (--pending === 0) {
                        resolve();
                        return;
                    }
                }
            }
        });
    }
    const statsPromise = Promises.withAsyncBody(async (resolve) => {
        const token = { count: 0, maxReached: false, readdirCount: 0 };
        const sw = new StopWatch(true);
        await collect(folder, folder, filter, token);
        const launchConfigs = await collectLaunchConfigs(folder);
        resolve({
            configFiles: asSortedItems(configFiles),
            fileTypes: asSortedItems(fileTypes),
            fileCount: token.count,
            maxFilesReached: token.maxReached,
            launchConfigFiles: launchConfigs,
            totalScanTime: sw.elapsed(),
            totalReaddirCount: token.readdirCount
        });
    });
    workspaceStatsCache.set(cacheKey, statsPromise);
    return statsPromise;
}
function asSortedItems(items) {
    return Array.from(items.entries(), ([name, count]) => ({ name: name, count: count }))
        .sort((a, b) => b.count - a.count);
}
export function getMachineInfo() {
    const machineInfo = {
        os: `${osLib.type()} ${osLib.arch()} ${osLib.release()}`,
        memory: `${(osLib.totalmem() / ByteSize.GB).toFixed(2)}GB (${(osLib.freemem() / ByteSize.GB).toFixed(2)}GB free)`,
        vmHint: `${Math.round((virtualMachineHint.value() * 100))}%`,
    };
    const cpus = osLib.cpus();
    if (cpus && cpus.length > 0) {
        machineInfo.cpus = `${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`;
    }
    return machineInfo;
}
export async function collectLaunchConfigs(folder) {
    try {
        const launchConfigs = new Map();
        const launchConfig = join(folder, '.vscode', 'launch.json');
        const contents = await fs.promises.readFile(launchConfig);
        const errors = [];
        const json = parse(contents.toString(), errors);
        if (errors.length) {
            console.log(`Unable to parse ${launchConfig}`);
            return [];
        }
        if (getNodeType(json) === 'object' && json['configurations']) {
            for (const each of json['configurations']) {
                const type = each['type'];
                if (type) {
                    if (launchConfigs.has(type)) {
                        launchConfigs.set(type, launchConfigs.get(type) + 1);
                    }
                    else {
                        launchConfigs.set(type, 1);
                    }
                }
            }
        }
        return asSortedItems(launchConfigs);
    }
    catch (error) {
        return [];
    }
}
let DiagnosticsService = class DiagnosticsService {
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    formatMachineInfo(info) {
        const output = [];
        output.push(`OS Version:       ${info.os}`);
        output.push(`CPUs:             ${info.cpus}`);
        output.push(`Memory (System):  ${info.memory}`);
        output.push(`VM:               ${info.vmHint}`);
        return output.join('\n');
    }
    formatEnvironment(info) {
        const output = [];
        output.push(`Version:          ${this.productService.nameShort} ${this.productService.version} (${this.productService.commit || 'Commit unknown'}, ${this.productService.date || 'Date unknown'})`);
        output.push(`OS Version:       ${osLib.type()} ${osLib.arch()} ${osLib.release()}`);
        const cpus = osLib.cpus();
        if (cpus && cpus.length > 0) {
            output.push(`CPUs:             ${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`);
        }
        output.push(`Memory (System):  ${(osLib.totalmem() / ByteSize.GB).toFixed(2)}GB (${(osLib.freemem() / ByteSize.GB).toFixed(2)}GB free)`);
        if (!isWindows) {
            output.push(`Load (avg):       ${osLib.loadavg().map(l => Math.round(l)).join(', ')}`); // only provided on Linux/macOS
        }
        output.push(`VM:               ${Math.round((virtualMachineHint.value() * 100))}%`);
        output.push(`Screen Reader:    ${info.screenReader ? 'yes' : 'no'}`);
        output.push(`Process Argv:     ${info.mainArguments.join(' ')}`);
        output.push(`GPU Status:       ${this.expandGPUFeatures(info.gpuFeatureStatus)}`);
        return output.join('\n');
    }
    async getPerformanceInfo(info, remoteData) {
        return Promise.all([listProcesses(info.mainPID), this.formatWorkspaceMetadata(info)]).then(async (result) => {
            let [rootProcess, workspaceInfo] = result;
            let processInfo = this.formatProcessList(info, rootProcess);
            remoteData.forEach(diagnostics => {
                if (isRemoteDiagnosticError(diagnostics)) {
                    processInfo += `\n${diagnostics.errorMessage}`;
                    workspaceInfo += `\n${diagnostics.errorMessage}`;
                }
                else {
                    processInfo += `\n\nRemote: ${diagnostics.hostName}`;
                    if (diagnostics.processes) {
                        processInfo += `\n${this.formatProcessList(info, diagnostics.processes)}`;
                    }
                    if (diagnostics.workspaceMetadata) {
                        workspaceInfo += `\n|  Remote: ${diagnostics.hostName}`;
                        for (const folder of Object.keys(diagnostics.workspaceMetadata)) {
                            const metadata = diagnostics.workspaceMetadata[folder];
                            let countMessage = `${metadata.fileCount} files`;
                            if (metadata.maxFilesReached) {
                                countMessage = `more than ${countMessage}`;
                            }
                            workspaceInfo += `|    Folder (${folder}): ${countMessage}`;
                            workspaceInfo += this.formatWorkspaceStats(metadata);
                        }
                    }
                }
            });
            return {
                processInfo,
                workspaceInfo
            };
        });
    }
    async getSystemInfo(info, remoteData) {
        const { memory, vmHint, os, cpus } = getMachineInfo();
        const systemInfo = {
            os,
            memory,
            cpus,
            vmHint,
            processArgs: `${info.mainArguments.join(' ')}`,
            gpuStatus: info.gpuFeatureStatus,
            screenReader: `${info.screenReader ? 'yes' : 'no'}`,
            remoteData
        };
        if (!isWindows) {
            systemInfo.load = `${osLib.loadavg().map(l => Math.round(l)).join(', ')}`;
        }
        if (isLinux) {
            systemInfo.linuxEnv = {
                desktopSession: process.env['DESKTOP_SESSION'],
                xdgSessionDesktop: process.env['XDG_SESSION_DESKTOP'],
                xdgCurrentDesktop: process.env['XDG_CURRENT_DESKTOP'],
                xdgSessionType: process.env['XDG_SESSION_TYPE']
            };
        }
        return Promise.resolve(systemInfo);
    }
    async getDiagnostics(info, remoteDiagnostics) {
        const output = [];
        return listProcesses(info.mainPID).then(async (rootProcess) => {
            // Environment Info
            output.push('');
            output.push(this.formatEnvironment(info));
            // Process List
            output.push('');
            output.push(this.formatProcessList(info, rootProcess));
            // Workspace Stats
            if (info.windows.some(window => window.folderURIs && window.folderURIs.length > 0 && !window.remoteAuthority)) {
                output.push('');
                output.push('Workspace Stats: ');
                output.push(await this.formatWorkspaceMetadata(info));
            }
            remoteDiagnostics.forEach(diagnostics => {
                if (isRemoteDiagnosticError(diagnostics)) {
                    output.push(`\n${diagnostics.errorMessage}`);
                }
                else {
                    output.push('\n\n');
                    output.push(`Remote:           ${diagnostics.hostName}`);
                    output.push(this.formatMachineInfo(diagnostics.machineInfo));
                    if (diagnostics.processes) {
                        output.push(this.formatProcessList(info, diagnostics.processes));
                    }
                    if (diagnostics.workspaceMetadata) {
                        for (const folder of Object.keys(diagnostics.workspaceMetadata)) {
                            const metadata = diagnostics.workspaceMetadata[folder];
                            let countMessage = `${metadata.fileCount} files`;
                            if (metadata.maxFilesReached) {
                                countMessage = `more than ${countMessage}`;
                            }
                            output.push(`Folder (${folder}): ${countMessage}`);
                            output.push(this.formatWorkspaceStats(metadata));
                        }
                    }
                }
            });
            output.push('');
            output.push('');
            return output.join('\n');
        });
    }
    formatWorkspaceStats(workspaceStats) {
        const output = [];
        const lineLength = 60;
        let col = 0;
        const appendAndWrap = (name, count) => {
            const item = ` ${name}(${count})`;
            if (col + item.length > lineLength) {
                output.push(line);
                line = '|                 ';
                col = line.length;
            }
            else {
                col += item.length;
            }
            line += item;
        };
        // File Types
        let line = '|      File types:';
        const maxShown = 10;
        const max = workspaceStats.fileTypes.length > maxShown ? maxShown : workspaceStats.fileTypes.length;
        for (let i = 0; i < max; i++) {
            const item = workspaceStats.fileTypes[i];
            appendAndWrap(item.name, item.count);
        }
        output.push(line);
        // Conf Files
        if (workspaceStats.configFiles.length >= 0) {
            line = '|      Conf files:';
            col = 0;
            workspaceStats.configFiles.forEach((item) => {
                appendAndWrap(item.name, item.count);
            });
            output.push(line);
        }
        if (workspaceStats.launchConfigFiles.length > 0) {
            let line = '|      Launch Configs:';
            workspaceStats.launchConfigFiles.forEach(each => {
                const item = each.count > 1 ? ` ${each.name}(${each.count})` : ` ${each.name}`;
                line += item;
            });
            output.push(line);
        }
        return output.join('\n');
    }
    expandGPUFeatures(gpuFeatures) {
        const longestFeatureName = Math.max(...Object.keys(gpuFeatures).map(feature => feature.length));
        // Make columns aligned by adding spaces after feature name
        return Object.keys(gpuFeatures).map(feature => `${feature}:  ${' '.repeat(longestFeatureName - feature.length)}  ${gpuFeatures[feature]}`).join('\n                  ');
    }
    formatWorkspaceMetadata(info) {
        const output = [];
        const workspaceStatPromises = [];
        info.windows.forEach(window => {
            if (window.folderURIs.length === 0 || !!window.remoteAuthority) {
                return;
            }
            output.push(`|  Window (${window.title})`);
            window.folderURIs.forEach(uriComponents => {
                const folderUri = URI.revive(uriComponents);
                if (folderUri.scheme === Schemas.file) {
                    const folder = folderUri.fsPath;
                    workspaceStatPromises.push(collectWorkspaceStats(folder, ['node_modules', '.git']).then(stats => {
                        let countMessage = `${stats.fileCount} files`;
                        if (stats.maxFilesReached) {
                            countMessage = `more than ${countMessage}`;
                        }
                        output.push(`|    Folder (${basename(folder)}): ${countMessage}`);
                        output.push(this.formatWorkspaceStats(stats));
                    }).catch(error => {
                        output.push(`|      Error: Unable to collect workspace stats for folder ${folder} (${error.toString()})`);
                    }));
                }
                else {
                    output.push(`|    Folder (${folderUri.toString()}): Workspace stats not available.`);
                }
            });
        });
        return Promise.all(workspaceStatPromises)
            .then(_ => output.join('\n'))
            .catch(e => `Unable to collect workspace stats: ${e}`);
    }
    formatProcessList(info, rootProcess) {
        const mapProcessToName = new Map();
        info.windows.forEach(window => mapProcessToName.set(window.pid, `window [${window.id}] (${window.title})`));
        info.pidToNames.forEach(({ pid, name }) => mapProcessToName.set(pid, name));
        const output = [];
        output.push('CPU %\tMem MB\t   PID\tProcess');
        if (rootProcess) {
            this.formatProcessItem(info.mainPID, mapProcessToName, output, rootProcess, 0);
        }
        return output.join('\n');
    }
    formatProcessItem(mainPid, mapProcessToName, output, item, indent) {
        const isRoot = (indent === 0);
        // Format name with indent
        let name;
        if (isRoot) {
            name = item.pid === mainPid ? `${this.productService.applicationName} main` : 'remote agent';
        }
        else {
            if (mapProcessToName.has(item.pid)) {
                name = mapProcessToName.get(item.pid);
            }
            else {
                name = `${'  '.repeat(indent)} ${item.name}`;
            }
        }
        const memory = process.platform === 'win32' ? item.mem : (osLib.totalmem() * (item.mem / 100));
        output.push(`${item.load.toFixed(0).padStart(5, ' ')}\t${(memory / ByteSize.MB).toFixed(0).padStart(6, ' ')}\t${item.pid.toFixed(0).padStart(6, ' ')}\t${name}`);
        // Recurse into children if any
        if (Array.isArray(item.children)) {
            item.children.forEach(child => this.formatProcessItem(mainPid, mapProcessToName, output, child, indent + 1));
        }
    }
    async getWorkspaceFileExtensions(workspace) {
        const items = new Set();
        for (const { uri } of workspace.folders) {
            const folderUri = URI.revive(uri);
            if (folderUri.scheme !== Schemas.file) {
                continue;
            }
            const folder = folderUri.fsPath;
            try {
                const stats = await collectWorkspaceStats(folder, ['node_modules', '.git']);
                stats.fileTypes.forEach(item => items.add(item.name));
            }
            catch { }
        }
        return { extensions: [...items] };
    }
    async reportWorkspaceStats(workspace) {
        for (const { uri } of workspace.folders) {
            const folderUri = URI.revive(uri);
            if (folderUri.scheme !== Schemas.file) {
                continue;
            }
            const folder = folderUri.fsPath;
            try {
                const stats = await collectWorkspaceStats(folder, ['node_modules', '.git']);
                this.telemetryService.publicLog2('workspace.stats', {
                    'workspace.id': workspace.telemetryId,
                    rendererSessionId: workspace.rendererSessionId
                });
                stats.fileTypes.forEach(e => {
                    this.telemetryService.publicLog2('workspace.stats.file', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count
                    });
                });
                stats.launchConfigFiles.forEach(e => {
                    this.telemetryService.publicLog2('workspace.stats.launchConfigFile', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count
                    });
                });
                stats.configFiles.forEach(e => {
                    this.telemetryService.publicLog2('workspace.stats.configFiles', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count
                    });
                });
                this.telemetryService.publicLog2('workspace.stats.metadata', { duration: stats.totalScanTime, reachedLimit: stats.maxFilesReached, fileCount: stats.fileCount, readdirCount: stats.totalReaddirCount });
            }
            catch {
                // Report nothing if collecting metadata fails.
            }
        }
    }
};
DiagnosticsService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IProductService)
], DiagnosticsService);
export { DiagnosticsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWdub3N0aWNzL25vZGUvZGlhZ25vc3RpY3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxLQUFLLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBYyxNQUFNLDhCQUE4QixDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQVcsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQTZHLHVCQUF1QixFQUF5RixNQUFNLDBCQUEwQixDQUFDO0FBQ3JRLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0s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