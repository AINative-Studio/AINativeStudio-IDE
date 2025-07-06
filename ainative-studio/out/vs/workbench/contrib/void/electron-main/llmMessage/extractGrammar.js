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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdEdyYW1tYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbGxtTWVzc2FnZS9leHRyYWN0R3JhbW1hci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU1qRiw0Q0FBNEM7QUFFNUMsNEhBQTRIO0FBQzVILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQ3RDLE1BQWMsRUFBRSxjQUE4QixFQUFFLFNBQTJCLEVBQ2hCLEVBQUU7SUFDN0QsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBLENBQUMsK0JBQStCO0lBQ3BELElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtJQUNyQixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7SUFFckIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLElBQUksa0JBQWtCLEdBQUcsRUFBRSxDQUFBO0lBRzNCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFakksSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3BCLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNo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