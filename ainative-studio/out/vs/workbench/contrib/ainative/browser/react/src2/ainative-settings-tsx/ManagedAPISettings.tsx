/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback } from 'react';
import { AINativeSwitch } from '../util/inputs.js';
import { useSettingsState, useAccessor } from '../util/services.js';
import { ManagedAPISettings as ManagedAPISettingsType, defaultManagedAPISettings } from '../../../../common/ainativeSettingsTypes.js';
import { ManagedAPIModelSelector } from './ManagedAPIModelSelector.js';
import { ManagedAPIIterationSlider } from './ManagedAPIIterationSlider.js';
import { ManagedAPIThresholdSlider } from './ManagedAPIThresholdSlider.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { Info } from 'lucide-react';
import { AINativeButtonBgDarken } from '../util/inputs.js';

export const ManagedAPISettings: React.FC = () => {
	const settingsState = useSettingsState();
	const accessor = useAccessor();
	const voidSettingsService = accessor.get('IAINativeSettingsService');

	const managedAPISettings = settingsState.globalSettings.managedAPI || defaultManagedAPISettings;

	const updateSetting = useCallback(<K extends keyof ManagedAPISettingsType>(
		key: K,
		value: ManagedAPISettingsType[K]
	) => {
		const newManagedAPISettings: ManagedAPISettingsType = {
			...managedAPISettings,
			[key]: value
		};

		voidSettingsService.setGlobalSetting('managedAPI', newManagedAPISettings);
	}, [managedAPISettings, voidSettingsService]);

	const handleReset = useCallback(() => {
		voidSettingsService.setGlobalSetting('managedAPI', defaultManagedAPISettings);
	}, [voidSettingsService]);

	return (
		<div className="ainative-flex ainative-flex-col ainative-gap-6">
			<ErrorBoundary>
				{/* Header */}
				<div>
					<h2 className="ainative-text-3xl ainative-mb-2">Managed API Configuration</h2>
					<div className="ainative-text-ainative-fg-3 ainative-mb-4 ainative-flex ainative-items-start ainative-gap-2">
						<Info className="ainative-size-4 ainative-mt-0.5 ainative-flex-shrink-0" />
						<p className="ainative-text-sm">
							Configure Phase 2 managed API features including tool calling, model preferences, and usage tracking.
						</p>
					</div>
				</div>

				{/* Enable Managed API */}
				<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
					<div className="ainative-flex ainative-items-center ainative-gap-3">
						<AINativeSwitch
							size="xs"
							value={managedAPISettings.enabled}
							onChange={(value) => updateSetting('enabled', value)}
						/>
						<div className="ainative-flex ainative-flex-col">
							<span className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
								Enable Managed API
							</span>
							<span className="ainative-text-xs ainative-text-ainative-fg-3">
								Use AINative Cloud's managed infrastructure for AI requests
							</span>
						</div>
					</div>
				</div>

				{/* Main Settings Grid */}
				<div className={`ainative-flex ainative-flex-col ainative-gap-6 ${!managedAPISettings.enabled ? 'ainative-opacity-50 ainative-pointer-events-none' : ''}`}>

					{/* Tool Calling */}
					<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
						<div className="ainative-flex ainative-items-center ainative-gap-3">
							<AINativeSwitch
								size="xs"
								value={managedAPISettings.autoToolCalling}
								onChange={(value) => updateSetting('autoToolCalling', value)}
								disabled={!managedAPISettings.enabled}
							/>
							<div className="ainative-flex ainative-flex-col">
								<span className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
									Enable Auto Tool Calling
								</span>
								<span className="ainative-text-xs ainative-text-ainative-fg-3">
									Automatically invoke tools when the AI needs them
								</span>
							</div>
						</div>
					</div>

					{/* Preferred Model */}
					<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
						<div className="ainative-flex ainative-flex-col ainative-gap-2">
							<label className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
								Preferred Model
							</label>
							<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-2">
								Default model to use for managed API requests
							</span>
							<ManagedAPIModelSelector
								value={managedAPISettings.preferredModel}
								onChange={(value) => updateSetting('preferredModel', value)}
								disabled={!managedAPISettings.enabled}
							/>
						</div>
					</div>

					{/* Max Iterations */}
					<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
						<div className="ainative-flex ainative-flex-col ainative-gap-2">
							<label className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
								Maximum Tool Iterations
							</label>
							<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-2">
								Maximum number of tool calls the AI can make in a single request
							</span>
							<ManagedAPIIterationSlider
								value={managedAPISettings.maxIterations}
								onChange={(value) => updateSetting('maxIterations', value)}
								disabled={!managedAPISettings.enabled}
							/>
						</div>
					</div>

					{/* Display Options */}
					<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
						<h3 className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">
							Display Options
						</h3>

						{/* Show Credits */}
						<div className="ainative-flex ainative-items-center ainative-gap-3">
							<AINativeSwitch
								size="xs"
								value={managedAPISettings.showCreditsInChat}
								onChange={(value) => updateSetting('showCreditsInChat', value)}
								disabled={!managedAPISettings.enabled}
							/>
							<div className="ainative-flex ainative-flex-col">
								<span className="ainative-text-sm ainative-text-ainative-fg-1">
									Show Credits in Chat
								</span>
								<span className="ainative-text-xs ainative-text-ainative-fg-3">
									Display remaining credit balance in the chat interface
								</span>
							</div>
						</div>

						{/* Show Tool Executions */}
						<div className="ainative-flex ainative-items-center ainative-gap-3">
							<AINativeSwitch
								size="xs"
								value={managedAPISettings.showToolExecutions}
								onChange={(value) => updateSetting('showToolExecutions', value)}
								disabled={!managedAPISettings.enabled}
							/>
							<div className="ainative-flex ainative-flex-col">
								<span className="ainative-text-sm ainative-text-ainative-fg-1">
									Show Tool Executions
								</span>
								<span className="ainative-text-xs ainative-text-ainative-fg-3">
									Display detailed information about tool calls and results
								</span>
							</div>
						</div>
					</div>

					{/* Usage Quota Warning */}
					<div className="ainative-flex ainative-flex-col ainative-gap-3 ainative-p-4 ainative-rounded ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-1">
						<div className="ainative-flex ainative-flex-col ainative-gap-2">
							<label className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
								Usage Quota Warning
							</label>
							<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-2">
								Show a warning when credit usage exceeds this threshold
							</span>
							<ManagedAPIThresholdSlider
								value={managedAPISettings.quotaWarningThreshold}
								onChange={(value) => updateSetting('quotaWarningThreshold', value)}
								disabled={!managedAPISettings.enabled}
							/>
						</div>
					</div>

					{/* Reset Button */}
					<div className="ainative-flex ainative-justify-end">
						<AINativeButtonBgDarken
							onClick={handleReset}
							disabled={!managedAPISettings.enabled}
							className="ainative-px-4 ainative-py-2"
						>
							Reset to Defaults
						</AINativeButtonBgDarken>
					</div>
				</div>
			</ErrorBoundary>
		</div>
	);
};
