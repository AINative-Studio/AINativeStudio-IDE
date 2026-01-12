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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VUb29sUmVzdWx0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9yZWFjdC9zcmMvdG9vbC1yZXN1bHRzL3BhcnNlVG9vbFJlc3VsdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEc7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLFlBQW9CLEVBQ3BCLFlBQW9CLEVBQ3BCLFFBQWdCO0lBRWhCLE1BQU0sVUFBVSxHQUEwQixFQUFFLENBQUM7SUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUU3QixzQ0FBc0M7SUFDdEMsTUFBTSxpQkFBaUIsR0FBRztRQUN6QixvRkFBb0Y7UUFDcEYsMkJBQTJCO1FBQzNCLHdEQUF3RDtRQUN4RCx3REFBd0Q7UUFDeEQsNkJBQTZCO0tBQzdCLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFbkYsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixNQUFNLE1BQU0sR0FBRywyQkFBMkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6RCxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ2YsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVM7WUFDNUIsU0FBUztZQUNULFlBQVk7WUFDWixRQUFRO1lBQ1IsTUFBTTtTQUNOLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsTUFBTSxnQkFBZ0IsR0FBRztRQUN4Qix3REFBd0Q7UUFDeEQsbUJBQW1CO1FB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