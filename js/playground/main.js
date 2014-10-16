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
          var rawHeightMap = procgen.simplexNoise(200, 4, 1);
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




        return {
            // we use boring defaults for everything, but we'll write something better soon!
            colorMap: colorMap,//procgen.defaultColorMap(),
            displacementMap: displacementMap,
            bumpMap: procgen.defaultBumpMap(),
            lightMap: procgen.defaultLightMap()
        };
    }

    // =============================================================================================
    // =============================================================================================

    // Return the generation function.
    return generateEarthlikePlanet;
}();
