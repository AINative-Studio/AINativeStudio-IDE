/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isAbsolute, join, resolve } from '../../base/common/path.js';
import * as platform from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { URI } from '../../base/common/uri.js';
import * as performance from '../../base/common/performance.js';
import { transformOutgoingURIs } from '../../base/common/uriIpc.js';
import { ContextKeyDefinedExpr, ContextKeyEqualsExpr, ContextKeyExpr, ContextKeyGreaterEqualsExpr, ContextKeyGreaterExpr, ContextKeyInExpr, ContextKeyNotEqualsExpr, ContextKeyNotExpr, ContextKeyNotInExpr, ContextKeyRegexExpr, ContextKeySmallerEqualsExpr, ContextKeySmallerExpr } from '../../platform/contextkey/common/contextkey.js';
import { toExtensionDescription } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { dedupExtensions } from '../../workbench/services/extensions/common/extensionsUtil.js';
import { Schemas } from '../../base/common/network.js';
import { areSameExtensions } from '../../platform/extensionManagement/common/extensionManagementUtil.js';
export class RemoteExtensionsScannerService {
    constructor(_extensionManagementCLI, environmentService, _userDataProfilesService, _extensionsScannerService, _logService, _extensionGalleryService, _languagePackService, _extensionManagementService) {
        this._extensionManagementCLI = _extensionManagementCLI;
        this._userDataProfilesService = _userDataProfilesService;
        this._extensionsScannerService = _extensionsScannerService;
        this._logService = _logService;
        this._extensionGalleryService = _extensionGalleryService;
        this._languagePackService = _languagePackService;
        this._extensionManagementService = _extensionManagementService;
        this._whenBuiltinExtensionsReady = Promise.resolve({ failed: [] });
        this._whenExtensionsReady = Promise.resolve({ failed: [] });
        const builtinExtensionsToInstall = environmentService.args['install-builtin-extension'];
        if (builtinExtensionsToInstall) {
            _logService.trace('Installing builtin extensions passed via args...');
            const installOptions = { isMachineScoped: !!environmentService.args['do-not-sync'], installPreReleaseVersion: !!environmentService.args['pre-release'] };
            performance.mark('code/server/willInstallBuiltinExtensions');
            this._whenExtensionsReady = this._whenBuiltinExtensionsReady = _extensionManagementCLI.installExtensions([], this._asExtensionIdOrVSIX(builtinExtensionsToInstall), installOptions, !!environmentService.args['force'])
                .then(() => {
                performance.mark('code/server/didInstallBuiltinExtensions');
                _logService.trace('Finished installing builtin extensions');
                return { failed: [] };
            }, error => {
                _logService.error(error);
                return { failed: [] };
            });
        }
        const extensionsToInstall = environmentService.args['install-extension'];
        if (extensionsToInstall) {
            _logService.trace('Installing extensions passed via args...');
            const installOptions = {
                isMachineScoped: !!environmentService.args['do-not-sync'],
                installPreReleaseVersion: !!environmentService.args['pre-release'],
                isApplicationScoped: true // extensions installed during server startup are available to all profiles
            };
            this._whenExtensionsReady = this._whenBuiltinExtensionsReady
                .then(() => _extensionManagementCLI.installExtensions(this._asExtensionIdOrVSIX(extensionsToInstall), [], installOptions, !!environmentService.args['force']))
                .then(async () => {
                _logService.trace('Finished installing extensions');
                return { failed: [] };
            }, async (error) => {
                _logService.error(error);
                const failed = [];
                const alreadyInstalled = await this._extensionManagementService.getInstalled(1 /* ExtensionType.User */);
                for (const id of this._asExtensionIdOrVSIX(extensionsToInstall)) {
                    if (typeof id === 'string') {
                        if (!alreadyInstalled.some(e => areSameExtensions(e.identifier, { id }))) {
                            failed.push({ id, installOptions });
                        }
                    }
                }
                if (!failed.length) {
                    _logService.trace(`No extensions to report as failed`);
                    return { failed: [] };
                }
                _logService.info(`Relaying the following extensions to install later: ${failed.map(f => f.id).join(', ')}`);
                return { failed };
            });
        }
    }
    _asExtensionIdOrVSIX(inputs) {
        return inputs.map(input => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
    whenExtensionsReady() {
        return this._whenExtensionsReady;
    }
    async scanExtensions(language, profileLocation, workspaceExtensionLocations, extensionDevelopmentLocations, languagePackId) {
        performance.mark('code/server/willScanExtensions');
        this._logService.trace(`Scanning extensions using UI language: ${language}`);
        await this._whenBuiltinExtensionsReady;
        const extensionDevelopmentPaths = extensionDevelopmentLocations ? extensionDevelopmentLocations.filter(url => url.scheme === Schemas.file).map(url => url.fsPath) : undefined;
        profileLocation = profileLocation ?? this._userDataProfilesService.defaultProfile.extensionsResource;
        const extensions = await this._scanExtensions(profileLocation, language ?? platform.language, workspaceExtensionLocations, extensionDevelopmentPaths, languagePackId);
        this._logService.trace('Scanned Extensions', extensions);
        this._massageWhenConditions(extensions);
        performance.mark('code/server/didScanExtensions');
        return extensions;
    }
    async _scanExtensions(profileLocation, language, workspaceInstalledExtensionLocations, extensionDevelopmentPath, languagePackId) {
        await this._ensureLanguagePackIsInstalled(language, languagePackId);
        const [builtinExtensions, installedExtensions, workspaceInstalledExtensions, developedExtensions] = await Promise.all([
            this._scanBuiltinExtensions(language),
            this._scanInstalledExtensions(profileLocation, language),
            this._scanWorkspaceInstalledExtensions(language, workspaceInstalledExtensionLocations),
            this._scanDevelopedExtensions(language, extensionDevelopmentPath)
        ]);
        return dedupExtensions(builtinExtensions, installedExtensions, workspaceInstalledExtensions, developedExtensions, this._logService);
    }
    async _scanDevelopedExtensions(language, extensionDevelopmentPaths) {
        if (extensionDevelopmentPaths) {
            return (await Promise.all(extensionDevelopmentPaths.map(extensionDevelopmentPath => this._extensionsScannerService.scanOneOrMultipleExtensions(URI.file(resolve(extensionDevelopmentPath)), 1 /* ExtensionType.User */, { language }))))
                .flat()
                .map(e => toExtensionDescription(e, true));
        }
        return [];
    }
    async _scanWorkspaceInstalledExtensions(language, workspaceInstalledExtensions) {
        const result = [];
        if (workspaceInstalledExtensions?.length) {
            const scannedExtensions = await Promise.all(workspaceInstalledExtensions.map(location => this._extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, { language })));
            for (const scannedExtension of scannedExtensions) {
                if (scannedExtension) {
                    result.push(toExtensionDescription(scannedExtension, false));
                }
            }
        }
        return result;
    }
    async _scanBuiltinExtensions(language) {
        const scannedExtensions = await this._extensionsScannerService.scanSystemExtensions({ language });
        return scannedExtensions.map(e => toExtensionDescription(e, false));
    }
    async _scanInstalledExtensions(profileLocation, language) {
        const scannedExtensions = await this._extensionsScannerService.scanUserExtensions({ profileLocation, language, useCache: true });
        return scannedExtensions.map(e => toExtensionDescription(e, false));
    }
    async _ensureLanguagePackIsInstalled(language, languagePackId) {
        if (
        // No need to install language packs for the default language
        language === platform.LANGUAGE_DEFAULT ||
            // The extension gallery service needs to be available
            !this._extensionGalleryService.isEnabled()) {
            return;
        }
        try {
            const installed = await this._languagePackService.getInstalledLanguages();
            if (installed.find(p => p.id === language)) {
                this._logService.trace(`Language Pack ${language} is already installed. Skipping language pack installation.`);
                return;
            }
        }
        catch (err) {
            // We tried to see what is installed but failed. We can try installing anyway.
            this._logService.error(err);
        }
        if (!languagePackId) {
            this._logService.trace(`No language pack id provided for language ${language}. Skipping language pack installation.`);
            return;
        }
        this._logService.trace(`Language Pack ${languagePackId} for language ${language} is not installed. It will be installed now.`);
        try {
            await this._extensionManagementCLI.installExtensions([languagePackId], [], { isMachineScoped: true }, true);
        }
        catch (err) {
            // We tried to install the language pack but failed. We can continue without it thus using the default language.
            this._logService.error(err);
        }
    }
    _massageWhenConditions(extensions) {
        // Massage "when" conditions which mention `resourceScheme`
        const _mapResourceSchemeValue = (value, isRegex) => {
            // console.log(`_mapResourceSchemeValue: ${value}, ${isRegex}`);
            return value.replace(/file/g, 'vscode-remote');
        };
        const _mapResourceRegExpValue = (value) => {
            let flags = '';
            flags += value.global ? 'g' : '';
            flags += value.ignoreCase ? 'i' : '';
            flags += value.multiline ? 'm' : '';
            return new RegExp(_mapResourceSchemeValue(value.source, true), flags);
        };
        const _exprKeyMapper = new class {
            mapDefined(key) {
                return ContextKeyDefinedExpr.create(key);
            }
            mapNot(key) {
                return ContextKeyNotExpr.create(key);
            }
            mapEquals(key, value) {
                if (key === 'resourceScheme' && typeof value === 'string') {
                    return ContextKeyEqualsExpr.create(key, _mapResourceSchemeValue(value, false));
                }
                else {
                    return ContextKeyEqualsExpr.create(key, value);
                }
            }
            mapNotEquals(key, value) {
                if (key === 'resourceScheme' && typeof value === 'string') {
                    return ContextKeyNotEqualsExpr.create(key, _mapResourceSchemeValue(value, false));
                }
                else {
                    return ContextKeyNotEqualsExpr.create(key, value);
                }
            }
            mapGreater(key, value) {
                return ContextKeyGreaterExpr.create(key, value);
            }
            mapGreaterEquals(key, value) {
                return ContextKeyGreaterEqualsExpr.create(key, value);
            }
            mapSmaller(key, value) {
                return ContextKeySmallerExpr.create(key, value);
            }
            mapSmallerEquals(key, value) {
                return ContextKeySmallerEqualsExpr.create(key, value);
            }
            mapRegex(key, regexp) {
                if (key === 'resourceScheme' && regexp) {
                    return ContextKeyRegexExpr.create(key, _mapResourceRegExpValue(regexp));
                }
                else {
                    return ContextKeyRegexExpr.create(key, regexp);
                }
            }
            mapIn(key, valueKey) {
                return ContextKeyInExpr.create(key, valueKey);
            }
            mapNotIn(key, valueKey) {
                return ContextKeyNotInExpr.create(key, valueKey);
            }
        };
        const _massageWhenUser = (element) => {
            if (!element || !element.when || !/resourceScheme/.test(element.when)) {
                return;
            }
            const expr = ContextKeyExpr.deserialize(element.when);
            if (!expr) {
                return;
            }
            const massaged = expr.map(_exprKeyMapper);
            element.when = massaged.serialize();
        };
        const _massageWhenUserArr = (elements) => {
            if (Array.isArray(elements)) {
                for (const element of elements) {
                    _massageWhenUser(element);
                }
            }
            else {
                _massageWhenUser(elements);
            }
        };
        const _massageLocWhenUser = (target) => {
            for (const loc in target) {
                _massageWhenUserArr(target[loc]);
            }
        };
        extensions.forEach((extension) => {
            if (extension.contributes) {
                if (extension.contributes.menus) {
                    _massageLocWhenUser(extension.contributes.menus);
                }
                if (extension.contributes.keybindings) {
                    _massageWhenUserArr(extension.contributes.keybindings);
                }
                if (extension.contributes.views) {
                    _massageLocWhenUser(extension.contributes.views);
                }
            }
        });
    }
}
export class RemoteExtensionsScannerChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'whenExtensionsReady': return await this.service.whenExtensionsReady();
            case 'scanExtensions': {
                const language = args[0];
                const profileLocation = args[1] ? URI.revive(uriTransformer.transformIncoming(args[1])) : undefined;
                const workspaceExtensionLocations = Array.isArray(args[2]) ? args[2].map(u => URI.revive(uriTransformer.transformIncoming(u))) : undefined;
                const extensionDevelopmentPath = Array.isArray(args[3]) ? args[3].map(u => URI.revive(uriTransformer.transformIncoming(u))) : undefined;
                const languagePackId = args[4];
                const extensions = await this.service.scanExtensions(language, profileLocation, workspaceExtensionLocations, extensionDevelopmentPath, languagePackId);
                return extensions.map(extension => transformOutgoingURIs(extension, uriTransformer));
            }
        }
        throw new Error('Invalid call');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUV4dGVuc2lvbnNTY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RFLE9BQU8sS0FBSyxRQUFRLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEtBQUssV0FBVyxNQUFNLGtDQUFrQyxDQUFDO0FBRWhFLE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUF3QiwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBeUIsTUFBTSxnREFBZ0QsQ0FBQztBQUcxWCxPQUFPLEVBQTZCLHNCQUFzQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFLMUksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUd2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUV6RyxNQUFNLE9BQU8sOEJBQThCO0lBTzFDLFlBQ2tCLHVCQUErQyxFQUNoRSxr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