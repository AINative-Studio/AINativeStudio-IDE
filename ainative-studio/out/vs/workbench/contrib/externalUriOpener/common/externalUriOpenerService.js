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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { isWeb } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as languages from '../../../../editor/common/languages.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultExternalUriOpenerId, externalUriOpenersSettingId } from './configuration.js';
import { testUrlMatchesGlob } from '../../url/common/urlGlob.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
export const IExternalUriOpenerService = createDecorator('externalUriOpenerService');
let ExternalUriOpenerService = class ExternalUriOpenerService extends Disposable {
    constructor(openerService, configurationService, logService, preferencesService, quickInputService) {
        super();
        this.configurationService = configurationService;
        this.logService = logService;
        this.preferencesService = preferencesService;
        this.quickInputService = quickInputService;
        this._providers = new LinkedList();
        this._register(openerService.registerExternalOpener(this));
    }
    registerExternalOpenerProvider(provider) {
        const remove = this._providers.push(provider);
        return { dispose: remove };
    }
    async getOpeners(targetUri, allowOptional, ctx, token) {
        const allOpeners = await this.getAllOpenersForUri(targetUri);
        if (allOpeners.size === 0) {
            return [];
        }
        // First see if we have a preferredOpener
        if (ctx.preferredOpenerId) {
            if (ctx.preferredOpenerId === defaultExternalUriOpenerId) {
                return [];
            }
            const preferredOpener = allOpeners.get(ctx.preferredOpenerId);
            if (preferredOpener) {
                // Skip the `canOpen` check here since the opener was specifically requested.
                return [preferredOpener];
            }
        }
        // Check to see if we have a configured opener
        const configuredOpener = this.getConfiguredOpenerForUri(allOpeners, targetUri);
        if (configuredOpener) {
            // Skip the `canOpen` check here since the opener was specifically requested.
            return configuredOpener === defaultExternalUriOpenerId ? [] : [configuredOpener];
        }
        // Then check to see if there is a valid opener
        const validOpeners = [];
        await Promise.all(Array.from(allOpeners.values()).map(async (opener) => {
            let priority;
            try {
                priority = await opener.canOpen(ctx.sourceUri, token);
            }
            catch (e) {
                this.logService.error(e);
                return;
            }
            switch (priority) {
                case languages.ExternalUriOpenerPriority.Option:
                case languages.ExternalUriOpenerPriority.Default:
                case languages.ExternalUriOpenerPriority.Preferred:
                    validOpeners.push({ opener, priority });
                    break;
            }
        }));
        if (validOpeners.length === 0) {
            return [];
        }
        // See if we have a preferred opener first
        const preferred = validOpeners.filter(x => x.priority === languages.ExternalUriOpenerPriority.Preferred).at(0);
        if (preferred) {
            return [preferred.opener];
        }
        // See if we only have optional openers, use the default opener
        if (!allowOptional && validOpeners.every(x => x.priority === languages.ExternalUriOpenerPriority.Option)) {
            return [];
        }
        return validOpeners.map(value => value.opener);
    }
    async openExternal(href, ctx, token) {
        const targetUri = typeof href === 'string' ? URI.parse(href) : href;
        const allOpeners = await this.getOpeners(targetUri, false, ctx, token);
        if (allOpeners.length === 0) {
            return false;
        }
        else if (allOpeners.length === 1) {
            return allOpeners[0].openExternalUri(targetUri, ctx, token);
        }
        // Otherwise prompt
        return this.showOpenerPrompt(allOpeners, targetUri, ctx, token);
    }
    async getOpener(targetUri, ctx, token) {
        const allOpeners = await this.getOpeners(targetUri, true, ctx, token);
        if (allOpeners.length >= 1) {
            return allOpeners[0];
        }
        return undefined;
    }
    async getAllOpenersForUri(targetUri) {
        const allOpeners = new Map();
        await Promise.all(Iterable.map(this._providers, async (provider) => {
            for await (const opener of provider.getOpeners(targetUri)) {
                allOpeners.set(opener.id, opener);
            }
        }));
        return allOpeners;
    }
    getConfiguredOpenerForUri(openers, targetUri) {
        const config = this.configurationService.getValue(externalUriOpenersSettingId) || {};
        for (const [uriGlob, id] of Object.entries(config)) {
            if (testUrlMatchesGlob(targetUri, uriGlob)) {
                if (id === defaultExternalUriOpenerId) {
                    return 'default';
                }
                const entry = openers.get(id);
                if (entry) {
                    return entry;
                }
            }
        }
        return undefined;
    }
    async showOpenerPrompt(openers, targetUri, ctx, token) {
        const items = openers.map((opener) => {
            return {
                label: opener.label,
                opener: opener
            };
        });
        items.push({
            label: isWeb
                ? nls.localize('selectOpenerDefaultLabel.web', 'Open in new browser window')
                : nls.localize('selectOpenerDefaultLabel', 'Open in default browser'),
            opener: undefined
        }, { type: 'separator' }, {
            label: nls.localize('selectOpenerConfigureTitle', "Configure default opener..."),
            opener: 'configureDefault'
        });
        const picked = await this.quickInputService.pick(items, {
            placeHolder: nls.localize('selectOpenerPlaceHolder', "How would you like to open: {0}", targetUri.toString())
        });
        if (!picked) {
            // Still cancel the default opener here since we prompted the user
            return true;
        }
        if (typeof picked.opener === 'undefined') {
            return false; // Fallback to default opener
        }
        else if (picked.opener === 'configureDefault') {
            await this.preferencesService.openUserSettings({
                jsonEditor: true,
                revealSetting: { key: externalUriOpenersSettingId, edit: true }
            });
            return true;
        }
        else {
            return picked.opener.openExternalUri(targetUri, ctx, token);
        }
    }
};
ExternalUriOpenerService = __decorate([
    __param(0, IOpenerService),
    __param(1, IConfigurationService),
    __param(2, ILogService),
    __param(3, IPreferencesService),
    __param(4, IQuickInputService)
], ExternalUriOpenerService);
export { ExternalUriOpenerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVybmFsVXJpT3BlbmVyL2NvbW1vbi9leHRlcm5hbFVyaU9wZW5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUMsTUFBTSxzREFBc0QsQ0FBQztBQUMvSCxPQUFPLEVBQUUsMEJBQTBCLEVBQW1DLDJCQUEyQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFt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