/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Parses a standard .env/.envrc file into a map of the environment variables
 * it defines.
 *
 * todo@connor4312: this can go away (if only used in Node.js targets) and be
 * replaced with `util.parseEnv`. However, currently calling that makes the
 * extension host crash.
 */
export function parseEnvFile(src) {
    const result = new Map();
    // Normalize line breaks
    const normalizedSrc = src.replace(/\r\n?/g, '\n');
    const lines = normalizedSrc.split('\n');
    for (let line of lines) {
        // Skip empty lines and comments
        line = line.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        // Parse the line into key and value
        const [key, value] = parseLine(line);
        if (key) {
            result.set(key, value);
        }
    }
    return result;
    function parseLine(line) {
        // Handle export prefix
        if (line.startsWith('export ')) {
            line = line.substring(7).trim();
        }
        // Find the key-value separator
        const separatorIndex = findIndexOutsideQuotes(line, c => c === '=' || c === ':');
        if (separatorIndex === -1) {
            return [null, null];
        }
        const key = line.substring(0, separatorIndex).trim();
        let value = line.substring(separatorIndex + 1).trim();
        // Handle comments and remove them
        const commentIndex = findIndexOutsideQuotes(value, c => c === '#');
        if (commentIndex !== -1) {
            value = value.substring(0, commentIndex).trim();
        }
        // Process quoted values
        if (value.length >= 2) {
            const firstChar = value[0];
            const lastChar = value[value.length - 1];
            if ((firstChar === '"' && lastChar === '"') ||
                (firstChar === '\'' && lastChar === '\'') ||
                (firstChar === '`' && lastChar === '`')) {
                // Remove surrounding quotes
                value = value.substring(1, value.length - 1);
                // Handle escaped characters in double quotes
                if (firstChar === '"') {
                    value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                }
            }
        }
        return [key, value];
    }
    function findIndexOutsideQuotes(text, predicate) {
        let inQuote = false;
        let quoteChar = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuote) {
                if (char === quoteChar && text[i - 1] !== '\\') {
                    inQuote = false;
                }
            }
            else if (char === '"' || char === '\'' || char === '`') {
                inQuote = true;
                quoteChar = char;
            }
            else if (predicate(char)) {
                return i;
            }
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9lbnZmaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQVc7SUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFFekMsd0JBQXdCO0lBQ3hCLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFeEMsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN4QixnQ0FBZ0M7UUFDaEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxTQUFTO1FBQ1YsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztJQUVkLFNBQVMsU0FBUyxDQUFDLElBQVk7UUFDOUIsdUJBQXVCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksR0FBRyxJQUFJ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