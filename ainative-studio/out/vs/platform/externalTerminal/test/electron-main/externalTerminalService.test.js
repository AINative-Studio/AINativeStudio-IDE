/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DEFAULT_TERMINAL_OSX } from '../../common/externalTerminal.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService } from '../../node/externalTerminalService.js';
const mockConfig = Object.freeze({
    terminal: {
        explorerKind: 'external',
        external: {
            windowsExec: 'testWindowsShell',
            osxExec: 'testOSXShell',
            linuxExec: 'testLinuxShell'
        }
    }
});
suite('ExternalTerminalService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(`WinTerminalService - uses terminal from configuration`, done => {
        const testShell = 'cmd';
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(command, testShell, 'shell should equal expected');
                strictEqual(args[args.length - 1], mockConfig.terminal.external.windowsExec);
                strictEqual(opts.cwd, testCwd);
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - uses default terminal when configuration.terminal.external.windowsExec is undefined`, done => {
        const testShell = 'cmd';
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[args.length - 1], WindowsExternalTerminalService.getDefaultTerminalWindows());
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        mockConfig.terminal.external.windowsExec = undefined;
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - cwd is correct regardless of case`, done => {
        const testShell = 'cmd';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(opts.cwd, 'C:/foo', 'cwd should be uppercase regardless of the case that\'s passed in');
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - cmder should be spawned differently`, done => {
        const testShell = 'cmd';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                deepStrictEqual(args, ['C:/foo']);
                strictEqual(opts, undefined);
                done();
                return { on: (evt) => evt };
            }
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, { windowsExec: 'cmder' }, testShell, testCwd);
    });
    test(`WinTerminalService - windows terminal should open workspace directory`, done => {
        const testShell = 'wt';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(opts.cwd, 'C:/foo');
                done();
                return { on: (evt) => evt };
            }
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`MacTerminalService - uses terminal from configuration`, done => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[1], mockConfig.terminal.external.osxExec);
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        const testService = new MacExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
    });
    test(`MacTerminalService - uses default terminal when configuration.terminal.external.osxExec is undefined`, done => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[1], DEFAULT_TERMINAL_OSX);
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        const testService = new MacExternalTerminalService();
        testService.spawnTerminal(mockSpawner, { osxExec: undefined }, testCwd);
    });
    test(`LinuxTerminalService - uses terminal from configuration`, done => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(command, mockConfig.terminal.external.linuxExec);
                strictEqual(opts.cwd, testCwd);
                done();
                return {
                    on: (evt) => evt
                };
            }
        };
        const testService = new LinuxExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
    });
    test(`LinuxTerminalService - uses default terminal when configuration.terminal.external.linuxExec is undefined`, done => {
        LinuxExternalTerminalService.getDefaultTerminalLinuxReady().then(defaultTerminalLinux => {
            const testCwd = 'path/to/workspace';
            const mockSpawner = {
                spawn: (command, args, opts) => {
                    strictEqual(command, defaultTerminalLinux);
                    done();
                    return {
                        on: (evt) => evt
                    };
                }
            };
            mockConfig.terminal.external.linuxExec = undefined;
            const testService = new LinuxExternalTerminalService();
            testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFRlcm1pbmFsL3Rlc3QvZWxlY3Ryb24tbWFpbi9leHRlcm5hbFRlcm1pbmFsU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBa0MsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVqSixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFpQztJQUNoRSxRQUFRLEVBQUU7UUFDVCxZQUFZLEVBQUUsVUFBVTtRQUN4QixRQUFRLEVBQUU7WUFDVCxXQUFXLEVBQUUsa0JBQWtCO1lBQy9CLE9BQU8sRUFBRSxjQUFjO1lBQ3ZCLFNBQVMsRUFBRSxnQkFBZ0I7U0FDM0I7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsdURBQXVELEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDcEUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDO1FBQ3BDLE1BQU0sV0FBVyxHQUFRO1lBQ3hCLEtBQUssRUFBRSxDQUFDLE9BQVksRUFBRSxJQUFTLEVBQUUsSUFBUyxFQUFF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