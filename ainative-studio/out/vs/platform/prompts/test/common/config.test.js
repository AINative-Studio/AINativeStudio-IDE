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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy90ZXN0L2NvbW1vbi9jb25maWcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsR0FBRyxDQUFJLEtBQVEsRUFBeUIsRUFBRTtJQUN6RCxPQUFPLFdBQVcsQ0FBd0I7UUFDekMsUUFBUSxDQUFDLEdBQXNDO1lBQzlDLE1BQU0sQ0FDTCxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQ3ZCLDJDQUEyQyxPQUFPLEdBQUcsSUFBSSxDQUN6RCxDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUM5RCxrQ0FBa0MsR0FBRyxJQUFJLENBQ3pDLENBQUM7WUFFRixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7S0FDRCxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVB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