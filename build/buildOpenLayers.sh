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
OLPATH=$(echo $WITH | tr -d '\r')/build

echo "Compilando desde $OLPATH"

cd ${OLPATH}
./build.py  -c closure ${BASE}/argenmap.cfg ${BASE}/OpenLayers-argenmap-closure.js
cd ${BASE}
