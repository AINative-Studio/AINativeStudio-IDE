/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../../../base/common/uuid.js';
import { endsWithAnyPrefixOf, SurroundingsRemover } from '../../common/helpers/extractCodeFromResult.js';
import { availableTools } from '../../common/prompt/prompts.js';
// =============== reasoning ===============
// could simplify this - this assumes we can never add a tag without committing it to the user's screen, but that's not true
export const extractReasoningWrapper = (onText, onFinalMessage, thinkTags) => {
    let latestAddIdx = 0; // exclusive index in fullText_
    let foundTag1 = false;
    let foundTag2 = false;
    let fullTextSoFar = '';
    let fullReasoningSoFar = '';
    if (!thinkTags[0] || !thinkTags[1])
        throw new Error(`thinkTags must not be empty if provided. Got ${JSON.stringify(thinkTags)}.`);
    let onText_ = onText;
    onText = (params) => {
        onText_(params);
    };
    const newOnText = ({ fullText: fullText_, ...p }) => {
        // until found the first think tag, keep adding to fullText
        if (!foundTag1) {
            const endsWithTag1 = endsWithAnyPrefixOf(fullText_, thinkTags[0]);
            if (endsWithTag1) {
                // console.log('endswith1', { fullTextSoFar, fullReasoningSoFar, fullText_ })
                // wait until we get the full tag or know more
                return;
            }
            // if found the first tag
            const tag1Index = fullText_.indexOf(thinkTags[0]);
            if (tag1Index !== -1) {
                // console.log('tag1Index !==1', { tag1Index, fullTextSoFar, fullReasoningSoFar, thinkTags, fullText_ })
                foundTag1 = true;
                // Add text before the tag to fullTextSoFar
                fullTextSoFar += fullText_.substring(0, tag1Index);
                // Update latestAddIdx to after the first tag
                latestAddIdx = tag1Index + thinkTags[0].length;
                onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
                return;
            }
            // console.log('adding to text A', { fullTextSoFar, fullReasoningSoFar })
            // add the text to fullText
            fullTextSoFar = fullText_;
            latestAddIdx = fullText_.length;
            onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
            return;
        }
        // at this point, we found <tag1>
        // until found the second think tag, keep adding to fullReasoning
        if (!foundTag2) {
            const endsWithTag2 = endsWithAnyPrefixOf(fullText_, thinkTags[1]);
            if (endsWithTag2 && endsWithTag2 !== thinkTags[1]) { // if ends with any partial part (full is fine)
                // console.log('endsWith2', { fullTextSoFar, fullReasoningSoFar })
                // wait until we get the full tag or know more
                return;
            }
            // if found the second tag
            const tag2Index = fullText_.indexOf(thinkTags[1], latestAddIdx);
            if (tag2Index !== -1) {
                // console.log('tag2Index !== -1', { fullTextSoFar, fullReasoningSoFar })
                foundTag2 = true;
                // Add everything between first and second tag to reasoning
                fullReasoningSoFar += fullText_.substring(latestAddIdx, tag2Index);
                // Update latestAddIdx to after the second tag
                latestAddIdx = tag2Index + thinkTags[1].length;
                onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
                return;
            }
            // add the text to fullReasoning (content after first tag but before second tag)
            // console.log('adding to text B', { fullTextSoFar, fullReasoningSoFar })
            // If we have more text than we've processed, add it to reasoning
            if (fullText_.length > latestAddIdx) {
                fullReasoningSoFar += fullText_.substring(latestAddIdx);
                latestAddIdx = fullText_.length;
            }
            onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
            return;
        }
        // at this point, we found <tag2> - content after the second tag is normal text
        // console.log('adding to text C', { fullTextSoFar, fullReasoningSoFar })
        // Add any new text after the closing tag to fullTextSoFar
        if (fullText_.length > latestAddIdx) {
            fullTextSoFar += fullText_.substring(latestAddIdx);
            latestAddIdx = fullText_.length;
        }
        onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
    };
    const getOnFinalMessageParams = () => {
        const fullText_ = fullTextSoFar;
        const tag1Idx = fullText_.indexOf(thinkTags[0]);
        const tag2Idx = fullText_.indexOf(thinkTags[1]);
        if (tag1Idx === -1)
            return { fullText: fullText_, fullReasoning: '' }; // never started reasoning
        if (tag2Idx === -1)
            return { fullText: '', fullReasoning: fullText_ }; // never stopped reasoning
        const fullReasoning = fullText_.substring(tag1Idx + thinkTags[0].length, tag2Idx);
        const fullText = fullText_.substring(0, tag1Idx) + fullText_.substring(tag2Idx + thinkTags[1].length, Infinity);
        return { fullText, fullReasoning };
    };
    const newOnFinalMessage = (params) => {
        // treat like just got text before calling onFinalMessage (or else we sometimes miss the final chunk that's new to finalMessage)
        newOnText({ ...params });
        const { fullText, fullReasoning } = getOnFinalMessageParams();
        onFinalMessage({ ...params, fullText, fullReasoning });
    };
    return { newOnText, newOnFinalMessage };
};
// =============== tools (XML) ===============
const findPartiallyWrittenToolTagAtEnd = (fullText, toolTags) => {
    for (const toolTag of toolTags) {
        const foundPrefix = endsWithAnyPrefixOf(fullText, toolTag);
        if (foundPrefix) {
            return [foundPrefix, toolTag];
        }
    }
    return false;
};
const findIndexOfAny = (fullText, matches) => {
    for (const str of matches) {
        const idx = fullText.indexOf(str);
        if (idx !== -1) {
            return [idx, str];
        }
    }
    return null;
};
const parseXMLPrefixToToolCall = (toolName, toolId, str, toolOfToolName) => {
    const paramsObj = {};
    const doneParams = [];
    let isDone = false;
    const getAnswer = () => {
        // trim off all whitespace at and before first \n and after last \n for each param
        for (const p in paramsObj) {
            const paramName = p;
            const orig = paramsObj[paramName];
            if (orig === undefined)
                continue;
            paramsObj[paramName] = trimBeforeAndAfterNewLines(orig);
        }
        // return tool call
        const ans = {
            name: toolName,
            rawParams: paramsObj,
            doneParams: doneParams,
            isDone: isDone,
            id: toolId,
        };
        return ans;
    };
    // find first toolName tag
    const openToolTag = `<${toolName}>`;
    let i = str.indexOf(openToolTag);
    if (i === -1)
        return getAnswer();
    let j = str.lastIndexOf(`</${toolName}>`);
    if (j === -1)
        j = Infinity;
    else
        isDone = true;
    str = str.substring(i + openToolTag.length, j);
    const pm = new SurroundingsRemover(str);
    const allowedParams = Object.keys(toolOfToolName[toolName]?.params ?? {});
    if (allowedParams.length === 0)
        return getAnswer();
    let latestMatchedOpenParam = null;
    let n = 0;
    while (true) {
        n += 1;
        if (n > 10)
            return getAnswer(); // just for good measure as this code is early
        // find the param name opening tag
        let matchedOpenParam = null;
        for (const paramName of allowedParams) {
            const removed = pm.removeFromStartUntilFullMatch(`<${paramName}>`, true);
            if (removed) {
                matchedOpenParam = paramName;
                break;
            }
        }
        // if did not find a new param, stop
        if (matchedOpenParam === null) {
            if (latestMatchedOpenParam !== null) {
                paramsObj[latestMatchedOpenParam] += pm.value();
            }
            return getAnswer();
        }
        else {
            latestMatchedOpenParam = matchedOpenParam;
        }
        paramsObj[latestMatchedOpenParam] = '';
        // find the param name closing tag
        let matchedCloseParam = false;
        let paramContents = '';
        for (const paramName of allowedParams) {
            const i = pm.i;
            const closeTag = `</${paramName}>`;
            const removed = pm.removeFromStartUntilFullMatch(closeTag, true);
            if (removed) {
                const i2 = pm.i;
                paramContents = pm.originalS.substring(i, i2 - closeTag.length);
                matchedCloseParam = true;
                break;
            }
        }
        // if did not find a new close tag, stop
        if (!matchedCloseParam) {
            paramsObj[latestMatchedOpenParam] += pm.value();
            return getAnswer();
        }
        else {
            doneParams.push(latestMatchedOpenParam);
        }
        paramsObj[latestMatchedOpenParam] += paramContents;
    }
};
export const extractXMLToolsWrapper = (onText, onFinalMessage, chatMode, mcpTools) => {
    if (!chatMode)
        return { newOnText: onText, newOnFinalMessage: onFinalMessage };
    const tools = availableTools(chatMode, mcpTools);
    if (!tools)
        return { newOnText: onText, newOnFinalMessage: onFinalMessage };
    const toolOfToolName = {};
    const toolOpenTags = tools.map(t => `<${t.name}>`);
    for (const t of tools) {
        toolOfToolName[t.name] = t;
    }
    const toolId = generateUuid();
    // detect <availableTools[0]></availableTools[0]>, etc
    let fullText = '';
    let trueFullText = '';
    let latestToolCall = undefined;
    let foundOpenTag = null;
    let openToolTagBuffer = ''; // the characters we've seen so far that come after a < with no space afterwards, not yet added to fullText
    let prevFullTextLen = 0;
    const newOnText = (params) => {
        const newText = params.fullText.substring(prevFullTextLen);
        prevFullTextLen = params.fullText.length;
        trueFullText = params.fullText;
        // console.log('NEWTEXT', JSON.stringify(newText))
        if (foundOpenTag === null) {
            const newFullText = openToolTagBuffer + newText;
            // ensure the code below doesn't run if only half a tag has been written
            const isPartial = findPartiallyWrittenToolTagAtEnd(newFullText, toolOpenTags);
            if (isPartial) {
                // console.log('--- partial!!!')
                openToolTagBuffer += newText;
            }
            // if no tooltag is partially written at the end, attempt to get the index
            else {
                // we will instantly retroactively remove this if it's a tag match
                fullText += openToolTagBuffer;
                openToolTagBuffer = '';
                fullText += newText;
                const i = findIndexOfAny(fullText, toolOpenTags);
                if (i !== null) {
                    const [idx, toolTag] = i;
                    const toolName = toolTag.substring(1, toolTag.length - 1);
                    // console.log('found ', toolName)
                    foundOpenTag = { idx, toolName };
                    // do not count anything at or after i in fullText
                    fullText = fullText.substring(0, idx);
                }
            }
        }
        // toolTagIdx is not null, so parse the XML
        if (foundOpenTag !== null) {
            latestToolCall = parseXMLPrefixToToolCall(foundOpenTag.toolName, toolId, trueFullText.substring(foundOpenTag.idx, Infinity), toolOfToolName);
        }
        onText({
            ...params,
            fullText,
            toolCall: latestToolCall,
        });
    };
    const newOnFinalMessage = (params) => {
        // treat like just got text before calling onFinalMessage (or else we sometimes miss the final chunk that's new to finalMessage)
        newOnText({ ...params });
        fullText = fullText.trimEnd();
        const toolCall = latestToolCall;
        // console.log('final message!!!', trueFullText)
        // console.log('----- returning ----\n', fullText)
        // console.log('----- tools ----\n', JSON.stringify(firstToolCallRef.current, null, 2))
        // console.log('----- toolCall ----\n', JSON.stringify(toolCall, null, 2))
        onFinalMessage({ ...params, fullText, toolCall: toolCall });
    };
    return { newOnText, newOnFinalMessage };
};
// trim all whitespace up until the first newline, and all whitespace up until the last newline
const trimBeforeAndAfterNewLines = (s) => {
    if (!s)
        return s;
    const firstNewLineIndex = s.indexOf('\n');
    if (firstNewLineIndex !== -1 && s.substring(0, firstNewLineIndex).trim() === '') {
        s = s.substring(firstNewLineIndex + 1, Infinity);
    }
    const lastNewLineIndex = s.lastIndexOf('\n');
    if (lastNewLineIndex !== -1 && s.substring(lastNewLineIndex + 1, Infinity).trim() === '') {
        s = s.substring(0, lastNewLineIndex);
    }
    return s;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdEdyYW1tYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9sbG1NZXNzYWdlL2V4dHJhY3RHcmFtbWFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFvQixNQUFNLGdDQUFnQyxDQUFBO0FBTWpGLDRDQUE0QztBQUU1Qyw0SEFBNEg7QUFDNUgsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FDdEMsTUFBYyxFQUFFLGNBQThCLEVBQUUsU0FBMkIsRUFDaEIsRUFBRTtJQUM3RCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUEsQ0FBQywrQkFBK0I7SUFDcEQsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBQ3JCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtJQUVyQixJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUE7SUFDdEIsSUFBSSxrQkFBa0IsR0FBRyxFQUFFLENBQUE7SUFHM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUVqSSxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUE7SUFDcEIsTUFBTSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFB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