/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getInstanceFromResource, getTerminalResourcesFromDragEvent, getTerminalUri } from '../../browser/terminalUri.js';
function fakeDragEvent(data) {
    return {
        dataTransfer: {
            getData: () => {
                return data;
            }
        }
    };
}
suite('terminalUri', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getTerminalResourcesFromDragEvent', () => {
        test('should give undefined when no terminal resources is in event', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent(''))?.map(e => e.toString()), undefined);
        });
        test('should give undefined when an empty terminal resources array is in event', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('[]'))?.map(e => e.toString()), undefined);
        });
        test('should return terminal resource when event contains one', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('["vscode-terminal:/1626874386474/3"]'))?.map(e => e.toString()), ['vscode-terminal:/1626874386474/3']);
        });
        test('should return multiple terminal resources when event contains multiple', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('["vscode-terminal:/foo/1","vscode-terminal:/bar/2"]'))?.map(e => e.toString()), ['vscode-terminal:/foo/1', 'vscode-terminal:/bar/2']);
        });
    });
    suite('getInstanceFromResource', () => {
        test('should return undefined if there is no match', () => {
            strictEqual(getInstanceFromResource([
                { resource: getTerminalUri('workspace', 2, 'title') }
            ], getTerminalUri('workspace', 1)), undefined);
        });
        test('should return a result if there is a match', () => {
            const instance = { resource: getTerminalUri('workspace', 2, 'title') };
            strictEqual(getInstanceFromResource([
                { resource: getTerminalUri('workspace', 1, 'title') },
                instance,
                { resource: getTerminalUri('workspace', 3, 'title') }
            ], getTerminalUri('workspace', 2)), instance);
        });
        test('should ignore the fragment', () => {
            const instance = { resource: getTerminalUri('workspace', 2, 'title') };
            strictEqual(getInstanceFromResource([
                { resource: getTerminalUri('workspace', 1, 'title') },
                instance,
                { resource: getTerminalUri('workspace', 3, 'title') }
            ], getTerminalUri('workspace', 2, 'does not match!')), instance);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxVcmkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUNBQWlDLEVBQUUsY0FBYyxFQUFxQixNQUFNLDhCQUE4QixDQUFDO0FBRTdJLFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDbEMsT0FBTztRQUNOLFlBQVksRUFBRTtZQUNiLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0Q7S0FDRCxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1lBQ3pFLGVBQWUsQ0FDZCxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDNUUsU0FBUyxDQUNULENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQywwRUFBMEUsRUFBRSxHQUFHLEVBQUU7WUFDckYsZUFBZSxDQUNkLGlDQUFpQyxDQUFDLGFBQWEsQ0FBQyxJQUFJ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