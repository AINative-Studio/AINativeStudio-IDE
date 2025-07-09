/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
import { LineDataEventAddon } from '../../../browser/xterm/lineDataEventAddon.js';
suite('LineDataEventAddon', () => {
    let xterm;
    let lineDataEventAddon;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('onLineData', () => {
        let events;
        setup(async () => {
            const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
            xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 4 }));
            lineDataEventAddon = store.add(new LineDataEventAddon());
            xterm.loadAddon(lineDataEventAddon);
            events = [];
            store.add(lineDataEventAddon.onLineData(e => events.push(e)));
        });
        test('should fire when a non-wrapped line ends with a line feed', async () => {
            await writeP(xterm, 'foo');
            deepStrictEqual(events, []);
            await writeP(xterm, '\n\r');
            deepStrictEqual(events, ['foo']);
            await writeP(xterm, 'bar');
            deepStrictEqual(events, ['foo']);
            await writeP(xterm, '\n');
            deepStrictEqual(events, ['foo', 'bar']);
        });
        test('should not fire soft wrapped lines', async () => {
            await writeP(xterm, 'foo.');
            deepStrictEqual(events, []);
            await writeP(xterm, 'bar.');
            deepStrictEqual(events, []);
            await writeP(xterm, 'baz.');
            deepStrictEqual(events, []);
        });
        test('should fire when a wrapped line ends with a line feed', async () => {
            await writeP(xterm, 'foo.bar.baz.');
            deepStrictEqual(events, []);
            await writeP(xterm, '\n\r');
            deepStrictEqual(events, ['foo.bar.baz.']);
        });
        test('should not fire on cursor move when the backing process is not on Windows', async () => {
            await writeP(xterm, 'foo.\x1b[H');
            deepStrictEqual(events, []);
        });
        test('should fire on cursor move when the backing process is on Windows', async () => {
            lineDataEventAddon.setOperatingSystem(1 /* OperatingSystem.Windows */);
            await writeP(xterm, 'foo\x1b[H');
            deepStrictEqual(events, ['foo']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURhdGFFdmVudEFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3h0ZXJtL2xpbmVEYXRhRXZlbnRBZGRvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWxGLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxLQUFlLENBQUM7SUFDcEIsSUFBSSxrQkFBc0MsQ0FBQztJQUUzQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLElBQUksTUFBZ0IsQ0FBQztRQUVyQixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDaEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDekgsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RSxrQkFBa0IsR0FBRyxL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