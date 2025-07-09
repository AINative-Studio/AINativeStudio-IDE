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
import { Event } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { FileType, IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { readTrustedDomains, TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, TRUSTED_DOMAINS_STORAGE_KEY } from './trustedDomains.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const TRUSTED_DOMAINS_SCHEMA = 'trustedDomains';
const TRUSTED_DOMAINS_STAT = {
    type: FileType.File,
    ctime: Date.now(),
    mtime: Date.now(),
    size: 0
};
const CONFIG_HELP_TEXT_PRE = `// Links matching one or more entries in the list below can be opened without link protection.
// The following examples show what entries can look like:
// - "https://microsoft.com": Matches this specific domain using https
// - "https://microsoft.com:8080": Matches this specific domain on this port using https
// - "https://microsoft.com:*": Matches this specific domain on any port using https
// - "https://microsoft.com/foo": Matches https://microsoft.com/foo and https://microsoft.com/foo/bar,
//   but not https://microsoft.com/foobar or https://microsoft.com/bar
// - "https://*.microsoft.com": Match all domains ending in "microsoft.com" using https
// - "microsoft.com": Match this specific domain using either http or https
// - "*.microsoft.com": Match all domains ending in "microsoft.com" using either http or https
// - "http://192.168.0.1: Matches this specific IP using http
// - "http://192.168.0.*: Matches all IP's with this prefix using http
// - "*": Match all domains using either http or https
//
`;
const CONFIG_HELP_TEXT_AFTER = `//
// You can use the "Manage Trusted Domains" command to open this file.
// Save this file to apply the trusted domains rules.
`;
const CONFIG_PLACEHOLDER_TEXT = `[
	// "https://microsoft.com"
]`;
function computeTrustedDomainContent(defaultTrustedDomains, trustedDomains, configuring) {
    let content = CONFIG_HELP_TEXT_PRE;
    if (defaultTrustedDomains.length > 0) {
        content += `// By default, VS Code trusts "localhost" as well as the following domains:\n`;
        defaultTrustedDomains.forEach(d => {
            content += `// - "${d}"\n`;
        });
    }
    else {
        content += `// By default, VS Code trusts "localhost".\n`;
    }
    content += CONFIG_HELP_TEXT_AFTER;
    content += configuring ? `\n// Currently configuring trust for ${configuring}\n` : '';
    if (trustedDomains.length === 0) {
        content += CONFIG_PLACEHOLDER_TEXT;
    }
    else {
        content += JSON.stringify(trustedDomains, null, 2);
    }
    return content;
}
let TrustedDomainsFileSystemProvider = class TrustedDomainsFileSystemProvider {
    static { this.ID = 'workbench.contrib.trustedDomainsFileSystemProvider'; }
    constructor(fileService, storageService, instantiationService) {
        this.fileService = fileService;
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
        this.fileService.registerProvider(TRUSTED_DOMAINS_SCHEMA, this);
    }
    stat(resource) {
        return Promise.resolve(TRUSTED_DOMAINS_STAT);
    }
    async readFile(resource) {
        let trustedDomainsContent = this.storageService.get(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        const configuring = resource.fragment;
        const { defaultTrustedDomains, trustedDomains } = await this.instantiationService.invokeFunction(readTrustedDomains);
        if (!trustedDomainsContent ||
            trustedDomainsContent.indexOf(CONFIG_HELP_TEXT_PRE) === -1 ||
            trustedDomainsContent.indexOf(CONFIG_HELP_TEXT_AFTER) === -1 ||
            trustedDomainsContent.indexOf(configuring ?? '') === -1 ||
            [...defaultTrustedDomains, ...trustedDomains].some(d => !assertIsDefined(trustedDomainsContent).includes(d))) {
            trustedDomainsContent = computeTrustedDomainContent(defaultTrustedDomains, trustedDomains, configuring);
        }
        const buffer = VSBuffer.fromString(trustedDomainsContent).buffer;
        return buffer;
    }
    writeFile(resource, content, opts) {
        try {
            const trustedDomainsContent = VSBuffer.wrap(content).toString();
            const trustedDomains = parse(trustedDomainsContent);
            this.storageService.store(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, trustedDomainsContent, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            this.storageService.store(TRUSTED_DOMAINS_STORAGE_KEY, JSON.stringify(trustedDomains) || '', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        }
        catch (err) { }
        return Promise.resolve();
    }
    watch(resource, opts) {
        return {
            dispose() {
                return;
            }
        };
    }
    mkdir(resource) {
        return Promise.resolve(undefined);
    }
    readdir(resource) {
        return Promise.resolve(undefined);
    }
    delete(resource, opts) {
        return Promise.resolve(undefined);
    }
    rename(from, to, opts) {
        return Promise.resolve(undefined);
    }
};
TrustedDomainsFileSystemProvider = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IInstantiationService)
], TrustedDomainsFileSystemProvider);
export { TrustedDomainsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnNGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL2Jyb3dzZXIvdHJ1c3RlZERvbWFpbnNGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUd4RCxPQUFPLEVBQTZFLFFBQVEsRUFBcUIsWUFBWSxFQUF3RSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hQLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQ0FBbUMsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixDQUFDO0FBRWhELE1BQU0sb0JBQW9CLEdBQVU7SUFDbkMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO0lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ2pCLElBQUksRUFBRSxDQUFDO0NBQ1AsQ0FBQztBQUVGLE1BQU0sb0JBQW9CLEdBQUc7Ozs7Ozs7Ozs7Ozs7O0NBYzVCLENBQUM7QUFFRixNQUFN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