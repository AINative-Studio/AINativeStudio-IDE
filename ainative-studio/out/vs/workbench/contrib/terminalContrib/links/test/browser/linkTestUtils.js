/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
export async function assertLinkHelper(text, expected, detector, expectedType) {
    detector.xterm.reset();
    // Write the text and wait for the parser to finish
    await new Promise(r => detector.xterm.write(text, r));
    const textSplit = text.split('\r\n');
    const lastLineIndex = textSplit.filter((e, i) => i !== textSplit.length - 1).reduce((p, c) => {
        return p + Math.max(Math.ceil(c.length / 80), 1);
    }, 0);
    // Ensure all links are provided
    const lines = [];
    for (let i = 0; i < detector.xterm.buffer.active.cursorY + 1; i++) {
        lines.push(detector.xterm.buffer.active.getLine(i));
    }
    // Detect links always on the last line with content
    const actualLinks = (await detector.detect(lines, lastLineIndex, detector.xterm.buffer.active.cursorY)).map(e => {
        return {
            link: e.uri?.toString() ?? e.text,
            type: expectedType,
            bufferRange: e.bufferRange
        };
    });
    const expectedLinks = expected.map(e => {
        return {
            type: expectedType,
            link: 'uri' in e ? e.uri.toString() : e.text,
            bufferRange: {
                start: { x: e.range[0][0], y: e.range[0][1] },
                end: { x: e.range[1][0], y: e.range[1][1] },
            }
        };
    });
    deepStrictEqual(actualLinks, expectedLinks);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua1Rlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL2xpbmtUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUt6QyxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNyQyxJQUFZLEVBQ1osUUFBbUcsRUFDbkcsUUFBK0IsRUFDL0IsWUFBOEI7SUFFOUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUV2QixtREFBbUQ7SUFDbkQsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckMsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1RixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFTixnQ0FBZ0M7SUFDaEMsTUFBTSxLQUFLLEdBQWtCLEVBQUUsQ0FBQztJQUNoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNuRSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQy9HLE9BQU87WUFDTixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSTtZQUNqQyxJQUFJLEVBQUUsWUFBWTtZQUNsQixXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVc7U0FDMUIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUN0QyxPQUFPO1lBQ04sSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQzVDLFdBQVcsRUFBRTtnQkFDWixLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDN0MsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDM0M7U0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxlQUFlLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzdDLENBQUMifQ==