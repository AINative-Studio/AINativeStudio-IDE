/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdEdyYW1tYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2UvZXh0cmFjdEdyYW1tYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQW9CLE1BQU0sZ0NBQWdDLENBQUE7QUFNakYsNENBQTRDO0FBRTVDLDRIQUE0SDtBQUM1SCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUN0QyxNQUFjLEVBQUUsY0FBOEIsRUFBRSxTQUEyQixFQUNoQixFQUFFO0lBQzdELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQSxDQUFDLCtCQUErQjtJQUNwRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7SUFDckIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBRXJCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQTtJQUN0QixJQUFJLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtJQUczQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRWpJLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUNwQixNQUFNLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNuQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEIsQ0FBQyxDQUFBO0lBRUQsTUFBTSxTQUFTLEdBQVcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO1FBRTNELDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsTUFBTSxZQUFZLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLDZFQUE2RTtnQkFDN0UsOENBQThDO2dCQUM5QyxPQUFNO1lBQ1AsQ0FBQztZQUNELHlCQUF5QjtZQUN6QixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pELElBQUksU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLHdHQUF3RztnQkFDeEcsU0FBUyxHQUFHLElBQUksQ0FBQTtnQkFDaEIsMkNBQTJDO2dCQUMzQyxhQUFhLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ2xELDZDQUE2QztnQkFDN0MsWUFBWSxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO2dCQUM5QyxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7Z0JBQzVFLE9BQU07WUFDUCxDQUFDO1lBRUQseUVBQXlFO1lBQ3pFLDJCQUEyQjtZQUMzQixhQUFhLEdBQUcsU0FBUyxDQUFBO1lBQ3pCLFlBQVksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtZQUM1RSxPQUFNO1FBQ1AsQ0FBQztRQUVELGlDQUFpQztRQUVqQyxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sWUFBWSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqRSxJQUFJLFlBQVksSUFBSSxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7Z0JBQ25HLGtFQUFrRTtnQkFDbEUsOENBQThDO2dCQUM5QyxPQUFNO1lBQ1AsQ0FBQztZQUVELDBCQUEwQjtZQUMxQixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUMvRCxJQUFJLFNBQVMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0Qix5RUFBeUU7Z0JBQ3pFLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLDJEQUEyRDtnQkFDM0Qsa0JBQWtCLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ2xFLDhDQUE4QztnQkFDOUMsWUFBWSxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO2dCQUM5QyxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7Z0JBQzVFLE9BQU07WUFDUCxDQUFDO1lBRUQsZ0ZBQWdGO1lBQ2hGLHlFQUF5RTtZQUV6RSxpRUFBaUU7WUFDakUsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFDO2dCQUNyQyxrQkFBa0IsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUN2RCxZQUFZLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQTtZQUNoQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1lBQzVFLE9BQU07UUFDUCxDQUFDO1FBRUQsK0VBQStFO1FBQy9FLHlFQUF5RTtRQUV6RSwwREFBMEQ7UUFDMUQsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQ3JDLGFBQWEsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2xELFlBQVksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFBO1FBQ2hDLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7SUFDN0UsQ0FBQyxDQUFBO0lBR0QsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLEVBQUU7UUFDcEMsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFBO1FBQy9CLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUM7WUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLENBQUEsQ0FBQywwQkFBMEI7UUFDaEcsSUFBSSxPQUFPLEtBQUssQ0FBQyxDQUFDO1lBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFBLENBQUMsMEJBQTBCO1FBRWhHLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakYsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUUvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFBO0lBQ25DLENBQUMsQ0FBQTtJQUVELE1BQU0saUJBQWlCLEdBQW1CLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFFcEQsZ0lBQWdJO1FBQ2hJLFNBQVMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUV4QixNQUFNLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxHQUFHLHVCQUF1QixFQUFFLENBQUE7UUFDN0QsY0FBYyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7SUFDdkQsQ0FBQyxDQUFBO0lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxDQUFBO0FBQ3hDLENBQUMsQ0FBQTtBQUdELDhDQUE4QztBQUk5QyxNQUFNLGdDQUFnQyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxRQUFrQixFQUFFLEVBQUU7SUFDakYsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBVSxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDLENBQUE7QUFFRCxNQUFNLGNBQWMsR0FBRyxDQUFDLFFBQWdCLEVBQUUsT0FBaUIsRUFBRSxFQUFFO0lBQzlELEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDM0IsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFVLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMsQ0FBQTtBQUlELE1BQU0sd0JBQXdCLEdBQUcsQ0FBc0IsUUFBVyxFQUFFLE1BQWMsRUFBRSxHQUFXLEVBQUUsY0FBOEIsRUFBa0IsRUFBRTtJQUNsSixNQUFNLFNBQVMsR0FBcUIsRUFBRSxDQUFBO0lBQ3RDLE1BQU0sVUFBVSxHQUF1QixFQUFFLENBQUE7SUFDekMsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBRWxCLE1BQU0sU0FBUyxHQUFHLEdBQW1CLEVBQUU7UUFDdEMsa0ZBQWtGO1FBQ2xGLEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDM0IsTUFBTSxTQUFTLEdBQUcsQ0FBcUIsQ0FBQTtZQUN2QyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakMsSUFBSSxJQUFJLEtBQUssU0FBUztnQkFBRSxTQUFRO1lBQ2hDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLE1BQU0sR0FBRyxHQUFtQjtZQUMzQixJQUFJLEVBQUUsUUFBUTtZQUNkLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsRUFBRSxFQUFFLE1BQU07U0FDVixDQUFBO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDLENBQUE7SUFFRCwwQkFBMEI7SUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLEdBQUcsQ0FBQTtJQUNuQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUFFLE9BQU8sU0FBUyxFQUFFLENBQUE7SUFDaEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLFFBQVEsR0FBRyxDQUFDLENBQUE7SUFDekMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQTs7UUFDckIsTUFBTSxHQUFHLElBQUksQ0FBQTtJQUdsQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUU5QyxNQUFNLEVBQUUsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRXZDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQXVCLENBQUE7SUFDL0YsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLFNBQVMsRUFBRSxDQUFBO0lBQ2xELElBQUksc0JBQXNCLEdBQTRCLElBQUksQ0FBQTtJQUMxRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDVCxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNOLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFBRSxPQUFPLFNBQVMsRUFBRSxDQUFBLENBQUMsOENBQThDO1FBRTdFLGtDQUFrQztRQUNsQyxJQUFJLGdCQUFnQixHQUE0QixJQUFJLENBQUE7UUFDcEQsS0FBSyxNQUFNLFNBQVMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN2QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsNkJBQTZCLENBQUMsSUFBSSxTQUFTLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN4RSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtnQkFDNUIsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBQ0Qsb0NBQW9DO1FBQ3BDLElBQUksZ0JBQWdCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0IsSUFBSSxzQkFBc0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDckMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2hELENBQUM7WUFDRCxPQUFPLFNBQVMsRUFBRSxDQUFBO1FBQ25CLENBQUM7YUFDSSxDQUFDO1lBQ0wsc0JBQXNCLEdBQUcsZ0JBQWdCLENBQUE7UUFDMUMsQ0FBQztRQUVELFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUV0QyxrQ0FBa0M7UUFDbEMsSUFBSSxpQkFBaUIsR0FBWSxLQUFLLENBQUE7UUFDdEMsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO1FBQ3RCLEtBQUssTUFBTSxTQUFTLElBQUksYUFBYSxFQUFFLENBQUM7WUFDdkMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNkLE1BQU0sUUFBUSxHQUFHLEtBQUssU0FBUyxHQUFHLENBQUE7WUFDbEMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2YsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMvRCxpQkFBaUIsR0FBRyxJQUFJLENBQUE7Z0JBQ3hCLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUNELHdDQUF3QztRQUN4QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixTQUFTLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDL0MsT0FBTyxTQUFTLEVBQUUsQ0FBQTtRQUNuQixDQUFDO2FBQ0ksQ0FBQztZQUNMLFVBQVUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsU0FBUyxDQUFDLHNCQUFzQixDQUFDLElBQUksYUFBYSxDQUFBO0lBQ25ELENBQUM7QUFDRixDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUNyQyxNQUFjLEVBQ2QsY0FBOEIsRUFDOUIsUUFBeUIsRUFDekIsUUFBd0MsRUFDbUIsRUFBRTtJQUU3RCxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxDQUFBO0lBQzlFLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDaEQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsQ0FBQTtJQUUzRSxNQUFNLGNBQWMsR0FBbUIsRUFBRSxDQUFBO0lBQ3pDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ2xELEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7UUFBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUFDLENBQUM7SUFFckQsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUE7SUFFN0Isc0RBQXNEO0lBQ3RELElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNsQixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUE7SUFDckIsSUFBSSxjQUFjLEdBQStCLFNBQVMsQ0FBQTtJQUUxRCxJQUFJLFlBQVksR0FBK0MsSUFBSSxDQUFBO0lBQ25FLElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFBLENBQUMsMkdBQTJHO0lBRXRJLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQTtJQUN2QixNQUFNLFNBQVMsR0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzFELGVBQWUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN4QyxZQUFZLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUU5QixrREFBa0Q7UUFHbEQsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0IsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLEdBQUcsT0FBTyxDQUFBO1lBQy9DLHdFQUF3RTtZQUN4RSxNQUFNLFNBQVMsR0FBRyxnQ0FBZ0MsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDN0UsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixnQ0FBZ0M7Z0JBQ2hDLGlCQUFpQixJQUFJLE9BQU8sQ0FBQTtZQUM3QixDQUFDO1lBQ0QsMEVBQTBFO2lCQUNyRSxDQUFDO2dCQUNMLGtFQUFrRTtnQkFDbEUsUUFBUSxJQUFJLGlCQUFpQixDQUFBO2dCQUM3QixpQkFBaUIsR0FBRyxFQUFFLENBQUE7Z0JBQ3RCLFFBQVEsSUFBSSxPQUFPLENBQUE7Z0JBRW5CLE1BQU0sQ0FBQyxHQUFHLGNBQWMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQ2hELElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNoQixNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDeEIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWEsQ0FBQTtvQkFDckUsa0NBQWtDO29CQUNsQyxZQUFZLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUE7b0JBRWhDLGtEQUFrRDtvQkFDbEQsUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO1lBR0YsQ0FBQztRQUNGLENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0IsY0FBYyxHQUFHLHdCQUF3QixDQUN4QyxZQUFZLENBQUMsUUFBUSxFQUNyQixNQUFNLEVBQ04sWUFBWSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUNsRCxjQUFjLENBQ2QsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLENBQUM7WUFDTixHQUFHLE1BQU07WUFDVCxRQUFRO1lBQ1IsUUFBUSxFQUFFLGNBQWM7U0FDeEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBR0YsTUFBTSxpQkFBaUIsR0FBbUIsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNwRCxnSUFBZ0k7UUFDaEksU0FBUyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBRXhCLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDN0IsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFBO1FBRS9CLGdEQUFnRDtRQUNoRCxrREFBa0Q7UUFDbEQsdUZBQXVGO1FBQ3ZGLDBFQUEwRTtRQUUxRSxjQUFjLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFBO0lBQ0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDO0FBQ3pDLENBQUMsQ0FBQTtBQUlELCtGQUErRjtBQUMvRixNQUFNLDBCQUEwQixHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUU7SUFDaEQsSUFBSSxDQUFDLENBQUM7UUFBRSxPQUFPLENBQUMsQ0FBQztJQUVqQixNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFMUMsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ2pGLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdDLElBQUksZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDMUYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQyxDQUFBIn0=