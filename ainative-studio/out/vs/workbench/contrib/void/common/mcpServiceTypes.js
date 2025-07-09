/**
 * mcp-response-types.ts
 * --------------------------------------------------
 * **Pure** TypeScript interfaces (no external imports)
 * describing the JSON-RPC response shapes for:
 *
 *   1. tools/list      -> ToolsListResponse
 *   2. prompts/list    -> PromptsListResponse
 *   3. tools/call      -> ToolCallResponse
 *
 * They are distilled directly from the official MCP
 * 2025‑03‑26 specification:
 *   • Tools list response examples
 *   • Prompts list response examples
 *   • Tool call response examples
 *
 * Use them to get full IntelliSense when working with
 * @modelcontextprotocol/inspector‑cli responses.
 */
export const removeMCPToolNamePrefix = (name) => {
    return name.split('_').slice(1).join('_');
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZVR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL21jcFNlcnZpY2VUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBNk5ILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDdkQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDMUMsQ0FBQyxDQUFBIn0=