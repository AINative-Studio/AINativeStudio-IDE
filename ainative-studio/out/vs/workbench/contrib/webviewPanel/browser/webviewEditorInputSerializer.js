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
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IWebviewWorkbenchService } from './webviewWorkbenchService.js';
let WebviewEditorInputSerializer = class WebviewEditorInputSerializer {
    static { this.ID = WebviewInput.typeId; }
    constructor(_webviewWorkbenchService) {
        this._webviewWorkbenchService = _webviewWorkbenchService;
    }
    canSerialize(input) {
        return this._webviewWorkbenchService.shouldPersist(input);
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const data = this.toJson(input);
        try {
            return JSON.stringify(data);
        }
        catch {
            return undefined;
        }
    }
    deserialize(_instantiationService, serializedEditorInput) {
        const data = this.fromJson(JSON.parse(serializedEditorInput));
        return this._webviewWorkbenchService.openRevivedWebview({
            webviewInitInfo: {
                providedViewType: data.providedId,
                origin: data.origin,
                title: data.title,
                options: data.webviewOptions,
                contentOptions: data.contentOptions,
                extension: data.extension,
            },
            viewType: data.viewType,
            title: data.title,
            iconPath: data.iconPath,
            state: data.state,
            group: data.group
        });
    }
    fromJson(data) {
        return {
            ...data,
            extension: reviveWebviewExtensionDescription(data.extensionId, data.extensionLocation),
            iconPath: reviveIconPath(data.iconPath),
            state: reviveState(data.state),
            webviewOptions: restoreWebviewOptions(data.options),
            contentOptions: restoreWebviewContentOptions(data.options),
        };
    }
    toJson(input) {
        return {
            origin: input.webview.origin,
            viewType: input.viewType,
            providedId: input.providedId,
            title: input.getName(),
            options: { ...input.webview.options, ...input.webview.contentOptions },
            extensionLocation: input.extension?.location,
            extensionId: input.extension?.id.value,
            state: input.webview.state,
            iconPath: input.iconPath ? { light: input.iconPath.light, dark: input.iconPath.dark, } : undefined,
            group: input.group
        };
    }
};
WebviewEditorInputSerializer = __decorate([
    __param(0, IWebviewWorkbenchService)
], WebviewEditorInputSerializer);
export { WebviewEditorInputSerializer };
export function reviveWebviewExtensionDescription(extensionId, extensionLocation) {
    if (!extensionId) {
        return undefined;
    }
    const location = reviveUri(extensionLocation);
    if (!location) {
        return undefined;
    }
    return {
        id: new ExtensionIdentifier(extensionId),
        location,
    };
}
function reviveIconPath(data) {
    if (!data) {
        return undefined;
    }
    const light = reviveUri(data.light);
    const dark = reviveUri(data.dark);
    return light && dark ? { light, dark } : undefined;
}
function reviveUri(data) {
    if (!data) {
        return undefined;
    }
    try {
        if (typeof data === 'string') {
            return URI.parse(data);
        }
        return URI.from(data);
    }
    catch {
        return undefined;
    }
}
function reviveState(state) {
    return typeof state === 'string' ? state : undefined;
}
export function restoreWebviewOptions(options) {
    return options;
}
export function restoreWebviewContentOptions(options) {
    return {
        ...options,
        localResourceRoots: options.localResourceRoots?.map(uri => reviveUri(uri)),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0U2VyaWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3RWRpdG9ySW5wdXRTZXJpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFLM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBbUNqRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjthQUVqQixPQUFFLEdBQUcsWUFBWSxDQUFDLE1BQU0sQUFBdEIsQ0FBdUI7SUFFaEQsWUFDNEMsd0JBQWtEO1FBQWxELDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7SUFDMUYsQ0FBQztJQUVFLFlBQVksQ0FBQyxLQUFtQjtRQUN0QyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUFtQjtRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQztZQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXLENBQ2pCLHFCQUE0QyxFQUM1QyxxQkFBNkI7UUFFN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUM5RCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQztZQUN2RCxlQUFlLEVBQUU7Z0JBQ2hCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUNqQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjO2dCQUM1QixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUzthQUN6QjtZQUNELFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7U0FDakIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLFFBQVEsQ0FBQyxJQUF1QjtRQUN6QyxPQUFPO1lBQ04sR0FBRyxJQUFJO1lBQ1AsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3RGLFFBQVEsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUN2QyxLQUFLLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDOUIsY0FBYyxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDbkQsY0FBYyxFQUFFLDRCQUE0QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDMUQsQ0FBQztJQUNILENBQUM7SUFFUyxNQUFNLENBQUMsS0FBbUI7UUFDbkMsT0FBTztZQUNOLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU07WUFDNUIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtZQUM1QixLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUN0QixPQUFPLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7WUFDdEUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxRQUFRO1lBQzVDLFdBQVcsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxLQUFLO1lBQ3RDLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDMUIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ2xHLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztTQUNsQixDQUFDO0lBQ0gsQ0FBQzs7QUF2RVcsNEJBQTRCO0lBS3RDLFdBQUEsd0JBQXdCLENBQUE7R0FMZCw0QkFBNEIsQ0F3RXhDOztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsV0FBK0IsRUFDL0IsaUJBQTRDO0lBRTVDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDOUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU87UUFDTixFQUFFLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxXQUFXLENBQUM7UUFDeEMsUUFBUTtLQUNSLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsSUFBb0M7SUFDM0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDcEQsQ0FBQztBQUlELFNBQVMsU0FBUyxDQUFDLElBQXdDO0lBQzFELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQTBCO0lBQzlDLE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLE9BQWlDO0lBQ3RFLE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsT0FBaUM7SUFDN0UsT0FBTztRQUNOLEdBQUcsT0FBTztRQUNWLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDMUUsQ0FBQztBQUNILENBQUMifQ==