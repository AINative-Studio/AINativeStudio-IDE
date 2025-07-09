/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { DeferredPromise, runWhenGlobalIdle } from '../../base/common/async.js';
import { mark } from '../../base/common/performance.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IEnvironmentService } from '../../platform/environment/common/environment.js';
import { getOrSet } from '../../base/common/map.js';
import { Disposable, DisposableStore, isDisposable } from '../../base/common/lifecycle.js';
import { IEditorPaneService } from '../services/editor/common/editorPaneService.js';
export var Extensions;
(function (Extensions) {
    /**
     * @deprecated use `registerWorkbenchContribution2` instead.
     */
    Extensions.Workbench = 'workbench.contributions.kind';
})(Extensions || (Extensions = {}));
export var WorkbenchPhase;
(function (WorkbenchPhase) {
    /**
     * The first phase signals that we are about to startup getting ready.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use the other types, preferable
     * `Lazy` to only instantiate the contribution when really needed.
     */
    WorkbenchPhase[WorkbenchPhase["BlockStartup"] = 1] = "BlockStartup";
    /**
     * Services are ready and the window is about to restore its UI state.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use the other types, preferable
     * `Lazy` to only instantiate the contribution when really needed.
     */
    WorkbenchPhase[WorkbenchPhase["BlockRestore"] = 2] = "BlockRestore";
    /**
     * Views, panels and editors have restored. Editors are given a bit of
     * time to restore their contents.
     */
    WorkbenchPhase[WorkbenchPhase["AfterRestored"] = 3] = "AfterRestored";
    /**
     * The last phase after views, panels and editors have restored and
     * some time has passed (2-5 seconds).
     */
    WorkbenchPhase[WorkbenchPhase["Eventually"] = 4] = "Eventually";
})(WorkbenchPhase || (WorkbenchPhase = {}));
function isOnEditorWorkbenchContributionInstantiation(obj) {
    const candidate = obj;
    return !!candidate && typeof candidate.editorTypeId === 'string';
}
function toWorkbenchPhase(phase) {
    switch (phase) {
        case 3 /* LifecyclePhase.Restored */:
            return 3 /* WorkbenchPhase.AfterRestored */;
        case 4 /* LifecyclePhase.Eventually */:
            return 4 /* WorkbenchPhase.Eventually */;
    }
}
function toLifecyclePhase(instantiation) {
    switch (instantiation) {
        case 1 /* WorkbenchPhase.BlockStartup */:
            return 1 /* LifecyclePhase.Starting */;
        case 2 /* WorkbenchPhase.BlockRestore */:
            return 2 /* LifecyclePhase.Ready */;
        case 3 /* WorkbenchPhase.AfterRestored */:
            return 3 /* LifecyclePhase.Restored */;
        case 4 /* WorkbenchPhase.Eventually */:
            return 4 /* LifecyclePhase.Eventually */;
    }
}
export class WorkbenchContributionsRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this.contributionsByPhase = new Map();
        this.contributionsByEditor = new Map();
        this.contributionsById = new Map();
        this.instancesById = new Map();
        this.instanceDisposables = this._register(new DisposableStore());
        this.timingsByPhase = new Map();
        this.pendingRestoredContributions = new DeferredPromise();
        this.whenRestored = this.pendingRestoredContributions.p;
    }
    static { this.INSTANCE = new WorkbenchContributionsRegistry(); }
    static { this.BLOCK_BEFORE_RESTORE_WARN_THRESHOLD = 20; }
    static { this.BLOCK_AFTER_RESTORE_WARN_THRESHOLD = 100; }
    get timings() { return this.timingsByPhase; }
    registerWorkbenchContribution2(id, ctor, instantiation) {
        const contribution = { id, ctor };
        // Instantiate directly if we already have a matching instantiation condition
        if (this.instantiationService && this.lifecycleService && this.logService && this.environmentService && this.editorPaneService &&
            ((typeof instantiation === 'number' && this.lifecycleService.phase >= instantiation) ||
                (typeof id === 'string' && isOnEditorWorkbenchContributionInstantiation(instantiation) && this.editorPaneService.didInstantiateEditorPane(instantiation.editorTypeId)))) {
            this.safeCreateContribution(this.instantiationService, this.logService, this.environmentService, contribution, typeof instantiation === 'number' ? toLifecyclePhase(instantiation) : this.lifecycleService.phase);
        }
        // Otherwise keep contributions by instantiation kind for later instantiation
        else {
            // by phase
            if (typeof instantiation === 'number') {
                getOrSet(this.contributionsByPhase, toLifecyclePhase(instantiation), []).push(contribution);
            }
            if (typeof id === 'string') {
                // by id
                if (!this.contributionsById.has(id)) {
                    this.contributionsById.set(id, contribution);
                }
                else {
                    console.error(`IWorkbenchContributionsRegistry#registerWorkbenchContribution(): Can't register multiple contributions with same id '${id}'`);
                }
                // by editor
                if (isOnEditorWorkbenchContributionInstantiation(instantiation)) {
                    getOrSet(this.contributionsByEditor, instantiation.editorTypeId, []).push(contribution);
                }
            }
        }
    }
    registerWorkbenchContribution(ctor, phase) {
        this.registerWorkbenchContribution2(undefined, ctor, toWorkbenchPhase(phase));
    }
    getWorkbenchContribution(id) {
        if (this.instancesById.has(id)) {
            return this.instancesById.get(id);
        }
        const instantiationService = this.instantiationService;
        const lifecycleService = this.lifecycleService;
        const logService = this.logService;
        const environmentService = this.environmentService;
        if (!instantiationService || !lifecycleService || !logService || !environmentService) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): cannot be called before registry started`);
        }
        const contribution = this.contributionsById.get(id);
        if (!contribution) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): contribution with that identifier is unknown.`);
        }
        if (lifecycleService.phase < 3 /* LifecyclePhase.Restored */) {
            logService.warn(`IWorkbenchContributionsRegistry#getContribution('${id}'): contribution instantiated before LifecyclePhase.Restored!`);
        }
        this.safeCreateContribution(instantiationService, logService, environmentService, contribution, lifecycleService.phase);
        const instance = this.instancesById.get(id);
        if (!instance) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): failed to create contribution.`);
        }
        return instance;
    }
    start(accessor) {
        const instantiationService = this.instantiationService = accessor.get(IInstantiationService);
        const lifecycleService = this.lifecycleService = accessor.get(ILifecycleService);
        const logService = this.logService = accessor.get(ILogService);
        const environmentService = this.environmentService = accessor.get(IEnvironmentService);
        const editorPaneService = this.editorPaneService = accessor.get(IEditorPaneService);
        // Dispose contributions on shutdown
        this._register(lifecycleService.onDidShutdown(() => {
            this.instanceDisposables.clear();
        }));
        // Instantiate contributions by phase when they are ready
        for (const phase of [1 /* LifecyclePhase.Starting */, 2 /* LifecyclePhase.Ready */, 3 /* LifecyclePhase.Restored */, 4 /* LifecyclePhase.Eventually */]) {
            this.instantiateByPhase(instantiationService, lifecycleService, logService, environmentService, phase);
        }
        // Instantiate contributions by editor when they are created or have been
        for (const editorTypeId of this.contributionsByEditor.keys()) {
            if (editorPaneService.didInstantiateEditorPane(editorTypeId)) {
                this.onEditor(editorTypeId, instantiationService, lifecycleService, logService, environmentService);
            }
        }
        this._register(editorPaneService.onWillInstantiateEditorPane(e => this.onEditor(e.typeId, instantiationService, lifecycleService, logService, environmentService)));
    }
    onEditor(editorTypeId, instantiationService, lifecycleService, logService, environmentService) {
        const contributions = this.contributionsByEditor.get(editorTypeId);
        if (contributions) {
            this.contributionsByEditor.delete(editorTypeId);
            for (const contribution of contributions) {
                this.safeCreateContribution(instantiationService, logService, environmentService, contribution, lifecycleService.phase);
            }
        }
    }
    instantiateByPhase(instantiationService, lifecycleService, logService, environmentService, phase) {
        // Instantiate contributions directly when phase is already reached
        if (lifecycleService.phase >= phase) {
            this.doInstantiateByPhase(instantiationService, logService, environmentService, phase);
        }
        // Otherwise wait for phase to be reached
        else {
            lifecycleService.when(phase).then(() => this.doInstantiateByPhase(instantiationService, logService, environmentService, phase));
        }
    }
    async doInstantiateByPhase(instantiationService, logService, environmentService, phase) {
        const contributions = this.contributionsByPhase.get(phase);
        if (contributions) {
            this.contributionsByPhase.delete(phase);
            switch (phase) {
                case 1 /* LifecyclePhase.Starting */:
                case 2 /* LifecyclePhase.Ready */: {
                    // instantiate everything synchronously and blocking
                    // measure the time it takes as perf marks for diagnosis
                    mark(`code/willCreateWorkbenchContributions/${phase}`);
                    for (const contribution of contributions) {
                        this.safeCreateContribution(instantiationService, logService, environmentService, contribution, phase);
                    }
                    mark(`code/didCreateWorkbenchContributions/${phase}`);
                    break;
                }
                case 3 /* LifecyclePhase.Restored */:
                case 4 /* LifecyclePhase.Eventually */: {
                    // for the Restored/Eventually-phase we instantiate contributions
                    // only when idle. this might take a few idle-busy-cycles but will
                    // finish within the timeouts
                    // given that, we must ensure to await the contributions from the
                    // Restored-phase before we instantiate the Eventually-phase
                    if (phase === 4 /* LifecyclePhase.Eventually */) {
                        await this.pendingRestoredContributions.p;
                    }
                    this.doInstantiateWhenIdle(contributions, instantiationService, logService, environmentService, phase);
                    break;
                }
            }
        }
    }
    doInstantiateWhenIdle(contributions, instantiationService, logService, environmentService, phase) {
        mark(`code/willCreateWorkbenchContributions/${phase}`);
        let i = 0;
        const forcedTimeout = phase === 4 /* LifecyclePhase.Eventually */ ? 3000 : 500;
        const instantiateSome = (idle) => {
            while (i < contributions.length) {
                const contribution = contributions[i++];
                this.safeCreateContribution(instantiationService, logService, environmentService, contribution, phase);
                if (idle.timeRemaining() < 1) {
                    // time is up -> reschedule
                    runWhenGlobalIdle(instantiateSome, forcedTimeout);
                    break;
                }
            }
            if (i === contributions.length) {
                mark(`code/didCreateWorkbenchContributions/${phase}`);
                if (phase === 3 /* LifecyclePhase.Restored */) {
                    this.pendingRestoredContributions.complete();
                }
            }
        };
        runWhenGlobalIdle(instantiateSome, forcedTimeout);
    }
    safeCreateContribution(instantiationService, logService, environmentService, contribution, phase) {
        if (typeof contribution.id === 'string' && this.instancesById.has(contribution.id)) {
            return;
        }
        const now = Date.now();
        try {
            if (typeof contribution.id === 'string') {
                mark(`code/willCreateWorkbenchContribution/${phase}/${contribution.id}`);
            }
            const instance = instantiationService.createInstance(contribution.ctor);
            if (typeof contribution.id === 'string') {
                this.instancesById.set(contribution.id, instance);
                this.contributionsById.delete(contribution.id);
            }
            if (isDisposable(instance)) {
                this.instanceDisposables.add(instance);
            }
        }
        catch (error) {
            logService.error(`Unable to create workbench contribution '${contribution.id ?? contribution.ctor.name}'.`, error);
        }
        finally {
            if (typeof contribution.id === 'string') {
                mark(`code/didCreateWorkbenchContribution/${phase}/${contribution.id}`);
            }
        }
        if (typeof contribution.id === 'string' || !environmentService.isBuilt /* only log out of sources where we have good ctor names */) {
            const time = Date.now() - now;
            if (time > (phase < 3 /* LifecyclePhase.Restored */ ? WorkbenchContributionsRegistry.BLOCK_BEFORE_RESTORE_WARN_THRESHOLD : WorkbenchContributionsRegistry.BLOCK_AFTER_RESTORE_WARN_THRESHOLD)) {
                logService.warn(`Creation of workbench contribution '${contribution.id ?? contribution.ctor.name}' took ${time}ms.`);
            }
            if (typeof contribution.id === 'string') {
                let timingsForPhase = this.timingsByPhase.get(phase);
                if (!timingsForPhase) {
                    timingsForPhase = [];
                    this.timingsByPhase.set(phase, timingsForPhase);
                }
                timingsForPhase.push([contribution.id, time]);
            }
        }
    }
}
/**
 * Register a workbench contribution that will be instantiated
 * based on the `instantiation` property.
 */
export const registerWorkbenchContribution2 = WorkbenchContributionsRegistry.INSTANCE.registerWorkbenchContribution2.bind(WorkbenchContributionsRegistry.INSTANCE);
/**
 * Provides access to a workbench contribution with a specific identifier.
 * The contribution is created if not yet done.
 *
 * Note: will throw an error if
 * - called too early before the registry has started
 * - no contribution is known for the given identifier
 */
export const getWorkbenchContribution = WorkbenchContributionsRegistry.INSTANCE.getWorkbenchContribution.bind(WorkbenchContributionsRegistry.INSTANCE);
Registry.add(Extensions.Workbench, WorkbenchContributionsRegistry.INSTANCE);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2NvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUEyRCxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFnQixlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQVNwRixNQUFNLEtBQVcsVUFBVSxDQUsxQjtBQUxELFdBQWlCLFVBQVU7SUFDMUI7O09BRUc7SUFDVSxvQkFBUyxHQUFHLDhCQUE4QixDQUFDO0FBQ3pELENBQUMsRUFMZ0IsVUFBVSxLQUFWLFVBQVUsUUFLMUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsY0ErQmpCO0FBL0JELFdBQWtCLGNBQWM7SUFFL0I7Ozs7OztPQU1HO0lBQ0gsbUVBQXNDLENBQUE7SUFFdEM7Ozs7OztPQU1HO0lBQ0gs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