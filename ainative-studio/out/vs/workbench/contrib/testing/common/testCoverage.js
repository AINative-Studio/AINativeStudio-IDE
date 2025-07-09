/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { deepClone } from '../../../../base/common/objects.js';
import { observableSignal } from '../../../../base/common/observable.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { URI } from '../../../../base/common/uri.js';
import { ICoverageCount } from './testTypes.js';
let incId = 0;
/**
 * Class that exposese coverage information for a run.
 */
export class TestCoverage {
    constructor(result, fromTaskId, uriIdentityService, accessor) {
        this.result = result;
        this.fromTaskId = fromTaskId;
        this.uriIdentityService = uriIdentityService;
        this.accessor = accessor;
        this.fileCoverage = new ResourceMap();
        this.didAddCoverage = observableSignal(this);
        this.tree = new WellDefinedPrefixTree();
        this.associatedData = new Map();
    }
    /** Gets all test IDs that were included in this test run. */
    *allPerTestIDs() {
        const seen = new Set();
        for (const root of this.tree.nodes) {
            if (root.value && root.value.perTestData) {
                for (const id of root.value.perTestData) {
                    if (!seen.has(id)) {
                        seen.add(id);
                        yield id;
                    }
                }
            }
        }
    }
    append(coverage, tx) {
        const previous = this.getComputedForUri(coverage.uri);
        const result = this.result;
        const applyDelta = (kind, node) => {
            if (!node[kind]) {
                if (coverage[kind]) {
                    node[kind] = { ...coverage[kind] };
                }
            }
            else {
                node[kind].covered += (coverage[kind]?.covered || 0) - (previous?.[kind]?.covered || 0);
                node[kind].total += (coverage[kind]?.total || 0) - (previous?.[kind]?.total || 0);
            }
        };
        // We insert using the non-canonical path to normalize for casing differences
        // between URIs, but when inserting an intermediate node always use 'a' canonical
        // version.
        const canonical = [...this.treePathForUri(coverage.uri, /* canonical = */ true)];
        const chain = [];
        this.tree.mutatePath(this.treePathForUri(coverage.uri, /* canonical = */ false), node => {
            chain.push(node);
            if (chain.length === canonical.length) {
                // we reached our destination node, apply the coverage as necessary:
                if (node.value) {
                    const v = node.value;
                    // if ID was generated from a test-specific coverage, reassign it to get its real ID in the extension host.
                    v.id = coverage.id;
                    v.statement = coverage.statement;
                    v.branch = coverage.branch;
                    v.declaration = coverage.declaration;
                }
                else {
                    const v = node.value = new FileCoverage(coverage, result, this.accessor);
                    this.fileCoverage.set(coverage.uri, v);
                }
            }
            else {
                // Otherwise, if this is not a partial per-test coverage, merge the
                // coverage changes into the chain. Per-test coverages are not complete
                // and we don't want to consider them for computation.
                if (!node.value) {
                    // clone because later intersertions can modify the counts:
                    const intermediate = deepClone(coverage);
                    intermediate.id = String(incId++);
                    intermediate.uri = this.treePathToUri(canonical.slice(0, chain.length));
                    node.value = new ComputedFileCoverage(intermediate, result);
                }
                else {
                    applyDelta('statement', node.value);
                    applyDelta('branch', node.value);
                    applyDelta('declaration', node.value);
                    node.value.didChange.trigger(tx);
                }
            }
            if (coverage.testIds) {
                node.value.perTestData ??= new Set();
                for (const id of coverage.testIds) {
                    node.value.perTestData.add(id);
                }
            }
        });
        if (chain) {
            this.didAddCoverage.trigger(tx, chain);
        }
    }
    /**
     * Builds a new tree filtered to per-test coverage data for the given ID.
     */
    filterTreeForTest(testId) {
        const tree = new WellDefinedPrefixTree();
        for (const node of this.tree.values()) {
            if (node instanceof FileCoverage) {
                if (!node.perTestData?.has(testId.toString())) {
                    continue;
                }
                const canonical = [...this.treePathForUri(node.uri, /* canonical = */ true)];
                const chain = [];
                tree.mutatePath(this.treePathForUri(node.uri, /* canonical = */ false), n => {
                    chain.push(n);
                    n.value ??= new BypassedFileCoverage(this.treePathToUri(canonical.slice(0, chain.length)), node.fromResult);
                });
            }
        }
        return tree;
    }
    /**
     * Gets coverage information for all files.
     */
    getAllFiles() {
        return this.fileCoverage;
    }
    /**
     * Gets coverage information for a specific file.
     */
    getUri(uri) {
        return this.fileCoverage.get(uri);
    }
    /**
     * Gets computed information for a file, including DFS-computed information
     * from child tests.
     */
    getComputedForUri(uri) {
        return this.tree.find(this.treePathForUri(uri, /* canonical = */ false));
    }
    *treePathForUri(uri, canconicalPath) {
        yield uri.scheme;
        yield uri.authority;
        const path = !canconicalPath && this.uriIdentityService.extUri.ignorePathCasing(uri) ? uri.path.toLowerCase() : uri.path;
        yield* path.split('/');
    }
    treePathToUri(path) {
        return URI.from({ scheme: path[0], authority: path[1], path: path.slice(2).join('/') });
    }
}
export const getTotalCoveragePercent = (statement, branch, function_) => {
    let numerator = statement.covered;
    let denominator = statement.total;
    if (branch) {
        numerator += branch.covered;
        denominator += branch.total;
    }
    if (function_) {
        numerator += function_.covered;
        denominator += function_.total;
    }
    return denominator === 0 ? 1 : numerator / denominator;
};
export class AbstractFileCoverage {
    /**
     * Gets the total coverage percent based on information provided.
     * This is based on the Clover total coverage formula
     */
    get tpc() {
        return getTotalCoveragePercent(this.statement, this.branch, this.declaration);
    }
    constructor(coverage, fromResult) {
        this.fromResult = fromResult;
        this.didChange = observableSignal(this);
        this.id = coverage.id;
        this.uri = coverage.uri;
        this.statement = coverage.statement;
        this.branch = coverage.branch;
        this.declaration = coverage.declaration;
    }
}
/**
 * File coverage info computed from children in the tree, not provided by the
 * extension.
 */
export class ComputedFileCoverage extends AbstractFileCoverage {
}
/**
 * A virtual node that doesn't have any added coverage info.
 */
export class BypassedFileCoverage extends ComputedFileCoverage {
    constructor(uri, result) {
        super({ id: String(incId++), uri, statement: { covered: 0, total: 0 } }, result);
    }
}
export class FileCoverage extends AbstractFileCoverage {
    /** Gets whether details are synchronously available */
    get hasSynchronousDetails() {
        return this._details instanceof Array || this.resolved;
    }
    constructor(coverage, fromResult, accessor) {
        super(coverage, fromResult);
        this.accessor = accessor;
    }
    /**
     * Gets per-line coverage details.
     */
    async detailsForTest(_testId, token = CancellationToken.None) {
        this._detailsForTest ??= new Map();
        const testId = _testId.toString();
        const prev = this._detailsForTest.get(testId);
        if (prev) {
            return prev;
        }
        const promise = (async () => {
            try {
                return await this.accessor.getCoverageDetails(this.id, testId, token);
            }
            catch (e) {
                this._detailsForTest?.delete(testId);
                throw e;
            }
        })();
        this._detailsForTest.set(testId, promise);
        return promise;
    }
    /**
     * Gets per-line coverage details.
     */
    async details(token = CancellationToken.None) {
        this._details ??= this.accessor.getCoverageDetails(this.id, undefined, token);
        try {
            const d = await this._details;
            this.resolved = true;
            return d;
        }
        catch (e) {
            this._details = undefined;
            throw e;
        }
    }
}
export const totalFromCoverageDetails = (uri, details) => {
    const fc = {
        id: '',
        uri,
        statement: ICoverageCount.empty(),
    };
    for (const detail of details) {
        if (detail.type === 1 /* DetailType.Statement */) {
            fc.statement.total++;
            fc.statement.total += detail.count ? 1 : 0;
            for (const branch of detail.branches || []) {
                fc.branch ??= ICoverageCount.empty();
                fc.branch.total++;
                fc.branch.covered += branch.count ? 1 : 0;
            }
        }
        else {
            fc.declaration ??= ICoverageCount.empty();
            fc.declaration.total++;
            fc.declaration.covered += detail.count ? 1 : 0;
        }
    }
    return fc;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RDb3ZlcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBZ0IsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RixPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSXJELE9BQU8sRUFBK0IsY0FBYyxFQUFpQixNQUFNLGdCQUFnQixDQUFDO0FBTTVGLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztBQUVkOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFNeEIsWUFDaUIsTUFBc0IsRUFDdEIsVUFBa0IsRUFDakIsa0JBQXVDLEVBQ3ZDLFFBQTJCO1FBSDVCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQ3RCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDakIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2QyxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQVQ1QixpQkFBWSxHQUFHLElBQUksV0FBVyxFQUFnQixDQUFDO1FBQ2hELG1CQUFjLEdBQUcsZ0JBQWdCLENBQTBDLElBQUksQ0FBQyxDQUFDO1FBQ2pGLFNBQUksR0FBRyxJQUFJLHFCQUFxQixFQUF3QixDQUFDO1FBQ3pELG1CQUFjLEdBQUcs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