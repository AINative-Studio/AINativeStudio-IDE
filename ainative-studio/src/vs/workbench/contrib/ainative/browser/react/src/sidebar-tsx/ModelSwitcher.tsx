/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useAccessor, useSettingsState, useAINativeAuth } from '../util/services.js';
import { Popover } from '../primitives/Popover.js';
import {
	FeatureName,
	ModelSelection,
	modelSelectionsEqual,
	localProviderNames,
} from '../../../../../../../workbench/contrib/ainative/common/ainativeSettingsTypes.js';
import { modelFilterOfFeatureName, ModelOption } from '../../../../../../../workbench/contrib/ainative/common/ainativeSettingsService.js';
import { AINATIVE_OPEN_SETTINGS_ACTION_ID } from '../../../ainativeSettingsPane.js';

/**
 * Model/provider switcher chip + popover, per the redesign (docs/design/handoff README
 * "Model/provider switcher"). Replaces the generic dropdown's visual with the spec's grouped
 * layout (AINATIVE CLOUD / YOUR KEYS / LOCAL), reading the exact same model data and settings
 * service the existing ModelDropdown uses - no new backend calls, no invented data. The
 * spec's per-model credit multiplier is intentionally omitted: no such data exists anywhere
 * in this codebase today (confirmed via repo search), and the resolved guidance for this
 * redesign is to use only data that's actually exposed rather than fabricate numbers.
 */
export const ModelSwitcher: React.FC<{ featureName: FeatureName; className?: string }> = ({ featureName, className = '' }) => {
	const accessor = useAccessor();
	const voidSettingsService = accessor.get('IAINativeSettingsService');
	const commandService = accessor.get('ICommandService');
	const settingsState = useSettingsState();
	const { isAuthenticated } = useAINativeAuth();

	const { filter } = modelFilterOfFeatureName[featureName];

	const options = useMemo(
		() => settingsState._modelOptions.filter(o => filter(o.selection, { chatMode: settingsState.globalSettings.chatMode, overridesOfModel: settingsState.overridesOfModel })),
		[settingsState._modelOptions, settingsState.globalSettings.chatMode, settingsState.overridesOfModel, filter]
	);

	const selection = voidSettingsService.state.modelSelectionOfFeature[featureName];
	const selectedOption = selection ? options.find(o => modelSelectionsEqual(o.selection, selection)) ?? options[0] : options[0];

	const cloudOptions = options.filter(o => o.selection.providerName === 'ainativeCloud');
	const keyOptions = options.filter(o => o.selection.providerName !== 'ainativeCloud' && !(localProviderNames as readonly string[]).includes(o.selection.providerName));
	const localOptions = options.filter(o => (localProviderNames as readonly string[]).includes(o.selection.providerName));

	const onPick = (newSelection: ModelSelection, close: () => void) => {
		voidSettingsService.setModelSelectionOfFeature(featureName, newSelection);
		close();
	};

	const openSettings = () => { commandService.executeCommand(AINATIVE_OPEN_SETTINGS_ACTION_ID); };

	if (options.length === 0) return null;

	return (
		<Popover
			width={320}
			trigger={({ ref, onClick, ...triggerProps }) => (
				<button
					ref={ref as any}
					onClick={onClick}
					{...triggerProps}
					className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ainative-fg-2 hover:bg-ainative-bg-3 hover:text-ainative-fg-1 transition-colors ${className}`}
				>
					<span className="truncate max-w-[160px]">
						{selectedOption ? `${selectedOption.selection.modelName} · ${providerDisplayLabel(selectedOption.selection.providerName)}` : 'Select a model'}
					</span>
					<ChevronDown size={12} className="flex-shrink-0 opacity-70" />
				</button>
			)}
		>
			{({ close }: { close: () => void }) => (
				<div className="max-h-[400px] overflow-y-auto py-1.5">
					<ModelGroup
						label="AINATIVE CLOUD"
						options={cloudOptions}
						selectedOption={selectedOption}
						onPick={sel => onPick(sel, close)}
						emptyRow={!isAuthenticated ? { label: 'Sign in to use credits', onClick: openSettings } : undefined}
					/>
					<ModelGroup
						label="YOUR KEYS"
						options={keyOptions}
						selectedOption={selectedOption}
						onPick={sel => onPick(sel, close)}
						emptyRow={{ label: 'Add a provider key', onClick: openSettings }}
					/>
					<ModelGroup
						label="LOCAL"
						options={localOptions}
						selectedOption={selectedOption}
						onPick={sel => onPick(sel, close)}
						emptyRow={{ label: 'Detect local models', onClick: openSettings }}
					/>
				</div>
			)}
		</Popover>
	);
};

const providerDisplayLabel = (providerName: string): string => {
	if (providerName === 'ainativeCloud') return 'AINative Cloud';
	return providerName;
};

const ModelGroup: React.FC<{
	label: string;
	options: ModelOption[];
	selectedOption: ModelOption | undefined;
	onPick: (selection: ModelSelection) => void;
	emptyRow?: { label: string; onClick: () => void };
}> = ({ label, options, selectedOption, onPick, emptyRow }) => {
	if (options.length === 0 && !emptyRow) return null;
	return (
		<div className="px-1.5 py-1">
			<div className="px-2 py-1 text-[10.5px] font-semibold tracking-[0.04em] text-ainative-fg-2">{label}</div>
			{options.map(opt => {
				const isSelected = selectedOption && modelSelectionsEqual(opt.selection, selectedOption.selection);
				return (
					<button
						key={`${opt.selection.providerName}/${opt.selection.modelName}`}
						onClick={() => onPick(opt.selection)}
						className={`w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-root transition-colors
							${isSelected ? 'bg-ainative-accent-bg text-ainative-fg-0' : 'text-ainative-fg-1 hover:bg-ainative-bg-3'}`}
					>
						<span className="truncate">{opt.selection.modelName}</span>
						{isSelected && <Check size={14} className="flex-shrink-0 text-ainative-accent-fg" />}
					</button>
				);
			})}
			{options.length === 0 && emptyRow && (
				<button
					onClick={emptyRow.onClick}
					className="w-full text-left rounded-md px-2 py-1.5 text-root text-ainative-fg-2 hover:bg-ainative-bg-3 hover:text-ainative-fg-1 transition-colors"
				>
					{emptyRow.label}
				</button>
			)}
		</div>
	);
};
