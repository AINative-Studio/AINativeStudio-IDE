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
import { Color, RGBA } from '../../../../base/common/color.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
let DefaultDocumentColorProvider = class DefaultDocumentColorProvider {
    constructor(_editorWorkerService) {
        this._editorWorkerService = _editorWorkerService;
    }
    async provideDocumentColors(model, _token) {
        return this._editorWorkerService.computeDefaultDocumentColors(model.uri);
    }
    provideColorPresentations(_model, colorInfo, _token) {
        const range = colorInfo.range;
        const colorFromInfo = colorInfo.color;
        const alpha = colorFromInfo.alpha;
        const color = new Color(new RGBA(Math.round(255 * colorFromInfo.red), Math.round(255 * colorFromInfo.green), Math.round(255 * colorFromInfo.blue), alpha));
        const rgb = alpha ? Color.Format.CSS.formatRGB(color) : Color.Format.CSS.formatRGBA(color);
        const hsl = alpha ? Color.Format.CSS.formatHSL(color) : Color.Format.CSS.formatHSLA(color);
        const hex = alpha ? Color.Format.CSS.formatHex(color) : Color.Format.CSS.formatHexA(color);
        const colorPresentations = [];
        colorPresentations.push({ label: rgb, textEdit: { range: range, text: rgb } });
        colorPresentations.push({ label: hsl, textEdit: { range: range, text: hsl } });
        colorPresentations.push({ label: hex, textEdit: { range: range, text: hex } });
        return colorPresentations;
    }
};
DefaultDocumentColorProvider = __decorate([
    __param(0, IEditorWorkerService)
], DefaultDocumentColorProvider);
export { DefaultDocumentColorProvider };
let DefaultDocumentColorProviderFeature = class DefaultDocumentColorProviderFeature extends Disposable {
    constructor(_languageFeaturesService, editorWorkerService) {
        super();
        this._register(_languageFeaturesService.colorProvider.register('*', new DefaultDocumentColorProvider(editorWorkerService)));
    }
};
DefaultDocumentColorProviderFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IEditorWorkerService)
], DefaultDocumentColorProviderFeature);
export { DefaultDocumentColorProviderFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2RlZmF1bHREb2N1bWVudENvbG9yUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUcvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFekUsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFFeEMsWUFDd0Msb0JBQTBDO1FBQTFDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7SUFDOUUsQ0FBQztJQUVMLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxLQUFpQixFQUFFLE1BQXlCO1FBQ3ZFLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQseUJBQXlCLENBQUMsTUFBa0IsRUFBRSxTQUE0QixFQUFFLE1BQXlCO1FBQ3BHLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFDOUIsTUFBTSxhQUFhLEdBQVcsU0FBUyxDQUFDLEtBQUssQ0FBQztRQUM5QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFM0osTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNGLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0YsTUFBTSxrQkFBa0IsR0FBeUIsRUFBRSxDQUFDO1FBQ3BELGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sa0JBQWtCLENBQUM7SUFDM0IsQ0FBQztDQUNELENBQUE7QUExQlksNEJBQTRCO0lBR3RDLFdBQUEsb0JBQW9CLENBQUE7R0FIViw0QkFBNEIsQ0EwQnhDOztBQUVNLElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW9DLFNBQVEsVUFBVTtJQUNsRSxZQUMyQix3QkFBa0QsRUFDdEQsbUJBQXlDO1FBRS9ELEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLDRCQUE0QixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdILENBQUM7Q0FDRCxDQUFBO0FBUlksbUNBQW1DO0lBRTdDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxvQkFBb0IsQ0FBQTtHQUhWLG1DQUFtQyxDQVEvQyJ9