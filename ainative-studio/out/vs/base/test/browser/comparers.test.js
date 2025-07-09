/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compareFileExtensions, compareFileExtensionsDefault, compareFileExtensionsLower, compareFileExtensionsUnicode, compareFileExtensionsUpper, compareFileNames, compareFileNamesDefault, compareFileNamesLower, compareFileNamesUnicode, compareFileNamesUpper } from '../../common/comparers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
const compareLocale = (a, b) => a.localeCompare(b);
const compareLocaleNumeric = (a, b) => a.localeCompare(b, undefined, { numeric: true });
suite('Comparers', () => {
    test('compareFileNames', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNames(null, null) === 0, 'null should be equal');
        assert(compareFileNames(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNames('', '') === 0, 'empty should be equal');
        assert(compareFileNames('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNames('z', 'A') > 0, 'z comes after A');
        assert(compareFileNames('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNames('bbb.aaa', 'aaa.bbb') > 0, 'compares the whole name all at once by locale');
        assert(compareFileNames('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole name all at once by locale');
        // dotfile comparisons
        assert(compareFileNames('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNames('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNames('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNames('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNames('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNames(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNames('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNames('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNames('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNames('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNames('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNames('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNames('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNames('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNames('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNames('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNames('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted in name order');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNames), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNames('a', 'A') !== compareLocale('a', 'A'), 'the same letter sorts in unicode order, not by locale');
        assert(compareFileNames('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter sorts in unicode order, not by locale');
        assert.notDeepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNames), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
        assert.notDeepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNames), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same base characters with different case or accents do not sort in locale order');
        // numeric comparisons
        assert(compareFileNames('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileNames('abc.txt1', 'abc.txt01') > 0, 'same name plus extensions with equal numbers sort in unicode order');
        assert(compareFileNames('art01', 'Art01') !== 'art01'.localeCompare('Art01', undefined, { numeric: true }), 'a numerically equivalent word of a different case does not compare numerically based on locale');
        assert(compareFileNames('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in full filename unicode order');
    });
    test('compareFileExtensions', () => {
        //
        // Comparisons with the same results as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensions(null, null) === 0, 'null should be equal');
        assert(compareFileExtensions(null, 'abc') < 0, 'null should come before real files without extension');
        assert(compareFileExtensions('', '') === 0, 'empty should be equal');
        assert(compareFileExtensions('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensions('z', 'A') > 0, 'z comes after A');
        assert(compareFileExtensions('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensions('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileExtensions('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensions('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensions('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extensions even if filenames compare differently');
        // dotfile comparisons
        assert(compareFileExtensions('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensions('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensions(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensions('.env', 'aaa.env') < 0, 'if equal extensions, filenames should be compared, empty filename should come before others');
        assert(compareFileExtensions('.MD', 'a.md') < 0, 'if extensions differ in case, files sort by extension in unicode order');
        // numeric comparisons
        assert(compareFileExtensions('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensions('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensions('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensions('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensions('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensions('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensions('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensions('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, names should be compared');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensions), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results from compareFileExtensionsDefault
        //
        // name-only comparisions
        assert(compareFileExtensions('a', 'A') !== compareLocale('a', 'A'), 'the same letter of different case does not sort by locale');
        assert(compareFileExtensions('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter of different case does not sort by locale');
        assert.notDeepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensions), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
        assert.notDeepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensions), ['email', 'Email', 'émail', 'Émail'].sort((a, b) => a.localeCompare(b)), 'the same base characters with different case or accents do not sort in locale order');
        // name plus extension comparisons
        assert(compareFileExtensions('a.MD', 'a.md') < 0, 'case differences in extensions sort in unicode order');
        assert(compareFileExtensions('a.md', 'A.md') > 0, 'case differences in names sort in unicode order');
        assert(compareFileExtensions('a.md', 'b.MD') > 0, 'when extensions are the same except for case, the files sort by extension');
        assert(compareFileExtensions('aggregate.go', 'aggregate_repo.go') < 0, 'when extensions are equal, names sort in dictionary order');
        // dotfile comparisons
        assert(compareFileExtensions('.env', '.aaa.env') < 0, 'a dotfile with an extension is treated as a name plus an extension - equal extensions');
        assert(compareFileExtensions('.env', '.env.aaa') > 0, 'a dotfile with an extension is treated as a name plus an extension - unequal extensions');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensions('.env', 'aaa') > 0, 'filenames without extensions come before dotfiles');
        assert(compareFileExtensions('.md', 'A.MD') > 0, 'a file with an uppercase extension sorts before a dotfile of the same lowercase extension');
        // numeric comparisons
        assert(compareFileExtensions('abc.txt01', 'abc.txt1') < 0, 'extensions with equal numbers sort in unicode order');
        assert(compareFileExtensions('art01', 'Art01') !== compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case does not compare by locale');
        assert(compareFileExtensions('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileExtensions('txt.abc01', 'txt.abc1') < 0, 'extensions with equivalent numbers sort in unicode order');
        assert(compareFileExtensions('a.ext1', 'b.Ext1') > 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted in extension unicode order');
        assert(compareFileExtensions('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in extension unicode order');
    });
    test('compareFileNamesDefault', () => {
        //
        // Comparisons with the same results as compareFileNames
        //
        // name-only comparisons
        assert(compareFileNamesDefault(null, null) === 0, 'null should be equal');
        assert(compareFileNamesDefault(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesDefault('', '') === 0, 'empty should be equal');
        assert(compareFileNamesDefault('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesDefault('z', 'A') > 0, 'z comes after A');
        assert(compareFileNamesDefault('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNamesDefault('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesDefault('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesDefault('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesDefault('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesDefault('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole filename in locale order');
        // dotfile comparisons
        assert(compareFileNamesDefault('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesDefault('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesDefault('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesDefault(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesDefault('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesDefault('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesDefault('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesDefault('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesDefault('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesDefault('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesDefault('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesDefault('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesDefault('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesDefault('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesDefault('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are compared by full filename');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesDefault), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileNames
        //
        // name-only comparisons
        assert(compareFileNamesDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter sorts by locale');
        assert(compareFileNamesDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter sorts by locale');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesDefault), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same base characters with different case or accents sort in locale order');
        // numeric comparisons
        assert(compareFileNamesDefault('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesDefault('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically based on locale');
        assert(compareFileNamesDefault('a.ext1', 'a.Ext1') === compareLocale('ext1', 'Ext1'), 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in extension locale order');
    });
    test('compareFileExtensionsDefault', () => {
        //
        // Comparisons with the same result as compareFileExtensions
        //
        // name-only comparisons
        assert(compareFileExtensionsDefault(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsDefault(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsDefault('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsDefault('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsDefault('z', 'A') > 0, 'z comes after A');
        assert(compareFileExtensionsDefault('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensionsDefault('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsDefault('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsDefault('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsDefault('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        // dotfile comparisons
        assert(compareFileExtensionsDefault('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsDefault('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsDefault(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsDefault('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsDefault('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileExtensionsDefault('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsDefault('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsDefault('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsDefault('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsDefault('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsDefault('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsDefault('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsDefault('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsDefault), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileExtensions
        //
        // name-only comparisons
        assert(compareFileExtensionsDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter of different case sorts by locale');
        assert(compareFileExtensionsDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter of different case sorts by locale');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsDefault), ['email', 'Email', 'émail', 'Émail'].sort((a, b) => a.localeCompare(b)), 'the same base characters with different case or accents sort in locale order');
        // name plus extension comparisons
        assert(compareFileExtensionsDefault('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        assert(compareFileExtensionsDefault('a.md', 'A.md') === compareLocale('a', 'A'), 'case differences in names sort by locale');
        assert(compareFileExtensionsDefault('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsDefault('aggregate.go', 'aggregate_repo.go') > 0, 'names with the same extension sort in full filename locale order');
        // dotfile comparisons
        assert(compareFileExtensionsDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsDefault('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsDefault('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsDefault('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically based on locale');
        assert(compareFileExtensionsDefault('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsDefault('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsDefault('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, full filenames should be compared');
        assert(compareFileExtensionsDefault('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'if extensions with numbers are equal except for case, full filenames are compared in locale order');
    });
    test('compareFileNamesUpper', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUpper(null, null) === 0, 'null should be equal');
        assert(compareFileNamesUpper(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesUpper('', '') === 0, 'empty should be equal');
        assert(compareFileNamesUpper('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesUpper('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileNamesUpper('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesUpper('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesUpper('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesUpper('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesUpper('aggregate.go', 'aggregate_repo.go') > 0, 'compares the full filename in locale order');
        // dotfile comparisons
        assert(compareFileNamesUpper('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesUpper('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesUpper('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesUpper('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesUpper('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesUpper(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesUpper('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesUpper('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesUpper('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesUpper('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesUpper('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesUpper('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesUpper('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesUpper('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesUpper('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesUpper('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesUpper('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesUpper('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesUpper('a.ext1', 'b.Ext1') < 0, 'different names with the equal extensions except for case are sorted by full filename');
        assert(compareFileNamesUpper('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'same names with equal and extensions except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUpper('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileNamesUpper('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileNamesUpper('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesUpper), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesUpper), ['Email', 'Émail', 'email', 'émail'], 'the same base characters with different case or accents sort uppercase first');
        // numeric comparisons
        assert(compareFileNamesUpper('art01', 'Art01') > 0, 'a numerically equivalent name of a different case compares uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesUpper), ['A2.txt', 'A100.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences group by case then compare by number');
    });
    test('compareFileExtensionsUpper', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUpper(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsUpper(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsUpper('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsUpper('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsUpper('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileExtensionsUpper('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsUpper('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsUpper('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsUpper('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsUpper('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsUpper('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        assert(compareFileExtensionsUpper('aggregate.go', 'aggregate_repo.go') > 0, 'when extensions are equal, compares the full filename');
        // dotfile comparisons
        assert(compareFileExtensionsUpper('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsUpper('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsUpper('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsUpper('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsUpper(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsUpper('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsUpper('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsUpper('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsUpper('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsUpper('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsUpper('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsUpper('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsUpper('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsUpper('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsUpper('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsUpper('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsUpper('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert(compareFileExtensionsUpper('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsUpper('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsUpper('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsUpper('a.ext1', 'b.Ext1') < 0, 'different names and extensions that are equal except for case are sorted in full filename order');
        assert(compareFileExtensionsUpper('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'b.Ext1'), 'same names and extensions that are equal except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUpper('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileExtensionsUpper('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileExtensionsUpper('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsUpper), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsUpper), ['Email', 'Émail', 'email', 'émail'], 'the same base characters with different case or accents sort uppercase names first');
        // name plus extension comparisons
        assert(compareFileExtensionsUpper('a.md', 'A.md') > 0, 'case differences in names sort uppercase first');
        assert(compareFileExtensionsUpper('art01', 'Art01') > 0, 'a numerically equivalent word of a different case sorts uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsUpper), ['A2.txt', 'A100.txt', 'a10.txt', 'a20.txt',], 'filenames with number and case differences group by case then sort by number');
    });
    test('compareFileNamesLower', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesLower(null, null) === 0, 'null should be equal');
        assert(compareFileNamesLower(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesLower('', '') === 0, 'empty should be equal');
        assert(compareFileNamesLower('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesLower('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNamesLower('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesLower('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesLower('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesLower('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesLower('aggregate.go', 'aggregate_repo.go') > 0, 'compares full filenames');
        // dotfile comparisons
        assert(compareFileNamesLower('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesLower('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesLower('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesLower('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesLower('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesLower(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesLower('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesLower('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesLower('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesLower('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesLower('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesLower('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesLower('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesLower('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesLower('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesLower('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesLower('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesLower('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesLower('a.ext1', 'b.Ext1') < 0, 'different names and extensions that are equal except for case are sorted in full filename order');
        assert(compareFileNamesLower('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'b.Ext1'), 'same names and extensions that are equal except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesLower('z', 'A') < 0, 'z comes before A');
        assert(compareFileNamesLower('a', 'A') < 0, 'the same letter sorts lowercase first');
        assert(compareFileNamesLower('â', 'Â') < 0, 'the same accented letter sorts lowercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesLower), ['art', 'artichoke', 'Art', 'Artichoke'], 'names with the same root and different cases sort lowercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesLower), ['email', 'émail', 'Email', 'Émail'], 'the same base characters with different case or accents sort lowercase first');
        // numeric comparisons
        assert(compareFileNamesLower('art01', 'Art01') < 0, 'a numerically equivalent name of a different case compares lowercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesLower), ['a10.txt', 'a20.txt', 'A2.txt', 'A100.txt'], 'filenames with number and case differences group by case then compare by number');
    });
    test('compareFileExtensionsLower', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsLower(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsLower(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsLower('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsLower('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsLower('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensionsLower('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsLower('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsLower('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsLower('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsLower('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsLower('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        // dotfile comparisons
        assert(compareFileExtensionsLower('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsLower('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsLower('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsLower('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsLower(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsLower('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsLower('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsLower('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsLower('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsLower('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsLower('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsLower('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsLower('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsLower('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsLower('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsLower('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsLower('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert(compareFileExtensionsLower('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsLower('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsLower('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsLower('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, full filenames should be compared');
        assert(compareFileExtensionsLower('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'if extensions with numbers are equal except for case, filenames are sorted in locale order');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsLower('z', 'A') < 0, 'z comes before A');
        assert(compareFileExtensionsLower('a', 'A') < 0, 'the same letter sorts lowercase first');
        assert(compareFileExtensionsLower('â', 'Â') < 0, 'the same accented letter sorts lowercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsLower), ['art', 'artichoke', 'Art', 'Artichoke'], 'names with the same root and different cases sort lowercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsLower), ['email', 'émail', 'Email', 'Émail'], 'the same base characters with different case or accents sort lowercase names first');
        // name plus extension comparisons
        assert(compareFileExtensionsLower('a.md', 'A.md') < 0, 'case differences in names sort lowercase first');
        assert(compareFileExtensionsLower('art01', 'Art01') < 0, 'a numerically equivalent word of a different case sorts lowercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsLower), ['a10.txt', 'a20.txt', 'A2.txt', 'A100.txt'], 'filenames with number and case differences group by case then sort by number');
        assert(compareFileExtensionsLower('aggregate.go', 'aggregate_repo.go') > 0, 'when extensions are equal, compares full filenames');
    });
    test('compareFileNamesUnicode', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUnicode(null, null) === 0, 'null should be equal');
        assert(compareFileNamesUnicode(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesUnicode('', '') === 0, 'empty should be equal');
        assert(compareFileNamesUnicode('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesUnicode('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileNamesUnicode('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesUnicode('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesUnicode('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesUnicode('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        // dotfile comparisons
        assert(compareFileNamesUnicode('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesUnicode('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesUnicode('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesUnicode('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesUnicode(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesUnicode('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesUnicode('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesUnicode('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesUnicode('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesUnicode('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesUnicode('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesUnicode('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesUnicode('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted by unicode full filename');
        assert(compareFileNamesUnicode('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted by unicode full filename');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUnicode('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileNamesUnicode('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileNamesUnicode('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesUnicode), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesUnicode), ['Email', 'email', 'Émail', 'émail'], 'the same base characters with different case or accents sort in unicode order');
        // name plus extension comparisons
        assert(compareFileNamesUnicode('aggregate.go', 'aggregate_repo.go') < 0, 'compares the whole name in unicode order, but dot comes before underscore');
        // dotfile comparisons
        assert(compareFileNamesUnicode('.aaa_env', '.aaa.env') > 0, 'an underscore in a dotfile name will sort after a dot');
        // numeric comparisons
        assert(compareFileNamesUnicode('abc2.txt', 'abc10.txt') > 0, 'filenames with numbers should be in unicode order even when they are multiple digits long');
        assert(compareFileNamesUnicode('abc02.txt', 'abc010.txt') > 0, 'filenames with numbers that have leading zeros sort in unicode order');
        assert(compareFileNamesUnicode('abc1.10.txt', 'abc1.2.txt') < 0, 'numbers with dots between them are sorted in unicode order');
        assert(compareFileNamesUnicode('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileNamesUnicode('abc.txt1', 'abc.txt01') > 0, 'same name plus extensions with equal numbers sort in unicode order');
        assert(compareFileNamesUnicode('art01', 'Art01') > 0, 'a numerically equivalent name of a different case compares uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesUnicode), ['A100.txt', 'A2.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences sort in unicode order');
    });
    test('compareFileExtensionsUnicode', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUnicode(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsUnicode(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsUnicode('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsUnicode('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsUnicode('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileExtensionsUnicode('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsUnicode('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsUnicode('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsUnicode('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsUnicode('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsUnicode('a.MD', 'a.md') < 0, 'case differences in extensions sort in unicode order');
        // dotfile comparisons
        assert(compareFileExtensionsUnicode('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsUnicode('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsUnicode('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsUnicode('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsUnicode(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsUnicode('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsUnicode('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsUnicode('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsUnicode('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsUnicode('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsUnicode('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsUnicode('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUnicode('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsUnicode('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUnicode('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUnicode('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileExtensionsUnicode('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileExtensionsUnicode('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsUnicode), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsUnicode), ['Email', 'email', 'Émail', 'émail'], 'the same base characters with different case or accents sort in unicode order');
        // name plus extension comparisons
        assert(compareFileExtensionsUnicode('a.MD', 'a.md') < 0, 'case differences in extensions sort by uppercase extension first');
        assert(compareFileExtensionsUnicode('a.md', 'A.md') > 0, 'case differences in names sort uppercase first');
        assert(compareFileExtensionsUnicode('art01', 'Art01') > 0, 'a numerically equivalent name of a different case sorts uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsUnicode), ['A100.txt', 'A2.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences sort in unicode order');
        assert(compareFileExtensionsUnicode('aggregate.go', 'aggregate_repo.go') < 0, 'when extensions are equal, compares full filenames in unicode order');
        // numeric comparisons
        assert(compareFileExtensionsUnicode('abc2.txt', 'abc10.txt') > 0, 'filenames with numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('abc02.txt', 'abc010.txt') > 0, 'filenames with numbers that have leading zeros sort in unicode order');
        assert(compareFileExtensionsUnicode('abc1.10.txt', 'abc1.2.txt') < 0, 'numbers with dots between them sort in unicode order');
        assert(compareFileExtensionsUnicode('abc2.txt2', 'abc1.txt10') > 0, 'extensions with numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('txt.abc2', 'txt.abc10') > 0, 'extensions with numbers should be in unicode order even when they are multiple digits long');
        assert(compareFileExtensionsUnicode('abc.txt01', 'abc.txt1') < 0, 'extensions with equal numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileExtensionsUnicode('txt.abc01', 'txt.abc1') < 0, 'extensions with equivalent numbers sort in unicode order');
        assert(compareFileExtensionsUnicode('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, unicode full filenames should be compared');
        assert(compareFileExtensionsUnicode('a.ext1', 'a.Ext1') > 0, 'if extensions with numbers are equal except for case, unicode full filenames should be compared');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvY29tcGFyZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFDTixxQkFBcUIsRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxxQkFBcUIsRUFDM1AsTUFBTSwyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3RSxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBRXhHLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBRXZCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFFN0IsRUFBRTtRQUNGLCtEQUErRDtRQUMvRCxFQUFFO1FBRUYsd0JBQXdCO1FBQ3hCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFB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