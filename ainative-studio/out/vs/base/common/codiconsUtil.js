import { isString } from './types.js';
const _codiconFontCharacters = Object.create(null);
export function register(id, fontCharacter) {
    if (isString(fontCharacter)) {
        const val = _codiconFontCharacters[fontCharacter];
        if (val === undefined) {
            throw new Error(`${id} references an unknown codicon: ${fontCharacter}`);
        }
        fontCharacter = val;
    }
    _codiconFontCharacters[id] = fontCharacter;
    return { id };
}
/**
 * Only to be used by the iconRegistry.
 */
export function getCodiconFontCharacters() {
    return _codiconFontCharacters;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kaWNvbnNVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvZGljb25zVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR3RDLE1BQU0sc0JBQXNCLEdBQTZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFN0UsTUFBTSxVQUFVLFFBQVEsQ0FBQyxFQUFVLEVBQUUsYUFBOEI7SUFDbEUsSUFBSSxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUM3QixNQUFNLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNsRCxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxtQ0FBbUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsYUFBYSxHQUFHLEdBQUcsQ0FBQztJQUNyQixDQUFDO0lBQ0Qsc0JBQXNCLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDO0lBQzNDLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNmLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSx3QkFBd0I7SUFDdkMsT0FBTyxzQkFBc0IsQ0FBQztBQUMvQixDQUFDIn0=