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
import { timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifier, ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IProfileAnalysisWorkerService } from '../../../../platform/profiling/electron-sandbox/profileAnalysisWorkerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { createSlowExtensionAction } from './extensionsSlowActions.js';
import { IExtensionHostProfileService } from './runtimeExtensionsEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionHostProfiler } from '../../../services/extensions/electron-sandbox/extensionHostProfiler.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
let ExtensionsAutoProfiler = class ExtensionsAutoProfiler {
    constructor(_extensionService, _extensionProfileService, _telemetryService, _logService, _notificationService, _editorService, _instantiationService, _environmentServie, _profileAnalysisService, _configService, _fileService, timerService) {
        this._extensionService = _extensionService;
        this._extensionProfileService = _extensionProfileService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._environmentServie = _environmentServie;
        this._profileAnalysisService = _profileAnalysisService;
        this._configService = _configService;
        this._fileService = _fileService;
        this._blame = new ExtensionIdentifierSet();
        this._perfBaseline = -1;
        timerService.perfBaseline.then(value => {
            if (value < 0) {
                return; // too slow for profiling
            }
            this._perfBaseline = value;
            this._unresponsiveListener = _extensionService.onDidChangeResponsiveChange(this._onDidChangeResponsiveChange, this);
        });
    }
    dispose() {
        this._unresponsiveListener?.dispose();
        this._session?.dispose(true);
    }
    async _onDidChangeResponsiveChange(event) {
        if (event.extensionHostKind !== 1 /* ExtensionHostKind.LocalProcess */) {
            return;
        }
        const listener = await event.getInspectListener(true);
        if (!listener) {
            return;
        }
        if (event.isResponsive && this._session) {
            // stop profiling when responsive again
            this._session.cancel();
            this._logService.info('UNRESPONSIVE extension host: received responsive event and cancelling profiling session');
        }
        else if (!event.isResponsive && !this._session) {
            // start profiling if not yet profiling
            const cts = new CancellationTokenSource();
            this._session = cts;
            let session;
            try {
                session = await this._instantiationService.createInstance(ExtensionHostProfiler, listener.host, listener.port).start();
            }
            catch (err) {
                this._session = undefined;
                // fail silent as this is often
                // caused by another party being
                // connected already
                return;
            }
            this._logService.info('UNRESPONSIVE extension host: starting to profile NOW');
            // wait 5 seconds or until responsive again
            try {
                await timeout(5e3, cts.token);
            }
            catch {
                // can throw cancellation error. that is
                // OK, we stop profiling and analyse the
                // profile anyways
            }
            try {
                // stop profiling and analyse results
                this._processCpuProfile(await session.stop());
            }
            catch (err) {
                onUnexpectedError(err);
            }
            finally {
                this._session = undefined;
            }
        }
    }
    async _processCpuProfile(profile) {
        // get all extensions
        await this._extensionService.whenInstalledExtensionsRegistered();
        // send heavy samples iff enabled
        if (this._configService.getValue('application.experimental.rendererProfiling')) {
            const searchTree = TernarySearchTree.forUris();
            searchTree.fill(this._extensionService.extensions.map(e => [e.extensionLocation, e]));
            await this._profileAnalysisService.analyseBottomUp(profile.data, url => searchTree.findSubstr(URI.parse(url))?.identifier.value ?? '<<not-found>>', this._perfBaseline, false);
        }
        // analyse profile by extension-category
        const categories = this._extensionService.extensions
            .filter(e => e.extensionLocation.scheme === Schemas.file)
            .map(e => [e.extensionLocation, ExtensionIdentifier.toKey(e.identifier)]);
        const data = await this._profileAnalysisService.analyseByLocation(profile.data, categories);
        //
        let overall = 0;
        let top = '';
        let topAggregated = -1;
        for (const [category, aggregated] of data) {
            overall += aggregated;
            if (aggregated > topAggregated) {
                topAggregated = aggregated;
                top = category;
            }
        }
        const topPercentage = topAggregated / (overall / 100);
        // associate extensions to profile node
        const extension = await this._extensionService.getExtension(top);
        if (!extension) {
            // not an extension => idle, gc, self?
            return;
        }
        const profilingSessionId = generateUuid();
        // print message to log
        const path = joinPath(this._environmentServie.tmpDir, `exthost-${Math.random().toString(16).slice(2, 8)}.cpuprofile`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(profile.data)));
        this._logService.warn(`UNRESPONSIVE extension host: '${top}' took ${topPercentage}% of ${topAggregated / 1e3}ms, saved PROFILE here: '${path}'`);
        this._telemetryService.publicLog2('exthostunresponsive', {
            profilingSessionId,
            duration: overall,
            data: data.map(tuple => tuple[0]).flat(),
            id: ExtensionIdentifier.toKey(extension.identifier),
        });
        // add to running extensions view
        this._extensionProfileService.setUnresponsiveProfile(extension.identifier, profile);
        // prompt: when really slow/greedy
        if (!(topPercentage >= 95 && topAggregated >= 5e6)) {
            return;
        }
        const action = await this._instantiationService.invokeFunction(createSlowExtensionAction, extension, profile);
        if (!action) {
            // cannot report issues against this extension...
            return;
        }
        // only blame once per extension, don't blame too often
        if (this._blame.has(extension.identifier) || this._blame.size >= 3) {
            return;
        }
        this._blame.add(extension.identifier);
        // user-facing message when very bad...
        this._notificationService.prompt(Severity.Warning, localize('unresponsive-exthost', "The extension '{0}' took a very long time to complete its last operation and it has prevented other extensions from running.", extension.displayName || extension.name), [{
                label: localize('show', 'Show Extensions'),
                run: () => this._editorService.openEditor(RuntimeExtensionsInput.instance, { pinned: true })
            },
            action
        ], { priority: NotificationPriority.SILENT });
    }
};
ExtensionsAutoProfiler = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionHostProfileService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, INotificationService),
    __param(5, IEditorService),
    __param(6, IInstantiationService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IProfileAnalysisWorkerService),
    __param(9, IConfigurationService),
    __param(10, IFileService),
    __param(11, ITimerService)
], ExtensionsAutoProfiler);
export { ExtensionsAutoProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0F1dG9Qcm9maWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uc0F1dG9Qcm9maWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUF5QixNQUFNLHNEQUFzRCxDQUFDO0FBQzFJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFP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