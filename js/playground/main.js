var Earthlike = function() {

    // We will be using 2048x1024 textures.
    var textureWidth = 2048, textureHeight = 1024;

    var waterLevel = 0.2;
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
          var rawHeightMap = procgen.simplexNoise(200, 5, 1);
        }

        var heightMap = procgen.makeFloatMap([rawHeightMap], function(height){
          if(height < waterLevel){
            return lerp(height, -1, waterLevel, -1.0, 0);
          }else{
            return lerp(height, waterLevel, 1.0, 0, 1.0);
          }
        })

        var colorMap = procgen.makeRGBMap([heightMap], function(height){
          if(height < 0){
            return colorLerp(height, -1.0, 0, rgb(20,20,120), rgb(0, 0, 200));
          }else{
            return colorLerp(height, 0, 1.0, rgb(50,150,50), rgb(55, 255, 55));
          }

        });

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


        var variationMap = procgen.simplexNoise(20, 1, 1);
        var half = textureHeight / 2;
        var temperatureMap = procgen.makeFloatMap([heightMap, variationMap], function(height, variation, x, y){
          if(height < 0) return -10;
          var nearHalf = half - Math.abs(y);
          var halfTemp = lerp(nearHalf, half, 0, -30, 50);
          var heightTemp = lerp(-height, -1, 0, -60, 0);

          return halfTemp + heightTemp + 15 * variation ;
        });

        // we temporarily switch to showing the temperature instead of actual color
        var colorMap = procgen.makeRGBMap([temperatureMap], function (temp) {
            var blueness = clamp(lerp(temp, 10.0, -30.0, 0, 255), 0, 255); // blue when cold
            var redness = clamp(lerp(temp, 10.0, 50.0, 0, 255), 0, 255); // red when hot
            return rgb(redness, 64, blueness);
        });


        return {
            // we use boring defaults for everything, but we'll write something better soon!
            colorMap: colorMap,//procgen.defaultColorMap(),
            displacementMap: displacementMap,
            bumpMap: bumpMap,
            lightMap: procgen.defaultLightMap()
        };
    }

    // =============================================================================================
    // =============================================================================================

    // Return the generation function.
    return generateEarthlikePlanet;
}();
