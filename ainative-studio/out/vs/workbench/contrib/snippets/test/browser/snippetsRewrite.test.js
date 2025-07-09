/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Snippet } from '../../browser/snippetsFile.js';
suite('SnippetRewrite', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertRewrite(input, expected) {
        const actual = new Snippet(false, ['foo'], 'foo', 'foo', 'foo', input, 'foo', 1 /* SnippetSource.User */, generateUuid());
        if (typeof expected === 'boolean') {
            assert.strictEqual(actual.codeSnippet, input);
        }
        else {
            assert.strictEqual(actual.codeSnippet, expected);
        }
    }
    test('bogous variable rewrite', function () {
        assertRewrite('foo', false);
        assertRewrite('hello $1 world$0', false);
        assertRewrite('$foo and $foo', '${1:foo} and ${1:foo}');
        assertRewrite('$1 and $SELECTION and $foo', '$1 and ${SELECTION} and ${2:foo}');
        assertRewrite([
            'for (var ${index} = 0; ${index} < ${array}.length; ${index}++) {',
            '\tvar ${element} = ${array}[${index}];',
            '\t$0',
            '}'
        ].join('\n'), [
            'for (var ${1:index} = 0; ${1:index} < ${2:array}.length; ${1:index}++) {',
            '\tvar ${3:element} = ${2:array}[${1:index}];',
            '\t$0',
            '\\}'
        ].join('\n'));
    });
    test('Snippet choices: unable to escape comma and pipe, #31521', function () {
        assertRewrite('console.log(${1|not\\, not, five, 5, 1   23|});', false);
    });
    test('lazy bogous variable rewrite', function () {
        const snippet = new Snippet(false, ['fooLang'], 'foo', 'prefix', 'desc', 'This is ${bogous} because it is a ${var}', 'source', 3 /* SnippetSource.Extension */, generateUuid());
        assert.strictEqual(snippet.body, 'This is ${bogous} because it is a ${var}');
        assert.strictEqual(snippet.codeSnippet, 'This is ${1:bogous} because it is a ${2:var}');
        assert.strictEqual(snippet.isBogous, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXdyaXRlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvdGVzdC9icm93c2VyL3NuaXBwZXRzUmV3cml0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSwrQkFBK0IsQ0FBQztBQUV2RSxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7SUFFdkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGFBQWEsQ0FBQyxLQUFhLEVBQUUsUUFBMEI7UUFDL0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssOEJBQXNCLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDbEgsSUFBSSxPQUFPLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFFL0IsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1QixhQUFhLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekMsYUFBYSxDQUFDLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3hELGFBQWEsQ0FBQyw0QkFBNEIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBR2hGLGFBQWEsQ0FDWjtZQUNDLGtFQUFrRTtZQUNsRSx3Q0FBd0M7WUFDeEMsTUFBTTtZQUNOLEdBQUc7U0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDWjtZQUNDLDBFQUEwRTtZQUMxRSw4Q0FBOEM7WUFDOUMsTUFBTTtZQUNOLEtBQUs7U0FDTCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDWixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUU7UUFDaEUsYUFBYSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLDBDQUEwQyxFQUFFLFFBQVEsbUNBQTJCLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDeEssTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLDhDQUE4QyxDQUFDLENBQUM7UUFDeEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==