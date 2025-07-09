/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { FileChangeType } from './extHostTypes.js';
import * as typeConverter from './extHostTypeConverters.js';
import { StateMachine, LinkComputer } from '../../../editor/common/languages/linkComputer.js';
import { commonPrefixLength } from '../../../base/common/strings.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
class FsLinkProvider {
    constructor() {
        this._schemes = [];
    }
    add(scheme) {
        this._stateMachine = undefined;
        this._schemes.push(scheme);
    }
    delete(scheme) {
        const idx = this._schemes.indexOf(scheme);
        if (idx >= 0) {
            this._schemes.splice(idx, 1);
            this._stateMachine = undefined;
        }
    }
    _initStateMachine() {
        if (!this._stateMachine) {
            // sort and compute common prefix with previous scheme
            // then build state transitions based on the data
            const schemes = this._schemes.sort();
            const edges = [];
            let prevScheme;
            let prevState;
            let lastState = 14 /* State.LastKnownState */;
            let nextState = 14 /* State.LastKnownState */;
            for (const scheme of schemes) {
                // skip the common prefix of the prev scheme
                // and continue with its last state
                let pos = !prevScheme ? 0 : commonPrefixLength(prevScheme, scheme);
                if (pos === 0) {
                    prevState = 1 /* State.Start */;
                }
                else {
                    prevState = nextState;
                }
                for (; pos < scheme.length; pos++) {
                    // keep creating new (next) states until the
                    // end (and the BeforeColon-state) is reached
                    if (pos + 1 === scheme.length) {
                        // Save the last state here, because we need to continue for the next scheme
                        lastState = nextState;
                        nextState = 9 /* State.BeforeColon */;
                    }
                    else {
                        nextState += 1;
                    }
                    edges.push([prevState, scheme.toUpperCase().charCodeAt(pos), nextState]);
                    edges.push([prevState, scheme.toLowerCase().charCodeAt(pos), nextState]);
                    prevState = nextState;
                }
                prevScheme = scheme;
                // Restore the last state
                nextState = lastState;
            }
            // all link must match this pattern `<scheme>:/<more>`
            edges.push([9 /* State.BeforeColon */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */]);
            edges.push([10 /* State.AfterColon */, 47 /* CharCode.Slash */, 12 /* State.End */]);
            this._stateMachine = new StateMachine(edges);
        }
    }
    provideDocumentLinks(document) {
        this._initStateMachine();
        const result = [];
        const links = LinkComputer.computeLinks({
            getLineContent(lineNumber) {
                return document.lineAt(lineNumber - 1).text;
            },
            getLineCount() {
                return document.lineCount;
            }
        }, this._stateMachine);
        for (const link of links) {
            const docLink = typeConverter.DocumentLink.to(link);
            if (docLink.target) {
                result.push(docLink);
            }
        }
        return result;
    }
}
export class ExtHostFileSystem {
    constructor(mainContext, _extHostLanguageFeatures) {
        this._extHostLanguageFeatures = _extHostLanguageFeatures;
        this._linkProvider = new FsLinkProvider();
        this._fsProvider = new Map();
        this._registeredSchemes = new Set();
        this._watches = new Map();
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadFileSystem);
    }
    dispose() {
        this._linkProviderRegistration?.dispose();
    }
    registerFileSystemProvider(extension, scheme, provider, options = {}) {
        // validate the given provider is complete
        ExtHostFileSystem._validateFileSystemProvider(provider);
        if (this._registeredSchemes.has(scheme)) {
            throw new Error(`a provider for the scheme '${scheme}' is already registered`);
        }
        //
        if (!this._linkProviderRegistration) {
            this._linkProviderRegistration = this._extHostLanguageFeatures.registerDocumentLinkProvider(extension, '*', this._linkProvider);
        }
        const handle = this._handlePool++;
        this._linkProvider.add(scheme);
        this._registeredSchemes.add(scheme);
        this._fsProvider.set(handle, provider);
        let capabilities = 2 /* files.FileSystemProviderCapabilities.FileReadWrite */;
        if (options.isCaseSensitive) {
            capabilities += 1024 /* files.FileSystemProviderCapabilities.PathCaseSensitive */;
        }
        if (options.isReadonly) {
            capabilities += 2048 /* files.FileSystemProviderCapabilities.Readonly */;
        }
        if (typeof provider.copy === 'function') {
            capabilities += 8 /* files.FileSystemProviderCapabilities.FileFolderCopy */;
        }
        if (typeof provider.open === 'function' && typeof provider.close === 'function'
            && typeof provider.read === 'function' && typeof provider.write === 'function') {
            checkProposedApiEnabled(extension, 'fsChunks');
            capabilities += 4 /* files.FileSystemProviderCapabilities.FileOpenReadWriteClose */;
        }
        let readOnlyMessage;
        if (options.isReadonly && isMarkdownString(options.isReadonly) && options.isReadonly.value !== '') {
            readOnlyMessage = {
                value: options.isReadonly.value,
                isTrusted: options.isReadonly.isTrusted,
                supportThemeIcons: options.isReadonly.supportThemeIcons,
                supportHtml: options.isReadonly.supportHtml,
                baseUri: options.isReadonly.baseUri,
                uris: options.isReadonly.uris
            };
        }
        this._proxy.$registerFileSystemProvider(handle, scheme, capabilities, readOnlyMessage).catch(err => {
            console.error(`FAILED to register filesystem provider of ${extension.identifier.value}-extension for the scheme ${scheme}`);
            console.error(err);
        });
        const subscription = provider.onDidChangeFile(event => {
            const mapped = [];
            for (const e of event) {
                const { uri: resource, type } = e;
                if (resource.scheme !== scheme) {
                    // dropping events for wrong scheme
                    continue;
                }
                let newType;
                switch (type) {
                    case FileChangeType.Changed:
                        newType = 0 /* files.FileChangeType.UPDATED */;
                        break;
                    case FileChangeType.Created:
                        newType = 1 /* files.FileChangeType.ADDED */;
                        break;
                    case FileChangeType.Deleted:
                        newType = 2 /* files.FileChangeType.DELETED */;
                        break;
                    default:
                        throw new Error('Unknown FileChangeType');
                }
                mapped.push({ resource, type: newType });
            }
            this._proxy.$onFileSystemChange(handle, mapped);
        });
        return toDisposable(() => {
            subscription.dispose();
            this._linkProvider.delete(scheme);
            this._registeredSchemes.delete(scheme);
            this._fsProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    static _validateFileSystemProvider(provider) {
        if (!provider) {
            throw new Error('MISSING provider');
        }
        if (typeof provider.watch !== 'function') {
            throw new Error('Provider does NOT implement watch');
        }
        if (typeof provider.stat !== 'function') {
            throw new Error('Provider does NOT implement stat');
        }
        if (typeof provider.readDirectory !== 'function') {
            throw new Error('Provider does NOT implement readDirectory');
        }
        if (typeof provider.createDirectory !== 'function') {
            throw new Error('Provider does NOT implement createDirectory');
        }
        if (typeof provider.readFile !== 'function') {
            throw new Error('Provider does NOT implement readFile');
        }
        if (typeof provider.writeFile !== 'function') {
            throw new Error('Provider does NOT implement writeFile');
        }
        if (typeof provider.delete !== 'function') {
            throw new Error('Provider does NOT implement delete');
        }
        if (typeof provider.rename !== 'function') {
            throw new Error('Provider does NOT implement rename');
        }
    }
    static _asIStat(stat) {
        const { type, ctime, mtime, size, permissions } = stat;
        return { type, ctime, mtime, size, permissions };
    }
    $stat(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).stat(URI.revive(resource))).then(stat => ExtHostFileSystem._asIStat(stat));
    }
    $readdir(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).readDirectory(URI.revive(resource)));
    }
    $readFile(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).readFile(URI.revive(resource))).then(data => VSBuffer.wrap(data));
    }
    $writeFile(handle, resource, content, opts) {
        return Promise.resolve(this._getFsProvider(handle).writeFile(URI.revive(resource), content.buffer, opts));
    }
    $delete(handle, resource, opts) {
        return Promise.resolve(this._getFsProvider(handle).delete(URI.revive(resource), opts));
    }
    $rename(handle, oldUri, newUri, opts) {
        return Promise.resolve(this._getFsProvider(handle).rename(URI.revive(oldUri), URI.revive(newUri), opts));
    }
    $copy(handle, oldUri, newUri, opts) {
        const provider = this._getFsProvider(handle);
        if (!provider.copy) {
            throw new Error('FileSystemProvider does not implement "copy"');
        }
        return Promise.resolve(provider.copy(URI.revive(oldUri), URI.revive(newUri), opts));
    }
    $mkdir(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).createDirectory(URI.revive(resource)));
    }
    $watch(handle, session, resource, opts) {
        const subscription = this._getFsProvider(handle).watch(URI.revive(resource), opts);
        this._watches.set(session, subscription);
    }
    $unwatch(_handle, session) {
        const subscription = this._watches.get(session);
        if (subscription) {
            subscription.dispose();
            this._watches.delete(session);
        }
    }
    $open(handle, resource, opts) {
        const provider = this._getFsProvider(handle);
        if (!provider.open) {
            throw new Error('FileSystemProvider does not implement "open"');
        }
        return Promise.resolve(provider.open(URI.revive(resource), opts));
    }
    $close(handle, fd) {
        const provider = this._getFsProvider(handle);
        if (!provider.close) {
            throw new Error('FileSystemProvider does not implement "close"');
        }
        return Promise.resolve(provider.close(fd));
    }
    $read(handle, fd, pos, length) {
        const provider = this._getFsProvider(handle);
        if (!provider.read) {
            throw new Error('FileSystemProvider does not implement "read"');
        }
        const data = VSBuffer.alloc(length);
        return Promise.resolve(provider.read(fd, pos, data.buffer, 0, length)).then(read => {
            return data.slice(0, read); // don't send zeros
        });
    }
    $write(handle, fd, pos, data) {
        const provider = this._getFsProvider(handle);
        if (!provider.write) {
            throw new Error('FileSystemProvider does not implement "write"');
        }
        return Promise.resolve(provider.write(fd, pos, data.buffer, 0, data.byteLength));
    }
    _getFsProvider(handle) {
        const provider = this._fsProvider.get(handle);
        if (!provider) {
            const err = new Error();
            err.name = 'ENOPRO';
            err.message = `no provider`;
            throw err;
        }
        return provider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEZpbGVTeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFtRixNQUFNLHVCQUF1QixDQUFDO0FBR3JJLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkQsT0FBTyxLQUFLLGFBQWEsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RCxPQUFPLEVBQVMsWUFBWSxFQUFFLFlBQVksRUFBUSxNQUFNLGtEQUFrRCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFeEYsTUFBTSxjQUFjO0lBQXBCO1FBRVMsYUFBUSxHQUFhLEVBQUUsQ0FBQztJQXVGakMsQ0FBQztJQXBGQSxHQUFHLENBQUMsTUFBYztRQUNqQixJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDcEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FB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