/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { parseNextChatResponseChunk } from '../../electron-sandbox/actions/voiceChatActions.js';
suite('VoiceChatActions', function () {
    function assertChunk(text, expected, offset) {
        const res = parseNextChatResponseChunk(text, offset);
        assert.strictEqual(res.chunk, expected);
        return res;
    }
    test('parseNextChatResponseChunk', function () {
        // Simple, no offset
        assertChunk('Hello World', undefined, 0);
        assertChunk('Hello World.', undefined, 0);
        assertChunk('Hello World. ', 'Hello World.', 0);
        assertChunk('Hello World? ', 'Hello World?', 0);
        assertChunk('Hello World! ', 'Hello World!', 0);
        assertChunk('Hello World: ', 'Hello World:', 0);
        // Ensure chunks are parsed from the end, no offset
        assertChunk('Hello World. How is your day? And more...', 'Hello World. How is your day?', 0);
        // Ensure chunks are parsed from the end, with offset
        let offset = assertChunk('Hello World. How is your ', 'Hello World.', 0).offset;
        offset = assertChunk('Hello World. How is your day? And more...', 'How is your day?', offset).offset;
        offset = assertChunk('Hello World. How is your day? And more to come! ', 'And more to come!', offset).offset;
        assertChunk('Hello World. How is your day? And more to come! ', undefined, offset);
        // Sparted by newlines
        offset = assertChunk('Hello World.\nHow is your', 'Hello World.', 0).offset;
        assertChunk('Hello World.\nHow is your day?\n', 'How is your day?', offset);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2VsZWN0cm9uLXNhbmRib3gvdm9pY2VDaGF0QWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoRyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFFekIsU0FBUyxXQUFXLENBQUMsSUFBWSxFQUFFLFFBQTRCLEVBQUUsTUFBYztRQUM5RSxNQUFNLEdBQUcsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXhDLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELElBQUksQ0FBQyw0QkFBNEIsRUFBRTtRQUVsQyxvQkFBb0I7UUFDcEIsV0FBVyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsV0FBVyxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFaEQsbURBQW1EO1FBQ25ELFdBQVcsQ0FBQywyQ0FBMkMsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RixxREFBcUQ7UUFDckQsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDaEYsTUFBTSxHQUFHLFdBQVcsQ0FBQywyQ0FBMkMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDckcsTUFBTSxHQUFHLFdBQVcsQ0FBQyxrREFBa0QsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDN0csV0FBVyxDQUFDLGtEQUFrRCxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVuRixzQkFBc0I7UUFDdEIsTUFBTSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQzVFLFdBQVcsQ0FBQyxrQ0FBa0MsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==