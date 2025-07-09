/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { PartialCommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/partialCommandDetectionCapability.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
suite('PartialCommandDetectionCapability', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capability;
    let addEvents;
    function assertCommands(expectedLines) {
        deepStrictEqual(capability.commands.map(e => e.line), expectedLines);
        deepStrictEqual(addEvents.map(e => e.line), expectedLines);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80 }));
        capability = store.add(new PartialCommandDetectionCapability(xterm));
        addEvents = [];
        store.add(capability.onCommandFinished(e => addEvents.push(e)));
    });
    test('should not add commands when the cursor position is too close to the left side', async () => {
        assertCommands([]);
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
        await writeP(xterm, 'a');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
    });
    test('should add commands when the cursor position is not too close to the left side', async () => {
        assertCommands([]);
        await writeP(xterm, 'ab');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n\r\n');
        assertCommands([0]);
        await writeP(xterm, 'cd');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([0, 2]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL2NhcGFiaWxpdGllcy9wYXJ0aWFsQ29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDhGQUE4RixDQUFDO0FBQ2pKLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRSxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxLQUFlLENBQUM7SUFDcEIsSUFBSSxVQUE2QyxDQUFDO0lBQ2xELElBQUksU0FBb0IsQ0FBQztJQUV6QixTQUFTLGNBQWMsQ0FBQyxhQUF1QjtRQUM5QyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDckUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFlBQVksR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQWdDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUV6SCxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQWEsQ0FBQyxDQUFDO1FBQ3RGLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksaUNBQWlDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkIsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUIsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1QixjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakcsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1QixjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=