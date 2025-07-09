/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { canceled } from '../../../base/common/errors.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, ensureFileSystemProviderError, FileSystemProviderErrorCode } from './files.js';
/**
 * A helper to read a file from a provider with open/read/close capability into a stream.
 */
export async function readFileIntoStream(provider, resource, target, transformer, options, token) {
    let error = undefined;
    try {
        await doReadFileIntoStream(provider, resource, target, transformer, options, token);
    }
    catch (err) {
        error = err;
    }
    finally {
        if (error && options.errorTransformer) {
            error = options.errorTransformer(error);
        }
        if (typeof error !== 'undefined') {
            target.error(error);
        }
        target.end();
    }
}
async function doReadFileIntoStream(provider, resource, target, transformer, options, token) {
    // Check for cancellation
    throwIfCancelled(token);
    // open handle through provider
    const handle = await provider.open(resource, { create: false });
    try {
        // Check for cancellation
        throwIfCancelled(token);
        let totalBytesRead = 0;
        let bytesRead = 0;
        let allowedRemainingBytes = (options && typeof options.length === 'number') ? options.length : undefined;
        let buffer = VSBuffer.alloc(Math.min(options.bufferSize, typeof allowedRemainingBytes === 'number' ? allowedRemainingBytes : options.bufferSize));
        let posInFile = options && typeof options.position === 'number' ? options.position : 0;
        let posInBuffer = 0;
        do {
            // read from source (handle) at current position (pos) into buffer (buffer) at
            // buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
            bytesRead = await provider.read(handle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);
            posInFile += bytesRead;
            posInBuffer += bytesRead;
            totalBytesRead += bytesRead;
            if (typeof allowedRemainingBytes === 'number') {
                allowedRemainingBytes -= bytesRead;
            }
            // when buffer full, create a new one and emit it through stream
            if (posInBuffer === buffer.byteLength) {
                await target.write(transformer(buffer));
                buffer = VSBuffer.alloc(Math.min(options.bufferSize, typeof allowedRemainingBytes === 'number' ? allowedRemainingBytes : options.bufferSize));
                posInBuffer = 0;
            }
        } while (bytesRead > 0 && (typeof allowedRemainingBytes !== 'number' || allowedRemainingBytes > 0) && throwIfCancelled(token) && throwIfTooLarge(totalBytesRead, options));
        // wrap up with last buffer (also respect maxBytes if provided)
        if (posInBuffer > 0) {
            let lastChunkLength = posInBuffer;
            if (typeof allowedRemainingBytes === 'number') {
                lastChunkLength = Math.min(posInBuffer, allowedRemainingBytes);
            }
            target.write(transformer(buffer.slice(0, lastChunkLength)));
        }
    }
    catch (error) {
        throw ensureFileSystemProviderError(error);
    }
    finally {
        await provider.close(handle);
    }
}
function throwIfCancelled(token) {
    if (token.isCancellationRequested) {
        throw canceled();
    }
    return true;
}
function throwIfTooLarge(totalBytesRead, options) {
    // Return early if file is too large to load and we have configured limits
    if (typeof options?.limits?.size === 'number' && totalBytesRead > options.limits.size) {
        throw createFileSystemProviderError(localize('fileTooLargeError', "File is too large to open"), FileSystemProviderErrorCode.FileTooLarge);
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2lvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBMEIsMkJBQTJCLEVBQXVELE1BQU0sWUFBWSxDQUFDO0FBZXBNOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDdkMsUUFBNkQsRUFDN0QsUUFBYSxFQUNiLE1BQTBCLEVBQzFCLFdBQTBDLEVBQzFDLE9BQWlDLEVBQ2pDLEtBQXdCO0lBRXhCLElBQUksS0FBSyxHQUFzQixTQUFTLENBQUM7SUFFekMsSUFBSSxDQUFDO1FBQ0osTUFBTSxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUNiLENBQUM7WUFBUyxDQUFDO1FBQ1YsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUss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