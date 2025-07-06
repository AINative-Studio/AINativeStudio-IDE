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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vcHJvY2Vzc2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxTQUFTLE1BQU0sMkJBQTJCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxNQUFNLEdBQUcsR0FBRztZQUNYLEdBQUcsRUFBRSxLQUFLO1lBQ1YsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyx1QkFBdUIsRUFBRSxHQUFHO1lBQzVCLGdCQUFnQixFQUFFLEdBQUc7WUFDckIsMEJBQTBCLEVBQUUsR0FBRztZQUMvQixvQkFBb0IsRUFBRSxHQUFHO1lBQ3pCLFVBQVUsRUFBRSxHQUFHO1lBQ2YsVUFBVSxFQUFFLEdBQUc7WUFDZixlQUFlLEVBQUUsR0FBRztZQUNwQixpQkFBaUIsRUFBRSxHQUFHO1lBQ3RCLGVBQWUsRUFBRSxHQUFHO1lBQ3BCLFVBQVUsRUFBRSxHQUFHO1lBQ2Ysa0JBQWtCLEVBQUUsR0FBRztZQUN2QixzQkFBc0IsRUFBRSxHQUFHO1lBQzNCLGNBQWMsRUFBRSxHQUFHO1lBQ25CLHNCQUFzQixFQUFFLEdBQUc7WUFDM0Isb0JBQW9CLEVBQUUsR0FBRztTQUN6QixDQUFDO1FBQ0YsU0FBUyxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==