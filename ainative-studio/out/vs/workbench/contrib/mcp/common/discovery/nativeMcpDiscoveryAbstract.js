/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorunWithStore, observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { discoverySourceLabel, mcpDiscoverySection } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { ClaudeDesktopMpcDiscoveryAdapter, CursorDesktopMpcDiscoveryAdapter, WindsurfDesktopMpcDiscoveryAdapter } from './nativeMcpDiscoveryAdapters.js';
let FilesystemMcpDiscovery = class FilesystemMcpDiscovery extends Disposable {
    constructor(configurationService, _fileService, _mcpRegistry) {
        super();
        this._fileService = _fileService;
        this._mcpRegistry = _mcpRegistry;
        this._fsDiscoveryEnabled = observableConfigValue(mcpDiscoverySection, true, configurationService);
    }
    _isDiscoveryEnabled(reader, discoverySource) {
        const fsDiscovery = this._fsDiscoveryEnabled.read(reader);
        if (typeof fsDiscovery === 'boolean') {
            return fsDiscovery;
        }
        if (discoverySource && fsDiscovery[discoverySource] === false) {
            return false;
        }
        return true;
    }
    watchFile(file, collection, discoverySource, adaptFile) {
        const store = new DisposableStore();
        const collectionRegistration = store.add(new MutableDisposable());
        const updateFile = async () => {
            let definitions = [];
            try {
                const contents = await this._fileService.readFile(file);
                definitions = adaptFile(contents.value) || [];
            }
            catch {
                // ignored
            }
            if (!definitions.length) {
                collectionRegistration.clear();
            }
            else {
                collection.serverDefinitions.set(definitions, undefined);
                if (!collectionRegistration.value) {
                    collectionRegistration.value = this._mcpRegistry.registerCollection(collection);
                }
            }
        };
        store.add(autorunWithStore((reader, store) => {
            if (!this._isDiscoveryEnabled(reader, discoverySource)) {
                collectionRegistration.clear();
                return;
            }
            const throttler = store.add(new RunOnceScheduler(updateFile, 500));
            const watcher = store.add(this._fileService.createWatcher(file, { recursive: false, excludes: [] }));
            store.add(watcher.onDidChange(() => throttler.schedule()));
            updateFile();
        }));
        return store;
    }
};
FilesystemMcpDiscovery = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, IMcpRegistry)
], FilesystemMcpDiscovery);
export { FilesystemMcpDiscovery };
/**
 * Base class that discovers MCP servers on a filesystem, outside of the ones
 * defined in VS Code settings.
 */
let NativeFilesystemMcpDiscovery = class NativeFilesystemMcpDiscovery extends FilesystemMcpDiscovery {
    constructor(remoteAuthority, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(configurationService, fileService, mcpRegistry);
        this.suffix = '';
        if (remoteAuthority) {
            this.suffix = ' ' + localize('onRemoteLabel', ' on {0}', labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority));
        }
        this.adapters = [
            instantiationService.createInstance(ClaudeDesktopMpcDiscoveryAdapter, remoteAuthority),
            instantiationService.createInstance(CursorDesktopMpcDiscoveryAdapter, remoteAuthority),
            instantiationService.createInstance(WindsurfDesktopMpcDiscoveryAdapter, remoteAuthority),
        ];
    }
    setDetails(detailsDto) {
        if (!detailsDto) {
            return;
        }
        const details = {
            ...detailsDto,
            homedir: URI.revive(detailsDto.homedir),
            xdgHome: detailsDto.xdgHome ? URI.revive(detailsDto.xdgHome) : undefined,
            winAppData: detailsDto.winAppData ? URI.revive(detailsDto.winAppData) : undefined,
        };
        for (const adapter of this.adapters) {
            const file = adapter.getFilePath(details);
            if (!file) {
                continue;
            }
            const collection = {
                id: adapter.id,
                label: discoverySourceLabel[adapter.discoverySource] + this.suffix,
                remoteAuthority: adapter.remoteAuthority,
                scope: 0 /* StorageScope.PROFILE */,
                isTrustedByDefault: false,
                serverDefinitions: observableValue(this, []),
                presentation: {
                    origin: file,
                    order: adapter.order + (adapter.remoteAuthority ? -50 /* McpCollectionSortOrder.RemoteBoost */ : 0),
                },
            };
            this._register(this.watchFile(file, collection, adapter.discoverySource, contents => adapter.adaptFile(contents, details)));
        }
    }
};
NativeFilesystemMcpDiscovery = __decorate([
    __param(1, ILabelService),
    __param(2, IFileService),
    __param(3, IInstantiationService),
    __param(4, IMcpRegistry),
    __param(5, IConfigurationService)
], NativeFilesystemMcpDiscovery);
export { NativeFilesystemMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWJzdHJhY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvbmF0aXZlTWNwRGlzY292ZXJ5QWJzdHJhY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUE2QyxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4SSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFHN0csT0FBTyxFQUFtQixvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUd0RCxPQUFPLEVBQUUsZ0NB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