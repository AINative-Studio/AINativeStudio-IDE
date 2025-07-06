/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var Constants;
(function (Constants) {
    Constants[Constants["START_CH_CODE"] = 32] = "START_CH_CODE";
    Constants[Constants["END_CH_CODE"] = 126] = "END_CH_CODE";
    Constants[Constants["UNKNOWN_CODE"] = 65533] = "UNKNOWN_CODE";
    Constants[Constants["CHAR_COUNT"] = 96] = "CHAR_COUNT";
    Constants[Constants["SAMPLED_CHAR_HEIGHT"] = 16] = "SAMPLED_CHAR_HEIGHT";
    Constants[Constants["SAMPLED_CHAR_WIDTH"] = 10] = "SAMPLED_CHAR_WIDTH";
    Constants[Constants["BASE_CHAR_HEIGHT"] = 2] = "BASE_CHAR_HEIGHT";
    Constants[Constants["BASE_CHAR_WIDTH"] = 1] = "BASE_CHAR_WIDTH";
    Constants[Constants["RGBA_CHANNELS_CNT"] = 4] = "RGBA_CHANNELS_CNT";
    Constants[Constants["RGBA_SAMPLED_ROW_WIDTH"] = 3840] = "RGBA_SAMPLED_ROW_WIDTH";
})(Constants || (Constants = {}));
export const allCharCodes = (() => {
    const v = [];
    for (let i = 32 /* Constants.START_CH_CODE */; i <= 126 /* Constants.END_CH_CODE */; i++) {
        v.push(i);
    }
    v.push(65533 /* Constants.UNKNOWN_CODE */);
    return v;
})();
export const getCharIndex = (chCode, fontScale) => {
    chCode -= 32 /* Constants.START_CH_CODE */;
    if (chCode < 0 || chCode > 96 /* Constants.CHAR_COUNT */) {
        if (fontScale <= 2) {
            // for smaller scales, we can get away with using any ASCII character...
            return (chCode + 96 /* Constants.CHAR_COUNT */) % 96 /* Constants.CHAR_COUNT */;
        }
        return 96 /* Constants.CHAR_COUNT */ - 1; // unknown symbol
    }
    return chCode;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJTaGVldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL21pbmltYXAvbWluaW1hcENoYXJTaGVldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBa0IsU0FjakI7QUFkRCxXQUFrQixTQUFTO0lBQzFCLDREQUFrQixDQUFBO0lBQ2xCLHlEQUFpQixDQUFBO0lBQ2pCLDZEQUFvQixDQUFBO0lBQ3BCLHNEQUE0QyxDQUFBO0lBRTVDLHdFQUF3QixDQUFBO0lBQ3hCLHNFQUF1QixDQUFBO0lBRXZCLGlFQUFvQixDQUFBO0lBQ3BCLCtEQUFtQixDQUFBO0lBRW5CLG1FQUFxQixDQUFBO0lBQ3JCLGdGQUE0RSxDQUFBO0FBQzdFLENBQUMsRUFkaUIsU0FBUyxLQUFULFNBQVMsUUFjMUI7QUFFRCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQTBCLENBQUMsR0FBRyxFQUFFO0lBQ3hELE1BQU0sQ0FBQyxHQUFhLEVBQUUsQ0FBQztJQUN2QixLQUFLLElBQUksQ0FBQyxtQ0FBMEIsRUFBRSxDQUFDLG1DQUF5QixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdkUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxDQUFDLENBQUMsSUFBSSxvQ0FBd0IsQ0FBQztJQUMvQixPQUFPLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFTCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQUUsU0FBaUIsRUFBRSxFQUFFO0lBQ2pFLE1BQU0sb0NBQTJCLENBQUM7SUFDbEMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sZ0NBQXVCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQix3RUFBd0U7WUFDeEUsT0FBTyxDQUFDLE1BQU0sZ0NBQXVCLENBQUMsZ0NBQXVCLENBQUM7UUFDL0QsQ0FBQztRQUNELE9BQU8sZ0NBQXVCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtJQUNuRCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUMifQ==