/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isUUID } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { sortExtensionVersions } from '../../common/extensionGalleryService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { resolveMarketplaceHeaders } from '../../../externalServices/common/marketplace.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
import { TELEMETRY_SETTING_ID } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class EnvironmentServiceMock extends mock() {
    constructor(serviceMachineIdResource) {
        super();
        this.serviceMachineIdResource = serviceMachineIdResource;
        this.isBuilt = true;
    }
}
suite('Extension Gallery Service', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileService, environmentService, storageService, productService, configurationService;
    setup(() => {
        const serviceMachineIdResource = joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'machineid');
        environmentService = new EnvironmentServiceMock(serviceMachineIdResource);
        fileService = disposables.add(new FileService(new NullLogService()));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(serviceMachineIdResource.scheme, fileSystemProvider));
        storageService = disposables.add(new InMemoryStorageService());
        configurationService = new TestConfigurationService({ [TELEMETRY_SETTING_ID]: "all" /* TelemetryConfiguration.ON */ });
        configurationService.updateValue(TELEMETRY_SETTING_ID, "all" /* TelemetryConfiguration.ON */);
        productService = { _serviceBrand: undefined, ...product, enableTelemetry: true };
    });
    test('marketplace machine id', async () => {
        const headers = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.ok(headers['X-Market-User-Id']);
        assert.ok(isUUID(headers['X-Market-User-Id']));
        const headers2 = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.strictEqual(headers['X-Market-User-Id'], headers2['X-Market-User-Id']);
    });
    test('sorting single extension version without target platform', async () => {
        const actual = [aExtensionVersion('1.1.2')];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with preferred target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-x64" /* TargetPlatform.DARWIN_X64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with not compatible target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-x64" /* TargetPlatform.WIN32_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions without target platforms', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 1', async () => {
        const actual = [aExtensionVersion('1.2.4', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.4', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.4', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[1], actual[0], actual[2], actual[3], actual[4], actual[5]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 2', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.2.3', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.3', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.3', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[0], actual[3], actual[1], actual[2], actual[4], actual[5]];
        sortExtensionVersions(actual, "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 3', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1'), aExtensionVersion('1.0.0', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.0.0', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */)];
        const expected = [actual[0], actual[1], actual[2], actual[4], actual[3]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    function aExtensionVersion(version, targetPlatform) {
        return { version, targetPlatform };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFHLE9BQU8sRUFBK0IscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBRXpELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBbUIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQTBCLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7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