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
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { Emitter } from '../../base/common/event.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { isWindows } from '../../base/common/platform.js';
import { equals } from '../../base/common/objects.js';
import { DeferredPromise } from '../../base/common/async.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
export const applicationConfigurationNodeBase = Object.freeze({
    'id': 'application',
    'order': 100,
    'title': localize('applicationConfigurationTitle', "Application"),
    'type': 'object'
});
export const workbenchConfigurationNodeBase = Object.freeze({
    'id': 'workbench',
    'order': 7,
    'title': localize('workbenchConfigurationTitle', "Workbench"),
    'type': 'object',
});
export const securityConfigurationNodeBase = Object.freeze({
    'id': 'security',
    'scope': 1 /* ConfigurationScope.APPLICATION */,
    'title': localize('securityConfigurationTitle', "Security"),
    'type': 'object',
    'order': 7
});
export const problemsConfigurationNodeBase = Object.freeze({
    'id': 'problems',
    'title': localize('problemsConfigurationTitle', "Problems"),
    'type': 'object',
    'order': 101
});
export const windowConfigurationNodeBase = Object.freeze({
    'id': 'window',
    'order': 8,
    'title': localize('windowConfigurationTitle', "Window"),
    'type': 'object',
});
export const Extensions = {
    ConfigurationMigration: 'base.contributions.configuration.migration'
};
class ConfigurationMigrationRegistry {
    constructor() {
        this.migrations = [];
        this._onDidRegisterConfigurationMigrations = new Emitter();
        this.onDidRegisterConfigurationMigration = this._onDidRegisterConfigurationMigrations.event;
    }
    registerConfigurationMigrations(configurationMigrations) {
        this.migrations.push(...configurationMigrations);
    }
}
const configurationMigrationRegistry = new ConfigurationMigrationRegistry();
Registry.add(Extensions.ConfigurationMigration, configurationMigrationRegistry);
let ConfigurationMigrationWorkbenchContribution = class ConfigurationMigrationWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.configurationMigration'; }
    constructor(configurationService, workspaceService) {
        super();
        this.configurationService = configurationService;
        this.workspaceService = workspaceService;
        this._register(this.workspaceService.onDidChangeWorkspaceFolders(async (e) => {
            for (const folder of e.added) {
                await this.migrateConfigurationsForFolder(folder, configurationMigrationRegistry.migrations);
            }
        }));
        this.migrateConfigurations(configurationMigrationRegistry.migrations);
        this._register(configurationMigrationRegistry.onDidRegisterConfigurationMigration(migration => this.migrateConfigurations(migration)));
    }
    async migrateConfigurations(migrations) {
        await this.migrateConfigurationsForFolder(undefined, migrations);
        for (const folder of this.workspaceService.getWorkspace().folders) {
            await this.migrateConfigurationsForFolder(folder, migrations);
        }
    }
    async migrateConfigurationsForFolder(folder, migrations) {
        await Promise.all([migrations.map(migration => this.migrateConfigurationsForFolderAndOverride(migration, folder?.uri))]);
    }
    async migrateConfigurationsForFolderAndOverride(migration, resource) {
        const inspectData = this.configurationService.inspect(migration.key, { resource });
        const targetPairs = this.workspaceService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? [
            ['user', 2 /* ConfigurationTarget.USER */],
            ['userLocal', 3 /* ConfigurationTarget.USER_LOCAL */],
            ['userRemote', 4 /* ConfigurationTarget.USER_REMOTE */],
            ['workspace', 5 /* ConfigurationTarget.WORKSPACE */],
            ['workspaceFolder', 6 /* ConfigurationTarget.WORKSPACE_FOLDER */],
        ] : [
            ['user', 2 /* ConfigurationTarget.USER */],
            ['userLocal', 3 /* ConfigurationTarget.USER_LOCAL */],
            ['userRemote', 4 /* ConfigurationTarget.USER_REMOTE */],
            ['workspace', 5 /* ConfigurationTarget.WORKSPACE */],
        ];
        for (const [dataKey, target] of targetPairs) {
            const inspectValue = inspectData[dataKey];
            if (!inspectValue) {
                continue;
            }
            const migrationValues = [];
            if (inspectValue.value !== undefined) {
                const keyValuePairs = await this.runMigration(migration, dataKey, inspectValue.value, resource, undefined);
                for (const keyValuePair of keyValuePairs ?? []) {
                    migrationValues.push([keyValuePair, []]);
                }
            }
            for (const { identifiers, value } of inspectValue.overrides ?? []) {
                if (value !== undefined) {
                    const keyValuePairs = await this.runMigration(migration, dataKey, value, resource, identifiers);
                    for (const keyValuePair of keyValuePairs ?? []) {
                        migrationValues.push([keyValuePair, identifiers]);
                    }
                }
            }
            if (migrationValues.length) {
                // apply migrations
                await Promise.allSettled(migrationValues.map(async ([[key, value], overrideIdentifiers]) => this.configurationService.updateValue(key, value.value, { resource, overrideIdentifiers }, target)));
            }
        }
    }
    async runMigration(migration, dataKey, value, resource, overrideIdentifiers) {
        const valueAccessor = (key) => {
            const inspectData = this.configurationService.inspect(key, { resource });
            const inspectValue = inspectData[dataKey];
            if (!inspectValue) {
                return undefined;
            }
            if (!overrideIdentifiers) {
                return inspectValue.value;
            }
            return inspectValue.overrides?.find(({ identifiers }) => equals(identifiers, overrideIdentifiers))?.value;
        };
        const result = await migration.migrateFn(value, valueAccessor);
        return Array.isArray(result) ? result : [[migration.key, result]];
    }
};
ConfigurationMigrationWorkbenchContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService)
], ConfigurationMigrationWorkbenchContribution);
export { ConfigurationMigrationWorkbenchContribution };
let DynamicWorkbenchSecurityConfiguration = class DynamicWorkbenchSecurityConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicWorkbenchSecurityConfiguration'; }
    constructor(remoteAgentService) {
        super();
        this.remoteAgentService = remoteAgentService;
        this._ready = new DeferredPromise();
        this.ready = this._ready.p;
        this.create();
    }
    async create() {
        try {
            await this.doCreate();
        }
        finally {
            this._ready.complete();
        }
    }
    async doCreate() {
        if (!isWindows) {
            const remoteEnvironment = await this.remoteAgentService.getEnvironment();
            if (remoteEnvironment?.os !== 1 /* OperatingSystem.Windows */) {
                return;
            }
        }
        // Windows: UNC allow list security configuration
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            ...securityConfigurationNodeBase,
            'properties': {
                'security.allowedUNCHosts': {
                    'type': 'array',
                    'items': {
                        'type': 'string',
                        'pattern': '^[^\\\\]+$',
                        'patternErrorMessage': localize('security.allowedUNCHosts.patternErrorMessage', 'UNC host names must not contain backslashes.')
                    },
                    'default': [],
                    'markdownDescription': localize('security.allowedUNCHosts', 'A set of UNC host names (without leading or trailing backslash, for example `192.168.0.1` or `my-server`) to allow without user confirmation. If a UNC host is being accessed that is not allowed via this setting or has not been acknowledged via user confirmation, an error will occur and the operation stopped. A restart is required when changing this setting. Find out more about this setting at https://aka.ms/vscode-windows-unc.'),
                    'scope': 3 /* ConfigurationScope.APPLICATION_MACHINE */
                },
                'security.restrictUNCAccess': {
                    'type': 'boolean',
                    'default': true,
                    'markdownDescription': localize('security.restrictUNCAccess', 'If enabled, only allows access to UNC host names that are allowed by the `#security.allowedUNCHosts#` setting or after user confirmation. Find out more about this setting at https://aka.ms/vscode-windows-unc.'),
                    'scope': 3 /* ConfigurationScope.APPLICATION_MACHINE */
                }
            }
        });
    }
};
DynamicWorkbenchSecurityConfiguration = __decorate([
    __param(0, IRemoteAgentService)
], DynamicWorkbenchSecurityConfiguration);
export { DynamicWorkbenchSecurityConfiguration };
export const CONFIG_NEW_WINDOW_PROFILE = 'window.newWindowProfile';
let DynamicWindowConfiguration = class DynamicWindowConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicWindowConfiguration'; }
    constructor(userDataProfilesService, configurationService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.configurationService = configurationService;
        this.registerNewWindowProfileConfiguration();
        this._register(this.userDataProfilesService.onDidChangeProfiles((e) => this.registerNewWindowProfileConfiguration()));
        this.setNewWindowProfile();
        this.checkAndResetNewWindowProfileConfig();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source !== 7 /* ConfigurationTarget.DEFAULT */ && e.affectsConfiguration(CONFIG_NEW_WINDOW_PROFILE)) {
                this.setNewWindowProfile();
            }
        }));
        this._register(this.userDataProfilesService.onDidChangeProfiles(() => this.checkAndResetNewWindowProfileConfig()));
    }
    registerNewWindowProfileConfiguration() {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        const configurationNode = {
            ...windowConfigurationNodeBase,
            'properties': {
                [CONFIG_NEW_WINDOW_PROFILE]: {
                    'type': ['string', 'null'],
                    'default': null,
                    'enum': [...this.userDataProfilesService.profiles.map(profile => profile.name), null],
                    'enumItemLabels': [...this.userDataProfilesService.profiles.map(p => ''), localize('active window', "Active Window")],
                    'description': localize('newWindowProfile', "Specifies the profile to use when opening a new window. If a profile name is provided, the new window will use that profile. If no profile name is provided, the new window will use the profile of the active window or the Default profile if no active window exists."),
                    'scope': 1 /* ConfigurationScope.APPLICATION */,
                }
            }
        };
        if (this.configurationNode) {
            registry.updateConfigurations({ add: [configurationNode], remove: [this.configurationNode] });
        }
        else {
            registry.registerConfiguration(configurationNode);
        }
        this.configurationNode = configurationNode;
    }
    setNewWindowProfile() {
        const newWindowProfileName = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        this.newWindowProfile = newWindowProfileName ? this.userDataProfilesService.profiles.find(profile => profile.name === newWindowProfileName) : undefined;
    }
    checkAndResetNewWindowProfileConfig() {
        const newWindowProfileName = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        if (!newWindowProfileName) {
            return;
        }
        const profile = this.newWindowProfile ? this.userDataProfilesService.profiles.find(profile => profile.id === this.newWindowProfile.id) : undefined;
        if (newWindowProfileName === profile?.name) {
            return;
        }
        this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, profile?.name);
    }
};
DynamicWindowConfiguration = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IConfigurationService)
], DynamicWindowConfiguration);
export { DynamicWindowConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQWtFLFVBQVUsSUFBSSx1QkFBdUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3JMLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQW9DLE1BQU0sOENBQThDLENBQUM7QUFDMUgsT0FBTyxFQUF1QixxQkFBcUIsRUFBc0MsTUFBTSxzREFBc0QsQ0FBQztBQUN0SixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RGLE9BQU8sRUFBbUIsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFdEgsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBcUI7SUFDakYsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLEdBQUc7SUFDWixPQUFPLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQztJ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