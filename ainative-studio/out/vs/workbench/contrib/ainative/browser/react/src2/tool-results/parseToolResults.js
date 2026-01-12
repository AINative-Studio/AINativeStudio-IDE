/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Parse assistant response for tool executions
 *
 * Detects mentions like:
 * - "I've analyzed the code using code_intelligence"
 * - "I fetched the documentation from docs.python.org"
 * - "The complexity is 15..."
 * - "Found 3 functions..."
 */
export function parseToolExecutions(responseText, messageIndex, threadId) {
    const executions = [];
    const timestamp = new Date();
    // Detect code_intelligence tool usage
    const codeIntelPatterns = [
        /(?:analyzed|analyzing|analyze)\s+(?:the\s+)?code(?:\s+using\s+code_intelligence)?/i,
        /code_intelligence\s+tool/i,
        /(?:complexity|cyclomatic|cognitive)\s+(?:is|of|score)/i,
        /(?:found|detected)\s+\d+\s+(?:function|symbol|import)/i,
        /AST\s+(?:parsing|analysis)/i,
    ];
    const hasCodeIntel = codeIntelPatterns.some(pattern => pattern.test(responseText));
    if (hasCodeIntel) {
        const result = parseCodeIntelligenceResult(responseText);
        executions.push({
            toolName: 'code_intelligence',
            operation: result?.operation,
            timestamp,
            messageIndex,
            threadId,
            result
        });
    }
    // Detect web_fetch tool usage
    const webFetchPatterns = [
        /(?:fetched|fetching|fetch)\s+(?:the\s+)?documentation/i,
        /web_fetch\s+tool/i,
        /(?:retrieved|retrieving)\s+from\s+https?:\/\//i,
        /documentation\s+from\s+[\w.-]+\.(?:org|com|io|dev)/i,
    ];
    const hasWebFetch = webFetchPatterns.some(pattern => pattern.test(responseText));
    if (hasWebFetch) {
        const result = parseWebFetchResult(responseText);
        executions.push({
            toolName: 'web_fetch',
            operation: result?.operation,
            timestamp,
            messageIndex,
            threadId,
            result
        });
    }
    return executions;
}
/**
 * Parse code intelligence result from response text
 */
function parseCodeIntelligenceResult(text) {
    const result = {
        type: 'code_intelligence',
        operation: 'analyze_complexity', // default
        rawText: text
    };
    // Detect operation type
    if (/complexity|cyclomatic|cognitive/i.test(text)) {
        result.operation = 'analyze_complexity';
        result.complexity = parseComplexityMetrics(text);
    }
    else if (/AST|parse|syntax tree/i.test(text)) {
        result.operation = 'parse_ast';
        result.symbols = parseSymbols(text);
    }
    else if (/import|from|require/i.test(text)) {
        result.operation = 'analyze_imports';
        result.imports = parseImports(text);
    }
    else if (/reference|usage|call/i.test(text)) {
        result.operation = 'find_references';
        result.references = parseReferences(text);
    }
    // Extract language
    const langMatch = text.match(/(?:python|javascript|typescript)(?:\s+code)?/i);
    if (langMatch) {
        result.language = langMatch[0].toLowerCase().replace(/\s+code/i, '');
    }
    return result;
}
/**
 * Parse complexity metrics from text
 */
function parseComplexityMetrics(text) {
    const functions = [];
    // Pattern: "function_name: complexity 15" or "function_name (line 10): 15"
    const funcPattern = /(?:function|method|def)\s+([a-zA-Z_]\w*)\s*(?:\(line\s+(\d+)\))?[:\s]+(?:complexity\s+)?(\d+)/gi;
    let match;
    while ((match = funcPattern.exec(text)) !== null) {
        const complexity = parseInt(match[3], 10);
        functions.push({
            name: match[1],
            cyclomaticComplexity: complexity,
            cognitiveComplexity: complexity,
            line: match[2] ? parseInt(match[2], 10) : 0,
            column: 0,
            complexityRank: getComplexityRank(complexity)
        });
    }
    // Extract average/max from text
    const avgMatch = text.match(/average\s+complexity[:\s]+(\d+(?:\.\d+)?)/i);
    const maxMatch = text.match(/max(?:imum)?\s+complexity[:\s]+(\d+)/i);
    const totalMatch = text.match(/(\d+)\s+(?:total\s+)?functions?/i);
    const averageComplexity = avgMatch ? parseFloat(avgMatch[1]) : 0;
    const maxComplexity = maxMatch ? parseInt(maxMatch[1], 10) : Math.max(...functions.map(f => f.cyclomaticComplexity), 0);
    const totalFunctions = totalMatch ? parseInt(totalMatch[1], 10) : functions.length;
    return {
        functions,
        averageComplexity,
        maxComplexity,
        totalFunctions
    };
}
/**
 * Parse symbols from text
 */
function parseSymbols(text) {
    const symbols = [];
    // Pattern: "function foo at line 10" or "class Bar (line 5)"
    const symbolPattern = /(function|class|variable|method)\s+([a-zA-Z_]\w*)\s*(?:at\s+line|line|\(line)\s+(\d+)/gi;
    let match;
    while ((match = symbolPattern.exec(text)) !== null) {
        symbols.push({
            name: match[2],
            type: match[1].toLowerCase(),
            line: parseInt(match[3], 10),
            column: 0
        });
    }
    return symbols;
}
/**
 * Parse imports from text
 */
function parseImports(text) {
    const imports = [];
    // Pattern: "imports: numpy, pandas, os" or "imported: numpy"
    const importsMatch = text.match(/imports?[:\s]+([a-zA-Z0-9_.,\s]+)/i);
    if (importsMatch) {
        const importsList = importsMatch[1].split(/[,\s]+/).filter(s => s.length > 0);
        imports.push(...importsList);
    }
    return imports;
}
/**
 * Parse references from text
 */
function parseReferences(text) {
    const references = [];
    // Pattern: "reference at line 15" or "called at line 20"
    const refPattern = /(?:reference|call|usage)\s+at\s+line\s+(\d+)/gi;
    let match;
    while ((match = refPattern.exec(text)) !== null) {
        references.push({
            line: parseInt(match[1], 10),
            column: 0,
            type: 'access',
            context: ''
        });
    }
    return references;
}
/**
 * Parse web fetch result from response text
 */
function parseWebFetchResult(text) {
    const result = {
        type: 'web_fetch',
        operation: 'fetch_documentation',
        rawText: text
    };
    // Extract URL
    const urlMatch = text.match(/(https?:\/\/[^\s<>"]+)/i);
    if (urlMatch) {
        result.url = urlMatch[1];
        // Extract domain as title
        try {
            const url = new URL(result.url);
            result.title = url.hostname;
        }
        catch {
            result.title = 'Documentation';
        }
    }
    // Look for markdown content blocks
    const codeBlockMatch = text.match(/```markdown\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
        result.content = codeBlockMatch[1];
    }
    else {
        // Use text after "documentation:" as content
        const contentMatch = text.match(/documentation[:\s]+([\s\S]+)/i);
        if (contentMatch) {
            result.content = contentMatch[1].trim();
        }
    }
    // Extract size if mentioned
    const sizeMatch = text.match(/(\d+)\s*(?:bytes|KB|MB)/i);
    if (sizeMatch) {
        result.sizeBytes = parseInt(sizeMatch[1], 10);
    }
    // Check if truncated
    result.truncated = /truncated|limited|partial/i.test(text);
    return result;
}
/**
 * Get complexity rank from cyclomatic complexity value
 */
function getComplexityRank(complexity) {
    if (complexity <= 5)
        return 'A';
    if (complexity <= 10)
        return 'B';
    if (complexity <= 20)
        return 'C';
    if (complexity <= 30)
        return 'D';
    if (complexity <= 40)
        return 'E';
    return 'F';
}
/**
 * Extract tool name from response
 */
export function extractToolName(text) {
    if (/code_intelligence|complexity|AST|symbol/i.test(text)) {
        return 'code_intelligence';
    }
    if (/web_fetch|documentation|fetched/i.test(text)) {
        return 'web_fetch';
    }
    return 'unknown';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VUb29sUmVzdWx0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9yZWFjdC9zcmMyL3Rvb2wtcmVzdWx0cy9wYXJzZVRvb2xSZXN1bHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBWWhHOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxZQUFvQixFQUNwQixZQUFvQixFQUNwQixRQUFnQjtJQUVoQixNQUFNLFVBQVUsR0FBMEIsRUFBRSxDQUFDO0lBQzdDLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFFN0Isc0NBQXNDO0lBQ3RDLE1BQU0saUJBQWlCLEdBQUc7UUFDekIsb0ZBQW9GO1FBQ3BGLDJCQUEyQjtRQUMzQix3REFBd0Q7UUFDeEQsd0RBQXdEO1FBQ3hELDZCQUE2QjtLQUM3QixDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBRW5GLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsTUFBTSxNQUFNLEdBQUcsMkJBQTJCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekQsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNmLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTO1lBQzVCLFNBQVM7WUFDVCxZQUFZO1lBQ1osUUFBUTtZQUNSLE1BQU07U0FDTixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsOEJBQThCO0lBQzlCLE1BQU0sZ0JBQWdCLEdBQUc7UUFDeEIsd0RBQXdEO1FBQ3hELG1CQUFtQjtR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