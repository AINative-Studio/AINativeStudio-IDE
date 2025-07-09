/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CustomEditorLabelService } from '../../common/customEditorLabelService.js';
import { TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Custom Editor Label Service', () => {
    const disposables = new DisposableStore();
    setup(() => { });
    teardown(async () => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    async function createCustomLabelService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const configService = new TestConfigurationService();
        await configService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        instantiationService.stub(IConfigurationService, configService);
        const customLabelService = disposables.add(instantiationService.createInstance(CustomEditorLabelService));
        return [customLabelService, configService, instantiationService.createInstance(TestServiceAccessor)];
    }
    async function updatePattern(configService, value) {
        await configService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, value);
        configService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: (key) => key === CustomEditorLabelService.SETTING_ID_PATTERNS,
            source: 2 /* ConfigurationTarget.USER */,
            affectedKeys: new Set(CustomEditorLabelService.SETTING_ID_PATTERNS),
            change: {
                keys: [],
                overrides: []
            }
        });
    }
    test('Custom Labels: filename.extname', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${filename}.${extname}'
        });
        const filenames = [
            'file.txt',
            'file.txt1.tx2',
            '.file.txt',
        ];
        for (const filename of filenames) {
            const label = customLabelService.getName(URI.file(filename));
            assert.strictEqual(label, filename);
        }
        let label = customLabelService.getName(URI.file('file'));
        assert.strictEqual(label, 'file.${extname}');
        label = customLabelService.getName(URI.file('.file'));
        assert.strictEqual(label, '.file.${extname}');
    });
    test('Custom Labels: filename', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${filename}',
        });
        assert.strictEqual(customLabelService.getName(URI.file('file')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('file.txt')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('file.txt1.txt2')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('folder/file.txt1.txt2')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('.file')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt1.txt2')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('folder/.file.txt1.txt2')), '.file');
    });
    test('Custom Labels: extname(N)', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**/ext/**': '${extname}',
            '**/ext0/**': '${extname(0)}',
            '**/ext1/**': '${extname(1)}',
            '**/ext2/**': '${extname(2)}',
            '**/extMinus1/**': '${extname(-1)}',
            '**/extMinus2/**': '${extname(-2)}',
        });
        function assertExtname(filename, ext) {
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext/${filename}`)), ext.extname ?? '${extname}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext0/${filename}`)), ext.ext0 ?? '${extname(0)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext1/${filename}`)), ext.ext1 ?? '${extname(1)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext2/${filename}`)), ext.ext2 ?? '${extname(2)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/extMinus1/${filename}`)), ext.extMinus1 ?? '${extname(-1)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/extMinus2/${filename}`)), ext.extMinus2 ?? '${extname(-2)}', filename);
        }
        assertExtname('file.txt', {
            extname: 'txt',
            ext0: 'txt',
            extMinus1: 'txt',
        });
        assertExtname('file.txt1.txt2', {
            extname: 'txt1.txt2',
            ext0: 'txt2',
            ext1: 'txt1',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('.file.txt1.txt2', {
            extname: 'txt1.txt2',
            ext0: 'txt2',
            ext1: 'txt1',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('.file.txt1.txt2.txt3.txt4', {
            extname: 'txt1.txt2.txt3.txt4',
            ext0: 'txt4',
            ext1: 'txt3',
            ext2: 'txt2',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('file', {});
        assertExtname('.file', {});
    });
    test('Custom Labels: dirname(N)', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${dirname},${dirname(0)},${dirname(1)},${dirname(2)},${dirname(-1)},${dirname(-2)}',
        });
        function assertDirname(path, dir) {
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[0], dir.dirname ?? '${dirname}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[1], dir.dir0 ?? '${dirname(0)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[2], dir.dir1 ?? '${dirname(1)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[3], dir.dir2 ?? '${dirname(2)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[4], dir.dirMinus1 ?? '${dirname(-1)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[5], dir.dirMinus2 ?? '${dirname(-2)}', path);
        }
        assertDirname('folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dirMinus1: 'folder',
        });
        assertDirname('root/folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dir1: 'root',
            dirMinus1: 'root',
            dirMinus2: 'folder',
        });
        assertDirname('root/.folder/file.txt', {
            dirname: '.folder',
            dir0: '.folder',
            dir1: 'root',
            dirMinus1: 'root',
            dirMinus2: '.folder',
        });
        assertDirname('root/parent/folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dir1: 'parent',
            dir2: 'root',
            dirMinus1: 'root',
            dirMinus2: 'parent',
        });
        assertDirname('file.txt', {});
    });
    test('Custom Labels: no pattern match', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**/folder/**': 'folder',
            'file': 'file',
        });
        assert.strictEqual(customLabelService.getName(URI.file('file')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('file.txt')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('folder1/file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('folder1/file.txt1.txt2')), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzNILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BGLE9BQU8sRUFBNkIsbUJBQW1CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsSixLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBRXpDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRWpCLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssVUFBVSx3QkFBd0IsQ0FBQyx1QkFBa0QsNkJBQTZCLENBQUMsU0FBUyxF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