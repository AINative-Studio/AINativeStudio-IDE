/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { areApiProposalsCompatible, isValidExtensionVersion, isValidVersion, isValidVersionStr, normalizeVersion, parseVersion } from '../../common/extensionValidator.js';
suite('Extension Version Validator', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const productVersion = '2021-05-11T21:54:30.577Z';
    test('isValidVersionStr', () => {
        assert.strictEqual(isValidVersionStr('0.10.0-dev'), true);
        assert.strictEqual(isValidVersionStr('0.10.0'), true);
        assert.strictEqual(isValidVersionStr('0.10.1'), true);
        assert.strictEqual(isValidVersionStr('0.10.100'), true);
        assert.strictEqual(isValidVersionStr('0.11.0'), true);
        assert.strictEqual(isValidVersionStr('x.x.x'), true);
        assert.strictEqual(isValidVersionStr('0.x.x'), true);
        assert.strictEqual(isValidVersionStr('0.10.0'), true);
        assert.strictEqual(isValidVersionStr('0.10.x'), true);
        assert.strictEqual(isValidVersionStr('^0.10.0'), true);
        assert.strictEqual(isValidVersionStr('*'), true);
        assert.strictEqual(isValidVersionStr('0.x.x.x'), false);
        assert.strictEqual(isValidVersionStr('0.10'), false);
        assert.strictEqual(isValidVersionStr('0.10.'), false);
    });
    test('parseVersion', () => {
        function assertParseVersion(version, hasCaret, hasGreaterEquals, majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, preRelease) {
            const actual = parseVersion(version);
            const expected = { hasCaret, hasGreaterEquals, majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, preRelease };
            assert.deepStrictEqual(actual, expected, 'parseVersion for ' + version);
        }
        assertParseVersion('0.10.0-dev', false, false, 0, true, 10, true, 0, true, '-dev');
        assertParseVersion('0.10.0', false, false, 0, true, 10, true, 0, true, null);
        assertParseVersion('0.10.1', false, false, 0, true, 10, true, 1, true, null);
        assertParseVersion('0.10.100', false, false, 0, true, 10, true, 100, true, null);
        assertParseVersion('0.11.0', false, false, 0, true, 11, true, 0, true, null);
        assertParseVersion('x.x.x', false, false, 0, false, 0, false, 0, false, null);
        assertParseVersion('0.x.x', false, false, 0, true, 0, false, 0, false, null);
        assertParseVersion('0.10.x', false, false, 0, true, 10, true, 0, false, null);
        assertParseVersion('^0.10.0', true, false, 0, true, 10, true, 0, true, null);
        assertParseVersion('^0.10.2', true, false, 0, true, 10, true, 2, true, null);
        assertParseVersion('^1.10.2', true, false, 1, true, 10, true, 2, true, null);
        assertParseVersion('*', false, false, 0, false, 0, false, 0, false, null);
        assertParseVersion('>=0.0.1', false, true, 0, true, 0, true, 1, true, null);
        assertParseVersion('>=2.4.3', false, true, 2, true, 4, true, 3, true, null);
    });
    test('normalizeVersion', () => {
        function assertNormalizeVersion(version, majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, isMinimum, notBefore = 0) {
            const actual = normalizeVersion(parseVersion(version));
            const expected = { majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, isMinimum, notBefore };
            assert.deepStrictEqual(actual, expected, 'parseVersion for ' + version);
        }
        assertNormalizeVersion('0.10.0-dev', 0, true, 10, true, 0, true, false, 0);
        assertNormalizeVersion('0.10.0-222222222', 0, true, 10, true, 0, true, false, 0);
        assertNormalizeVersion('0.10.0-20210511', 0, true, 10, true, 0, true, false, new Date('2021-05-11T00:00:00Z').getTime());
        assertNormalizeVersion('0.10.0', 0, true, 10, true, 0, true, false);
        assertNormalizeVersion('0.10.1', 0, true, 10, true, 1, true, false);
        assertNormalizeVersion('0.10.100', 0, true, 10, true, 100, true, false);
        assertNormalizeVersion('0.11.0', 0, true, 11, true, 0, true, false);
        assertNormalizeVersion('x.x.x', 0, false, 0, false, 0, false, false);
        assertNormalizeVersion('0.x.x', 0, true, 0, false, 0, false, false);
        assertNormalizeVersion('0.10.x', 0, true, 10, true, 0, false, false);
        assertNormalizeVersion('^0.10.0', 0, true, 10, true, 0, false, false);
        assertNormalizeVersion('^0.10.2', 0, true, 10, true, 2, false, false);
        assertNormalizeVersion('^1.10.2', 1, true, 10, false, 2, false, false);
        assertNormalizeVersion('*', 0, false, 0, false, 0, false, false);
        assertNormalizeVersion('>=0.0.1', 0, true, 0, true, 1, true, true);
        assertNormalizeVersion('>=2.4.3', 2, true, 4, true, 3, true, true);
        assertNormalizeVersion('>=2.4.3', 2, true, 4, true, 3, true, true);
    });
    test('isValidVersion', () => {
        function testIsValidVersion(version, desiredVersion, expectedResult) {
            const actual = isValidVersion(version, productVersion, desiredVersion);
            assert.strictEqual(actual, expectedResult, 'extension - vscode: ' + version + ', desiredVersion: ' + desiredVersion + ' should be ' + expectedResult);
        }
        testIsValidVersion('0.10.0-dev', 'x.x.x', true);
        testIsValidVersion('0.10.0-dev', '0.x.x', true);
        testIsValidVersion('0.10.0-dev', '0.10.0', true);
        testIsValidVersion('0.10.0-dev', '0.10.2', false);
        testIsValidVersion('0.10.0-dev', '^0.10.2', false);
        testIsValidVersion('0.10.0-dev', '0.10.x', true);
        testIsValidVersion('0.10.0-dev', '^0.10.0', true);
        testIsValidVersion('0.10.0-dev', '*', true);
        testIsValidVersion('0.10.0-dev', '>=0.0.1', true);
        testIsValidVersion('0.10.0-dev', '>=0.0.10', true);
        testIsValidVersion('0.10.0-dev', '>=0.10.0', true);
        testIsValidVersion('0.10.0-dev', '>=0.10.1', false);
        testIsValidVersion('0.10.0-dev', '>=1.0.0', false);
        testIsValidVersion('0.10.0', 'x.x.x', true);
        testIsValidVersion('0.10.0', '0.x.x', true);
        testIsValidVersion('0.10.0', '0.10.0', true);
        testIsValidVersion('0.10.0', '0.10.2', false);
        testIsValidVersion('0.10.0', '^0.10.2', false);
        testIsValidVersion('0.10.0', '0.10.x', true);
        testIsValidVersion('0.10.0', '^0.10.0', true);
        testIsValidVersion('0.10.0', '*', true);
        testIsValidVersion('0.10.1', 'x.x.x', true);
        testIsValidVersion('0.10.1', '0.x.x', true);
        testIsValidVersion('0.10.1', '0.10.0', false);
        testIsValidVersion('0.10.1', '0.10.2', false);
        testIsValidVersion('0.10.1', '^0.10.2', false);
        testIsValidVersion('0.10.1', '0.10.x', true);
        testIsValidVersion('0.10.1', '^0.10.0', true);
        testIsValidVersion('0.10.1', '*', true);
        testIsValidVersion('0.10.100', 'x.x.x', true);
        testIsValidVersion('0.10.100', '0.x.x', true);
        testIsValidVersion('0.10.100', '0.10.0', false);
        testIsValidVersion('0.10.100', '0.10.2', false);
        testIsValidVersion('0.10.100', '^0.10.2', true);
        testIsValidVersion('0.10.100', '0.10.x', true);
        testIsValidVersion('0.10.100', '^0.10.0', true);
        testIsValidVersion('0.10.100', '*', true);
        testIsValidVersion('0.11.0', 'x.x.x', true);
        testIsValidVersion('0.11.0', '0.x.x', true);
        testIsValidVersion('0.11.0', '0.10.0', false);
        testIsValidVersion('0.11.0', '0.10.2', false);
        testIsValidVersion('0.11.0', '^0.10.2', false);
        testIsValidVersion('0.11.0', '0.10.x', false);
        testIsValidVersion('0.11.0', '^0.10.0', false);
        testIsValidVersion('0.11.0', '*', true);
        // Anything < 1.0.0 is compatible
        testIsValidVersion('1.0.0', 'x.x.x', true);
        testIsValidVersion('1.0.0', '0.x.x', true);
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '1.0.0', true);
        testIsValidVersion('1.0.0', '^1.0.0', true);
        testIsValidVersion('1.0.0', '^2.0.0', false);
        testIsValidVersion('1.0.0', '*', true);
        testIsValidVersion('1.0.0', '>=0.0.1', true);
        testIsValidVersion('1.0.0', '>=0.0.10', true);
        testIsValidVersion('1.0.0', '>=0.10.0', true);
        testIsValidVersion('1.0.0', '>=0.10.1', true);
        testIsValidVersion('1.0.0', '>=1.0.0', true);
        testIsValidVersion('1.0.0', '>=1.1.0', false);
        testIsValidVersion('1.0.0', '>=1.0.1', false);
        testIsValidVersion('1.0.0', '>=2.0.0', false);
        testIsValidVersion('1.0.100', 'x.x.x', true);
        testIsValidVersion('1.0.100', '0.x.x', true);
        testIsValidVersion('1.0.100', '0.10.0', false);
        testIsValidVersion('1.0.100', '0.10.2', false);
        testIsValidVersion('1.0.100', '^0.10.2', true);
        testIsValidVersion('1.0.100', '0.10.x', true);
        testIsValidVersion('1.0.100', '^0.10.0', true);
        testIsValidVersion('1.0.100', '1.0.0', false);
        testIsValidVersion('1.0.100', '^1.0.0', true);
        testIsValidVersion('1.0.100', '^1.0.1', true);
        testIsValidVersion('1.0.100', '^2.0.0', false);
        testIsValidVersion('1.0.100', '*', true);
        testIsValidVersion('1.100.0', 'x.x.x', true);
        testIsValidVersion('1.100.0', '0.x.x', true);
        testIsValidVersion('1.100.0', '0.10.0', false);
        testIsValidVersion('1.100.0', '0.10.2', false);
        testIsValidVersion('1.100.0', '^0.10.2', true);
        testIsValidVersion('1.100.0', '0.10.x', true);
        testIsValidVersion('1.100.0', '^0.10.0', true);
        testIsValidVersion('1.100.0', '1.0.0', false);
        testIsValidVersion('1.100.0', '^1.0.0', true);
        testIsValidVersion('1.100.0', '^1.1.0', true);
        testIsValidVersion('1.100.0', '^1.100.0', true);
        testIsValidVersion('1.100.0', '^2.0.0', false);
        testIsValidVersion('1.100.0', '*', true);
        testIsValidVersion('1.100.0', '>=1.99.0', true);
        testIsValidVersion('1.100.0', '>=1.100.0', true);
        testIsValidVersion('1.100.0', '>=1.101.0', false);
        testIsValidVersion('2.0.0', 'x.x.x', true);
        testIsValidVersion('2.0.0', '0.x.x', false);
        testIsValidVersion('2.0.0', '0.10.0', false);
        testIsValidVersion('2.0.0', '0.10.2', false);
        testIsValidVersion('2.0.0', '^0.10.2', false);
        testIsValidVersion('2.0.0', '0.10.x', false);
        testIsValidVersion('2.0.0', '^0.10.0', false);
        testIsValidVersion('2.0.0', '1.0.0', false);
        testIsValidVersion('2.0.0', '^1.0.0', false);
        testIsValidVersion('2.0.0', '^1.1.0', false);
        testIsValidVersion('2.0.0', '^1.100.0', false);
        testIsValidVersion('2.0.0', '^2.0.0', true);
        testIsValidVersion('2.0.0', '*', true);
    });
    test('isValidExtensionVersion', () => {
        function testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, expectedResult) {
            const manifest = {
                name: 'test',
                publisher: 'test',
                version: '0.0.0',
                engines: {
                    vscode: desiredVersion
                },
                main: hasMain ? 'something' : undefined
            };
            const reasons = [];
            const actual = isValidExtensionVersion(version, productVersion, manifest, isBuiltin, reasons);
            assert.strictEqual(actual, expectedResult, 'version: ' + version + ', desiredVersion: ' + desiredVersion + ', desc: ' + JSON.stringify(manifest) + ', reasons: ' + JSON.stringify(reasons));
        }
        function testIsInvalidExtensionVersion(version, desiredVersion, isBuiltin, hasMain) {
            testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, false);
        }
        function testIsValidExtensionVersion(version, desiredVersion, isBuiltin, hasMain) {
            testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, true);
        }
        function testIsValidVersion(version, desiredVersion, expectedResult) {
            testExtensionVersion(version, desiredVersion, false, true, expectedResult);
        }
        // builtin are allowed to use * or x.x.x
        testIsValidExtensionVersion('0.10.0-dev', '*', true, true);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', true, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', true, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '*', true, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', true, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', true, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', true, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', true, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', true, false);
        // normal extensions are allowed to use * or x.x.x only if they have no main
        testIsInvalidExtensionVersion('0.10.0-dev', '*', false, true);
        testIsInvalidExtensionVersion('0.10.0-dev', 'x.x.x', false, true);
        testIsInvalidExtensionVersion('0.10.0-dev', '0.x.x', false, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, true);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        // extensions without "main" get no version check
        testIsValidExtensionVersion('0.10.0-dev', '>=0.9.1-pre.1', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        // normal extensions with code
        testIsValidVersion('0.10.0-dev', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0-dev', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0-dev', '0.10.0', true);
        testIsValidVersion('0.10.0-dev', '0.10.2', false);
        testIsValidVersion('0.10.0-dev', '^0.10.2', false);
        testIsValidVersion('0.10.0-dev', '0.10.x', true);
        testIsValidVersion('0.10.0-dev', '^0.10.0', true);
        testIsValidVersion('0.10.0-dev', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', '0.10.0', true);
        testIsValidVersion('0.10.0', '0.10.2', false);
        testIsValidVersion('0.10.0', '^0.10.2', false);
        testIsValidVersion('0.10.0', '0.10.x', true);
        testIsValidVersion('0.10.0', '^0.10.0', true);
        testIsValidVersion('0.10.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', '0.10.0', false);
        testIsValidVersion('0.10.1', '0.10.2', false);
        testIsValidVersion('0.10.1', '^0.10.2', false);
        testIsValidVersion('0.10.1', '0.10.x', true);
        testIsValidVersion('0.10.1', '^0.10.0', true);
        testIsValidVersion('0.10.1', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', '0.10.0', false);
        testIsValidVersion('0.10.100', '0.10.2', false);
        testIsValidVersion('0.10.100', '^0.10.2', true);
        testIsValidVersion('0.10.100', '0.10.x', true);
        testIsValidVersion('0.10.100', '^0.10.0', true);
        testIsValidVersion('0.10.100', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', '0.10.0', false);
        testIsValidVersion('0.11.0', '0.10.2', false);
        testIsValidVersion('0.11.0', '^0.10.2', false);
        testIsValidVersion('0.11.0', '0.10.x', false);
        testIsValidVersion('0.11.0', '^0.10.0', false);
        testIsValidVersion('0.11.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.10.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.10.0', '1.x.x', true);
        testIsValidVersion('1.10.0', '1.10.0', true);
        testIsValidVersion('1.10.0', '1.10.2', false);
        testIsValidVersion('1.10.0', '^1.10.2', false);
        testIsValidVersion('1.10.0', '1.10.x', true);
        testIsValidVersion('1.10.0', '^1.10.0', true);
        testIsValidVersion('1.10.0', '*', false); // fails due to lack of specificity
        // Anything < 1.0.0 is compatible
        testIsValidVersion('1.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '1.0.0', true);
        testIsValidVersion('1.0.0', '^1.0.0', true);
        testIsValidVersion('1.0.0', '^2.0.0', false);
        testIsValidVersion('1.0.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', '0.10.0', false);
        testIsValidVersion('1.0.100', '0.10.2', false);
        testIsValidVersion('1.0.100', '^0.10.2', true);
        testIsValidVersion('1.0.100', '0.10.x', true);
        testIsValidVersion('1.0.100', '^0.10.0', true);
        testIsValidVersion('1.0.100', '1.0.0', false);
        testIsValidVersion('1.0.100', '^1.0.0', true);
        testIsValidVersion('1.0.100', '^1.0.1', true);
        testIsValidVersion('1.0.100', '^2.0.0', false);
        testIsValidVersion('1.0.100', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', '0.10.0', false);
        testIsValidVersion('1.100.0', '0.10.2', false);
        testIsValidVersion('1.100.0', '^0.10.2', true);
        testIsValidVersion('1.100.0', '0.10.x', true);
        testIsValidVersion('1.100.0', '^0.10.0', true);
        testIsValidVersion('1.100.0', '1.0.0', false);
        testIsValidVersion('1.100.0', '^1.0.0', true);
        testIsValidVersion('1.100.0', '^1.1.0', true);
        testIsValidVersion('1.100.0', '^1.100.0', true);
        testIsValidVersion('1.100.0', '^2.0.0', false);
        testIsValidVersion('1.100.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', '0.10.0', false);
        testIsValidVersion('2.0.0', '0.10.2', false);
        testIsValidVersion('2.0.0', '^0.10.2', false);
        testIsValidVersion('2.0.0', '0.10.x', false);
        testIsValidVersion('2.0.0', '^0.10.0', false);
        testIsValidVersion('2.0.0', '1.0.0', false);
        testIsValidVersion('2.0.0', '^1.0.0', false);
        testIsValidVersion('2.0.0', '^1.1.0', false);
        testIsValidVersion('2.0.0', '^1.100.0', false);
        testIsValidVersion('2.0.0', '^2.0.0', true);
        testIsValidVersion('2.0.0', '*', false); // fails due to lack of specificity
        // date tags
        testIsValidVersion('1.10.0', '^1.10.0-20210511', true); // current date
        testIsValidVersion('1.10.0', '^1.10.0-20210510', true); // before date
        testIsValidVersion('1.10.0', '^1.10.0-20210512', false); // future date
        testIsValidVersion('1.10.1', '^1.10.0-20200101', true); // before date, but ahead version
        testIsValidVersion('1.11.0', '^1.10.0-20200101', true);
    });
    test('isValidExtensionVersion checks browser only extensions', () => {
        const manifest = {
            name: 'test',
            publisher: 'test',
            version: '0.0.0',
            engines: {
                vscode: '^1.45.0'
            },
            browser: 'something'
        };
        assert.strictEqual(isValidExtensionVersion('1.44.0', undefined, manifest, false, []), false);
    });
    test('areApiProposalsCompatible', () => {
        assert.strictEqual(areApiProposalsCompatible([]), true);
        assert.strictEqual(areApiProposalsCompatible([], ['hello']), true);
        assert.strictEqual(areApiProposalsCompatible([], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { 'proposal1': { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { 'proposal1': { proposal: '', version: 1 } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { 'proposal1': { proposal: '', version: 1 } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { 'proposal2': { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1', 'proposal2'], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1', 'proposal2'], { 'proposal1': { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal2@1'], { 'proposal1': { proposal: '' } }), false);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { 'proposal1': { proposal: '', version: 2 } }), false);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { 'proposal1': { proposal: '' } }), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9ucy90ZXN0L2NvbW1vbi9leHRlbnNpb25WYWxpZGF0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFzQyx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFL00sS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUV6Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sY0FBYyxHQUFHLDBCQUEwQixDQUFDO0lBRWxELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsU0FBUyxrQkFBa0IsQ0FBQyxPQUFlLEVBQUUsUUFBaUIsRUFBRSxnQkFBeUIsRUFBRSxTQUFpQixFQUFFLGNBQXVCLEVBQUUsU0FBaUIsRUFBRSxjQUF1QixFQUFFLFNBQWlCLEVBQUUsY0FBdUIsRUFBRSxVQUF5QjtZQUN2UCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckMsTUFBTSxRQUFRLEdBQW1CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBRTdKLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsa0JBQWtCLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkYsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakYsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFN0Usa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Usa0JBQWtCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLFNBQVMsc0JBQXNCLENBQUMsT0FBZSxFQUFFLFNBQWlCLEVBQUUsY0FBdUIsRUFBRSxTQUFpQixFQUFFLGNBQXVCLEVBQUUsU0FBaUIsRUFBRSxjQUF1QixFQUFFLFNBQWtCLEVBQUUsU0FBUyxHQUFHLENBQUM7WUFDck4sTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdkQsTUFBTSxRQUFRLEdBQXVCLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQy9JLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsc0JBQXNCLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxzQkFBc0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakYsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUV6SCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEUsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckUsc0JBQXNCLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFL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SyxDQUFDLENBQUM7UUFDakUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakUsNEVBQTRFO1FBQzVFLDZCQUE2QixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlELDZCQUE2QixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xFLDZCQUE2QixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdELDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxFLGlEQUFpRDtRQUNqRCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRSw4QkFBOEI7UUFDOUIsa0JBQWtCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMs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