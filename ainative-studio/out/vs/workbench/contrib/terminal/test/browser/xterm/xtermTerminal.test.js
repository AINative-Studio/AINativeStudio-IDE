/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { Color, RGBA } from '../../../../../../base/common/color.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestColorTheme } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../../../common/theme.js';
import { XtermTerminal } from '../../../browser/xterm/xtermTerminal.js';
import { TERMINAL_VIEW_ID } from '../../../common/terminal.js';
import { registerColors, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_FOREGROUND_COLOR, TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_FOREGROUND_COLOR } from '../../../common/terminalColorRegistry.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { XtermAddonImporter } from '../../../browser/xterm/xtermAddonImporter.js';
registerColors();
class TestWebglAddon {
    constructor() {
        this.onChangeTextureAtlas = new Emitter().event;
        this.onAddTextureAtlasCanvas = new Emitter().event;
        this.onRemoveTextureAtlasCanvas = new Emitter().event;
        this.onContextLoss = new Emitter().event;
    }
    static { this.shouldThrow = false; }
    static { this.isEnabled = false; }
    activate() {
        TestWebglAddon.isEnabled = !TestWebglAddon.shouldThrow;
        if (TestWebglAddon.shouldThrow) {
            throw new Error('Test webgl set to throw');
        }
    }
    dispose() {
        TestWebglAddon.isEnabled = false;
    }
    clearTextureAtlas() { }
}
class TestXtermAddonImporter extends XtermAddonImporter {
    async importAddon(name) {
        if (name === 'webgl') {
            return Promise.resolve(TestWebglAddon);
        }
        return super.importAddon(name);
    }
}
export class TestViewDescriptorService {
    constructor() {
        this._location = 1 /* ViewContainerLocation.Panel */;
        this._onDidChangeLocation = new Emitter();
        this.onDidChangeLocation = this._onDidChangeLocation.event;
    }
    getViewLocationById(id) {
        return this._location;
    }
    moveTerminalToLocation(to) {
        const oldLocation = this._location;
        this._location = to;
        this._onDidChangeLocation.fire({
            views: [
                { id: TERMINAL_VIEW_ID }
            ],
            from: oldLocation,
            to
        });
    }
}
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6'
};
suite('XtermTerminal', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let XTermBaseCtor;
    setup(async () => {
        configurationService = new TestConfigurationService({
            editor: {
                fastScrollSensitivity: 2,
                mouseWheelScrollSensitivity: 1
            },
            files: {},
            terminal: {
                integrated: defaultTerminalConfig
            }
        });
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        themeService = instantiationService.get(IThemeService);
        XTermBaseCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        const capabilityStore = store.add(new TerminalCapabilityStore());
        xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities: capabilityStore,
            disableShellIntegrationReporting: true,
            xtermAddonImporter: new TestXtermAddonImporter(),
        }));
        TestWebglAddon.shouldThrow = false;
        TestWebglAddon.isEnabled = false;
    });
    test('should use fallback dimensions of 80x30', () => {
        strictEqual(xterm.raw.cols, 80);
        strictEqual(xterm.raw.rows, 30);
    });
    suite('theme', () => {
        test('should apply correct background color based on getBackgroundColor', () => {
            themeService.setTheme(new TestColorTheme({
                [PANEL_BACKGROUND]: '#ff0000',
                [SIDE_BAR_BACKGROUND]: '#00ff00'
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => new Color(new RGBA(255, 0, 0)) },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true,
            }));
            strictEqual(xterm.raw.options.theme?.background, '#ff0000');
        });
        test('should react to and apply theme changes', () => {
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#000100',
                [TERMINAL_FOREGROUND_COLOR]: '#000200',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#000300',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#000400',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#000500',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#000600',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: undefined,
                'terminal.ansiBlack': '#010000',
                'terminal.ansiRed': '#020000',
                'terminal.ansiGreen': '#030000',
                'terminal.ansiYellow': '#040000',
                'terminal.ansiBlue': '#050000',
                'terminal.ansiMagenta': '#060000',
                'terminal.ansiCyan': '#070000',
                'terminal.ansiWhite': '#080000',
                'terminal.ansiBrightBlack': '#090000',
                'terminal.ansiBrightRed': '#100000',
                'terminal.ansiBrightGreen': '#110000',
                'terminal.ansiBrightYellow': '#120000',
                'terminal.ansiBrightBlue': '#130000',
                'terminal.ansiBrightMagenta': '#140000',
                'terminal.ansiBrightCyan': '#150000',
                'terminal.ansiBrightWhite': '#160000',
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => undefined },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true
            }));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#000200',
                cursor: '#000300',
                cursorAccent: '#000400',
                selectionBackground: '#000500',
                selectionInactiveBackground: '#000600',
                selectionForeground: undefined,
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#010000',
                green: '#030000',
                red: '#020000',
                yellow: '#040000',
                blue: '#050000',
                magenta: '#060000',
                cyan: '#070000',
                white: '#080000',
                brightBlack: '#090000',
                brightRed: '#100000',
                brightGreen: '#110000',
                brightYellow: '#120000',
                brightBlue: '#130000',
                brightMagenta: '#140000',
                brightCyan: '#150000',
                brightWhite: '#160000',
            });
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#00010f',
                [TERMINAL_FOREGROUND_COLOR]: '#00020f',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#00030f',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#00040f',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#00050f',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#00060f',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: '#00070f',
                'terminal.ansiBlack': '#01000f',
                'terminal.ansiRed': '#02000f',
                'terminal.ansiGreen': '#03000f',
                'terminal.ansiYellow': '#04000f',
                'terminal.ansiBlue': '#05000f',
                'terminal.ansiMagenta': '#06000f',
                'terminal.ansiCyan': '#07000f',
                'terminal.ansiWhite': '#08000f',
                'terminal.ansiBrightBlack': '#09000f',
                'terminal.ansiBrightRed': '#10000f',
                'terminal.ansiBrightGreen': '#11000f',
                'terminal.ansiBrightYellow': '#12000f',
                'terminal.ansiBrightBlue': '#13000f',
                'terminal.ansiBrightMagenta': '#14000f',
                'terminal.ansiBrightCyan': '#15000f',
                'terminal.ansiBrightWhite': '#16000f',
            }));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#00020f',
                cursor: '#00030f',
                cursorAccent: '#00040f',
                selectionBackground: '#00050f',
                selectionInactiveBackground: '#00060f',
                selectionForeground: '#00070f',
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#01000f',
                green: '#03000f',
                red: '#02000f',
                yellow: '#04000f',
                blue: '#05000f',
                magenta: '#06000f',
                cyan: '#07000f',
                white: '#08000f',
                brightBlack: '#09000f',
                brightRed: '#10000f',
                brightGreen: '#11000f',
                brightYellow: '#12000f',
                brightBlue: '#13000f',
                brightMagenta: '#14000f',
                brightCyan: '#15000f',
                brightWhite: '#16000f',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci94dGVybS94dGVybVRlcm1pbmFsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFFNUgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDN0gsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQW9CLE1BQU0sa0VBQWtFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBMEIsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLGdDQUFnQyxFQUFFLGdDQUFnQyxFQUFFLHlCQUF5QixFQUFFLDRDQUE0QyxFQUFFLG1DQUFtQyxF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