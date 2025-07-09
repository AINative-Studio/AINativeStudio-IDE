/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compareItemsByFuzzyScore, pieceToQuery, prepareQuery, scoreFuzzy, scoreFuzzy2, scoreItemFuzzy } from '../../common/fuzzyScorer.js';
import { Schemas } from '../../common/network.js';
import { basename, dirname, posix, sep, win32 } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
class ResourceAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return dirname(resource.fsPath);
    }
    getItemPath(resource) {
        return resource.fsPath;
    }
}
const ResourceAccessor = new ResourceAccessorClass();
class ResourceWithSlashAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return posix.normalize(dirname(resource.path));
    }
    getItemPath(resource) {
        return posix.normalize(resource.path);
    }
}
const ResourceWithSlashAccessor = new ResourceWithSlashAccessorClass();
class ResourceWithBackslashAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return win32.normalize(dirname(resource.path));
    }
    getItemPath(resource) {
        return win32.normalize(resource.path);
    }
}
const ResourceWithBackslashAccessor = new ResourceWithBackslashAccessorClass();
class NullAccessorClass {
    getItemLabel(resource) {
        return undefined;
    }
    getItemDescription(resource) {
        return undefined;
    }
    getItemPath(resource) {
        return undefined;
    }
}
function _doScore(target, query, allowNonContiguousMatches) {
    const preparedQuery = prepareQuery(query);
    return scoreFuzzy(target, preparedQuery.normalized, preparedQuery.normalizedLowercase, allowNonContiguousMatches ?? !preparedQuery.expectContiguousMatch);
}
function _doScore2(target, query, matchOffset = 0) {
    const preparedQuery = prepareQuery(query);
    return scoreFuzzy2(target, preparedQuery, 0, matchOffset);
}
function scoreItem(item, query, allowNonContiguousMatches, accessor, cache = Object.create(null)) {
    return scoreItemFuzzy(item, prepareQuery(query), allowNonContiguousMatches, accessor, cache);
}
function compareItemsByScore(itemA, itemB, query, allowNonContiguousMatches, accessor) {
    return compareItemsByFuzzyScore(itemA, itemB, prepareQuery(query), allowNonContiguousMatches, accessor, Object.create(null));
}
const NullAccessor = new NullAccessorClass();
suite('Fuzzy Scorer', () => {
    test('score (fuzzy)', function () {
        const target = 'HelLo-World';
        const scores = [];
        scores.push(_doScore(target, 'HelLo-World', true)); // direct case match
        scores.push(_doScore(target, 'hello-world', true)); // direct mix-case match
        scores.push(_doScore(target, 'HW', true)); // direct case prefix (multiple)
        scores.push(_doScore(target, 'hw', true)); // direct mix-case prefix (multiple)
        scores.push(_doScore(target, 'H', true)); // direct case prefix
        scores.push(_doScore(target, 'h', true)); // direct mix-case prefix
        scores.push(_doScore(target, 'W', true)); // direct case word prefix
        scores.push(_doScore(target, 'Ld', true)); // in-string case match (multiple)
        scores.push(_doScore(target, 'ld', true)); // in-string mix-case match (consecutive, avoids scattered hit)
        scores.push(_doScore(target, 'w', true)); // direct mix-case word prefix
        scores.push(_doScore(target, 'L', true)); // in-string case match
        scores.push(_doScore(target, 'l', true)); // in-string mix-case match
        scores.push(_doScore(target, '4', true)); // no match
        // Assert scoring order
        const sortedScores = scores.concat().sort((a, b) => b[0] - a[0]);
        assert.deepStrictEqual(scores, sortedScores);
        // Assert scoring positions
        // let positions = scores[0][1];
        // assert.strictEqual(positions.length, 'HelLo-World'.length);
        // positions = scores[2][1];
        // assert.strictEqual(positions.length, 'HW'.length);
        // assert.strictEqual(positions[0], 0);
        // assert.strictEqual(positions[1], 6);
    });
    test('score (non fuzzy)', function () {
        const target = 'HelLo-World';
        assert.ok(_doScore(target, 'HelLo-World', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'HelLo-World', false)[1].length, 'HelLo-World'.length);
        assert.ok(_doScore(target, 'hello-world', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'HW', false)[0], 0);
        assert.ok(_doScore(target, 'h', false)[0] > 0);
        assert.ok(_doScore(target, 'ello', false)[0] > 0);
        assert.ok(_doScore(target, 'ld', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'eo', false)[0], 0);
    });
    test('scoreItem - matches are proper', function () {
        let res = scoreItem(null, 'something', true, ResourceAccessor);
        assert.ok(!res.score);
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        res = scoreItem(resource, 'something', true, NullAccessor);
        assert.ok(!res.score);
        // Path Identity
        const identityRes = scoreItem(resource, ResourceAccessor.getItemPath(resource), true, ResourceAccessor);
        assert.ok(identityRes.score);
        assert.strictEqual(identityRes.descriptionMatch.length, 1);
        assert.strictEqual(identityRes.labelMatch.length, 1);
        assert.strictEqual(identityRes.descriptionMatch[0].start, 0);
        assert.strictEqual(identityRes.descriptionMatch[0].end, ResourceAccessor.getItemDescription(resource).length);
        assert.strictEqual(identityRes.labelMatch[0].start, 0);
        assert.strictEqual(identityRes.labelMatch[0].end, ResourceAccessor.getItemLabel(resource).length);
        // Basename Prefix
        const basenamePrefixRes = scoreItem(resource, 'som', true, ResourceAccessor);
        assert.ok(basenamePrefixRes.score);
        assert.ok(!basenamePrefixRes.descriptionMatch);
        assert.strictEqual(basenamePrefixRes.labelMatch.length, 1);
        assert.strictEqual(basenamePrefixRes.labelMatch[0].start, 0);
        assert.strictEqual(basenamePrefixRes.labelMatch[0].end, 'som'.length);
        // Basename Camelcase
        const basenameCamelcaseRes = scoreItem(resource, 'sF', true, ResourceAccessor);
        assert.ok(basenameCamelcaseRes.score);
        assert.ok(!basenameCamelcaseRes.descriptionMatch);
        assert.strictEqual(basenameCamelcaseRes.labelMatch.length, 2);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[0].start, 0);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[0].end, 1);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[1].start, 4);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[1].end, 5);
        // Basename Match
        const basenameRes = scoreItem(resource, 'of', true, ResourceAccessor);
        assert.ok(basenameRes.score);
        assert.ok(!basenameRes.descriptionMatch);
        assert.strictEqual(basenameRes.labelMatch.length, 2);
        assert.strictEqual(basenameRes.labelMatch[0].start, 1);
        assert.strictEqual(basenameRes.labelMatch[0].end, 2);
        assert.strictEqual(basenameRes.labelMatch[1].start, 4);
        assert.strictEqual(basenameRes.labelMatch[1].end, 5);
        // Path Match
        const pathRes = scoreItem(resource, 'xyz123', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 8);
        assert.strictEqual(pathRes.labelMatch[0].end, 11);
        assert.strictEqual(pathRes.descriptionMatch.length, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].start, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].end, 4);
        // No Match
        const noRes = scoreItem(resource, '987', true, ResourceAccessor);
        assert.ok(!noRes.score);
        assert.ok(!noRes.labelMatch);
        assert.ok(!noRes.descriptionMatch);
        // No Exact Match
        const noExactRes = scoreItem(resource, '"sF"', true, ResourceAccessor);
        assert.ok(!noExactRes.score);
        assert.ok(!noExactRes.labelMatch);
        assert.ok(!noExactRes.descriptionMatch);
        assert.strictEqual(noRes.score, noExactRes.score);
        // Verify Scores
        assert.ok(identityRes.score > basenamePrefixRes.score);
        assert.ok(basenamePrefixRes.score > basenameRes.score);
        assert.ok(basenameRes.score > pathRes.score);
        assert.ok(pathRes.score > noRes.score);
    });
    test('scoreItem - multiple', function () {
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        const res1 = scoreItem(resource, 'xyz some', true, ResourceAccessor);
        assert.ok(res1.score);
        assert.strictEqual(res1.labelMatch?.length, 1);
        assert.strictEqual(res1.labelMatch[0].start, 0);
        assert.strictEqual(res1.labelMatch[0].end, 4);
        assert.strictEqual(res1.descriptionMatch?.length, 1);
        assert.strictEqual(res1.descriptionMatch[0].start, 1);
        assert.strictEqual(res1.descriptionMatch[0].end, 4);
        const res2 = scoreItem(resource, 'some xyz', true, ResourceAccessor);
        assert.ok(res2.score);
        assert.strictEqual(res1.score, res2.score);
        assert.strictEqual(res2.labelMatch?.length, 1);
        assert.strictEqual(res2.labelMatch[0].start, 0);
        assert.strictEqual(res2.labelMatch[0].end, 4);
        assert.strictEqual(res2.descriptionMatch?.length, 1);
        assert.strictEqual(res2.descriptionMatch[0].start, 1);
        assert.strictEqual(res2.descriptionMatch[0].end, 4);
        const res3 = scoreItem(resource, 'some xyz file file123', true, ResourceAccessor);
        assert.ok(res3.score);
        assert.ok(res3.score > res2.score);
        assert.strictEqual(res3.labelMatch?.length, 1);
        assert.strictEqual(res3.labelMatch[0].start, 0);
        assert.strictEqual(res3.labelMatch[0].end, 11);
        assert.strictEqual(res3.descriptionMatch?.length, 1);
        assert.strictEqual(res3.descriptionMatch[0].start, 1);
        assert.strictEqual(res3.descriptionMatch[0].end, 4);
        const res4 = scoreItem(resource, 'path z y', true, ResourceAccessor);
        assert.ok(res4.score);
        assert.ok(res4.score < res2.score);
        assert.strictEqual(res4.labelMatch?.length, 0);
        assert.strictEqual(res4.descriptionMatch?.length, 2);
        assert.strictEqual(res4.descriptionMatch[0].start, 2);
        assert.strictEqual(res4.descriptionMatch[0].end, 4);
        assert.strictEqual(res4.descriptionMatch[1].start, 10);
        assert.strictEqual(res4.descriptionMatch[1].end, 14);
    });
    test('scoreItem - multiple with cache yields different results', function () {
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        const cache = {};
        const res1 = scoreItem(resource, 'xyz sm', true, ResourceAccessor, cache);
        assert.ok(res1.score);
        // from the cache's perspective this should be a totally different query
        const res2 = scoreItem(resource, 'xyz "sm"', true, ResourceAccessor, cache);
        assert.ok(!res2.score);
    });
    test('scoreItem - invalid input', function () {
        let res = scoreItem(null, null, true, ResourceAccessor);
        assert.strictEqual(res.score, 0);
        res = scoreItem(null, 'null', true, ResourceAccessor);
        assert.strictEqual(res.score, 0);
    });
    test('scoreItem - optimize for file paths', function () {
        const resource = URI.file('/xyz/others/spath/some/xsp/file123.txt');
        // xsp is more relevant to the end of the file path even though it matches
        // fuzzy also in the beginning. we verify the more relevant match at the
        // end gets returned.
        const pathRes = scoreItem(resource, 'xspfile123', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 0);
        assert.strictEqual(pathRes.labelMatch[0].end, 7);
        assert.strictEqual(pathRes.descriptionMatch.length, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].start, 23);
        assert.strictEqual(pathRes.descriptionMatch[0].end, 26);
    });
    test('scoreItem - avoid match scattering (bug #36119)', function () {
        const resource = URI.file('projects/ui/cula/ats/target.mk');
        const pathRes = scoreItem(resource, 'tcltarget.mk', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 0);
        assert.strictEqual(pathRes.labelMatch[0].end, 9);
    });
    test('scoreItem - prefers more compact matches', function () {
        const resource = URI.file('/1a111d1/11a1d1/something.txt');
        // expect "ad" to be matched towards the end of the file because the
        // match is more compact
        const res = scoreItem(resource, 'ad', true, ResourceAccessor);
        assert.ok(res.score);
        assert.ok(res.descriptionMatch);
        assert.ok(!res.labelMatch.length);
        assert.strictEqual(res.descriptionMatch.length, 2);
        assert.strictEqual(res.descriptionMatch[0].start, 11);
        assert.strictEqual(res.descriptionMatch[0].end, 12);
        assert.strictEqual(res.descriptionMatch[1].start, 13);
        assert.strictEqual(res.descriptionMatch[1].end, 14);
    });
    test('scoreItem - proper target offset', function () {
        const resource = URI.file('etem');
        const res = scoreItem(resource, 'teem', true, ResourceAccessor);
        assert.ok(!res.score);
    });
    test('scoreItem - proper target offset #2', function () {
        const resource = URI.file('ede');
        const res = scoreItem(resource, 'de', true, ResourceAccessor);
        assert.strictEqual(res.labelMatch.length, 1);
        assert.strictEqual(res.labelMatch[0].start, 1);
        assert.strictEqual(res.labelMatch[0].end, 3);
    });
    test('scoreItem - proper target offset #3', function () {
        const resource = URI.file('/src/vs/editor/browser/viewParts/lineNumbers/flipped-cursor-2x.svg');
        const res = scoreItem(resource, 'debug', true, ResourceAccessor);
        assert.strictEqual(res.descriptionMatch.length, 3);
        assert.strictEqual(res.descriptionMatch[0].start, 9);
        assert.strictEqual(res.descriptionMatch[0].end, 10);
        assert.strictEqual(res.descriptionMatch[1].start, 36);
        assert.strictEqual(res.descriptionMatch[1].end, 37);
        assert.strictEqual(res.descriptionMatch[2].start, 40);
        assert.strictEqual(res.descriptionMatch[2].end, 41);
        assert.strictEqual(res.labelMatch.length, 2);
        assert.strictEqual(res.labelMatch[0].start, 9);
        assert.strictEqual(res.labelMatch[0].end, 10);
        assert.strictEqual(res.labelMatch[1].start, 20);
        assert.strictEqual(res.labelMatch[1].end, 21);
    });
    test('scoreItem - no match unless query contained in sequence', function () {
        const resource = URI.file('abcde');
        const res = scoreItem(resource, 'edcda', true, ResourceAccessor);
        assert.ok(!res.score);
    });
    test('scoreItem - match if using slash or backslash (local, remote resource)', function () {
        const localResource = URI.file('abcde/super/duper');
        const remoteResource = URI.from({ scheme: Schemas.vscodeRemote, path: 'abcde/super/duper' });
        for (const resource of [localResource, remoteResource]) {
            let res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceWithSlashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceWithBackslashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceWithSlashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceWithBackslashAccessor);
            assert.ok(res.score);
        }
    });
    test('scoreItem - ensure upper case bonus only applies on non-consecutive matches (bug #134723)', function () {
        const resourceWithUpper = URI.file('ASDFasdfasdf');
        const resourceAllLower = URI.file('asdfasdfasdf');
        assert.ok(scoreItem(resourceAllLower, 'asdf', true, ResourceAccessor).score > scoreItem(resourceWithUpper, 'asdf', true, ResourceAccessor).score);
    });
    test('compareItemsByScore - identity', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Full resource A path
        let query = ResourceAccessor.getItemPath(resourceA);
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Full resource B path
        query = ResourceAccessor.getItemPath(resourceB);
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename prefix', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Full resource A basename
        let query = ResourceAccessor.getItemLabel(resourceA);
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Full resource B basename
        query = ResourceAccessor.getItemLabel(resourceB);
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename camelcase', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // resource A camelcase
        let query = 'fA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // resource B camelcase
        query = 'fB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename scores', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of basename
        let query = 'fileA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Resource B part of basename
        query = 'fileB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - path scores', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of path
        let query = 'pathfileA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Resource B part of path
        query = 'pathfileB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter basenames', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileBLonger.txt');
        const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');
        // Resource A part of path
        const query = 'somepath';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter basenames (match on basename)', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileBLonger.txt');
        const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');
        // Resource A part of path
        const query = 'file';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
    });
    test('compareFilesByScore - prefer shorter paths', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of path
        const query = 'somepath';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter paths (bug #17443)', function () {
        const resourceA = URI.file('config/test/t1.js');
        const resourceB = URI.file('config/test.js');
        const resourceC = URI.file('config/test/t2.js');
        const query = 'co/te';
        const res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer matches in label over description if scores are otherwise equal', function () {
        const resourceA = URI.file('parts/quick/arrow-left-dark.svg');
        const resourceB = URI.file('parts/quickopen/quickopen.ts');
        const query = 'partsquick';
        const res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer camel case matches', function () {
        const resourceA = URI.file('config/test/NullPointerException.java');
        const resourceB = URI.file('config/test/nopointerexception.java');
        for (const query of ['npe', 'NPE']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer more compact camel case matches', function () {
        const resourceA = URI.file('config/test/openthisAnythingHandler.js');
        const resourceB = URI.file('config/test/openthisisnotsorelevantforthequeryAnyHand.js');
        const query = 'AH';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (label)', function () {
        const resourceA = URI.file('config/test/examasdaple.js');
        const resourceB = URI.file('config/test/exampleasdaasd.ts');
        const query = 'xp';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (path)', function () {
        const resourceA = URI.file('config/test/examasdaple/file.js');
        const resourceB = URI.file('config/test/exampleasdaasd/file.ts');
        const query = 'xp';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (label and path)', function () {
        const resourceA = URI.file('config/example/thisfile.ts');
        const resourceB = URI.file('config/24234243244/example/file.js');
        const query = 'exfile';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - avoid match scattering (bug #34210)', function () {
        const resourceA = URI.file('node_modules1/bundle/lib/model/modules/ot1/index.js');
        const resourceB = URI.file('node_modules1/bundle/lib/model/modules/un1/index.js');
        const resourceC = URI.file('node_modules1/bundle/lib/model/modules/modu1/index.js');
        const resourceD = URI.file('node_modules1/bundle/lib/model/modules/oddl1/index.js');
        let query = isWindows ? 'modu1\\index.js' : 'modu1/index.js';
        let res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        query = isWindows ? 'un1\\index.js' : 'un1/index.js';
        res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #21019 1.)', function () {
        const resourceA = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceLoad/index.js');
        const resourceB = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceDistribution/index.js');
        const resourceC = URI.file('app/containers/Services/NetworkData/ServiceDetailTabs/ServiceTabs/StatVideo/index.js');
        const query = 'StatVideoindex';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
    });
    test('compareFilesByScore - avoid match scattering (bug #21019 2.)', function () {
        const resourceA = URI.file('src/build-helper/store/redux.ts');
        const resourceB = URI.file('src/repository/store/redux.ts');
        const query = 'reproreduxts';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #26649)', function () {
        const resourceA = URI.file('photobook/src/components/AddPagesButton/index.js');
        const resourceB = URI.file('photobook/src/components/ApprovalPageHeader/index.js');
        const resourceC = URI.file('photobook/src/canvasComponents/BookPage/index.js');
        const query = 'bookpageIndex';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
    });
    test('compareFilesByScore - avoid match scattering (bug #33247)', function () {
        const resourceA = URI.file('ui/src/utils/constants.js');
        const resourceB = URI.file('ui/src/ui/Icons/index.js');
        const query = isWindows ? 'ui\\icons' : 'ui/icons';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #33247 comment)', function () {
        const resourceA = URI.file('ui/src/components/IDInput/index.js');
        const resourceB = URI.file('ui/src/ui/Input/index.js');
        const query = isWindows ? 'ui\\input\\index' : 'ui/input/index';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #36166)', function () {
        const resourceA = URI.file('django/contrib/sites/locale/ga/LC_MESSAGES/django.mo');
        const resourceB = URI.file('django/core/signals.py');
        const query = 'djancosig';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #32918)', function () {
        const resourceA = URI.file('adsys/protected/config.php');
        const resourceB = URI.file('adsys/protected/framework/smarty/sysplugins/smarty_internal_config.php');
        const resourceC = URI.file('duowanVideo/wap/protected/config.php');
        const query = 'protectedconfig.php';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14879)', function () {
        const resourceA = URI.file('pkg/search/gradient/testdata/constraint_attrMatchString.yml');
        const resourceB = URI.file('cmd/gradient/main.go');
        const query = 'gradientmain';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14727 1)', function () {
        const resourceA = URI.file('alpha-beta-cappa.txt');
        const resourceB = URI.file('abc.txt');
        const query = 'abc';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14727 2)', function () {
        const resourceA = URI.file('xerxes-yak-zubba/index.js');
        const resourceB = URI.file('xyz/index.js');
        const query = 'xyz';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #18381)', function () {
        const resourceA = URI.file('AssymblyInfo.cs');
        const resourceB = URI.file('IAsynchronousTask.java');
        const query = 'async';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #35572)', function () {
        const resourceA = URI.file('static/app/source/angluar/-admin/-organization/-settings/layout/layout.js');
        const resourceB = URI.file('static/app/source/angular/-admin/-project/-settings/_settings/settings.js');
        const query = 'partisettings';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #36810)', function () {
        const resourceA = URI.file('Trilby.TrilbyTV.Web.Portal/Views/Systems/Index.cshtml');
        const resourceB = URI.file('Trilby.TrilbyTV.Web.Portal/Areas/Admins/Views/Tips/Index.cshtml');
        const query = 'tipsindex.cshtml';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer shorter hit (bug #20546)', function () {
        const resourceA = URI.file('editor/core/components/tests/list-view-spec.js');
        const resourceB = URI.file('editor/core/components/list-view.js');
        const query = 'listview';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #12095)', function () {
        const resourceA = URI.file('src/vs/workbench/contrib/files/common/explorerViewModel.ts');
        const resourceB = URI.file('src/vs/workbench/contrib/files/browser/views/explorerView.ts');
        const resourceC = URI.file('src/vs/workbench/contrib/files/browser/views/explorerViewer.ts');
        const query = 'filesexplorerview.ts';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceA, resourceC, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer case match (bug #96122)', function () {
        const resourceA = URI.file('lists.php');
        const resourceB = URI.file('lib/Lists.php');
        const query = 'Lists.php';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - foo bar', function () {
        const resourceA = URI.file('app/emails/foo.bar.js');
        const resourceB = URI.file('app/emails/other-footer.other-bar.js');
        for (const query of ['foo bar', 'foobar']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - payment model', function () {
        const resourceA = URI.file('app/components/payment/payment.model.js');
        const resourceB = URI.file('app/components/online-payments-history/online-payments-history.model.js');
        for (const query of ['payment model', 'paymentmodel']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - color', function () {
        const resourceA = URI.file('app/constants/color.js');
        const resourceB = URI.file('app/components/model/input/pick-avatar-color.js');
        for (const query of ['color js', 'colorjs']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer strict case prefix', function () {
        const resourceA = URI.file('app/constants/color.js');
        const resourceB = URI.file('app/components/model/input/Color.js');
        let query = 'Color';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        query = 'color';
        res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
    });
    test('compareFilesByScore - prefer prefix (bug #103052)', function () {
        const resourceA = URI.file('test/smoke/src/main.ts');
        const resourceB = URI.file('src/vs/editor/common/services/semantikTokensProviderStyling.ts');
        const query = 'smoke main.ts';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
    });
    test('compareFilesByScore - boost better prefix match if multiple queries are used', function () {
        const resourceA = URI.file('src/vs/workbench/services/host/browser/browserHostService.ts');
        const resourceB = URI.file('src/vs/workbench/browser/workbench.ts');
        for (const query of ['workbench.ts browser', 'browser workbench.ts', 'browser workbench', 'workbench browser']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - boost shorter prefix match if multiple queries are used', function () {
        const resourceA = URI.file('src/vs/workbench/node/actions/windowActions.ts');
        const resourceB = URI.file('src/vs/workbench/electron-node/window.ts');
        for (const query of ['window node', 'window.ts node']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - skip preference on label match when using path sep', function () {
        const resourceA = URI.file('djangosite/ufrela/def.py');
        const resourceB = URI.file('djangosite/urls/default.py');
        for (const query of ['url/def']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - boost shorter prefix match if multiple queries are used (#99171)', function () {
        const resourceA = URI.file('mesh_editor_lifetime_job.h');
        const resourceB = URI.file('lifetime_job.h');
        for (const query of ['m life, life m']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('prepareQuery', () => {
        assert.strictEqual(prepareQuery(' f*a ').normalized, 'fa');
        assert.strictEqual(prepareQuery('model Tester.ts').original, 'model Tester.ts');
        assert.strictEqual(prepareQuery('model Tester.ts').originalLowercase, 'model Tester.ts'.toLowerCase());
        assert.strictEqual(prepareQuery('model Tester.ts').normalized, 'modelTester.ts');
        assert.strictEqual(prepareQuery('model Tester.ts').expectContiguousMatch, false); // doesn't have quotes in it
        assert.strictEqual(prepareQuery('Model Tester.ts').normalizedLowercase, 'modeltester.ts');
        assert.strictEqual(prepareQuery('ModelTester.ts').containsPathSeparator, false);
        assert.strictEqual(prepareQuery('Model' + sep + 'Tester.ts').containsPathSeparator, true);
        assert.strictEqual(prepareQuery('"hello"').expectContiguousMatch, true);
        assert.strictEqual(prepareQuery('"hello"').normalized, 'hello');
        // with spaces
        let query = prepareQuery('He*llo World');
        assert.strictEqual(query.original, 'He*llo World');
        assert.strictEqual(query.normalized, 'HelloWorld');
        assert.strictEqual(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
        assert.strictEqual(query.values?.length, 2);
        assert.strictEqual(query.values?.[0].original, 'He*llo');
        assert.strictEqual(query.values?.[0].normalized, 'Hello');
        assert.strictEqual(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[1].original, 'World');
        assert.strictEqual(query.values?.[1].normalized, 'World');
        assert.strictEqual(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());
        const restoredQuery = pieceToQuery(query.values);
        assert.strictEqual(restoredQuery.original, query.original);
        assert.strictEqual(restoredQuery.values?.length, query.values?.length);
        assert.strictEqual(restoredQuery.containsPathSeparator, query.containsPathSeparator);
        // with spaces that are empty
        query = prepareQuery(' Hello   World  	');
        assert.strictEqual(query.original, ' Hello   World  	');
        assert.strictEqual(query.originalLowercase, ' Hello   World  	'.toLowerCase());
        assert.strictEqual(query.normalized, 'HelloWorld');
        assert.strictEqual(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
        assert.strictEqual(query.values?.length, 2);
        assert.strictEqual(query.values?.[0].original, 'Hello');
        assert.strictEqual(query.values?.[0].originalLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[0].normalized, 'Hello');
        assert.strictEqual(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[1].original, 'World');
        assert.strictEqual(query.values?.[1].originalLowercase, 'World'.toLowerCase());
        assert.strictEqual(query.values?.[1].normalized, 'World');
        assert.strictEqual(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());
        // Path related
        if (isWindows) {
            assert.strictEqual(prepareQuery('C:\\some\\path').pathNormalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:\\some\\path').normalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:\\some\\path').containsPathSeparator, true);
            assert.strictEqual(prepareQuery('C:/some/path').pathNormalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:/some/path').normalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:/some/path').containsPathSeparator, true);
        }
        else {
            assert.strictEqual(prepareQuery('/some/path').pathNormalized, '/some/path');
            assert.strictEqual(prepareQuery('/some/path').normalized, '/some/path');
            assert.strictEqual(prepareQuery('/some/path').containsPathSeparator, true);
            assert.strictEqual(prepareQuery('\\some\\path').pathNormalized, '/some/path');
            assert.strictEqual(prepareQuery('\\some\\path').normalized, '/some/path');
            assert.strictEqual(prepareQuery('\\some\\path').containsPathSeparator, true);
        }
    });
    test('fuzzyScore2 (matching)', function () {
        const target = 'HelLo-World';
        for (const offset of [0, 3]) {
            let [score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HelLo-World', offset);
            assert.ok(score);
            assert.strictEqual(matches.length, 1);
            assert.strictEqual(matches[0].start, 0 + offset);
            assert.strictEqual(matches[0].end, target.length + offset);
            [score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HW', offset);
            assert.ok(score);
            assert.strictEqual(matches.length, 2);
            assert.strictEqual(matches[0].start, 0 + offset);
            assert.strictEqual(matches[0].end, 1 + offset);
            assert.strictEqual(matches[1].start, 6 + offset);
            assert.strictEqual(matches[1].end, 7 + offset);
        }
    });
    test('fuzzyScore2 (multiple queries)', function () {
        const target = 'HelLo-World';
        const [firstSingleScore, firstSingleMatches] = _doScore2(target, 'HelLo');
        const [secondSingleScore, secondSingleMatches] = _doScore2(target, 'World');
        const firstAndSecondSingleMatches = [...firstSingleMatches || [], ...secondSingleMatches || []];
        let [multiScore, multiMatches] = _doScore2(target, 'HelLo World');
        function assertScore() {
            assert.ok(multiScore ?? 0 >= ((firstSingleScore ?? 0) + (secondSingleScore ?? 0)));
            for (let i = 0; multiMatches && i < multiMatches.length; i++) {
                const multiMatch = multiMatches[i];
                const firstAndSecondSingleMatch = firstAndSecondSingleMatches[i];
                if (multiMatch && firstAndSecondSingleMatch) {
                    assert.strictEqual(multiMatch.start, firstAndSecondSingleMatch.start);
                    assert.strictEqual(multiMatch.end, firstAndSecondSingleMatch.end);
                }
                else {
                    assert.fail();
                }
            }
        }
        function assertNoScore() {
            assert.strictEqual(multiScore, undefined);
            assert.strictEqual(multiMatches.length, 0);
        }
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo');
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo World');
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo Nothing');
        assertNoScore();
        [multiScore, multiMatches] = _doScore2(target, 'More Nothing');
        assertNoScore();
    });
    test('fuzzyScore2 (#95716)', function () {
        const target = '# ❌ Wow';
        const score = _doScore2(target, '❌');
        assert.ok(score);
        assert.ok(typeof score[0] === 'number');
        assert.ok(score[1].length > 0);
    });
    test('Using quotes should expect contiguous matches match', function () {
        // missing the "i" in the query
        assert.strictEqual(_doScore('contiguous', '"contguous"')[0], 0);
        const score = _doScore('contiguous', '"contiguous"');
        assert.strictEqual(score[0], 253);
    });
    test('Using quotes should highlight contiguous indexes', function () {
        const score = _doScore('2021-7-26.md', '"26"');
        assert.strictEqual(score[0], 13);
        // The indexes of the 2 and 6 of "26"
        assert.strictEqual(score[1][0], 7);
        assert.strictEqual(score[1][1], 8);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV6enlTY29yZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2Z1enp5U2NvcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx3QkFBd0IsRUFBd0UsWUFBWSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xOLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLE1BQU0scUJBQXFCO0lBRTFCLFlBQVksQ0FBQyxRQUFhO1FBQ3pCLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBYTtRQUMvQixPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFhO1FBQ3hCLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQztBQUVyRCxNQUFNLDhCQUE4QjtJ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TUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENB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LENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEMsMkJBQTJCO1FBQzNCLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFakQsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3JILE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRDLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNySCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRTtRQUNoRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUVuRSx1QkFBdUI7UUFDdkIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWpCLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3pILE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRDLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNySCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV0Qyx1QkFBdUI7UUFDdkIsS0FBSyxHQUFHLElBQUksQ0FBQztRQUViLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNySCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV0QyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDckgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUs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