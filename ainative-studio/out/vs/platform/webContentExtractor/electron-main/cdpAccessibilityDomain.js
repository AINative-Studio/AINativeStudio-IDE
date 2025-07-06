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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvZWxlY3Ryb24tbWFpbi9jZHBBY2Nlc3NpYmlsaXR5RG9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBZ0NoRzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxPQUFpQjtJQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQzFDLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDekMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBRS9CLHlDQUF5QztJQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQVk7UUFDeEMsbUVBQW1FO1FBQ25FLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLFlBQVk7WUFDWixRQUFRO1lBQ1IsZUFBZTtZQUNmLFNBQVM7WUFD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