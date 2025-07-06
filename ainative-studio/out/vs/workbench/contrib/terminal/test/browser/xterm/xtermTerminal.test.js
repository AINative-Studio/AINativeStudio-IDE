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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3h0ZXJtL3h0ZXJtVGVybWluYWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUM3SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSxrRUFBa0UsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUEwQixnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUseUJBQXlCLEVBQUUsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQUUseUJBQXlCLEVBQUUsNENBQTRDLEVBQUUsbUNBQW1DLEVB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