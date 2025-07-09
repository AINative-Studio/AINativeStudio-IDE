/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EmmetEditorAction } from '../../browser/emmetActions.js';
import { withTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class MockGrammarContributions {
    constructor(scopeName) {
        this.scopeName = scopeName;
    }
    getGrammar(mode) {
        return this.scopeName;
    }
}
suite('Emmet', () => {
    test('Get language mode and parent mode for emmet', () => {
        withTestCodeEditor([], {}, (editor, viewModel, instantiationService) => {
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'markdown' }));
            disposables.add(languageService.registerLanguage({ id: 'handlebars' }));
            disposables.add(languageService.registerLanguage({ id: 'nunjucks' }));
            disposables.add(languageService.registerLanguage({ id: 'laravel-blade' }));
            function testIsEnabled(mode, scopeName, expectedLanguage, expectedParentLanguage) {
                const model = editor.getModel();
                if (!model) {
                    assert.fail('Editor model not found');
                }
                model.setLanguage(mode);
                const langOutput = EmmetEditorAction.getLanguage(editor, new MockGrammarContributions(scopeName));
                if (!langOutput) {
                    assert.fail('langOutput not found');
                }
                assert.strictEqual(langOutput.language, expectedLanguage);
                assert.strictEqual(langOutput.parentMode, expectedParentLanguage);
            }
            // syntaxes mapped using the scope name of the grammar
            testIsEnabled('markdown', 'text.html.markdown', 'markdown', 'html');
            testIsEnabled('handlebars', 'text.html.handlebars', 'handlebars', 'html');
            testIsEnabled('nunjucks', 'text.html.nunjucks', 'nunjucks', 'html');
            testIsEnabled('laravel-blade', 'text.html.php.laravel-blade', 'laravel-blade', 'html');
            // languages that have different Language Id and scopeName
            // testIsEnabled('razor', 'text.html.cshtml', 'razor', 'html');
            // testIsEnabled('HTML (Eex)', 'text.html.elixir', 'boo', 'html');
            disposables.dispose();
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lbW1ldC90ZXN0L2Jyb3dzZXIvZW1tZXRBY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXlCLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxNQUFNLHdCQUF3QjtJQUc3QixZQUFZLFNBQWlCO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzVCLENBQUM7SUFFTSxVQUFVLENBQUMsSUFBWTtRQUM3QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFDbkIsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxFQUFFO1lBQ3RFLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRW5FLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RSxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTNFLFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLGdCQUF5QixFQUFFLHNCQUErQjtnQkFDakgsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO2dCQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNsRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDckMsQ0FBQztnQkFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDbkUsQ0FBQztZQUVELHNEQUFzRDtZQUN0RCxhQUFhLENBQUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwRSxhQUFhLENBQUMsWUFBWSxFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRSxhQUFhLENBQUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwRSxhQUFhLENBQUMsZUFBZSxFQUFFLDZCQUE2QixFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUV2RiwwREFBMEQ7WUFDMUQsK0RBQStEO1lBQy9ELGtFQUFrRTtZQUVsRSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==