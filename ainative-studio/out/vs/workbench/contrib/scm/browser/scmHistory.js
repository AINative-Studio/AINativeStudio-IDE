/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { badgeBackground, buttonForeground, chartsBlue, chartsPurple, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, registerColor } from '../../../../platform/theme/common/colorUtils.js';
import { rot } from '../../../../base/common/numbers.js';
import { svgElem } from '../../../../base/browser/dom.js';
import { compareHistoryItemRefs } from './util.js';
export const SWIMLANE_HEIGHT = 22;
export const SWIMLANE_WIDTH = 11;
const SWIMLANE_CURVE_RADIUS = 5;
const CIRCLE_RADIUS = 4;
const CIRCLE_STROKE_WIDTH = 2;
/**
 * History item reference colors (local, remote, base)
 */
export const historyItemRefColor = registerColor('scmGraph.historyItemRefColor', chartsBlue, localize('scmGraphHistoryItemRefColor', "History item reference color."));
export const historyItemRemoteRefColor = registerColor('scmGraph.historyItemRemoteRefColor', chartsPurple, localize('scmGraphHistoryItemRemoteRefColor', "History item remote reference color."));
export const historyItemBaseRefColor = registerColor('scmGraph.historyItemBaseRefColor', '#EA5C00', localize('scmGraphHistoryItemBaseRefColor', "History item base reference color."));
/**
 * History item hover color
 */
export const historyItemHoverDefaultLabelForeground = registerColor('scmGraph.historyItemHoverDefaultLabelForeground', foreground, localize('scmGraphHistoryItemHoverDefaultLabelForeground', "History item hover default label foreground color."));
export const historyItemHoverDefaultLabelBackground = registerColor('scmGraph.historyItemHoverDefaultLabelBackground', badgeBackground, localize('scmGraphHistoryItemHoverDefaultLabelBackground', "History item hover default label background color."));
export const historyItemHoverLabelForeground = registerColor('scmGraph.historyItemHoverLabelForeground', buttonForeground, localize('scmGraphHistoryItemHoverLabelForeground', "History item hover label foreground color."));
export const historyItemHoverAdditionsForeground = registerColor('scmGraph.historyItemHoverAdditionsForeground', { light: '#587C0C', dark: '#81B88B', hcDark: '#A1E3AD', hcLight: '#374E06' }, localize('scmGraph.HistoryItemHoverAdditionsForeground', "History item hover additions foreground color."));
export const historyItemHoverDeletionsForeground = registerColor('scmGraph.historyItemHoverDeletionsForeground', { light: '#AD0707', dark: '#C74E39', hcDark: '#C74E39', hcLight: '#AD0707' }, localize('scmGraph.HistoryItemHoverDeletionsForeground', "History item hover deletions foreground color."));
/**
 * History graph color registry
 */
export const colorRegistry = [
    registerColor('scmGraph.foreground1', '#FFB000', localize('scmGraphForeground1', "Source control graph foreground color (1).")),
    registerColor('scmGraph.foreground2', '#DC267F', localize('scmGraphForeground2', "Source control graph foreground color (2).")),
    registerColor('scmGraph.foreground3', '#994F00', localize('scmGraphForeground3', "Source control graph foreground color (3).")),
    registerColor('scmGraph.foreground4', '#40B0A6', localize('scmGraphForeground4', "Source control graph foreground color (4).")),
    registerColor('scmGraph.foreground5', '#B66DFF', localize('scmGraphForeground5', "Source control graph foreground color (5).")),
];
function getLabelColorIdentifier(historyItem, colorMap) {
    for (const ref of historyItem.references ?? []) {
        const colorIdentifier = colorMap.get(ref.id);
        if (colorIdentifier !== undefined) {
            return colorIdentifier;
        }
    }
    return undefined;
}
function createPath(colorIdentifier) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '1px');
    path.setAttribute('stroke-linecap', 'round');
    path.style.stroke = asCssVariable(colorIdentifier);
    return path;
}
function drawCircle(index, radius, strokeWidth, colorIdentifier) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${SWIMLANE_WIDTH * (index + 1)}`);
    circle.setAttribute('cy', `${SWIMLANE_WIDTH}`);
    circle.setAttribute('r', `${radius}`);
    circle.style.strokeWidth = `${strokeWidth}px`;
    if (colorIdentifier) {
        circle.style.fill = asCssVariable(colorIdentifier);
    }
    return circle;
}
function drawVerticalLine(x1, y1, y2, color) {
    const path = createPath(color);
    path.setAttribute('d', `M ${x1} ${y1} V ${y2}`);
    return path;
}
function findLastIndex(nodes, id) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].id === id) {
            return i;
        }
    }
    return -1;
}
export function renderSCMHistoryItemGraph(historyItemViewModel) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph');
    const historyItem = historyItemViewModel.historyItem;
    const inputSwimlanes = historyItemViewModel.inputSwimlanes;
    const outputSwimlanes = historyItemViewModel.outputSwimlanes;
    // Find the history item in the input swimlanes
    const inputIndex = inputSwimlanes.findIndex(node => node.id === historyItem.id);
    // Circle index - use the input swimlane index if present, otherwise add it to the end
    const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
    // Circle color - use the output swimlane color if present, otherwise the input swimlane color
    const circleColor = circleIndex < outputSwimlanes.length ? outputSwimlanes[circleIndex].color :
        circleIndex < inputSwimlanes.length ? inputSwimlanes[circleIndex].color : historyItemRefColor;
    let outputSwimlaneIndex = 0;
    for (let index = 0; index < inputSwimlanes.length; index++) {
        const color = inputSwimlanes[index].color;
        // Current commit
        if (inputSwimlanes[index].id === historyItem.id) {
            // Base commit
            if (index !== circleIndex) {
                const d = [];
                const path = createPath(color);
                // Draw /
                d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (index)} ${SWIMLANE_WIDTH}`);
                // Draw -
                d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)}`);
                path.setAttribute('d', d.join(' '));
                svg.append(path);
            }
            else {
                outputSwimlaneIndex++;
            }
        }
        else {
            // Not the current commit
            if (outputSwimlaneIndex < outputSwimlanes.length &&
                inputSwimlanes[index].id === outputSwimlanes[outputSwimlaneIndex].id) {
                if (index === outputSwimlaneIndex) {
                    // Draw |
                    const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, color);
                    svg.append(path);
                }
                else {
                    const d = [];
                    const path = createPath(color);
                    // Draw |
                    d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                    d.push(`V 6`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 1 ${(SWIMLANE_WIDTH * (index + 1)) - SWIMLANE_CURVE_RADIUS} ${SWIMLANE_HEIGHT / 2}`);
                    // Draw -
                    d.push(`H ${(SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 0 ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)} ${(SWIMLANE_HEIGHT / 2) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw |
                    d.push(`V ${SWIMLANE_HEIGHT}`);
                    path.setAttribute('d', d.join(' '));
                    svg.append(path);
                }
                outputSwimlaneIndex++;
            }
        }
    }
    // Add remaining parent(s)
    for (let i = 1; i < historyItem.parentIds.length; i++) {
        const parentOutputIndex = findLastIndex(outputSwimlanes, historyItem.parentIds[i]);
        if (parentOutputIndex === -1) {
            continue;
        }
        // Draw -\
        const d = [];
        const path = createPath(outputSwimlanes[parentOutputIndex].color);
        // Draw \
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (parentOutputIndex + 1)} ${SWIMLANE_HEIGHT}`);
        // Draw -
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)} `);
        path.setAttribute('d', d.join(' '));
        svg.append(path);
    }
    // Draw | to *
    if (inputIndex !== -1) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), 0, SWIMLANE_HEIGHT / 2, inputSwimlanes[inputIndex].color);
        svg.append(path);
    }
    // Draw | from *
    if (historyItem.parentIds.length > 0) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), SWIMLANE_HEIGHT / 2, SWIMLANE_HEIGHT, circleColor);
        svg.append(path);
    }
    // Draw *
    if (historyItemViewModel.isCurrent) {
        // HEAD
        const outerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 3, CIRCLE_STROKE_WIDTH, circleColor);
        svg.append(outerCircle);
        const innerCircle = drawCircle(circleIndex, CIRCLE_STROKE_WIDTH, CIRCLE_RADIUS);
        svg.append(innerCircle);
    }
    else {
        if (historyItem.parentIds.length > 1) {
            // Multi-parent node
            const circleOuter = drawCircle(circleIndex, CIRCLE_RADIUS + 2, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleOuter);
            const circleInner = drawCircle(circleIndex, CIRCLE_RADIUS - 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleInner);
        }
        else {
            // Node
            const circle = drawCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circle);
        }
    }
    // Set dimensions
    svg.style.height = `${SWIMLANE_HEIGHT}px`;
    svg.style.width = `${SWIMLANE_WIDTH * (Math.max(inputSwimlanes.length, outputSwimlanes.length, 1) + 1)}px`;
    return svg;
}
export function renderSCMHistoryGraphPlaceholder(columns) {
    const elements = svgElem('svg', {
        style: { height: `${SWIMLANE_HEIGHT}px`, width: `${SWIMLANE_WIDTH * (columns.length + 1)}px`, }
    });
    // Draw |
    for (let index = 0; index < columns.length; index++) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, columns[index].color);
        elements.root.append(path);
    }
    return elements.root;
}
export function toISCMHistoryItemViewModelArray(historyItems, colorMap = new Map(), currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    let colorIndex = -1;
    const viewModels = [];
    for (let index = 0; index < historyItems.length; index++) {
        const historyItem = historyItems[index];
        const isCurrent = historyItem.id === currentHistoryItemRef?.revision;
        const outputSwimlanesFromPreviousItem = viewModels.at(-1)?.outputSwimlanes ?? [];
        const inputSwimlanes = outputSwimlanesFromPreviousItem.map(i => deepClone(i));
        const outputSwimlanes = [];
        let firstParentAdded = false;
        // Add first parent to the output
        if (historyItem.parentIds.length > 0) {
            for (const node of inputSwimlanes) {
                if (node.id === historyItem.id) {
                    if (!firstParentAdded) {
                        outputSwimlanes.push({
                            id: historyItem.parentIds[0],
                            color: getLabelColorIdentifier(historyItem, colorMap) ?? node.color
                        });
                        firstParentAdded = true;
                    }
                    continue;
                }
                outputSwimlanes.push(deepClone(node));
            }
        }
        // Add unprocessed parent(s) to the output
        for (let i = firstParentAdded ? 1 : 0; i < historyItem.parentIds.length; i++) {
            // Color index (label -> next color)
            let colorIdentifier;
            if (i === 0) {
                colorIdentifier = getLabelColorIdentifier(historyItem, colorMap);
            }
            else {
                const historyItemParent = historyItems
                    .find(h => h.id === historyItem.parentIds[i]);
                colorIdentifier = historyItemParent ? getLabelColorIdentifier(historyItemParent, colorMap) : undefined;
            }
            if (!colorIdentifier) {
                colorIndex = rot(colorIndex + 1, colorRegistry.length);
                colorIdentifier = colorRegistry[colorIndex];
            }
            outputSwimlanes.push({
                id: historyItem.parentIds[i],
                color: colorIdentifier
            });
        }
        // Add colors to references
        const references = (historyItem.references ?? [])
            .map(ref => {
            let color = colorMap.get(ref.id);
            if (colorMap.has(ref.id) && color === undefined) {
                // Find the history item in the input swimlanes
                const inputIndex = inputSwimlanes.findIndex(node => node.id === historyItem.id);
                // Circle index - use the input swimlane index if present, otherwise add it to the end
                const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
                // Circle color - use the output swimlane color if present, otherwise the input swimlane color
                color = circleIndex < outputSwimlanes.length ? outputSwimlanes[circleIndex].color :
                    circleIndex < inputSwimlanes.length ? inputSwimlanes[circleIndex].color : historyItemRefColor;
            }
            return { ...ref, color };
        });
        // Sort references
        references.sort((ref1, ref2) => compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef));
        viewModels.push({
            historyItem: {
                ...historyItem,
                references
            },
            isCurrent,
            inputSwimlanes,
            outputSwimlanes,
        });
    }
    return viewModels;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21IaXN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzdJLE9BQU8sRUFBRSxhQUFhLEVBQW1CLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRW5ELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFDbEMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztBQUNqQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQztBQUNoQyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUM7QUFDeEIsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7QUFFOUI7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsOEJBQThCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7QUFDdkssTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcs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