#/bin/bash

./minify.sh
./buildOpenLayers.sh
cat ./OpenLayers-argenmap-closure.js > ../argenmap.jquery.min.js
#remover esto para sacar Parse, parte de las pruebas en beta
#cat parse-1.2.9.min.js >> ../argenmap.jquery.min.js
cat argenmap.jquery.min.sinopenlayers.js >> ../argenmap.jquery.min.js
rm argenmap.jquery.min.sinopenlayers.js

