/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Vibe Coder Mode (redesign phase 9, docs/design/handoff README "Vibe Coder Mode").
 *
 * A toggleable simplified layout that hides developer-centric chrome so the chat surface
 * (the ainative view container, which already lives in AUXILIARYBAR_PART - see
 * sidebarPane.ts's ViewContainerLocation.AuxiliaryBar registration) is the dominant visible
 * surface. Per the brief's own design questions, this is a real, scoped decision, not a
 * fictional request: IWorkbenchLayoutService.setPartHidden/isVisible already exists for
 * exactly this.
 *
 * What's hidden: ACTIVITYBAR_PART (icons), SIDEBAR_PART (file tree - a user "describing what
 * they want built" doesn't need to browse files by hand), PANEL_PART (terminal - the agent
 * still runs commands, it just doesn't surface a raw shell the user has to read, per the
 * brief's own suggested default).
 *
 * What's deliberately NOT hidden: EDITOR_PART. Unlike the three parts above, EDITOR_PART is a
 * MULTI_WINDOW_PART (requires a targetWindow argument, interacts with auxiliary windows and
 * the editor grid's layout invariants) and there is zero precedent anywhere in this codebase
 * for hiding it - confirmed via repo search. Hiding the other three chrome regions already
 * delivers "near-full-screen chat," one of the two starting-guess shapes the brief explicitly
 * offered, without the engineering risk of an unprecedented operation on the main editor area.
 * Revisit if a future pass wants the fully chat-only "no editor grid at all" shape.
 *
 * Entry/exit: a single toggle, ⌘⇧V / Ctrl+Shift+V, available from both the full IDE and Vibe
 * mode itself - switching mid-session is a core supported path (the brief's own framing: "you
 * can switch to the IDE any time"), not an edge case requiring a confirmation dialog, since
 * nothing about agent/chat state is lost by hiding or restoring chrome. isVibeCoderMode is a
 * persisted global setting (not just onboarding's local, one-time initial-mode choice, which
 * only seeds this value if the user picked "I just want to build something" on first run).
 */

import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { localize2 } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { IMetricsService } from '../common/metricsService.js';
import { AINATIVE_TOGGLE_VIBE_CODER_MODE_ACTION_ID } from './actionIDs.js';

const VIBE_CODER_MODE_HIDDEN_PARTS = [Parts.ACTIVITYBAR_PART, Parts.SIDEBAR_PART, Parts.PANEL_PART] as const;

const applyVibeCoderModeLayout = (layoutService: IWorkbenchLayoutService, enabled: boolean): void => {
	for (const part of VIBE_CODER_MODE_HIDDEN_PARTS) {
		layoutService.setPartHidden(enabled, part);
	}
};

// Applies the persisted setting to the real layout on startup/restore, and keeps the layout in
// sync with any change to the setting - whether from the ⌘⇧V action below, the Settings UI, or
// (seeded once) onboarding's initial mode choice.
class VibeCoderModeWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.ainative.vibeCoderMode';

	constructor(
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IAINativeSettingsService private readonly ainativeSettingsService: IAINativeSettingsService,
	) {
		super();

		// _readState() returns persisted state as-is, with no merge against
		// defaultGlobalSettings (confirmed in ainativeSettingsService.ts) - so a user who
		// stored settings before this field existed has `isVibeCoderMode: undefined`, not
		// `false`, until they explicitly toggle it once. Coerce explicitly rather than rely on
		// undefined's incidental falsiness.
		let lastApplied: boolean | undefined;
		const sync = () => {
			const enabled = !!this.ainativeSettingsService.state.globalSettings.isVibeCoderMode;
			if (enabled === lastApplied) return;
			lastApplied = enabled;
			applyVibeCoderModeLayout(this.layoutService, enabled);
		};

		sync();
		this._register(this.ainativeSettingsService.onDidChangeState(sync));
	}
}

registerWorkbenchContribution2(VibeCoderModeWorkbenchContribution.ID, VibeCoderModeWorkbenchContribution, WorkbenchPhase.AfterRestored);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: AINATIVE_TOGGLE_VIBE_CODER_MODE_ACTION_ID,
			f1: true,
			title: localize2('ainativeToggleVibeCoderMode', 'AINative Studio: Toggle Vibe Coder Mode'),
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyV,
				weight: KeybindingWeight.AINativeExtension,
			},
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const ainativeSettingsService = accessor.get(IAINativeSettingsService);
		const metricsService = accessor.get(IMetricsService);

		const newVal = !ainativeSettingsService.state.globalSettings.isVibeCoderMode; // !undefined === true, so a never-set value correctly toggles on
		await ainativeSettingsService.setGlobalSetting('isVibeCoderMode', newVal);
		metricsService.capture('Toggled Vibe Coder Mode', { enabled: newVal });
		// The workbench contribution above applies the actual layout change in response to
		// this setting's onDidChangeState - this action only owns the setting, not the layout,
		// so the Settings UI (or a future re-run of onboarding) can flip the same switch.
	}
});
