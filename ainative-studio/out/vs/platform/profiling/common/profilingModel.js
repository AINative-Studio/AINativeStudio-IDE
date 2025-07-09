/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Recursive function that computes and caches the aggregate time for the
 * children of the computed now.
 */
const computeAggregateTime = (index, nodes) => {
    const row = nodes[index];
    if (row.aggregateTime) {
        return row.aggregateTime;
    }
    let total = row.selfTime;
    for (const child of row.children) {
        total += computeAggregateTime(child, nodes);
    }
    return (row.aggregateTime = total);
};
const ensureSourceLocations = (profile) => {
    let locationIdCounter = 0;
    const locationsByRef = new Map();
    const getLocationIdFor = (callFrame) => {
        const ref = [
            callFrame.functionName,
            callFrame.url,
            callFrame.scriptId,
            callFrame.lineNumber,
            callFrame.columnNumber,
        ].join(':');
        const existing = locationsByRef.get(ref);
        if (existing) {
            return existing.id;
        }
        const id = locationIdCounter++;
        locationsByRef.set(ref, {
            id,
            callFrame,
            location: {
                lineNumber: callFrame.lineNumber + 1,
                columnNumber: callFrame.columnNumber + 1,
                // source: {
                // 	name: maybeFileUrlToPath(callFrame.url),
                // 	path: maybeFileUrlToPath(callFrame.url),
                // 	sourceReference: 0,
                // },
            },
        });
        return id;
    };
    for (const node of profile.nodes) {
        node.locationId = getLocationIdFor(node.callFrame);
        node.positionTicks = node.positionTicks?.map(tick => ({
            ...tick,
            // weirdly, line numbers here are 1-based, not 0-based. The position tick
            // only gives line-level granularity, so 'mark' the entire range of source
            // code the tick refers to
            startLocationId: getLocationIdFor({
                ...node.callFrame,
                lineNumber: tick.line - 1,
                columnNumber: 0,
            }),
            endLocationId: getLocationIdFor({
                ...node.callFrame,
                lineNumber: tick.line,
                columnNumber: 0,
            }),
        }));
    }
    return [...locationsByRef.values()]
        .sort((a, b) => a.id - b.id)
        .map(l => ({ locations: [l.location], callFrame: l.callFrame }));
};
/**
 * Computes the model for the given profile.
 */
export const buildModel = (profile) => {
    if (!profile.timeDeltas || !profile.samples) {
        return {
            nodes: [],
            locations: [],
            samples: profile.samples || [],
            timeDeltas: profile.timeDeltas || [],
            // rootPath: profile.$vscode?.rootPath,
            duration: profile.endTime - profile.startTime,
        };
    }
    const { samples, timeDeltas } = profile;
    const sourceLocations = ensureSourceLocations(profile);
    const locations = sourceLocations.map((l, id) => {
        const src = l.locations[0]; //getBestLocation(profile, l.locations);
        return {
            id,
            selfTime: 0,
            aggregateTime: 0,
            ticks: 0,
            // category: categorize(l.callFrame, src),
            callFrame: l.callFrame,
            src,
        };
    });
    const idMap = new Map();
    const mapId = (nodeId) => {
        let id = idMap.get(nodeId);
        if (id === undefined) {
            id = idMap.size;
            idMap.set(nodeId, id);
        }
        return id;
    };
    // 1. Created a sorted list of nodes. It seems that the profile always has
    // incrementing IDs, although they are just not initially sorted.
    const nodes = new Array(profile.nodes.length);
    for (let i = 0; i < profile.nodes.length; i++) {
        const node = profile.nodes[i];
        // make them 0-based:
        const id = mapId(node.id);
        nodes[id] = {
            id,
            selfTime: 0,
            aggregateTime: 0,
            locationId: node.locationId,
            children: node.children?.map(mapId) || [],
        };
        for (const child of node.positionTicks || []) {
            if (child.startLocationId) {
                locations[child.startLocationId].ticks += child.ticks;
            }
        }
    }
    for (const node of nodes) {
        for (const child of node.children) {
            nodes[child].parent = node.id;
        }
    }
    // 2. The profile samples are the 'bottom-most' node, the currently running
    // code. Sum of these in the self time.
    const duration = profile.endTime - profile.startTime;
    let lastNodeTime = duration - timeDeltas[0];
    for (let i = 0; i < timeDeltas.length - 1; i++) {
        const d = timeDeltas[i + 1];
        nodes[mapId(samples[i])].selfTime += d;
        lastNodeTime -= d;
    }
    // Add in an extra time delta for the last sample. `timeDeltas[0]` is the
    // time before the first sample, and the time of the last sample is only
    // derived (approximately) by the missing time in the sum of deltas. Save
    // some work by calculating it here.
    if (nodes.length) {
        nodes[mapId(samples[timeDeltas.length - 1])].selfTime += lastNodeTime;
        timeDeltas.push(lastNodeTime);
    }
    // 3. Add the aggregate times for all node children and locations
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const location = locations[node.locationId];
        location.aggregateTime += computeAggregateTime(i, nodes);
        location.selfTime += node.selfTime;
    }
    return {
        nodes,
        locations,
        samples: samples.map(mapId),
        timeDeltas,
        // rootPath: profile.$vscode?.rootPath,
        duration,
    };
};
export class BottomUpNode {
    static root() {
        return new BottomUpNode({
            id: -1,
            selfTime: 0,
            aggregateTime: 0,
            ticks: 0,
            callFrame: {
                functionName: '(root)',
                lineNumber: -1,
                columnNumber: -1,
                scriptId: '0',
                url: '',
            },
        });
    }
    get id() {
        return this.location.id;
    }
    get callFrame() {
        return this.location.callFrame;
    }
    get src() {
        return this.location.src;
    }
    constructor(location, parent) {
        this.location = location;
        this.parent = parent;
        this.children = {};
        this.aggregateTime = 0;
        this.selfTime = 0;
        this.ticks = 0;
        this.childrenSize = 0;
    }
    addNode(node) {
        this.selfTime += node.selfTime;
        this.aggregateTime += node.aggregateTime;
    }
}
export const processNode = (aggregate, node, model, initialNode = node) => {
    let child = aggregate.children[node.locationId];
    if (!child) {
        child = new BottomUpNode(model.locations[node.locationId], aggregate);
        aggregate.childrenSize++;
        aggregate.children[node.locationId] = child;
    }
    child.addNode(initialNode);
    if (node.parent) {
        processNode(child, model.nodes[node.parent], model, initialNode);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZmlsaW5nL2NvbW1vbi9wcm9maWxpbmdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZFaEc7OztHQUdHO0FBQ0gsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEtBQWEsRUFBRSxLQUFzQixFQUFVLEVBQUU7SUFDOUUsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztJQUN6QixLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxLQUFLLElBQUksb0JBQW9CLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFHLENBQUMsT0FBdUIsRUFBc0MsRUFBRTtJQUU3RixJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztJQUMxQixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBOEUsQ0FBQztJQUU3RyxNQUFNLGdCQUFnQixHQUFHLENBQUMsU0FBdUIsRUFBRSxFQUFFO1FBQ3BELE1BQU0sR0FBRyxHQUFHO1lBQ1gsU0FBUyxDQUFDLFlBQVk7WUFDdEIsU0FBUyxDQUFDLEdBQUc7WUFDYixTQUFTLENBQUMsUUFBUTtZQUNsQixTQUFTLENBQUMsVUFBVTtZQUNw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