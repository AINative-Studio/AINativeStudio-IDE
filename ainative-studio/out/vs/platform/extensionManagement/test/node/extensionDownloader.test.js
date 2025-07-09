/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { platform } from '../../../../base/common/platform.js';
import { arch } from '../../../../base/common/process.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { INativeEnvironmentService } from '../../../environment/common/environment.js';
import { ExtensionSignatureVerificationCode, getTargetPlatform, IExtensionGalleryService } from '../../common/extensionManagement.js';
import { getGalleryExtensionId } from '../../common/extensionManagementUtil.js';
import { ExtensionsDownloader } from '../../node/extensionDownloader.js';
import { IExtensionSignatureVerificationService } from '../../node/extensionSignatureVerificationService.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestExtensionSignatureVerificationService extends mock() {
    constructor(verificationResult) {
        super();
        this.verificationResult = verificationResult;
    }
    async verify() {
        if (this.verificationResult === true) {
            return {
                code: ExtensionSignatureVerificationCode.Success
            };
        }
        if (this.verificationResult === false) {
            return undefined;
        }
        return {
            code: this.verificationResult,
        };
    }
}
class TestExtensionDownloader extends ExtensionsDownloader {
    async validate() { }
}
suite('ExtensionDownloader Tests', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
        instantiationService.stub(INativeEnvironmentService, { extensionsDownloadLocation: joinPath(ROOT, 'CachedExtensionVSIXs') });
        instantiationService.stub(IExtensionGalleryService, {
            async download(extension, location, operation) {
                await fileService.writeFile(location, VSBuffer.fromString('extension vsix'));
            },
            async downloadSignatureArchive(extension, location) {
                await fileService.writeFile(location, VSBuffer.fromString('extension signature'));
            },
        });
    });
    test('download completes successfully if verification is disabled by options', async () => {
        const testObject = aTestObject({ verificationResult: 'error' });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, false);
        assert.strictEqual(actual.verificationStatus, undefined);
    });
    test('download completes successfully if verification is disabled because the module is not loaded', async () => {
        const testObject = aTestObject({ verificationResult: false });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, undefined);
    });
    test('download completes successfully if verification fails to execute', async () => {
        const errorCode = 'ENOENT';
        const testObject = aTestObject({ verificationResult: errorCode });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, errorCode);
    });
    test('download completes successfully if verification fails ', async () => {
        const errorCode = 'IntegrityCheckFailed';
        const testObject = aTestObject({ verificationResult: errorCode });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, errorCode);
    });
    test('download completes successfully if verification succeeds', async () => {
        const testObject = aTestObject({ verificationResult: true });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.Success);
    });
    test('download completes successfully for unsigned extension', async () => {
        const testObject = aTestObject({ verificationResult: true });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: false }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.NotSigned);
    });
    test('download completes successfully for an unsigned extension even when signature verification throws error', async () => {
        const testObject = aTestObject({ verificationResult: 'error' });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: false }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.NotSigned);
    });
    function aTestObject(options) {
        instantiationService.stub(IExtensionSignatureVerificationService, new TestExtensionSignatureVerificationService(options.verificationResult));
        return disposables.add(instantiationService.createInstance(TestExtensionDownloader));
    }
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = {}) {
        const targetPlatform = getTargetPlatform(platform, arch);
        const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
        galleryExtension.assets = { ...galleryExtension.assets, ...assets };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9ub2RlL2V4dGVuc2lvbkRvd25sb2FkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBZ0UsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwTSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQXlDLHNDQUFzQyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDcEosT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXZGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7QUFFaEUsTUFBTSx5Q0FBMEMsU0FBUSxJQUFJLEVBQTBDO0lBRXJHLFlBQ2tCLGtCQUFvQztRQUNyRCxLQUFLLEVBQUUsQ0FBQztRQURTLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBa0I7SUFFdEQsQ0FBQztJQUVRLEtBQUssQ0FBQyxNQUFNO1FBQ3BCLElBQUksSUFBSSxDQUFDLGtCQUFrQixLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3RDLE9BQU87Z0JBQ04sSUFBSSxFQUFFLGtDQUFrQyxDQUFDLE9BQU87YUFDaEQsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN2QyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsa0JBQXdEO1NBQ25FLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHVCQUF3QixTQUFRLG9CQUFvQjtJQUN0QyxLQUFLLENBQUMsUUFBUSxLQUFvQixDQUFDO0NBQ3REO0FBRUQsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUV2QyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzlELElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFFdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUN4QyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRS9FLG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLG9CQUFvQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0gsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQ25ELEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTO2dCQUM1QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQzlFLENBQUM7WUFDRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsU0FBUyxFQUFFLFFBQVE7Z0JBQ2pELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7WUFDbkYsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdFQUF3RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pGLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFaEUsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxvQ0FBNEIsS0FBSyxDQUFDLENBQUM7UUFFdEgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEZBQThGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0csTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUU5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLG9DQUE0QixJQUFJLENBQUMsQ0FBQztRQUVySCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrRUFBa0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDM0IsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUVsRSxNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLG9DQUE0QixJQUFJLENBQUMsQ0FBQztRQUVySCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsb0NBQTRCLElBQUksQ0FBQyxDQUFDO1FBRXJILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNFLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFN0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxvQ0FBNEIsSUFBSSxDQUFDLENBQUM7UUFFckgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsa0NBQWtDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0RBQXdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekUsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUU3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLG9DQUE0QixJQUFJLENBQUMsQ0FBQztRQUV0SCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxrQ0FBa0MsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5R0FBeUcsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxSCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsb0NBQTRCLElBQUksQ0FBQyxDQUFDO1FBRXRILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLGtDQUFrQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdGLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxXQUFXLENBQUMsT0FBaUQ7UUFDckUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLElBQUkseUNBQXlDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUM3SSxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsYUFBeUMsRUFBRSxFQUFFLDZCQUFrQyxFQUFFLEVBQUUsU0FBMkMsRUFBRTtRQUN4SyxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekQsTUFBTSxnQkFBZ0IsR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3pMLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxFQUFFLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsMEJBQTBCLEVBQUUsQ0FBQztRQUNsSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3BFLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUM7UUFDckksT0FBMEIsZ0JBQWdCLENBQUM7SUFDNUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDIn0=