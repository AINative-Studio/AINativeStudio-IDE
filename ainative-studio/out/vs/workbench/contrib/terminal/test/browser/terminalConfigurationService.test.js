/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notStrictEqual, ok, strictEqual } from 'assert';
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ITerminalConfigurationService } from '../../browser/terminal.js';
import { TestTerminalConfigurationService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalConfigurationService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let terminalConfigurationService;
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        configurationService = instantiationService.get(IConfigurationService);
        terminalConfigurationService = instantiationService.get(ITerminalConfigurationService);
    });
    suite('config', () => {
        test('should update on any change to terminal.integrated', () => {
            const originalConfig = terminalConfigurationService.config;
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: configuration => configuration.startsWith('terminal.integrated'),
                affectedKeys: new Set(['terminal.integrated.fontWeight']),
                change: null,
                source: 2 /* ConfigurationTarget.USER */
            });
            notStrictEqual(terminalConfigurationService.config, originalConfig, 'Object reference must change');
        });
        suite('onConfigChanged', () => {
            test('should fire on any change to terminal.integrated', async () => {
                await new Promise(r => {
                    store.add(terminalConfigurationService.onConfigChanged(() => r()));
                    configurationService.onDidChangeConfigurationEmitter.fire({
                        affectsConfiguration: configuration => configuration.startsWith('terminal.integrated'),
                        affectedKeys: new Set(['terminal.integrated.fontWeight']),
                        change: null,
                        source: 2 /* ConfigurationTarget.USER */
                    });
                });
            });
        });
    });
    function createTerminalConfigationService(config, linuxDistro) {
        const instantiationService = new TestInstantiationService();
        instantiationService.set(IConfigurationService, new TestConfigurationService(config));
        const terminalConfigurationService = store.add(instantiationService.createInstance(TestTerminalConfigurationService));
        instantiationService.set(ITerminalConfigurationService, terminalConfigurationService);
        terminalConfigurationService.setPanelContainer(mainWindow.document.body);
        if (linuxDistro) {
            terminalConfigurationService.fontMetrics.linuxDistro = linuxDistro;
        }
        return terminalConfigurationService;
    }
    suite('getFont', () => {
        test('fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: 'bar' } }
            });
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('bar'), 'terminal.integrated.fontFamily should be selected over editor.fontFamily');
        });
        test('fontFamily (Linux Fedora)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } }
            }, 2 /* LinuxDistro.Fedora */);
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('\'DejaVu Sans Mono\''), 'Fedora should have its font overridden when terminal.integrated.fontFamily not set');
        });
        test('fontFamily (Linux Ubuntu)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } }
            }, 3 /* LinuxDistro.Ubuntu */);
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('\'Ubuntu Mono\''), 'Ubuntu should have its font overridden when terminal.integrated.fontFamily not set');
        });
        test('fontFamily (Linux Unknown)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } }
            });
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('foo'), 'editor.fontFamily should be the fallback when terminal.integrated.fontFamily not set');
        });
        test('fontSize 10', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    fontSize: 9
                },
                terminal: {
                    integrated: {
                        fontFamily: 'bar',
                        fontSize: 10
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 10, 'terminal.integrated.fontSize should be selected over editor.fontSize');
        });
        test('fontSize 0', () => {
            let terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo'
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                        fontSize: 0
                    }
                }
            }, 3 /* LinuxDistro.Ubuntu */);
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 8, 'The minimum terminal font size (with adjustment) should be used when terminal.integrated.fontSize less than it');
            terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo'
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                        fontSize: 0
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 6, 'The minimum terminal font size should be used when terminal.integrated.fontSize less than it');
        });
        test('fontSize 1500', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo'
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: 1500
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 100, 'The maximum terminal font size should be used when terminal.integrated.fontSize more than it');
        });
        test('fontSize null', () => {
            let terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo'
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: null
                    }
                }
            }, 3 /* LinuxDistro.Ubuntu */);
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, EDITOR_FONT_DEFAULTS.fontSize + 2, 'The default editor font size (with adjustment) should be used when terminal.integrated.fontSize is not set');
            terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo'
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: null
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, EDITOR_FONT_DEFAULTS.fontSize, 'The default editor font size should be used when terminal.integrated.fontSize is not set');
        });
        test('lineHeight 2', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    lineHeight: 1
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        lineHeight: 2
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).lineHeight, 2, 'terminal.integrated.lineHeight should be selected over editor.lineHeight');
        });
        test('lineHeight 0', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    lineHeight: 1
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        lineHeight: 0
                    }
                }
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).lineHeight, isLinux ? 1.1 : 1, 'editor.lineHeight should be the default when terminal.integrated.lineHeight not set');
        });
    });
    suite('configFontIsMonospace', () => {
        test('isMonospace monospace', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'monospace'
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), true, 'monospace is monospaced');
        });
        test('isMonospace sans-serif', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'sans-serif'
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'sans-serif is not monospaced');
        });
        test('isMonospace serif', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'serif'
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'serif is not monospaced');
        });
        test('isMonospace monospace falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'monospace'
                },
                terminal: {
                    integrated: {
                        fontFamily: null
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), true, 'monospace is monospaced');
        });
        test('isMonospace sans-serif falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'sans-serif'
                },
                terminal: {
                    integrated: {
                        fontFamily: null
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'sans-serif is not monospaced');
        });
        test('isMonospace serif falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'serif'
                },
                terminal: {
                    integrated: {
                        fontFamily: null
                    }
                }
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'serif is not monospaced');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbENvbmZpZ3VyYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsNkJBQTZCLEVBQWUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVwSSxLQUFLLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO0lBQ3RELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLDRC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