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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvdGVzdC9icm93c2VyL2N1c3RvbUVkaXRvckxhYmVsU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRixPQUFPLEVBQTZCLG1CQUFtQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEosS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUV6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVqQixRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLFVBQVUsd0JBQXdCLENBQUMsdUJBQWtELDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUM7UUFDOUksTUFBTSxhQUFhLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ3JELE1BQU0sYUFBYSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVoRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUMxRyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUVELEtBQUssVUFBVSxhQUFhLENBQUMsYUFBdUMsRUFBRSxLQUFVO1FBQy9FLE1BQU0sYUFBYSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlGLGFBQWEsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDbEQsb0JBQW9CLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsS0FBSyx3QkFBd0IsQ0FBQyxtQkFBbUI7WUFDM0YsTUFBTSxrQ0FBMEI7WUFDaEMsWUFBWSxFQUFFLElBQUksR0FBRyxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDO1lBQ25FLE1BQU0sRUFBRTtnQkFDUCxJQUFJLEVBQUUsRUFBRTtnQkFDUixTQUFTLEVBQUUsRUFBRTthQUNiO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRCxNQUFNLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLEdBQUcsTUFBTSx3QkFBd0IsRUFBRSxDQUFDO1FBRTdFLE1BQU0sYUFBYSxDQUFDLGFBQWEsRUFBRTtZQUNsQyxJQUFJLEVBQUUsd0JBQXdCO1NBQzlCLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHO1lBQ2pCLFVBQVU7WUFDVixlQUFlO1lBQ2YsV0FBVztTQUNYLENBQUM7UUFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUU3QyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsR0FBRyxNQUFNLHdCQUF3QixFQUFFLENBQUM7UUFFN0UsTUFBTSxhQUFhLENBQUMsYUFBYSxFQUFFO1lBQ2xDLElBQUksRUFBRSxhQUFhO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLEdBQUcsTUFBTSx3QkFBd0IsRUFBRSxDQUFDO1FBRTdFLE1BQU0sYUFBYSxDQUFDLGFBQWEsRUFBRTtZQUNsQyxXQUFXLEVBQUUsWUFBWTtZQUN6QixZQUFZLEVBQUUsZUFBZTtZQUM3QixZQUFZLEVBQUUsZUFBZTtZQUM3QixZQUFZLEVBQUUsZUFBZTtZQUM3QixpQkFBaUIsRUFBRSxnQkFBZ0I7WUFDbkMsaUJBQWlCLEVBQUUsZ0JBQWdCO1NBQ25DLENBQUMsQ0FBQztRQVdILFNBQVMsYUFBYSxDQUFDLFFBQWdCLEVBQUUsR0FBUztZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3hILE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN6SCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3pILE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3BJLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JJLENBQUM7UUFFRCxhQUFhLENBQUMsVUFBVSxFQUFFO1lBQ3pCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLEtBQUs7WUFDWCxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsZ0JBQWdCLEVBQUU7WUFDL0IsT0FBTyxFQUFFLFdBQVc7WUFDcEIsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsTUFBTTtZQUNaLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoQyxPQUFPLEVBQUUsV0FBVztZQUNwQixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxNQUFNO1lBQ1osU0FBUyxFQUFFLE1BQU07WUFDakIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLDJCQUEyQixFQUFFO1lBQzFDLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxNQUFNO1lBQ1osU0FBUyxFQUFFLE1BQU07WUFDakIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxQixhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsR0FBRyxNQUFNLHdCQUF3QixFQUFFLENBQUM7UUFFN0UsTUFBTSxhQUFhLENBQUMsYUFBYSxFQUFFO1lBQ2xDLElBQUksRUFBRSxvRkFBb0Y7U0FDMUYsQ0FBQyxDQUFDO1FBV0gsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLEdBQVM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsT0FBTyxJQUFJLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqSCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pILE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqSCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLElBQUksZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hILENBQUM7UUFFRCxhQUFhLENBQUMsaUJBQWlCLEVBQUU7WUFDaEMsT0FBTyxFQUFFLFFBQVE7WUFDakIsSUFBSSxFQUFFLFFBQVE7WUFDZCxTQUFTLEVBQUUsUUFBUTtTQUNuQixDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsc0JBQXNCLEVBQUU7WUFDckMsT0FBTyxFQUFFLFFBQVE7WUFDakIsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsTUFBTTtZQUNaLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFNBQVMsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyx1QkFBdUIsRUFBRTtZQUN0QyxPQUFPLEVBQUUsU0FBUztZQUNsQixJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxNQUFNO1lBQ1osU0FBUyxFQUFFLE1BQU07WUFDakIsU0FBUyxFQUFFLFNBQVM7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLDZCQUE2QixFQUFFO1lBQzVDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsTUFBTTtZQUNaLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFNBQVMsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsTUFBTSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxHQUFHLE1BQU0sd0JBQXdCLEVBQUUsQ0FBQztRQUU3RSxNQUFNLGFBQWEsQ0FBQyxhQUFhLEVBQUU7WUFDbEMsY0FBYyxFQUFFLFFBQVE7WUFDeEIsTUFBTSxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDL0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9