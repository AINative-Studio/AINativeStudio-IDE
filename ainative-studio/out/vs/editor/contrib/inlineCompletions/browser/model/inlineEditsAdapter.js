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
var InlineEditsAdapterContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore, observableSignalFromEvent } from '../../../../../base/common/observable.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { InlineEditTriggerKind } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
let InlineEditsAdapterContribution = class InlineEditsAdapterContribution extends Disposable {
    static { InlineEditsAdapterContribution_1 = this; }
    static { this.ID = 'editor.contrib.inlineEditsAdapter'; }
    static { this.isFirst = true; }
    constructor(_editor, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        if (InlineEditsAdapterContribution_1.isFirst) {
            InlineEditsAdapterContribution_1.isFirst = false;
            this.instantiationService.createInstance(InlineEditsAdapter);
        }
    }
};
InlineEditsAdapterContribution = InlineEditsAdapterContribution_1 = __decorate([
    __param(1, IInstantiationService)
], InlineEditsAdapterContribution);
export { InlineEditsAdapterContribution };
let InlineEditsAdapter = class InlineEditsAdapter extends Disposable {
    constructor(_languageFeaturesService, _commandService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this._commandService = _commandService;
        const didChangeSignal = observableSignalFromEvent('didChangeSignal', this._languageFeaturesService.inlineEditProvider.onDidChange);
        this._register(autorunWithStore((reader, store) => {
            didChangeSignal.read(reader);
            store.add(this._languageFeaturesService.inlineCompletionsProvider.register('*', {
                async provideInlineCompletions(model, position, context, token) {
                    if (!context.includeInlineEdits) {
                        return undefined;
                    }
                    const allInlineEditProvider = _languageFeaturesService.inlineEditProvider.all(model);
                    const inlineEdits = await Promise.all(allInlineEditProvider.map(async (provider) => {
                        const result = await provider.provideInlineEdit(model, {
                            triggerKind: InlineEditTriggerKind.Automatic,
                            requestUuid: context.requestUuid
                        }, token);
                        if (!result) {
                            return undefined;
                        }
                        return { result, provider };
                    }));
                    const definedEdits = inlineEdits.filter(e => !!e);
                    return {
                        edits: definedEdits,
                        items: definedEdits.map(e => {
                            return {
                                range: e.result.range,
                                showRange: e.result.showRange,
                                insertText: e.result.text,
                                command: e.result.accepted,
                                shownCommand: e.result.shown,
                                action: e.result.action,
                                isInlineEdit: true,
                                edit: e.result,
                            };
                        }),
                        commands: definedEdits.flatMap(e => e.result.commands ?? []),
                        enableForwardStability: true,
                    };
                },
                handleRejection: (completions, item) => {
                    if (item.edit.rejected) {
                        this._commandService.executeCommand(item.edit.rejected.id, ...(item.edit.rejected.arguments ?? []));
                    }
                },
                freeInlineCompletions(c) {
                    for (const e of c.edits) {
                        e.provider.freeInlineEdit(e.result);
                    }
                },
                toString() {
                    return 'InlineEditsAdapter';
                }
            }));
        }));
    }
};
InlineEditsAdapter = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ICommandService)
], InlineEditsAdapter);
export { InlineEditsAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVFZGl0c0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHdEcsT0FBTyxFQUE0SCxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxNLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXBGLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsVUFBVTs7YUFDL0MsT0FBRSxHQUFHLG1DQUFtQyxBQUF0QyxDQUF1QzthQUN6QyxZQUFPLEdBQUcsSUFBSSxBQUFQLENBQVE7SUFFN0IsWUFDQyxPQUFvQixFQUNvQixvQkFBMkM7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFGZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixJQUFJLGdDQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVDLGdDQUE4QixDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDOztBQWRXLDhCQUE4QjtJQU14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