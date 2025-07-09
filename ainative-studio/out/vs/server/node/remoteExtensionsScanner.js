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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEUsT0FBTyxLQUFLLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9DLE9BQU8sS0FBSyxXQUFXLE1BQU0sa0NBQWtDLENBQUM7QUFFaEUsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXJGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQXdCLDJCQUEyQixFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLHFCQUFxQixFQUF5QixNQUFNLGdEQUFnRCxDQUFDO0FBRzFYLE9BQU8sRUFBNkIsc0JBQXNCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUsxSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBRXpHLE1BQU0sT0FBTyw4QkFBOEI7SUFPMUMsWUFDa0IsdUJBQStDLEVBQ2hFLGtCQUE2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