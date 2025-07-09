/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { normalize, isAbsolute } from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { DEBUG_SCHEME } from './debug.js';
import { SIDE_GROUP, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { Schemas } from '../../../../base/common/network.js';
import { isUri } from './debugUtils.js';
export const UNKNOWN_SOURCE_LABEL = nls.localize('unknownSource', "Unknown Source");
/**
 * Debug URI format
 *
 * a debug URI represents a Source object and the debug session where the Source comes from.
 *
 *       debug:arbitrary_path?session=123e4567-e89b-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 *
 */
export class Source {
    constructor(raw_, sessionId, uriIdentityService, logService) {
        let path;
        if (raw_) {
            this.raw = raw_;
            path = this.raw.path || this.raw.name || '';
            this.available = true;
        }
        else {
            this.raw = { name: UNKNOWN_SOURCE_LABEL };
            this.available = false;
            path = `${DEBUG_SCHEME}:${UNKNOWN_SOURCE_LABEL}`;
        }
        this.uri = getUriFromSource(this.raw, path, sessionId, uriIdentityService, logService);
    }
    get name() {
        return this.raw.name || resources.basenameOrAuthority(this.uri);
    }
    get origin() {
        return this.raw.origin;
    }
    get presentationHint() {
        return this.raw.presentationHint;
    }
    get reference() {
        return this.raw.sourceReference;
    }
    get inMemory() {
        return this.uri.scheme === DEBUG_SCHEME;
    }
    openInEditor(editorService, selection, preserveFocus, sideBySide, pinned) {
        return !this.available ? Promise.resolve(undefined) : editorService.openEditor({
            resource: this.uri,
            description: this.origin,
            options: {
                preserveFocus,
                selection,
                revealIfOpened: true,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                pinned
            }
        }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
    }
    static getEncodedDebugData(modelUri) {
        let path;
        let sourceReference;
        let sessionId;
        switch (modelUri.scheme) {
            case Schemas.file:
                path = normalize(modelUri.fsPath);
                break;
            case DEBUG_SCHEME:
                path = modelUri.path;
                if (modelUri.query) {
                    const keyvalues = modelUri.query.split('&');
                    for (const keyvalue of keyvalues) {
                        const pair = keyvalue.split('=');
                        if (pair.length === 2) {
                            switch (pair[0]) {
                                case 'session':
                                    sessionId = pair[1];
                                    break;
                                case 'ref':
                                    sourceReference = parseInt(pair[1]);
                                    break;
                            }
                        }
                    }
                }
                break;
            default:
                path = modelUri.toString();
                break;
        }
        return {
            name: resources.basenameOrAuthority(modelUri),
            path,
            sourceReference,
            sessionId
        };
    }
}
export function getUriFromSource(raw, path, sessionId, uriIdentityService, logService) {
    const _getUriFromSource = (path) => {
        if (typeof raw.sourceReference === 'number' && raw.sourceReference > 0) {
            return URI.from({
                scheme: DEBUG_SCHEME,
                path: path?.replace(/^\/+/g, '/'), // #174054
                query: `session=${sessionId}&ref=${raw.sourceReference}`
            });
        }
        if (path && isUri(path)) { // path looks like a uri
            return uriIdentityService.asCanonicalUri(URI.parse(path));
        }
        // assume a filesystem path
        if (path && isAbsolute(path)) {
            return uriIdentityService.asCanonicalUri(URI.file(path));
        }
        // path is relative: since VS Code cannot deal with this by itself
        // create a debug url that will result in a DAP 'source' request when the url is resolved.
        return uriIdentityService.asCanonicalUri(URI.from({
            scheme: DEBUG_SCHEME,
            path,
            query: `session=${sessionId}`
        }));
    };
    try {
        return _getUriFromSource(path);
    }
    catch (err) {
        logService.error('Invalid path from debug adapter: ' + path);
        return _getUriFromSource('/invalidDebugSource');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEUsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRTFDLE9BQU8sRUFBa0IsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFNeEMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUVwRjs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0sT0FBTyxNQUFNO0lBTWxCLFlBQVksSUFBc0MsRUFBRSxTQUFpQixFQUFFLGtCQUF1QyxFQUFFLFVBQXVCO1FBQ3RJLElBQUksSUFBWSxDQUFDO1FBQ2pCLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztZQUNoQixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLElBQUksR0FBRyxHQUFHLFlBQVksSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxZQUFZLENBQUMsYUFBNkIsRUFBRSxTQUFpQixFQUFFLGFBQXVCLEVBQUUsVUFBb0IsRUFBRSxNQUFnQjtRQUM3SCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUM5RSxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDbEIsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUixhQUFhO2dCQUNiLFNBQVM7Z0JBQ1QsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLG1CQUFtQiwrREFBdUQ7Z0JBQzFFLE1BQU07YUFDTjtTQUNELEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBYTtRQUN2QyxJQUFJLElBQVksQ0FBQztRQUNqQixJQUFJLGVBQW1DLENBQUM7UUFDeEMsSUFBSSxTQUE2QixDQUFDO1FBRWxDLFFBQVEsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLEtBQUssT0FBTyxDQUFDLElBQUk7Z0JBQ2hCLElBQUksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQyxNQUFNO1lBQ1AsS0FBSyxZQUFZO2dCQUNoQixJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDckIsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3BCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM1QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO3dCQUNsQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ3ZCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0NBQ2pCLEtBQUssU0FBUztvQ0FDYixTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUNwQixNQUFNO2dDQUNQLEtBQUssS0FBSztvQ0FDVCxlQUFlLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUNwQyxNQUFNOzRCQUNSLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTTtZQUNQO2dCQUNDLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzNCLE1BQU07UUFDUixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksRUFBRSxTQUFTLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDO1lBQzdDLElBQUk7WUFDSixlQUFlO1lBQ2YsU0FBUztTQUNULENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBeUIsRUFBRSxJQUF3QixFQUFFLFNBQWlCLEVBQUUsa0JBQXVDLEVBQUUsVUFBdUI7SUFDeEssTUFBTSxpQkFBaUIsR0FBRyxDQUFDLElBQXdCLEVBQUUsRUFBRTtRQUN0RCxJQUFJLE9BQU8sR0FBRyxDQUFDLGVBQWUsS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4RSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2YsTUFBTSxFQUFFLFlBQVk7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxVQUFVO2dCQUM3QyxLQUFLLEVBQUUsV0FBVyxTQUFTLFFBQVEsR0FBRyxDQUFDLGVBQWUsRUFBRTthQUN4RCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7WUFDbEQsT0FBTyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFDRCwyQkFBMkI7UUFDM0IsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsT0FBTyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFDRCxrRUFBa0U7UUFDbEUsMEZBQTBGO1FBQzFGLE9BQU8sa0JBQWtCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakQsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSTtZQUNKLEtBQUssRUFBRSxXQUFXLFNBQVMsRUFBRTtTQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztJQUdGLElBQUksQ0FBQztRQUNKLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxVQUFVLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzdELE9BQU8saUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNqRCxDQUFDO0FBQ0YsQ0FBQyJ9