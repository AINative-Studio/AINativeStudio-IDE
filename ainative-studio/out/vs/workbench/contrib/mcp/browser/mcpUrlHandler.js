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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
const providerScheme = 'mcp-install';
let McpUrlHandler = class McpUrlHandler extends Disposable {
    static { this.scheme = providerScheme; }
    constructor(urlService, _instaService, _fileService) {
        super();
        this._instaService = _instaService;
        this._fileService = _fileService;
        this._fileSystemProvider = new Lazy(() => {
            return this._instaService.invokeFunction(accessor => {
                const fileService = accessor.get(IFileService);
                const filesystem = new InMemoryFileSystemProvider();
                this._register(fileService.registerProvider(providerScheme, filesystem));
                return providerScheme;
            });
        });
        this._register(urlService.registerHandler(this));
    }
    async handleURL(uri, options) {
        if (uri.path !== 'mcp/install') {
            return false;
        }
        let parsed;
        try {
            parsed = JSON.parse(decodeURIComponent(uri.query));
        }
        catch (e) {
            return false;
        }
        const { name, ...rest } = parsed;
        const scheme = this._fileSystemProvider.value;
        const fileUri = URI.from({ scheme, path: `/${encodeURIComponent(name)}.json` });
        await this._fileService.writeFile(fileUri, VSBuffer.fromString(JSON.stringify(rest, null, '\t')));
        const addConfigHelper = this._instaService.createInstance(McpAddConfigurationCommand, undefined);
        addConfigHelper.pickForUrlHandler(fileUri, true);
        return Promise.resolve(true);
    }
};
McpUrlHandler = __decorate([
    __param(0, IURLService),
    __param(1, IInstantiationService),
    __param(2, IFileService)
], McpUrlHandler);
export { McpUrlHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVXJsSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BVcmxIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFnQyxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RSxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUM7QUFFOUIsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7YUFDckIsV0FBTSxHQUFHLGNBQWMsQUFBakIsQ0FBa0I7SUFZL0MsWUFDYyxVQUF1QixFQUNiLGFBQXFELEVBQzlELFlBQTJDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBSGdDLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUM3QyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQVp6Qyx3QkFBbUIsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDcEQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxVQUFVLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO2dCQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDekUsT0FBTyxjQUFjLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQVFGLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVEsRUFBRSxPQUF5QjtRQUNsRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDaEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxNQUFpRCxDQUFDO1FBQ3RELElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUVqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBQzlDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFaEYsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FDaEMsT0FBTyxFQUNQLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQ3JELENBQUM7UUFFRixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRyxlQUFlLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDOztBQWhEVyxhQUFhO0lBY3ZCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtHQWhCRixhQUFhLENBaUR6QiJ9