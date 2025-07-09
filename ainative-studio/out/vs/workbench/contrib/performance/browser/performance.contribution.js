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
import { localize2 } from '../../../../nls.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Extensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { PerfviewContrib, PerfviewInput } from './perfviewEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { InstantiationService, Trace } from '../../../../platform/instantiation/common/instantiationService.js';
import { EventProfiling } from '../../../../base/common/event.js';
import { InputLatencyContrib } from './inputLatencyContrib.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { GCBasedDisposableTracker, setDisposableTracker } from '../../../../base/common/lifecycle.js';
// -- startup performance view
registerWorkbenchContribution2(PerfviewContrib.ID, PerfviewContrib, { lazy: true });
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(PerfviewInput.Id, class {
    canSerialize() {
        return true;
    }
    serialize() {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(PerfviewInput);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'perfview.show',
            title: localize2('show.label', 'Startup Performance'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const contrib = PerfviewContrib.get();
        return editorService.openEditor(contrib.getEditorInput(), { pinned: true });
    }
});
registerAction2(class PrintServiceCycles extends Action2 {
    constructor() {
        super({
            id: 'perf.insta.printAsyncCycles',
            title: localize2('cycles', 'Print Service Cycles'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const instaService = accessor.get(IInstantiationService);
        if (instaService instanceof InstantiationService) {
            const cycle = instaService._globalGraph?.findCycleSlow();
            if (cycle) {
                console.warn(`CYCLE`, cycle);
            }
            else {
                console.warn(`YEAH, no more cycles`);
            }
        }
    }
});
registerAction2(class PrintServiceTraces extends Action2 {
    constructor() {
        super({
            id: 'perf.insta.printTraces',
            title: localize2('insta.trace', 'Print Service Traces'),
            category: Categories.Developer,
            f1: true
        });
    }
    run() {
        if (Trace.all.size === 0) {
            console.log('Enable via `instantiationService.ts#_enableAllTracing`');
            return;
        }
        for (const item of Trace.all) {
            console.log(item);
        }
    }
});
registerAction2(class PrintEventProfiling extends Action2 {
    constructor() {
        super({
            id: 'perf.event.profiling',
            title: localize2('emitter', 'Print Emitter Profiles'),
            category: Categories.Developer,
            f1: true
        });
    }
    run() {
        if (EventProfiling.all.size === 0) {
            console.log('USE `EmitterOptions._profName` to enable profiling');
            return;
        }
        for (const item of EventProfiling.all) {
            console.log(`${item.name}: ${item.invocationCount} invocations COST ${item.elapsedOverall}ms, ${item.listenerCount} listeners, avg cost is ${item.durations.reduce((a, b) => a + b, 0) / item.durations.length}ms`);
        }
    }
});
// -- input latency
Registry.as(Extensions.Workbench).registerWorkbenchContribution(InputLatencyContrib, 4 /* LifecyclePhase.Eventually */);
// -- track leaking disposables, those that get GC'ed before having been disposed
let DisposableTracking = class DisposableTracking {
    static { this.Id = 'perf.disposableTracking'; }
    constructor(envService) {
        if (!envService.isBuilt && !envService.extensionTestsLocationURI) {
            setDisposableTracker(new GCBasedDisposableTracker());
        }
    }
};
DisposableTracking = __decorate([
    __param(0, IEnvironmentService)
], DisposableTracking);
registerWorkbenchContribution2(DisposableTracking.Id, DisposableTracking, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2Jyb3dzZXIvcGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQW1DLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQy9JLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNkMsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFB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