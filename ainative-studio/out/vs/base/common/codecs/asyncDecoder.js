/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../lifecycle.js';
/**
 * Asynchronous interator wrapper for a decoder.
 */
export class AsyncDecoder extends Disposable {
    /**
     * @param decoder The decoder instance to wrap.
     *
     * Note! Assumes ownership of the `decoder` object, hence will `dipose`
     * 		 it when the decoder stream is ended.
     */
    constructor(decoder) {
        super();
        this.decoder = decoder;
        // Buffer of messages that have been decoded but not yet consumed.
        this.messages = [];
        this._register(decoder);
    }
    /**
     * Async iterator implementation.
     */
    async *[Symbol.asyncIterator]() {
        // callback is called when `data` or `end` event is received
        const callback = (data) => {
            if (data !== undefined) {
                this.messages.push(data);
            }
            else {
                this.decoder.removeListener('data', callback);
                this.decoder.removeListener('end', callback);
            }
            // is the promise resolve callback is present,
            // then call it and remove the reference
            if (this.resolveOnNewEvent) {
                this.resolveOnNewEvent();
                delete this.resolveOnNewEvent;
            }
        };
        this.decoder.on('data', callback);
        this.decoder.on('end', callback);
        // start flowing the decoder stream
        this.decoder.start();
        while (true) {
            const maybeMessage = this.messages.shift();
            if (maybeMessage !== undefined) {
                yield maybeMessage;
                continue;
            }
            // if no data available and stream ended, we're done
            if (this.decoder.ended) {
                this.dispose();
                return null;
            }
            // stream isn't ended so wait for the new
            // `data` or `end` event to be received
            await new Promise((resolve) => {
                this.resolveOnNewEvent = resolve;
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvZGVjcy9hc3luY0RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzdDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQW9HLFNBQVEsVUFBVTtJQVlsSTs7Ozs7T0FLRztJQUNILFlBQ2tCLE9BQTBCO1FBRTNDLEtBQUssRUFBRSxDQUFDO1FBRlMsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7UUFsQjVDLGtFQUFrRTtRQUNqRCxhQUFRLEdBQVEsRUFBRSxDQUFDO1FBcUJuQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztRQUM1Qiw0REFBNEQ7UUFDNUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFRLEVBQUUsRUFBRTtZQUM3QixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFFRCw4Q0FBOEM7WUFDOUMsd0NBQXdDO1lBQ3hDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN6QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVqQyxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVyQixPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMzQyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxZQUFZLENBQUM7Z0JBQ25CLFNBQVM7WUFDVixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUVmLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELHlDQUF5QztZQUN6Qyx1Q0FBdUM7WUFDdkMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FDRCJ9