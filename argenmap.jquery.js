/*
 *  OpenLayers Plugin for JQuery 
 *  Version   : 0.1
 *  Date      : 2012-08-13
 *  Licence   : GPL v3 : http://www.gnu.org/licenses/gpl.html  
 *  Author    : IGN
 *  Contact   : cgastrell@gmail.com
 *  Web site  : http://www.ign.gob.ar
 *   
 *  Copyright (c) -2012 IGN
 *  All rights reserved.
 *   
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 * 
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above 
 *     copyright notice, this list of conditions and the following 
 *     disclaimer in the documentation and/or other materials provided 
 *     with the distribution.
 *   - Neither the name of the author nor the names of its contributors 
 *     may be used to endorse or promote products derived from this 
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */
(function ($, window, undefined) {
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
				},50);
		},
		teardown: function(){
				clearInterval(interval);
		}
	};
	//set de OL
	OpenLayers.Popup.FramedCloud.prototype.autoSize = false;
	AutoSizeFramedCloudMinSize = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
			'autoSize': true, 
			'minSize': new OpenLayers.Size(100,100)
	});
	AutoSizeFramedCloud = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
		'autoSize': true
	});
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

	var rutaRelativa = "http://mapa.ign.gob.ar/cg/argenmap-v2/";
	OpenLayers.ImgPath = rutaRelativa + "img/";
	// var _getScriptLocation = (function() {
		// var r = new RegExp("(^|(.*?\\/))(argenmap.jquery.js)(\\?|$)"),
			// s = document.getElementsByTagName('script'),
			// src, m, l = "";
		// for(var i=0, len=s.length; i<len; i++) {
			// src = s[i].getAttribute('src');
			// if(src) {
				// m = src.match(r);
				// if(m) {
					// rutaRelativa = m[1];
					// break;
				// }
			// }
		// }
		// OpenLayers.ImgPath = rutaRelativa;
		// return (function() { return rutaRelativa; });
	// })()
	// $.getScript(rutaRelativa + 'OpenLayers.argenmap.min.js',function(){
		// OpenLayers.ImgPath = rutaRelativa + "img/";
	// });
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
				delete mapa[i];
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
		}
		
		// MAGIC: se supone que es para aceptar google.maps.latLng también
		// google.maps.LatLng object, esto no deberia pasar mas, salvo que
		//estes en una configuracion cruzada con gmaps
		if (mezcla.hasOwnProperty("lat") && typeof(mezcla.lat) === 'function') {
			r = new OpenLayers.LonLat(mezcla.lng(),mezcla.lat());
		} 
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
		this.$el = $this;//referencia al objeto jQuery desde el que se inicializó el plugin
		this.divMapa = null//elemento DOM donde estará el mapa. NO JQUERY
		this.mapa = null//referencia al objeto mapa de openlayers
		if(undefined == opciones) opciones = {};
		/**
		 * Array de capas que estan en el mapa. Equivale a OpenLayers.Map.layers
		 * Se utiliza al momento de instanciar el mapa y para buscar por nombre
		 */
		this.capas = [];
		//opciones por defecto
		this.predefinidos = {
			proyeccion: "EPSG:3857",
			centro:[-35,-57],
			capas:[],
			zoom:4,
			tipo: 'baseign',
			// agregarCapaIGN: false,
			// agregarBaseIGN: true,
			listarCapaDeMarcadores: false,
			rutaAlScript: rutaRelativa
		};
		this.depuracion = opciones.depuracion || false;
		
		//merge predefinidos con opciones de usuario
		this.opciones = $.extend({}, this.predefinidos, opciones);
		
		//esto es para que en la version 1.0 de argenmap.jquery
		//sea menos flexible el mapa predeterminado
		switch(this.opciones.tipo.toLowerCase())
		{
			case 'baseign':
				this.opciones.capas.unshift('baseIGN');
			break;
			case 'satelital':
			case 'hibridoign':
				this.opciones.capas.push('satelital');
			break;
			case 'vacio':
			case 'blanco':
			break;
			default:
				this.opciones.capas.unshift('baseIGN');
		}
		// if(this.opciones.agregarCapaIGN) this.opciones.capas.push("IGN");
		// if(this.opciones.agregarBaseIGN) this.opciones.capas.unshift("baseIGN");
	}
	//logica de metodos separada, por obsesividad
	ArgenMap.prototype = {
		inicializar: function()
		{
			// if(this.mapa) return;
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
			
			this.mapa = new OpenLayers.Map(this.divMapa, opcionesDeMapa);
			this.mapa.addControls([
				new OpenLayers.Control.LayerSwitcher(),
				new OpenLayers.Control.Navigation(
            {dragPanOptions: {enableKinetic: true}}
        ),
				new OpenLayers.Control.PinchZoom()
			]);

			// eventos
			this.mapa.events.on({
				addlayer:function(e){this.capas = this.mapa.layers;},
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
			*/
		},
		actualizar: function()
		{
			var h = this.$el.children('div.argenmapMapHeader');
			var f = this.$el.children('div.argenmapMapFooter');
			var c = this.$el.children('div.argenmapMapCanvas');
			c.css('height',(this.$el.innerHeight() - f.outerHeight() - h.outerHeight()) + 'px');
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
				transparente: false,
				formato: "image/jpeg",
				version: "1.1.1",
				servicio: "wms",
				srs: this.opciones.proyeccion,
				noMagic: true,
				esCapaBase: true,
				proyeccion: this.opciones.proyeccion
			};
			var o = traducirObjeto($.extend({},predeterminadasWms,opciones));
			var l = new OpenLayers.Layer.WMS(o.nombre,o.url,o,o);
			if(this.mapa) this.mapa.addLayer(l);
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
					null, true, alCerrarCuadro);
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
					delete f2.cuadro;
				}
			};
			l.events.on({
				featureselected: alSeleccionar,
				featureunselected: alDeSeleccionar
			});
			if(this.mapa) this.mapa.addLayer(l);
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
				delete opciones["lonlat"];
				delete opciones["latlng"];
				delete opciones["lat"];
				delete opciones["lon"];
				delete opciones["lng"];
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
				mostrarConClick: true
			};
			var o = $.extend({},predeterminadasMarcador,opciones);
			if(o.mostrarConClick)
			{
				o.eventos = {
					click: function (e) {
						if (this.popup == null) {
							this.popup = this.createPopup(this.closeBox);
							e.object.map.addPopup(this.popup);
							this.popup.show();
						} else {
							this.popup.toggle();
						}
						// currentPopup = this.popup;
						OpenLayers.Event.stop(e);
					}
				}
			}
			var capa = this._traerCapaPorNombre(o.capa);
			
			if(!capa) capa = this._agregarCapaDeMarcadores({nombre:o.capa,listarCapa:o.listarCapa});
			//kludge
			capa.displayInLayerSwitcher = o.listarCapa;
			var opcionesFeature = {
				lonlat: coordenadas,
				icon:new OpenLayers.Icon(
					this.opciones.rutaAlScript + "img/PinDown1.png",
					new OpenLayers.Size(32,39),
					new OpenLayers.Pixel(-7,-35)
				),
				popupSize: new OpenLayers.Size(200,130),
				popupContentHTML: opciones.contenido,
				overflow: 'auto'
			};
			// capa.setVisibility(false);capa.setVisibility(true);
			o = traducirObjeto(o);
			var f = new OpenLayers.Feature(capa,coordenadas,opcionesFeature);
			// f.$el = $(f.icon.imageDiv);
			var m = f.createMarker();
			f.nombre = m.nombre = o.nombre;
			f.closeBox = true;
			f.popupClass = OpenLayers.Popup.FramedCloud;
			// f = $.extend(f,o);
			t = f;
			// console.log(m);
			if(o.eventos)
			{
				o.eventos.scope = f;
				m.events.on(o.eventos);
			}
			capa.addMarker(m);
		},
		
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
		nivelDeZoom: function(zoom)
		{
			if(this.mapa) this.mapa.zoomTo(zoom);
		},
		/* INTERNAS / PRIVADAS */
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
		_traerCapaPorNombre: function(nombre)
		{
			for(var i = 0; i < this.capas.length; i++)
			{
				if(this.capas[i].nombre == nombre) return this.capas[i];
			}
			return false;
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
		 * @param array Las capa predefinidas a crear (IGN, baseIGN, Google, Bing, KML)
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
						capas: "capabasesigign",
						formato: "image/png",
						singleTile: false,
						transparente: false,
						version: "1.1.1",
						servicio: "wms",
						srs: this.opciones.proyeccion
					});
					o = traducirObjeto({
						esCapaBase: true,
						nombre: "Base IGN",
						noMagic: true,
						proyeccion: this.opciones.proyeccion
					});
					c = new OpenLayers.Layer.WMS("Base IGN","http://www.ign.gob.ar/wms",p,o);
				break;
				case "ign":
					p = traducirObjeto({
						capas: "capabasesigign",
						formato: "image/png",
						transparente: true,
						version: "1.1.1",
						servicio: "wms",
						srs: this.opciones.proyeccion
					});

					o = traducirObjeto({
						nombre: "IGN",
						noMagic: true,
						singleTile: false,
						esCapaBase: false,
						proyeccion: this.opciones.proyeccion
					});
					o = $.extend({},o,extras);
					c = new OpenLayers.Layer.WMS("IGN","http://www.ign.gob.ar/wms",p,o);
				break;
				case "bing":
					//corte temprano para evitar instancia de capa si el mapa
					//no esta en spherical mercator
					if(this.opciones.proyeccion != "EPSG:3857" || this.opciones.proyeccion != "EPSG:900913")
						return c;
					if(extras && extras.key)
					c = new OpenLayers.Layer.Bing({
							name: "Aérea (Bing)",
							isBaseLayer:true,
							nombre: "Aérea (Bing)",
							key: extras.key,//"Ang2jMeTgBWgNdYC_GbPxP37Gs1pYJXN-byoKn8zGW39FsxwZ3o7N2kvcdDbrnb_",
							type: "Aerial"
					});
				break;
				case "satelital_base":
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
						// console.log('tierra llamando a google');
						//async load de api de google segun guias
						//https://developers.google.com/maps/documentation/javascript/tutorial#Loading_the_Maps_API
						window["argenmapGoogleAPICallback"] = $.proxy(function()
						{
							window["argenmapGoogleAPICallback"] = null;
							delete window["argenmapGoogleAPICallback"];
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
							numZoomLevels:20,
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
			var a = $('<a target="_blank" href="http://www.ign.gob.ar/argenmap/argenmap.jquery/docs" />')
				.append('<img src="http://www.ign.gob.ar/argenmap/argenmap.jquery/img/ign-logo-255x45.png" />');
			var h = $('<div class="argenmapMapHeader" />')
				.css({
					'background-color': 'rgb(0, 54, 79)',
					height: '50px',
					color: 'white',
					'text-align': 'left',
					padding: 0,
					border:0,
					margin:0
				})
				.append(a);
			var f = $('<div class="argenmapMapFooter" />')
				.css({
					'font-family': 'Arial',
					color: 'white',
					'background-color': 'rgb(0, 54, 79)',
					'font-size': '10px',
					'text-align': 'right',
					height: '20px',
					padding: '2px 5px',
					margin:0,
					border:0})
				.append('<a style="color:white;text-decoration:underline;font-weight:normal" target="_blank" href="http://www.ign.gob.ar/argenmap/argenmap.jquery/docs/datosvectoriales.html">Topónimos, datos vectoriales - 2012 IGN Argentina</a>');
			var c = $('<div class="argenmapMapCanvas" />')
				.css({
					padding:0,//reset de padding, de nuevo, por si las flies
					margin:0,//idem
					border:0,//idem
					width: '100%',
					'min-height': '150px',
					height:(alto - f.outerHeight() - h.outerHeight()) + 'px',
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
				this.$el.append(h).append(c).append(f);
		}
	}
	$.isNumeric = function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	}
	
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
	/*
	mi idea es que al final haya un agregarCapa(opts), en las opts tiene que ir un "tipo"
	que luego sea el switch para mandar a funciones de conveniencia: agregarCapaWMS, agregarCapaKML
	Cuando el parametro de agregarCapa sea solo un string, intentar agregarCapaPredefinida(string)
	Aun asi, los convenience tienen que existir: $(o).agregarCapaWMS, etc etc
	Con esto, y con tiempo, podemos armar un diccionario de capas predefinidas,
	hoy existen solo base IGN, IGN, Bing y Google, pero bien podriamos ir incrementando
	este diccionario con cosas como "Idera Chaco" o "Satelital 500k" donde cada una ya
	tiene todas las opciones predefinidas.
	*/
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
	$.fn.centrarMapa = function(lat,lon,zoom)
	{
		if(undefined == lat || undefined == lon) return this;
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			
			a.centrarMapa(lat,lon,zoom);
		});
	}
	$.fn.nivelDeZoom = function(zoom)
	{
		if(undefined == zoom) return this;
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			
			a.nivelDeZoom(zoom);
		});
	}
})(jQuery, window);
