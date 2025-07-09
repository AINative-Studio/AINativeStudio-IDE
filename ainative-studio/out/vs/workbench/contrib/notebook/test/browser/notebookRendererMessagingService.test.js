/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NullExtensionService } from '../../../../services/extensions/common/extensions.js';
import { stub } from 'sinon';
import { NotebookRendererMessagingService } from '../../browser/services/notebookRendererMessagingServiceImpl.js';
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('NotebookRendererMessaging', () => {
    let extService;
    let m;
    let sent = [];
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        sent = [];
        extService = new NullExtensionService();
        m = ds.add(new NotebookRendererMessagingService(extService));
        ds.add(m.onShouldPostMessage(e => sent.push(e)));
    });
    test('activates on prepare', () => {
        const activate = stub(extService, 'activateByEvent').returns(Promise.resolve());
        m.prepare('foo');
        m.prepare('foo');
        m.prepare('foo');
        assert.deepStrictEqual(activate.args, [['onRenderer:foo']]);
    });
    test('buffers and then plays events', async () => {
        stub(extService, 'activateByEvent').returns(Promise.resolve());
        const scoped = m.getScoped('some-editor');
        scoped.postMessage('foo', 1);
        scoped.postMessage('foo', 2);
        assert.deepStrictEqual(sent, []);
        await timeout(0);
        const expected = [
            { editorId: 'some-editor', rendererId: 'foo', message: 1 },
            { editorId: 'some-editor', rendererId: 'foo', message: 2 }
        ];
        assert.deepStrictEqual(sent, expected);
        scoped.postMessage('foo', 3);
        assert.deepStrictEqual(sent, [
            ...expected,
            { editorId: 'some-editor', rendererId: 'foo', message: 3 }
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tSZW5kZXJlck1lc3NhZ2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tSZW5kZXJlck1lc3NhZ2luZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2xILE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2QyxJQUFJLFVBQWdDLENBQUM7SUFDckMsSUFBSSxDQUFtQyxDQUFDO0lBQ3hDLElBQUksSUFBSSxHQUFjLEVBQUUsQ0FBQztJQUV6QixNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXJELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1YsVUFBVSxHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQztRQUN4QyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFL0QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQixNQUFNLFFBQVEsR0FBRztZQUNoQixFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1lBQzFELEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDMUQsQ0FBQztRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzVCLEdBQUcsUUFBUTtZQUNYLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDMUQsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9