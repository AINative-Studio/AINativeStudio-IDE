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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3ZvaWNlQ2hhdEFjdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFaEcsS0FBSyxDQUFDLGtCQUFrQixFQUFFO0lBRXpCLFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxRQUE0QixFQUFFLE1BQWM7UUFDOUUsTUFBTSxHQUFHLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV4QyxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFFbEMsb0JBQW9CO1FBQ3BCLFdBQVcsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hELFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hELFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hELFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhELG1EQUFtRDtRQUNuRCxXQUFXLENBQUMsMkNBQTJDLEVBQUUsK0JBQStCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0YscURBQXFEO1FBQ3JELElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ2hGLE1BQU0sR0FBRyxXQUFXLENBQUMsMkNBQTJDLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3JHLE1BQU0sR0FBRyxXQUFXLENBQUMsa0RBQWtELEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQzdHLFdBQVcsQ0FBQyxrREFBa0QsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkYsc0JBQXNCO1FBQ3RCLE1BQU0sR0FBRyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM1RSxXQUFXLENBQUMsa0NBQWtDLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=