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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9wcm9jZXNzZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLFNBQVMsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sR0FBRyxHQUFHO1lBQ1gsR0FBRyxFQUFFLEtBQUs7WUFDViw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLHVCQUF1QixFQUFFLEdBQUc7WUFDNUIsZ0JBQWdCLEVBQUUsR0FBRztZQUNyQiwwQkFBMEIsRUFBRSxHQUFHO1lBQy9CLG9CQUFvQixFQUFFLEdBQUc7WUFDekIsVUFBVSxFQUFFLEdBQUc7WUFDZixVQUFVLEVBQUUsR0FBRztZQUNmLGVBQWUsRUFBRSxHQUFHO1lBQ3BCLGlCQUFpQixFQUFFLEdBQUc7WUFDdEIsZUFBZSxFQUFFLEdBQUc7WUFDcEIsVUFBVSxFQUFFLEdBQUc7WUFDZixrQkFBa0IsRUFBRSxHQUFHO1lBQ3ZCLHNCQUFzQixFQUFFLEdBQUc7WUFDM0IsY0FBYyxFQUFFLEdBQUc7WUFDbkIsc0JBQXNCLEVBQUUsR0FBRztZQUMzQixvQkFBb0IsRUFBRSxHQUFHO1NBQ3pCLENBQUM7UUFDRixTQUFTLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9