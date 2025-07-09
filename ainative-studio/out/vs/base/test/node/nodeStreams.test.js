/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Writable } from 'stream';
import assert from 'assert';
import { StreamSplitter } from '../../node/nodeStreams.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('StreamSplitter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should split a stream on a single character splitter', (done) => {
        const chunks = [];
        const splitter = new StreamSplitter('\n');
        const writable = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk.toString());
                callback();
            },
        });
        splitter.pipe(writable);
        splitter.write('hello\nwor');
        splitter.write('ld\n');
        splitter.write('foo\nbar\nz');
        splitter.end(() => {
            assert.deepStrictEqual(chunks, ['hello\n', 'world\n', 'foo\n', 'bar\n', 'z']);
            done();
        });
    });
    test('should split a stream on a multi-character splitter', (done) => {
        const chunks = [];
        const splitter = new StreamSplitter('---');
        const writable = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk.toString());
                callback();
            },
        });
        splitter.pipe(writable);
        splitter.write('hello---wor');
        splitter.write('ld---');
        splitter.write('foo---bar---z');
        splitter.end(() => {
            assert.deepStrictEqual(chunks, ['hello---', 'world---', 'foo---', 'bar---', 'z']);
            done();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVN0cmVhbXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9ub2RlU3RyZWFtcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDbEMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3RSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDckUsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzdCLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVE7Z0JBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQzlCLFFBQVEsRUFBRSxDQUFDO1lBQ1osQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3QixRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZCLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDOUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM5RSxJQUFJLEVBQUUsQ0FBQztRQUNSLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNwRSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDN0IsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsUUFBUTtnQkFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDOUIsUUFBUSxFQUFFLENBQUM7WUFDWixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzlCLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNoQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLElBQUksRUFBRSxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=