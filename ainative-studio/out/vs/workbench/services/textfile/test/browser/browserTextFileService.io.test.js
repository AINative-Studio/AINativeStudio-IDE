/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workbenchInstantiationService, TestInMemoryFileSystemProvider, TestBrowserTextFileServiceWithEncodingOverrides } from '../../../../test/browser/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import { join } from '../../../../../base/common/path.js';
import { detectEncodingByBOMFromBuffer, toCanonicalName } from '../../common/encoding.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import files from '../common/fixtures/files.js';
import createSuite from '../common/textFileService.io.test.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { IWorkingCopyFileService, WorkingCopyFileService } from '../../../workingCopy/common/workingCopyFileService.js';
import { WorkingCopyService } from '../../../workingCopy/common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
// optimization: we don't need to run this suite in native environment,
// because we have nativeTextFileService.io.test.ts for it,
// so our tests run faster
if (isWeb) {
    suite('Files - BrowserTextFileService i/o', function () {
        const disposables = new DisposableStore();
        let service;
        let fileProvider;
        const testDir = 'test';
        createSuite({
            setup: async () => {
                const instantiationService = workbenchInstantiationService(undefined, disposables);
                const logService = new NullLogService();
                const fileService = disposables.add(new FileService(logService));
                fileProvider = disposables.add(new TestInMemoryFileSystemProvider());
                disposables.add(fileService.registerProvider(Schemas.file, fileProvider));
                const collection = new ServiceCollection();
                collection.set(IFileService, fileService);
                collection.set(IWorkingCopyFileService, disposables.add(new WorkingCopyFileService(fileService, disposables.add(new WorkingCopyService()), instantiationService, disposables.add(new UriIdentityService(fileService)))));
                service = disposables.add(instantiationService.createChild(collection).createInstance(TestBrowserTextFileServiceWithEncodingOverrides));
                disposables.add(service.files);
                await fileProvider.mkdir(URI.file(testDir));
                for (const fileName in files) {
                    await fileProvider.writeFile(URI.file(join(testDir, fileName)), files[fileName], { create: true, overwrite: false, unlock: false, atomic: false });
                }
                return { service, testDir };
            },
            teardown: async () => {
                disposables.clear();
            },
            exists,
            stat,
            readFile,
            detectEncodingByBOM
        });
        async function exists(fsPath) {
            try {
                await fileProvider.readFile(URI.file(fsPath));
                return true;
            }
            catch (e) {
                return false;
            }
        }
        async function readFile(fsPath, encoding) {
            const file = await fileProvider.readFile(URI.file(fsPath));
            if (!encoding) {
                return VSBuffer.wrap(file);
            }
            return new TextDecoder(toCanonicalName(encoding)).decode(file);
        }
        async function stat(fsPath) {
            return fileProvider.stat(URI.file(fsPath));
        }
        async function detectEncodingByBOM(fsPath) {
            try {
                const buffer = await readFile(fsPath);
                return detectEncodingByBOMFromBuffer(buffer.slice(0, 3), 3);
            }
            catch (error) {
                return null; // ignore errors (like file not found)
            }
        }
        ensureNoDisposablesAreLeakedInTestSuite();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclRleHRGaWxlU2VydmljZS5pby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L2Jyb3dzZXIvYnJvd3NlclRleHRGaWxlU2VydmljZS5pby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSw4QkFBOEIsRUFBRSwrQ0FBK0MsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25MLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsWUFBWSxFQUFTLE1BQU0sK0NBQStDLENBQUM7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQVcsNkJBQTZCLEVBQTBCLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEtBQUssTUFBTSw2QkFBNkIsQ0FBQztBQUNoRCxPQUFPLFdBQVcsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxF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