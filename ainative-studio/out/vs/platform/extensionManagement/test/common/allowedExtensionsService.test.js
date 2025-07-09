/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { AllowedExtensionsService } from '../../common/allowedExtensionsService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { AllowedExtensionsConfigKey } from '../../common/extensionManagement.js';
import { Event } from '../../../../base/common/event.js';
import { getGalleryExtensionId } from '../../common/extensionManagementUtil.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
suite('AllowedExtensionsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    setup(() => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, '*');
    });
    test('should allow all extensions if no allowed extensions are configured', () => {
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should not allow specific extension if not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should allow specific extension if in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should not allow pre-release extension if only stable is allowed', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, prerelease: true }) === true, false);
    });
    test('should allow pre-release extension if pre-release is allowed', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, prerelease: true }) === true, true);
    });
    test('should allow specific version of an extension when configured to that version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3' }) === true, true);
    });
    test('should allow any version of an extension when a specific version is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should allow any version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should allow a version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3' }) === true, true);
    });
    test('should allow a pre-release version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3', prerelease: true }) === true, false);
    });
    test('should allow specific version of an extension when configured to multiple versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3', '2.0.1', '3.1.2'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3' }) === true, true);
    });
    test('should allow platform specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3@darwin-x64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3', targetPlatform: "darwin-x64" /* TargetPlatform.DARWIN_X64 */ }) === true, true);
    });
    test('should allow universal platform specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3@darwin-x64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3', targetPlatform: "universal" /* TargetPlatform.UNIVERSAL */ }) === true, true);
    });
    test('should allow specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3@darwin-x64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3' }) === true, true);
    });
    test('should allow platform specific version of an extension when configured to multiple versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.0.0', '1.2.3@darwin-x64', '1.2.3@darwin-arm64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3', targetPlatform: "darwin-x64" /* TargetPlatform.DARWIN_X64 */ }) === true, true);
    });
    test('should not allow platform specific version of an extension when configured to different platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.2.3@darwin-x64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.2.3', targetPlatform: "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */ }) === true, false);
    });
    test('should specific version of an extension when configured to different versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test.extension': ['1.0.0', '1.2.3@darwin-x64', '1.2.3@darwin-arm64'] });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, version: '1.0.1' }) === true, false);
    });
    test('should allow extension if publisher is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should allow extension if publisher is not in allowed list and has publisher mapping', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'hello': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(['hello']), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: 'Hello' }), true);
    });
    test('should allow extension if publisher is not in allowed list and has different publisher mapping', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'hello': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(['bar']), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: 'Hello' }) === true, false);
    });
    test('should not allow extension if publisher is not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test': false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should not allow prerelease extension if publisher is allowed only to stable', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test': 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, prerelease: true }) === true, false);
    });
    test('should allow extension if publisher is set to random value', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'test': 'hello' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined, prerelease: true }) === true, true);
    });
    test('should allow extension if only wildcard is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should allow extension if wildcard is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': true, 'hello': false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should not allow extension if wildcard is not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': false, 'hello': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should allow a gallery extension', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'pub': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed(aGalleryExtension('name')) === true, true);
    });
    test('should allow a local extension', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { 'pub': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed(aLocalExtension('pub.name')) === true, true);
    });
    test('should trigger change event when allowed list change', async () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        const promise = Event.toPromise(testObject.onDidChangeAllowedExtensionsConfigValue);
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true, affectedKeys: new Set([AllowedExtensionsConfigKey]), change: { keys: [], overrides: [] }, source: 2 /* ConfigurationTarget.USER */ });
        await promise;
    });
    function aProductService(extensionPublisherOrgs) {
        return {
            _serviceBrand: undefined,
            extensionPublisherOrgs
        };
    }
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}) {
        const galleryExtension = Object.create({ type: 'gallery', name, publisher: 'pub', publisherDisplayName: 'Pub', version: '1.0.0', allTargetPlatforms: ["universal" /* TargetPlatform.UNIVERSAL */], properties: {}, assets: {}, isSigned: true, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], ...galleryExtensionProperties };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
    function aLocalExtension(id, manifest = {}, properties = {}) {
        const [publisher, name] = id.split('.');
        manifest = { name, publisher, ...manifest };
        properties = {
            identifier: { id },
            location: URI.file(`pub.${name}`),
            galleryIdentifier: { id, uuid: undefined },
            type: 1 /* ExtensionType.User */,
            ...properties,
            isValid: properties.isValid ?? true,
        };
        properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
        return Object.create({ manifest, ...properties });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2NvbW1vbi9hbGxvd2VkRXh0ZW5zaW9uc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsMEJBQTBCLEVBQXNDLE1BQU0scUNBQXFDLENBQUM7QUFFckgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUV0QyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0lBRTVELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxRUFBcUUs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