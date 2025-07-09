/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notEqual, strictEqual, throws } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { DecorationAddon } from '../../../browser/xterm/decorationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
suite('DecorationAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let decorationAddon;
    let xterm;
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        class TestTerminal extends TerminalCtor {
            registerDecoration(decorationOptions) {
                if (decorationOptions.marker.isDisposed) {
                    return undefined;
                }
                const element = document.createElement('div');
                return { marker: decorationOptions.marker, element, onDispose: () => { }, isDisposed: false, dispose: () => { }, onRender: (element) => { return element; } };
            }
        }
        const instantiationService = workbenchInstantiationService({
            configurationService: () => new TestConfigurationService({
                files: {},
                workbench: {
                    hover: { delay: 5 },
                },
                terminal: {
                    integrated: {
                        shellIntegration: {
                            decorationsEnabled: 'both'
                        }
                    }
                }
            })
        }, store);
        xterm = store.add(new TestTerminal({
            allowProposedApi: true,
            cols: 80,
            rows: 30
        }));
        const capabilities = store.add(new TerminalCapabilityStore());
        capabilities.add(2 /* TerminalCapability.CommandDetection */, store.add(instantiationService.createInstance(CommandDetectionCapability, xterm)));
        decorationAddon = store.add(instantiationService.createInstance(DecorationAddon, capabilities));
        xterm.loadAddon(decorationAddon);
    });
    suite('registerDecoration', () => {
        test('should throw when command has no marker', async () => {
            throws(() => decorationAddon.registerCommandDecoration({ command: 'cd src', timestamp: Date.now(), hasOutput: () => false }));
        });
        test('should return undefined when marker has been disposed of', async () => {
            const marker = xterm.registerMarker(1);
            marker?.dispose();
            strictEqual(decorationAddon.registerCommandDecoration({ command: 'cd src', marker, timestamp: Date.now(), hasOutput: () => false }), undefined);
        });
        test('should return decoration when marker has not been disposed of', async () => {
            const marker = xterm.registerMarker(2);
            notEqual(decorationAddon.registerCommandDecoration({ command: 'cd src', marker, timestamp: Date.now(), hasOutput: () => false }), undefined);
        });
        test('should return decoration with mark properties', async () => {
            const marker = xterm.registerMarker(2);
            notEqual(decorationAddon.registerCommandDecoration(undefined, undefined, { marker }), undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3h0ZXJtL2RlY29yYXRpb25BZGRvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQztBQUNuSSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckcsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksZUFBZ0MsQ0FBQztJQUNyQyxJQUFJLEtBQXVCLENBQUM7SUFFNUIsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBZ0MsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ3pILE1BQU0sWUFBYSxTQUFRLFlBQVk7WUFDN0Isa0JBQWtCLENB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