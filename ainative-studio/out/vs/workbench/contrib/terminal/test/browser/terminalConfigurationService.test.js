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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDM0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLDZCQUE2QixFQUFlLE1BQU0sMkJBQTJCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFcEksS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtJQUN0RCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFB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