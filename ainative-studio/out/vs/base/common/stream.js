/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from './errors.js';
import { DisposableStore, toDisposable } from './lifecycle.js';
export function isReadable(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return typeof candidate.read === 'function';
}
export function isReadableStream(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return [candidate.on, candidate.pause, candidate.resume, candidate.destroy].every(fn => typeof fn === 'function');
}
export function isReadableBufferedStream(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return isReadableStream(candidate.stream) && Array.isArray(candidate.buffer) && typeof candidate.ended === 'boolean';
}
export function newWriteableStream(reducer, options) {
    return new WriteableStreamImpl(reducer, options);
}
class WriteableStreamImpl {
    /**
     * @param reducer a function that reduces the buffered data into a single object;
     * 				  because some objects can be complex and non-reducible, we also
     * 				  allow passing the explicit `null` value to skip the reduce step
     * @param options stream options
     */
    constructor(reducer, options) {
        this.reducer = reducer;
        this.options = options;
        this.state = {
            flowing: false,
            ended: false,
            destroyed: false
        };
        this.buffer = {
            data: [],
            error: []
        };
        this.listeners = {
            data: [],
            error: [],
            end: []
        };
        this.pendingWritePromises = [];
    }
    pause() {
        if (this.state.destroyed) {
            return;
        }
        this.state.flowing = false;
    }
    resume() {
        if (this.state.destroyed) {
            return;
        }
        if (!this.state.flowing) {
            this.state.flowing = true;
            // emit buffered events
            this.flowData();
            this.flowErrors();
            this.flowEnd();
        }
    }
    write(data) {
        if (this.state.destroyed) {
            return;
        }
        // flowing: directly send the data to listeners
        if (this.state.flowing) {
            this.emitData(data);
        }
        // not yet flowing: buffer data until flowing
        else {
            this.buffer.data.push(data);
            // highWaterMark: if configured, signal back when buffer reached limits
            if (typeof this.options?.highWaterMark === 'number' && this.buffer.data.length > this.options.highWaterMark) {
                return new Promise(resolve => this.pendingWritePromises.push(resolve));
            }
        }
    }
    error(error) {
        if (this.state.destroyed) {
            return;
        }
        // flowing: directly send the error to listeners
        if (this.state.flowing) {
            this.emitError(error);
        }
        // not yet flowing: buffer errors until flowing
        else {
            this.buffer.error.push(error);
        }
    }
    end(result) {
        if (this.state.destroyed) {
            return;
        }
        // end with data if provided
        if (typeof result !== 'undefined') {
            this.write(result);
        }
        // flowing: send end event to listeners
        if (this.state.flowing) {
            this.emitEnd();
            this.destroy();
        }
        // not yet flowing: remember state
        else {
            this.state.ended = true;
        }
    }
    emitData(data) {
        this.listeners.data.slice(0).forEach(listener => listener(data)); // slice to avoid listener mutation from delivering event
    }
    emitError(error) {
        if (this.listeners.error.length === 0) {
            onUnexpectedError(error); // nobody listened to this error so we log it as unexpected
        }
        else {
            this.listeners.error.slice(0).forEach(listener => listener(error)); // slice to avoid listener mutation from delivering event
        }
    }
    emitEnd() {
        this.listeners.end.slice(0).forEach(listener => listener()); // slice to avoid listener mutation from delivering event
    }
    on(event, callback) {
        if (this.state.destroyed) {
            return;
        }
        switch (event) {
            case 'data':
                this.listeners.data.push(callback);
                // switch into flowing mode as soon as the first 'data'
                // listener is added and we are not yet in flowing mode
                this.resume();
                break;
            case 'end':
                this.listeners.end.push(callback);
                // emit 'end' event directly if we are flowing
                // and the end has already been reached
                //
                // finish() when it went through
                if (this.state.flowing && this.flowEnd()) {
                    this.destroy();
                }
                break;
            case 'error':
                this.listeners.error.push(callback);
                // emit buffered 'error' events unless done already
                // now that we know that we have at least one listener
                if (this.state.flowing) {
                    this.flowErrors();
                }
                break;
        }
    }
    removeListener(event, callback) {
        if (this.state.destroyed) {
            return;
        }
        let listeners = undefined;
        switch (event) {
            case 'data':
                listeners = this.listeners.data;
                break;
            case 'end':
                listeners = this.listeners.end;
                break;
            case 'error':
                listeners = this.listeners.error;
                break;
        }
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    flowData() {
        // if buffer is empty, nothing to do
        if (this.buffer.data.length === 0) {
            return;
        }
        // if buffer data can be reduced into a single object,
        // emit the reduced data
        if (typeof this.reducer === 'function') {
            const fullDataBuffer = this.reducer(this.buffer.data);
            this.emitData(fullDataBuffer);
        }
        else {
            // otherwise emit each buffered data instance individually
            for (const data of this.buffer.data) {
                this.emitData(data);
            }
        }
        this.buffer.data.length = 0;
        // when the buffer is empty, resolve all pending writers
        const pendingWritePromises = [...this.pendingWritePromises];
        this.pendingWritePromises.length = 0;
        pendingWritePromises.forEach(pendingWritePromise => pendingWritePromise());
    }
    flowErrors() {
        if (this.listeners.error.length > 0) {
            for (const error of this.buffer.error) {
                this.emitError(error);
            }
            this.buffer.error.length = 0;
        }
    }
    flowEnd() {
        if (this.state.ended) {
            this.emitEnd();
            return this.listeners.end.length > 0;
        }
        return false;
    }
    destroy() {
        if (!this.state.destroyed) {
            this.state.destroyed = true;
            this.state.ended = true;
            this.buffer.data.length = 0;
            this.buffer.error.length = 0;
            this.listeners.data.length = 0;
            this.listeners.error.length = 0;
            this.listeners.end.length = 0;
            this.pendingWritePromises.length = 0;
        }
    }
}
/**
 * Helper to fully read a T readable into a T.
 */
export function consumeReadable(readable, reducer) {
    const chunks = [];
    let chunk;
    while ((chunk = readable.read()) !== null) {
        chunks.push(chunk);
    }
    return reducer(chunks);
}
/**
 * Helper to read a T readable up to a maximum of chunks. If the limit is
 * reached, will return a readable instead to ensure all data can still
 * be read.
 */
export function peekReadable(readable, reducer, maxChunks) {
    const chunks = [];
    let chunk = undefined;
    while ((chunk = readable.read()) !== null && chunks.length < maxChunks) {
        chunks.push(chunk);
    }
    // If the last chunk is null, it means we reached the end of
    // the readable and return all the data at once
    if (chunk === null && chunks.length > 0) {
        return reducer(chunks);
    }
    // Otherwise, we still have a chunk, it means we reached the maxChunks
    // value and as such we return a new Readable that first returns
    // the existing read chunks and then continues with reading from
    // the underlying readable.
    return {
        read: () => {
            // First consume chunks from our array
            if (chunks.length > 0) {
                return chunks.shift();
            }
            // Then ensure to return our last read chunk
            if (typeof chunk !== 'undefined') {
                const lastReadChunk = chunk;
                // explicitly use undefined here to indicate that we consumed
                // the chunk, which could have either been null or valued.
                chunk = undefined;
                return lastReadChunk;
            }
            // Finally delegate back to the Readable
            return readable.read();
        }
    };
}
export function consumeStream(stream, reducer) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        listenStream(stream, {
            onData: chunk => {
                if (reducer) {
                    chunks.push(chunk);
                }
            },
            onError: error => {
                if (reducer) {
                    reject(error);
                }
                else {
                    resolve(undefined);
                }
            },
            onEnd: () => {
                if (reducer) {
                    resolve(reducer(chunks));
                }
                else {
                    resolve(undefined);
                }
            }
        });
    });
}
/**
 * Helper to listen to all events of a T stream in proper order.
 */
export function listenStream(stream, listener, token) {
    stream.on('error', error => {
        if (!token?.isCancellationRequested) {
            listener.onError(error);
        }
    });
    stream.on('end', () => {
        if (!token?.isCancellationRequested) {
            listener.onEnd();
        }
    });
    // Adding the `data` listener will turn the stream
    // into flowing mode. As such it is important to
    // add this listener last (DO NOT CHANGE!)
    stream.on('data', data => {
        if (!token?.isCancellationRequested) {
            listener.onData(data);
        }
    });
}
/**
 * Helper to peek up to `maxChunks` into a stream. The return type signals if
 * the stream has ended or not. If not, caller needs to add a `data` listener
 * to continue reading.
 */
export function peekStream(stream, maxChunks) {
    return new Promise((resolve, reject) => {
        const streamListeners = new DisposableStore();
        const buffer = [];
        // Data Listener
        const dataListener = (chunk) => {
            // Add to buffer
            buffer.push(chunk);
            // We reached maxChunks and thus need to return
            if (buffer.length > maxChunks) {
                // Dispose any listeners and ensure to pause the
                // stream so that it can be consumed again by caller
                streamListeners.dispose();
                stream.pause();
                return resolve({ stream, buffer, ended: false });
            }
        };
        // Error Listener
        const errorListener = (error) => {
            streamListeners.dispose();
            return reject(error);
        };
        // End Listener
        const endListener = () => {
            streamListeners.dispose();
            return resolve({ stream, buffer, ended: true });
        };
        streamListeners.add(toDisposable(() => stream.removeListener('error', errorListener)));
        stream.on('error', errorListener);
        streamListeners.add(toDisposable(() => stream.removeListener('end', endListener)));
        stream.on('end', endListener);
        // Important: leave the `data` listener last because
        // this can turn the stream into flowing mode and we
        // want `error` events to be received as well.
        streamListeners.add(toDisposable(() => stream.removeListener('data', dataListener)));
        stream.on('data', dataListener);
    });
}
/**
 * Helper to create a readable stream from an existing T.
 */
export function toStream(t, reducer) {
    const stream = newWriteableStream(reducer);
    stream.end(t);
    return stream;
}
/**
 * Helper to create an empty stream
 */
export function emptyStream() {
    const stream = newWriteableStream(() => { throw new Error('not supported'); });
    stream.end();
    return stream;
}
/**
 * Helper to convert a T into a Readable<T>.
 */
export function toReadable(t) {
    let consumed = false;
    return {
        read: () => {
            if (consumed) {
                return null;
            }
            consumed = true;
            return t;
        }
    };
}
/**
 * Helper to transform a readable stream into another stream.
 */
export function transform(stream, transformer, reducer) {
    const target = newWriteableStream(reducer);
    listenStream(stream, {
        onData: data => target.write(transformer.data(data)),
        onError: error => target.error(transformer.error ? transformer.error(error) : error),
        onEnd: () => target.end()
    });
    return target;
}
/**
 * Helper to take an existing readable that will
 * have a prefix injected to the beginning.
 */
export function prefixedReadable(prefix, readable, reducer) {
    let prefixHandled = false;
    return {
        read: () => {
            const chunk = readable.read();
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                // If we have also a read-result, make
                // sure to reduce it to a single result
                if (chunk !== null) {
                    return reducer([prefix, chunk]);
                }
                // Otherwise, just return prefix directly
                return prefix;
            }
            return chunk;
        }
    };
}
/**
 * Helper to take an existing stream that will
 * have a prefix injected to the beginning.
 */
export function prefixedStream(prefix, stream, reducer) {
    let prefixHandled = false;
    const target = newWriteableStream(reducer);
    listenStream(stream, {
        onData: data => {
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                return target.write(reducer([prefix, data]));
            }
            return target.write(data);
        },
        onError: error => target.error(error),
        onEnd: () => {
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                target.write(prefix);
            }
            target.end();
        }
    });
    return target;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3N0cmVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQTJFL0QsTUFBTSxVQUFVLFVBQVUsQ0FBSSxHQUFZO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLEdBQThCLENBQUM7SUFDakQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztBQUM3QyxDQUFDO0FBZ0VELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBSSxHQUFZO0lBQy9DLE1BQU0sU0FBUyxHQUFHLEdBQW9DLENBQUM7SUFDdkQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssVUFBVSxDQUFDLENBQUM7QUFDbkgsQ0FBQztBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FBSSxHQUFZO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLEdBQTRDLENBQUM7SUFDL0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sU0FBUyxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUM7QUFDdEgsQ0FBQztBQW1CRCxNQUFNLFVBQVUsa0JBQWtCLENBQUksT0FBMkIsRUFBRSxPQUFnQztJQUNsRyxPQUFPLElBQUksbUJBQW1CLENBQUksT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFZRCxNQUFNLG1CQUFtQjtJQXFCeEI7Ozs7O09BS0c7SUFDSCxZQUFvQixPQUEyQixFQUFVLE9BQWdDO1FBQXJFLFlBQU8sR0FBUCxPQUFPLENBQW9CO1FBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUF6QnhFLFVBQUssR0FBRztZQUN4QixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxLQUFLO1lBQ1osU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQztRQUVlLFdBQU0sR0FBRztZQUN6QixJQUFJLEVBQUUsRUFBUztZQUNmLEtBQUssRUFBRSxFQUFhO1NBQ3BCLENBQUM7UUFFZSxjQUFTLEdBQUc7WUFDNUIsSUFBSSxFQUFFLEVBQTJCO1lBQ2pDLEtBQUssRUFBRSxFQUFnQztZQUN2QyxHQUFHLEVBQUUsRUFBb0I7U0FDekIsQ0FBQztRQUVlLHlCQUFvQixHQUFlLEVBQUUsQ0FBQztJQVFzQyxDQUFDO0lBRTlGLEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFFMUIsdUJBQXVCO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQU87UUFDWixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUVELDZDQUE2QzthQUN4QyxDQUFDO1lBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTVCLHVFQUF1RTtZQUN2RSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM3RyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFZO1FBQ2pCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUVELGdEQUFnRDtRQUNoRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBRUQsK0NBQStDO2FBQzFDLENBQUM7WUFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxHQUFHLENBQUMsTUFBVTtRQUNiLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRWYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxrQ0FBa0M7YUFDN0IsQ0FBQztZQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFPO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLHlEQUF5RDtJQUM1SCxDQUFDO0lBRU8sU0FBUyxDQUFDLEtBQVk7UUFDN0IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywyREFBMkQ7UUFDdEYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyx5REFBeUQ7UUFDOUgsQ0FBQztJQUNGLENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyx5REFBeUQ7SUFDdkgsQ0FBQztJQUtELEVBQUUsQ0FBQyxLQUErQixFQUFFLFFBQThCO1FBQ2pFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUVELFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLE1BQU07Z0JBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUVuQyx1REFBdUQ7Z0JBQ3ZELHVEQUF1RDtnQkFDdkQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUVkLE1BQU07WUFFUCxLQUFLLEtBQUs7Z0JBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUVsQyw4Q0FBOEM7Z0JBQzlDLHVDQUF1QztnQkFDdkMsRUFBRTtnQkFDRixnQ0FBZ0M7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQzFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsQ0FBQztnQkFFRCxNQUFNO1lBRVAsS0FBSyxPQUFPO2dCQUNYLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFcEMsbURBQW1EO2dCQUNuRCxzREFBc0Q7Z0JBQ3RELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNuQixDQUFDO2dCQUVELE1BQU07UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUFhLEVBQUUsUUFBa0I7UUFDL0MsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQTBCLFNBQVMsQ0FBQztRQUVqRCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNO2dCQUNWLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDaEMsTUFBTTtZQUVQLEtBQUssS0FBSztnQkFDVCxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7Z0JBQy9CLE1BQU07WUFFUCxLQUFLLE9BQU87Z0JBQ1gsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO2dCQUNqQyxNQUFNO1FBQ1IsQ0FBQztRQUVELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQixTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxRQUFRO1FBQ2Ysb0NBQW9DO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU87UUFDUixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELHdCQUF3QjtRQUN4QixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN4QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLDBEQUEwRDtZQUMxRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRTVCLHdEQUF3RDtRQUN4RCxNQUFNLG9CQUFvQixHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNyQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU8sVUFBVTtRQUNqQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUVmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUM1QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFFeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBRTlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUksUUFBcUIsRUFBRSxPQUFvQjtJQUM3RSxNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7SUFFdkIsSUFBSSxLQUFlLENBQUM7SUFDcEIsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUMzQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUksUUFBcUIsRUFBRSxPQUFvQixFQUFFLFNBQWlCO0lBQzdGLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUV2QixJQUFJLEtBQUssR0FBeUIsU0FBUyxDQUFDO0lBQzVDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFDeEUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsNERBQTREO0lBQzVELCtDQUErQztJQUMvQyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsc0VBQXNFO0lBQ3RFLGdFQUFnRTtJQUNoRSxnRUFBZ0U7SUFDaEUsMkJBQTJCO0lBQzNCLE9BQU87UUFDTixJQUFJLEVBQUUsR0FBRyxFQUFFO1lBRVYsc0NBQXNDO1lBQ3RDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxNQUFNLENBQUMsS0FBSyxFQUFHLENBQUM7WUFDeEIsQ0FBQztZQUVELDRDQUE0QztZQUM1QyxJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUM7Z0JBRTVCLDZEQUE2RDtnQkFDN0QsMERBQTBEO2dCQUMxRCxLQUFLLEdBQUcsU0FBUyxDQUFDO2dCQUVsQixPQUFPLGFBQWEsQ0FBQztZQUN0QixDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLENBQUM7S0FDRCxDQUFDO0FBQ0gsQ0FBQztBQVNELE1BQU0sVUFBVSxhQUFhLENBQVcsTUFBK0IsRUFBRSxPQUF3QjtJQUNoRyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztRQUV2QixZQUFZLENBQUMsTUFBTSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDZixJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNoQixJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDZixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztZQUNELEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ1gsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBdUJEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBSSxNQUErQixFQUFFLFFBQTRCLEVBQUUsS0FBeUI7SUFFdkgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7UUFDMUIsSUFBSSxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztZQUNyQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsa0RBQWtEO0lBQ2xELGdEQUFnRDtJQUNoRCwwQ0FBMEM7SUFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDeEIsSUFBSSxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFJLE1BQXlCLEVBQUUsU0FBaUI7SUFDekUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztRQUV2QixnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFRLEVBQUUsRUFBRTtZQUVqQyxnQkFBZ0I7WUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVuQiwrQ0FBK0M7WUFDL0MsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRSxDQUFDO2dCQUUvQixnREFBZ0Q7Z0JBQ2hELG9EQUFvRDtnQkFDcEQsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMxQixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBRWYsT0FBTyxPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixpQkFBaUI7UUFDakIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFZLEVBQUUsRUFBRTtZQUN0QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFMUIsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDO1FBRUYsZUFBZTtRQUNmLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUN4QixlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFMUIsT0FBTyxPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQztRQUVGLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVsQyxlQUFlLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUIsb0RBQW9EO1FBQ3BELG9EQUFvRDtRQUNwRCw4Q0FBOEM7UUFDOUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBSSxDQUFJLEVBQUUsT0FBb0I7SUFDckQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUksT0FBTyxDQUFDLENBQUM7SUFFOUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVkLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFdBQVc7SUFDMUIsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQVEsR0FBRyxFQUFFLEdBQUcsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUViLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBSSxDQUFJO0lBQ2pDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztJQUVyQixPQUFPO1FBQ04sSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUNWLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsUUFBUSxHQUFHLElBQUksQ0FBQztZQUVoQixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7S0FDRCxDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFNBQVMsQ0FBd0IsTUFBc0MsRUFBRSxXQUFnRCxFQUFFLE9BQThCO0lBQ3hLLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFjLE9BQU8sQ0FBQyxDQUFDO0lBRXhELFlBQVksQ0FBQyxNQUFNLEVBQUU7UUFDcEIsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BELE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3BGLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO0tBQ3pCLENBQUMsQ0FBQztJQUVILE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBSSxNQUFTLEVBQUUsUUFBcUIsRUFBRSxPQUFvQjtJQUN6RixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFFMUIsT0FBTztRQUNOLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDVixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFOUIsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIsYUFBYSxHQUFHLElBQUksQ0FBQztnQkFFckIsc0NBQXNDO2dCQUN0Qyx1Q0FBdUM7Z0JBQ3ZDLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNwQixPQUFPLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO2dCQUVELHlDQUF5QztnQkFDekMsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFJLE1BQVMsRUFBRSxNQUF5QixFQUFFLE9BQW9CO0lBQzNGLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztJQUUxQixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBSSxPQUFPLENBQUMsQ0FBQztJQUU5QyxZQUFZLENBQUMsTUFBTSxFQUFFO1FBQ3BCLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtZQUVkLDBCQUEwQjtZQUMxQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBRXJCLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUNELE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3JDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFFWCwwQkFBMEI7WUFDMUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUVyQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDZCxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIn0=