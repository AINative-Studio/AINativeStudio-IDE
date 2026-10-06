/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/**
 * Mount sites for three React panels that previously had none: Tool Logs,
 * Model Browser, and Usage Dashboard (see issue #150). Each panel is a
 * full-page, self-contained React tree (its own header/toolbar, own data
 * loading, own error states) rather than a small popup, so each is mounted
 * as its own EditorPane -- the exact same pattern `ainativeSettingsPane.ts`
 * uses for the Settings pane (EditorInput + EditorPane + a command-palette
 * action that opens/toggles it). See that file for the canonical reference;
 * this file just repeats the pattern three times instead of once.
 */
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import * as nls from '../../../../nls.js';
import { EditorExtensions } from '../../../common/editor.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { mountToolLogsPanel } from './react/out/tool-logs/index.js';
import { mountModelBrowser } from './react/out/model-browser/index.js';
import { mountUsageDashboard } from './react/out/usage-dashboard/index.js';
/**
 * Generic factory for a full-page React panel mounted as its own editor tab.
 * Reduces the three EditorInput/EditorPane/action groups below to data instead
 * of three near-identical classes.
 */
function registerReactPanel(options) {
    var PanelEditor_1;
    class PanelInput extends EditorInput {
        static { this.ID = `workbench.input.ainative.${options.idSuffix}`; }
        static { this.RESOURCE = URI.from({
            scheme: 'ainative',
            path: options.scheme,
        }); }
        constructor() {
            super();
            this.resource = PanelInput.RESOURCE;
        }
        get typeId() {
            return PanelInput.ID;
        }
        getName() {
            return nls.localize(options.titleKey, options.title);
        }
        getIcon() {
            return options.icon;
        }
    }
    let PanelEditor = class PanelEditor extends EditorPane {
        static { PanelEditor_1 = this; }
        static { this.ID = `workbench.ainative.${options.idSuffix}Pane`; }
        constructor(group, telemetryService, themeService, storageService, instantiationService) {
            super(PanelEditor_1.ID, group, telemetryService, themeService, storageService);
            this.instantiationService = instantiationService;
        }
        createEditor(parent) {
            parent.style.height = '100%';
            parent.style.width = '100%';
            const mountElt = document.createElement('div');
            mountElt.style.height = '100%';
            mountElt.style.width = '100%';
            mountElt.style.overflow = 'auto';
            parent.appendChild(mountElt);
            this.instantiationService.invokeFunction(accessor => {
                const disposeFn = options.mountFn(mountElt, accessor)?.dispose;
                this._register(toDisposable(() => disposeFn?.()));
            });
        }
        layout(_dimension) {
            // React content is responsive via its own flex/grid layout; the mount
            // element above is already sized to 100%/100% of the editor pane.
        }
        get minimumWidth() { return 700; }
    };
    PanelEditor = PanelEditor_1 = __decorate([
        __param(1, ITelemetryService),
        __param(2, IThemeService),
        __param(3, IStorageService),
        __param(4, IInstantiationService)
    ], PanelEditor);
    Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(PanelEditor, PanelEditor.ID, nls.localize(options.titleKey, options.title)), [new SyncDescriptor(PanelInput)]);
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: options.commandId,
                title: nls.localize2(options.commandTitleKey, options.commandTitle),
                f1: true,
                icon: options.icon,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const editorGroupService = accessor.get(IEditorGroupsService);
            const instantiationService = accessor.get(IInstantiationService);
            // If already open, focus it instead of opening a duplicate tab.
            const openEditors = editorService.findEditors(PanelInput.RESOURCE);
            if (openEditors.length > 0) {
                const openEditor = openEditors[0].editor;
                await editorGroupService.activeGroup.openEditor(openEditor);
                return;
            }
            const input = instantiationService.createInstance(PanelInput);
            await editorService.openEditor(input);
        }
    });
}
// Tool Logs -- debugging/monitoring view over real tool-execution history
// sourced from chat threads (see toolLogsService.ts, issue #148).
registerReactPanel({
    idSuffix: 'toolLogs',
    scheme: 'tool-logs',
    titleKey: 'ainativeToolLogsInputName',
    title: 'AINative Studio: Tool Logs',
    icon: Codicon.history,
    commandId: 'workbench.action.openAINativeToolLogs',
    commandTitleKey: 'ainativeOpenToolLogs',
    commandTitle: 'AINative Studio: Show Tool Logs',
    mountFn: mountToolLogsPanel,
});
// Model Browser -- browse/select AI models from the registry, with a built-in
// "Usage & Quota" tab. This is the provider-selection-adjacent surface, kept
// as its own command-triggered panel (rather than folded into Settings)
// because it is a big, self-contained flow (filtering, model cards, a model
// selection dialog) rather than a few settings fields.
registerReactPanel({
    idSuffix: 'modelBrowser',
    scheme: 'model-browser',
    titleKey: 'ainativeModelBrowserInputName',
    title: 'AINative Studio: Model Browser',
    icon: Codicon.package,
    commandId: 'workbench.action.openAINativeModelBrowser',
    commandTitleKey: 'ainativeOpenModelBrowser',
    commandTitle: 'AINative Studio: Browse AI Models',
    mountFn: mountModelBrowser,
});
// Usage Dashboard -- credits/usage/cost-projection visualization sourced from
// usageTrackingService.ts (issue #147).
registerReactPanel({
    idSuffix: 'usageDashboard',
    scheme: 'usage-dashboard',
    titleKey: 'ainativeUsageDashboardInputName',
    title: 'AINative Studio: Usage Dashboard',
    icon: Codicon.dashboard,
    commandId: 'workbench.action.openAINativeUsageDashboard',
    commandTitleKey: 'ainativeOpenUsageDashboard',
    commandTitle: 'AINative Studio: Show Usage Dashboard',
    mountFn: mountUsageDashboard,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVSZWFjdFBhbmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9haW5hdGl2ZVJlYWN0UGFuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGOzs7Ozs7Ozs7R0FTRztBQUVILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RSxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVqRixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUs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