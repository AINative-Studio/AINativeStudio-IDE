"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const node_assert_1 = require("node:assert");
const pathExecutableCache_1 = require("../../env/pathExecutableCache");
suite('PathExecutableCache', () => {
    test('cache should return empty for empty PATH', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const result = await cache.getExecutablesInPath({ PATH: '' });
        (0, node_assert_1.strictEqual)(Array.from(result.completionResources).length, 0);
        (0, node_assert_1.strictEqual)(Array.from(result.labels).length, 0);
    });
    test('caching is working on successive calls', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const env = { PATH: process.env.PATH };
        const result = await cache.getExecutablesInPath(env);
        const result2 = await cache.getExecutablesInPath(env);
        (0, node_assert_1.strictEqual)(result, result2);
    });
    test('refresh clears the cache', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const env = { PATH: process.env.PATH };
        const result = await cache.getExecutablesInPath(env);
        cache.refresh();
        const result2 = await cache.getExecutablesInPath(env);
        (0, node_assert_1.strictEqual)(result !== result2, true);
    });
});
//# sourceMappingURL=pathExecutableCache.test.js.map