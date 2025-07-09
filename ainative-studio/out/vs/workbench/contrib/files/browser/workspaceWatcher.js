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
import { localize } from '../../../../nls.js';
import { Disposable, dispose, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { INotificationService, Severity, NeverShowAgainScope, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let WorkspaceWatcher = class WorkspaceWatcher extends Disposable {
    static { this.ID = 'workbench.contrib.workspaceWatcher'; }
    constructor(fileService, configurationService, contextService, notificationService, openerService, uriIdentityService, hostService, telemetryService) {
        super();
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.uriIdentityService = uriIdentityService;
        this.hostService = hostService;
        this.telemetryService = telemetryService;
        this.watchedWorkspaces = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.registerListeners();
        this.refresh();
    }
    registerListeners() {
        this._register(this.contextService.onDidChangeWorkspaceFolders(e => this.onDidChangeWorkspaceFolders(e)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onDidChangeWorkbenchState()));
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onDidChangeConfiguration(e)));
        this._register(this.fileService.onDidWatchError(error => this.onDidWatchError(error)));
    }
    onDidChangeWorkspaceFolders(e) {
        // Removed workspace: Unwatch
        for (const removed of e.removed) {
            this.unwatchWorkspace(removed);
        }
        // Added workspace: Watch
        for (const added of e.added) {
            this.watchWorkspace(added);
        }
    }
    onDidChangeWorkbenchState() {
        this.refresh();
    }
    onDidChangeConfiguration(e) {
        if (e.affectsConfiguration('files.watcherExclude') || e.affectsConfiguration('files.watcherInclude')) {
            this.refresh();
        }
    }
    onDidWatchError(error) {
        const msg = error.toString();
        let reason = undefined;
        // Detect if we run into ENOSPC issues
        if (msg.indexOf('ENOSPC') >= 0) {
            reason = 'ENOSPC';
            this.notificationService.prompt(Severity.Warning, localize('enospcError', "Unable to watch for file changes. Please follow the instructions link to resolve this issue."), [{
                    label: localize('learnMore', "Instructions"),
                    run: () => this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=867693'))
                }], {
                sticky: true,
                neverShowAgain: { id: 'ignoreEnospcError', isSecondary: true, scope: NeverShowAgainScope.WORKSPACE }
            });
        }
        // Detect when the watcher throws an error unexpectedly
        else if (msg.indexOf('EUNKNOWN') >= 0) {
            reason = 'EUNKNOWN';
            this.notificationService.prompt(Severity.Warning, localize('eshutdownError', "File changes watcher stopped unexpectedly. A reload of the window may enable the watcher again unless the workspace cannot be watched for file changes."), [{
                    label: localize('reload', "Reload"),
                    run: () => this.hostService.reload()
                }], {
                sticky: true,
                priority: NotificationPriority.SILENT // reduce potential spam since we don't really know how often this fires
            });
        }
        // Detect unexpected termination
        else if (msg.indexOf('ETERM') >= 0) {
            reason = 'ETERM';
        }
        // Log telemetry if we gathered a reason (logging it from the renderer
        // allows us to investigate this situation in context of experiments)
        if (reason) {
            this.telemetryService.publicLog2('fileWatcherError', { reason });
        }
    }
    watchWorkspace(workspace) {
        // Compute the watcher exclude rules from configuration
        const excludes = [];
        const config = this.configurationService.getValue({ resource: workspace.uri });
        if (config.files?.watcherExclude) {
            for (const key in config.files.watcherExclude) {
                if (key && config.files.watcherExclude[key] === true) {
                    excludes.push(key);
                }
            }
        }
        const pathsToWatch = new ResourceMap(uri => this.uriIdentityService.extUri.getComparisonKey(uri));
        // Add the workspace as path to watch
        pathsToWatch.set(workspace.uri, workspace.uri);
        // Compute additional includes from configuration
        if (config.files?.watcherInclude) {
            for (const includePath of config.files.watcherInclude) {
                if (!includePath) {
                    continue;
                }
                // Absolute: verify a child of the workspace
                if (isAbsolute(includePath)) {
                    const candidate = URI.file(includePath).with({ scheme: workspace.uri.scheme });
                    if (this.uriIdentityService.extUri.isEqualOrParent(candidate, workspace.uri)) {
                        pathsToWatch.set(candidate, candidate);
                    }
                }
                // Relative: join against workspace folder
                else {
                    const candidate = workspace.toResource(includePath);
                    pathsToWatch.set(candidate, candidate);
                }
            }
        }
        // Watch all paths as instructed
        const disposables = new DisposableStore();
        for (const [, pathToWatch] of pathsToWatch) {
            disposables.add(this.fileService.watch(pathToWatch, { recursive: true, excludes }));
        }
        this.watchedWorkspaces.set(workspace.uri, disposables);
    }
    unwatchWorkspace(workspace) {
        if (this.watchedWorkspaces.has(workspace.uri)) {
            dispose(this.watchedWorkspaces.get(workspace.uri));
            this.watchedWorkspaces.delete(workspace.uri);
        }
    }
    refresh() {
        // Unwatch all first
        this.unwatchWorkspaces();
        // Watch each workspace folder
        for (const folder of this.contextService.getWorkspace().folders) {
            this.watchWorkspace(folder);
        }
    }
    unwatchWorkspaces() {
        for (const [, disposable] of this.watchedWorkspaces) {
            disposable.dispose();
        }
        this.watchedWorkspaces.clear();
    }
    dispose() {
        super.dispose();
        this.unwatchWorkspaces();
    }
};
WorkspaceWatcher = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, INotificationService),
    __param(4, IOpenerService),
    __param(5, IUriIdentityService),
    __param(6, IHostService),
    __param(7, ITelemetryService)
], WorkspaceWatcher);
export { WorkspaceWatcher };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3dvcmtzcGFjZVdhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZSxVQUFVLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQTZCLE1BQU0sNERBQTRELENBQUM7QUFDOUgsT0FBTyxFQUFFLFlBQVksRUFBdUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQWtELE1BQU0sb0RBQW9ELENBQUM7QUFDOUksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNySixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoRixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixT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