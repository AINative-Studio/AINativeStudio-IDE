/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
/**
 * Extract frontmatter from markdown content
 * Frontmatter is expected to be between --- delimiters at the start of the file
 */
export function extractFrontmatter(content) {
    if (!content || content.trim().length === 0) {
        return {
            success: false,
            error: 'Content is empty'
        };
    }
    const trimmed = content.trim();
    if (!trimmed.startsWith('---')) {
        return {
            success: false,
            error: 'No frontmatter found (must start with ---)'
        };
    }
    // Find the closing --- delimiter
    const lines = trimmed.split('\n');
    let closingIndex = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            closingIndex = i;
            break;
        }
    }
    if (closingIndex === -1) {
        return {
            success: false,
            error: 'Frontmatter not closed (missing closing ---)'
        };
    }
    // Extract frontmatter (between the --- delimiters)
    const frontmatter = lines.slice(1, closingIndex).join('\n');
    // Extract content (after the closing ---)
    const contentLines = lines.slice(closingIndex + 1);
    const extractedContent = contentLines.join('\n');
    return {
        success: true,
        frontmatter,
        content: extractedContent
    };
}
/**
 * Simple YAML parser for skill frontmatter
 * Handles basic YAML syntax for our skill metadata needs
 */
export function parseFrontmatter(yamlContent) {
    try {
        const metadata = {};
        const lines = yamlContent.split('\n');
        let currentKey = null;
        let currentArray = [];
        let inArray = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            // Check if this is an array item
            if (trimmed.startsWith('- ')) {
                if (!inArray || !currentKey) {
                    return {
                        success: false,
                        error: `Unexpected array item at line ${i + 1}`
                    };
                }
                currentArray.push(trimmed.substring(2).trim());
                continue;
            }
            // If we were building an array, save it
            if (inArray && currentKey) {
                metadata[currentKey] = currentArray;
                currentArray = [];
                inArray = false;
                currentKey = null;
            }
            // Parse key-value pair
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) {
                continue; // Skip malformed lines
            }
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            if (!value || value === '[]') {
                // Empty value or empty array
                if (value === '[]') {
                    metadata[key] = [];
                }
                else {
                    // Might be starting an array
                    inArray = true;
                    currentKey = key;
                    currentArray = [];
                }
            }
            else {
                // Simple key-value
                metadata[key] = value;
            }
        }
        // Save last array if we were building one
        if (inArray && currentKey) {
            metadata[currentKey] = currentArray;
        }
        // Validate required fields
        if (!metadata.name || typeof metadata.name !== 'string') {
            return {
                success: false,
                error: 'Required field "name" is missing or invalid'
            };
        }
        if (!metadata.description || typeof metadata.description !== 'string') {
            return {
                success: false,
                error: 'Required field "description" is missing or invalid'
            };
        }
        if (!metadata.location || typeof metadata.location !== 'string') {
            return {
                success: false,
                error: 'Required field "location" is missing or invalid'
            };
        }
        // Validate location value
        if (metadata.location !== 'managed' && metadata.location !== 'project') {
            return {
                success: false,
                error: 'Field "location" must be either "managed" or "project"'
            };
        }
        return {
            success: true,
            metadata: metadata
        };
    }
    catch (error) {
        return {
            success: false,
            error: `YAML parsing failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
/**
 * Parse a complete skill file
 */
export function parseSkillFile(content, filePath, lastModified) {
    // Extract frontmatter
    const extractionResult = extractFrontmatter(content);
    if (!extractionResult.success) {
        return {
            success: false,
            error: `Failed to extract frontmatter: ${extractionResult.error}`
        };
    }
    // Parse frontmatter
    const parseResult = parseFrontmatter(extractionResult.frontmatter);
    if (!parseResult.success) {
        return {
            success: false,
            error: `Failed to parse frontmatter: ${parseResult.error}`
        };
    }
    // Create skill object
    const skill = {
        metadata: parseResult.metadata,
        content,
        instructions: extractionResult.content || '',
        filePath,
        lastModified
    };
    return {
        success: true,
        skill
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQXVCMUY7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLE9BQWU7SUFDakQsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzdDLE9BQU87WUFDTixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxrQkFBa0I7U0FDekIsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNoQyxPQUFPO1lBQ04sT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsNENBQTRDO1NBQ25ELENBQUM7SUFDSCxDQUFDO0lBRUQsaUNBQWlDO0lBQ2pDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN2QyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMvQixZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLE1BQU07UUFDUCxDQUFDO0lBQ0Ys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