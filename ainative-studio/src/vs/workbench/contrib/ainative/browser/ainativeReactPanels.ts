/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

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
import { IEditorGroup, IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Dimension } from '../../../../base/browser/dom.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
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
function registerReactPanel(options: {
	readonly idSuffix: string;
	readonly scheme: string;
	readonly titleKey: string;
	readonly title: string;
	readonly icon: Codicon;
	readonly commandId: string;
	readonly commandTitleKey: string;
	readonly commandTitle: string;
	readonly mountFn: (el: HTMLElement, accessor: ServicesAccessor) => { dispose?: () => void } | undefined;
}) {
	class PanelInput extends EditorInput {
		static readonly ID: string = `workbench.input.ainative.${options.idSuffix}`;

		static readonly RESOURCE = URI.from({
			scheme: 'ainative',
			path: options.scheme,
		});
		readonly resource = PanelInput.RESOURCE;

		constructor() {
			super();
		}

		override get typeId(): string {
			return PanelInput.ID;
		}

		override getName(): string {
			return nls.localize(options.titleKey, options.title);
		}

		override getIcon() {
			return options.icon;
		}
	}

	class PanelEditor extends EditorPane {
		static readonly ID = `workbench.ainative.${options.idSuffix}Pane`;

		constructor(
			group: IEditorGroup,
			@ITelemetryService telemetryService: ITelemetryService,
			@IThemeService themeService: IThemeService,
			@IStorageService storageService: IStorageService,
			@IInstantiationService private readonly instantiationService: IInstantiationService
		) {
			super(PanelEditor.ID, group, telemetryService, themeService, storageService);
		}

		protected createEditor(parent: HTMLElement): void {
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

		layout(_dimension: Dimension): void {
			// React content is responsive via its own flex/grid layout; the mount
			// element above is already sized to 100%/100% of the editor pane.
		}

		override get minimumWidth() { return 700; }
	}

	Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
		EditorPaneDescriptor.create(PanelEditor, PanelEditor.ID, nls.localize(options.titleKey, options.title)),
		[new SyncDescriptor(PanelInput)]
	);

	registerAction2(class extends Action2 {
		constructor() {
			super({
				id: options.commandId,
				title: nls.localize2(options.commandTitleKey, options.commandTitle),
				f1: true,
				icon: options.icon,
			});
		}

		async run(accessor: ServicesAccessor): Promise<void> {
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
