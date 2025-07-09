/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ChecksumService } from '../../node/checksumService.js';
import { FileService } from '../../../files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../files/node/diskFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
suite('Checksum Service', () => {
    let diskFileSystemProvider;
    let fileService;
    setup(() => {
        const logService = new NullLogService();
        fileService = new FileService(logService);
        diskFileSystemProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
    });
    teardown(() => {
        diskFileSystemProvider.dispose();
        fileService.dispose();
    });
    test('checksum', async () => {
        const checksumService = new ChecksumService(fileService);
        const checksum = await checksumService.checksum(URI.file(FileAccess.asFileUri('vs/platform/checksum/test/node/fixtures/lorem.txt').fsPath));
        assert.ok(checksum === 'd/9bMU0ydNCmc/hg8ItWeiLT/ePnf7gyPRQVGpd6tRI' || checksum === 'eJeeTIS0dzi8MZY+nHhjPBVtNbmGqxfVvgEOB4sqVIc'); // depends on line endings git config
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tzdW1TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY2hlY2tzdW0vdGVzdC9ub2RlL2NoZWNrc3VtU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLElBQUksc0JBQThDLENBQUM7SUFDbkQsSUFBSSxXQUF5QixDQUFDO0lBRTlCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3hDLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUxQyxzQkFBc0IsR0FBRyxJQUFJLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2Isc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQixNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLG1EQUFtRCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM1SSxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsS0FBSyw2Q0FBNkMsSUFBSSxRQUFRLEtBQUssNkNBQTZDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztJQUMzSyxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==