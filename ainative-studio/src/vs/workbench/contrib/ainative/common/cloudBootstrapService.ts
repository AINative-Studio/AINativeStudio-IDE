/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getAINativeConfig } from './ainativeConfig.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';

/**
 * Client for GET /api/v1/cli/bootstrap (#184). Confirmed live and real against the full
 * api.ainative.studio OpenAPI spec (fetched and parsed directly): a JWT-Bearer-authenticated
 * endpoint the real AINative CLI already uses after login to get working model access - its
 * response schema's own docstring says "The CLI parser (src/services/api/bootstrap.ts) reads:
 * ...direct_providers -> direct inference endpoints." This is the IDE-side equivalent: after a
 * Cloud sign-in, a user should end up with usable model access the same way the CLI already
 * does, rather than needing a separately-provisioned sk_-style API key that doesn't exist
 * anywhere in this API.
 */
export interface DirectProvider {
	readonly provider: string; // raw backend string - see cloudBootstrapProviderMapping.ts for mapping onto this codebase's ProviderName
	readonly baseUrl: string;
	readonly apiKey: string;
	readonly models: readonly string[];
	readonly rpmLimit: number;
	readonly supportsTools: boolean;
}

export interface ModelOption {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly contextWindow: number;
	readonly maxOutputTokens: number;
	readonly planRequired: string;
	readonly supportsTools: boolean;
	readonly supportsStreaming: boolean;
}

export interface BootstrapUserInfo {
	readonly id: string;
	readonly email: string;
	readonly name: string | null;
	readonly organization: string | null;
	readonly organizationId: string | null;
}

export interface BootstrapResponse {
	readonly plan: string;
	readonly user: BootstrapUserInfo | null;
	readonly additionalModelOptions: readonly ModelOption[];
	readonly defaultModel: string;
	readonly fastModel: string;
	readonly directProviders: readonly DirectProvider[];
}

export class CloudBootstrapError extends Error {
	constructor(public readonly statusCode: number, message: string) {
		super(message);
		this.name = 'CloudBootstrapError';
	}
}

export interface ICloudBootstrapService {
	readonly _serviceBrand: undefined;
	/** Calls GET /api/v1/cli/bootstrap. Throws CloudBootstrapError(401, ...) if not signed in. */
	bootstrap(): Promise<BootstrapResponse>;
}

export const ICloudBootstrapService = createDecorator<ICloudBootstrapService>('cloudBootstrapService');

class CloudBootstrapService extends Disposable implements ICloudBootstrapService {
	readonly _serviceBrand: undefined;

	private readonly apiBaseUrl = getAINativeConfig().apiBaseUrl;

	constructor(
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
	) {
		super();
	}

	async bootstrap(): Promise<BootstrapResponse> {
		const token = await this.authService.getAccessToken();
		if (!token) {
			throw new CloudBootstrapError(401, 'Not authenticated. Please sign in to AINative Cloud first.');
		}

		let response: Response;
		try {
			response = await fetch(`${this.apiBaseUrl}/api/v1/cli/bootstrap`, {
				method: 'GET',
				headers: { 'Authorization': `Bearer ${token}` },
			});
		} catch (e) {
			throw new CloudBootstrapError(0, `Network error calling /api/v1/cli/bootstrap: ${e}`);
		}
		if (!response.ok) {
			throw new CloudBootstrapError(response.status, `Bootstrap request failed with status ${response.status}`);
		}

		const body = await response.json() as {
			plan: string;
			user_plan?: string;
			user: { id: string; email: string; name: string | null; organization: string | null; organization_id: string | null } | null;
			additional_model_options: { id: string; name: string; category: string; context_window: number; max_output_tokens: number; plan_required: string; supports_tools: boolean; supports_streaming: boolean }[];
			client_data: { default_model: string; fast_model: string };
			direct_providers: { provider: string; base_url: string; api_key: string; models: string[]; rpm_limit: number; supports_tools: boolean }[];
		};

		return {
			plan: body.plan || body.user_plan || '',
			user: body.user ? {
				id: body.user.id,
				email: body.user.email,
				name: body.user.name,
				organization: body.user.organization,
				organizationId: body.user.organization_id,
			} : null,
			additionalModelOptions: body.additional_model_options.map(m => ({
				id: m.id, name: m.name, category: m.category, contextWindow: m.context_window,
				maxOutputTokens: m.max_output_tokens, planRequired: m.plan_required,
				supportsTools: m.supports_tools, supportsStreaming: m.supports_streaming,
			})),
			defaultModel: body.client_data?.default_model ?? '',
			fastModel: body.client_data?.fast_model ?? '',
			directProviders: body.direct_providers.map(p => ({
				provider: p.provider, baseUrl: p.base_url, apiKey: p.api_key,
				models: p.models, rpmLimit: p.rpm_limit, supportsTools: p.supports_tools,
			})),
		};
	}
}

registerSingleton(ICloudBootstrapService, CloudBootstrapService, InstantiationType.Delayed);
