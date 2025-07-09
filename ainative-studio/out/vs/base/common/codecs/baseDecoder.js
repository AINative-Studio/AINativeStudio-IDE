/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../assert.js';
import { Emitter } from '../event.js';
import { DeferredPromise } from '../async.js';
import { AsyncDecoder } from './asyncDecoder.js';
import { ObservableDisposable } from '../observableDisposable.js';
/**
 * Base decoder class that can be used to convert stream messages data type
 * from one type to another. For instance, a stream of binary data can be
 * "decoded" into a stream of well defined objects.
 * Intended to be a part of "codec" implementation rather than used directly.
 */
export class BaseDecoder extends ObservableDisposable {
    /**
     * @param stream The input stream to decode.
     */
    constructor(stream) {
        super();
        this.stream = stream;
        /**
         * Private attribute to track if the stream has ended.
         */
        this._ended = false;
        this._onData = this._register(new Emitter());
        this._onEnd = this._register(new Emitter());
        this._onError = this._register(new Emitter());
        /**
         * A store of currently registered event listeners.
         */
        this._listeners = new Map();
        /**
         * Private attribute to track if the stream has started.
         */
        this.started = false;
        /**
         * Promise that resolves when the stream has ended, either by
         * receiving the `end` event or by a disposal, but not when
         * the `error` event is received alone.
         */
        this.settledPromise = new DeferredPromise();
        this.tryOnStreamData = this.tryOnStreamData.bind(this);
        this.onStreamError = this.onStreamError.bind(this);
        this.onStreamEnd = this.onStreamEnd.bind(this);
    }
    /**
     * Promise that resolves when the stream has ended, either by
     * receiving the `end` event or by a disposal, but not when
     * the `error` event is received alone.
     *
     * @throws If the stream was not yet started to prevent this
     * 		   promise to block the consumer calls indefinitely.
     */
    get settled() {
        // if the stream has not started yet, the promise might
        // block the consumer calls indefinitely if they forget
        // to call the `start()` method, or if the call happens
        // after await on the `settled` promise; to forbid this
        // confusion, we require the stream to be started first
        assert(this.started, [
            'Cannot get `settled` promise of a stream that has not been started.',
            'Please call `start()` first.',
        ].join(' '));
        return this.settledPromise.p;
    }
    /**
     * Start receiving data from the stream.
     * @throws if the decoder stream has already ended.
     */
    start() {
        assert(!this._ended, 'Cannot start stream that has already ended.');
        assert(!this.disposed, 'Cannot start stream that has already disposed.');
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        this.stream.on('data', this.tryOnStreamData);
        this.stream.on('error', this.onStreamError);
        this.stream.on('end', this.onStreamEnd);
        // this allows to compose decoders together, - if a decoder
        // instance is passed as a readable stream to this decoder,
        // then we need to call `start` on it too
        if (this.stream instanceof BaseDecoder) {
            this.stream.start();
        }
        return this;
    }
    /**
     * Check if the decoder has been ended hence has
     * no more data to produce.
     */
    get ended() {
        return this._ended;
    }
    /**
     * Automatically catch and dispatch errors thrown inside `onStreamData`.
     */
    tryOnStreamData(data) {
        try {
            this.onStreamData(data);
        }
        catch (error) {
            this.onStreamError(error);
        }
    }
    on(event, callback) {
        if (event === 'data') {
            return this.onData(callback);
        }
        if (event === 'error') {
            return this.onError(callback);
        }
        if (event === 'end') {
            return this.onEnd(callback);
        }
        throw new Error(`Invalid event name: ${event}`);
    }
    /**
     * Add listener for the `data` event.
     * @throws if the decoder stream has already ended.
     */
    onData(callback) {
        assert(!this.ended, 'Cannot subscribe to the `data` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('data');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('data', currentListeners);
        }
        currentListeners.set(callback, this._onData.event(callback));
    }
    /**
     * Add listener for the `error` event.
     * @throws if the decoder stream has already ended.
     */
    onError(callback) {
        assert(!this.ended, 'Cannot subscribe to the `error` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('error');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('error', currentListeners);
        }
        currentListeners.set(callback, this._onError.event(callback));
    }
    /**
     * Add listener for the `end` event.
     * @throws if the decoder stream has already ended.
     */
    onEnd(callback) {
        assert(!this.ended, 'Cannot subscribe to the `end` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('end');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('end', currentListeners);
        }
        currentListeners.set(callback, this._onEnd.event(callback));
    }
    /**
     * Remove all existing event listeners.
     */
    removeAllListeners() {
        // remove listeners set up by this class
        this.stream.removeListener('data', this.tryOnStreamData);
        this.stream.removeListener('error', this.onStreamError);
        this.stream.removeListener('end', this.onStreamEnd);
        // remove listeners set up by external consumers
        for (const [name, listeners] of this._listeners.entries()) {
            this._listeners.delete(name);
            for (const [listener, disposable] of listeners) {
                disposable.dispose();
                listeners.delete(listener);
            }
        }
    }
    /**
     * Pauses the stream.
     */
    pause() {
        this.stream.pause();
    }
    /**
     * Resumes the stream if it has been paused.
     * @throws if the decoder stream has already ended.
     */
    resume() {
        assert(!this.ended, 'Cannot resume the stream because it has already ended.');
        this.stream.resume();
    }
    /**
     * Destroys(disposes) the stream.
     */
    destroy() {
        this.dispose();
    }
    /**
     * Removes a priorly-registered event listener for a specified event.
     *
     * Note!
     *  - the callback function must be the same as the one that was used when
     * 	  registering the event listener as it is used as an identifier to
     *    remove the listener
     *  - this method is idempotent and results in no-op if the listener is
     *    not found, therefore passing incorrect `callback` function may
     *    result in silent unexpected behaviour
     */
    removeListener(event, callback) {
        for (const [nameName, listeners] of this._listeners.entries()) {
            if (nameName !== event) {
                continue;
            }
            for (const [listener, disposable] of listeners) {
                if (listener !== callback) {
                    continue;
                }
                disposable.dispose();
                listeners.delete(listener);
            }
        }
    }
    /**
     * This method is called when the input stream ends.
     */
    onStreamEnd() {
        if (this._ended) {
            return;
        }
        this._ended = true;
        this._onEnd.fire();
        this.settledPromise.complete();
    }
    /**
     * This method is called when the input stream emits an error.
     * We re-emit the error here by default, but subclasses can
     * override this method to handle the error differently.
     */
    onStreamError(error) {
        this._onError.fire(error);
    }
    /**
     * Consume all messages from the stream, blocking until the stream finishes.
     * @throws if the decoder stream has already ended.
     */
    async consumeAll() {
        assert(!this._ended, 'Cannot consume all messages of the stream that has already ended.');
        const messages = [];
        for await (const maybeMessage of this) {
            if (maybeMessage === null) {
                break;
            }
            messages.push(maybeMessage);
        }
        return messages;
    }
    /**
     * Async iterator interface for the decoder.
     * @throws if the decoder stream has already ended.
     */
    [Symbol.asyncIterator]() {
        assert(!this._ended, 'Cannot iterate on messages of the stream that has already ended.');
        const asyncDecoder = this._register(new AsyncDecoder(this));
        return asyncDecoder[Symbol.asyncIterator]();
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.onStreamEnd();
        this.stream.destroy();
        this.removeAllListeners();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29kZWNzL2Jhc2VEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUd0QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQU9sRTs7Ozs7R0FLRztBQUNILE1BQU0sT0FBZ0IsV0FHcEIsU0FBUSxvQkFBb0I7SUFxQjdCOztPQUVHO0lBQ0gsWUFDb0IsTUFBeUI7UUFFNUMsS0FBSyxFQUFFLENBQUM7UUFGVyxXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQXhCN0M7O1dBRUc7UUFDSyxXQUFNLEdBQUcsS0FBSyxDQUFDO1FBRUosWUFBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFDO1FBQzdDLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM3QyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUM7UUFFakU7O1dBRUc7UUFDYyxlQUFVLEdBQTBELElBQUksR0FBRyxFQUFFLENBQUM7UUFxQi9GOztXQUVHO1FBQ0ssWUFBTyxHQUFHLEtBQUssQ0FBQztRQUV4Qjs7OztXQUlHO1FBQ0ssbUJBQWMsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO1FB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