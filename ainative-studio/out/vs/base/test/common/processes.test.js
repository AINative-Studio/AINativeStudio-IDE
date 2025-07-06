/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as processes from '../../common/processes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Processes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('sanitizeProcessEnvironment', () => {
        const env = {
            FOO: 'bar',
            ELECTRON_ENABLE_STACK_DUMPING: 'x',
            ELECTRON_ENABLE_LOGGING: 'x',
            ELECTRON_NO_ASAR: 'x',
            ELECTRON_NO_ATTACH_CONSOLE: 'x',
            ELECTRON_RUN_AS_NODE: 'x',
            VSCODE_CLI: 'x',
            VSCODE_DEV: 'x',
            VSCODE_IPC_HOOK: 'x',
            VSCODE_NLS_CONFIG: 'x',
            VSCODE_PORTABLE: '3',
            VSCODE_PID: 'x',
            VSCODE_SHELL_LOGIN: '1',
            VSCODE_CODE_CACHE_PATH: 'x',
            VSCODE_NEW_VAR: 'x',
            GDK_PIXBUF_MODULE_FILE: 'x',
            GDK_PIXBUF_MODULEDIR: 'x'
        };
        processes.sanitizeProcessEnvironment(env);
        assert.strictEqual(env['FOO'], 'bar');
        assert.strictEqual(env['VSCODE_SHELL_LOGIN'], '1');
        assert.strictEqual(env['VSCODE_PORTABLE'], '3');
        assert.strictEqual(Object.keys(env).length, 3);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Byb2Nlc3Nlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssU0FBUyxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsTUFBTSxHQUFHLEdBQUc7WUFDWCxHQUFHLEVBQUUsS0FBSztZQUNWLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsdUJBQXVCLEVBQUUsR0FBRztZQUM1QixnQkFBZ0IsRUFBRSxHQUFHO1lBQ3JCLDBCQUEwQixFQUFFLEdBQUc7WUFDL0Isb0JBQW9CLEVBQUUsR0FBRztZQUN6QixVQUFVLEVBQUUsR0FBRztZQUNmLFVBQVUsRUFBRSxHQUFHO1lBQ2YsZUFBZSxFQUFFLEdBQUc7WUFDcEIsaUJBQWlCLEVBQUUsR0FBRztZQUN0QixlQUFlLEVBQUUsR0FBRztZQUNwQixVQUFVLEVBQUUsR0FBRztZQUNmLGtCQUFrQixFQUFFLEdBQUc7WUFDdkIsc0JBQXNCLEVBQUUsR0FBRztZQUMzQixjQUFjLEVBQUUsR0FBRztZQUNuQixzQkFBc0IsRUFBRSxHQUFHO1lBQzNCLG9CQUFvQixFQUFFLEdBQUc7U0FDekIsQ0FBQztRQUNGLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=