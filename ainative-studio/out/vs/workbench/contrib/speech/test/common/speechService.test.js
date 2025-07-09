/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { speechLanguageConfigToLanguage } from '../../common/speechService.js';
suite('SpeechService', () => {
    test('resolve language', async () => {
        assert.strictEqual(speechLanguageConfigToLanguage(undefined), 'en-US');
        assert.strictEqual(speechLanguageConfigToLanguage(3), 'en-US');
        assert.strictEqual(speechLanguageConfigToLanguage('foo'), 'en-US');
        assert.strictEqual(speechLanguageConfigToLanguage('foo-bar'), 'en-US');
        assert.strictEqual(speechLanguageConfigToLanguage('tr-TR'), 'tr-TR');
        assert.strictEqual(speechLanguageConfigToLanguage('zh-TW'), 'zh-TW');
        assert.strictEqual(speechLanguageConfigToLanguage('auto', 'en'), 'en-US');
        assert.strictEqual(speechLanguageConfigToLanguage('auto', 'tr'), 'tr-TR');
        assert.strictEqual(speechLanguageConfigToLanguage('auto', 'zh-tw'), 'zh-TW');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NwZWVjaC90ZXN0L2NvbW1vbi9zcGVlY2hTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9FLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVyRSxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5RSxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==