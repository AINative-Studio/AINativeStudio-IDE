/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parseEnvFile } from '../../common/envfile.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import * as assert from 'assert';
/*
Test cases from https://github.com/motdotla/dotenv/blob/master/tests/.env

    Copyright (c) 2015, Scott Motte
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this
        list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright notice,
        this list of conditions and the following disclaimer in the documentation
        and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
const example = `
BASIC=basic

# previous line intentionally left blank
AFTER_LINE=after_line
EMPTY=
EMPTY_SINGLE_QUOTES=''
EMPTY_DOUBLE_QUOTES=""
EMPTY_BACKTICKS=\`\`
SINGLE_QUOTES='single_quotes'
SINGLE_QUOTES_SPACED='    single quotes    '
DOUBLE_QUOTES="double_quotes"
DOUBLE_QUOTES_SPACED="    double quotes    "
DOUBLE_QUOTES_INSIDE_SINGLE='double "quotes" work inside single quotes'
DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET="{ port: $MONGOLAB_PORT}"
SINGLE_QUOTES_INSIDE_DOUBLE="single 'quotes' work inside double quotes"
BACKTICKS_INSIDE_SINGLE='\`backticks\` work inside single quotes'
BACKTICKS_INSIDE_DOUBLE="\`backticks\` work inside double quotes"
BACKTICKS=\`backticks\`
BACKTICKS_SPACED=\`    backticks    \`
DOUBLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" work inside backticks\`
SINGLE_QUOTES_INSIDE_BACKTICKS=\`single 'quotes' work inside backticks\`
DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" and single 'quotes' work inside backticks\`
EXPAND_NEWLINES="expand\\nnew\\nlines"
DONT_EXPAND_UNQUOTED=dontexpand\\nnewlines
DONT_EXPAND_SQUOTED='dontexpand\\nnewlines'
# COMMENTS=work
INLINE_COMMENTS=inline comments # work #very #well
INLINE_COMMENTS_SINGLE_QUOTES='inline comments outside of #singlequotes' # work
INLINE_COMMENTS_DOUBLE_QUOTES="inline comments outside of #doublequotes" # work
INLINE_COMMENTS_BACKTICKS=\`inline comments outside of #backticks\` # work
INLINE_COMMENTS_SPACE=inline comments start with a#number sign. no space required.
EQUAL_SIGNS=equals==
RETAIN_INNER_QUOTES={"foo": "bar"}
RETAIN_INNER_QUOTES_AS_STRING='{"foo": "bar"}'
RETAIN_INNER_QUOTES_AS_BACKTICKS=\`{"foo": "bar's"}\`
TRIM_SPACE_FROM_UNQUOTED=    some spaced out string
USERNAME=therealnerdybeast@example.tld
		SPACED_KEY = parsed
`;
suite('parseEnvFile', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parses', () => {
        const parsed = parseEnvFile(example);
        assert.strictEqual(parsed.get('BASIC'), 'basic');
        assert.strictEqual(parsed.get('AFTER_LINE'), 'after_line');
        assert.strictEqual(parsed.get('EMPTY'), '');
        assert.strictEqual(parsed.get('EMPTY_SINGLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_DOUBLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_BACKTICKS'), '');
        assert.strictEqual(parsed.get('SINGLE_QUOTES'), 'single_quotes');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_SPACED'), '    single quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES'), 'double_quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_SPACED'), '    double quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_SINGLE'), 'double "quotes" work inside single quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET'), '{ port: $MONGOLAB_PORT}');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_DOUBLE'), "single 'quotes' work inside double quotes");
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_SINGLE'), '`backticks` work inside single quotes');
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_DOUBLE'), '`backticks` work inside double quotes');
        assert.strictEqual(parsed.get('BACKTICKS'), 'backticks');
        assert.strictEqual(parsed.get('BACKTICKS_SPACED'), '    backticks    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_BACKTICKS'), 'double "quotes" work inside backticks');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_BACKTICKS'), "single 'quotes' work inside backticks");
        assert.strictEqual(parsed.get('DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS'), "double \"quotes\" and single 'quotes' work inside backticks");
        assert.strictEqual(parsed.get('EXPAND_NEWLINES'), 'expand\nnew\nlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_UNQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_SQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('COMMENTS'), undefined);
        assert.strictEqual(parsed.get('INLINE_COMMENTS'), 'inline comments');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SINGLE_QUOTES'), 'inline comments outside of #singlequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_DOUBLE_QUOTES'), 'inline comments outside of #doublequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_BACKTICKS'), 'inline comments outside of #backticks');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SPACE'), 'inline comments start with a');
        assert.strictEqual(parsed.get('EQUAL_SIGNS'), 'equals==');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_STRING'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_BACKTICKS'), '{"foo": "bar\'s"}');
        assert.strictEqual(parsed.get('TRIM_SPACE_FROM_UNQUOTED'), 'some spaced out string');
        assert.strictEqual(parsed.get('USERNAME'), 'therealnerdybeast@example.tld');
        assert.strictEqual(parsed.get('SPACED_KEY'), 'parsed');
        const payload = parseEnvFile('BUFFER=true');
        assert.strictEqual(payload.get('BUFFER'), 'true');
        const expectedPayload = Object.entries({ SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' });
        const RPayload = parseEnvFile('SERVER=localhost\rPASSWORD=password\rDB=tests\r');
        assert.deepStrictEqual([...RPayload], expectedPayload);
        const NPayload = parseEnvFile('SERVER=localhost\nPASSWORD=password\nDB=tests\n');
        assert.deepStrictEqual([...NPayload], expectedPayload);
        const RNPayload = parseEnvFile('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n');
        assert.deepStrictEqual([...RNPayload], expectedPayload);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZW52ZmlsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFakM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBMEJFO0FBRUYsTUFBTSxPQUFPLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXVDZixDQUFDO0FBRUYsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcs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