/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { deserializeEnvironmentVariableCollection, serializeEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { EnvironmentVariableMutatorType } from '../../../../../platform/terminal/common/environmentVariable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EnvironmentVariable - deserializeEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should construct correctly with 3 arguments', () => {
        const c = deserializeEnvironmentVariableCollection([
            ['A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }]
        ]);
        const keys = [...c.keys()];
        deepStrictEqual(keys, ['A', 'B', 'C']);
        deepStrictEqual(c.get('A'), { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
        deepStrictEqual(c.get('B'), { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' });
        deepStrictEqual(c.get('C'), { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' });
    });
});
suite('EnvironmentVariable - serializeEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should correctly serialize the object', () => {
        const collection = new Map();
        deepStrictEqual(serializeEnvironmentVariableCollection(collection), []);
        collection.set('A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
        collection.set('B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' });
        collection.set('C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' });
        deepStrictEqual(serializeEnvironmentVariableCollection(collection), [
            ['A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }]
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL2Vudmlyb25tZW50VmFyaWFibGVTaGFyZWQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3hLLE9BQU8sRUFBRSw4QkFBOEIsRUFBK0IsTUFBTSxnRUFBZ0UsQ0FBQztBQUM3SSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO0lBQzVFLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLENBQUMsR0FBRyx3Q0FBd0MsQ0FBQztZQUNsRCxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDbEYsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2pGLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsOEJBQThCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztTQUNsRixD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