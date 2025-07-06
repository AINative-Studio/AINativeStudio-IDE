/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mockService } from './utils/mock.js';
import { PromptsConfig } from '../../common/config.js';
import { randomInt } from '../../../../base/common/numbers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
const createMock = (value) => {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            assert([PromptsConfig.KEY, PromptsConfig.LOCATIONS_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
};
suite('PromptsConfig', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('• getLocationsValue', () => {
        test('• undefined', () => {
            const configService = createMock(undefined);
            assert.strictEqual(PromptsConfig.getLocationsValue(configService), undefined, 'Must read correct value.');
        });
        test('• null', () => {
            const configService = createMock(null);
            assert.strictEqual(PromptsConfig.getLocationsValue(configService), undefined, 'Must read correct value.');
        });
        suite('• object', () => {
            test('• empty', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({})), {}, 'Must read correct value.');
            });
            test('• only valid strings', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    './.tempfile': true,
                })), {
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    './.tempfile': true,
                }, 'Must read correct value.');
            });
            test('• filters out non valid entries', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                })), {
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '../../development/branch.name/some.test': true,
                    '/Home/user/.ssh/config': true,
                    '/tmp/.temp.folder/cache.db': true,
                    './scripts/.old.build.sh': true,
                }, 'Must read correct value.');
            });
            test('• only invalid or false values', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/IMG/logo.v2.png': '',
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    './hidden.dir/.subhidden': '\f',
                    '/opt/Software/v3.2.1/build.log': '  ',
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                })), {
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                }, 'Must read correct value.');
            });
        });
    });
    suite('• sourceLocations', () => {
        test('• undefined', () => {
            const configService = createMock(undefined);
            assert.deepStrictEqual(PromptsConfig.promptSourceFolders(configService), [], 'Must read correct value.');
        });
        test('• null', () => {
            const configService = createMock(null);
            assert.deepStrictEqual(PromptsConfig.promptSourceFolders(configService), [], 'Must read correct value.');
        });
        suite('object', () => {
            test('empty', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({})), ['.github/prompts'], 'Must read correct value.');
            });
            test('only valid strings', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    '.GitHub/prompts': true,
                    './.tempfile': true,
                })), [
                    '.github/prompts',
                    '/root/.bashrc',
                    '../../folder/.hidden-folder/config.xml',
                    '/srv/www/Public_html/.htaccess',
                    '../../another.folder/.WEIRD_FILE.log',
                    './folder.name/file.name',
                    '/media/external/backup.tar.gz',
                    '/Media/external/.secret.backup',
                    '../relative/path.to.file',
                    './folderName.with.dots/more.dots.extension',
                    'some/folder.with.dots/another.file',
                    '/var/logs/app.01.05.error',
                    '.GitHub/prompts',
                    './.tempfile',
                ], 'Must read correct value.');
            });
            test('filters out non valid entries', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '.giThub/prompts': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '.github/prompts': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                })), [
                    '.github/prompts',
                    '../assets/img/logo.v2.png',
                    '../.local/bin/script.sh',
                    '../../development/branch.name/some.test',
                    '.giThub/prompts',
                    '/Home/user/.ssh/config',
                    '/tmp/.temp.folder/cache.db',
                    './scripts/.old.build.sh',
                ], 'Must read correct value.');
            });
            test('only invalid or false values', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/IMG/logo.v2.png': '',
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    './hidden.dir/.subhidden': '\f',
                    '/opt/Software/v3.2.1/build.log': '  ',
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                })), [
                    '.github/prompts',
                ], 'Must read correct value.');
            });
            test('filters out disabled default location', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '.github/prompts': false,
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '.giThub/prompts': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                })), [
                    '../assets/img/logo.v2.png',
                    '../.local/bin/script.sh',
                    '../../development/branch.name/some.test',
                    '.giThub/prompts',
                    '/Home/user/.ssh/config',
                    '/tmp/.temp.folder/cache.db',
                    './scripts/.old.build.sh',
                ], 'Must read correct value.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL2NvbmZpZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRzs7R0FFRztBQUNILE1BQU0sVUFBVSxHQUFHLENBQUksS0FBUSxFQUF5QixFQUFFO0lBQ3pELE9BQU8sV0FBVyxDQUF3QjtRQUN6QyxRQUFRLENBQUMsR0FBc0M7WUFDOUMsTUFBTSxDQUNMLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFDdkIsMkNBQTJDLE9BQU8sR0FBRyxJQUFJLENBQ3pELENBQUM7WUFFRixNQUFNLENBQ0wsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQzlELGtDQUFrQyxHQUFHLElBQUksQ0FDekMsQ0FBQztZQUVGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztLQUNELENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUVGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxFQUM5QyxTQUFTLEVBQ1QsMEJBQTBCLENBQzFCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ25CLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV2QyxNQUFNLENBQUMsV0FBVyxDQUNqQixhQUFhLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLEVBQzlDLFNBQVMsRUFDVCwwQkFBMEIsQ0FDMUIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDdEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDL0MsRUFBRSxFQUNGLDBCQUEwQixDQUMxQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO2dCQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDO29CQUMxQyxlQUFlLEVBQUUsSUFBSTtvQkFDckIsd0NBQXdDLEVBQUUsSUFBSTtvQkFDOUMsZ0NBQWdDLEVBQUUsSUFBSTtvQkFDdEMsc0NBQXNDLEVBQUUsSUFBSTtvQkFDNUMseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0IsK0JBQStCLEVBQUUsSUFBSTtvQkFDckMsZ0NBQWdDLEVBQUUsSUFBSTtvQkFDdEMsMEJBQTBCLEVBQUUsSUFBSTtvQkFDaEMsNENBQTRDLEVBQUUsSUFBSTtvQkFDbEQsb0NBQW9DLEVBQUUsSUFBSTtvQkFDMUMsMkJBQTJCLEVBQUUsSUFBSTtvQkFDakMsYUFBYSxFQUFFLElBQUk7aUJBQ25CLENBQUMsQ0FBQyxFQUNIO29CQUNDLGVBQWUsRUFBRSxJQUFJO29CQUNyQix3Q0FBd0MsRUFBRSxJQUFJO29CQUM5QyxnQ0FBZ0MsRUFBRSxJQUFJO29CQUN0QyxzQ0FBc0MsRUFBRSxJQUFJO29CQUM1Qyx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQiwrQkFBK0IsRUFBRSxJQUFJO29CQUNyQyxnQ0FBZ0MsRUFBRSxJQUFJO29CQUN0QywwQkFBMEIsRUFBRSxJQUFJO29CQUNoQyw0Q0FBNEMsRUFBRSxJQUFJO29CQUNsRCxvQ0FBb0MsRUFBRSxJQUFJO29CQUMxQywyQkFBMkIsRUFBRSxJQUFJO29CQUNqQyxhQUFhLEVBQUUsSUFBSTtpQkFDbkIsRUFDRCwwQkFBMEIsQ0FDMUIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtnQkFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztvQkFDMUMsbUJBQW1CLEVBQUUsUUFBUTtvQkFDN0IsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsMkJBQTJCLEVBQUUsSUFBSTtvQkFDakMsMkNBQTJDLEVBQUUsS0FBSztvQkFDbEQseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0Isd0NBQXdDLEVBQUUsRUFBRTtvQkFDNUMseUNBQXlDLEVBQUUsSUFBSTtvQkFDL0Msd0JBQXdCLEVBQUUsSUFBSTtvQkFDOUIseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0IsNEJBQTRCLEVBQUUsSUFBSTtvQkFDbEMsZ0NBQWdDLEVBQUUsSUFBSTtvQkFDdEMsRUFBRSxFQUFFLElBQUk7b0JBQ1IseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0Isb0NBQW9DLEVBQUUsSUFBSTtvQkFDMUMsTUFBTSxFQUFFLElBQUk7b0JBQ1osSUFBSSxFQUFFLElBQUk7b0JBQ1YsSUFBSSxFQUFFLElBQUk7b0JBQ1YsSUFBSSxFQUFFLElBQUk7b0JBQ1YsTUFBTSxFQUFFLElBQUk7b0JBQ1osTUFBTSxFQUFFLElBQUk7b0JBQ1osK0JBQStCLEVBQUUsTUFBTTtvQkFDdkMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7aUJBQ3hGLENBQUMsQ0FBQyxFQUNIO29CQUNDLDJCQUEyQixFQUFFLElBQUk7b0JBQ2pDLDJDQUEyQyxFQUFFLEtBQUs7b0JBQ2xELHlCQUF5QixFQUFFLElBQUk7b0JBQy9CLHlDQUF5QyxFQUFFLElBQUk7b0JBQy9DLHdCQUF3QixFQUFFLElBQUk7b0JBQzlCLDRCQUE0QixFQUFFLElBQUk7b0JBQ2xDLHlCQUF5QixFQUFFLElBQUk7aUJBQy9CLEVBQ0QsMEJBQTBCLENBQzFCLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7Z0JBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUM7b0JBQzFDLG1CQUFtQixFQUFFLFFBQVE7b0JBQzdCLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLDJCQUEyQixFQUFFLEVBQUU7b0JBQy9CLDJDQUEyQyxFQUFFLEtBQUs7b0JBQ2xELHdDQUF3QyxFQUFFLEVBQUU7b0JBQzVDLHlCQUF5QixFQUFFLElBQUk7b0JBQy9CLGdDQUFnQyxFQUFFLElBQUk7b0JBQ3RDLG9DQUFvQyxFQUFFLElBQUk7b0JBQzFDLCtCQUErQixFQUFFLE1BQU07b0JBQ3ZDLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO2lCQUN4RixDQUFDLENBQUMsRUFDSDtvQkFDQywyQ0FBMkMsRUFBRSxLQUFLO2lCQUNsRCxFQUNELDBCQUEwQixDQUMxQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFNUMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxFQUNoRCxFQUFFLEVBQ0YsMEJBQTBCLENBQzFCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ25CLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV2QyxNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLEVBQ2hELEVBQUUsRUFDRiwwQkFBMEIsQ0FDMUIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDakQsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNuQiwwQkFBMEIsQ0FDMUIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtnQkFDL0IsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQztvQkFDNUMsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLHdDQUF3QyxFQUFFLElBQUk7b0JBQzlDLGdDQUFnQyxFQUFFLElBQUk7b0JBQ3RDLHNDQUFzQyxFQUFFLElBQUk7b0JBQzVDLHlCQUF5QixFQUFFLElBQUk7b0JBQy9CLCtCQUErQixFQUFFLElBQUk7b0JBQ3JDLGdDQUFnQyxFQUFFLElBQUk7b0JBQ3RDLDBCQUEwQixFQUFFLElBQUk7b0JBQ2hDLDRDQUE0QyxFQUFFLElBQUk7b0JBQ2xELG9DQUFvQyxFQUFFLElBQUk7b0JBQzFDLDJCQUEyQixFQUFFLElBQUk7b0JBQ2pDLGlCQUFpQixFQUFFLElBQUk7b0JBQ3ZCLGFBQWEsRUFBRSxJQUFJO2lCQUNuQixDQUFDLENBQUMsRUFDSDtvQkFDQyxpQkFBaUI7b0JBQ2pCLGVBQWU7b0JBQ2Ysd0NBQXdDO29CQUN4QyxnQ0FBZ0M7b0JBQ2hDLHNDQUFzQztvQkFDdEMseUJBQXlCO29CQUN6QiwrQkFBK0I7b0JBQy9CLGdDQUFnQztvQkFDaEMsMEJBQTBCO29CQUMxQiw0Q0FBNEM7b0JBQzVDLG9DQUFvQztvQkFDcEMsMkJBQTJCO29CQUMzQixpQkFBaUI7b0JBQ2pCLGFBQWE7aUJBQ2IsRUFDRCwwQkFBMEIsQ0FDMUIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQztvQkFDNUMsbUJBQW1CLEVBQUUsUUFBUTtvQkFDN0IsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsMkJBQTJCLEVBQUUsSUFBSTtvQkFDakMsMkNBQTJDLEVBQUUsS0FBSztvQkFDbEQseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0Isd0NBQXdDLEVBQUUsRUFBRTtvQkFDNUMseUNBQXlDLEVBQUUsSUFBSTtvQkFDL0MsaUJBQWlCLEVBQUUsSUFBSTtvQkFDdkIsd0JBQXdCLEVBQUUsSUFBSTtvQkFDOUIseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0IsNEJBQTRCLEVBQUUsSUFBSTtvQkFDbEMsaUJBQWlCLEVBQUUsSUFBSTtvQkFDdkIsZ0NBQWdDLEVBQUUsSUFBSTtvQkFDdEMsRUFBRSxFQUFFLElBQUk7b0JBQ1IseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0Isb0NBQW9DLEVBQUUsSUFBSTtvQkFDMUMsTUFBTSxFQUFFLElBQUk7b0JBQ1osSUFBSSxFQUFFLElBQUk7b0JBQ1YsSUFBSSxFQUFFLElBQUk7b0JBQ1YsSUFBSSxFQUFFLElBQUk7b0JBQ1YsTUFBTSxFQUFFLElBQUk7b0JBQ1osTUFBTSxFQUFFLElBQUk7b0JBQ1osK0JBQStCLEVBQUUsTUFBTTtvQkFDdkMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7aUJBQ3hGLENBQUMsQ0FBQyxFQUNIO29CQUNDLGlCQUFpQjtvQkFDakIsMkJBQTJCO29CQUMzQix5QkFBeUI7b0JBQ3pCLHlDQUF5QztvQkFDekMsaUJBQWlCO29CQUNqQix3QkFBd0I7b0JBQ3hCLDRCQUE0QjtvQkFDNUIseUJBQXlCO2lCQUN6QixFQUNELDBCQUEwQixDQUMxQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO2dCQUN6QyxNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDO29CQUM1QyxtQkFBbUIsRUFBRSxRQUFRO29CQUM3QixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QiwyQkFBMkIsRUFBRSxFQUFFO29CQUMvQiwyQ0FBMkMsRUFBRSxLQUFLO29CQUNsRCx3Q0FBd0MsRUFBRSxFQUFFO29CQUM1Qyx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQixnQ0FBZ0MsRUFBRSxJQUFJO29CQUN0QyxvQ0FBb0MsRUFBRSxJQUFJO29CQUMxQywrQkFBK0IsRUFBRSxNQUFNO29CQUN2QywyQkFBMkIsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztpQkFDeEYsQ0FBQyxDQUFDLEVBQ0g7b0JBQ0MsaUJBQWlCO2lCQUNqQixFQUNELDBCQUEwQixDQUMxQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO2dCQUNsRCxNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDO29CQUM1QyxtQkFBbUIsRUFBRSxRQUFRO29CQUM3QixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixpQkFBaUIsRUFBRSxLQUFLO29CQUN4QiwyQkFBMkIsRUFBRSxJQUFJO29CQUNqQywyQ0FBMkMsRUFBRSxLQUFLO29CQUNsRCx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQix3Q0FBd0MsRUFBRSxFQUFFO29CQUM1Qyx5Q0FBeUMsRUFBRSxJQUFJO29CQUMvQyxpQkFBaUIsRUFBRSxJQUFJO29CQUN2Qix3QkFBd0IsRUFBRSxJQUFJO29CQUM5Qix5QkFBeUIsRUFBRSxJQUFJO29CQUMvQiw0QkFBNEIsRUFBRSxJQUFJO29CQUNsQyxnQ0FBZ0MsRUFBRSxJQUFJO29CQUN0QyxFQUFFLEVBQUUsSUFBSTtvQkFDUix5QkFBeUIsRUFBRSxJQUFJO29CQUMvQixvQ0FBb0MsRUFBRSxJQUFJO29CQUMxQyxNQUFNLEVBQUUsSUFBSTtvQkFDWixJQUFJLEVBQUUsSUFBSTtvQkFDVixJQUFJLEVBQUUsSUFBSTtvQkFDVixJQUFJLEVBQUUsSUFBSTtvQkFDVixNQUFNLEVBQUUsSUFBSTtvQkFDWixNQUFNLEVBQUUsSUFBSTtvQkFDWiwrQkFBK0IsRUFBRSxNQUFNO29CQUN2QywyQkFBMkIsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztpQkFDeEYsQ0FBQyxDQUFDLEVBQ0g7b0JBQ0MsMkJBQTJCO29CQUMzQix5QkFBeUI7b0JBQ3pCLHlDQUF5QztvQkFDekMsaUJBQWlCO29CQUNqQix3QkFBd0I7b0JBQ3hCLDRCQUE0QjtvQkFDNUIseUJBQXlCO2lCQUN6QixFQUNELDBCQUEwQixDQUMxQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==