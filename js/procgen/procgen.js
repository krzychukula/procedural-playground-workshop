/**
 * Creates a color based on just the 0-255 RGB values.
 * @param {number} r red component, 0-255
 * @param {number} g green component, 0-255
 * @param {number} b blue component, 0-255
 * @returns {color} a 32-bit color
 */
function rgb(r, g, b) {
    return 0xFF000000 | (b << 16) | (g << 8) | (r & 0xFF);
}

/**
 * The main class used to generate textures for planets.
 *
 * @class ProcGen
 * @constructor
 * @param textureWidth {number} the width of textures used, in pixels (should be a power of two)
 * @param textureHeight {number} the height of textures used, in pixels (should be a power of two)
 */
ProcGen = function(textureWidth, textureHeight) {

    return {
        simplexNoise: simplexNoise,

        makeRGBMap: makeRGBMap,
        makeFloatMap: makeFloatMap,
        makeIntMap: makeIntMap,

        defaultColorMap: defaultColorMap,
        defaultDisplacementMap: defaultDisplacementMap,
        defaultBumpMap: defaultBumpMap,
        defaultLightMap: defaultLightMap
    };

    /**
     * Returns a floating-point buffer with simplex noise. Values for the noise will be in the range [-1.0,1.0].
     *
     * @param seed {number} a random seed (different values produce different noises)
     * @param octaveCount {integer} the number of octaves of noise to sum together - the more octaves the finer detail you will have
     * @param roughness {number} how fast the noise will change. 1.0 is a safe default, higher number result in rougher, denser noise, lower numbers
     *          result in smooth, gentle noise.
     * @returns {buffer} a floating-point buffer
     * @example
     * var noise = procgen.simplexNoise(23424, 6, 1.0);
     */
    function simplexNoise(seed, octaveCount, roughness) {
        var octaveNoise = SimplexNoise.makeOctaveSphericalNoise(seed, octaveCount, roughness);
        var buffer = Buffers.float(textureWidth, textureHeight);

        var noiseX = 0.0, noiseY = 0.0, noiseStepX = Math.PI * 2 / textureWidth, noiseStepY = Math.PI / textureHeight;
        var endLoc = textureWidth * textureHeight;
        var targetArray = buffer.array;
        for (var loc = 0; loc < endLoc;) {
            targetArray[loc++] = octaveNoise(noiseX, noiseY);
            if (loc % textureWidth) {
                noiseX += noiseStepX;
            } else {
                noiseY += noiseStepY;
                noiseX = 0.0;
            }
        }
        return buffer;
    }

    /**
     * Creates a new RGB texture, optionally based on existing textures.
     *
     * @param sources {Array} the array of sources this texture will be based on
     * @param fn {Function} the function that will be called to determine the RGB value of every point. It will be called with the value
     *                      of all the sources at this point, and the X and Y coordinates of the point. It should return the color
     *                      using the rgb() function.
     * @returns {RGBBuffer} a floating-point buffer
     * @example
     * procgen.makeRGB([heightMap, temperatureMap], function(height, temperature, x, y) {
     *   return rgb(...something based on height, temperature, x and y...)
     * }
     */
    function makeRGBMap(sources, fn) {
        if (typeof sources == 'function') {
            fn = sources; sources = [];
        }
        return derivedBuffer(sources, Buffers.rgb(textureWidth, textureHeight), fn);
    }

    /**
     * Creates a new floating-point texture, optionally based on existing textures. This type of texture can store any
     * single floating-point value for each pixel.
     *
     * @param sources {Array} the array of sources this texture will be based on
     * @param fn {Function} the function that will be called to determine the value at every point. It will be called with the value
     *                      of all the sources at this point, and the X and Y coordinates of the point. It should return the
     *                      resulting floating point value.
     * @returns {FloatBuffer} a floating-point buffer
     * @example
     * procgen.makeFloat([heightMap, temperatureMap], function(height, temperature, x, y) {
     *   return height * temperature + x + y;
     * }
     */
    function makeFloatMap(sources, fn) {
        if (typeof sources == 'function') {
            fn = sources; sources = [];
        }
        return derivedBuffer(sources, Buffers.float(textureWidth, textureHeight), fn);
    }

    /**
     * Creates a new integer texture, optionally based on existing textures. This type of texture can store any
     * single integer value for each pixel - useful for "enumeration" type textures.
     *
     * @param sources {Array} the array of sources this texture will be based on
     * @param fn {Function} the function that will be called to determine the value at every point. It will be called with the value
     *                      of all the sources at this point, and the X and Y coordinates of the point. It should return the
     *                      resulting integer value.
     * @returns {IntBuffer} an integer buffer
     * @example
     * procgen.makeFloat([heightMap, temperatureMap], function(height, temperature, x, y) {
     *   return height * temperature + x + y;
     * }
     */
    function makeIntMap(sources, fn) {
        if (typeof sources == 'function') {
            fn = sources; sources = [];
        }
        return derivedBuffer(sources, Buffers.int(textureWidth, textureHeight), fn);
    }

    function derivedBuffer(sources, target, fn) {
        var args = new Array(sources.length + 2), sourceCount = sources.length,
            xIndex = sources.length, yIndex = sources.length + 1;

        var sourceArrays = sources.map(function(source) {
            return source.array;
        });

        var targetArray = target.array;
        var wrapX = textureWidth;
        var endLoc = textureWidth * textureHeight;
        args[xIndex] = 0; args[yIndex] = 0;

        for (var loc = 0; loc != endLoc; loc++) {
            for (var i = 0; i < sourceCount; i++)
                args[i] = sourceArrays[i][loc];
            args[xIndex]++;
            if (args[xIndex] == wrapX) {
                args[xIndex] = 0;
                args[yIndex]++;
            }
            targetArray[loc] = fn.apply(null, args);
        }

        return target;
    }

    // ====================================== defaults for easy work

    function defaultColorMap() {
        return makeRGBMap([], function() {
            return rgb(127, 127, 127);
        });
    }

    function defaultBumpMap() {
        return makeRGBMap([], function() {
            return rgb(128, 128, 128);
        });
    }

    function defaultDisplacementMap() {
        return makeFloatMap([], function() { return 1.0; });
    }

    function defaultLightMap() {
        return makeRGBMap([], function() { return rgb(32,224,0) });
    }
};
