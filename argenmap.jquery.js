(function ($, window, undefined) {
	IGN_CACHES = [
		'http://cg.aws.af.cm/tms',
		'http://mapaabierto.aws.af.cm/tms',
		'http://robomap-cgastrell.rhcloud.com/tms'
	];	
	//-----------------------------------------------------------------------//
	// jQuery event
	//-----------------------------------------------------------------------//
	//resized event: se escucha desde un DOMElement y se dispara
	//cada vez que ese elemento cambia de tamanio (ancho o alto)
	$.event.special.resized = {
		setup: function(){
				var self = this, $this = $(this);
				var $w = $this.width();
				var $h = $this.height();
				interval = setInterval(function(){
						if($w != $this.width() || $h != $this.height()) {
							$w = $this.width();
							$h = $this.height();
							jQuery.event.handle.call(self, {type:'resized'});
						}
				},20);
		},
		teardown: function(){
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
	         : Math.floor(from);
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
	/* CLASE CACHE DE CLIENTE */
	function CacheDeCliente()
	{
		this.MAX_TILES = 150;
		this.cache = [];
		this.cacheRef = {};
	}
	CacheDeCliente.prototype = {
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
	//set de OL
	OpenLayers.Popup.FramedCloud.prototype.autoSize = false;
	AutoSizeFramedCloudMinSize = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
			'autoSize': true, 
			'minSize': new OpenLayers.Size(100,100)
	});
	AutoSizeFramedCloud = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
		'autoSize': true
	});
	//
	OpenLayers.Layer.ArgenmapTMS = OpenLayers.Class(OpenLayers.Layer.TMS, {
		'cache': new CacheDeCliente()
	});
	OpenLayers.Layer.HTTPRequest.prototype.selectUrl = function(paramString, urls) 
	{
		var cached = this.cache.recuperar(paramString);
		if(cached)
		{
			return cached;
		}


		var product = 1;
		for (var i=0, len=paramString.length; i<len; i++) { 
			product *= paramString.charCodeAt(i) * this.URL_HASH_FACTOR; 
			product -= Math.floor(product); 
		}
		this.cache.guardar(paramString, urls[Math.floor(product * urls.length)]);
		return urls[Math.floor(product * urls.length)];
	}
	/**
	 * Mapa de propiedades traducidas
	 */
	var mapaDePropiedades = {
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
	var rutaRelativa = "http://www.ign.gob.ar/argenmap2/argenmap.jquery/";
	OpenLayers.ImgPath = rutaRelativa + "img/";

	/* FUNCIONES DE AYUDA */
	/**
	 * Traduce las keys de un objeto a traves del mapa de propiedades
	 * para ser utilizado por las clases de OpenLayers
	 * La idea es que el plugin acepta parámetros y métodos en castellano y los
	 * pase en inglés a OL.
	 * @param {Object} objeto el objeto al cual se le quieren traducir las keys.
	 * @param {boolean} alReves. Si es true traducen las keys de inglés a español.
	 * @return {Object} el objeto con las keys traducidas a español.
	 */
	function traducirObjeto(objeto,alReves)
	{
		var resultado = {};
		var mapa = $.extend({},mapaDePropiedades);
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
	 * @param {mixed} coords Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}.  (Llama a leerLonLat() con @mezcla como argumento).
	 * @param {string} proyeccion Código EPSG que defina el sistema de coordenadas en el que se quiere el resultado. 'epsg:4326' o 'epsg:3857' solamente.
	 * @see leerPlanas
	 * @see leerLonLat
	 */
	function leerCoordenadas(coords,proyeccion)
	{
		if(!coords) return;
		if(!proyeccion) proyeccion = "EPSG:3857";
		switch(proyeccion)
		{
			case "EPSG:3857":
				return leerPlanas(coords);
			break;
			case "EPSG:4326":
				return leerLonLat(coords);
			break;
		}
	}
	/**
	 * Devuelve un OpenLayers.LonLat en el SRS epsg:3857 a partir de un par de coordendas en el SRS epsg:4326.
	 * @param {Mixed} mezcla Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}.  (Llama a leerLonLat() con @mezcla como argumento).
	 * @return {OpenLayers.LonLat} el objeto OpenLayers.LonLat con las coordenadas en epsg:3857.
	 */
	function leerPlanas(mezcla)
	{
		var ll = leerLonLat(mezcla);
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
	}
	/**
	 * Devuelve un OpenLayers.LonLat a partir de una array con propiedad {lon,lat}
	 * @param {Mixed} mezcla. Acepta [lat,lon], {lonlat:{lon,lat}}, {latLng:{lon,lat}}, {lon,lat}
	 * @return {OpenLayers.LonLat} el objeto OpenLayers.LonLat
	 */
	function leerLonLat(mezcla)
	{
		var empty = null;
		var r = empty;
		if (undefined == mezcla || (typeof(mezcla) === 'string')) return null;
		//si tiene un prop lonlat o latLng recursea con ese property
		if(mezcla.hasOwnProperty("lonlat")) {
			r = leerLonLat(mezcla.lonlat);
		}else if(mezcla.hasOwnProperty("latLng")) {
			r = leerLonLat(mezcla.latLng);
		}else if(mezcla.hasOwnProperty("latlon")) {
			r = leerLonLat(mezcla.latlon);
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
	/* CLASE ARGENMAP */
	function ArgenMap($this,opciones)
	{

		this.colorFondoPie = '#003964';
		this.colorLetraPie = 'white';
		if(opciones !== undefined && opciones.hasOwnProperty("colorFondoPie"))
		{
			this.colorFondoPie = opciones.colorFondoPie;
		}
		if(opciones !== undefined && opciones.hasOwnProperty("colorLetraPie"))
		{
			this.colorLetraPie = opciones.colorLetraPie;
		}
		this.miniCache = new CacheDeCliente();
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
			rutaAlScript: rutaRelativa,
			mapaFijo: false //...una opcion para sacar controles de navegacion?
		};
		
		this.depuracion = opciones.depuracion || false;
		
		//merge predefinidos con opciones de usuario
		this.opciones = $.extend({}, this.predefinidos, opciones);
		//si se setea un nuevo path, hay que re-setear img path
		OpenLayers.ImgPath = rutaRelativa + "img/";
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
		// if(this.opciones.agregarCapaIGN) this.opciones.capas.push("IGN");
		// if(this.opciones.agregarBaseIGN) this.opciones.capas.unshift("baseIGN");
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
				centro: leerCoordenadas(this.opciones.centro,this.opciones.proyeccion),
				capas: this.capas,
				theme: rutaRelativa + "theme/default/style.css"
			};
			
			//tuve que hacer esto porque OL no arranca sin capa base, y tampoco puedo
			//forzar a tener una capa base. Que diria Lugosi si no se puede tener un mapa sin base?
			if(!this._corroborarCapaBase(o.capas))
				o.capas.push(new OpenLayers.Layer.Vector("sin base",{isBaseLayer:true}));
				
			var opcionesDeMapa = traducirObjeto($.extend({},this.opciones,o));
			// opcionesDeMapa.displayProjection = new OpenLayers.Projection("EPSG:4326");
			this.mapa = new OpenLayers.Map(this.divMapa, opcionesDeMapa);
			this.actualizar();
			/*
			 * KLUDGE!
			Saco el control Navigation predeterminado
			porque si no no le importan las opciones
			del control Navigation agregado a través
			de addControls()
			*/
			var nav = this.mapa.getControlsByClass("OpenLayers.Control.Navigation")[0];
			this.mapa.removeControl(nav);

			this.mapa.addControls([
				new OpenLayers.Control.LayerSwitcher(),
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
			nav.dragPan.kinetic.deceleration=0.007

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
			this.$el.find('div.baseLbl').text("Capas base");
			this.$el.find('div.dataLbl').text("Superpuestas");
		},
		destruir: function()
		{
			/* cosas que tendria que hacer el destruir:
			-limpiar el dom element
			-nulificar la clase para que el gc(?) se encargue
			-nulificar el data('argenmap') del dom element
			... por ahora me resulta mas facil destruir el objeto
			... desde afuera, si lo hago desde aca queda una referencia perdida
			... creo. $(selector).removerArgenmap() por ahora es lo mas efectivo
			*/
		},
		actualizar: function()
		{

			var f = this.$el.children('div.argenmapMapFooter');
			var c = this.$el.children('div.argenmapMapCanvas');
			c.css('height',(this.$el.innerHeight() - f.outerHeight() ) + 'px');
			if(this.mapa) this.mapa.updateSize();
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
					agregarCapaWMS(opciones);
				break;
				case "kml":
					agregarCapaKML(opciones);
				break;
			}
		},
		agregarCapaWMS: function(opciones)
		{
			var predeterminadasWms = {
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
			var o = traducirObjeto($.extend({},predeterminadasWms,opciones));
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
			var o = traducirObjeto($.extend({},predeterminadasKml,opciones,extras));
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
			var o = traducirObjeto($.extend({},predeterminadasWms,opciones));
			var l = new OpenLayers.Layer.WMS(o.nombre,o.url,o,o);
			if(this.mapa) this.mapa.addLayer(l);
			if(l.options.isBaseLayer && o.mostrarAlCargar) this.mapa.setBaseLayer(l);
		},
		agregarCapaBing: function(opciones)
		{
		},
		agregarMarcador: function(opciones)
		{
			var coordenadas;
			if(undefined == opciones)
			{
				//si se llama sin argumentos, marcamos el centro
				coordenadas = this.mapa.getCenter();
				opciones = {}
			}else{
				coordenadas = leerCoordenadas(opciones,this.opciones.proyeccion);
			}
			//si a esta altura no esta definido coordenadas, cancelamos
			if(!coordenadas) return;
			//borro el lonlat que pueda haber venido con las opciones, ya tengo las coords
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
				//esto es por si se llamo a agregarMarcador([lat,lon])
				opciones = {};
			}
			//hay que independizar el icono por defecto
			var predeterminadasMarcador = {
				capa:"Marcadores",
				listarCapa: false,
				nombre: "Marcador",
				contenido: "",
				mostrarConClick: true,
				icono: ''
			};
			var o = $.extend({},predeterminadasMarcador,opciones);
			var icono = o.icono;
			//para detectar el tamanio de imagen voy a tener que hacer un preload
			//y en el callback volver a llamar esta funcion nuevamente
			if(typeof(icono) === "string" || icono === null)
			{
				var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
				var esUrl;
				var esArchivoImagen;
				esUrl = urlPattern.test(icono);
				esArchivoImagen = (/\.(gif|jpg|jpeg|png)$/i).test(icono);
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
								o.lonlat = coordenadas;
								o.icono = oi;
								this.agregarMarcador(o);
							},
							this)
						);
					return;
				}
			}else{
				//si no es string debe ser objeto, "siga siga" dice el arbitro
				// console.log('icono != string')
			}
			// !preload

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
			o = traducirObjeto(o);
			var f = new OpenLayers.Feature(capa,coordenadas,opcionesFeature);
			var m = f.createMarker();
			// console.log(opcionesFeature);
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
			var coordenadas = leerCoordenadas(opciones,this.opciones.proyeccion) || f.lonlat;
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
			// console.log(f.marker.icon);
			// return;
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
			this.removerMarcador(nombre);
			this.agregarMarcador(opcionesNuevas);
		},
		removerMarcador: function(nombre)
		{
			var f = this._traerMarcadorPorNombre(nombre);
			if(!f) return;
			//estoy removiendo el evento a mano, por las dudas, no se si esta bien
			f.marker.events.un({"click": this._marcadorClickHandler,scope:f});
			this._removerMarcadorPorReferencia(f);
		},
		centro: function(lat,lon)
		{
			if(lat == undefined && lon == undefined)
			{
				var a = this.mapa.center.transform(this.opciones.proyeccion,"EPSG:4326");
				return [a.lat,a.lon];
			}
			coordenadas = leerCoordenadas([lat,lon],this.opciones.proyeccion);
			if(!coordenadas) return;
			if(this.mapa) this.mapa.panTo(coordenadas);
		},
		//deprecated
		centrarMapa: function(lat,lon,zoom)
		{
			coordenadas = leerCoordenadas([lat,lon],this.opciones.proyeccion);
			if(this.mapa)
			{
				if(zoom)
				{
					this.mapa.setCenter(coordenadas,zoom);
				}else{
					this.mapa.panTo(coordenadas);
				}
			}
		},
		zoom: function(zoom)
		{
			if(arguments.length === 0) return this.mapa.zoom;
			if(this.mapa) this.mapa.zoomTo(zoom);
		},
		capaBase: function(capa)
		{
			if(arguments.length === 0) return this.mapa.baseLayer.nombre;
			var c = this._traerCapaPorNombre(capa);
			if(c) this.mapa.setBaseLayer(c);
		},
		/* INTERNAS / PRIVADAS */
		_crearIconoPredeterminado: function(icono)
		{
			var a = null;
			switch(icono)
			{
				case "hueco":
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "marcadorHueco.png",
						new OpenLayers.Size(29,29),
						new OpenLayers.Pixel(-15,-15)
					);
				break;
				default:
					a = new OpenLayers.Icon(
						OpenLayers.ImgPath + "PinDown1.png",
						new OpenLayers.Size(32,39),
						new OpenLayers.Pixel(-7,-35)
					);
			}
			return a;
		},
		_removerMarcadorPorReferencia: function(marcador)
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
			o = traducirObjeto($.extend({},o,opciones));
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
			for(var i = 0; i < this.capas.length; i++)
			{
				if(this.capas[i] == capa) return this.capas[i];
			}
			return false;
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
		/*
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
		/*
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
					p = traducirObjeto({
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
					o = traducirObjeto({
						esCapaBase: true,
						nombre: "Base IGN",
						noMagic: true,
						proyeccion: this.opciones.proyeccion
					});
					$.extend(p,o);

					c = new OpenLayers.Layer.ArgenmapTMS("Base IGN",IGN_CACHES  ,p);					
				break;
				case "ign":
					p = traducirObjeto({
						layername: "capabasesigign",
						transparente: true,
						type:'png',
						serviceVersion: "",
						esCapaBase: false,						
						nombre: "IGN",
						noMagic: true,
						singleTile: false,
						transitionEffect: 'resize',
						proyeccion: this.opciones.proyeccion						
					});
					
					//c = new OpenLayers.Layer.WMS("IGN",["http://www.ign.gob.ar/wms", "http://190.220.8.198/wms"],p,o);
					c = new OpenLayers.Layer.ArgenmapTMS("IGN",IGN_CACHES ,p);					
					/*
					 * El constructor OpenLayers.Layer.TMS no acepta displayInLayerSwitcher como opción
					 * así que la agrego a manopla.
					 */
					c.displayInLayerSwitcher = false;					
				break;
				case "bing":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" && this.opciones.proyeccion != "EPSG:900913") return c;
					if(extras && extras.key)
					{
						var ign = this._crearCapaPredefinida("ign",{displayInLayerSwitcher:false});
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
				case "google":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" && this.opciones.proyeccion != "EPSG:900913")
						return c;
					
					if(typeof(google) != 'object' || (typeof(google) == "object" && typeof(google.maps) != 'object'))//este OR no esta bien
					{
						//async load de api de google segun guias
						//https://developers.google.com/maps/documentation/javascript/tutorial#Loading_the_Maps_API
						window["argenmapGoogleAPICallback"] = $.proxy(function()
						{
							window["argenmapGoogleAPICallback"] = null;
							try{
								delete window["argenmapGoogleAPICallback"];
							}catch(e){
								window["argenmapGoogleAPICallback"] = undefined;
							}
							this.agregarCapa("satelital",extras);
						},this);
						var script = document.createElement("script");
						script.type = "text/javascript";
						script.src = "http://maps.google.com/maps/api/js?v=3.9&sensor=false&callback=argenmapGoogleAPICallback";
						document.body.appendChild(script);
					}else{
						var ign = this._crearCapaPredefinida("ign",{displayInLayerSwitcher:false});
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
						});
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
			// if(this.$el.data('argenmap')) this.destruir();//instancia anterior si la hubiese, no deberia ir aca
			this.$el.html("");//vaciar el contenedor
			this.$el.css('padding',0);//reset el padding, por si las flies
			var alto = this.$el.innerHeight();
			var a = $('<a style="float:left;" target="_blank" href="http://www.ign.gob.ar/argenmap/argenmap.jquery/docs" />')
				.append('<img src="http://www.ign.gob.ar/argenmap/argenmap.jquery/img/logoignsintexto-25px.png" />');

			var f = $('<div class="argenmapMapFooter" />')
				.css({
					'font-family': 'Arial',
					'color': this.colorLetraPie,
					'background-color': this.colorFondoPie,
					'font-size': '10px',
					'text-align': 'right',
					'min-height': '25px',
					'line-height': '13px',
					'vertical-align':'middle',
					'padding': '5px',
					'margin':0,
					'border':0
				}).append(a)
				.append('<a style="color:'+this.colorLetraPie+';text-decoration:underline;font-weight:normal" target="_blank" href="http://www.ign.gob.ar/argenmap/argenmap.jquery/docs/#datosvectoriales">Topónimos, datos topográficos - 2013 IGN Argentina // Calles - OpenStreetMap</a>');
			var c = $('<div class="argenmapMapCanvas" />')
				.css({
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
				this.$el.bind('resized',$.proxy(function()//delega la funcion a this
					{
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
			var argenmap = $this.data('argenmap');
			if(!argenmap) //dom element sin inicializar
			{
				argenmap = new ArgenMap($this,opciones);
				$this.data('argenmap',argenmap);
				argenmap.inicializar();
			}
		});
	}
	$.fn.agregarCapa = function(opciones, extras)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			// var capa = null;
			// capa = a._crearCapaWMS(opciones);
			// if(capa) a._agregarCapa(capa);
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
			// var capa = null;
			// capa = a._crearCapaWMS(opciones);
			// if(capa) a._agregarCapa(capa);
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
			// var capa = null;
			// capa = a._crearCapaWMS(opciones);
			// if(capa) a._agregarCapa(capa);
			a.agregarCapaWMS(opciones);
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
			// var capa = null;
			// capa = a._crearCapaWMS(opciones);
			// if(capa) a._agregarCapa(capa);
			a.agregarCapaKML(opciones);
		});
	}
	$.fn.removerArgenmap = function()
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
		//si llega con un par de numeros como args...
		if(undefined != lon && $.isNumeric(opciones) && $.isNumeric(lon))
		{
			opciones = [opciones,lon];
		}else if(typeof(opciones) == "string") {
			//si llega con un string estilo "-34.218,-56.813"...
			var arsplit = opciones.split(",");
			arsplit[0] = parseFloat(arsplit[0]);
			arsplit[1] = parseFloat(arsplit[1]);
			if(isNaN(arsplit[0]) || isNaN(arsplit[1]))
			{
				opciones = null;
			}else{
				opciones = arsplit;
			}
		}
		return this.each(function(){
			var o = $.extend({},opciones);
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarMarcador(opciones);
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
	$.fn.removerMarcador = function(nombre)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.removerMarcador(nombre);
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
	$.fn.centro = function(lat,lon)
	{
		//getter
		//el getter/lector solo devuelve la primer coincidencia de selector
		if(arguments.length === 0)
		{
			if( !this.data('argenmap') ) return null;
			var ctro = leerLonLat(this.data('argenmap').mapa.getCenter());
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
			if( !this.data('argenmap') ) return null;
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
			if( !this.data('argenmap') ) return null;
			// var z = this.data('argenmap').mapa.getZoom();
			return this.data('argenmap').capaBase();
		}
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a || typeof(capa) != "string") return;
			
			a.capaBase(capa);
		});
	}
})(jQuery, window);
