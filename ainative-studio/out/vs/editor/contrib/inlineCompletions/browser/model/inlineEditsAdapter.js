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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvaW5saW5lRWRpdHNBZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBNEgscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVsTSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVwRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7O2FBQy9DLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBdUM7YUFDekMsWUFBTyxHQUFHLElBQUksQUFBUCxDQUFRO0lBRTdCLFlBQ0MsT0FBb0IsRUFDb0Isb0JBQTJDO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBRmdDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsSUFBSSxnQ0FBOEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QyxnQ0FBOEIsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQy9DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUM5RCxDQUFDO0lBQ0YsQ0FBQzs7QUFkVyw4QkFBOEI7SUFN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