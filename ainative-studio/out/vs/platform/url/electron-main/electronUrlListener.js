/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { app } from 'electron';
import { disposableTimeout } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
/**
 * A listener for URLs that are opened from the OS and handled by VSCode.
 * Depending on the platform, this works differently:
 * - Windows: we use `app.setAsDefaultProtocolClient()` to register VSCode with the OS
 *            and additionally add the `open-url` command line argument to identify.
 * - macOS:   we rely on `app.on('open-url')` to be called by the OS
 * - Linux:   we have a special shortcut installed (`resources/linux/code-url-handler.desktop`)
 *            that calls VSCode with the `open-url` command line argument
 *            (https://github.com/microsoft/vscode/pull/56727)
 */
export class ElectronURLListener extends Disposable {
    constructor(initialProtocolUrls, urlService, windowsMainService, environmentMainService, productService, logService) {
        super();
        this.urlService = urlService;
        this.logService = logService;
        this.uris = [];
        this.retryCount = 0;
        if (initialProtocolUrls) {
            logService.trace('ElectronURLListener initialUrisToHandle:', initialProtocolUrls.map(url => url.originalUrl));
            // the initial set of URIs we need to handle once the window is ready
            this.uris = initialProtocolUrls;
        }
        // Windows: install as protocol handler
        if (isWindows) {
            const windowsParameters = environmentMainService.isBuilt ? [] : [`"${environmentMainService.appRoot}"`];
            windowsParameters.push('--open-url', '--');
            app.setAsDefaultProtocolClient(productService.urlProtocol, process.execPath, windowsParameters);
        }
        // macOS: listen to `open-url` events from here on to handle
        const onOpenElectronUrl = Event.map(Event.fromNodeEventEmitter(app, 'open-url', (event, url) => ({ event, url })), ({ event, url }) => {
            event.preventDefault(); // always prevent default and return the url as string
            return url;
        });
        this._register(onOpenElectronUrl(url => {
            const uri = this.uriFromRawUrl(url);
            if (!uri) {
                return;
            }
            this.urlService.open(uri, { originalUrl: url });
        }));
        // Send initial links to the window once it has loaded
        const isWindowReady = windowsMainService.getWindows()
            .filter(window => window.isReady)
            .length > 0;
        if (isWindowReady) {
            logService.trace('ElectronURLListener: window is ready to handle URLs');
            this.flush();
        }
        else {
            logService.trace('ElectronURLListener: waiting for window to be ready to handle URLs...');
            this._register(Event.once(windowsMainService.onDidSignalReadyWindow)(() => this.flush()));
        }
    }
    uriFromRawUrl(url) {
        try {
            return URI.parse(url);
        }
        catch (e) {
            return undefined;
        }
    }
    async flush() {
        if (this.retryCount++ > 10) {
            this.logService.trace('ElectronURLListener#flush(): giving up after 10 retries');
            return;
        }
        this.logService.trace('ElectronURLListener#flush(): flushing URLs');
        const uris = [];
        for (const obj of this.uris) {
            const handled = await this.urlService.open(obj.uri, { originalUrl: obj.originalUrl });
            if (handled) {
                this.logService.trace('ElectronURLListener#flush(): URL was handled', obj.originalUrl);
            }
            else {
                this.logService.trace('ElectronURLListener#flush(): URL was not yet handled', obj.originalUrl);
                uris.push(obj);
            }
        }
        if (uris.length === 0) {
            return;
        }
        this.uris = uris;
        disposableTimeout(() => this.flush(), 500, this._store);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25VcmxMaXN0ZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VybC9lbGVjdHJvbi1tYWluL2VsZWN0cm9uVXJsTGlzdGVuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBMEIsTUFBTSxVQUFVLENBQUM7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBUWxEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBS2xELFlBQ0MsbUJBQStDLEVBQzlCLFVBQXVCLEVBQ3hDLGtCQUF1QyxFQUN2QyxzQkFBK0MsRUFDL0MsY0FBK0IsRUFDZCxVQUF1QjtRQUV4QyxLQUFLLEVBQUUsQ0FBQztRQU5TLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVRqQyxTQUFJLEdBQW1CLEVBQUUsQ0FBQztRQUMxQixlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBWXRCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixVQUFVLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBRTlHLHFFQUFxRTtZQUNyRSxJ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