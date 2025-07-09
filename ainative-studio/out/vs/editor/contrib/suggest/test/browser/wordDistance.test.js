/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { DEFAULT_WORD_REGEXP } from '../../../../common/core/wordHelper.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { EditorWorker } from '../../../../common/services/editorWebWorker.js';
import { EditorWorkerService } from '../../../../browser/services/editorWorkerService.js';
import { CompletionItem } from '../../browser/suggest.js';
import { WordDistance } from '../../browser/wordDistance.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('suggest, word distance', function () {
    let distance;
    const disposables = new DisposableStore();
    setup(async function () {
        const languageId = 'bracketMode';
        disposables.clear();
        const instantiationService = createCodeEditorServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ]
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, 'function abc(aa, ab){\na\n}', languageId, undefined, URI.parse('test:///some.path')));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
        editor.updateOptions({ suggest: { localityBonus: true } });
        editor.setPosition({ lineNumber: 2, column: 2 });
        const modelService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onModelRemoved = Event.None;
            }
            getModel(uri) {
                return uri.toString() === model.uri.toString() ? model : null;
            }
        };
        const service = new class extends EditorWorkerService {
            constructor() {
                super(null, modelService, new class extends mock() {
                }, new NullLogService(), new TestLanguageConfigurationService(), new LanguageFeaturesService());
                this._worker = new EditorWorker();
                this._worker.$acceptNewModel({
                    url: model.uri.toString(),
                    lines: model.getLinesContent(),
                    EOL: model.getEOL(),
                    versionId: model.getVersionId()
                });
                model.onDidChangeContent(e => this._worker.$acceptModelChanged(model.uri.toString(), e));
            }
            computeWordRanges(resource, range) {
                return this._worker.$computeWordRanges(resource.toString(), range, DEFAULT_WORD_REGEXP.source, DEFAULT_WORD_REGEXP.flags);
            }
        };
        distance = await WordDistance.create(service, editor);
        disposables.add(service);
    });
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createSuggestItem(label, overwriteBefore, position) {
        const suggestion = {
            label,
            range: { startLineNumber: position.lineNumber, startColumn: position.column - overwriteBefore, endLineNumber: position.lineNumber, endColumn: position.column },
            insertText: label,
            kind: 0
        };
        const container = {
            suggestions: [suggestion]
        };
        const provider = {
            _debugDisplayName: 'test',
            provideCompletionItems() {
                return;
            }
        };
        return new CompletionItem(position, suggestion, container, provider);
    }
    test('Suggest locality bonus can boost current word #90515', function () {
        const pos = { lineNumber: 2, column: 2 };
        const d1 = distance.distance(pos, createSuggestItem('a', 1, pos).completion);
        const d2 = distance.distance(pos, createSuggestItem('aa', 1, pos).completion);
        const d3 = distance.distance(pos, createSuggestItem('ab', 1, pos).completion);
        assert.ok(d1 > d2);
        assert.ok(d2 === d3);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvd29yZERpc3RhbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUcvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FB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