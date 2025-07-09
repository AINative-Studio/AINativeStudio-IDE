/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
import { IWorkingCopyFileService, WorkingCopyFileService } from '../../../workingCopy/common/workingCopyFileService.js';
import { WorkingCopyService } from '../../../workingCopy/common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { TestInMemoryFileSystemProvider } from '../../../../test/browser/workbenchTestServices.js';
import { TestNativeTextFileServiceWithEncodingOverrides, workbenchInstantiationService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Files - NativeTextFileService i/o', function () {
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
            service = disposables.add(instantiationService.createChild(collection).createInstance(TestNativeTextFileServiceWithEncodingOverrides));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVUZXh0RmlsZVNlcnZpY2UuaW8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBUyxNQUFNLCtDQUErQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFXLDZCQUE2QixFQUEwQixlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMzSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxLQUFLLE1BQU0sNkJBQTZCLENBQUM7QUFDaEQsT0FBTyxXQUFXLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkcsT0FBTyxFQUFFLDhDQUE4QyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0osT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLG1DQUFtQyxFQUFFO0lBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsSUFBSSxPQUF5QixDQUFDO0lBQzlCLElBQUksWUFBNEMsQ0FBQztJQUNqRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFFdkIsV0FBVyxDQUFDO1FBQ1gsS0FBSyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRW5GLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7WUFDeEMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBRWpFLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksOEJBQThCLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUUxRSxNQUFNLFVBQVUsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDM0MsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDMUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFek4sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUM7WUFDdkksV0FBVyxDQUFDLEdBQUcsQ0FBNkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTNELE1BQU0sWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDNUMsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxZQUFZLENBQUMsU0FBUyxDQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFDakMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUNmLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUNoRSxDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUVELFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwQixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsQ0FBQztRQUVELE1BQU07UUFDTixJQUFJO1FBQ0osUUFBUTtRQUNSLG1CQUFtQjtLQUNuQixDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsTUFBTSxDQUFDLE1BQWM7UUFDbkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5QyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1YsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUlELEtBQUssVUFBVSxRQUFRLENBQUMsTUFBYyxFQUFFLFFBQWlCO1FBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxPQUFPLElBQUksV0FBVyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsS0FBSyxVQUFVLElBQUksQ0FBQyxNQUFjO1FBQ2pDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxNQUFjO1FBQ2hELElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXRDLE9BQU8sNkJBQTZCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxzQ0FBc0M7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=