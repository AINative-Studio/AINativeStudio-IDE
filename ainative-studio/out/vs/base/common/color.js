/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function roundFloat(number, decimalPoints) {
    const decimal = Math.pow(10, decimalPoints);
    return Math.round(number * decimal) / decimal;
}
export class RGBA {
    constructor(r, g, b, a = 1) {
        this._rgbaBrand = undefined;
        this.r = Math.min(255, Math.max(0, r)) | 0;
        this.g = Math.min(255, Math.max(0, g)) | 0;
        this.b = Math.min(255, Math.max(0, b)) | 0;
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }
}
export class HSLA {
    constructor(h, s, l, a) {
        this._hslaBrand = undefined;
        this.h = Math.max(Math.min(360, h), 0) | 0;
        this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
        this.l = roundFloat(Math.max(Math.min(1, l), 0), 3);
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.h === b.h && a.s === b.s && a.l === b.l && a.a === b.a;
    }
    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h in the set [0, 360], s, and l in the set [0, 1].
     */
    static fromRGBA(rgba) {
        const r = rgba.r / 255;
        const g = rgba.g / 255;
        const b = rgba.b / 255;
        const a = rgba.a;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (min + max) / 2;
        const chroma = max - min;
        if (chroma > 0) {
            s = Math.min((l <= 0.5 ? chroma / (2 * l) : chroma / (2 - (2 * l))), 1);
            switch (max) {
                case r:
                    h = (g - b) / chroma + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / chroma + 2;
                    break;
                case b:
                    h = (r - g) / chroma + 4;
                    break;
            }
            h *= 60;
            h = Math.round(h);
        }
        return new HSLA(h, s, l, a);
    }
    static _hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }
    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h in the set [0, 360] s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     */
    static toRGBA(hsla) {
        const h = hsla.h / 360;
        const { s, l, a } = hsla;
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        }
        else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = HSLA._hue2rgb(p, q, h + 1 / 3);
            g = HSLA._hue2rgb(p, q, h);
            b = HSLA._hue2rgb(p, q, h - 1 / 3);
        }
        return new RGBA(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a);
    }
}
export class HSVA {
    constructor(h, s, v, a) {
        this._hsvaBrand = undefined;
        this.h = Math.max(Math.min(360, h), 0) | 0;
        this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
        this.v = roundFloat(Math.max(Math.min(1, v), 0), 3);
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a;
    }
    // from http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
    static fromRGBA(rgba) {
        const r = rgba.r / 255;
        const g = rgba.g / 255;
        const b = rgba.b / 255;
        const cmax = Math.max(r, g, b);
        const cmin = Math.min(r, g, b);
        const delta = cmax - cmin;
        const s = cmax === 0 ? 0 : (delta / cmax);
        let m;
        if (delta === 0) {
            m = 0;
        }
        else if (cmax === r) {
            m = ((((g - b) / delta) % 6) + 6) % 6;
        }
        else if (cmax === g) {
            m = ((b - r) / delta) + 2;
        }
        else {
            m = ((r - g) / delta) + 4;
        }
        return new HSVA(Math.round(m * 60), s, cmax, rgba.a);
    }
    // from http://www.rapidtables.com/convert/color/hsv-to-rgb.htm
    static toRGBA(hsva) {
        const { h, s, v, a } = hsva;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let [r, g, b] = [0, 0, 0];
        if (h < 60) {
            r = c;
            g = x;
        }
        else if (h < 120) {
            r = x;
            g = c;
        }
        else if (h < 180) {
            g = c;
            b = x;
        }
        else if (h < 240) {
            g = x;
            b = c;
        }
        else if (h < 300) {
            r = x;
            b = c;
        }
        else if (h <= 360) {
            r = c;
            b = x;
        }
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return new RGBA(r, g, b, a);
    }
}
export class Color {
    static fromHex(hex) {
        return Color.Format.CSS.parseHex(hex) || Color.red;
    }
    static equals(a, b) {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.equals(b);
    }
    get hsla() {
        if (this._hsla) {
            return this._hsla;
        }
        else {
            return HSLA.fromRGBA(this.rgba);
        }
    }
    get hsva() {
        if (this._hsva) {
            return this._hsva;
        }
        return HSVA.fromRGBA(this.rgba);
    }
    constructor(arg) {
        if (!arg) {
            throw new Error('Color needs a value');
        }
        else if (arg instanceof RGBA) {
            this.rgba = arg;
        }
        else if (arg instanceof HSLA) {
            this._hsla = arg;
            this.rgba = HSLA.toRGBA(arg);
        }
        else if (arg instanceof HSVA) {
            this._hsva = arg;
            this.rgba = HSVA.toRGBA(arg);
        }
        else {
            throw new Error('Invalid color ctor argument');
        }
    }
    equals(other) {
        return !!other && RGBA.equals(this.rgba, other.rgba) && HSLA.equals(this.hsla, other.hsla) && HSVA.equals(this.hsva, other.hsva);
    }
    /**
     * http://www.w3.org/TR/WCAG20/#relativeluminancedef
     * Returns the number in the set [0, 1]. O => Darkest Black. 1 => Lightest white.
     */
    getRelativeLuminance() {
        const R = Color._relativeLuminanceForComponent(this.rgba.r);
        const G = Color._relativeLuminanceForComponent(this.rgba.g);
        const B = Color._relativeLuminanceForComponent(this.rgba.b);
        const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        return roundFloat(luminance, 4);
    }
    /**
     * Reduces the "foreground" color on this "background" color unti it is
     * below the relative luminace ratio.
     * @returns the new foreground color
     * @see https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L315
     */
    reduceRelativeLuminace(foreground, ratio) {
        // This is a naive but fast approach to reducing luminance as converting to
        // HSL and back is expensive
        let { r: fgR, g: fgG, b: fgB } = foreground.rgba;
        let cr = this.getContrastRatio(foreground);
        while (cr < ratio && (fgR > 0 || fgG > 0 || fgB > 0)) {
            // Reduce by 10% until the ratio is hit
            fgR -= Math.max(0, Math.ceil(fgR * 0.1));
            fgG -= Math.max(0, Math.ceil(fgG * 0.1));
            fgB -= Math.max(0, Math.ceil(fgB * 0.1));
            cr = this.getContrastRatio(new Color(new RGBA(fgR, fgG, fgB)));
        }
        return new Color(new RGBA(fgR, fgG, fgB));
    }
    /**
     * Increases the "foreground" color on this "background" color unti it is
     * below the relative luminace ratio.
     * @returns the new foreground color
     * @see https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L335
     */
    increaseRelativeLuminace(foreground, ratio) {
        // This is a naive but fast approach to reducing luminance as converting to
        // HSL and back is expensive
        let { r: fgR, g: fgG, b: fgB } = foreground.rgba;
        let cr = this.getContrastRatio(foreground);
        while (cr < ratio && (fgR < 0xFF || fgG < 0xFF || fgB < 0xFF)) {
            fgR = Math.min(0xFF, fgR + Math.ceil((255 - fgR) * 0.1));
            fgG = Math.min(0xFF, fgG + Math.ceil((255 - fgG) * 0.1));
            fgB = Math.min(0xFF, fgB + Math.ceil((255 - fgB) * 0.1));
            cr = this.getContrastRatio(new Color(new RGBA(fgR, fgG, fgB)));
        }
        return new Color(new RGBA(fgR, fgG, fgB));
    }
    static _relativeLuminanceForComponent(color) {
        const c = color / 255;
        return (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
    }
    /**
     * http://www.w3.org/TR/WCAG20/#contrast-ratiodef
     * Returns the contrast ration number in the set [1, 21].
     */
    getContrastRatio(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 > lum2 ? (lum1 + 0.05) / (lum2 + 0.05) : (lum2 + 0.05) / (lum1 + 0.05);
    }
    /**
     *	http://24ways.org/2010/calculating-color-contrast
     *  Return 'true' if darker color otherwise 'false'
     */
    isDarker() {
        const yiq = (this.rgba.r * 299 + this.rgba.g * 587 + this.rgba.b * 114) / 1000;
        return yiq < 128;
    }
    /**
     *	http://24ways.org/2010/calculating-color-contrast
     *  Return 'true' if lighter color otherwise 'false'
     */
    isLighter() {
        const yiq = (this.rgba.r * 299 + this.rgba.g * 587 + this.rgba.b * 114) / 1000;
        return yiq >= 128;
    }
    isLighterThan(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 > lum2;
    }
    isDarkerThan(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 < lum2;
    }
    /**
     * Based on xterm.js: https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L288
     *
     * Given a foreground color and a background color, either increase or reduce the luminance of the
     * foreground color until the specified contrast ratio is met. If pure white or black is hit
     * without the contrast ratio being met, go the other direction using the background color as the
     * foreground color and take either the first or second result depending on which has the higher
     * contrast ratio.
     *
     * @param foreground The foreground color.
     * @param ratio The contrast ratio to achieve.
     * @returns The adjusted foreground color.
     */
    ensureConstrast(foreground, ratio) {
        const bgL = this.getRelativeLuminance();
        const fgL = foreground.getRelativeLuminance();
        const cr = this.getContrastRatio(foreground);
        if (cr < ratio) {
            if (fgL < bgL) {
                const resultA = this.reduceRelativeLuminace(foreground, ratio);
                const resultARatio = this.getContrastRatio(resultA);
                if (resultARatio < ratio) {
                    const resultB = this.increaseRelativeLuminace(foreground, ratio);
                    const resultBRatio = this.getContrastRatio(resultB);
                    return resultARatio > resultBRatio ? resultA : resultB;
                }
                return resultA;
            }
            const resultA = this.increaseRelativeLuminace(foreground, ratio);
            const resultARatio = this.getContrastRatio(resultA);
            if (resultARatio < ratio) {
                const resultB = this.reduceRelativeLuminace(foreground, ratio);
                const resultBRatio = this.getContrastRatio(resultB);
                return resultARatio > resultBRatio ? resultA : resultB;
            }
            return resultA;
        }
        return foreground;
    }
    lighten(factor) {
        return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l + this.hsla.l * factor, this.hsla.a));
    }
    darken(factor) {
        return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l - this.hsla.l * factor, this.hsla.a));
    }
    transparent(factor) {
        const { r, g, b, a } = this.rgba;
        return new Color(new RGBA(r, g, b, a * factor));
    }
    isTransparent() {
        return this.rgba.a === 0;
    }
    isOpaque() {
        return this.rgba.a === 1;
    }
    opposite() {
        return new Color(new RGBA(255 - this.rgba.r, 255 - this.rgba.g, 255 - this.rgba.b, this.rgba.a));
    }
    blend(c) {
        const rgba = c.rgba;
        // Convert to 0..1 opacity
        const thisA = this.rgba.a;
        const colorA = rgba.a;
        const a = thisA + colorA * (1 - thisA);
        if (a < 1e-6) {
            return Color.transparent;
        }
        const r = this.rgba.r * thisA / a + rgba.r * colorA * (1 - thisA) / a;
        const g = this.rgba.g * thisA / a + rgba.g * colorA * (1 - thisA) / a;
        const b = this.rgba.b * thisA / a + rgba.b * colorA * (1 - thisA) / a;
        return new Color(new RGBA(r, g, b, a));
    }
    makeOpaque(opaqueBackground) {
        if (this.isOpaque() || opaqueBackground.rgba.a !== 1) {
            // only allow to blend onto a non-opaque color onto a opaque color
            return this;
        }
        const { r, g, b, a } = this.rgba;
        // https://stackoverflow.com/questions/12228548/finding-equivalent-color-with-opacity
        return new Color(new RGBA(opaqueBackground.rgba.r - a * (opaqueBackground.rgba.r - r), opaqueBackground.rgba.g - a * (opaqueBackground.rgba.g - g), opaqueBackground.rgba.b - a * (opaqueBackground.rgba.b - b), 1));
    }
    flatten(...backgrounds) {
        const background = backgrounds.reduceRight((accumulator, color) => {
            return Color._flatten(color, accumulator);
        });
        return Color._flatten(this, background);
    }
    static _flatten(foreground, background) {
        const backgroundAlpha = 1 - foreground.rgba.a;
        return new Color(new RGBA(backgroundAlpha * background.rgba.r + foreground.rgba.a * foreground.rgba.r, backgroundAlpha * background.rgba.g + foreground.rgba.a * foreground.rgba.g, backgroundAlpha * background.rgba.b + foreground.rgba.a * foreground.rgba.b));
    }
    toString() {
        if (!this._toString) {
            this._toString = Color.Format.CSS.format(this);
        }
        return this._toString;
    }
    toNumber32Bit() {
        if (!this._toNumber32Bit) {
            this._toNumber32Bit = (this.rgba.r /*  */ << 24 |
                this.rgba.g /*  */ << 16 |
                this.rgba.b /*  */ << 8 |
                this.rgba.a * 0xFF << 0) >>> 0;
        }
        return this._toNumber32Bit;
    }
    static getLighterColor(of, relative, factor) {
        if (of.isLighterThan(relative)) {
            return of;
        }
        factor = factor ? factor : 0.5;
        const lum1 = of.getRelativeLuminance();
        const lum2 = relative.getRelativeLuminance();
        factor = factor * (lum2 - lum1) / lum2;
        return of.lighten(factor);
    }
    static getDarkerColor(of, relative, factor) {
        if (of.isDarkerThan(relative)) {
            return of;
        }
        factor = factor ? factor : 0.5;
        const lum1 = of.getRelativeLuminance();
        const lum2 = relative.getRelativeLuminance();
        factor = factor * (lum1 - lum2) / lum1;
        return of.darken(factor);
    }
    static { this.white = new Color(new RGBA(255, 255, 255, 1)); }
    static { this.black = new Color(new RGBA(0, 0, 0, 1)); }
    static { this.red = new Color(new RGBA(255, 0, 0, 1)); }
    static { this.blue = new Color(new RGBA(0, 0, 255, 1)); }
    static { this.green = new Color(new RGBA(0, 255, 0, 1)); }
    static { this.cyan = new Color(new RGBA(0, 255, 255, 1)); }
    static { this.lightgrey = new Color(new RGBA(211, 211, 211, 1)); }
    static { this.transparent = new Color(new RGBA(0, 0, 0, 0)); }
}
(function (Color) {
    let Format;
    (function (Format) {
        let CSS;
        (function (CSS) {
            function formatRGB(color) {
                if (color.rgba.a === 1) {
                    return `rgb(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b})`;
                }
                return Color.Format.CSS.formatRGBA(color);
            }
            CSS.formatRGB = formatRGB;
            function formatRGBA(color) {
                return `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${+(color.rgba.a).toFixed(2)})`;
            }
            CSS.formatRGBA = formatRGBA;
            function formatHSL(color) {
                if (color.hsla.a === 1) {
                    return `hsl(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%)`;
                }
                return Color.Format.CSS.formatHSLA(color);
            }
            CSS.formatHSL = formatHSL;
            function formatHSLA(color) {
                return `hsla(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%, ${color.hsla.a.toFixed(2)})`;
            }
            CSS.formatHSLA = formatHSLA;
            function _toTwoDigitHex(n) {
                const r = n.toString(16);
                return r.length !== 2 ? '0' + r : r;
            }
            /**
             * Formats the color as #RRGGBB
             */
            function formatHex(color) {
                return `#${_toTwoDigitHex(color.rgba.r)}${_toTwoDigitHex(color.rgba.g)}${_toTwoDigitHex(color.rgba.b)}`;
            }
            CSS.formatHex = formatHex;
            /**
             * Formats the color as #RRGGBBAA
             * If 'compact' is set, colors without transparancy will be printed as #RRGGBB
             */
            function formatHexA(color, compact = false) {
                if (compact && color.rgba.a === 1) {
                    return Color.Format.CSS.formatHex(color);
                }
                return `#${_toTwoDigitHex(color.rgba.r)}${_toTwoDigitHex(color.rgba.g)}${_toTwoDigitHex(color.rgba.b)}${_toTwoDigitHex(Math.round(color.rgba.a * 255))}`;
            }
            CSS.formatHexA = formatHexA;
            /**
             * The default format will use HEX if opaque and RGBA otherwise.
             */
            function format(color) {
                if (color.isOpaque()) {
                    return Color.Format.CSS.formatHex(color);
                }
                return Color.Format.CSS.formatRGBA(color);
            }
            CSS.format = format;
            /**
             * Parse a CSS color and return a {@link Color}.
             * @param css The CSS color to parse.
             * @see https://drafts.csswg.org/css-color/#typedef-color
             */
            function parse(css) {
                if (css === 'transparent') {
                    return Color.transparent;
                }
                if (css.startsWith('#')) {
                    return parseHex(css);
                }
                if (css.startsWith('rgba(')) {
                    const color = css.match(/rgba\((?<r>(?:\+|-)?\d+), *(?<g>(?:\+|-)?\d+), *(?<b>(?:\+|-)?\d+), *(?<a>(?:\+|-)?\d+(\.\d+)?)\)/);
                    if (!color) {
                        throw new Error('Invalid color format ' + css);
                    }
                    const r = parseInt(color.groups?.r ?? '0');
                    const g = parseInt(color.groups?.g ?? '0');
                    const b = parseInt(color.groups?.b ?? '0');
                    const a = parseFloat(color.groups?.a ?? '0');
                    return new Color(new RGBA(r, g, b, a));
                }
                if (css.startsWith('rgb(')) {
                    const color = css.match(/rgb\((?<r>(?:\+|-)?\d+), *(?<g>(?:\+|-)?\d+), *(?<b>(?:\+|-)?\d+)\)/);
                    if (!color) {
                        throw new Error('Invalid color format ' + css);
                    }
                    const r = parseInt(color.groups?.r ?? '0');
                    const g = parseInt(color.groups?.g ?? '0');
                    const b = parseInt(color.groups?.b ?? '0');
                    return new Color(new RGBA(r, g, b));
                }
                // TODO: Support more formats as needed
                return parseNamedKeyword(css);
            }
            CSS.parse = parse;
            function parseNamedKeyword(css) {
                // https://drafts.csswg.org/css-color/#named-colors
                switch (css) {
                    case 'aliceblue': return new Color(new RGBA(240, 248, 255, 1));
                    case 'antiquewhite': return new Color(new RGBA(250, 235, 215, 1));
                    case 'aqua': return new Color(new RGBA(0, 255, 255, 1));
                    case 'aquamarine': return new Color(new RGBA(127, 255, 212, 1));
                    case 'azure': return new Color(new RGBA(240, 255, 255, 1));
                    case 'beige': return new Color(new RGBA(245, 245, 220, 1));
                    case 'bisque': return new Color(new RGBA(255, 228, 196, 1));
                    case 'black': return new Color(new RGBA(0, 0, 0, 1));
                    case 'blanchedalmond': return new Color(new RGBA(255, 235, 205, 1));
                    case 'blue': return new Color(new RGBA(0, 0, 255, 1));
                    case 'blueviolet': return new Color(new RGBA(138, 43, 226, 1));
                    case 'brown': return new Color(new RGBA(165, 42, 42, 1));
                    case 'burlywood': return new Color(new RGBA(222, 184, 135, 1));
                    case 'cadetblue': return new Color(new RGBA(95, 158, 160, 1));
                    case 'chartreuse': return new Color(new RGBA(127, 255, 0, 1));
                    case 'chocolate': return new Color(new RGBA(210, 105, 30, 1));
                    case 'coral': return new Color(new RGBA(255, 127, 80, 1));
                    case 'cornflowerblue': return new Color(new RGBA(100, 149, 237, 1));
                    case 'cornsilk': return new Color(new RGBA(255, 248, 220, 1));
                    case 'crimson': return new Color(new RGBA(220, 20, 60, 1));
                    case 'cyan': return new Color(new RGBA(0, 255, 255, 1));
                    case 'darkblue': return new Color(new RGBA(0, 0, 139, 1));
                    case 'darkcyan': return new Color(new RGBA(0, 139, 139, 1));
                    case 'darkgoldenrod': return new Color(new RGBA(184, 134, 11, 1));
                    case 'darkgray': return new Color(new RGBA(169, 169, 169, 1));
                    case 'darkgreen': return new Color(new RGBA(0, 100, 0, 1));
                    case 'darkgrey': return new Color(new RGBA(169, 169, 169, 1));
                    case 'darkkhaki': return new Color(new RGBA(189, 183, 107, 1));
                    case 'darkmagenta': return new Color(new RGBA(139, 0, 139, 1));
                    case 'darkolivegreen': return new Color(new RGBA(85, 107, 47, 1));
                    case 'darkorange': return new Color(new RGBA(255, 140, 0, 1));
                    case 'darkorchid': return new Color(new RGBA(153, 50, 204, 1));
                    case 'darkred': return new Color(new RGBA(139, 0, 0, 1));
                    case 'darksalmon': return new Color(new RGBA(233, 150, 122, 1));
                    case 'darkseagreen': return new Color(new RGBA(143, 188, 143, 1));
                    case 'darkslateblue': return new Color(new RGBA(72, 61, 139, 1));
                    case 'darkslategray': return new Color(new RGBA(47, 79, 79, 1));
                    case 'darkslategrey': return new Color(new RGBA(47, 79, 79, 1));
                    case 'darkturquoise': return new Color(new RGBA(0, 206, 209, 1));
                    case 'darkviolet': return new Color(new RGBA(148, 0, 211, 1));
                    case 'deeppink': return new Color(new RGBA(255, 20, 147, 1));
                    case 'deepskyblue': return new Color(new RGBA(0, 191, 255, 1));
                    case 'dimgray': return new Color(new RGBA(105, 105, 105, 1));
                    case 'dimgrey': return new Color(new RGBA(105, 105, 105, 1));
                    case 'dodgerblue': return new Color(new RGBA(30, 144, 255, 1));
                    case 'firebrick': return new Color(new RGBA(178, 34, 34, 1));
                    case 'floralwhite': return new Color(new RGBA(255, 250, 240, 1));
                    case 'forestgreen': return new Color(new RGBA(34, 139, 34, 1));
                    case 'fuchsia': return new Color(new RGBA(255, 0, 255, 1));
                    case 'gainsboro': return new Color(new RGBA(220, 220, 220, 1));
                    case 'ghostwhite': return new Color(new RGBA(248, 248, 255, 1));
                    case 'gold': return new Color(new RGBA(255, 215, 0, 1));
                    case 'goldenrod': return new Color(new RGBA(218, 165, 32, 1));
                    case 'gray': return new Color(new RGBA(128, 128, 128, 1));
                    case 'green': return new Color(new RGBA(0, 128, 0, 1));
                    case 'greenyellow': return new Color(new RGBA(173, 255, 47, 1));
                    case 'grey': return new Color(new RGBA(128, 128, 128, 1));
                    case 'honeydew': return new Color(new RGBA(240, 255, 240, 1));
                    case 'hotpink': return new Color(new RGBA(255, 105, 180, 1));
                    case 'indianred': return new Color(new RGBA(205, 92, 92, 1));
                    case 'indigo': return new Color(new RGBA(75, 0, 130, 1));
                    case 'ivory': return new Color(new RGBA(255, 255, 240, 1));
                    case 'khaki': return new Color(new RGBA(240, 230, 140, 1));
                    case 'lavender': return new Color(new RGBA(230, 230, 250, 1));
                    case 'lavenderblush': return new Color(new RGBA(255, 240, 245, 1));
                    case 'lawngreen': return new Color(new RGBA(124, 252, 0, 1));
                    case 'lemonchiffon': return new Color(new RGBA(255, 250, 205, 1));
                    case 'lightblue': return new Color(new RGBA(173, 216, 230, 1));
                    case 'lightcoral': return new Color(new RGBA(240, 128, 128, 1));
                    case 'lightcyan': return new Color(new RGBA(224, 255, 255, 1));
                    case 'lightgoldenrodyellow': return new Color(new RGBA(250, 250, 210, 1));
                    case 'lightgray': return new Color(new RGBA(211, 211, 211, 1));
                    case 'lightgreen': return new Color(new RGBA(144, 238, 144, 1));
                    case 'lightgrey': return new Color(new RGBA(211, 211, 211, 1));
                    case 'lightpink': return new Color(new RGBA(255, 182, 193, 1));
                    case 'lightsalmon': return new Color(new RGBA(255, 160, 122, 1));
                    case 'lightseagreen': return new Color(new RGBA(32, 178, 170, 1));
                    case 'lightskyblue': return new Color(new RGBA(135, 206, 250, 1));
                    case 'lightslategray': return new Color(new RGBA(119, 136, 153, 1));
                    case 'lightslategrey': return new Color(new RGBA(119, 136, 153, 1));
                    case 'lightsteelblue': return new Color(new RGBA(176, 196, 222, 1));
                    case 'lightyellow': return new Color(new RGBA(255, 255, 224, 1));
                    case 'lime': return new Color(new RGBA(0, 255, 0, 1));
                    case 'limegreen': return new Color(new RGBA(50, 205, 50, 1));
                    case 'linen': return new Color(new RGBA(250, 240, 230, 1));
                    case 'magenta': return new Color(new RGBA(255, 0, 255, 1));
                    case 'maroon': return new Color(new RGBA(128, 0, 0, 1));
                    case 'mediumaquamarine': return new Color(new RGBA(102, 205, 170, 1));
                    case 'mediumblue': return new Color(new RGBA(0, 0, 205, 1));
                    case 'mediumorchid': return new Color(new RGBA(186, 85, 211, 1));
                    case 'mediumpurple': return new Color(new RGBA(147, 112, 219, 1));
                    case 'mediumseagreen': return new Color(new RGBA(60, 179, 113, 1));
                    case 'mediumslateblue': return new Color(new RGBA(123, 104, 238, 1));
                    case 'mediumspringgreen': return new Color(new RGBA(0, 250, 154, 1));
                    case 'mediumturquoise': return new Color(new RGBA(72, 209, 204, 1));
                    case 'mediumvioletred': return new Color(new RGBA(199, 21, 133, 1));
                    case 'midnightblue': return new Color(new RGBA(25, 25, 112, 1));
                    case 'mintcream': return new Color(new RGBA(245, 255, 250, 1));
                    case 'mistyrose': return new Color(new RGBA(255, 228, 225, 1));
                    case 'moccasin': return new Color(new RGBA(255, 228, 181, 1));
                    case 'navajowhite': return new Color(new RGBA(255, 222, 173, 1));
                    case 'navy': return new Color(new RGBA(0, 0, 128, 1));
                    case 'oldlace': return new Color(new RGBA(253, 245, 230, 1));
                    case 'olive': return new Color(new RGBA(128, 128, 0, 1));
                    case 'olivedrab': return new Color(new RGBA(107, 142, 35, 1));
                    case 'orange': return new Color(new RGBA(255, 165, 0, 1));
                    case 'orangered': return new Color(new RGBA(255, 69, 0, 1));
                    case 'orchid': return new Color(new RGBA(218, 112, 214, 1));
                    case 'palegoldenrod': return new Color(new RGBA(238, 232, 170, 1));
                    case 'palegreen': return new Color(new RGBA(152, 251, 152, 1));
                    case 'paleturquoise': return new Color(new RGBA(175, 238, 238, 1));
                    case 'palevioletred': return new Color(new RGBA(219, 112, 147, 1));
                    case 'papayawhip': return new Color(new RGBA(255, 239, 213, 1));
                    case 'peachpuff': return new Color(new RGBA(255, 218, 185, 1));
                    case 'peru': return new Color(new RGBA(205, 133, 63, 1));
                    case 'pink': return new Color(new RGBA(255, 192, 203, 1));
                    case 'plum': return new Color(new RGBA(221, 160, 221, 1));
                    case 'powderblue': return new Color(new RGBA(176, 224, 230, 1));
                    case 'purple': return new Color(new RGBA(128, 0, 128, 1));
                    case 'rebeccapurple': return new Color(new RGBA(102, 51, 153, 1));
                    case 'red': return new Color(new RGBA(255, 0, 0, 1));
                    case 'rosybrown': return new Color(new RGBA(188, 143, 143, 1));
                    case 'royalblue': return new Color(new RGBA(65, 105, 225, 1));
                    case 'saddlebrown': return new Color(new RGBA(139, 69, 19, 1));
                    case 'salmon': return new Color(new RGBA(250, 128, 114, 1));
                    case 'sandybrown': return new Color(new RGBA(244, 164, 96, 1));
                    case 'seagreen': return new Color(new RGBA(46, 139, 87, 1));
                    case 'seashell': return new Color(new RGBA(255, 245, 238, 1));
                    case 'sienna': return new Color(new RGBA(160, 82, 45, 1));
                    case 'silver': return new Color(new RGBA(192, 192, 192, 1));
                    case 'skyblue': return new Color(new RGBA(135, 206, 235, 1));
                    case 'slateblue': return new Color(new RGBA(106, 90, 205, 1));
                    case 'slategray': return new Color(new RGBA(112, 128, 144, 1));
                    case 'slategrey': return new Color(new RGBA(112, 128, 144, 1));
                    case 'snow': return new Color(new RGBA(255, 250, 250, 1));
                    case 'springgreen': return new Color(new RGBA(0, 255, 127, 1));
                    case 'steelblue': return new Color(new RGBA(70, 130, 180, 1));
                    case 'tan': return new Color(new RGBA(210, 180, 140, 1));
                    case 'teal': return new Color(new RGBA(0, 128, 128, 1));
                    case 'thistle': return new Color(new RGBA(216, 191, 216, 1));
                    case 'tomato': return new Color(new RGBA(255, 99, 71, 1));
                    case 'turquoise': return new Color(new RGBA(64, 224, 208, 1));
                    case 'violet': return new Color(new RGBA(238, 130, 238, 1));
                    case 'wheat': return new Color(new RGBA(245, 222, 179, 1));
                    case 'white': return new Color(new RGBA(255, 255, 255, 1));
                    case 'whitesmoke': return new Color(new RGBA(245, 245, 245, 1));
                    case 'yellow': return new Color(new RGBA(255, 255, 0, 1));
                    case 'yellowgreen': return new Color(new RGBA(154, 205, 50, 1));
                    default: return null;
                }
            }
            /**
             * Converts an Hex color value to a Color.
             * returns r, g, and b are contained in the set [0, 255]
             * @param hex string (#RGB, #RGBA, #RRGGBB or #RRGGBBAA).
             */
            function parseHex(hex) {
                const length = hex.length;
                if (length === 0) {
                    // Invalid color
                    return null;
                }
                if (hex.charCodeAt(0) !== 35 /* CharCode.Hash */) {
                    // Does not begin with a #
                    return null;
                }
                if (length === 7) {
                    // #RRGGBB format
                    const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
                    const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
                    const b = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
                    return new Color(new RGBA(r, g, b, 1));
                }
                if (length === 9) {
                    // #RRGGBBAA format
                    const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
                    const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
                    const b = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
                    const a = 16 * _parseHexDigit(hex.charCodeAt(7)) + _parseHexDigit(hex.charCodeAt(8));
                    return new Color(new RGBA(r, g, b, a / 255));
                }
                if (length === 4) {
                    // #RGB format
                    const r = _parseHexDigit(hex.charCodeAt(1));
                    const g = _parseHexDigit(hex.charCodeAt(2));
                    const b = _parseHexDigit(hex.charCodeAt(3));
                    return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * b + b));
                }
                if (length === 5) {
                    // #RGBA format
                    const r = _parseHexDigit(hex.charCodeAt(1));
                    const g = _parseHexDigit(hex.charCodeAt(2));
                    const b = _parseHexDigit(hex.charCodeAt(3));
                    const a = _parseHexDigit(hex.charCodeAt(4));
                    return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * b + b, (16 * a + a) / 255));
                }
                // Invalid color
                return null;
            }
            CSS.parseHex = parseHex;
            function _parseHexDigit(charCode) {
                switch (charCode) {
                    case 48 /* CharCode.Digit0 */: return 0;
                    case 49 /* CharCode.Digit1 */: return 1;
                    case 50 /* CharCode.Digit2 */: return 2;
                    case 51 /* CharCode.Digit3 */: return 3;
                    case 52 /* CharCode.Digit4 */: return 4;
                    case 53 /* CharCode.Digit5 */: return 5;
                    case 54 /* CharCode.Digit6 */: return 6;
                    case 55 /* CharCode.Digit7 */: return 7;
                    case 56 /* CharCode.Digit8 */: return 8;
                    case 57 /* CharCode.Digit9 */: return 9;
                    case 97 /* CharCode.a */: return 10;
                    case 65 /* CharCode.A */: return 10;
                    case 98 /* CharCode.b */: return 11;
                    case 66 /* CharCode.B */: return 11;
                    case 99 /* CharCode.c */: return 12;
                    case 67 /* CharCode.C */: return 12;
                    case 100 /* CharCode.d */: return 13;
                    case 68 /* CharCode.D */: return 13;
                    case 101 /* CharCode.e */: return 14;
                    case 69 /* CharCode.E */: return 14;
                    case 102 /* CharCode.f */: return 15;
                    case 70 /* CharCode.F */: return 15;
                }
                return 0;
            }
        })(CSS = Format.CSS || (Format.CSS = {}));
    })(Format = Color.Format || (Color.Format = {}));
})(Color || (Color = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29sb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsU0FBUyxVQUFVLENBQUMsTUFBYyxFQUFFLGFBQXFCO0lBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzVDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQy9DLENBQUM7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQXVCaEIsWUFBWSxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxJQUFZLENBQUM7UUF0QjFELGVBQVUsR0FBUyxTQUFTLENBQUM7UUF1QjVCLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBTyxFQUFFLENBQU87UUFDN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLElBQUk7SUF3QmhCLFlBQVksQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztRQXRCdEQsZUFBVSxHQUFTLFNBQVMsQ0FBQztRQXVCNUIsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lB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QUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNuQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQXdCaEIsWUFBWSxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO1FBdEJ0RCxlQUFVLEdBQVMsU0FBUyxDQUFDO1FBdUI1QixJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJ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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFCLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ1osQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7WUFDckIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBRUQsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFFOUIsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxD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LENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFRO1FBQ2IsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUVwQiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV0QixNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDO1lBQ2QsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDO1FBQzFCLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV0RSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELFVBQVUsQ0FBQyxn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QUFDLENBQUMsQ0FBQztvQkFDMUQsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELEtBQUssZUFBZSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsRSxLQUFLLFVBQVUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUQsS0FBSyxXQUFXLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzNELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5RCxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FB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SyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pFLEtBQUssTUFBTSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN0RCxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDN0QsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzNELEtBQUssU0FBUyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMzRCxL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dEQsS0FBSyxTQUFTLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzdELEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUQsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFELEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1RCxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUQsS0FBSyxlQUFlLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25FLEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxLQUFLLGVBQWUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkUsS0FBSyxlQUFlLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25FLEtBQUssWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoRSxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELEtBQUssTUFBTSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsS0FBSyxZQUFZLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hFLEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxRCxLQUFLLGVBQWUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEUsS0FBSyxLQUFLLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3JELEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUQsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1RCxLQUFLLFlBQVksQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5RCxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELEtBQUssU0FBUyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM3RCxLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUQsS0FBSyxXQUFXLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5RCxLQUFLLEtBQUssQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekQsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hELEtBQUssU0FBUyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM3RCxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsS0FBSyxXQUFXLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlELEtBQUssUUFBUSxDQUFDLENB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