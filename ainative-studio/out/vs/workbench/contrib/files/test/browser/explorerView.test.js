/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { ExplorerItem } from '../../common/explorerModel.js';
import { getContext } from '../../browser/views/explorerView.js';
import { listInvalidItemForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { CompressedNavigationController } from '../../browser/views/explorerViewer.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { provideDecorations } from '../../browser/views/explorerDecorationsProvider.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NullFilesConfigurationService } from '../../../../test/common/workbenchTestServices.js';
suite('Files - ExplorerView', () => {
    const $ = dom.$;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const fileService = new TestFileService();
    const configService = new TestConfigurationService();
    function createStat(path, name, isFolder, hasChildren, size, mtime, isSymLink = false, isUnknown = false) {
        return new ExplorerItem(toResource.call(this, path), fileService, configService, NullFilesConfigurationService, undefined, isFolder, isSymLink, false, false, name, mtime, isUnknown);
    }
    test('getContext', async function () {
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/', '/', true, false, 8096, d);
        const s2 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        const s3 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
        const s4 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        const noNavigationController = { getCompressedNavigationController: (stat) => undefined };
        assert.deepStrictEqual(getContext([s1], [s2, s3, s4], true, noNavigationController), [s2, s3, s4]);
        assert.deepStrictEqual(getContext([s1], [s1, s3, s4], true, noNavigationController), [s1, s3, s4]);
        assert.deepStrictEqual(getContext([s1], [s3, s1, s4], false, noNavigationController), [s1]);
        assert.deepStrictEqual(getContext([], [s3, s1, s4], false, noNavigationController), []);
        assert.deepStrictEqual(getContext([], [s3, s1, s4], true, noNavigationController), [s3, s1, s4]);
    });
    test('decoration provider', async function () {
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        s1.error = new Error('A test error');
        const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d, true);
        const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        assert.strictEqual(provideDecorations(s3), undefined);
        assert.deepStrictEqual(provideDecorations(s2), {
            tooltip: 'Symbolic Link',
            letter: '\u2937'
        });
        assert.deepStrictEqual(provideDecorations(s1), {
            tooltip: 'Unable to resolve workspace folder (A test error)',
            letter: '!',
            color: listInvalidItemForeground
        });
        const unknown = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d, false, true);
        assert.deepStrictEqual(provideDecorations(unknown), {
            tooltip: 'Unknown File Type',
            letter: '?'
        });
    });
    test('compressed navigation controller', async function () {
        const container = $('.file');
        const label = $('.label');
        const labelName1 = $('.label-name');
        const labelName2 = $('.label-name');
        const labelName3 = $('.label-name');
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
        const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        dom.append(container, label);
        dom.append(label, labelName1);
        dom.append(label, labelName2);
        dom.append(label, labelName3);
        const emitter = new Emitter();
        const navigationController = new CompressedNavigationController('id', [s1, s2, s3], {
            container,
            templateDisposables: ds.add(new DisposableStore()),
            elementDisposables: ds.add(new DisposableStore()),
            contribs: [],
            label: {
                container: label,
                onDidRender: emitter.event
            },
        }, 1, false);
        ds.add(navigationController);
        assert.strictEqual(navigationController.count, 3);
        assert.strictEqual(navigationController.index, 2);
        assert.strictEqual(navigationController.current, s3);
        navigationController.next();
        assert.strictEqual(navigationController.current, s3);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s2);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s1);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s1);
        navigationController.last();
        assert.strictEqual(navigationController.current, s3);
        navigationController.first();
        assert.strictEqual(navigationController.current, s1);
        navigationController.setIndex(1);
        assert.strictEqual(navigationController.current, s2);
        navigationController.setIndex(44);
        assert.strictEqual(navigationController.current, s2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2V4cGxvcmVyVmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWpHLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVoQixNQUFNLEVBQUUsR0FBRyx1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