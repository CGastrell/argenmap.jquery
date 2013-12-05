/**
 * @license
 *  Argenmap 2 Plugin para JQuery 
 *  Version   : v2.4.6
 *  Date      : 2013-02-16
 *  Licence   : GPL v3 : http://www.gnu.org/licenses/gpl.html  
 *  Author    : Christian Gastrell
 *  Contact   : cgastrell@gmail.com
 *  Web site  : http://ign.gob.ar/argenmap2
 *
 */
;(function ( $, window, document, undefined ) {
	IGN_CACHES = [
			'http://cg.aws.af.cm/tms',
			'http://190.220.8.216/tms',
			'http://mapaabierto.aws.af.cm/tms',
			'http://igntiles1.ap01.aws.af.cm/tms'
	];  
	//-----------------------------------------------------------------------//
	// jQuery event
	//-----------------------------------------------------------------------//
	//resized event: se escucha desde un DOMElement y se dispara
	//cada vez que ese elemento cambia de tamanio (ancho o alto)
	$.event.special.resized = {
		setup: function (){
				var self = this, $this = $(this);
				var $w = $this.width();
				var $h = $this.height();
				interval = setInterval(function(){
						if($w != $this.width() || $h != $this.height()) {
							$w = $this.width();
							$h = $this.height();
							$.event.dispatch.call(self, {type:'resized'});
							// $.event.handle.call(self, {type:'resized'});
						}
				},20);
		},
		teardown: function (){
				clearInterval(interval);
		}
	};
	/* COMPATIBILIDAD CON IE < 9; implementacion de indexOf para arrays */
	if (!Array.prototype.indexOf)
	{
	  Array.prototype.indexOf = function(elt /*, from*/)
	  {
		var len = this.length >>> 0;

		var from = Number(arguments[1]) || 0;
		from = (from < 0)
			 ? Math.ceil(from)
			 : parseInt(from);
		if (from < 0)
		  from += len;

		for (; from < len; from++)
		{
		  if (from in this &&
			  this[from] === elt)
			return from;
		}
		return -1;
	  };
	}

	//prueba parse, inicializacion
	//if(Parse)
	//	Parse.initialize("32SZ1NyJxqGXw9Efxjb7GBNp87F8WSO5YBG5ZWuX", "xfbfqqeCaRcrgsxGfm5MNlOFmAnsTbQs8QIAosAR");
	//prueba parse end

	/**
	 * Espacio de nombres para funciones/propiedades/clases de ayuda
	 */
	argenmap = {};

	/**
	 * Mapa de propiedades traducidas
	 */
	argenmap.mapaDePropiedades = {
		proyeccion: 'projection',
		centro: 'center',
		capas: 'layers',
		formato: 'format',
		transparente: 'transparent',
		esCapaBase: 'isBaseLayer',
		capaBase: 'baseLayer',
		opacidad: 'opacity',
		servicio: 'service',
		icono: 'icon',
		escucharEventos: 'eventListeners',
		listarCapa: 'displayInLayerSwitcher'
	}
	//hard coded, modificar para la version final
	// var argenmap.rutaRelativa = "http://vm/argenmap2/";
	argenmap.rutaRelativa = "http://www.ign.gob.ar/argenmap2/argenmap.jquery/";
	/**
	 * Variable para almacenar cuando google este haciendo async load
	 */
	argenmap.googleEstaCargando = false;
	/* CLASE CACHE DE CLIENTE */
	argenmap.CacheDeCliente = function()
	{
		this.MAX_TILES = 150;
		this.cache = [];
		this.cacheRef = {};
	}
	argenmap.CacheDeCliente.prototype = {
		/**
		 * Recupera un tile de la cache.
		 * Si no existe, devuelve false
		 */
		recuperar: function(paramString)
		{
			var tilecode = paramString;

			if(this.cache.indexOf(tilecode) != -1) 
			{
				return this.cacheRef[tilecode];
			}
			return false;
		},
		/**
		 * Guarda una entrada en la cache interna
		 * Si detecta baseURL como un string, anula el proceso,
		 * no hace falta cachear si es un solo servidor de tiles
		 */
		guardar: function(paramString, url)
		{
			this.cache.push(paramString);
			this.cacheRef[paramString] = url;
			var sale;
			if(this.cache.length > this.MAX_TILES)
			{
				 sale = this.cache.shift();
				 try{
					delete this.cacheRef[sale];
				 }catch(e){
					this.cacheRef[sale] = undefined;
				 }
			}
		}
	}
	/**
	 * Indica si el script de google maps esta cargado
	 */
	argenmap.googleEstaCargado = function()
	{
		return (typeof(google) != 'object' || (typeof(google) == "object" && typeof(google.maps) != 'object')) === false;
	};
	/**
	 * Traduce las keys de un objeto a traves del mapa de propiedades
	 * para ser utilizado por las clases de OpenLayers
	 * La idea es que el plugin acepta parámetros y métodos en castellano y los
	 * pase en inglés a OL.
	 * @param {Object} objeto el objeto al cual se le quieren traducir las keys.
	 * @param {boolean} alReves. Si es true traducen las keys de inglés a español.
	 * @return {Object} el objeto con las keys traducidas a español.
	 */
	argenmap.traducirObjeto = function(objeto,alReves)
	{
		var resultado = {};
		var mapa = $.extend({},argenmap.mapaDePropiedades);
		if(alReves != undefined && alReves == true)
		{
			for(var i in mapa)
			{
				mapa[mapa[i]] = i;
				try{
					delete mapa[i];
				}catch(e){
					mapa[i] = undefined;
				}
			}
		}
		for(var k in objeto)
		{
			if(typeof(mapa[k]) != "undefined")
			{
				resultado[mapa[k]] = objeto[k];
			}else{
				resultado[k] = objeto[k];
			}
		}
		return resultado;
	}
	/**
	 * Devuelve un objeto OpenLayers.LonLat a partir de un par de coordenadas. Devuelve las coordenadas como planas o geográficas según el parámetro proyeccion.
	 * @param {mixed} coords Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}.  (Llama a argenmap.leerLonLat() con @mezcla como argumento).
	 * @param {string} proyeccion Código EPSG que defina el sistema de coordenadas en el que se quiere el resultado. 'epsg:4326' o 'epsg:3857' solamente.
	 * @see argenmap.leerPlanas
	 * @see argenmap.leerLonLat
	 */
	argenmap.leerCoordenadas = function(coords,proyeccion)
	{
		if(!coords) return;
		if(!proyeccion) proyeccion = "EPSG:3857";
		switch(proyeccion)
		{
			case "EPSG:3857":
				return argenmap.leerPlanas(coords);
			break;
			case "EPSG:4326":
				return argenmap.leerLonLat(coords);
			break;
		}
	}
	/**
	 * Devuelve un OpenLayers.LonLat a partir de una array con propiedad {lon,lat}
	 * @param {Mixed} mezcla. Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}
	 * @return {OpenLayers.LonLat} el objeto OpenLayers.LonLat
	 */
	argenmap.leerLonLat = function(mezcla)
	{
		var empty = null;
		var r = empty;
		if (undefined == mezcla || (typeof(mezcla) === 'string')) return null;
		//si tiene un prop lonlat o latLng recursea con ese property
		if(mezcla.hasOwnProperty("lonlat")) {
			r = argenmap.leerLonLat(mezcla.lonlat);
		}else if(mezcla.hasOwnProperty("latLng")) {
			r = argenmap.leerLonLat(mezcla.latLng);
		}else if(mezcla.hasOwnProperty("latlon")) {
			r = argenmap.leerLonLat(mezcla.latlon);
		}
		
		// MAGIC: se supone que es para aceptar google.maps.latLng también
		// google.maps.LatLng object, esto no deberia pasar mas, salvo que
		//estes en una configuracion cruzada con gmaps
		if (mezcla.hasOwnProperty("lat") && typeof(mezcla.lat) === 'function') {
			r = new OpenLayers.LonLat(mezcla.lng(),mezcla.lat());
		}
		//catch para cuando viene con lng/long en vez de lon
		if(mezcla.hasOwnProperty("lng")) mezcla.lon = mezcla.lng;
		if(mezcla.hasOwnProperty("long")) mezcla.lon = mezcla["long"];

		// {lat:X, lon:Y} object, el argument es un OL.LonLat o similar!!! 
		else if ( $.isNumeric(mezcla.lat) && $.isNumeric(mezcla.lon) ) {
			r = new OpenLayers.LonLat(mezcla.lon,mezcla.lat);
		}
		// [n, n] array: este caso es cuando es un array, de ser asi asumo que es [lat,lon] (lat PRIMERO!)
		else if ($.isArray(mezcla)){ 
			if ( !$.isNumeric(mezcla[0]) || !$.isNumeric(mezcla[1]) ) {
				r = empty;
			}else{
				r = new OpenLayers.LonLat(mezcla[1], mezcla[0]);
			}
		}
		if(r == null) return r;//si hasta aca no esta resuelto, ya fue
		//adivinacion de epsg, fallaria solo si es una plana a menos de 180m del 0,0
		// MAGIC
		if( r.lat != undefined && r.lon !=undefined  && (r.lat > 180 || r.lat < -180) || (r.lon > 180 || r.lon < -180) ) r.transform("EPSG:3857","EPSG:4326");
		return r;
	}
	/**
	 * Devuelve un OpenLayers.LonLat en el SRS epsg:3857 a partir de un par de coordendas en el SRS epsg:4326.
	 * @param {Mixed} mezcla Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}.  (Llama a argenmap.leerLonLat() con @mezcla como argumento).
	 * @return {OpenLayers.LonLat} el objeto OpenLayers.LonLat con las coordenadas en epsg:3857.
	 */
	argenmap.leerPlanas = function(mezcla)
	{
		var ll = argenmap.leerLonLat(mezcla);
		if(!ll || !$.isNumeric(ll.lon) || !$.isNumeric(ll.lat)) return null;
		// MAGIC
		//lo lamento por la gente que quiera usar una coordenada 3857 a menos de 180 metros del 0,0
		if( (ll.lat > 180 || ll.lat < -180) || (ll.lon > 180 || ll.lon < -180) ) return ll;//se asume 3857
		if( typeof(ll.transform) === "function" )
		{
			return ll.transform("EPSG:4326", "EPSG:3857");
		}else{
			return ll;
		}
	};
	argenmap.CapaTMS = function (opts) {
		/**
		 * Mantiene cache de tiles requeridas para no volver a pedir a distintos
		 * servidores del array
		 */
		this.cache = new argenmap.CacheDeCliente();
		// El objeto ImageMapType q representa a esta capa en para la api de gmaps.
		this.imageMapType = null;
		// Referencia al objeto map de google. Se setea con argenmap.agregarCapaWMS
		this.gmap = null;

		this.tipo = 'tms-1.0.0';

		this.name = 'CAPA TMS';
		this.alt = 'CAPA TMS';
		$.extend(this, opts);
		//Creating the TMS layer options.  This code creates the Google imagemaptype options for each wms layer.  In the options the function that calls the individual 
		//wms layer is set 
		this.URL_HASH_FACTOR = (Math.sqrt(5) - 1) / 2;
		var tmsOptions = {
		  alt: this.alt,
		  getTileUrl: $.proxy(this.getTileUrl,this),
		  isPng: false,
		  maxZoom: 17,
		  minZoom: 6,
		  name: this.name,
		  tileSize: new google.maps.Size(256, 256)
		};

		//Creating the object to create the ImageMapType that will call the TMS Layer Options.

		this.imageMapType = new google.maps.ImageMapType(tmsOptions);

	};

	argenmap.CapaTMS.prototype.getTileUrl = function (tile, zoom) {
		var baseURL = this.baseURL;
		var layers = this.layers;
		/*
		 * Dark magic. Convierto la y de google a una y de TMS
		 * http://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
		 */
		var ytms = (1 << zoom) - tile.y - 1;
		var paramString = "/" + layers + "/" + zoom + "/" + tile.x + '/' + ytms + ".png";
		if (typeof baseURL !== 'string') {
		  baseURL = this.selectUrl(paramString, baseURL);
		}
		var url = baseURL + paramString;
		// this.cache.guardar(tile.x,tile.y,zoom,url);
		return url;
	};
	argenmap.CapaTMS.prototype.selectUrl = function(paramString, urls) 
	{
		var cached = this.cache.recuperar(paramString);
		if(cached) {
			return cached;
		}

		var product = 1;
		for (var i = 0, len = paramString.length; i < len; i++) { 
			product *= paramString.charCodeAt(i) * this.URL_HASH_FACTOR; 
			product -= parseInt(product); 
		}
		this.cache.guardar(paramString, urls[parseInt(product * urls.length)]);
		return urls[parseInt(product * urls.length)];
	};

	//sets de OL
	OpenLayers.Popup.FramedCloud.prototype.autoSize = false;
	/*
	AutoSizeFramedCloudMinSize = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
			'autoSize': true, 
			'minSize': new OpenLayers.Size(100,100)
	});
	AutoSizeFramedCloud = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
		'autoSize': true
	});
	*/
	
	OpenLayers.Layer.ArgenmapTMS = OpenLayers.Class(OpenLayers.Layer.TMS, {
		'cache': new argenmap.CacheDeCliente()
	});

	
	OpenLayers.Layer.HTTPRequest.prototype.selectUrl = function(paramString, urls) 
	{
		var cached = this.cache.recuperar(paramString);
		if(cached) {
			return cached;
		}

		var product = 1;
		for (var i=0, len=paramString.length; i<len; i++) { 
			product *= paramString.charCodeAt(i) * this.URL_HASH_FACTOR; 
			product -= parseInt(product); 
		}
		this.cache.guardar(paramString, urls[parseInt(product * urls.length)]);
		return urls[parseInt(product * urls.length)];
	}

	OpenLayers.ImgPath = argenmap.rutaRelativa + "img/";

	/**
	 * Evento custom de jQuery
	 */
	//$.event.trigger('googleCargado');
	$(window).on('googleCargado',function(e){argenmap.googleEstaCargando = false;});

	/* CLASE ARGENMAP */
	function ArgenMap($this,opciones)
	{

		this.colorFondoPie = 'rgb(28,116,165)';
		this.colorLetraPie = 'white';
		if(opciones !== undefined && opciones.hasOwnProperty("colorFondoPie"))
		{
			this.colorFondoPie = opciones.colorFondoPie;
		}
		if(opciones !== undefined && opciones.hasOwnProperty("colorLetraPie"))
		{
			this.colorLetraPie = opciones.colorLetraPie;
		}
		this.miniCache = new argenmap.CacheDeCliente();
		this.$el = $this;//referencia al objeto jQuery desde el que se inicializó el plugin
		this.divMapa = null//elemento DOM donde estará el mapa. NO JQUERY
		this.mapa = null//referencia al objeto mapa de openlayers
		if(undefined == opciones) opciones = {};
		/**
		 * Array de capas que estan en el mapa. Equivale a OpenLayers.Map.layers
		 * Se utiliza al momento de instanciar el mapa y para buscar por nombre
		 */
		this.capas = [];
		/**
		 * Array con los features agregados al mapa, para conveniencia
		 */
		this.marcadores = [];
		/**
		 * Array con nombres restringidos
		 */
		this.privados = [];
		//opciones por defecto
		this.predefinidos = {
			proyeccion: "EPSG:3857",
			centro:[-35,-57],
			capas:[],
			zoom:4,
			numZoomLevels:20,
			tipo: '',
			// agregarBaseSatelite: false,
			// agregarBaseIGN: true,
			listarCapaDeMarcadores: false,
			rutaAlScript: argenmap.rutaRelativa,
			mapaFijo: false,
			mostrarBarraDeZoom: false
		};
		
		this.depuracion = opciones.depuracion || false;
		
		//merge predefinidos con opciones de usuario
		this.opciones = $.extend({}, this.predefinidos, opciones);
		//si se setea un nuevo path, hay que re-setear img path
		OpenLayers.ImgPath = argenmap.rutaRelativa + "img/";
		OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
		
		//esto es para que en la version 1.0 de argenmap.jquery
		//sea menos flexible el mapa predeterminado
		switch(this.opciones.tipo.toLowerCase())
		{
			case 'vacio':
			case 'blanco':
			break;
			case 'satelite':
			case 'satelital':
			case 'hibridoign':
				this.opciones.capas.push('satelital');
				this.opciones.capas.push('baseIGN');
			break;
			case 'baseign':
			default:
				this.opciones.capas.push('baseIGN');
				this.opciones.capas.push('satelital_base');
		}
		//prueba de parse, instancia de mapa
		/*
		var instance = {
			referer: window.location.href,
			metodo: 'inicializar',
			opciones: JSON.stringify(this.opciones)
		};
		Parse.Analytics.track('instancia',instance);
		*/
	}
	//logica de metodos separada, por obsesividad
	ArgenMap.prototype = {
		inicializar: function()
		{
			this._prepararDiv();
			//al inicializar no necesito agregar las capas, las paso como array en las opciones
			//este es el unico momento en el que this.mapa.layers = this.capas,
			//luego seran siempre copiadas al reves (this.capas = this.mapa.layers)
			this._crearCapasPredefinidas(this.opciones.capas);
			var o = {
				centro: argenmap.leerCoordenadas(this.opciones.centro,this.opciones.proyeccion),
				capas: this.capas,
				theme: argenmap.rutaRelativa + "theme/default/style.css"
			};
			
			//tuve que hacer esto porque OL no arranca sin capa base, y tampoco puedo
			//forzar a tener una capa base. Que diria Lugosi si no se puede tener un mapa sin base?
			if(!this._corroborarCapaBase(o.capas))
				o.capas.push(new OpenLayers.Layer.Vector("capa vacía",{nombre:'capa vacía',isBaseLayer:true}));
				
			var opcionesDeMapa = argenmap.traducirObjeto($.extend({},this.opciones,o));
			opcionesDeMapa.controls = [];
			// opcionesDeMapa.displayProjection = new OpenLayers.Projection("EPSG:4326");
			this.mapa = new OpenLayers.Map(this.divMapa, opcionesDeMapa);
			this.actualizar();
			//opcion de mapa fijo, sin controles
			if(!this.opciones.mapaFijo) {
				this.mapa.addControls([
					new OpenLayers.Control.PanZoomBarIGN({zoomBar:this.opciones.mostrarBarraDeZoom}),
					new OpenLayers.Control.LayerSwitcherIGN({roundedCornerColor:'rgba(28, 116, 165, 0.75)'}),
					new OpenLayers.Control.Navigation({
						//Esto no causa efecto
						//creo que porque el Map
						//ya tiene un control Navigation
						dragPanOptions: {
							enableKinetic: true,
							kineticInterval: 400
						},
						//permito que el mapa se mueve 
						//aunque el mouse haya dejado 
						//el canvas del mapa
						documentDrag:true,
						mouseWheelOptions: {
							interval: 100,
							cumulative:false,
							maxDelta:6
						}
					}),
					new OpenLayers.Control.PinchZoom({
						handlerOptions: {
							//Esto evita que se propaguen
							//los eventos. creo que
							//esto en false es lo que hacía
							//que en mobile el pinch se
							//destronctrolara
							stopDown:true
						}
					})
				]);
				/*
				 * Aumento la desaceleración del kinetic.
				 * El valor predeterminado es muy bajo
				 */
				var nav = this.mapa.getControlsByClass("OpenLayers.Control.Navigation")[0];
				nav.dragPan.kinetic.deceleration = 0.007;
			};

			// eventos
			this.mapa.events.on({
				addlayer:function(e){
					//kludge para elevar las capas de marcadores
					var m = this.mapa;
					$.each(m.layers,function(i,o)
					{
						if(o.CLASS_NAME != undefined && o.CLASS_NAME == "OpenLayers.Layer.Markers")
						{
							m.setLayerIndex(o,m.layers.length - 1);
						}
					});
					this.capas = this.mapa.layers;
				},
				removelayer:function(e){this.capas = this.mapa.layers;},
				changelayer:function(e){this.capas = this.mapa.layers;},
				scope:this
			});
			
			//little kludge para cambar titulos del layerSwitcher
			// this.$el.find('div.baseLbl').text("Capas base");
			// this.$el.find('div.dataLbl').text("Superpuestas");
		},
		actualizar: function()
		{
			var f = this.$el.children('div.argenmapMapFooter');
			var c = this.$el.children('div.argenmapMapCanvas');
			c.css('height',(this.$el.innerHeight() - f.outerHeight() ) + 'px');
			if(this.mapa) {
				this.mapa.updateSize();
				this.mapa.events.triggerEvent('updatesize');
			}
		},
		agregarCapa: function(opciones,extras)
		{
			if(!this.mapa) return;//catch por las dudas
			
			/*si es string intentamos una capa predefinida, ojo corte prematuro*/
			if(typeof(opciones) == "string")
			{
				var c = this._crearCapaPredefinida(opciones.toLowerCase(),extras);
				if(c) this.mapa.addLayer(c);
				if(c && c.isBaseLayer)
				{
					if(!c.hasOwnProperty("noCambiarAutomaticamente")) this.mapa.setBaseLayer(c);
					if(c.hasOwnProperty("mapObject")) c.mapObject.setTilt(0);
				}
				return;
			}
			/*direccionamos a la funcion segun el tipo*/
			if(typeof(opciones) != "object" || !opciones.tipo) return;
			var t = opciones.tipo.toLowerCase();
			switch(t)
			{
				case "wms":
					this.agregarCapaWMS(opciones);
				break;
				case "kml":
					this.agregarCapaKML(opciones);
				break;
			}
		},
		agregarCapaWMS: function(opciones)
		{
			var predeterminadasWms = {
				nombre: 'Capa WMS',
				singleTile: false,
				transparente: true,
				formato: "image/png",
				version: "1.1.1",
				servicio: "wms",
				srs: this.opciones.proyeccion,
				noMagic: true,
				esCapaBase: false,
				mostrarAlCargar: true,
				proyeccion: this.opciones.proyeccion
			};
			var o = argenmap.traducirObjeto($.extend({},predeterminadasWms,opciones));
			if(this._esCapaPrivada(o.nombre)) return;
			this.quitarCapa(o.nombre);
			var l = new OpenLayers.Layer.WMS(o.nombre,o.url,o,o);
			if(this.mapa) this.mapa.addLayer(l);
			if(l.options.isBaseLayer && o.mostrarAlCargar) this.mapa.setBaseLayer(l);
		},
		agregarCapaKML: function(opciones)
		{
			if(typeof(opciones) != "object" && typeof(opciones.url) != "string") return;
			
			var predeterminadasKml = {
				esCapaBase: false,
				nombre: "Capa KML",
				proyeccion: this.opciones.proyeccion,
				url: ""
			};
			var extras = {
				strategies: [new OpenLayers.Strategy.Fixed()],
				protocol: new OpenLayers.Protocol.HTTP({
						url: opciones.url,
						format: new OpenLayers.Format.KML({
								extractStyles: true,
								extractAttributes: true
						})
				})
				
			};
			var o = argenmap.traducirObjeto($.extend({},predeterminadasKml,opciones,extras));
			this.quitarCapa(o.nombre);
			var l = new OpenLayers.Layer.Vector(o.nombre,o);
			//al crearse el layer no tiene aun los features, delay al event loadend
			l.events.register('loadend',l,function(e){
				//por defecto kml usa geograficas, asumiendo eso, transformo cada
				//geometry de epsg
					$.each(l.features,function(index,item){
						item.geometry.transform("EPSG:4326",l.projection);
					});
					//little kludge?
					l.map.pan(-1,-1);
			});
			
			//BUG: la capa no se muestra hasta que el mapa se panea
			// ya probe layer.redraw() map.updateSize() map.zoomToExtent(map.getExtent())
			// inline y al event.added y event.loadend
			// PROBAR!!! map.moveByPx(-1,-1);
			
			//http://openlayers.org/dev/examples/sundials-spherical-mercator.html
			//TODO: tambien habria que ver la opcion de encuadrar a la capa cuando se cargue, como opcion
			//TODO: revisar el framedCloud, agregar a la capa el control
			//y hookear con onRemove para sacarlo, revisar NOMBRE del popup
			var selector = new OpenLayers.Control.SelectFeature(l);
			this.mapa.addControl(selector);
			selector.activate();
			var alCerrarCuadro = function(e)
			{
				selector.unselectAll();
			};
			var alSeleccionar = function(e)
			{
				var f = e.feature;
				var cuadro = new OpenLayers.Popup.FramedCloud("cuadro",
					f.geometry.getBounds().getCenterLonLat(),
					new OpenLayers.Size(100,100),
					"<h2>"+f.attributes.name + "</h2>" + f.attributes.description,
					null, true, alCerrarCuadro
				);
				cuadro.autoSize=true;
				f.cuadro = cuadro;
				this.map.addPopup(cuadro);
			};
			var alDeSeleccionar = function(e)
			{
				var f2 = e.feature;
				if(f2.cuadro)
				{
					this.map.removePopup(f2.cuadro);
					f2.cuadro.destroy();
					try{
						delete f2.cuadro;
					}catch(e){
						f2.cuadro = undefined;
					}
				}
			};
			l.events.on({
				featureselected: alSeleccionar,
				featureunselected: alDeSeleccionar
			});
			if(this.mapa) this.mapa.addLayer(l);
		},
		agregarCapaBaseWMS: function(opciones)
		{
			var predeterminadasWms = {
				nombre: 'Capa Base WMS',
				singleTile: false,
				transparente: false,
				formato: "image/jpeg",
				version: "1.1.1",
				servicio: "wms",
				srs: this.opciones.proyeccion,
				noMagic: true,
				esCapaBase: true,
				mostrarAlCargar: true,
				proyeccion: this.opciones.proyeccion
			};
			var o = argenmap.traducirObjeto($.extend({},predeterminadasWms,opciones));
			if(this._esCapaPrivada(o.nombre)) return;
			this.quitarCapa(o.nombre);
			var l = new OpenLayers.Layer.WMS(o.nombre,o.url,o,o);
			if(this.mapa) this.mapa.addLayer(l);
			if(l.options.isBaseLayer && o.mostrarAlCargar) this.mapa.setBaseLayer(l);
		},
		agregarCapaBing: function(opciones)
		{
		},
		agregarMarcador: function(opciones)
		{
			//aca tiene que llegar un objeto SI o SI, aunque sea vacio {}
			var predeterminadasMarcador = {
				lon: this.mapa.getCenter().lon,
				lat: this.mapa.getCenter().lat,
				capa:"Marcadores",
				listarCapa: false,
				nombre: "Marcador",
				contenido: "",
				mostrarConClick: true,
				desplegarContenido: false,
				icono: ''
			};
			var coordenadas = argenmap.leerCoordenadas(opciones,this.opciones.proyeccion);
			var o = $.extend({}, predeterminadasMarcador, opciones, coordenadas);

			//leo las coordenadas de nuevo despues de haber mergeado
			//las necesito para el createMarker
			coordenadas = argenmap.leerCoordenadas(o,this.opciones.proyeccion);

			//quito el marcador que pueda haber existido con el mismo nombre
			this.quitarMarcador(o.nombre);

			var icono = o.icono;
			//para detectar el tamanio de imagen voy a tener que hacer un preload
			//y en el callback volver a llamar esta funcion nuevamente
			if(typeof(icono) === "string" || icono === null)
			{
				var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
				var esUrl = urlPattern.test(icono);;
				var esArchivoImagen = (/\.(gif|jpg|jpeg|png)$/i).test(icono);
				if(!esArchivoImagen && !esUrl)
				{
					o.icono = this._crearIconoPredeterminado(icono);
				}else{
					var img = $('<img src="'+icono+'" />')
						.load($.proxy(
							function(e){
								var w = img[0].naturalWidth;
								var h = img[0].naturalHeight;
								var oi = new OpenLayers.Icon(icono,
									new OpenLayers.Size(w,h),
									new OpenLayers.Pixel(-(w / 2 << 0),-h));
								o.icono = oi;
								this.agregarMarcador(o);
							},
							this)
						);
					return;
				};
			};
			// /preload

			if(o.contenido == "")
			{
				o.mostrarConClick = false;
			}
			if(o.mostrarConClick)
			{
				o.eventos = {
					click: this._marcadorClickHandler
				}
			}
			var capa = this._traerCapaPorNombre(o.capa);
			if(!capa) capa = this._agregarCapaDeMarcadores({nombre:o.capa,listarCapa:o.listarCapa});
			//kludge, para cuando la capa existe pero se cambia la visibilidad con el marker
			capa.displayInLayerSwitcher = o.listarCapa;
			var opcionesFeature = {
				lonlat: coordenadas,
				icon:o.icono,
				//popupSize: new OpenLayers.Size(200,130),
				popupContentHTML: opciones.contenido,
				overflow: 'auto'
			};
			o = argenmap.traducirObjeto(o);
			var f = new OpenLayers.Feature(capa,coordenadas,opcionesFeature);
			var m = f.createMarker();
			f.nombre = m.nombre = o.nombre;
			f.closeBox = true;
			f.popupClass = OpenLayers.Popup.FramedCloud;
			if(o.eventos)
			{
				o.eventos.scope = f;
				m.events.on(o.eventos);
			}
			this.marcadores.push(f);
			capa.addMarker(m);
		},
		agregarMarcadores: function(arrayMarcadores)
		{
			if(!$.isArray(arrayMarcadores)) return;
			$.each(arrayMarcadores, $.proxy( function(i,e){
					this.agregarMarcador(e);
				}, this)
			);
		},
		modificarMarcador: function(nombre,opciones)
		{
			var f = this._traerMarcadorPorNombre(nombre);
			if(!f) return;
			var coordenadas = argenmap.leerCoordenadas(opciones,this.opciones.proyeccion) || f.lonlat;
			if(typeof(opciones) == "object"){
				try{
					delete opciones["lonlat"];
					delete opciones["latlng"];
					delete opciones["lat"];
					delete opciones["lon"];
					delete opciones["lng"];
					delete opciones["long"];
				}catch(e){//IE8 no soporta "delete"
					opciones["lonlat"] = undefined;
					opciones["latlng"] = undefined;
					opciones["lat"] = undefined;
					opciones["lon"] = undefined;
					opciones["long"] = undefined;
					opciones["lng"] = undefined;
				}
			}else if($.isArray(opciones)){
				//esto es por si se llamo a modificarMarcador("nombre",[lat,lon])
				opciones = {};
			}
			var opcionesPrevias = {
				lonlat: coordenadas,
				icono: f.marker.icon.clone(),//<----?!?!?!?!hay que reproducir lo que hice en agregarMarcador?
				capa:f.layer.nombre,
				listarCapa: f.layer.displayInLayerSwitcher,
				nombre: f.nombre,
				contenido: f.data.popupContentHTML,
				mostrarConClick: f.marker.events.listeners.click != undefined || f.data.popupContentHTML != ""
			};
			var opcionesNuevas = $.extend({},opcionesPrevias,opciones);
			this.quitarMarcador(nombre);
			this.agregarMarcador(opcionesNuevas);
		},
		quitarMarcador: function(nombre)
		{
			var f = this._traerMarcadorPorNombre(nombre);
			if(!f) return;
			//estoy removiendo el evento a mano, por las dudas, no se si esta bien
			f.marker.events.un({"click": this._marcadorClickHandler,scope:f});
			this._quitarMarcadorPorReferencia(f);
		},
		quitarCapa: function(nombre)
		{
			if(this.privados.indexOf(nombre) > -1) {
				return;
			}
			var c = this._traerCapaPorNombre(nombre);
			if(!c) {
				return;
			}
			//el mapa tiene eventos addlayer y removelayer que se encargan del this.capas
			this.mapa.removeLayer(c);
		},
		centro: function(lat,lon)
		{
			if(lat == undefined && lon == undefined)
			{
				var a = this.mapa.center.transform(this.opciones.proyeccion,"EPSG:4326");
				return [a.lat,a.lon];
			}
			coordenadas = argenmap.leerCoordenadas([lat,lon],this.opciones.proyeccion);
			if(!coordenadas) return;
			if(this.mapa) this.mapa.panTo(coordenadas);
		},
		zoom: function(zoom)
		{
			if(arguments.length === 0) return this.mapa.zoom;
			if(this.mapa) this.mapa.zoomTo(zoom);
		},
		capaBase: function(capa)
		{
			if(arguments.length === 0) {
				return this.mapa.baseLayer.nombre;
			}
			var c = this._traerCapaPorNombre(capa);
			if(c) this.mapa.setBaseLayer(c);
		},
		/* INTERNAS / PRIVADAS */
		_listarCapas: function()
		{
			var r = [];
			for(var ii = 0; ii < this.capas.length; ii++)
			{
				r.push(this.capas[ii].nombre);
			}
			return r;
		},
		_esCapaPrivada: function(nombre)
		{
			return this.privados.indexOf(nombre) > -1;
		},
		_crearIconoPredeterminado: function(icono)
		{
			var a = null;
			switch(icono)
			{
				case "hueco":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(29,29),
						new OpenLayers.Pixel(-15,-15)
					);
				break;
				case "aeropuerto":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "cajero":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "peligro":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "terremoto":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "estacionDeServicio":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "inundacion":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "glaciar":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "hospital":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "pico":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "policia":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "correo":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "corteDeLuz":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "restaurante":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "delito":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "tormenta":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "manifestacion":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "tornado":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "tren":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "volcan":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				case "cascada":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/"+icono+".png",
						new OpenLayers.Size(32,37),
						new OpenLayers.Pixel(-16,-37)
					);
				break;
				default:
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "iconos/argenmapIco.png",
						new OpenLayers.Size(32,32),
						new OpenLayers.Pixel(-16,-32)
					);
			}
			return a;
		},
		_quitarMarcadorPorReferencia: function(marcador)
		{
			//esta funcion solo termina removiendo el marcador
			//del array interno de ArgenMap, solo debe ejecutarse
			//cuando todos los procesos previos estan listos
			this.marcadores[this.marcadores.indexOf(marcador)].destroy();
			this.marcadores.splice(this.marcadores.indexOf(marcador),1);
		},
		/**
		 * Handler para el click de los marcadores
		 */
		_marcadorClickHandler: function(e)
		{
			if (this.popup == null) {
				this.popupClass.prototype.autoSize = true;
				this.popup = this.createPopup(this.closeBox);
				e.object.map.addPopup(this.popup);
				this.popup.show();
			} else {
				this.popup.toggle();
			}
			// currentPopup = this.popup;
			OpenLayers.Event.stop(e);
		},
		/**
		 * Agrega una capa OpenLayers.Layer.Markers
		 * @return OpenLayers.Layer.Markers
		 */
		_agregarCapaDeMarcadores: function(opciones)
		{
			var o = {
				nombre: "Marcadores",
				listarCapa: false
			}
			o = argenmap.traducirObjeto($.extend({},o,opciones));
			var c = new OpenLayers.Layer.Markers(o.nombre,o);
			if(this.mapa) this.mapa.addLayer(c);
			return c;
		},
		_traerMarcadorPorNombre: function(nombre)
		{
			for(var i = 0; i < this.marcadores.length; i++)
			{
				if(this.marcadores[i].nombre == nombre) return this.marcadores[i];
			}
			return null;
		},
		_traerMarcadorPorReferencia: function(marcador)
		{
			return this.marcadores[this.marcadores.indexOf(marcador)];
		},
		_traerCapaPorNombre: function(nombre)
		{
			for(var i = 0; i < this.capas.length; i++)
			{
				if(this.capas[i].nombre == nombre) return this.capas[i];
			}
			return null;
		},
		_traerCapaPorReferencia: function(capa)
		{
			return this.capas[this.capas.indexOf(capa)];
		},
		/**
		 * Busca en el array de capas proporcionado y devuelve si alguna capa.isBaseLayer == true
		 * @param Array
		 */
		_corroborarCapaBase: function(capasArray)
		{
			if(!$.isArray(capasArray)) return false;
			var resultado = false;
			for(var i = 0; i < capasArray.length; i++)
			{
				if( (capasArray[i].hasOwnProperty("isBaseLayer") && capasArray[i].isBaseLayer == true)
					|| (capasArray[i].hasOwnProperty("esCapaBase") && capasArray[i].esCapaBase == true) )
				{
					resultado = true;
					break;
				}
			}
			return resultado;
		},
		/**
		 * Crea capas predefinidas y las adosa al array this.capas
		 * Esta funcion NO agrega las capa al mapa, solo las crea y las deja en el array
		 * @param array Las capas predefinidas a crear (IGN, baseIGN, Google, Bing, KML)
		 */
		_crearCapasPredefinidas: function(capasArray)
		{
			if(!$.isArray(capasArray)) return;
			$.each(capasArray, $.proxy( function(i,e){
					this._crearCapaPredefinida(e);
				}, this)
			);
		},
		/**
		 * Crea una capa predefinida y la adosa al array this.capas
		 * Esta funcion NO agrega la capa al mapa, solo la crea y la deja en el array
		 * @param string La capa predefinida a crear (IGN, baseIGN, Google, Bing, KML)
		 */
		_crearCapaPredefinida: function(capaString,extras)
		{
			if(typeof(capaString) != "string") return null;
			var c = null;
			var o = null;
			var p = null;
			switch(capaString.toLowerCase())
			{
				case "baseign":
					p = argenmap.traducirObjeto({
						layername: "capabaseargenmap",
						formato: "image/png",
						singleTile: false,
						transparente: false,
						version: "1.1.1",
						servicio: "wms",
						serviceVersion:"",
						type:'png',
						transitionEffect: 'resize',
						srs: this.opciones.proyeccion
					});
					o = argenmap.traducirObjeto({
						esCapaBase: true,
						nombre: "Base IGN",
						noMagic: true,
						proyeccion: this.opciones.proyeccion
					});
					$.extend(p,o);

					c = new OpenLayers.Layer.ArgenmapTMS("Base IGN",IGN_CACHES  ,p);
				break;
				case "ign":
					o = argenmap.traducirObjeto(extras);
					p = argenmap.traducirObjeto({
						layername: "capabasesigign",
						transparente: true,
						type:'png',
						serviceVersion: "",
						esCapaBase: false,                      
						nombre: "IGN",
						noMagic: true,
						singleTile: false,
						transitionEffect: 'map-resize',
						proyeccion: this.opciones.proyeccion                        
					});
					$.extend(p,o);
					//c = new OpenLayers.Layer.WMS("IGN",["http://www.ign.gob.ar/wms", "http://190.220.8.198/wms"],p,o);
					c = new OpenLayers.Layer.ArgenmapTMS(p.nombre, IGN_CACHES ,p);                  
					/*
					 * El constructor OpenLayers.Layer.TMS no acepta displayInLayerSwitcher como opción
					 * así que la agrego a manopla.
					 */
					if(o.hasOwnProperty("displayInLayerSwitcher"))
					{
						c.displayInLayerSwitcher = o.displayInLayerSwitcher;
						//si no se muestra en layerswitcher agrego la
						//capa a privados para que no pueda removerse a mano
						if(!o.displayInLayerSwitcher)
						{
							this.privados.push(p.nombre);
						}
					}
				break;
				case "bing":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" && this.opciones.proyeccion != "EPSG:900913") return c;
					if(extras && extras.key)
					{
						var ign = this._crearCapaPredefinida("ign",{nombre:'ign_bing',listarCapa:false});
						c = new OpenLayers.Layer.Bing({
							name: "Aérea (Bing)",
							isBaseLayer:true,
							nombre: "Aérea (Bing)",
							key: extras.key,//"Ang2jMeTgBWgNdYC_GbPxP37Gs1pYJXN-byoKn8zGW39FsxwZ3o7N2kvcdDbrnb_",
							type: "Aerial",
							companionLayer: ign
						});
					};
					c.companionLayer = ign;
					c.events.on({
						visibilitychanged:function(e){
							e.object.companionLayer.setVisibility(e.object.getVisibility());
						},
						added: function(e)
						{
							e.map.addLayer(e.layer.companionLayer);
						},
						removed: function(e){
							var l = this._traerCapaPorReferencia(e.layer.companionLayer);
							if(l) e.map.removeLayer(l);
						},
						scope:this
					});
				break;
				case "mapnik-osm-ar":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" && this.opciones.proyeccion != "EPSG:900913") return c;
					
					//var ign = this._crearCapaPredefinida("ign",{displayInLayerSwitcher:false});
					var o = {
						name: "OpenStreetMap Argentina",
						isBaseLayer:true,
						nombre: "OpenStreetMap Argentina",
						type: "Mapnik"
					};
					c = new OpenLayers.Layer.OSM("OSM-Ar",'http://tile.openstreetmap.org.ar/nolabels/${z}/${x}/${y}.png',o);
					
					/*c.companionLayer = ign;
					c.events.on({
						visibilitychanged:function(e){
							e.object.companionLayer.setVisibility(e.object.getVisibility());
						},
						added: function(e)
						{
							e.map.addLayer(e.layer.companionLayer);
						},
						removed: function(e){
							var l = this._traerCapaPorReferencia(e.layer.companionLayer);
							if(l) e.map.removeLayer(l);
						},
						scope:this
					});*/
				break;
				case "satelital_base":
					//atencion con esta capa, es la satelital pero para instancia inicial
					//con la opcion de no switchear automaticamente, para que pueda quedar
					//detras de baseIGN
					return this._crearCapaPredefinida("satelital",{noCambiarAutomaticamente:true});
				break;
				case "hibridoign":
				case "satelital":
				case "satelite":
				case "google":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" && this.opciones.proyeccion != "EPSG:900913")
					{
						return c;
					}

					if( !argenmap.googleEstaCargado() )
					{
						if(!argenmap.googleEstaCargando)
						{
							var m = String(Math.random() * 1000 << 0);
							//async load de api de google segun guias
							//https://developers.google.com/maps/documentation/javascript/tutorial#Loading_the_Maps_API
							window["argenmapGoogleAPICallback"+m] = function()
							{
								window["argenmapGoogleAPICallback"+m] = null;
								try{
									delete window["argenmapGoogleAPICallback"+m];
								}catch(e){
									window["argenmapGoogleAPICallback"+m] = undefined;
								}
								// this.agregarCapa("satelital",extras);
								$(window).trigger({type:'googleCargado'});
							};
							var script = document.createElement("script");
							script.type = "text/javascript";
							script.src = "http://maps.google.com/maps/api/js?v=3.9&sensor=false&callback=argenmapGoogleAPICallback"+m;
							document.body.appendChild(script);
							argenmap.googleEstaCargando = true;
							$(window).one('googleCargado',$.proxy(function(){this.agregarCapa("satelital",extras)},this));
						}else{
							$(window).one('googleCargado',$.proxy(function(){this.agregarCapa("satelital",extras)},this));
						}
					}else{
						var ign = new argenmap.CapaTMS({
							name: 'IGN',
							baseURL: IGN_CACHES,
							layers: 'capabasesigign'
						});
						var o = {
							nombre:"Satélite",
							type:"satellite",
							isBaseLayer: true
							//numZoomLevels:20,
							//companionLayer: ign
						};
						//numZoomLevels 20 hace que no se ponga en 45 grados la capa de google
						o = $.extend({},o,extras);
						c = new OpenLayers.Layer.Google("Satélite",o);
						c.events.on({
							added: function(e) {
								ign.gmap = e.object.mapObject;
								e.object.mapObject.overlayMapTypes.push(ign.imageMapType);
							}
						});
						// capa.gmap = gmap;
						// gmap.overlayMapTypes.push(capa.imageMapType);

						/*
						var ign = this._crearCapaPredefinida("ign",{nombre:'ign_sobre_satelite',listarCapa:false});
						var o = {
							nombre:"Satélite",
							type:"satellite",
							isBaseLayer: true,
							//numZoomLevels:20,
							companionLayer: ign
						};
						//numZoomLevels 20 hace que no se ponga en 45 grados la capa de google
						o = $.extend({},o,extras);
						c = new OpenLayers.Layer.Google("Satélite",o);
						c.companionLayer = ign;
						c.events.on({
							visibilitychanged:function(e){
								e.object.companionLayer.setVisibility(e.object.getVisibility());
							},
							added: function(e)
							{
								e.map.addLayer(e.layer.companionLayer);
							},
							removed: function(e){
								var l = this._traerCapaPorReferencia(e.layer.companionLayer);
								if(l) e.map.removeLayer(l);
							},
							scope:this
						});*/
					}
				break;
			}
			if(c) c.projection = new OpenLayers.Projection(this.opciones.proyeccion);
			/*si no hay mapa simplemente la agregamos a las capas de argenmap*/
			if(c && !this.mapa) this.capas.push(c);
			return c;
		},
		/**
		 * prepara el div para el mapa, crea 3 divs adentro
		 * .argenmapMapHeader: div con el header del IGN
		 * .argenmapMapCanvas: div donde se instancia el mapa
		 * .argenmapMapFooter: div con el footer de IGN
		 * configura la variable de clase this.divMapa al elemento
		 * DOM div.argenmapMapCanvas hijo del selector donde se instancia argenmap
		 */
		_prepararDiv: function()
		{
			this.$el.html("");//vaciar el contenedor
			this.$el.css('padding',0);//reset el padding, por si las flies
			this.$el.css('min-width',240);//restringir ancho minimo
			var alto = this.$el.innerHeight();
			var logoLink = $('<a style="float:left;" target="_blank" href="http://www.ign.gob.ar/argenmap2/argenmap.jquery/docs" />');
			$('<img src="'+OpenLayers.ImgPath+'logoignsintexto-25px.png" />').css('height','20px').appendTo(logoLink);

			var f = $('<div class="argenmapMapFooter" />')
				.css({
					'font-family': 'Arial',
					'color': this.colorLetraPie,
					'background-color': this.colorFondoPie,
					'box-shadow': '0 0 11px rgb(5, 66, 100) inset',
					'font-size': '10px',
					'text-align': 'right',
					'height': '20px',//issue30
					'min-height': '15px',
					'line-height': '20px',
					/*'min-height': '25px',
					'line-height': '13px',*/
					'vertical-align':'middle',
					'padding': '2px',
					'margin':0,
					'border':0
				}).append(logoLink);
			$('<a target="_blank" href="http://www.ign.gob.ar/argenmap/argenmap.jquery/docs/#datosvectoriales"></a>')
				.css({
					'color': this.colorLetraPie,
					'text-decoration': 'underline',
					'font-weight': 'normal'
				})
				.text('Datos IGN Argentina // OpenStreetMap')
				.appendTo(f);
			var c = $('<div class="argenmapMapCanvas" />').css({
					padding:0,//reset de padding, de nuevo, por si las flies
					margin:0,//idem
					border:0,//idem
					width: '100%',
					'min-height': '150px',
					height:(alto - f.outerHeight() ) + 'px',
					position: 'relative',
					'background-color': 'rgb(229, 227, 223)',
					overflow: 'hidden'
			});
			this.divMapa = c.get(0);
			this.$el.bind('resized',$.proxy(function(){
					this.actualizar();
				},this)
			);
			this.$el.append(c).append(f);
		}
	}
	/* COPIA DE FUNCION isNumeric de jQuery 1.7+ para compatibilidad */
	$.isNumeric = function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	}
	/* PLUGINS ARGENMAP */
	$.fn.argenmap = function(opciones)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) //dom element sin inicializar
			{
				a = new ArgenMap($this,opciones);
				$this.data('argenmap',a);
				a.inicializar();
			}
		});
	}
	$.fn.centro = function(lat,lon)
	{
		//getter
		//el getter/lector solo devuelve la primer coincidencia de selector
		if(arguments.length === 0)
		{
			if( !this.data('argenmap') )
			{
				return null;
			}
			var ctro = argenmap.leerLonLat(this.data('argenmap').mapa.getCenter());
			return ctro ? [ctro.lat,ctro.lon] : null;
		}
		//setter
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			
			a.centro(lat,lon);
		});
	}
	$.fn.zoom = function(zoom)
	{
		if(arguments.length === 0)
		{
			if( !this.data('argenmap') )
			{
				return null;
			}
			var z = this.data('argenmap').mapa.getZoom();
			return $.isNumeric(z) ? z : null;
		}
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a || !$.isNumeric(zoom)) return;
			
			a.zoom(zoom);
		});
	}
	$.fn.capaBase = function(capa)
	{
		if(arguments.length === 0)
		{
			if( !this.data('argenmap') )
			{
				return null;
			}
			return this.data('argenmap').capaBase();
		}
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a || typeof(capa) != "string")
			{
				return;
			}
			
			a.capaBase(capa);
		});
	}
	$.fn.agregarCapa = function(opciones, extras)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarCapa(opciones, extras);
		});
	}
	$.fn.agregarCapaWMS = function(opciones)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarCapaWMS(opciones);
		});
	}
	$.fn.agregarCapaBaseWMS = function(opciones)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarCapaBaseWMS(opciones);
		});
	}
	$.fn.agregarCapaBing = function(opciones)
	{
	}
	$.fn.agregarCapaKML = function(opciones)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarCapaKML(opciones);
		});
	}
	$.fn.quitarArgenmap = function()
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			
			$this.data('argenmap',null);
			$this.html("");
			a = null;
		});
	}
	/**
	 * Agrega un marcador al mapa instanciado en el selector
	 * agregarMarcador(float,float)
	 * agregarMarcador(objeto): {lonlat:OpenLayers.LonLat} ó {lon:float,lat:float}
	 * agregarMarcador(string): "-35,-57"
	 * Opciones:
	 *   capa: string, nombre de la capa donde colocar el marcador
	 *   contenido: string/HTML, contenido descriptivo del marcador
	 *   nombre: string
	 *   eventos: TO DO
	 *   cuadro: objeto con opciones de cuadro (ver agregarCuadro)
	 */
	$.fn.agregarMarcador = function(opciones,lon)
	{
		var o = {};
		if(arguments.length === 2) {
			//si llega con un par de coordenadas como args...
			if($.isNumeric(arguments[0]) && $.isNumeric(arguments[1])) {
				o.lat = arguments[0];
				o.lon = arguments[1];
			};
		}else if(typeof(opciones) == "string") {
			//si llega con un string estilo "-34.218,-56.813"...
			var arsplit = opciones.split(",");
			arsplit[0] = parseFloat(arsplit[0]);
			arsplit[1] = parseFloat(arsplit[1]);
			if(arsplit.length === 2 && !isNaN(arsplit[0]) && !isNaN(arsplit[1]))
			{
				o.lat = arsplit[0];
				o.lon = arsplit[1];
			};
		}else if($.isArray(opciones)) {
			//si llega como un array de [lat,lon]
			o.lat = opciones[0];
			o.lon = opciones[1];
		}else{
			o = $.extend({},o,opciones);
		};
		
		return this.each(function(){
			// var o = $.extend({},opciones);
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarMarcador(o);
		});
	}
	$.fn.modificarMarcador = function(nombre,opciones)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.modificarMarcador(nombre,opciones);
		});
	}
	$.fn.quitarMarcador = function(nombre)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.quitarMarcador(nombre);
		});
	}
	$.fn.quitarCapa = function(nombre)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.quitarCapa(nombre);
		});
	}
	$.fn.agregarMarcadores = function(arrayMarcadores)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			if(!$.isArray(arrayMarcadores)) return;
			a.agregarMarcadores(arrayMarcadores);
		});
	}
})(jQuery, window, document, undefined);


