/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ConfigurationManager } from '../../browser/debugConfigurationManager.js';
import { DebugConfigurationProviderTriggerKind } from '../../common/debug.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { TestQuickInputService } from '../../../../test/browser/workbenchTestServices.js';
import { TestHistoryService, TestContextService, TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('debugConfigurationManager', () => {
    const configurationProviderType = 'custom-type';
    let _debugConfigurationManager;
    let disposables;
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        },
        activateDebuggers(activationEvent, debugType) {
            return Promise.resolve();
        },
        get onDidDebuggersExtPointRead() {
            return Event.None;
        }
    };
    const preferencesService = {
        userSettingsResource: URI.file('/tmp/settings.json')
    };
    const configurationService = new TestConfigurationService();
    setup(() => {
        disposables = new DisposableStore();
        const fileService = disposables.add(new FileService(new NullLogService()));
        const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([IPreferencesService, preferencesService], [IConfigurationService, configurationService])));
        _debugConfigurationManager = new ConfigurationManager(adapterManager, new TestContextService(), configurationService, new TestQuickInputService(), instantiationService, new TestStorageService(), new TestExtensionService(), new TestHistoryService(), new UriIdentityService(fileService), new ContextKeyService(configurationService), new NullLogService());
    });
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('resolves configuration based on type', async () => {
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    test('resolves configuration from second provider if type changes', async () => {
        const secondProviderType = 'second-provider';
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    type: secondProviderType
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: secondProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, secondProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.type, secondProviderType);
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    teardown(() => disposables.clear());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z0NvbmZpZ3VyYXRpb25NYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0s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