/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Extension } from '../../browser/extensionsWorkbenchService.js';
import { URI } from '../../../../../base/common/uri.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Extension Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IProductService, { quality: 'insiders' });
    });
    test('extension is not outdated when there is no local and gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is local and no gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is no local and has gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local is older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is built in and older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local is built in and older than gallery but product quality is stable', () => {
        instantiationService.stub(IProductService, { quality: 'stable' });
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are on same version but on different target platforms', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "win32-arm64" /* TargetPlatform.WIN32_ARM64 */ }), aGalleryExtension('somext', {}, { targetPlatform: "win32-x64" /* TargetPlatform.WIN32_X64 */ }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local and gallery are on same version and local is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), aGalleryExtension('somext'), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version and gallery is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext'), aGalleryExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local is not pre-release but gallery is pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are pre-releases', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted to pre-release but current version is not pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is pre-release but gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted pre-release but current version is not and gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            ...properties
        };
        return Object.create({ manifest, ...properties });
    }
    function aGalleryExtension(name = 'somext', properties = {}, galleryExtensionProperties = {}) {
        const targetPlatform = galleryExtensionProperties.targetPlatform ?? "undefined" /* TargetPlatform.UNDEFINED */;
        const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUd4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDdEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxvQkFBOEMsQ0FBQztJQUVuRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUN2RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFF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