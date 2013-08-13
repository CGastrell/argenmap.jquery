[argenmap.jquery](http://www.ign.gob.ar/argenmap/argenmap.jquery/docs) - Mapas web del IGN y jQuery
===================================================

Introducción
------------

argenmap.jquery es un plugin para jQuery que te permite usar un mapa del
Instituto Geográfico Nacional de la República Argentina a través de OpenLayers en tu sitio.

OpenLayers, a diferencia de Google Maps como librería de mapas, 
suele ser complejo de entender y necesita mucha programación.
Con este plugin puedes tener un mapa con los datos actualizados del IGN
con conocimiento mínimo de aplicaciones de mapas. Basta con saber como se usa un plugin de jQuery.


¿Por qué usar argenmap.jquery ?
-----------------

- Mapas de la Argentina con los nombres oficiales en lugar de los nombres que usa Google Maps : 
 - El mapa de ArgenMap presenta las capas base del IGN, incluyendo una satelital con imágenes de Google, pero siempre con nombres oficialmente reconocidos por Argentina.

- Completa compatibilidad con jQuery : 
 - Miles de sitios utilizan jQuery para mejorar la experiencia del usuario. argenmap.jquery corre sobre jQuery y agrega funcionalidad compatible con el sitio construido con jQuery.
 - El mismo mapa puede ser accedido por todos los selectores posibles.
 - Las llamadas a jQuery pueden ser apiladas (chainable).

- Uso transparente de los servicios públicos del IGN.
- Es simple y elegante.
 
- Muchos ejemplos
 - Para empezar podés acceder a la [guía] (http://www.ign.gob.ar/argenmap). Al ser de código abierto esperamos contar con colaboración de distintas áreas que aprovechen las ventajas que presenta usar ArgenMap
 - Seguiremos agregando guías, documentación y ejemplos a medida que la librería crece en funcionalidad.

 
 Guía de inicio
 --------------
 
Requerimientos

La librería incluye una versión de OpenLayers optimizada.
 - Descargar [jQuery 1.7+] ( http://jquery.com ) o vincular desde [CDN] (http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js)
