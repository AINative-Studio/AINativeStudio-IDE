/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICloudBootstrapService } from '../common/cloudBootstrapService.js';
import { IAINativeCloudAuthService } from '../common/ainativeCloudAuthTypes.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { matchBootstrapProviderName } from '../common/cloudBootstrapProviderMapping.js';

/**
 * Closes #184: a Cloud sign-in alone didn't provision any usable provider API key, even though
 * GET /api/v1/cli/bootstrap (the same endpoint the real AINative CLI already calls after login)
 * returns real, usable direct_providers[].api_key values. On every successful sign-in, this
 * fetches bootstrap and fills in any BYOK provider slot the user hasn't already configured
 * themselves - never overwrites an existing key, since a user's own manually-entered key (their
 * own account, potentially a different plan/quota) must always win over whatever the backend
 * offers as a default.
 */
class CloudBootstrapContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.ainative.cloudBootstrap';
	_serviceBrand: undefined;

	private _hasRunForCurrentSession = false;

	constructor(
		@ICloudBootstrapService private readonly cloudBootstrapService: ICloudBootstrapService,
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
		@IAINativeSettingsService private readonly ainativeSettingsService: IAINativeSettingsService,
	) {
		super();

		this._register(this.authService.onDidChangeAuthState(() => this._tryBootstrap()));
		this._tryBootstrap(); // in case already signed in when this contribution activates
	}

	private async _tryBootstrap(): Promise<void> {
		if (this._hasRunForCurrentSession) return;
		const token = await this.authService.getAccessToken();
		if (!token) return;

		this._hasRunForCurrentSession = true;
		try {
			const result = await this.cloudBootstrapService.bootstrap();
			await this.ainativeSettingsService.waitForInitState;

			for (const directProvider of result.directProviders) {
				const providerName = matchBootstrapProviderName(directProvider.provider);
				if (!providerName) {
					console.warn(`[CloudBootstrap] No local provider matches backend provider "${directProvider.provider}" - skipping.`);
					continue;
				}

				const existingSettings = this.ainativeSettingsService.state.settingsOfProvider[providerName];
				const existingKey = 'apiKey' in existingSettings ? existingSettings.apiKey : undefined;
				if (existingKey) continue; // never overwrite a key the user configured themselves

				if ('apiKey' in existingSettings) {
					await this.ainativeSettingsService.setSettingOfProvider(providerName, 'apiKey', directProvider.apiKey);
				}
			}
		} catch (e) {
			this._hasRunForCurrentSession = false; // allow retry on the next sign-in/auth-state change
			console.error('[CloudBootstrap] Failed to bootstrap provider keys after sign-in:', e);
		}
	}
}

registerWorkbenchContribution2(CloudBootstrapContribution.ID, CloudBootstrapContribution, WorkbenchPhase.Eventually);
