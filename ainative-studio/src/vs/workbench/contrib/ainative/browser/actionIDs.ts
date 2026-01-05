// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const AINATIVE_CTRL_L_ACTION_ID = 'ainative.ctrlLAction'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_CTRL_L_ACTION_ID instead. */
export const VOID_CTRL_L_ACTION_ID = AINATIVE_CTRL_L_ACTION_ID

export const AINATIVE_CTRL_K_ACTION_ID = 'ainative.ctrlKAction'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_CTRL_K_ACTION_ID instead. */
export const VOID_CTRL_K_ACTION_ID = AINATIVE_CTRL_K_ACTION_ID

export const AINATIVE_ACCEPT_DIFF_ACTION_ID = 'ainative.acceptDiff'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_ACCEPT_DIFF_ACTION_ID instead. */
export const VOID_ACCEPT_DIFF_ACTION_ID = AINATIVE_ACCEPT_DIFF_ACTION_ID

export const AINATIVE_REJECT_DIFF_ACTION_ID = 'ainative.rejectDiff'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_REJECT_DIFF_ACTION_ID instead. */
export const VOID_REJECT_DIFF_ACTION_ID = AINATIVE_REJECT_DIFF_ACTION_ID

export const AINATIVE_GOTO_NEXT_DIFF_ACTION_ID = 'ainative.goToNextDiff'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_GOTO_NEXT_DIFF_ACTION_ID instead. */
export const VOID_GOTO_NEXT_DIFF_ACTION_ID = AINATIVE_GOTO_NEXT_DIFF_ACTION_ID

export const AINATIVE_GOTO_PREV_DIFF_ACTION_ID = 'ainative.goToPrevDiff'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_GOTO_PREV_DIFF_ACTION_ID instead. */
export const VOID_GOTO_PREV_DIFF_ACTION_ID = AINATIVE_GOTO_PREV_DIFF_ACTION_ID

export const AINATIVE_GOTO_NEXT_URI_ACTION_ID = 'ainative.goToNextUri'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_GOTO_NEXT_URI_ACTION_ID instead. */
export const VOID_GOTO_NEXT_URI_ACTION_ID = AINATIVE_GOTO_NEXT_URI_ACTION_ID

export const AINATIVE_GOTO_PREV_URI_ACTION_ID = 'ainative.goToPrevUri'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_GOTO_PREV_URI_ACTION_ID instead. */
export const VOID_GOTO_PREV_URI_ACTION_ID = AINATIVE_GOTO_PREV_URI_ACTION_ID

export const AINATIVE_ACCEPT_FILE_ACTION_ID = 'ainative.acceptFile'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_ACCEPT_FILE_ACTION_ID instead. */
export const VOID_ACCEPT_FILE_ACTION_ID = AINATIVE_ACCEPT_FILE_ACTION_ID

export const AINATIVE_REJECT_FILE_ACTION_ID = 'ainative.rejectFile'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_REJECT_FILE_ACTION_ID instead. */
export const VOID_REJECT_FILE_ACTION_ID = AINATIVE_REJECT_FILE_ACTION_ID

export const AINATIVE_ACCEPT_ALL_DIFFS_ACTION_ID = 'ainative.acceptAllDiffs'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_ACCEPT_ALL_DIFFS_ACTION_ID instead. */
export const VOID_ACCEPT_ALL_DIFFS_ACTION_ID = AINATIVE_ACCEPT_ALL_DIFFS_ACTION_ID

export const AINATIVE_REJECT_ALL_DIFFS_ACTION_ID = 'ainative.rejectAllDiffs'
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_REJECT_ALL_DIFFS_ACTION_ID instead. */
export const VOID_REJECT_ALL_DIFFS_ACTION_ID = AINATIVE_REJECT_ALL_DIFFS_ACTION_ID
