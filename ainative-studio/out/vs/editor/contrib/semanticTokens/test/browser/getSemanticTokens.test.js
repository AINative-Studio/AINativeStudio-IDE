/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { canceled } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { getDocumentSemanticTokens } from '../../common/getSemanticTokens.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
suite('getSemanticTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #136540: semantic highlighting flickers', async () => {
        const disposables = new DisposableStore();
        const registry = new LanguageFeatureRegistry();
        const provider = new class {
            getLegend() {
                return { tokenTypes: ['test'], tokenModifiers: [] };
            }
            provideDocumentSemanticTokens(model, lastResultId, token) {
                throw canceled();
            }
            releaseDocumentSemanticTokens(resultId) {
            }
        };
        disposables.add(registry.register('testLang', provider));
        const textModel = disposables.add(createTextModel('example', 'testLang'));
        await getDocumentSemanticTokens(registry, textModel, null, null, CancellationToken.None).then((res) => {
            assert.fail();
        }, (err) => {
            assert.ok(!!err);
        });
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZW1hbnRpY1Rva2Vucy90ZXN0L2Jyb3dzZXIvZ2V0U2VtYW50aWNUb2tlbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFM0UsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksdUJBQXVCLEVBQWtDLENBQUM7UUFDL0UsTUFBTSxRQUFRLEdBQUcsSUFBSTtZQUNwQixTQUFTO2dCQUNSLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDckQsQ0FBQztZQUNELDZCQUE2QixDQUFDLEtBQWlCLEVBQUUsWUFBMkIsRUFBRSxLQUF3QjtnQkFDckcsTUFBTSxRQUFRLEVBQUUsQ0FBQztZQUNsQixDQUFDO1lBQ0QsNkJBQTZCLENBQUMsUUFBNEI7WUFDMUQsQ0FBQztTQUNELENBQUM7UUFFRixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFekQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFMUUsTUFBTSx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDckcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDVixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=