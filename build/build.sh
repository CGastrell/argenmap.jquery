#/bin/bash

#ruta por defecto al directorio de OpenLayers
WITH='../lib/OpenLayers-2.12'

#ruta actual (para volver despues)
BASE=$PWD

#si se pasa un parametro se toma como ruta al directorio de OpenLayers
if [ ! -z "$1" ] ; then
	WITH=${1%/}
fi

#remover trailing slash y asignar a variable OLPATH
OLPATH=$(echo $WITH | tr -d '\r')

./minify.sh
./buildOpenLayers.sh $OLPATH
cat ./OpenLayers-argenmap-closure.js > ../argenmap.jquery.min.js
cat argenmap.jquery.min.sinopenlayers.js >> ../argenmap.jquery.min.js
rm argenmap.jquery.min.sinopenlayers.js

