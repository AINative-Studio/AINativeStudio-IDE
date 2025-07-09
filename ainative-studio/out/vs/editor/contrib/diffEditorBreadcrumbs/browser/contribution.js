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
import { reverseOrder, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { observableValue, observableSignalFromEvent, autorunWithStore } from '../../../../base/common/observable.js';
import { HideUnchangedRegionsFeature } from '../../../browser/widget/diffEditor/features/hideUnchangedRegionsFeature.js';
import { DisposableCancellationTokenSource } from '../../../browser/widget/diffEditor/utils.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IOutlineModelService } from '../../documentSymbols/browser/outlineModel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
let DiffEditorBreadcrumbsSource = class DiffEditorBreadcrumbsSource extends Disposable {
    constructor(_textModel, _languageFeaturesService, _outlineModelService) {
        super();
        this._textModel = _textModel;
        this._languageFeaturesService = _languageFeaturesService;
        this._outlineModelService = _outlineModelService;
        this._currentModel = observableValue(this, undefined);
        const documentSymbolProviderChanged = observableSignalFromEvent('documentSymbolProvider.onDidChange', this._languageFeaturesService.documentSymbolProvider.onDidChange);
        const textModelChanged = observableSignalFromEvent('_textModel.onDidChangeContent', Event.debounce(e => this._textModel.onDidChangeContent(e), () => undefined, 100));
        this._register(autorunWithStore(async (reader, store) => {
            documentSymbolProviderChanged.read(reader);
            textModelChanged.read(reader);
            const src = store.add(new DisposableCancellationTokenSource());
            const model = await this._outlineModelService.getOrCreate(this._textModel, src.token);
            if (store.isDisposed) {
                return;
            }
            this._currentModel.set(model, undefined);
        }));
    }
    getBreadcrumbItems(startRange, reader) {
        const m = this._currentModel.read(reader);
        if (!m) {
            return [];
        }
        const symbols = m.asListOfDocumentSymbols()
            .filter(s => startRange.contains(s.range.startLineNumber) && !startRange.contains(s.range.endLineNumber));
        symbols.sort(reverseOrder(compareBy(s => s.range.endLineNumber - s.range.startLineNumber, numberComparator)));
        return symbols.map(s => ({ name: s.name, kind: s.kind, startLineNumber: s.range.startLineNumber }));
    }
};
DiffEditorBreadcrumbsSource = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IOutlineModelService)
], DiffEditorBreadcrumbsSource);
HideUnchangedRegionsFeature.setBreadcrumbsSourceFactory((textModel, instantiationService) => {
    return instantiationService.createInstance(DiffEditorBreadcrumbsSource, textModel);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2RpZmZFZGl0b3JCcmVhZGNydW1icy9icm93c2VyL2NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQVcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5SCxPQUFPLEVBQUUsMkJBQTJCLEVBQWdDLE1BQU0sNEVBQTRFLENBQUM7QUFDdkosT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFnQixNQUFNLCtDQUErQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBR25ELFlBQ2tCLFVBQXNCLEVBQ2Isd0JBQW1FLEVBQ3ZFLG9CQUEyRDtRQUVqRixLQUFLLEVBQUUsQ0FBQztRQUpTLGVBQVUsR0FBVixVQUFVLENBQVk7UUFDSSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3RELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFMakUsa0JBQWEsR0FBRyxlQUFlLENBQTJCLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQVMzRixN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