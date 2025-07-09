/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockDebugAdapter } from './mockDebug.js';
suite('Debug - AbstractDebugAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('event ordering', () => {
        let adapter;
        let output;
        setup(() => {
            adapter = new MockDebugAdapter();
            output = [];
            adapter.onEvent(ev => {
                output.push(ev.body.output);
                Promise.resolve().then(() => output.push('--end microtask--'));
            });
        });
        const evaluate = async (expression) => {
            await new Promise(resolve => adapter.sendRequest('evaluate', { expression }, resolve));
            output.push(`=${expression}`);
            Promise.resolve().then(() => output.push('--end microtask--'));
        };
        test('inserts task boundary before response', async () => {
            await evaluate('before.foo');
            await timeout(0);
            assert.deepStrictEqual(output, ['before.foo', '--end microtask--', '=before.foo', '--end microtask--']);
        });
        test('inserts task boundary after response', async () => {
            await evaluate('after.foo');
            await timeout(0);
            assert.deepStrictEqual(output, ['=after.foo', '--end microtask--', 'after.foo', '--end microtask--']);
        });
        test('does not insert boundaries between events', async () => {
            adapter.sendEventBody('output', { output: 'a' });
            adapter.sendEventBody('output', { output: 'b' });
            adapter.sendEventBody('output', { output: 'c' });
            await timeout(0);
            assert.deepStrictEqual(output, ['a', 'b', 'c', '--end microtask--', '--end microtask--', '--end microtask--']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3REZWJ1Z0FkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2NvbW1vbi9hYnN0cmFjdERlYnVnQWRhcHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFbEQsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtJQUMxQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDNUIsSUFBSSxPQUF5QixDQUFDO1FBQzlCLElBQUksTUFBZ0IsQ0FBQztRQUNyQixLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1YsT0FBTyxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNqQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDcEIsTUFBTSxDQUFDLElBQUksQ0FBRSxFQUFnQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLFVBQWtCLEVBQUUsRUFBRTtZQUM3QyxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3ZGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELE1BQU0sUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdCLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWpCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsWUFBWSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDekcsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUN2RyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDakQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUNqRCxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUNoSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==