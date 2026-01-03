/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Error thrown during skill parsing
 */
export class SkillParseError extends Error {
    constructor(message, filePath) {
        super(message);
        this.filePath = filePath;
        this.name = 'SkillParseError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9za2lsbFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBK0NoRzs7R0FFRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLEtBQUs7SUFDekMsWUFBWSxPQUFlLEVBQWtCLFFBQWlCO1FBQzdELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUQ2QixhQUFRLEdBQVIsUUFBUSxDQUFTO1FBRTdELElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztDQUNEIn0=