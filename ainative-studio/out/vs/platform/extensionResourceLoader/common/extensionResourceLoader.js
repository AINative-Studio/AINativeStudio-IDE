/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb } from '../../../base/common/platform.js';
import { format2 } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { getTelemetryLevel, supportsTelemetry } from '../../telemetry/common/telemetryUtils.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import { getExtensionGalleryManifestResourceUri } from '../../extensionManagement/common/extensionGalleryManifest.js';
import { Disposable } from '../../../base/common/lifecycle.js';
const WEB_EXTENSION_RESOURCE_END_POINT_SEGMENT = '/web-extension-resource/';
export const IExtensionResourceLoaderService = createDecorator('extensionResourceLoaderService');
export function migratePlatformSpecificExtensionGalleryResourceURL(resource, targetPlatform) {
    if (resource.query !== `target=${targetPlatform}`) {
        return undefined;
    }
    const paths = resource.path.split('/');
    if (!paths[3]) {
        return undefined;
    }
    paths[3] = `${paths[3]}+${targetPlatform}`;
    return resource.with({ query: null, path: paths.join('/') });
}
export class AbstractExtensionResourceLoaderService extends Disposable {
    constructor(_fileService, _storageService, _productService, _environmentService, _configurationService, _extensionGalleryManifestService, _logService) {
        super();
        this._fileService = _fileService;
        this._storageService = _storageService;
        this._productService = _productService;
        this._environmentService = _environmentService;
        this._configurationService = _configurationService;
        this._extensionGalleryManifestService = _extensionGalleryManifestService;
        this._logService = _logService;
        this._initPromise = this._init();
    }
    async _init() {
        try {
            const manifest = await this._extensionGalleryManifestService.getExtensionGalleryManifest();
            this.resolve(manifest);
            this._register(this._extensionGalleryManifestService.onDidChangeExtensionGalleryManifest(() => this.resolve(manifest)));
        }
        catch (error) {
            this._logService.error(error);
        }
    }
    resolve(manifest) {
        this._extensionGalleryResourceUrlTemplate = manifest ? getExtensionGalleryManifestResourceUri(manifest, "ExtensionResourceUriTemplate" /* ExtensionGalleryResourceType.ExtensionResourceUri */) : undefined;
        this._extensionGalleryAuthority = this._extensionGalleryResourceUrlTemplate ? this._getExtensionGalleryAuthority(URI.parse(this._extensionGalleryResourceUrlTemplate)) : undefined;
    }
    async supportsExtensionGalleryResources() {
        await this._initPromise;
        return this._extensionGalleryResourceUrlTemplate !== undefined;
    }
    async getExtensionGalleryResourceURL({ publisher, name, version, targetPlatform }, path) {
        await this._initPromise;
        if (this._extensionGalleryResourceUrlTemplate) {
            const uri = URI.parse(format2(this._extensionGalleryResourceUrlTemplate, {
                publisher,
                name,
                version: targetPlatform !== undefined
                    && targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */
                    && targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */
                    && targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */
                    ? `${version}+${targetPlatform}`
                    : version,
                path: 'extension'
            }));
            return this._isWebExtensionResourceEndPoint(uri) ? uri.with({ scheme: RemoteAuthorities.getPreferredWebSchema() }) : uri;
        }
        return undefined;
    }
    async isExtensionGalleryResource(uri) {
        await this._initPromise;
        return !!this._extensionGalleryAuthority && this._extensionGalleryAuthority === this._getExtensionGalleryAuthority(uri);
    }
    async getExtensionGalleryRequestHeaders() {
        const headers = {
            'X-Client-Name': `${this._productService.applicationName}${isWeb ? '-web' : ''}`,
            'X-Client-Version': this._productService.version
        };
        if (supportsTelemetry(this._productService, this._environmentService) && getTelemetryLevel(this._configurationService) === 3 /* TelemetryLevel.USAGE */) {
            headers['X-Machine-Id'] = await this._getServiceMachineId();
        }
        if (this._productService.commit) {
            headers['X-Client-Commit'] = this._productService.commit;
        }
        return headers;
    }
    _getServiceMachineId() {
        if (!this._serviceMachineIdPromise) {
            this._serviceMachineIdPromise = getServiceMachineId(this._environmentService, this._fileService, this._storageService);
        }
        return this._serviceMachineIdPromise;
    }
    _getExtensionGalleryAuthority(uri) {
        if (this._isWebExtensionResourceEndPoint(uri)) {
            return uri.authority;
        }
        const index = uri.authority.indexOf('.');
        return index !== -1 ? uri.authority.substring(index + 1) : undefined;
    }
    _isWebExtensionResourceEndPoint(uri) {
        const uriPath = uri.path, serverRootPath = RemoteAuthorities.getServerRootPath();
        // test if the path starts with the server root path followed by the web extension resource end point segment
        return uriPath.startsWith(serverRootPath) && uriPath.startsWith(WEB_EXTENSION_RESOURCE_END_POINT_SEGMENT, serverRootPath.length);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIvY29tbW9uL2V4dGVuc2lvblJlc291cmNlTG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBSWxELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUd4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVwRSxPQUFPLEVBQWdDLHNDQUFzQyxFQUErRCxNQUFNLDhEQUE4RCxDQUFDO0FBRWpOLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxNQUFNLHdDQUF3QyxHQUFHLDBCQUEwQixDQUFDO0FBRTVFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FBa0MsZ0NBQWdDLENBQUMsQ0FBQztBQTZCbEksTUFBTSxVQUFVLGtEQUFrRCxDQUFDLFFBQWEsRUFBRSxjQUE4QjtJQUMvRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssVUFBVSxjQUFjLEVBQUUsRUFBRSxDQUFDO1FBQ25ELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxNQUFNLEtB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