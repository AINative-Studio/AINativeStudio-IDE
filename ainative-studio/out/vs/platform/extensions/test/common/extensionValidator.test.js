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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvdGVzdC9jb21tb24vZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBc0MsdUJBQXVCLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRS9NLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFFekMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLGNBQWMsR0FBRywwQkFBMEIsQ0FBQztJQUVsRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV0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LE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlFLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdFLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdFLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdFLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTFFLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVFLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixTQUFTLHNCQUFzQixDQUFDLE9BQWUsRUFBRSxTQUFpQixFQUFFLGNBQXVCLEVBQUUsU0FBaUIsRUFBRSxjQUF1QixFQUFFLFNBQWlCLEVBQUUsY0FBdUIsRUFBRSxTQUFrQixFQUFFLFNBQVMsR0FBRyxDQUFDO1lBQ3JOLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sUUFBUSxHQUF1QixFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUMvSSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVELHNCQUFzQixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0Usc0JBQXNCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLHNCQUFzQixDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFekgsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXBFLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUs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QzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztR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LEtBQUssQ0FBQyxDQUFDO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWpFLDRFQUE0RTtRQUM1RSw2QkFBNkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCw2QkFBNkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRSw2QkFBNkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFL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