/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { protocol } from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { COI, FileAccess, Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
export class WebviewProtocolProvider extends Disposable {
    static { this.validWebviewFilePaths = new Map([
        ['/index.html', 'index.html'],
        ['/fake.html', 'fake.html'],
        ['/service-worker.js', 'service-worker.js'],
    ]); }
    constructor() {
        super();
        // Register the protocol for loading webview html
        const webviewHandler = this.handleWebviewRequest.bind(this);
        protocol.registerFileProtocol(Schemas.vscodeWebview, webviewHandler);
    }
    handleWebviewRequest(request, callback) {
        try {
            const uri = URI.parse(request.url);
            const entry = WebviewProtocolProvider.validWebviewFilePaths.get(uri.path);
            if (typeof entry === 'string') {
                const relativeResourcePath = `vs/workbench/contrib/webview/browser/pre/${entry}`;
                const url = FileAccess.asFileUri(relativeResourcePath);
                return callback({
                    path: url.fsPath,
                    headers: {
                        ...COI.getHeadersFromQuery(request.url),
                        'Cross-Origin-Resource-Policy': 'cross-origin'
                    }
                });
            }
            else {
                return callback({ error: -10 /* ACCESS_DENIED - https://cs.chromium.org/chromium/src/net/base/net_error_list.h?l=32 */ });
            }
        }
        catch {
            // noop
        }
        return callback({ error: -2 /* FAILED - https://cs.chromium.org/chromium/src/net/base/net_error_list.h?l=32 */ });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1Byb3RvY29sUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2Vidmlldy9lbGVjdHJvbi1tYWluL3dlYnZpZXdQcm90b2NvbFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDcEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBbUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbEQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7YUFFdkMsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDOUMsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDO1FBQzdCLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQztRQUMzQixDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixDQUFDO0tBQzNDLENBQUMsQ0FBQztJQUVIO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFFUixpREFBaUQ7UUFDakQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RCxRQUFRLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU8sb0JBQW9CLENBQzNCLE9BQWlDLEVBQ2pDLFFBQWdFO1FBRWhFLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUUsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxvQkFBb0IsR0FBb0IsNENBQTRDLEtBQUssRUFBRSxDQUFDO2dCQUNsRyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sUUFBUSxDQUFDO29CQUNmLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTTtvQkFDaEIsT0FBTyxFQUFFO3dCQUNSLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7d0JBQ3ZDLDhCQUE4QixFQUFFLGNBQWM7cUJBQzlDO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyx5RkFBeUYsRUFBRSxDQUFDLENBQUM7WUFDM0gsQ0FBQztRQUNGLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtGQUFrRixFQUFFLENBQUMsQ0FBQztJQUNuSCxDQUFDIn0=