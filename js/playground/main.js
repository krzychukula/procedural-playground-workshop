var Earthlike = function() {

    // We will be using 2048x1024 textures.
    var textureWidth = 2048, textureHeight = 1024;

    var waterLevel = 0.12;
    var displacementSize = 0.2;

    // ProcGen is a helper object we will be using to generate those textures.
    var procgen = ProcGen(textureWidth, textureHeight);

    // =============================================================================================
    // =============================================================================================


    /**
     * This function here is the meat of the whole procedural generation, and the
     * place where we'll implement all our logic.
     */
    function generateEarthlikePlanet(randomize) {
        if(randomize){
          // the textures we are going to generate will all be returned from here
          var rawHeightMap = procgen.simplexNoise(Math.random()*400, Math.random()*20, 1);
        }else{
          // the textures we are going to generate will all be returned from here
          var rawHeightMap = procgen.simplexNoise(200, 6, 1);
        }

        var heightMap = procgen.makeFloatMap([rawHeightMap], function(height){
          if(height < waterLevel){
            return lerp(height, -1, waterLevel, -1.0, 0);
          }else{
            return lerp(height, waterLevel, 1.0, 0, 1.0);
          }
        })

        // var colorMap = procgen.makeRGBMap([heightMap], function(height){
        //   if(height < 0){
        //     return colorLerp(height, -1.0, 0, rgb(20,20,120), rgb(0, 0, 200));
        //   }else{
        //     return colorLerp(height, 0, 1.0, rgb(50,150,50), rgb(55, 255, 55));
        //   }
        //
        // });

        var displacementMap = procgen.makeFloatMap([heightMap], function(height){
          if(height < 0 ){
            return 1.0 - height* 0.01;
          }
          return 1.0 + displacementSize * height;
        })

        var bumpMappingHardness = 0.1 * displacementSize;
        var bumpMap = procgen.makeRGBMap(function(x,y){
          // calculate coordinates of our neighbours, wrapping correctly
          var left = (x + textureWidth - 1) % textureWidth, right = (x + 1) % textureWidth;
          var up = (y + textureHeight - 1) % textureHeight, down = (y + 1) % textureHeight;

          // get the height at our left, right, upper, lower neighbour
          var hL = displacementMap.get(left,y), hR = displacementMap.get(right, y),
              hU = displacementMap.get(x,up), hD = displacementMap.get(x, down);

          // calculate how much slope we have, and in which direction
          // this is clamped to (-1,1) so we never go past vertical :)
          var xTilt = clamp( (hR - hL) / bumpMappingHardness, -1.0, 1.0),
              yTilt = clamp( (hU - hD) / bumpMappingHardness, -1.0, 1.0);

          // translate this into R and G component for the bump map
          // x tilt is stored in red, y tilt is stored in green
          var r = lerp(xTilt, -1.0, 1.0, 0, 255), g = lerp(yTilt, -1.0, 1.0, 0, 255);
          return rgb(r, g, 0);
        })


        var variationMap = procgen.simplexNoise(20, 3, 1);
        var half = textureHeight / 2;
        var temperatureMap = procgen.makeFloatMap([heightMap, variationMap], function(height, variation, x, y){
          if(height < 0) return -10;
          var nearHalf = half - Math.abs(y);
          var equatorTemp = lerp(nearHalf, half, 0, -20, 50);
          var heightTemp = lerp(-height, -1, 0, -100, 0);
          var variationTemp = 40 * variation;
          return equatorTemp + heightTemp + variationTemp ;
        });



        var GRASS = 0;
        var SAND = 1;
        var ROCK = 2;
        var SNOW = 3;
        var WATER = 4;

        var terrainMap = procgen.makeIntMap([heightMap, temperatureMap, bumpMap], function(height, temp, bumpColor){
          // below sea level?
          if (height < 0.0) return WATER;

          var tilt = getXTilt(bumpColor) + getYTilt(bumpColor);

          var snowChance = clamp(lerp(temp, 1, -10.0, 0, 1), 0, 1);
          var isRock = clamp(lerp(height, 0.27, 0.35, 0, 1), 0, 1);

          var isSteep = clamp(lerp(tilt, 280, 290, 0, 1), 0, 1);
          var rockChance = clamp(isRock + isSteep - snowChance, 0, 1);

          var sandChance = clamp(lerp(temp, 32, 40, 0, 1), 0, 1);
          var grassChance = 1.0 - snowChance - rockChance - sandChance;

          // pick one of them
          return fuzzyPick([grassChance, sandChance, rockChance, snowChance])
        });

        function getXTilt(color) {
            return color & 0x000000FF;
        }
        function getYTilt(color) {
            return (color & 0x0000FF00) >> 8;
        }


        // color constants
        var WaterShallow = rgb(24, 24, 126), WaterDeep = rgb(0, 0, 60),
            GrassColor = rgb(20, 80, 20),
            LushColor = rgb(120, 150, 120),
            SandColor = rgb(220, 180, 100),
            SnowColor = rgb(220, 220, 255), RockColor = rgb(170, 150, 130);

        // generate based on terrain type
        var colorMap = procgen.makeRGBMap([terrainMap, heightMap], function(terrain, height, x, y) {
            switch(terrain) {
                case WATER: return colorLerp(height, -1.0, 0.0, WaterDeep, WaterShallow);

                case GRASS: return grass(x,y);
                case SAND: return SandColor;
                case SNOW: return SnowColor;
                case ROCK: return RockColor;
            }
        });

        function grass(x,y){
          var temp = temperatureMap.get(x,y);
          var variation = variationMap.get(x,y);
          return colorLerp(temp + 50 * variation, -5, 60, LushColor, GrassColor)
        }


        // generate based on terrain type
        var lightMap = procgen.makeRGBMap([terrainMap], function(terrain) {
          var ambient = 150;
            switch(terrain) {
              //ambient/diffuse/specular
                case WATER: return rgb(200, 200, 70);

                case GRASS: return rgb(ambient, 50, 18);
                case SAND: return rgb(ambient, 50, 20);
                case SNOW: return rgb(ambient, 100, 60);
                case ROCK: return rgb(ambient, 80, 30);
            }
        });


        return {
            // we use boring defaults for everything, but we'll write something better soon!
            colorMap: colorMap,//procgen.defaultColorMap(),
            displacementMap: displacementMap,
            bumpMap: bumpMap,
            lightMap: lightMap
        };
    }

    // =============================================================================================
    // =============================================================================================

    // Return the generation function.
    return generateEarthlikePlanet;
}();
