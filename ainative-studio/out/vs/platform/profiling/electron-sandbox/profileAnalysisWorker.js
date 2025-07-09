/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../base/common/path.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { Utils } from '../common/profiling.js';
import { buildModel, BottomUpNode, processNode } from '../common/profilingModel.js';
export function create() {
    return new ProfileAnalysisWorker();
}
class ProfileAnalysisWorker {
    $analyseBottomUp(profile) {
        if (!Utils.isValidProfile(profile)) {
            return { kind: 1 /* ProfilingOutput.Irrelevant */, samples: [] };
        }
        const model = buildModel(profile);
        const samples = bottomUp(model, 5)
            .filter(s => !s.isSpecial);
        if (samples.length === 0 || samples[0].percentage < 10) {
            // ignore this profile because 90% of the time is spent inside "special" frames
            // like idle, GC, or program
            return { kind: 1 /* ProfilingOutput.Irrelevant */, samples: [] };
        }
        return { kind: 2 /* ProfilingOutput.Interesting */, samples };
    }
    $analyseByUrlCategory(profile, categories) {
        // build search tree
        const searchTree = TernarySearchTree.forUris();
        searchTree.fill(categories);
        // cost by categories
        const model = buildModel(profile);
        const aggegrateByCategory = new Map();
        for (const node of model.nodes) {
            const loc = model.locations[node.locationId];
            let category;
            try {
                category = searchTree.findSubstr(URI.parse(loc.callFrame.url));
            }
            catch {
                // ignore
            }
            if (!category) {
                category = printCallFrameShort(loc.callFrame);
            }
            const value = aggegrateByCategory.get(category) ?? 0;
            const newValue = value + node.selfTime;
            aggegrateByCategory.set(category, newValue);
        }
        const result = [];
        for (const [key, value] of aggegrateByCategory) {
            result.push([key, value]);
        }
        return result;
    }
}
function isSpecial(call) {
    return call.functionName.startsWith('(') && call.functionName.endsWith(')');
}
function printCallFrameShort(frame) {
    let result = frame.functionName || '(anonymous)';
    if (frame.url) {
        result += '#';
        result += basename(frame.url);
        if (frame.lineNumber >= 0) {
            result += ':';
            result += frame.lineNumber + 1;
        }
        if (frame.columnNumber >= 0) {
            result += ':';
            result += frame.columnNumber + 1;
        }
    }
    return result;
}
function printCallFrameStackLike(frame) {
    let result = frame.functionName || '(anonymous)';
    if (frame.url) {
        result += ' (';
        result += frame.url;
        if (frame.lineNumber >= 0) {
            result += ':';
            result += frame.lineNumber + 1;
        }
        if (frame.columnNumber >= 0) {
            result += ':';
            result += frame.columnNumber + 1;
        }
        result += ')';
    }
    return result;
}
function getHeaviestLocationIds(model, topN) {
    const stackSelfTime = {};
    for (const node of model.nodes) {
        stackSelfTime[node.locationId] = (stackSelfTime[node.locationId] || 0) + node.selfTime;
    }
    const locationIds = Object.entries(stackSelfTime)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([locationId]) => Number(locationId));
    return new Set(locationIds);
}
function bottomUp(model, topN) {
    const root = BottomUpNode.root();
    const locationIds = getHeaviestLocationIds(model, topN);
    for (const node of model.nodes) {
        if (locationIds.has(node.locationId)) {
            processNode(root, node, model);
            root.addNode(node);
        }
    }
    const result = Object.values(root.children)
        .sort((a, b) => b.selfTime - a.selfTime)
        .slice(0, topN);
    const samples = [];
    for (const node of result) {
        const sample = {
            selfTime: Math.round(node.selfTime / 1000),
            totalTime: Math.round(node.aggregateTime / 1000),
            location: printCallFrameShort(node.callFrame),
            absLocation: printCallFrameStackLike(node.callFrame),
            url: node.callFrame.url,
            caller: [],
            percentage: Math.round(node.selfTime / (model.duration / 100)),
            isSpecial: isSpecial(node.callFrame)
        };
        // follow the heaviest caller paths
        const stack = [node];
        while (stack.length) {
            const node = stack.pop();
            let top;
            for (const candidate of Object.values(node.children)) {
                if (!top || top.selfTime < candidate.selfTime) {
                    top = candidate;
                }
            }
            if (top) {
                const percentage = Math.round(top.selfTime / (node.selfTime / 100));
                sample.caller.push({
                    percentage,
                    location: printCallFrameShort(top.callFrame),
                    absLocation: printCallFrameStackLike(top.callFrame),
                });
                stack.push(top);
            }
        }
        samples.push(sample);
    }
    return samples;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZUFuYWx5c2lzV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9lbGVjdHJvbi1zYW5kYm94L3Byb2ZpbGVBbmFseXNpc1dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBYyxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQWlDLFVBQVUsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFnQixNQUFNLDZCQUE2QixDQUFDO0FBR2pJLE1BQU0sVUFBVSxNQUFNO0lBQ3JCLE9BQU8sSUFBSSxxQkFBcUIsRUFBRSxDQUFDO0FBQ3BDLENBQUM7QUFFRCxNQUFNLHFCQUFxQjtJQUkxQixnQkFBZ0IsQ0FBQyxPQUFtQjtRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxJQUFJLG9DQUE0QixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUMxRCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2FBQ2hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTVCLElBQUksT0FBTyxDQUFDLE1BQU0s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