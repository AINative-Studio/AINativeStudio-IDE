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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXdyaXRlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL3Rlc3QvYnJvd3Nlci9zbmlwcGV0c1Jld3JpdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sK0JBQStCLENBQUM7QUFFdkUsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0lBRXZCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxhQUFhLENBQUMsS0FBYSxFQUFFLFFBQTBCO1FBQy9ELE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLDhCQUFzQixZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ2xILElBQUksT0FBTyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBRS9CLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUIsYUFBYSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUN4RCxhQUFhLENBQUMsNEJBQTRCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztRQUdoRixhQUFhLENBQ1o7WUFDQyxrRUFBa0U7WUFDbEUsd0NBQXdDO1lBQ3hDLE1BQU07WUFDTixHQUFHO1NBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ1o7WUFDQywwRUFBMEU7WUFDMUUsOENBQThDO1lBQzlDLE1BQU07WUFDTixLQUFLO1NBQ0wsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ1osQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFO1FBQ2hFLGFBQWEsQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSwwQ0FBMEMsRUFBRSxRQUFRLG1DQUEyQixZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3hLLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=