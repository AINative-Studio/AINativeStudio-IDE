/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IWorkspaceTrustEnablementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { ExtensionManifestPropertiesService } from '../../common/extensionManifestPropertiesService.js';
import { TestProductService, TestWorkspaceTrustEnablementService } from '../../../../test/common/workbenchTestServices.js';
suite('ExtensionManifestPropertiesService - ExtensionKind', () => {
    let disposables;
    let testObject;
    setup(() => {
        disposables = new DisposableStore();
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService(), new TestWorkspaceTrustEnablementService(), new NullLogService()));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('declarative with extension dependencies', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionDependencies: ['ext1'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionPack: ['ext1', 'ext2'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack and extension dependencies', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionPack: ['ext1', 'ext2'], extensionDependencies: ['ext1', 'ext2'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative with unknown contribution point => workspace, web in web and => workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ contributes: { 'unknownPoint': { something: true } } }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack with unknown contribution point', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionPack: ['ext1', 'ext2'], contributes: { 'unknownPoint': { something: true } } }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('simple declarative => ui, workspace, web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({}), ['ui', 'workspace', 'web']);
    });
    test('only browser => web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js' }), ['web']);
    });
    test('only main => workspace', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js' }), ['workspace']);
    });
    test('main and browser => workspace, web in web and workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js', browser: 'main.browser.js' }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('browser entry point with workspace extensionKind => workspace, web in web and workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js', browser: 'main.browser.js', extensionKind: ['workspace'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('only browser entry point with out extensionKind => web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js' }), ['web']);
    });
    test('simple descriptive with workspace, ui extensionKind => workspace, ui, web in web and workspace, ui in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionKind: ['workspace', 'ui'] }), isWeb ? ['workspace', 'ui', 'web'] : ['workspace', 'ui']);
    });
    test('opt out from web through settings even if it can run in web', () => {
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService({ remote: { extensionKind: { 'pub.a': ['-web'] } } }), new TestWorkspaceTrustEnablementService(), new NullLogService()));
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js', publisher: 'pub', name: 'a' }), ['ui', 'workspace']);
    });
    test('opt out from web and include only workspace through settings even if it can run in web', () => {
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService({ remote: { extensionKind: { 'pub.a': ['-web', 'workspace'] } } }), new TestWorkspaceTrustEnablementService(), new NullLogService()));
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js', publisher: 'pub', name: 'a' }), ['workspace']);
    });
    test('extension cannot opt out from web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js', extensionKind: ['-web'] }), ['web']);
    });
    test('extension cannot opt into web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js', extensionKind: ['web', 'workspace', 'ui'] }), ['workspace', 'ui']);
    });
    test('extension cannot opt into web only', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js', extensionKind: ['web'] }), ['workspace']);
    });
});
// Workspace Trust is disabled in web at the moment
if (!isWeb) {
    suite('ExtensionManifestPropertiesService - ExtensionUntrustedWorkspaceSupportType', () => {
        let testObject;
        let instantiationService;
        let testConfigurationService;
        setup(async () => {
            instantiationService = new TestInstantiationService();
            testConfigurationService = new TestConfigurationService();
            instantiationService.stub(IConfigurationService, testConfigurationService);
        });
        teardown(() => {
            testObject.dispose();
            instantiationService.dispose();
        });
        function assertUntrustedWorkspaceSupport(extensionManifest, expected) {
            testObject = instantiationService.createInstance(ExtensionManifestPropertiesService);
            const untrustedWorkspaceSupport = testObject.getExtensionUntrustedWorkspaceSupportType(extensionManifest);
            assert.strictEqual(untrustedWorkspaceSupport, expected);
        }
        function getExtensionManifest(properties = {}) {
            return Object.create({ name: 'a', publisher: 'pub', version: '1.0.0', ...properties });
        }
        test('test extension workspace trust request when main entry point is missing', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest();
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when workspace trust is disabled', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService(false));
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when "true" override exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', { supportUntrustedWorkspaces: { 'pub.a': { supported: true } } });
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when override (false) exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', { supportUntrustedWorkspaces: { 'pub.a': { supported: false } } });
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override (true) for the version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', { supportUntrustedWorkspaces: { 'pub.a': { supported: true, version: '1.0.0' } } });
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when override (false) for the version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', { supportUntrustedWorkspaces: { 'pub.a': { supported: false, version: '1.0.0' } } });
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override for a different version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', { supportUntrustedWorkspaces: { 'pub.a': { supported: true, version: '2.0.0' } } });
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when default (true) exists in product.json', () => {
            instantiationService.stub(IProductService, { extensionUntrustedWorkspaceSupport: { 'pub.a': { default: true } } });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when default (false) exists in product.json', () => {
            instantiationService.stub(IProductService, { extensionUntrustedWorkspaceSupport: { 'pub.a': { default: false } } });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override (limited) exists in product.json', () => {
            instantiationService.stub(IProductService, { extensionUntrustedWorkspaceSupport: { 'pub.a': { override: 'limited' } } });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: true } } });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when override (false) exists in product.json', () => {
            instantiationService.stub(IProductService, { extensionUntrustedWorkspaceSupport: { 'pub.a': { override: false } } });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: true } } });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when value exists in package.json', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js', capabilities: { untrustedWorkspaces: { supported: 'limited' } } });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when no value exists in package.json', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL3Rlc3QvY29tbW9uL2V4dGVuc2lvbk1hbmlmZXN0UHJvcGVydGllc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUV6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTNILEtBQUssQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7SUFFaEUsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksVUFBOEMsQ0FBQztJQUVu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