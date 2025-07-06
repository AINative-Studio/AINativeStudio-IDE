/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as matchers from '../../common/problemMatcher.js';
import assert from 'assert';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this._messages = [];
    }
    info(message) {
        this._messages.push(message);
        this._validationStatus.state = 1 /* ValidationState.Info */;
    }
    warn(message) {
        this._messages.push(message);
        this._validationStatus.state = 2 /* ValidationState.Warning */;
    }
    error(message) {
        this._messages.push(message);
        this._validationStatus.state = 3 /* ValidationState.Error */;
    }
    fatal(message) {
        this._messages.push(message);
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
    }
    hasMessage(message) {
        return this._messages.indexOf(message) !== null;
    }
    get messages() {
        return this._messages;
    }
    get state() {
        return this._validationStatus.state;
    }
    isOK() {
        return this._validationStatus.isOK();
    }
    get status() {
        return this._validationStatus;
    }
}
suite('ProblemPatternParser', () => {
    let reporter;
    let parser;
    const testRegexp = new RegExp('test');
    setup(() => {
        reporter = new ProblemReporter();
        parser = new matchers.ProblemPatternParser(reporter);
    });
    suite('single-pattern definitions', () => {
        test('parses a pattern defined by only a regexp', () => {
            const problemPattern = {
                regexp: 'test'
            };
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.Location,
                file: 1,
                line: 2,
                character: 3,
                message: 0
            });
        });
        test('does not sets defaults for line and character if kind is File', () => {
            const problemPattern = {
                regexp: 'test',
                kind: 'file'
            };
            const parsed = parser.parse(problemPattern);
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.File,
                file: 1,
                message: 0
            });
        });
    });
    suite('multi-pattern definitions', () => {
        test('defines a pattern based on regexp and property fields, with file/line location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, line: 4, column: 5, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    line: 4,
                    character: 5,
                    message: 6
                }]);
        });
        test('defines a pattern bsaed on regexp and property fields, with location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, location: 4, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    location: 4,
                    message: 6
                }]);
        });
        test('accepts a pattern that provides the fields from multiple entries', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                { regexp: testRegexp, kind: matchers.ProblemLocationKind.Location, file: 3 },
                { regexp: new RegExp('test1'), line: 4 },
                { regexp: new RegExp('test2'), character: 5 },
                { regexp: new RegExp('test3'), message: 6 }
            ]);
        });
        test('forbids setting the loop flag outside of the last element in the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, loop: true },
                { regexp: 'test1', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The loop property is only supported on the last line matcher.'));
        });
        test('forbids setting the kind outside of the first element of the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', kind: 'file', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. The kind property must be provided only in the first element'));
        });
        test('kind: Location requires a regexp', () => {
            const problemPattern = [
                { file: 0, line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a regexp on every entry', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a message', () => {
            const problemPattern = [
                { regexp: 'test', file: 0, line: 1, column: 20 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: Location requires a file', () => {
            const problemPattern = [
                { regexp: 'test', line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: Location requires either a line or location', () => {
            const problemPattern = [
                { regexp: 'test', file: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: File accepts a regexp, file and message', () => {
            const problemPattern = [
                { regexp: 'test', file: 2, kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.File,
                    file: 2,
                    message: 6
                }]);
        });
        test('kind: File requires a file', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: File requires a message', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', file: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL3Rlc3QvY29tbW9uL3Byb2JsZW1NYXRjaGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFxQyxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTVHLE1BQU0sZUFBZTtJQUlwQjtRQUNDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLCtCQUF1QixDQUFDO0lBQ3JELENBQUM7SUFFTSxJQUFJLENBQUMsT0FBZTtRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxrQ0FBMEIsQ0FBQztJQUN4RCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQWU7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssZ0NBQXdCLENBQUM7SUFDdEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFlO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFB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