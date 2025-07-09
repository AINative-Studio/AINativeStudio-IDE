/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parse, stripComments } from '../../common/jsonc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON Parse', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Line comment', () => {
        const content = [
            "{",
            "  \"prop\": 10 // a comment",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"prop\": 10 ",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF', () => {
        const content = [
            "{",
            "}",
            "// a comment"
        ].join('\n');
        const expected = [
            "{",
            "}",
            ""
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - \\r\\n', () => {
        const content = [
            "{",
            "  \"prop\": 10 // a comment",
            "}",
        ].join('\r\n');
        const expected = [
            "{",
            "  \"prop\": 10 ",
            "}",
        ].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF - \\r\\n', () => {
        const content = [
            "{",
            "}",
            "// a comment"
        ].join('\r\n');
        const expected = [
            "{",
            "}",
            ""
        ].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - single line', () => {
        const content = [
            "{",
            "  /* before */\"prop\": 10/* after */",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - multi line', () => {
        const content = [
            "{",
            "  /**",
            "   * Some comment",
            "   */",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  ",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - shortest match', () => {
        const content = "/* abc */ */";
        const expected = " */";
        assert.strictEqual(stripComments(content), expected);
    });
    test('No strings - double quote', () => {
        const content = [
            "{",
            "  \"/* */\": 10",
            "}"
        ].join('\n');
        const expected = [
            "{",
            "  \"/* */\": 10",
            "}"
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('No strings - single quote', () => {
        const content = [
            "{",
            "  '/* */': 10",
            "}"
        ].join('\n');
        const expected = [
            "{",
            "  '/* */': 10",
            "}"
        ].join('\n');
        assert.strictEqual(stripComments(content), expected);
    });
    test('Trailing comma in object', () => {
        const content = [
            "{",
            `  "a": 10,`,
            "}"
        ].join('\n');
        const expected = [
            "{",
            `  "a": 10`,
            "}"
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma in array', () => {
        const content = [
            `[ "a", "b", "c", ]`
        ].join('\n');
        const expected = [
            `[ "a", "b", "c" ]`
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma', () => {
        const content = [
            "{",
            "  \"propA\": 10, // a comment",
            "  \"propB\": false, // a trailing comma",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"propA\": 10,",
            "  \"propB\": false",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma - EOF', () => {
        const content = `
// This configuration file allows you to pass permanent command line arguments to VS Code.
// Only a subset of arguments is currently supported to reduce the likelihood of breaking
// the installation.
//
// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT
//
// NOTE: Changing this file requires a restart of VS Code.
{
	// Use software rendering instead of hardware accelerated rendering.
	// This can help in cases where you see rendering issues in VS Code.
	// "disable-hardware-acceleration": true,
	// Allows to disable crash reporting.
	// Should restart the app if the value is changed.
	"enable-crash-reporter": true,
	// Unique id used for correlating crash reports sent from this instance.
	// Do not edit this value.
	"crash-reporter-id": "aaaaab31-7453-4506-97d0-93411b2c21c7",
	"locale": "en",
	// "log-level": "trace"
}
`;
        assert.deepEqual(parse(content), {
            "enable-crash-reporter": true,
            "crash-reporter-id": "aaaaab31-7453-4506-97d0-93411b2c21c7",
            "locale": "en"
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblBhcnNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uUGFyc2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDeEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLE9BQU8sR0FBVztZQUN2QixHQUFHO1lBQ0gsNkJBQTZCO1lBQzdCLEdBQUc7U0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLEdBQUc7WUFDSCxpQkFBaUI7WUFDakIsR0FBRztTQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLE9BQU8sR0FBVztZQUN2QixHQUFHO1lBQ0gsR0FBRztZQUNILGNBQWM7U0FDZCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLEdBQUc7WUFDSCxHQUFHO1lBQ0gsRUFBRTtTQUNG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