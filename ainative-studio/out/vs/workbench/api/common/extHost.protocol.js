/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createProxyIdentifier } from '../../services/extensions/common/proxyIdentifier.js';
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
//#region --- tabs model
export var TabInputKind;
(function (TabInputKind) {
    TabInputKind[TabInputKind["UnknownInput"] = 0] = "UnknownInput";
    TabInputKind[TabInputKind["TextInput"] = 1] = "TextInput";
    TabInputKind[TabInputKind["TextDiffInput"] = 2] = "TextDiffInput";
    TabInputKind[TabInputKind["TextMergeInput"] = 3] = "TextMergeInput";
    TabInputKind[TabInputKind["NotebookInput"] = 4] = "NotebookInput";
    TabInputKind[TabInputKind["NotebookDiffInput"] = 5] = "NotebookDiffInput";
    TabInputKind[TabInputKind["CustomEditorInput"] = 6] = "CustomEditorInput";
    TabInputKind[TabInputKind["WebviewEditorInput"] = 7] = "WebviewEditorInput";
    TabInputKind[TabInputKind["TerminalEditorInput"] = 8] = "TerminalEditorInput";
    TabInputKind[TabInputKind["InteractiveEditorInput"] = 9] = "InteractiveEditorInput";
    TabInputKind[TabInputKind["ChatEditorInput"] = 10] = "ChatEditorInput";
    TabInputKind[TabInputKind["MultiDiffEditorInput"] = 11] = "MultiDiffEditorInput";
})(TabInputKind || (TabInputKind = {}));
export var TabModelOperationKind;
(function (TabModelOperationKind) {
    TabModelOperationKind[TabModelOperationKind["TAB_OPEN"] = 0] = "TAB_OPEN";
    TabModelOperationKind[TabModelOperationKind["TAB_CLOSE"] = 1] = "TAB_CLOSE";
    TabModelOperationKind[TabModelOperationKind["TAB_UPDATE"] = 2] = "TAB_UPDATE";
    TabModelOperationKind[TabModelOperationKind["TAB_MOVE"] = 3] = "TAB_MOVE";
})(TabModelOperationKind || (TabModelOperationKind = {}));
export var WebviewEditorCapabilities;
(function (WebviewEditorCapabilities) {
    WebviewEditorCapabilities[WebviewEditorCapabilities["Editable"] = 0] = "Editable";
    WebviewEditorCapabilities[WebviewEditorCapabilities["SupportsHotExit"] = 1] = "SupportsHotExit";
})(WebviewEditorCapabilities || (WebviewEditorCapabilities = {}));
export var WebviewMessageArrayBufferViewType;
(function (WebviewMessageArrayBufferViewType) {
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int8Array"] = 1] = "Int8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8Array"] = 2] = "Uint8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8ClampedArray"] = 3] = "Uint8ClampedArray";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int16Array"] = 4] = "Int16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint16Array"] = 5] = "Uint16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int32Array"] = 6] = "Int32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint32Array"] = 7] = "Uint32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float32Array"] = 8] = "Float32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float64Array"] = 9] = "Float64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigInt64Array"] = 10] = "BigInt64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigUint64Array"] = 11] = "BigUint64Array";
})(WebviewMessageArrayBufferViewType || (WebviewMessageArrayBufferViewType = {}));
export var CellOutputKind;
(function (CellOutputKind) {
    CellOutputKind[CellOutputKind["Text"] = 1] = "Text";
    CellOutputKind[CellOutputKind["Error"] = 2] = "Error";
    CellOutputKind[CellOutputKind["Rich"] = 3] = "Rich";
})(CellOutputKind || (CellOutputKind = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export var CandidatePortSource;
(function (CandidatePortSource) {
    CandidatePortSource[CandidatePortSource["None"] = 0] = "None";
    CandidatePortSource[CandidatePortSource["Process"] = 1] = "Process";
    CandidatePortSource[CandidatePortSource["Output"] = 2] = "Output";
    CandidatePortSource[CandidatePortSource["Hybrid"] = 3] = "Hybrid";
})(CandidatePortSource || (CandidatePortSource = {}));
export class IdObject {
    static { this._n = 0; }
    static mixin(object) {
        object._id = IdObject._n++;
        return object;
    }
}
export var ISuggestDataDtoField;
(function (ISuggestDataDtoField) {
    ISuggestDataDtoField["label"] = "a";
    ISuggestDataDtoField["kind"] = "b";
    ISuggestDataDtoField["detail"] = "c";
    ISuggestDataDtoField["documentation"] = "d";
    ISuggestDataDtoField["sortText"] = "e";
    ISuggestDataDtoField["filterText"] = "f";
    ISuggestDataDtoField["preselect"] = "g";
    ISuggestDataDtoField["insertText"] = "h";
    ISuggestDataDtoField["insertTextRules"] = "i";
    ISuggestDataDtoField["range"] = "j";
    ISuggestDataDtoField["commitCharacters"] = "k";
    ISuggestDataDtoField["additionalTextEdits"] = "l";
    ISuggestDataDtoField["kindModifier"] = "m";
    ISuggestDataDtoField["commandIdent"] = "n";
    ISuggestDataDtoField["commandId"] = "o";
    ISuggestDataDtoField["commandArguments"] = "p";
})(ISuggestDataDtoField || (ISuggestDataDtoField = {}));
export var ISuggestResultDtoField;
(function (ISuggestResultDtoField) {
    ISuggestResultDtoField["defaultRanges"] = "a";
    ISuggestResultDtoField["completions"] = "b";
    ISuggestResultDtoField["isIncomplete"] = "c";
    ISuggestResultDtoField["duration"] = "d";
})(ISuggestResultDtoField || (ISuggestResultDtoField = {}));
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionListDto {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items ?? [];
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
export var ExtHostTestingResource;
(function (ExtHostTestingResource) {
    ExtHostTestingResource[ExtHostTestingResource["Workspace"] = 0] = "Workspace";
    ExtHostTestingResource[ExtHostTestingResource["TextDocument"] = 1] = "TextDocument";
})(ExtHostTestingResource || (ExtHostTestingResource = {}));
// --- proxy identifiers
export const MainContext = {
    MainThreadAuthentication: createProxyIdentifier('MainThreadAuthentication'),
    MainThreadBulkEdits: createProxyIdentifier('MainThreadBulkEdits'),
    MainThreadLanguageModels: createProxyIdentifier('MainThreadLanguageModels'),
    MainThreadEmbeddings: createProxyIdentifier('MainThreadEmbeddings'),
    MainThreadChatAgents2: createProxyIdentifier('MainThreadChatAgents2'),
    MainThreadCodeMapper: createProxyIdentifier('MainThreadCodeMapper'),
    MainThreadLanguageModelTools: createProxyIdentifier('MainThreadChatSkills'),
    MainThreadClipboard: createProxyIdentifier('MainThreadClipboard'),
    MainThreadCommands: createProxyIdentifier('MainThreadCommands'),
    MainThreadComments: createProxyIdentifier('MainThreadComments'),
    MainThreadConfiguration: createProxyIdentifier('MainThreadConfiguration'),
    MainThreadConsole: createProxyIdentifier('MainThreadConsole'),
    MainThreadDebugService: createProxyIdentifier('MainThreadDebugService'),
    MainThreadDecorations: createProxyIdentifier('MainThreadDecorations'),
    MainThreadDiagnostics: createProxyIdentifier('MainThreadDiagnostics'),
    MainThreadDialogs: createProxyIdentifier('MainThreadDiaglogs'),
    MainThreadDocuments: createProxyIdentifier('MainThreadDocuments'),
    MainThreadDocumentContentProviders: createProxyIdentifier('MainThreadDocumentContentProviders'),
    MainThreadTextEditors: createProxyIdentifier('MainThreadTextEditors'),
    MainThreadEditorInsets: createProxyIdentifier('MainThreadEditorInsets'),
    MainThreadEditorTabs: createProxyIdentifier('MainThreadEditorTabs'),
    MainThreadErrors: createProxyIdentifier('MainThreadErrors'),
    MainThreadTreeViews: createProxyIdentifier('MainThreadTreeViews'),
    MainThreadDownloadService: createProxyIdentifier('MainThreadDownloadService'),
    MainThreadLanguageFeatures: createProxyIdentifier('MainThreadLanguageFeatures'),
    MainThreadLanguages: createProxyIdentifier('MainThreadLanguages'),
    MainThreadLogger: createProxyIdentifier('MainThreadLogger'),
    MainThreadMessageService: createProxyIdentifier('MainThreadMessageService'),
    MainThreadOutputService: createProxyIdentifier('MainThreadOutputService'),
    MainThreadProgress: createProxyIdentifier('MainThreadProgress'),
    MainThreadQuickDiff: createProxyIdentifier('MainThreadQuickDiff'),
    MainThreadQuickOpen: createProxyIdentifier('MainThreadQuickOpen'),
    MainThreadStatusBar: createProxyIdentifier('MainThreadStatusBar'),
    MainThreadSecretState: createProxyIdentifier('MainThreadSecretState'),
    MainThreadStorage: createProxyIdentifier('MainThreadStorage'),
    MainThreadSpeech: createProxyIdentifier('MainThreadSpeechProvider'),
    MainThreadTelemetry: createProxyIdentifier('MainThreadTelemetry'),
    MainThreadTerminalService: createProxyIdentifier('MainThreadTerminalService'),
    MainThreadTerminalShellIntegration: createProxyIdentifier('MainThreadTerminalShellIntegration'),
    MainThreadWebviews: createProxyIdentifier('MainThreadWebviews'),
    MainThreadWebviewPanels: createProxyIdentifier('MainThreadWebviewPanels'),
    MainThreadWebviewViews: createProxyIdentifier('MainThreadWebviewViews'),
    MainThreadCustomEditors: createProxyIdentifier('MainThreadCustomEditors'),
    MainThreadUrls: createProxyIdentifier('MainThreadUrls'),
    MainThreadUriOpeners: createProxyIdentifier('MainThreadUriOpeners'),
    MainThreadProfileContentHandlers: createProxyIdentifier('MainThreadProfileContentHandlers'),
    MainThreadWorkspace: createProxyIdentifier('MainThreadWorkspace'),
    MainThreadFileSystem: createProxyIdentifier('MainThreadFileSystem'),
    MainThreadFileSystemEventService: createProxyIdentifier('MainThreadFileSystemEventService'),
    MainThreadExtensionService: createProxyIdentifier('MainThreadExtensionService'),
    MainThreadSCM: createProxyIdentifier('MainThreadSCM'),
    MainThreadSearch: createProxyIdentifier('MainThreadSearch'),
    MainThreadShare: createProxyIdentifier('MainThreadShare'),
    MainThreadTask: createProxyIdentifier('MainThreadTask'),
    MainThreadWindow: createProxyIdentifier('MainThreadWindow'),
    MainThreadLabelService: createProxyIdentifier('MainThreadLabelService'),
    MainThreadNotebook: createProxyIdentifier('MainThreadNotebook'),
    MainThreadNotebookDocuments: createProxyIdentifier('MainThreadNotebookDocumentsShape'),
    MainThreadNotebookEditors: createProxyIdentifier('MainThreadNotebookEditorsShape'),
    MainThreadNotebookKernels: createProxyIdentifier('MainThreadNotebookKernels'),
    MainThreadNotebookRenderers: createProxyIdentifier('MainThreadNotebookRenderers'),
    MainThreadInteractive: createProxyIdentifier('MainThreadInteractive'),
    MainThreadTheming: createProxyIdentifier('MainThreadTheming'),
    MainThreadTunnelService: createProxyIdentifier('MainThreadTunnelService'),
    MainThreadManagedSockets: createProxyIdentifier('MainThreadManagedSockets'),
    MainThreadTimeline: createProxyIdentifier('MainThreadTimeline'),
    MainThreadTesting: createProxyIdentifier('MainThreadTesting'),
    MainThreadLocalization: createProxyIdentifier('MainThreadLocalizationShape'),
    MainThreadMcp: createProxyIdentifier('MainThreadMcpShape'),
    MainThreadAiRelatedInformation: createProxyIdentifier('MainThreadAiRelatedInformation'),
    MainThreadAiEmbeddingVector: createProxyIdentifier('MainThreadAiEmbeddingVector'),
    MainThreadChatStatus: createProxyIdentifier('MainThreadChatStatus'),
};
export const ExtHostContext = {
    ExtHostCodeMapper: createProxyIdentifier('ExtHostCodeMapper'),
    ExtHostCommands: createProxyIdentifier('ExtHostCommands'),
    ExtHostConfiguration: createProxyIdentifier('ExtHostConfiguration'),
    ExtHostDiagnostics: createProxyIdentifier('ExtHostDiagnostics'),
    ExtHostDebugService: createProxyIdentifier('ExtHostDebugService'),
    ExtHostDecorations: createProxyIdentifier('ExtHostDecorations'),
    ExtHostDocumentsAndEditors: createProxyIdentifier('ExtHostDocumentsAndEditors'),
    ExtHostDocuments: createProxyIdentifier('ExtHostDocuments'),
    ExtHostDocumentContentProviders: createProxyIdentifier('ExtHostDocumentContentProviders'),
    ExtHostDocumentSaveParticipant: createProxyIdentifier('ExtHostDocumentSaveParticipant'),
    ExtHostEditors: createProxyIdentifier('ExtHostEditors'),
    ExtHostTreeViews: createProxyIdentifier('ExtHostTreeViews'),
    ExtHostFileSystem: createProxyIdentifier('ExtHostFileSystem'),
    ExtHostFileSystemInfo: createProxyIdentifier('ExtHostFileSystemInfo'),
    ExtHostFileSystemEventService: createProxyIdentifier('ExtHostFileSystemEventService'),
    ExtHostLanguages: createProxyIdentifier('ExtHostLanguages'),
    ExtHostLanguageFeatures: createProxyIdentifier('ExtHostLanguageFeatures'),
    ExtHostQuickOpen: createProxyIdentifier('ExtHostQuickOpen'),
    ExtHostQuickDiff: createProxyIdentifier('ExtHostQuickDiff'),
    ExtHostStatusBar: createProxyIdentifier('ExtHostStatusBar'),
    ExtHostShare: createProxyIdentifier('ExtHostShare'),
    ExtHostExtensionService: createProxyIdentifier('ExtHostExtensionService'),
    ExtHostLogLevelServiceShape: createProxyIdentifier('ExtHostLogLevelServiceShape'),
    ExtHostTerminalService: createProxyIdentifier('ExtHostTerminalService'),
    ExtHostTerminalShellIntegration: createProxyIdentifier('ExtHostTerminalShellIntegration'),
    ExtHostSCM: createProxyIdentifier('ExtHostSCM'),
    ExtHostSearch: createProxyIdentifier('ExtHostSearch'),
    ExtHostTask: createProxyIdentifier('ExtHostTask'),
    ExtHostWorkspace: createProxyIdentifier('ExtHostWorkspace'),
    ExtHostWindow: createProxyIdentifier('ExtHostWindow'),
    ExtHostWebviews: createProxyIdentifier('ExtHostWebviews'),
    ExtHostWebviewPanels: createProxyIdentifier('ExtHostWebviewPanels'),
    ExtHostCustomEditors: createProxyIdentifier('ExtHostCustomEditors'),
    ExtHostWebviewViews: createProxyIdentifier('ExtHostWebviewViews'),
    ExtHostEditorInsets: createProxyIdentifier('ExtHostEditorInsets'),
    ExtHostEditorTabs: createProxyIdentifier('ExtHostEditorTabs'),
    ExtHostProgress: createProxyIdentifier('ExtHostProgress'),
    ExtHostComments: createProxyIdentifier('ExtHostComments'),
    ExtHostSecretState: createProxyIdentifier('ExtHostSecretState'),
    ExtHostStorage: createProxyIdentifier('ExtHostStorage'),
    ExtHostUrls: createProxyIdentifier('ExtHostUrls'),
    ExtHostUriOpeners: createProxyIdentifier('ExtHostUriOpeners'),
    ExtHostProfileContentHandlers: createProxyIdentifier('ExtHostProfileContentHandlers'),
    ExtHostOutputService: createProxyIdentifier('ExtHostOutputService'),
    ExtHostLabelService: createProxyIdentifier('ExtHostLabelService'),
    ExtHostNotebook: createProxyIdentifier('ExtHostNotebook'),
    ExtHostNotebookDocuments: createProxyIdentifier('ExtHostNotebookDocuments'),
    ExtHostNotebookEditors: createProxyIdentifier('ExtHostNotebookEditors'),
    ExtHostNotebookKernels: createProxyIdentifier('ExtHostNotebookKernels'),
    ExtHostNotebookRenderers: createProxyIdentifier('ExtHostNotebookRenderers'),
    ExtHostNotebookDocumentSaveParticipant: createProxyIdentifier('ExtHostNotebookDocumentSaveParticipant'),
    ExtHostInteractive: createProxyIdentifier('ExtHostInteractive'),
    ExtHostChatAgents2: createProxyIdentifier('ExtHostChatAgents'),
    ExtHostLanguageModelTools: createProxyIdentifier('ExtHostChatSkills'),
    ExtHostChatProvider: createProxyIdentifier('ExtHostChatProvider'),
    ExtHostSpeech: createProxyIdentifier('ExtHostSpeech'),
    ExtHostEmbeddings: createProxyIdentifier('ExtHostEmbeddings'),
    ExtHostAiRelatedInformation: createProxyIdentifier('ExtHostAiRelatedInformation'),
    ExtHostAiEmbeddingVector: createProxyIdentifier('ExtHostAiEmbeddingVector'),
    ExtHostTheming: createProxyIdentifier('ExtHostTheming'),
    ExtHostTunnelService: createProxyIdentifier('ExtHostTunnelService'),
    ExtHostManagedSockets: createProxyIdentifier('ExtHostManagedSockets'),
    ExtHostAuthentication: createProxyIdentifier('ExtHostAuthentication'),
    ExtHostTimeline: createProxyIdentifier('ExtHostTimeline'),
    ExtHostTesting: createProxyIdentifier('ExtHostTesting'),
    ExtHostTelemetry: createProxyIdentifier('ExtHostTelemetry'),
    ExtHostLocalization: createProxyIdentifier('ExtHostLocalization'),
    ExtHostMcp: createProxyIdentifier('ExtHostMcp'),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5wcm90b2NvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdC5wcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQThFaEcsT0FBTyxFQUFvRCxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBdUw5SSxNQUFNLENBQU4sSUFBWSxvQkFLWDtBQUxELFdBQVksb0JBQW9CO0lBQy9CLHFFQUFXLENBQUE7SUFDWCx1RUFBWSxDQUFBO0lBQ1oseUdBQTZCLENBQUE7SUFDN0IsaUVBQVMsQ0FBQTtBQUNWLENBQUMsRUFMVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBSy9CO0FBMGRELHdCQUF3QjtBQUV4QixNQUFNLENBQU4sSUFBa0IsWUFhakI7QUFiRCxXQUFrQixZQUFZO0lBQzdCLCtEQUFZLENBQUE7SUFDWix5REFBUyxDQUFBO0lBQ1QsaUVBQWEsQ0FBQTtJQUNiLG1FQUFjLENBQUE7SUFDZCxpRUFBYSxDQUFBO0lBQ2IseUVBQWlCLENBQUE7SUFDakIseUVBQWlCLENBQUE7SUFDakIsMkVBQWtCLENBQUE7SUFDbEIsNkVBQW1CLENBQUE7SUFDbkIsbUZBQXNCLENBQUE7SUFDdEIsc0VBQWUsQ0FBQTtJQUNmLGdGQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFiaUIsWUFBWSxLQUFaLFlBQVksUUFhN0I7QUFFRCxNQUFNLENBQU4sSUFBa0IscUJBS2pCO0FBTEQsV0FBa0IscUJBQXFCO0lBQ3RDLHlFQUFRLENBQUE7SUFDUiwyRUFBUyxDQUFBO0lBQ1QsNkVBQVUsQ0FBQTtJQUNWLHlFQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFLdEM7QUFpSUQsTUFBTSxDQUFOLElBQVkseUJBR1g7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