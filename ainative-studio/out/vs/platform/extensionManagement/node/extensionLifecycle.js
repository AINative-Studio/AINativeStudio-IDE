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
import { fork } from 'child_process';
import { Limiter } from '../../../base/common/async.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
let ExtensionsLifecycle = class ExtensionsLifecycle extends Disposable {
    constructor(userDataProfilesService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        this.processesLimiter = new Limiter(5); // Run max 5 processes in parallel
    }
    async postUninstall(extension) {
        const script = this.parseScript(extension, 'uninstall');
        if (script) {
            this.logService.info(extension.identifier.id, extension.manifest.version, `Running post uninstall script`);
            await this.processesLimiter.queue(async () => {
                try {
                    await this.runLifecycleHook(script.script, 'uninstall', script.args, true, extension);
                    this.logService.info(`Finished running post uninstall script`, extension.identifier.id, extension.manifest.version);
                }
                catch (error) {
                    this.logService.error('Failed to run post uninstall script', extension.identifier.id, extension.manifest.version);
                    this.logService.error(error);
                }
            });
        }
        try {
            await Promises.rm(this.getExtensionStoragePath(extension));
        }
        catch (error) {
            this.logService.error('Error while removing extension storage path', extension.identifier.id);
            this.logService.error(error);
        }
    }
    parseScript(extension, type) {
        const scriptKey = `vscode:${type}`;
        if (extension.location.scheme === Schemas.file && extension.manifest && extension.manifest['scripts'] && typeof extension.manifest['scripts'][scriptKey] === 'string') {
            const script = extension.manifest['scripts'][scriptKey].split(' ');
            if (script.length < 2 || script[0] !== 'node' || !script[1]) {
                this.logService.warn(extension.identifier.id, extension.manifest.version, `${scriptKey} should be a node script`);
                return null;
            }
            return { script: join(extension.location.fsPath, script[1]), args: script.slice(2) || [] };
        }
        return null;
    }
    runLifecycleHook(lifecycleHook, lifecycleType, args, timeout, extension) {
        return new Promise((c, e) => {
            const extensionLifecycleProcess = this.start(lifecycleHook, lifecycleType, args, extension);
            let timeoutHandler;
            const onexit = (error) => {
                if (timeoutHandler) {
                    clearTimeout(timeoutHandler);
                    timeoutHandler = null;
                }
                if (error) {
                    e(error);
                }
                else {
                    c(undefined);
                }
            };
            // on error
            extensionLifecycleProcess.on('error', (err) => {
                onexit(toErrorMessage(err) || 'Unknown');
            });
            // on exit
            extensionLifecycleProcess.on('exit', (code, signal) => {
                onexit(code ? `post-${lifecycleType} process exited with code ${code}` : undefined);
            });
            if (timeout) {
                // timeout: kill process after waiting for 5s
                timeoutHandler = setTimeout(() => {
                    timeoutHandler = null;
                    extensionLifecycleProcess.kill();
                    e('timed out');
                }, 5000);
            }
        });
    }
    start(uninstallHook, lifecycleType, args, extension) {
        const opts = {
            silent: true,
            execArgv: undefined
        };
        const extensionUninstallProcess = fork(uninstallHook, [`--type=extension-post-${lifecycleType}`, ...args], opts);
        extensionUninstallProcess.stdout.setEncoding('utf8');
        extensionUninstallProcess.stderr.setEncoding('utf8');
        const onStdout = Event.fromNodeEventEmitter(extensionUninstallProcess.stdout, 'data');
        const onStderr = Event.fromNodeEventEmitter(extensionUninstallProcess.stderr, 'data');
        // Log output
        this._register(onStdout(data => this.logService.info(extension.identifier.id, extension.manifest.version, `post-${lifecycleType}`, data)));
        this._register(onStderr(data => this.logService.error(extension.identifier.id, extension.manifest.version, `post-${lifecycleType}`, data)));
        const onOutput = Event.any(Event.map(onStdout, o => ({ data: `%c${o}`, format: [''] }), this._store), Event.map(onStderr, o => ({ data: `%c${o}`, format: ['color: red'] }), this._store));
        // Debounce all output, so we can render it in the Chrome console as a group
        const onDebouncedOutput = Event.debounce(onOutput, (r, o) => {
            return r
                ? { data: r.data + o.data, format: [...r.format, ...o.format] }
                : { data: o.data, format: o.format };
        }, 100, undefined, undefined, undefined, this._store);
        // Print out output
        onDebouncedOutput(data => {
            console.group(extension.identifier.id);
            console.log(data.data, ...data.format);
            console.groupEnd();
        });
        return extensionUninstallProcess;
    }
    getExtensionStoragePath(extension) {
        return join(this.userDataProfilesService.defaultProfile.globalStorageHome.fsPath, extension.identifier.id.toLowerCase());
    }
};
ExtensionsLifecycle = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, ILogService)
], ExtensionsLifecycle);
export { ExtensionsLifecycle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvbkxpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWdCLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXBGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUlsRCxZQUMyQix1QkFBeUQsRUFDdEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFIMEIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSjlDLHFCQUFnQixHQUFrQixJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtDQUFrQztJQU81RixDQUFD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