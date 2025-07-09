var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { INativeEnvironmentService } from '../../../environment/common/environment.js';
import { IExtensionsProfileScannerService } from '../../common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, ExtensionScannerInput } from '../../common/extensionsScannerService.js';
import { ExtensionsProfileScannerService } from '../../node/extensionsProfileScannerService.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../instantiation/common/instantiation.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
let translations = Object.create(null);
const ROOT = URI.file('/ROOT');
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService) {
        super(URI.file(nativeEnvironmentService.builtinExtensionsPath), URI.file(nativeEnvironmentService.extensionsPath), joinPath(nativeEnvironmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json'), userDataProfilesService.defaultProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService);
    }
    async getTranslations(language) {
        return translations;
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IExtensionsProfileScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, INativeEnvironmentService),
    __param(5, IProductService),
    __param(6, IUriIdentityService),
    __param(7, IInstantiationService)
], ExtensionsScannerService);
suite('NativeExtensionsScanerService Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        translations = {};
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        const systemExtensionsLocation = joinPath(ROOT, 'system');
        const userExtensionsLocation = joinPath(ROOT, 'extensions');
        const environmentService = instantiationService.stub(INativeEnvironmentService, {
            userHome: ROOT,
            userRoamingDataHome: ROOT,
            builtinExtensionsPath: systemExtensionsLocation.fsPath,
            extensionsPath: userExtensionsLocation.fsPath,
            cacheHome: joinPath(ROOT, 'cache'),
        });
        instantiationService.stub(IProductService, { version: '1.66.0' });
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
        instantiationService.stub(IExtensionsProfileScannerService, disposables.add(new ExtensionsProfileScannerService(environmentService, fileService, userDataProfilesService, uriIdentityService, logService)));
        await fileService.createFolder(systemExtensionsLocation);
        await fileService.createFolder(userExtensionsLocation);
    });
    test('scan system extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aSystemExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, true);
        assert.deepStrictEqual(actual[0].type, 0 /* ExtensionType.System */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan user extensions', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        delete manifest.__metadata;
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan existing extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, undefined);
        assert.deepStrictEqual(actual.targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    test('scan single extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan multiple extensions', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(dirname(extensionLocation), 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan all user extensions with different versions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.2');
    });
    test('scan all user extensions include all versions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].manifest.version, '1.0.2');
    });
    test('scan all user extensions with different versions and higher version is not compatible', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
    });
    test('scan all user extensions exclude invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
    });
    test('scan all user extensions include invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: true });
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan system extensions include additional builtin extensions', async () => {
        instantiationService.stub(IProductService, {
            version: '1.66.0',
            builtInExtensions: [
                { name: 'pub.name2', version: '', repo: '', metadata: undefined },
                { name: 'pub.name', version: '', repo: '', metadata: undefined }
            ]
        });
        await anExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub' }), joinPath(ROOT, 'additional'));
        const extensionLocation = await anExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }), joinPath(ROOT, 'additional'));
        await aSystemExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await instantiationService.get(IFileService).writeFile(joinPath(instantiationService.get(INativeEnvironmentService).userHome, '.vscode-oss-dev', 'extensions', 'control.json'), VSBuffer.fromString(JSON.stringify({ 'pub.name2': 'disabled', 'pub.name': extensionLocation.fsPath })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({ checkControlFile: true });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.0');
    });
    test('scan all user extensions with default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.displayName, 'Hello World');
    });
    test('scan extension with en nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService.get(IFileService).writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, { language: 'en' });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World EN');
    });
    test('scan extension falls back to default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService.get(IFileService).writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name2': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, { language: 'en' });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World');
    });
    test('scan single extension with manifest metadata retains manifest metadata', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const expectedMetadata = { size: 12345, installedTimestamp: 1234567890, targetPlatform: "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */ };
        const extensionLocation = await aUserExtension({
            ...manifest,
            __metadata: expectedMetadata
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notStrictEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, expectedMetadata);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    async function aUserExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.extensionsPath));
    }
    async function aSystemExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.builtinExtensionsPath));
    }
    async function anExtension(manifest, root) {
        const fileService = instantiationService.get(IFileService);
        const extensionLocation = joinPath(root, `${manifest.publisher}.${manifest.name}-${manifest.version}`);
        await fileService.writeFile(joinPath(extensionLocation, 'package.json'), VSBuffer.fromString(JSON.stringify(manifest)));
        return extensionLocation;
    }
    function anExtensionManifest(manifest) {
        return { engines: { vscode: '^1.66.0' }, version: '1.0.0', main: 'main.js', activationEvents: ['*'], ...manifest };
    }
});
suite('ExtensionScannerInput', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('compare inputs - location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(location, mtime, undefined, undefined, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - application location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(ROOT, undefined, location, mtime, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - profile', () => {
        const anInput = (profile, profileScanOptions) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, profile, profileScanOptions, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(false, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: false }), anInput(true, { bailOutWhenFileNotFound: false })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, {})), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: false })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, { bailOutWhenFileNotFound: true })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, undefined), anInput(true, {})), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), false);
    });
    test('compare inputs - extension type', () => {
        const anInput = (type) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, false, undefined, type, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(0 /* ExtensionType.System */), anInput(0 /* ExtensionType.System */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(1 /* ExtensionType.User */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(0 /* ExtensionType.System */)), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L25vZGUvZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQWlDLE1BQU0saURBQWlELENBQUM7QUFDbEksT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHFCQUFxQixFQUFzRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7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