/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Source } from '../../common/debugSource.js';
import { mockUriIdentityService } from './mockDebugModel.js';
suite('Debug - Source', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('from raw source', () => {
        const source = new Source({
            name: 'zz',
            path: '/xx/yy/zz',
            sourceReference: 0,
            presentationHint: 'emphasize'
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        assert.strictEqual(source.presentationHint, 'emphasize');
        assert.strictEqual(source.name, 'zz');
        assert.strictEqual(source.inMemory, false);
        assert.strictEqual(source.reference, 0);
        assert.strictEqual(source.uri.toString(), uri.file('/xx/yy/zz').toString());
    });
    test('from raw internal source', () => {
        const source = new Source({
            name: 'internalModule.js',
            sourceReference: 11,
            presentationHint: 'deemphasize'
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        assert.strictEqual(source.presentationHint, 'deemphasize');
        assert.strictEqual(source.name, 'internalModule.js');
        assert.strictEqual(source.inMemory, true);
        assert.strictEqual(source.reference, 11);
        assert.strictEqual(source.uri.toString(), 'debug:internalModule.js?session%3DaDebugSessionId%26ref%3D11');
    });
    test('get encoded debug data', () => {
        const checkData = (uri, expectedName, expectedPath, expectedSourceReference, expectedSessionId) => {
            const { name, path, sourceReference, sessionId } = Source.getEncodedDebugData(uri);
            assert.strictEqual(name, expectedName);
            assert.strictEqual(path, expectedPath);
            assert.strictEqual(sourceReference, expectedSourceReference);
            assert.strictEqual(sessionId, expectedSessionId);
        };
        checkData(uri.file('a/b/c/d'), 'd', isWindows ? '\\a\\b\\c\\d' : '/a/b/c/d', undefined, undefined);
        checkData(uri.from({ scheme: 'file', path: '/my/path/test.js', query: 'ref=1&session=2' }), 'test.js', isWindows ? '\\my\\path\\test.js' : '/my/path/test.js', undefined, undefined);
        checkData(uri.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }), 'path', 'http://www.example.com/my/path', undefined, undefined);
        checkData(uri.from({ scheme: 'debug', authority: 'www.example.com', path: '/my/path', query: 'ref=100' }), 'path', '/my/path', 100, undefined);
        checkData(uri.from({ scheme: 'debug', path: 'a/b/c/d.js', query: 'session=100' }), 'd.js', 'a/b/c/d.js', undefined, '100');
        checkData(uri.from({ scheme: 'debug', path: 'a/b/c/d/foo.txt', query: 'session=100&ref=10' }), 'foo.txt', 'a/b/c/d/foo.txt', 10, '100');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvZGVidWdTb3VyY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU3RCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQztZQUN6QixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxXQUFXO1lBQ2pCLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLGdCQUFnQixFQUFFLFdBQVc7U0FDN0IsRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcs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