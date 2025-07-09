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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CodeEditorWidget } from '../../../../browser/widget/codeEditor/codeEditorWidget.js';
import { StructuredLogger } from '../structuredLogger.js';
let TextModelChangeRecorder = class TextModelChangeRecorder extends Disposable {
    constructor(_editor, _instantiationService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._structuredLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logChangeReason.commandId'));
        this._register(autorunWithStore((reader, store) => {
            if (!(this._editor instanceof CodeEditorWidget)) {
                return;
            }
            if (!this._structuredLogger.isEnabled.read(reader)) {
                return;
            }
            const sources = [];
            store.add(this._editor.onBeforeExecuteEdit(({ source }) => {
                if (source) {
                    sources.push(source);
                }
            }));
            store.add(this._editor.onDidChangeModelContent(e => {
                const tm = this._editor.getModel();
                if (!tm) {
                    return;
                }
                for (const source of sources) {
                    const data = {
                        sourceId: 'TextModel.setChangeReason',
                        source: source,
                        time: Date.now(),
                        modelUri: tm.uri.toString(),
                        modelVersion: tm.getVersionId(),
                    };
                    this._structuredLogger.log(data);
                }
                sources.length = 0;
            }));
        }));
    }
};
TextModelChangeRecorder = __decorate([
    __param(1, IInstantiationService)
], TextModelChangeRecorder);
export { TextModelChangeRecorder };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9jaGFuZ2VSZWNvcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDN0YsT0FBTyxFQUE2QixnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTlFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUt0RCxZQUNrQixPQUFvQixFQUNkLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUhTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDRywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBTnBFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQWtELEVBQ3BLLGdEQUFnRCxDQUNoRCxDQUFDLENBQUM7UUFPRixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2pELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLFlBQVksZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUFDLE9BQU87WUFBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUFDLE9BQU87WUFBQyxDQUFDO1lBRS9ELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztZQUU3QixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7Z0JBQ3pELElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFBQyxPQUFPO2dCQUFDLENBQUM7Z0JBQ3BCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQzlCLE1BQU0sSUFBSSxHQUFtRDt3QkFDNUQsUUFBUSxFQUFFLDJCQUEyQjt3QkFDckMsTUFBTSxFQUFFLE1BQU07d0JBQ2QsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7d0JBQ2hCLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTt3QkFDM0IsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLEVBQUU7cUJBQy9CLENBQUM7b0JBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztnQkFDRCxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUwsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRCxDQUFBO0FBeENZLHVCQUF1QjtJQU9qQyxXQUFBLHFCQUFxQixDQUFBO0dBUFgsdUJBQXVCLENBd0NuQyJ9