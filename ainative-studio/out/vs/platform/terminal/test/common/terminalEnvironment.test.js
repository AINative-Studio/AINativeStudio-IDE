/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { OS } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { collapseTildePath, sanitizeCwd } from '../../common/terminalEnvironment.js';
suite('terminalEnvironment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('collapseTildePath', () => {
        test('should return empty string for a falsy path', () => {
            strictEqual(collapseTildePath('', '/foo', '/'), '');
            strictEqual(collapseTildePath(undefined, '/foo', '/'), '');
        });
        test('should return path for a falsy user home', () => {
            strictEqual(collapseTildePath('/foo', '', '/'), '/foo');
            strictEqual(collapseTildePath('/foo', undefined, '/'), '/foo');
        });
        test('should not collapse when user home isn\'t present', () => {
            strictEqual(collapseTildePath('/foo', '/bar', '/'), '/foo');
            strictEqual(collapseTildePath('C:\\foo', 'C:\\bar', '\\'), 'C:\\foo');
        });
        test('should collapse with Windows separators', () => {
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo\\', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo\\', '\\'), '~\\bar\\baz');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse mixed case with Windows separators', () => {
            strictEqual(collapseTildePath('c:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'c:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse with Posix separators', () => {
            strictEqual(collapseTildePath('/foo/bar', '/foo', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar', '/foo/', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo', '/'), '~/bar/baz');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo/', '/'), '~/bar/baz');
        });
    });
    suite('sanitizeCwd', () => {
        if (OS === 1 /* OperatingSystem.Windows */) {
            test('should make the Windows drive letter uppercase', () => {
                strictEqual(sanitizeCwd('c:\\foo\\bar'), 'C:\\foo\\bar');
            });
        }
        test('should remove any wrapping quotes', () => {
            strictEqual(sanitizeCwd('\'/foo/bar\''), '/foo/bar');
            strictEqual(sanitizeCwd('"/foo/bar"'), '/foo/bar');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL3Rlcm1pbmFsRW52aXJvbm1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3JDLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJGLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7WUFDeEQsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEQsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ3JELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxF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