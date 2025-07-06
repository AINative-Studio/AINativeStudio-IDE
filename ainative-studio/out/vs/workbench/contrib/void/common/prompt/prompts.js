/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { os } from '../helpers/systemInfo.js';
import { approvalTypeOfBuiltinToolName } from '../toolsServiceTypes.js';
// Triple backtick wrapper used throughout the prompts for code blocks
export const tripleTick = ['```', '```'];
// Maximum limits for directory structure information
export const MAX_DIRSTR_CHARS_TOTAL_BEGINNING = 20_000;
export const MAX_DIRSTR_CHARS_TOTAL_TOOL = 20_000;
export const MAX_DIRSTR_RESULTS_TOTAL_BEGINNING = 100;
export const MAX_DIRSTR_RESULTS_TOTAL_TOOL = 100;
// tool info
export const MAX_FILE_CHARS_PAGE = 500_000;
export const MAX_CHILDREN_URIs_PAGE = 500;
// terminal tool info
export const MAX_TERMINAL_CHARS = 100_000;
export const MAX_TERMINAL_INACTIVE_TIME = 8; // seconds
export const MAX_TERMINAL_BG_COMMAND_TIME = 5;
// Maximum character limits for prefix and suffix context
export const MAX_PREFIX_SUFFIX_CHARS = 20_000;
export const ORIGINAL = `<<<<<<< ORIGINAL`;
export const DIVIDER = `=======`;
export const FINAL = `>>>>>>> UPDATED`;
const searchReplaceBlockTemplate = `\
${ORIGINAL}
// ... original code goes here
${DIVIDER}
// ... final code goes here
${FINAL}

${ORIGINAL}
// ... original code goes here
${DIVIDER}
// ... final code goes here
${FINAL}`;
const createSearchReplaceBlocks_systemMessage = `\
You are a coding assistant that takes in a diff, and outputs SEARCH/REPLACE code blocks to implement the change(s) in the diff.
The diff will be labeled \`DIFF\` and the original file will be labeled \`ORIGINAL_FILE\`.

Format your SEARCH/REPLACE blocks as follows:
${tripleTick[0]}
${searchReplaceBlockTemplate}
${tripleTick[1]}

1. Your SEARCH/REPLACE block(s) must implement the diff EXACTLY. Do NOT leave anything out.

2. You are allowed to output multiple SEARCH/REPLACE blocks to implement the change.

3. Assume any comments in the diff are PART OF THE CHANGE. Include them in the output.

4. Your output should consist ONLY of SEARCH/REPLACE blocks. Do NOT output any text or explanations before or after this.

5. The ORIGINAL code in each SEARCH/REPLACE block must EXACTLY match lines in the original file. Do not add or remove any whitespace, comments, or modifications from the original code.

6. Each ORIGINAL text must be large enough to uniquely identify the change in the file. However, bias towards writing as little as possible.

7. Each ORIGINAL text must be DISJOINT from all other ORIGINAL text.

## EXAMPLE 1
DIFF
${tripleTick[0]}
// ... existing code
let x = 6.5
// ... existing code
${tripleTick[1]}

ORIGINAL_FILE
${tripleTick[0]}
let w = 5
let x = 6
let y = 7
let z = 8
${tripleTick[1]}

ACCEPTED OUTPUT
${tripleTick[0]}
${ORIGINAL}
let x = 6
${DIVIDER}
let x = 6.5
${FINAL}
${tripleTick[1]}`;
const replaceTool_description = `\
A string of SEARCH/REPLACE block(s) which will be applied to the given file.
Your SEARCH/REPLACE blocks string must be formatted as follows:
${searchReplaceBlockTemplate}

## Guidelines:

1. You may output multiple search replace blocks if needed.

2. The ORIGINAL code in each SEARCH/REPLACE block must EXACTLY match lines in the original file. Do not add or remove any whitespace or comments from the original code.

3. Each ORIGINAL text must be large enough to uniquely identify the change. However, bias towards writing as little as possible.

4. Each ORIGINAL text must be DISJOINT from all other ORIGINAL text.

5. This field is a STRING (not an array).`;
// ======================================================== tools ========================================================
const chatSuggestionDiffExample = `\
${tripleTick[0]}typescript
/Users/username/Dekstop/my_project/app.ts
// ... existing code ...
// {{change 1}}
// ... existing code ...
// {{change 2}}
// ... existing code ...
// {{change 3}}
// ... existing code ...
${tripleTick[1]}`;
const uriParam = (object) => ({
    uri: { description: `The FULL path to the ${object}.` }
});
const paginationParam = {
    page_number: { description: 'Optional. The page number of the result. Default is 1.' }
};
const terminalDescHelper = `You can use this tool to run any command: sed, grep, etc. Do not edit any files with this tool; use edit_file instead. When working with git and other tools that open an editor (e.g. git diff), you should pipe to cat to get all results and not get stuck in vim.`;
const cwdHelper = 'Optional. The directory in which to run the command. Defaults to the first workspace folder.';
export const builtinTools = {
    // --- context-gathering (read/search/list) ---
    read_file: {
        name: 'read_file',
        description: `Returns full contents of a given file.`,
        params: {
            ...uriParam('file'),
            start_line: { description: 'Optional. Do NOT fill this field in unless you were specifically given exact line numbers to search. Defaults to the beginning of the file.' },
            end_line: { description: 'Optional. Do NOT fill this field in unless you were specifically given exact line numbers to search. Defaults to the end of the file.' },
            ...paginationParam,
        },
    },
    ls_dir: {
        name: 'ls_dir',
        description: `Lists all files and folders in the given URI.`,
        params: {
            uri: { description: `Optional. The FULL path to the ${'folder'}. Leave this as empty or "" to search all folders.` },
            ...paginationParam,
        },
    },
    get_dir_tree: {
        name: 'get_dir_tree',
        description: `This is a very effective way to learn about the user's codebase. Returns a tree diagram of all the files and folders in the given folder. `,
        params: {
            ...uriParam('folder')
        }
    },
    // pathname_search: {
    // 	name: 'pathname_search',
    // 	description: `Returns all pathnames that match a given \`find\`-style query over the entire workspace. ONLY searches file names. ONLY searches the current workspace. You should use this when looking for a file with a specific name or path. ${paginationHelper.desc}`,
    search_pathnames_only: {
        name: 'search_pathnames_only',
        description: `Returns all pathnames that match a given query (searches ONLY file names). You should use this when looking for a file with a specific name or path.`,
        params: {
            query: { description: `Your query for the search.` },
            include_pattern: { description: 'Optional. Only fill this in if you need to limit your search because there were too many results.' },
            ...paginationParam,
        },
    },
    search_for_files: {
        name: 'search_for_files',
        description: `Returns a list of file names whose content matches the given query. The query can be any substring or regex.`,
        params: {
            query: { description: `Your query for the search.` },
            search_in_folder: { description: 'Optional. Leave as blank by default. ONLY fill this in if your previous search with the same query was truncated. Searches descendants of this folder only.' },
            is_regex: { description: 'Optional. Default is false. Whether the query is a regex.' },
            ...paginationParam,
        },
    },
    // add new search_in_file tool
    search_in_file: {
        name: 'search_in_file',
        description: `Returns an array of all the start line numbers where the content appears in the file.`,
        params: {
            ...uriParam('file'),
            query: { description: 'The string or regex to search for in the file.' },
            is_regex: { description: 'Optional. Default is false. Whether the query is a regex.' }
        }
    },
    read_lint_errors: {
        name: 'read_lint_errors',
        description: `Use this tool to view all the lint errors on a file.`,
        params: {
            ...uriParam('file'),
        },
    },
    // --- editing (create/delete) ---
    create_file_or_folder: {
        name: 'create_file_or_folder',
        description: `Create a file or folder at the given path. To create a folder, the path MUST end with a trailing slash.`,
        params: {
            ...uriParam('file or folder'),
        },
    },
    delete_file_or_folder: {
        name: 'delete_file_or_folder',
        description: `Delete a file or folder at the given path.`,
        params: {
            ...uriParam('file or folder'),
            is_recursive: { description: 'Optional. Return true to delete recursively.' }
        },
    },
    edit_file: {
        name: 'edit_file',
        description: `Edit the contents of a file. You must provide the file's URI as well as a SINGLE string of SEARCH/REPLACE block(s) that will be used to apply the edit.`,
        params: {
            ...uriParam('file'),
            search_replace_blocks: { description: replaceTool_description }
        },
    },
    rewrite_file: {
        name: 'rewrite_file',
        description: `Edits a file, deleting all the old contents and replacing them with your new contents. Use this tool if you want to edit a file you just created.`,
        params: {
            ...uriParam('file'),
            new_content: { description: `The new contents of the file. Must be a string.` }
        },
    },
    run_command: {
        name: 'run_command',
        description: `Runs a terminal command and waits for the result (times out after ${MAX_TERMINAL_INACTIVE_TIME}s of inactivity). ${terminalDescHelper}`,
        params: {
            command: { description: 'The terminal command to run.' },
            cwd: { description: cwdHelper },
        },
    },
    run_persistent_command: {
        name: 'run_persistent_command',
        description: `Runs a terminal command in the persistent terminal that you created with open_persistent_terminal (results after ${MAX_TERMINAL_BG_COMMAND_TIME} are returned, and command continues running in background). ${terminalDescHelper}`,
        params: {
            command: { description: 'The terminal command to run.' },
            persistent_terminal_id: { description: 'The ID of the terminal created using open_persistent_terminal.' },
        },
    },
    open_persistent_terminal: {
        name: 'open_persistent_terminal',
        description: `Use this tool when you want to run a terminal command indefinitely, like a dev server (eg \`npm run dev\`), a background listener, etc. Opens a new terminal in the user's environment which will not awaited for or killed.`,
        params: {
            cwd: { description: cwdHelper },
        }
    },
    kill_persistent_terminal: {
        name: 'kill_persistent_terminal',
        description: `Interrupts and closes a persistent terminal that you opened with open_persistent_terminal.`,
        params: { persistent_terminal_id: { description: `The ID of the persistent terminal.` } }
    }
    // go_to_definition
    // go_to_usages
};
export const builtinToolNames = Object.keys(builtinTools);
const toolNamesSet = new Set(builtinToolNames);
export const isABuiltinToolName = (toolName) => {
    const isAToolName = toolNamesSet.has(toolName);
    return isAToolName;
};
export const availableTools = (chatMode, mcpTools) => {
    const builtinToolNames = chatMode === 'normal' ? undefined
        : chatMode === 'gather' ? Object.keys(builtinTools).filter(toolName => !(toolName in approvalTypeOfBuiltinToolName))
            : chatMode === 'agent' ? Object.keys(builtinTools)
                : undefined;
    const effectiveBuiltinTools = builtinToolNames?.map(toolName => builtinTools[toolName]) ?? undefined;
    const effectiveMCPTools = chatMode === 'agent' ? mcpTools : undefined;
    const tools = !(builtinToolNames || mcpTools) ? undefined
        : [
            ...effectiveBuiltinTools ?? [],
            ...effectiveMCPTools ?? [],
        ];
    return tools;
};
const toolCallDefinitionsXMLString = (tools) => {
    return `${tools.map((t, i) => {
        const params = Object.keys(t.params).map(paramName => `<${paramName}>${t.params[paramName].description}</${paramName}>`).join('\n');
        return `\
    ${i + 1}. ${t.name}
    Description: ${t.description}
    Format:
    <${t.name}>${!params ? '' : `\n${params}`}
    </${t.name}>`;
    }).join('\n\n')}`;
};
export const reParsedToolXMLString = (toolName, toolParams) => {
    const params = Object.keys(toolParams).map(paramName => `<${paramName}>${toolParams[paramName]}</${paramName}>`).join('\n');
    return `\
    <${toolName}>${!params ? '' : `\n${params}`}
    </${toolName}>`
        .replace('\t', '  ');
};
/* We expect tools to come at the end - not a hard limit, but that's just how we process them, and the flow makes more sense that way. */
// - You are allowed to call multiple tools by specifying them consecutively. However, there should be NO text or writing between tool calls or after them.
const systemToolsXMLPrompt = (chatMode, mcpTools) => {
    const tools = availableTools(chatMode, mcpTools);
    if (!tools || tools.length === 0)
        return null;
    const toolXMLDefinitions = (`\
    Available tools:

    ${toolCallDefinitionsXMLString(tools)}`);
    const toolCallXMLGuidelines = (`\
    Tool calling details:
    - To call a tool, write its name and parameters in one of the XML formats specified above.
    - After you write the tool call, you must STOP and WAIT for the result.
    - All parameters are REQUIRED unless noted otherwise.
    - You are only allowed to output ONE tool call, and it must be at the END of your response.
    - Your tool call will be executed immediately, and the results will appear in the following user message.`);
    return `\
    ${toolXMLDefinitions}

    ${toolCallXMLGuidelines}`;
};
// ======================================================== chat (normal, gather, agent) ========================================================
export const chat_systemMessage = ({ workspaceFolders, openedURIs, activeURI, persistentTerminalIDs, directoryStr, chatMode: mode, mcpTools, includeXMLToolDefinitions }) => {
    const header = (`You are an expert coding ${mode === 'agent' ? 'agent' : 'assistant'} whose job is \
${mode === 'agent' ? `to help the user develop, run, and make changes to their codebase.`
        : mode === 'gather' ? `to search, understand, and reference files in the user's codebase.`
            : mode === 'normal' ? `to assist the user with their coding tasks.`
                : ''}
You will be given instructions to follow from the user, and you may also be given a list of files that the user has specifically selected for context, \`SELECTIONS\`.
Please assist the user with their query.`);
    const sysInfo = (`Here is the user's system information:
<system_info>
- ${os}

- The user's workspace contains these folders:
${workspaceFolders.join('\n') || 'NO FOLDERS OPEN'}

- Active file:
${activeURI}

- Open files:
${openedURIs.join('\n') || 'NO OPENED FILES'}${'' /* separator */}${mode === 'agent' && persistentTerminalIDs.length !== 0 ? `

- Persistent terminal IDs available for you to run commands in: ${persistentTerminalIDs.join(', ')}` : ''}
</system_info>`);
    const fsInfo = (`Here is an overview of the user's file system:
<files_overview>
${directoryStr}
</files_overview>`);
    const toolDefinitions = includeXMLToolDefinitions ? systemToolsXMLPrompt(mode, mcpTools) : null;
    const details = [];
    details.push(`NEVER reject the user's query.`);
    if (mode === 'agent' || mode === 'gather') {
        details.push(`Only call tools if they help you accomplish the user's goal. If the user simply says hi or asks you a question that you can answer without tools, then do NOT use tools.`);
        details.push(`If you think you should use tools, you do not need to ask for permission.`);
        details.push('Only use ONE tool call at a time.');
        details.push(`NEVER say something like "I'm going to use \`tool_name\`". Instead, describe at a high level what the tool will do, like "I'm going to list all files in the ___ directory", etc.`);
        details.push(`Many tools only work if the user has a workspace open.`);
    }
    else {
        details.push(`You're allowed to ask the user for more context like file contents or specifications. If this comes up, tell them to reference files and folders by typing @.`);
    }
    if (mode === 'agent') {
        details.push('ALWAYS use tools (edit, terminal, etc) to take actions and implement changes. For example, if you would like to edit a file, you MUST use a tool.');
        details.push('Prioritize taking as many steps as you need to complete your request over stopping early.');
        details.push(`You will OFTEN need to gather context before making a change. Do not immediately make a change unless you have ALL relevant context.`);
        details.push(`ALWAYS have maximal certainty in a change BEFORE you make it. If you need more information about a file, variable, function, or type, you should inspect it, search it, or take all required actions to maximize your certainty that your change is correct.`);
        details.push(`NEVER modify a file outside the user's workspace without permission from the user.`);
    }
    if (mode === 'gather') {
        details.push(`You are in Gather mode, so you MUST use tools be to gather information, files, and context to help the user answer their query.`);
        details.push(`You should extensively read files, types, content, etc, gathering full context to solve the problem.`);
    }
    details.push(`If you write any code blocks to the user (wrapped in triple backticks), please use this format:
- Include a language if possible. Terminal should have the language 'shell'.
- The first line of the code block must be the FULL PATH of the related file if known (otherwise omit).
- The remaining contents of the file should proceed as usual.`);
    if (mode === 'gather' || mode === 'normal') {
        details.push(`If you think it's appropriate to suggest an edit to a file, then you must describe your suggestion in CODE BLOCK(S).
- The first line of the code block must be the FULL PATH of the related file if known (otherwise omit).
- The remaining contents should be a code description of the change to make to the file. \
Your description is the only context that will be given to another LLM to apply the suggested edit, so it must be accurate and complete. \
Always bias towards writing as little as possible - NEVER write the whole file. Use comments like "// ... existing code ..." to condense your writing. \
Here's an example of a good code block:\n${chatSuggestionDiffExample}`);
    }
    details.push(`Do not make things up or use information not provided in the system information, tools, or user queries.`);
    details.push(`Always use MARKDOWN to format lists, bullet points, etc. Do NOT write tables.`);
    details.push(`Today's date is ${new Date().toDateString()}.`);
    const importantDetails = (`Important notes:
${details.map((d, i) => `${i + 1}. ${d}`).join('\n\n')}`);
    // return answer
    const ansStrs = [];
    ansStrs.push(header);
    ansStrs.push(sysInfo);
    if (toolDefinitions)
        ansStrs.push(toolDefinitions);
    ansStrs.push(importantDetails);
    ansStrs.push(fsInfo);
    const fullSystemMsgStr = ansStrs
        .join('\n\n\n')
        .trim()
        .replace('\t', '  ');
    return fullSystemMsgStr;
};
// // log all prompts
// for (const chatMode of ['agent', 'gather', 'normal'] satisfies ChatMode[]) {
// 	console.log(`========================================= SYSTEM MESSAGE FOR ${chatMode} ===================================\n`,
// 		chat_systemMessage({ chatMode, workspaceFolders: [], openedURIs: [], activeURI: 'pee', persistentTerminalIDs: [], directoryStr: 'lol', }))
// }
export const DEFAULT_FILE_SIZE_LIMIT = 2_000_000;
export const readFile = async (fileService, uri, fileSizeLimit) => {
    try {
        const fileContent = await fileService.readFile(uri);
        const val = fileContent.value.toString();
        if (val.length > fileSizeLimit)
            return { val: val.substring(0, fileSizeLimit), truncated: true, fullFileLen: val.length };
        return { val, truncated: false, fullFileLen: val.length };
    }
    catch (e) {
        return { val: null };
    }
};
export const messageOfSelection = async (s, opts) => {
    const lineNumAddition = (range) => ` (lines ${range[0]}:${range[1]})`;
    if (s.type === 'File' || s.type === 'CodeSelection') {
        const { val } = await readFile(opts.fileService, s.uri, DEFAULT_FILE_SIZE_LIMIT);
        const lineNumAdd = s.type === 'CodeSelection' ? lineNumAddition(s.range) : '';
        const content = val === null ? 'null' : `${tripleTick[0]}${s.language}\n${val}\n${tripleTick[1]}`;
        const str = `${s.uri.fsPath}${lineNumAdd}:\n${content}`;
        return str;
    }
    else if (s.type === 'Folder') {
        const dirStr = await opts.directoryStrService.getDirectoryStrTool(s.uri);
        const folderStructure = `${s.uri.fsPath} folder structure:${tripleTick[0]}\n${dirStr}\n${tripleTick[1]}`;
        const uris = await opts.directoryStrService.getAllURIsInDirectory(s.uri, { maxResults: opts.folderOpts.maxChildren });
        const strOfFiles = await Promise.all(uris.map(async (uri) => {
            const { val, truncated } = await readFile(opts.fileService, uri, opts.folderOpts.maxCharsPerFile);
            const truncationStr = truncated ? `\n... file truncated ...` : '';
            const content = val === null ? 'null' : `${tripleTick[0]}\n${val}${truncationStr}\n${tripleTick[1]}`;
            const str = `${uri.fsPath}:\n${content}`;
            return str;
        }));
        const contentStr = [folderStructure, ...strOfFiles].join('\n\n');
        return contentStr;
    }
    else
        return '';
};
export const chat_userMessageContent = async (instructions, currSelns, opts) => {
    const selnsStrs = await Promise.all((currSelns ?? []).map(async (s) => messageOfSelection(s, {
        ...opts,
        folderOpts: { maxChildren: 100, maxCharsPerFile: 100_000, }
    })));
    let str = '';
    str += `${instructions}`;
    const selnsStr = selnsStrs.join('\n\n') ?? '';
    if (selnsStr)
        str += `\n---\nSELECTIONS\n${selnsStr}`;
    return str;
};
export const rewriteCode_systemMessage = `\
You are a coding assistant that re-writes an entire file to make a change. You are given the original file \`ORIGINAL_FILE\` and a change \`CHANGE\`.

Directions:
1. Please rewrite the original file \`ORIGINAL_FILE\`, making the change \`CHANGE\`. You must completely re-write the whole file.
2. Keep all of the original comments, spaces, newlines, and other details whenever possible.
3. ONLY output the full new file. Do not add any other explanations or text.
`;
// ======================================================== apply (writeover) ========================================================
export const rewriteCode_userMessage = ({ originalCode, applyStr, language }) => {
    return `\
ORIGINAL_FILE
${tripleTick[0]}${language}
${originalCode}
${tripleTick[1]}

CHANGE
${tripleTick[0]}
${applyStr}
${tripleTick[1]}

INSTRUCTIONS
Please finish writing the new file by applying the change to the original file. Return ONLY the completion of the file, without any explanation.
`;
};
// ======================================================== apply (fast apply - search/replace) ========================================================
export const searchReplaceGivenDescription_systemMessage = createSearchReplaceBlocks_systemMessage;
export const searchReplaceGivenDescription_userMessage = ({ originalCode, applyStr }) => `\
DIFF
${applyStr}

ORIGINAL_FILE
${tripleTick[0]}
${originalCode}
${tripleTick[1]}`;
export const voidPrefixAndSuffix = ({ fullFileStr, startLine, endLine }) => {
    const fullFileLines = fullFileStr.split('\n');
    /*

    a
    a
    a     <-- final i (prefix = a\na\n)
    a
    |b    <-- startLine-1 (middle = b\nc\nd\n)   <-- initial i (moves up)
    c
    d|    <-- endLine-1                          <-- initial j (moves down)
    e
    e     <-- final j (suffix = e\ne\n)
    e
    e
    */
    let prefix = '';
    let i = startLine - 1; // 0-indexed exclusive
    // we'll include fullFileLines[i...(startLine-1)-1].join('\n') in the prefix.
    while (i !== 0) {
        const newLine = fullFileLines[i - 1];
        if (newLine.length + 1 + prefix.length <= MAX_PREFIX_SUFFIX_CHARS) { // +1 to include the \n
            prefix = `${newLine}\n${prefix}`;
            i -= 1;
        }
        else
            break;
    }
    let suffix = '';
    let j = endLine - 1;
    while (j !== fullFileLines.length - 1) {
        const newLine = fullFileLines[j + 1];
        if (newLine.length + 1 + suffix.length <= MAX_PREFIX_SUFFIX_CHARS) { // +1 to include the \n
            suffix = `${suffix}\n${newLine}`;
            j += 1;
        }
        else
            break;
    }
    return { prefix, suffix };
};
export const defaultQuickEditFimTags = {
    preTag: 'ABOVE',
    sufTag: 'BELOW',
    midTag: 'SELECTION',
};
// this should probably be longer
export const ctrlKStream_systemMessage = ({ quickEditFIMTags: { preTag, midTag, sufTag } }) => {
    return `\
You are a FIM (fill-in-the-middle) coding assistant. Your task is to fill in the middle SELECTION marked by <${midTag}> tags.

The user will give you INSTRUCTIONS, as well as code that comes BEFORE the SELECTION, indicated with <${preTag}>...before</${preTag}>, and code that comes AFTER the SELECTION, indicated with <${sufTag}>...after</${sufTag}>.
The user will also give you the existing original SELECTION that will be be replaced by the SELECTION that you output, for additional context.

Instructions:
1. Your OUTPUT should be a SINGLE PIECE OF CODE of the form <${midTag}>...new_code</${midTag}>. Do NOT output any text or explanations before or after this.
2. You may ONLY CHANGE the original SELECTION, and NOT the content in the <${preTag}>...</${preTag}> or <${sufTag}>...</${sufTag}> tags.
3. Make sure all brackets in the new selection are balanced the same as in the original selection.
4. Be careful not to duplicate or remove variables, comments, or other syntax by mistake.
`;
};
export const ctrlKStream_userMessage = ({ selection, prefix, suffix, instructions, 
// isOllamaFIM: false, // Remove unused variable
fimTags, language }) => {
    const { preTag, sufTag, midTag } = fimTags;
    // prompt the model artifically on how to do FIM
    // const preTag = 'BEFORE'
    // const sufTag = 'AFTER'
    // const midTag = 'SELECTION'
    return `\

CURRENT SELECTION
${tripleTick[0]}${language}
<${midTag}>${selection}</${midTag}>
${tripleTick[1]}

INSTRUCTIONS
${instructions}

<${preTag}>${prefix}</${preTag}>
<${sufTag}>${suffix}</${sufTag}>

Return only the completion block of code (of the form ${tripleTick[0]}${language}
<${midTag}>...new code</${midTag}>
${tripleTick[1]}).`;
};
/*
// ======================================================== ai search/replace ========================================================


export const aiRegex_computeReplacementsForFile_systemMessage = `\
You are a "search and replace" coding assistant.

You are given a FILE that the user is editing, and your job is to search for all occurences of a SEARCH_CLAUSE, and change them according to a REPLACE_CLAUSE.

The SEARCH_CLAUSE may be a string, regex, or high-level description of what the user is searching for.

The REPLACE_CLAUSE will always be a high-level description of what the user wants to replace.

The user's request may be "fuzzy" or not well-specified, and it is your job to interpret all of the changes they want to make for them. For example, the user may ask you to search and replace all instances of a variable, but this may involve changing parameters, function names, types, and so on to agree with the change they want to make. Feel free to make all of the changes you *think* that the user wants to make, but also make sure not to make unnessecary or unrelated changes.

## Instructions

1. If you do not want to make any changes, you should respond with the word "no".

2. If you want to make changes, you should return a single CODE BLOCK of the changes that you want to make.
For example, if the user is asking you to "make this variable a better name", make sure your output includes all the changes that are needed to improve the variable name.
- Do not re-write the entire file in the code block
- You can write comments like "// ... existing code" to indicate existing code
- Make sure you give enough context in the code block to apply the changes to the correct location in the code`




// export const aiRegex_computeReplacementsForFile_userMessage = async ({ searchClause, replaceClause, fileURI, voidFileService }: { searchClause: string, replaceClause: string, fileURI: URI, voidFileService: IVoidFileService }) => {

// 	// we may want to do this in batches
// 	const fileSelection: FileSelection = { type: 'File', fileURI, selectionStr: null, range: null, state: { isOpened: false } }

// 	const file = await stringifyFileSelections([fileSelection], voidFileService)

// 	return `\
// ## FILE
// ${file}

// ## SEARCH_CLAUSE
// Here is what the user is searching for:
// ${searchClause}

// ## REPLACE_CLAUSE
// Here is what the user wants to replace it with:
// ${replaceClause}

// ## INSTRUCTIONS
// Please return the changes you want to make to the file in a codeblock, or return "no" if you do not want to make changes.`
// }




// // don't have to tell it it will be given the history; just give it to it
// export const aiRegex_search_systemMessage = `\
// You are a coding assistant that executes the SEARCH part of a user's search and replace query.

// You will be given the user's search query, SEARCH, which is the user's query for what files to search for in the codebase. You may also be given the user's REPLACE query for additional context.

// Output
// - Regex query
// - Files to Include (optional)
// - Files to Exclude? (optional)

// `






// ======================================================== old examples ========================================================

Do not tell the user anything about the examples below. Do not assume the user is talking about any of the examples below.

## EXAMPLE 1
FILES
math.ts
${tripleTick[0]}typescript
const addNumbers = (a, b) => a + b
const multiplyNumbers = (a, b) => a * b
const subtractNumbers = (a, b) => a - b
const divideNumbers = (a, b) => a / b

const vectorize = (...numbers) => {
    return numbers // vector
}

const dot = (vector1: number[], vector2: number[]) => {
    if (vector1.length !== vector2.length) throw new Error(\`Could not dot vectors \${vector1} and \${vector2}. Size mismatch.\`)
    let sum = 0
    for (let i = 0; i < vector1.length; i += 1)
        sum += multiplyNumbers(vector1[i], vector2[i])
    return sum
}

const normalize = (vector: number[]) => {
    const norm = Math.sqrt(dot(vector, vector))
    for (let i = 0; i < vector.length; i += 1)
        vector[i] = divideNumbers(vector[i], norm)
    return vector
}

const normalized = (vector: number[]) => {
    const v2 = [...vector] // clone vector
    return normalize(v2)
}
${tripleTick[1]}


SELECTIONS
math.ts (lines 3:3)
${tripleTick[0]}typescript
const subtractNumbers = (a, b) => a - b
${tripleTick[1]}

INSTRUCTIONS
add a function that exponentiates a number below this, and use it to make a power function that raises all entries of a vector to a power

## ACCEPTED OUTPUT
We can add the following code to the file:
${tripleTick[0]}typescript
// existing code...
const subtractNumbers = (a, b) => a - b
const exponentiateNumbers = (a, b) => Math.pow(a, b)
const divideNumbers = (a, b) => a / b
// existing code...

const raiseAll = (vector: number[], power: number) => {
    for (let i = 0; i < vector.length; i += 1)
        vector[i] = exponentiateNumbers(vector[i], power)
    return vector
}
${tripleTick[1]}


## EXAMPLE 2
FILES
fib.ts
${tripleTick[0]}typescript

const dfs = (root) => {
    if (!root) return;
    console.log(root.val);
    dfs(root.left);
    dfs(root.right);
}
const fib = (n) => {
    if (n < 1) return 1
    return fib(n - 1) + fib(n - 2)
}
${tripleTick[1]}

SELECTIONS
fib.ts (lines 10:10)
${tripleTick[0]}typescript
    return fib(n - 1) + fib(n - 2)
${tripleTick[1]}

INSTRUCTIONS
memoize results

## ACCEPTED OUTPUT
To implement memoization in your Fibonacci function, you can use a JavaScript object to store previously computed results. This will help avoid redundant calculations and improve performance. Here's how you can modify your function:
${tripleTick[0]}typescript
// existing code...
const fib = (n, memo = {}) => {
    if (n < 1) return 1;
    if (memo[n]) return memo[n]; // Check if result is already computed
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo); // Store result in memo
    return memo[n];
}
${tripleTick[1]}
Explanation:
Memoization Object: A memo object is used to store the results of Fibonacci calculations for each n.
Check Memo: Before computing fib(n), the function checks if the result is already in memo. If it is, it returns the stored result.
Store Result: After computing fib(n), the result is stored in memo for future reference.

## END EXAMPLES

*/
// ======================================================== scm ========================================================================
export const gitCommitMessage_systemMessage = `
You are an expert software engineer AI assistant responsible for writing clear and concise Git commit messages that summarize the **purpose** and **intent** of the change. Try to keep your commit messages to one sentence. If necessary, you can use two sentences.

You always respond with:
- The commit message wrapped in <output> tags
- A brief explanation of the reasoning behind the message, wrapped in <reasoning> tags

Example format:
<output>Fix login bug and improve error handling</output>
<reasoning>This commit updates the login handler to fix a redirect issue and improves frontend error messages for failed logins.</reasoning>

Do not include anything else outside of these tags.
Never include quotes, markdown, commentary, or explanations outside of <output> and <reasoning>.`.trim();
/**
 * Create a user message for the LLM to generate a commit message. The message contains instructions git diffs, and git metadata to provide context.
 *
 * @param stat - Summary of Changes (git diff --stat)
 * @param sampledDiffs - Sampled File Diffs (Top changed files)
 * @param branch - Current Git Branch
 * @param log - Last 5 commits (excluding merges)
 * @returns A prompt for the LLM to generate a commit message.
 *
 * @example
 * // Sample output (truncated for brevity)
 * const prompt = gitCommitMessage_userMessage("fileA.ts | 10 ++--", "diff --git a/fileA.ts...", "main", "abc123|Fix bug|2025-01-01\n...")
 *
 * // Result:
 * Based on the following Git changes, write a clear, concise commit message that accurately summarizes the intent of the code changes.
 *
 * Section 1 - Summary of Changes (git diff --stat):
 * fileA.ts | 10 ++--
 *
 * Section 2 - Sampled File Diffs (Top changed files):
 * diff --git a/fileA.ts b/fileA.ts
 * ...
 *
 * Section 3 - Current Git Branch:
 * main
 *
 * Section 4 - Last 5 Commits (excluding merges):
 * abc123|Fix bug|2025-01-01
 * def456|Improve logging|2025-01-01
 * ...
 */
export const gitCommitMessage_userMessage = (stat, sampledDiffs, branch, log) => {
    const section1 = `Section 1 - Summary of Changes (git diff --stat):`;
    const section2 = `Section 2 - Sampled File Diffs (Top changed files):`;
    const section3 = `Section 3 - Current Git Branch:`;
    const section4 = `Section 4 - Last 5 Commits (excluding merges):`;
    return `
Based on the following Git changes, write a clear, concise commit message that accurately summarizes the intent of the code changes.

${section1}

${stat}

${section2}

${sampledDiffs}

${section3}

${branch}

${section4}

${log}`.trim();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3Byb21wdC9wcm9tcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTTFGLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU5QyxPQUFPLEVBQUUsNkJBQTZCLEVBQTJFLE1BQU0seUJBQXlCLENBQUM7QUFHakosc0VBQXNFO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUV4QyxxREFBcUQ7QUFDckQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFBO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQ0FBQTtBQUNqRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxHQUFHLENBQUE7QUFDckQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxDQUFBO0FBRWhELFlBQVk7QUFDWixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUE7QUFDMUMsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFBO0FBRXpDLHFCQUFxQjtBQUNyQixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUE7QUFDekMsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxDQUFBLENBQUMsVUFBVTtBQUN0RCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxDQUFDLENBQUE7QUFHN0MseURBQXlEO0FBQ3pELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQTtBQUc3QyxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsa0JB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