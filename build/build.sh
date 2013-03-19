#/bin/bash

./minify.sh
./buildOpenLayers.sh
cat ./OpenLayers-argenmap-closure.js > ../argenmap.jquery.min.js
cat argenmap.jquery.min.sinopenlayers.js >> ../argenmap.jquery.min.js
rm argenmap.jquery.min.sinopenlayers.js

