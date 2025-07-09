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
var SettingsFileSystemProvider_1;
import { NotSupportedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { FilePermission, FileSystemProviderErrorCode, FileType } from '../../../../platform/files/common/files.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { isEqual } from '../../../../base/common/resources.js';
const schemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
let SettingsFileSystemProvider = class SettingsFileSystemProvider extends Disposable {
    static { SettingsFileSystemProvider_1 = this; }
    static { this.SCHEMA = Schemas.vscode; }
    static { this.SCHEMA_ASSOCIATIONS = URI.parse(`${Schemas.vscode}://schemas-associations/schemas-associations.json`); }
    constructor(preferencesService, logService) {
        super();
        this.preferencesService = preferencesService;
        this.logService = logService;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ + 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this._register(schemaRegistry.onDidChangeSchema(schemaUri => {
            this._onDidChangeFile.fire([{ resource: URI.parse(schemaUri), type: 0 /* FileChangeType.UPDATED */ }]);
        }));
        this._register(schemaRegistry.onDidChangeSchemaAssociations(() => {
            this._onDidChangeFile.fire([{ resource: SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS, type: 0 /* FileChangeType.UPDATED */ }]);
        }));
        this._register(preferencesService.onDidDefaultSettingsContentChanged(uri => {
            this._onDidChangeFile.fire([{ resource: uri, type: 0 /* FileChangeType.UPDATED */ }]);
        }));
    }
    async readFile(uri) {
        if (uri.scheme !== SettingsFileSystemProvider_1.SCHEMA) {
            throw new NotSupportedError();
        }
        let content;
        if (uri.authority === 'schemas') {
            content = this.getSchemaContent(uri);
        }
        else if (uri.authority === SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS.authority) {
            content = JSON.stringify(schemaRegistry.getSchemaAssociations());
        }
        else if (uri.authority === 'defaultsettings') {
            content = this.preferencesService.getDefaultSettingsContent(uri);
        }
        if (content) {
            return VSBuffer.fromString(content).buffer;
        }
        throw FileSystemProviderErrorCode.FileNotFound;
    }
    async stat(uri) {
        if (schemaRegistry.hasSchemaContent(uri.toString()) || this.preferencesService.hasDefaultSettingsContent(uri)) {
            const currentTime = Date.now();
            return {
                type: FileType.File,
                permissions: FilePermission.Readonly,
                mtime: currentTime,
                ctime: currentTime,
                size: 0
            };
        }
        if (isEqual(uri, SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS)) {
            const currentTime = Date.now();
            return {
                type: FileType.File,
                permissions: FilePermission.Readonly,
                mtime: currentTime,
                ctime: currentTime,
                size: 0
            };
        }
        throw FileSystemProviderErrorCode.FileNotFound;
    }
    watch(resource, opts) { return Disposable.None; }
    async mkdir(resource) { }
    async readdir(resource) { return []; }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    async writeFile() {
        throw new NotSupportedError();
    }
    getSchemaContent(uri) {
        const startTime = Date.now();
        const content = schemaRegistry.getSchemaContent(uri.toString()) ?? '{}' /* Use empty schema if not yet registered */;
        const logLevel = this.logService.getLevel();
        if (logLevel === LogLevel.Debug || logLevel === LogLevel.Trace) {
            const endTime = Date.now();
            const uncompressed = JSON.stringify(schemaRegistry.getSchemaContributions().schemas[uri.toString()]);
            this.logService.debug(`${uri.toString()}: ${uncompressed.length} -> ${content.length} (${Math.round((uncompressed.length - content.length) / uncompressed.length * 100)}%) Took ${endTime - startTime}ms`);
        }
        return content;
    }
};
SettingsFileSystemProvider = SettingsFileSystemProvider_1 = __decorate([
    __param(0, IPreferencesService),
    __param(1, ILogService)
], SettingsFileSystemProvider);
export { SettingsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NGaWxlc3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvY29tbW9uL3NldHRpbmdzRmlsZXN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQWtCLGNBQWMsRUFBa0MsMkJBQTJCLEVBQUUsUUFBUSxFQUFnSSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pTLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sS0FBSyx3QkFBd0IsTUFBTSxxRUFBcUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBcUQsd0JBQXdCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFD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