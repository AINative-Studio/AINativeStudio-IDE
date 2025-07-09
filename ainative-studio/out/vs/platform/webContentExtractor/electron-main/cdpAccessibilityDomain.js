/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Converts an array of AXNode objects to a readable format.
 * It processes the nodes to extract their text content, ignoring navigation elements and
 * formatting them in a structured way.
 *
 * @remarks We can do more here, but this is a good start.
 * @param axNodes - The array of AXNode objects to be converted to a readable format.
 * @returns string
 */
export function convertToReadibleFormat(axNodes) {
    if (!axNodes.length) {
        return '';
    }
    const nodeMap = new Map();
    const processedNodes = new Set();
    const rootNodes = [];
    // Build node map and identify root nodes
    for (const node of axNodes) {
        nodeMap.set(node.nodeId, node);
        if (!node.parentId || !axNodes.some(n => n.nodeId === node.parentId)) {
            rootNodes.push(node);
        }
    }
    function isNavigationElement(node) {
        // Skip navigation and UI elements that don't contribute to content
        const skipRoles = [
            'navigation',
            'banner',
            'complementary',
            'toolbar',
            'menu',
            'menuitem',
            'tab',
            'tablist'
        ];
        const skipTexts = [
            'Skip to main content',
            'Toggle navigation',
            'Previous',
            'Next',
            'Copy',
            'Direct link to',
            'On this page',
            'Edit this page',
            'Search',
            'Command+K'
        ];
        const text = getNodeText(node);
        const role = node.role?.value?.toString().toLowerCase() || '';
        // allow-any-unicode-next-line
        return skipRoles.includes(role) ||
            skipTexts.some(skipText => text.includes(skipText)) ||
            text.startsWith('Direct link to') ||
            text.startsWith('\xAB ') || // Left-pointing double angle quotation mark
            text.endsWith(' \xBB') || // Right-pointing double angle quotation mark
            /^#\s*$/.test(text) || // Skip standalone # characters
            text === '\u200B'; // Zero-width space character
    }
    function getNodeText(node) {
        const parts = [];
        // Add name if available
        if (node.name?.value) {
            parts.push(String(node.name.value));
        }
        // Add value if available and different from name
        if (node.value?.value && node.value.value !== node.name?.value) {
            parts.push(String(node.value.value));
        }
        // Add description if available and different from name and value
        if (node.description?.value &&
            node.description.value !== node.name?.value &&
            node.description.value !== node.value?.value) {
            parts.push(String(node.description.value));
        }
        return parts.join(' ').trim();
    }
    function isCodeBlock(node) {
        return node.role?.value === 'code' ||
            (node.properties || []).some(p => p.name === 'code-block' || p.name === 'pre');
    }
    function processNode(node, depth = 0, parentContext = { inCodeBlock: false, codeText: [] }) {
        if (!node || node.ignored || processedNodes.has(node.nodeId)) {
            return [];
        }
        if (isNavigationElement(node)) {
            return [];
        }
        processedNodes.add(node.nodeId);
        const lines = [];
        const text = getNodeText(node);
        const currentIsCode = isCodeBlock(node);
        const context = currentIsCode ? { inCodeBlock: true, codeText: [] } : parentContext;
        if (text) {
            const indent = '  '.repeat(depth);
            if (currentIsCode || context.inCodeBlock) {
                // For code blocks, collect text without adding newlines
                context.codeText.push(text.trim());
            }
            else {
                lines.push(indent + text);
            }
        }
        // Process children
        if (node.childIds) {
            for (const childId of node.childIds) {
                const child = nodeMap.get(childId);
                if (child) {
                    const childLines = processNode(child, depth + 1, context);
                    lines.push(...childLines);
                }
            }
        }
        // If this is the root code block node, join all collected code text
        if (currentIsCode && context.codeText.length > 0) {
            const indent = '  '.repeat(depth);
            lines.push(indent + context.codeText.join(' '));
        }
        return lines;
    }
    // Process all nodes starting from roots
    const allLines = [];
    for (const node of rootNodes) {
        const nodeLines = processNode(node);
        if (nodeLines.length > 0) {
            allLines.push(...nodeLines);
        }
    }
    // Process any remaining unprocessed nodes
    for (const node of axNodes) {
        if (!processedNodes.has(node.nodeId)) {
            const nodeLines = processNode(node);
            if (nodeLines.length > 0) {
                allLines.push(...nodeLines);
            }
        }
    }
    // Clean up empty lines and trim
    return allLines
        .filter((line, index, array) => {
        // Keep the line if it's not empty or if it's not adjacent to another empty line
        return line.trim() || (index > 0 && array[index - 1].trim());
    })
        .join('\n')
        .trim();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL2VsZWN0cm9uLW1haW4vY2RwQWNjZXNzaWJpbGl0eURvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWdDaEc7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsT0FBaUI7SUFDeEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUMxQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ3pDLE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUUvQix5Q0FBeUM7SUFDekMsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN0RSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBQyxJQUFZO1FBQ3hDLG1FQUFtRTtRQUNuRSxNQUFNLFNBQVMsR0FBRztZQUNqQixZQUFZO1lBQ1osUUFBUTtZQUNSLGVBQWU7WUFDZixTQUFTO1lB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