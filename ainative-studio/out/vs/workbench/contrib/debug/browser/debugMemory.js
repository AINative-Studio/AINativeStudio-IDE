/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { assertNever } from '../../../../base/common/assert.js';
import { FilePermission, FileSystemProviderErrorCode, FileType, createFileSystemProviderError } from '../../../../platform/files/common/files.js';
import { DEBUG_MEMORY_SCHEME } from '../common/debug.js';
const rangeRe = /range=([0-9]+):([0-9]+)/;
export class DebugMemoryFileSystemProvider extends Disposable {
    constructor(debugService) {
        super();
        this.debugService = debugService;
        this.memoryFdCounter = 0;
        this.fdMemory = new Map();
        this.changeEmitter = new Emitter();
        /** @inheritdoc */
        this.onDidChangeCapabilities = Event.None;
        /** @inheritdoc */
        this.onDidChangeFile = this.changeEmitter.event;
        /** @inheritdoc */
        this.capabilities = 0
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */;
        this._register(debugService.onDidEndSession(({ session }) => {
            for (const [fd, memory] of this.fdMemory) {
                if (memory.session === session) {
                    this.close(fd);
                }
            }
        }));
    }
    watch(resource, opts) {
        if (opts.recursive) {
            return toDisposable(() => { });
        }
        const { session, memoryReference, offset } = this.parseUri(resource);
        const disposable = new DisposableStore();
        disposable.add(session.onDidChangeState(() => {
            if (session.state === 3 /* State.Running */ || session.state === 0 /* State.Inactive */) {
                this.changeEmitter.fire([{ type: 2 /* FileChangeType.DELETED */, resource }]);
            }
        }));
        disposable.add(session.onDidInvalidateMemory(e => {
            if (e.body.memoryReference !== memoryReference) {
                return;
            }
            if (offset && (e.body.offset >= offset.toOffset || e.body.offset + e.body.count < offset.fromOffset)) {
                return;
            }
            this.changeEmitter.fire([{ resource, type: 0 /* FileChangeType.UPDATED */ }]);
        }));
        return disposable;
    }
    /** @inheritdoc */
    stat(file) {
        const { readOnly } = this.parseUri(file);
        return Promise.resolve({
            type: FileType.File,
            mtime: 0,
            ctime: 0,
            size: 0,
            permissions: readOnly ? FilePermission.Readonly : undefined,
        });
    }
    /** @inheritdoc */
    mkdir() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    readdir() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    delete() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    rename() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    open(resource, _opts) {
        const { session, memoryReference, offset } = this.parseUri(resource);
        const fd = this.memoryFdCounter++;
        let region = session.getMemory(memoryReference);
        if (offset) {
            region = new MemoryRegionView(region, offset);
        }
        this.fdMemory.set(fd, { session, region });
        return Promise.resolve(fd);
    }
    /** @inheritdoc */
    close(fd) {
        this.fdMemory.get(fd)?.region.dispose();
        this.fdMemory.delete(fd);
        return Promise.resolve();
    }
    /** @inheritdoc */
    async writeFile(resource, content) {
        const { offset } = this.parseUri(resource);
        if (!offset) {
            throw createFileSystemProviderError(`Range must be present to read a file`, FileSystemProviderErrorCode.FileNotFound);
        }
        const fd = await this.open(resource, { create: false });
        try {
            await this.write(fd, offset.fromOffset, content, 0, content.length);
        }
        finally {
            this.close(fd);
        }
    }
    /** @inheritdoc */
    async readFile(resource) {
        const { offset } = this.parseUri(resource);
        if (!offset) {
            throw createFileSystemProviderError(`Range must be present to read a file`, FileSystemProviderErrorCode.FileNotFound);
        }
        const data = new Uint8Array(offset.toOffset - offset.fromOffset);
        const fd = await this.open(resource, { create: false });
        try {
            await this.read(fd, offset.fromOffset, data, 0, data.length);
            return data;
        }
        finally {
            this.close(fd);
        }
    }
    /** @inheritdoc */
    async read(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const ranges = await memory.region.read(pos, length);
        let readSoFar = 0;
        for (const range of ranges) {
            switch (range.type) {
                case 1 /* MemoryRangeType.Unreadable */:
                    return readSoFar;
                case 2 /* MemoryRangeType.Error */:
                    if (readSoFar > 0) {
                        return readSoFar;
                    }
                    else {
                        throw createFileSystemProviderError(range.error, FileSystemProviderErrorCode.Unknown);
                    }
                case 0 /* MemoryRangeType.Valid */: {
                    const start = Math.max(0, pos - range.offset);
                    const toWrite = range.data.slice(start, Math.min(range.data.byteLength, start + (length - readSoFar)));
                    data.set(toWrite.buffer, offset + readSoFar);
                    readSoFar += toWrite.byteLength;
                    break;
                }
                default:
                    assertNever(range);
            }
        }
        return readSoFar;
    }
    /** @inheritdoc */
    write(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        return memory.region.write(pos, VSBuffer.wrap(data).slice(offset, offset + length));
    }
    parseUri(uri) {
        if (uri.scheme !== DEBUG_MEMORY_SCHEME) {
            throw createFileSystemProviderError(`Cannot open file with scheme ${uri.scheme}`, FileSystemProviderErrorCode.FileNotFound);
        }
        const session = this.debugService.getModel().getSession(uri.authority);
        if (!session) {
            throw createFileSystemProviderError(`Debug session not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        let offset;
        const rangeMatch = rangeRe.exec(uri.query);
        if (rangeMatch) {
            offset = { fromOffset: Number(rangeMatch[1]), toOffset: Number(rangeMatch[2]) };
        }
        const [, memoryReference] = uri.path.split('/');
        return {
            session,
            offset,
            readOnly: !session.capabilities.supportsWriteMemoryRequest,
            sessionId: uri.authority,
            memoryReference: decodeURIComponent(memoryReference),
        };
    }
}
/** A wrapper for a MemoryRegion that references a subset of data in another region. */
class MemoryRegionView extends Disposable {
    constructor(parent, range) {
        super();
        this.parent = parent;
        this.range = range;
        this.invalidateEmitter = new Emitter();
        this.onDidInvalidate = this.invalidateEmitter.event;
        this.width = this.range.toOffset - this.range.fromOffset;
        this.writable = parent.writable;
        this._register(parent);
        this._register(parent.onDidInvalidate(e => {
            const fromOffset = clamp(e.fromOffset - range.fromOffset, 0, this.width);
            const toOffset = clamp(e.toOffset - range.fromOffset, 0, this.width);
            if (toOffset > fromOffset) {
                this.invalidateEmitter.fire({ fromOffset, toOffset });
            }
        }));
    }
    read(fromOffset, toOffset) {
        if (fromOffset < 0) {
            throw new RangeError(`Invalid fromOffset: ${fromOffset}`);
        }
        return this.parent.read(this.range.fromOffset + fromOffset, this.range.fromOffset + Math.min(toOffset, this.width));
    }
    write(offset, data) {
        return this.parent.write(this.range.fromOffset + offset, data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNZW1vcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnTWVtb3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFaEUsT0FBTyxFQUFvQyxjQUFjLEVBQWtDLDJCQUEyQixFQUFFLFFBQVEsRUFBMEQsNkJBQTZCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1USxPQUFPLEVBQUUsbUJBQW1CLEVBQThHLE1BQU0sb0JBQW9CLENBQUM7QUFFckssTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUM7QUFFMUMsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFnQjVELFlBQTZCLFlBQTJCO1FBQ3ZELEtBQUssRUFBRSxDQUFDO1FBRG9CLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBZmhELG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsYUFBUSxHQUFHLElBQUksR0FBRyxFQUE2RCxDQUFDO1FBQ2hGLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFFdkUsa0JBQWtCO1FBQ0YsNEJBQXVCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUVyRCxrQkFBa0I7UUFDRixvQkFBZSxHQUFH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