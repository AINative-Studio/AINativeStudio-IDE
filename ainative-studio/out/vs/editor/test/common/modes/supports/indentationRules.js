/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const javascriptIndentationRules = {
    decreaseIndentPattern: /^((?!.*?\/\*).*\*\/)?\s*[\}\]\)].*$/,
    increaseIndentPattern: /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/,
    // e.g.  * ...| or */| or *-----*/|
    unIndentedLinePattern: /^(\t|[ ])*[ ]\*[^/]*\*\/\s*$|^(\t|[ ])*[ ]\*\/\s*$|^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
    indentNextLinePattern: /^((.*=>\s*)|((.*[^\w]+|\s*)(if|while|for)\s*\(.*\)\s*))$/,
};
export const rubyIndentationRules = {
    decreaseIndentPattern: /^\s*([}\]]([,)]?\s*(#|$)|\.[a-zA-Z_]\w*\b)|(end|rescue|ensure|else|elsif)\b|(in|when)\s)/,
    increaseIndentPattern: /^\s*((begin|class|(private|protected)\s+def|def|else|elsif|ensure|for|if|module|rescue|unless|until|when|in|while|case)|([^#]*\sdo\b)|([^#]*=\s*(case|if|unless)))\b([^#\{;]|(\"|'|\/).*\4)*(#.*)?$/,
};
export const phpIndentationRules = {
    increaseIndentPattern: /({(?!.*}).*|\(|\[|((else(\s)?)?if|else|for(each)?|while|switch|case).*:)\s*((\/[/*].*|)?$|\?>)/,
    decreaseIndentPattern: /^(.*\*\/)?\s*((\})|(\)+[;,])|(\]\)*[;,])|\b(else:)|\b((end(if|for(each)?|while|switch));))/,
};
export const goIndentationRules = {
    decreaseIndentPattern: /^\s*(\bcase\b.*:|\bdefault\b:|}[)}]*[),]?|\)[,]?)$/,
    increaseIndentPattern: /^.*(\bcase\b.*:|\bdefault\b:|(\b(func|if|else|switch|select|for|struct)\b.*)?{[^}"'`]*|\([^)"'`]*)$/,
};
export const htmlIndentationRules = {
    decreaseIndentPattern: /^\s*(<\/(?!html)[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
    increaseIndentPattern: /<(?!\?|(?:area|base|br|col|frame|hr|html|img|input|keygen|link|menuitem|meta|param|source|track|wbr)\b|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
};
export const latexIndentationRules = {
    decreaseIndentPattern: /^\s*\\end{(?!document)/,
    increaseIndentPattern: /\\begin{(?!document)([^}]*)}(?!.*\\end{\1})/,
};
export const luaIndentationRules = {
    decreaseIndentPattern: /^\s*((\b(elseif|else|end|until)\b)|(\})|(\)))/,
    increaseIndentPattern: /^((?!(\-\-)).)*((\b(else|function|then|do|repeat)\b((?!\b(end|until)\b).)*)|(\{\s*))$/,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25SdWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvaW5kZW50YXRpb25SdWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRztJQUN6QyxxQkFBcUIsRUFBRSxxQ0FBcUM7SUFDNUQscUJBQXFCLEVBQUUscUVBQXFFO0lBQzVGLG1DQUFtQztJQUNuQyxxQkFBcUIsRUFBRSw0RkFBNEY7SUFDbkgscUJBQXFCLEVBQUUsMERBQTBEO0NBQ2pGLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRztJQUNuQyxxQkFBcUIsRUFBRSwwRkFBMEY7SUFDakgscUJBQXFCLEVBQUUscU1BQXFNO0NBQzVOLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRztJQUNsQyxxQkFBcUIsRUFBRSxnR0FBZ0c7SUFDdkgscUJBQXFCLEVBQUUsNEZBQTRGO0NBQ25ILENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRztJQUNqQyxxQkFBcUIsRUFBRSxvREFBb0Q7SUFDM0UscUJBQXFCLEVBQUUscUdBQXFHO0NBQzVILENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRztJQUNuQyxxQkFBcUIsRUFBRSxrREFBa0Q7SUFDekUscUJBQXFCLEVBQUUseUxBQXlMO0NBQ2hOLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUNwQyxxQkFBcUIsRUFBRSx3QkFBd0I7SUFDL0MscUJBQXFCLEVBQUUsNkNBQTZDO0NBQ3BFLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRztJQUNsQyxxQkFBcUIsRUFBRSwrQ0FBK0M7SUFDdEUscUJBQXFCLEVBQUUsdUZBQXVGO0NBQzlHLENBQUMifQ==