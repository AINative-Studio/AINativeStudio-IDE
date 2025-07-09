/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { bufferToReadable, VSBuffer } from '../../common/buffer.js';
import { CancellationTokenSource } from '../../common/cancellation.js';
import { consumeReadable, consumeStream, isReadable, isReadableBufferedStream, isReadableStream, listenStream, newWriteableStream, peekReadable, peekStream, prefixedReadable, prefixedStream, toReadable, toStream, transform } from '../../common/stream.js';
suite('Stream', () => {
    test('isReadable', () => {
        assert.ok(!isReadable(undefined));
        assert.ok(!isReadable(Object.create(null)));
        assert.ok(isReadable(bufferToReadable(VSBuffer.fromString(''))));
    });
    test('isReadableStream', () => {
        assert.ok(!isReadableStream(undefined));
        assert.ok(!isReadableStream(Object.create(null)));
        assert.ok(isReadableStream(newWriteableStream(d => d)));
    });
    test('isReadableBufferedStream', async () => {
        assert.ok(!isReadableBufferedStream(Object.create(null)));
        const stream = newWriteableStream(d => d);
        stream.end();
        const bufferedStream = await peekStream(stream, 1);
        assert.ok(isReadableBufferedStream(bufferedStream));
    });
    test('WriteableStream - basics', () => {
        const stream = newWriteableStream(strings => strings.join());
        let error = false;
        stream.on('error', e => {
            error = true;
        });
        let end = false;
        stream.on('end', () => {
            end = true;
        });
        stream.write('Hello');
        const chunks = [];
        stream.on('data', data => {
            chunks.push(data);
        });
        assert.strictEqual(chunks[0], 'Hello');
        stream.write('World');
        assert.strictEqual(chunks[1], 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.pause();
        stream.write('1');
        stream.write('2');
        stream.write('3');
        assert.strictEqual(chunks.length, 2);
        stream.resume();
        assert.strictEqual(chunks.length, 3);
        assert.strictEqual(chunks[2], '1,2,3');
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end('Final Bit');
        assert.strictEqual(chunks.length, 4);
        assert.strictEqual(chunks[3], 'Final Bit');
        assert.strictEqual(end, true);
        stream.destroy();
        stream.write('Unexpected');
        assert.strictEqual(chunks.length, 4);
    });
    test('stream with non-reducible messages', () => {
        /**
         * A complex object that cannot be reduced to a single object.
         */
        class TestMessage {
            constructor(value) {
                this.value = value;
            }
        }
        const stream = newWriteableStream(null);
        let error = false;
        stream.on('error', e => {
            error = true;
        });
        let end = false;
        stream.on('end', () => {
            end = true;
        });
        stream.write(new TestMessage('Hello'));
        const chunks = [];
        stream.on('data', data => {
            chunks.push(data);
        });
        assert(chunks[0] instanceof TestMessage, 'Message `0` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[0].value, 'Hello');
        stream.write(new TestMessage('World'));
        assert(chunks[1] instanceof TestMessage, 'Message `1` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[1].value, 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.pause();
        stream.write(new TestMessage('1'));
        stream.write(new TestMessage('2'));
        stream.write(new TestMessage('3'));
        assert.strictEqual(chunks.length, 2);
        stream.resume();
        assert.strictEqual(chunks.length, 5);
        assert(chunks[2] instanceof TestMessage, 'Message `2` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[2].value, '1');
        assert(chunks[3] instanceof TestMessage, 'Message `3` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[3].value, '2');
        assert(chunks[4] instanceof TestMessage, 'Message `4` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[4].value, '3');
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end(new TestMessage('Final Bit'));
        assert.strictEqual(chunks.length, 6);
        assert(chunks[5] instanceof TestMessage, 'Message `5` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[5].value, 'Final Bit');
        assert.strictEqual(end, true);
        stream.destroy();
        stream.write(new TestMessage('Unexpected'));
        assert.strictEqual(chunks.length, 6);
    });
    test('WriteableStream - end with empty string works', async () => {
        const reducer = (strings) => strings.length > 0 ? strings.join() : 'error';
        const stream = newWriteableStream(reducer);
        stream.end('');
        const result = await consumeStream(stream, reducer);
        assert.strictEqual(result, '');
    });
    test('WriteableStream - end with error works', async () => {
        const reducer = (errors) => errors[0];
        const stream = newWriteableStream(reducer);
        stream.end(new Error('error'));
        const result = await consumeStream(stream, reducer);
        assert.ok(result instanceof Error);
    });
    test('WriteableStream - removeListener', () => {
        const stream = newWriteableStream(strings => strings.join());
        let error = false;
        const errorListener = (e) => {
            error = true;
        };
        stream.on('error', errorListener);
        let data = false;
        const dataListener = () => {
            data = true;
        };
        stream.on('data', dataListener);
        stream.write('Hello');
        assert.strictEqual(data, true);
        data = false;
        stream.removeListener('data', dataListener);
        stream.write('World');
        assert.strictEqual(data, false);
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.removeListener('error', errorListener);
        // always leave at least one error listener to streams to avoid unexpected errors during test running
        stream.on('error', () => { });
        stream.error(new Error());
        assert.strictEqual(error, false);
    });
    test('WriteableStream - highWaterMark', async () => {
        const stream = newWriteableStream(strings => strings.join(), { highWaterMark: 3 });
        let res = stream.write('1');
        assert.ok(!res);
        res = stream.write('2');
        assert.ok(!res);
        res = stream.write('3');
        assert.ok(!res);
        const promise1 = stream.write('4');
        assert.ok(promise1 instanceof Promise);
        const promise2 = stream.write('5');
        assert.ok(promise2 instanceof Promise);
        let drained1 = false;
        (async () => {
            await promise1;
            drained1 = true;
        })();
        let drained2 = false;
        (async () => {
            await promise2;
            drained2 = true;
        })();
        let data = undefined;
        stream.on('data', chunk => {
            data = chunk;
        });
        assert.ok(data);
        await timeout(0);
        assert.strictEqual(drained1, true);
        assert.strictEqual(drained2, true);
    });
    test('consumeReadable', () => {
        const readable = arrayToReadable(['1', '2', '3', '4', '5']);
        const consumed = consumeReadable(readable, strings => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('peekReadable', () => {
        for (let i = 0; i < 5; i++) {
            const readable = arrayToReadable(['1', '2', '3', '4', '5']);
            const consumedOrReadable = peekReadable(readable, strings => strings.join(), i);
            if (typeof consumedOrReadable === 'string') {
                assert.fail('Unexpected result');
            }
            else {
                const consumed = consumeReadable(consumedOrReadable, strings => strings.join());
                assert.strictEqual(consumed, '1,2,3,4,5');
            }
        }
        let readable = arrayToReadable(['1', '2', '3', '4', '5']);
        let consumedOrReadable = peekReadable(readable, strings => strings.join(), 5);
        assert.strictEqual(consumedOrReadable, '1,2,3,4,5');
        readable = arrayToReadable(['1', '2', '3', '4', '5']);
        consumedOrReadable = peekReadable(readable, strings => strings.join(), 6);
        assert.strictEqual(consumedOrReadable, '1,2,3,4,5');
    });
    test('peekReadable - error handling', async () => {
        // 0 Chunks
        let stream = newWriteableStream(data => data);
        let error = undefined;
        let promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.error(new Error());
        await promise;
        assert.ok(error);
        // 1 Chunk
        stream = newWriteableStream(data => data);
        error = undefined;
        promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.write('foo');
        stream.error(new Error());
        await promise;
        assert.ok(error);
        // 2 Chunks
        stream = newWriteableStream(data => data);
        error = undefined;
        promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.write('foo');
        stream.write('bar');
        stream.error(new Error());
        await promise;
        assert.ok(!error);
        stream.on('error', err => error = err);
        stream.on('data', chunk => { });
        assert.ok(error);
    });
    function arrayToReadable(array) {
        return {
            read: () => array.shift() || null
        };
    }
    function readableToStream(readable) {
        const stream = newWriteableStream(strings => strings.join());
        // Simulate async behavior
        setTimeout(() => {
            let chunk = null;
            while ((chunk = readable.read()) !== null) {
                stream.write(chunk);
            }
            stream.end();
        }, 0);
        return stream;
    }
    test('consumeStream', async () => {
        const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        const consumed = await consumeStream(stream, strings => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('consumeStream - without reducer', async () => {
        const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        const consumed = await consumeStream(stream);
        assert.strictEqual(consumed, undefined);
    });
    test('consumeStream - without reducer and error', async () => {
        const stream = newWriteableStream(strings => strings.join());
        stream.error(new Error());
        const consumed = await consumeStream(stream);
        assert.strictEqual(consumed, undefined);
    });
    test('listenStream', () => {
        const stream = newWriteableStream(strings => strings.join());
        let error = false;
        let end = false;
        let data = '';
        listenStream(stream, {
            onData: d => {
                data = d;
            },
            onError: e => {
                error = true;
            },
            onEnd: () => {
                end = true;
            }
        });
        stream.write('Hello');
        assert.strictEqual(data, 'Hello');
        stream.write('World');
        assert.strictEqual(data, 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end('Final Bit');
        assert.strictEqual(end, true);
    });
    test('listenStream - cancellation', () => {
        const stream = newWriteableStream(strings => strings.join());
        let error = false;
        let end = false;
        let data = '';
        const cts = new CancellationTokenSource();
        listenStream(stream, {
            onData: d => {
                data = d;
            },
            onError: e => {
                error = true;
            },
            onEnd: () => {
                end = true;
            }
        }, cts.token);
        cts.cancel();
        stream.write('Hello');
        assert.strictEqual(data, '');
        stream.write('World');
        assert.strictEqual(data, '');
        stream.error(new Error());
        assert.strictEqual(error, false);
        stream.end('Final Bit');
        assert.strictEqual(end, false);
    });
    test('peekStream', async () => {
        for (let i = 0; i < 5; i++) {
            const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
            const result = await peekStream(stream, i);
            assert.strictEqual(stream, result.stream);
            if (result.ended) {
                assert.fail('Unexpected result, stream should not have ended yet');
            }
            else {
                assert.strictEqual(result.buffer.length, i + 1, `maxChunks: ${i}`);
                const additionalResult = [];
                await consumeStream(stream, strings => {
                    additionalResult.push(...strings);
                    return strings.join();
                });
                assert.strictEqual([...result.buffer, ...additionalResult].join(), '1,2,3,4,5');
            }
        }
        let stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        let result = await peekStream(stream, 5);
        assert.strictEqual(stream, result.stream);
        assert.strictEqual(result.buffer.join(), '1,2,3,4,5');
        assert.strictEqual(result.ended, true);
        stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        result = await peekStream(stream, 6);
        assert.strictEqual(stream, result.stream);
        assert.strictEqual(result.buffer.join(), '1,2,3,4,5');
        assert.strictEqual(result.ended, true);
    });
    test('toStream', async () => {
        const stream = toStream('1,2,3,4,5', strings => strings.join());
        const consumed = await consumeStream(stream, strings => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('toReadable', async () => {
        const readable = toReadable('1,2,3,4,5');
        const consumed = consumeReadable(readable, strings => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('transform', async () => {
        const source = newWriteableStream(strings => strings.join());
        const result = transform(source, { data: string => string + string }, strings => strings.join());
        // Simulate async behavior
        setTimeout(() => {
            source.write('1');
            source.write('2');
            source.write('3');
            source.write('4');
            source.end('5');
        }, 0);
        const consumed = await consumeStream(result, strings => strings.join());
        assert.strictEqual(consumed, '11,22,33,44,55');
    });
    test('events are delivered even if a listener is removed during delivery', () => {
        const stream = newWriteableStream(strings => strings.join());
        let listener1Called = false;
        let listener2Called = false;
        const listener1 = () => { stream.removeListener('end', listener1); listener1Called = true; };
        const listener2 = () => { listener2Called = true; };
        stream.on('end', listener1);
        stream.on('end', listener2);
        stream.on('data', () => { });
        stream.end('');
        assert.strictEqual(listener1Called, true);
        assert.strictEqual(listener2Called, true);
    });
    test('prefixedReadable', () => {
        // Basic
        let readable = prefixedReadable('1,2', arrayToReadable(['3', '4', '5']), val => val.join(','));
        assert.strictEqual(consumeReadable(readable, val => val.join(',')), '1,2,3,4,5');
        // Empty
        readable = prefixedReadable('empty', arrayToReadable([]), val => val.join(','));
        assert.strictEqual(consumeReadable(readable, val => val.join(',')), 'empty');
    });
    test('prefixedStream', async () => {
        // Basic
        let stream = newWriteableStream(strings => strings.join());
        stream.write('3');
        stream.write('4');
        stream.write('5');
        stream.end();
        let prefixStream = prefixedStream('1,2', stream, val => val.join(','));
        assert.strictEqual(await consumeStream(prefixStream, val => val.join(',')), '1,2,3,4,5');
        // Empty
        stream = newWriteableStream(strings => strings.join());
        stream.end();
        prefixStream = prefixedStream('1,2', stream, val => val.join(','));
        assert.strictEqual(await consumeStream(prefixStream, val => val.join(',')), '1,2');
        // Error
        stream = newWriteableStream(strings => strings.join());
        stream.error(new Error('fail'));
        prefixStream = prefixedStream('error', stream, val => val.join(','));
        let error;
        try {
            await consumeStream(prefixStream, val => val.join(','));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9zdHJlYW0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBNEIsVUFBVSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV6UixLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUVwQixJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxD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