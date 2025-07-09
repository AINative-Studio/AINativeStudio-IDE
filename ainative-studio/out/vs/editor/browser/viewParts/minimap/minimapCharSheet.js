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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJTaGVldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbWluaW1hcC9taW5pbWFwQ2hhclNoZWV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixTQWNqQjtBQWRELFdBQWtCLFNBQVM7SUFDMUIsNERBQWtCLENBQUE7SUFDbEIseURBQWlCLENBQUE7SUFDakIsNkRBQW9CLENBQUE7SUFDcEIsc0RBQTRDLENBQUE7SUFFNUMsd0VBQXdCLENBQUE7SUFDeEIsc0VBQXVCLENBQUE7SUFFdkIsaUVBQW9CLENBQUE7SUFDcEIsK0RBQW1CLENBQUE7SUFFbkIsbUVBQXFCLENBQUE7SUFDckIsZ0ZBQTRFLENBQUE7QUFDN0UsQ0FBQyxFQWRpQixTQUFTLEtBQVQsU0FBUyxRQWMxQjtBQUVELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBMEIsQ0FBQyxHQUFHLEVBQUU7SUFDeEQsTUFBTSxDQUFDLEdBQWEsRUFBRSxDQUFDO0lBQ3ZCLEtBQUssSUFBSSxDQUFDLG1DQUEwQixFQUFFLENBQUMsbUNBQXlCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN2RSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVELENBQUMsQ0FBQyxJQUFJLG9DQUF3QixDQUFDO0lBQy9CLE9BQU8sQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQWMsRUFBRSxTQUFpQixFQUFFLEVBQUU7SUFDakUsTUFBTSxvQ0FBMkIsQ0FBQztJQUNsQyxJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxnQ0FBdUIsRUFBRSxDQUFDO1FBQ2pELElBQUksU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3BCLHdFQUF3RTtZQUN4RSxPQUFPLENBQUMsTUFBTSxnQ0FBdUIsQ0FBQyxnQ0FBdUIsQ0FBQztRQUMvRCxDQUFDO1FBQ0QsT0FBTyxnQ0FBdUIsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO0lBQ25ELENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQyJ9