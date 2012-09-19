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
		servicio: 'service'
	}
	/**
	 * Traduce un objeto a traves del mapa de propiedades
	 * para ser utilizado por las clases de OpenLayers
	 */
	function traducirObjeto(objeto)
	{
		var resultado = {};
		for(var k in objeto)
		{
			if(typeof(mapaDePropiedades[k]) != "undefined")
			{
				resultado[mapaDePropiedades[k]] = objeto[k];
			}else{
				resultado[k] = objeto[k];
			}
		}
		return resultado;
	}
	/**
	 * Devuelve un objeto OpenLayers.LonLat
	 * @param coords mixed Un par de coordenadas objeto/array
	 * @param proyeccion string Codigo EPSG que defina el sistema de
	 * coordenadas en el que se quiere el resultado
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
	function leerPlanas(mezcla)
	{
		var ll = leerLonLat(mezcla);
		if(!ll || !$.isNumeric(ll.lon) || !$.isNumeric(ll.lat)) return ll;
		//lo lamento por la gente que quiera usar una coordenada 3857 a menos de 180 metros del 0,0
		if( (ll.lat > 180 || ll.lat < -180) || (ll.lon > 180 || ll.lon < -180) ) return ll;//se asume 3857
		if( typeof(ll.transform) === "function" )
		{
			return ll.transform("EPSG:4326", "EPSG:3857");
		}else{
			return ll;
		}
	}
	function leerLonLat(mezcla)
	{
		var empty = null;
		var r = empty;
		if (!mezcla || (typeof(mezcla) === 'string')){
			r = empty;
		}
		//si tiene un objeto lonlat o latLng recursea con ese property
		if(mezcla.lonlat) {
			r = toLatLng(mezcla.lonlat);
		}else if(mezcla.latLng) {//si es un {todo} con action y latLng
			r = toLatLng(mezcla.latLng);
		}
		
		// google.maps.LatLng object, esto no deberia pasar mas, salvo que
		//estes en una configuracion cruzada con gmaps
		if (typeof(mezcla.lat) === 'function') {
			r = new OpenLayers.LonLat(mezcla.lng(),mezcla.lat());
		} 
		// {lat:X, lon:Y} object, el argument es un OL.LonLat o similar!!! vuelve clonado
		else if ( $.isNumeric(mezcla.lat) && $.isNumeric(mezcla.lon) ) {
			r = new OpenLayers.LonLat(mezcla.lon,mezcla.lat);
		}
		// [X, Y] object: este caso es cuando es un array, de ser asi asumo que es [lat,lon] (lat PRIMERO!)
		else if ($.isArray(mezcla)){ 
			if ( !$.isNumeric(mezcla[0]) || !$.isNumeric(mezcla[1]) ) {
				r = empty;
			}else{
				r = new OpenLayers.LonLat(mezcla[1], mezcla[0]);
			}
		}
		//adivinacion de epsg, fallaria solo si es una plana a menos de 180m del 0,0
		if( r && (r.lat > 180 || r.lat < -180) || (r.lon > 180 || r.lon < -180) ) r.transform("EPSG:3857","EPSG:4326");
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
			agregarCapaIGN: true,
			agregarBaseIGN: true
		};
		this.depuracion = opciones.depuracion || false;
		
		//merge predefinidos con opciones de usuario
		this.opciones = $.extend({}, this.predefinidos, opciones);
		if(this.opciones.agregarCapaIGN) this.opciones.capas.push("IGN");
		if(this.opciones.agregarBaseIGN) this.opciones.capas.push("baseIGN");
	}
	//logica de metodos separada, por obsesividad
	ArgenMap.prototype = {
		inicializar: function()
		{
			if(this.mapa) return;
			this._prepararDiv();
			//al inicializar no necesito agregar las capas, las paso como array en las opciones
			//este es el unico momento en el que this.mapa.layers = this.capas,
			//luego seran siempre copiadas al reves (this.capas = this.mapa.layers)
			this._crearCapasPredefinidas(this.opciones.capas);
			var o = {
				centro: leerCoordenadas(this.opciones.centro,this.opciones.proyeccion),
				capas: this.capas
			};
			
			//tuve que hacer esto porque OL no arranca sin capa base, y tampoco puedo
			//forzar a tener una capa base. Que diria Lugosi si no se puede tener un mapa sin base?
			if(!this._corroborarCapaBase(o.capas))
				o.capas.push(new OpenLayers.Layer.Vector("sin base",{isBaseLayer:true}));
				
			o.capas.push(new OpenLayers.Layer.Markers("Marcadores",{displayInLayerSwitcher:false}));
				
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
		agregarCapa: function(opciones)
		{
			if(!this.mapa) return;//catch por las dudas
			
			/*si es string intentamos una capa predefinida, ojo corte prematuro*/
			if(typeof(opciones) == "string")
			{
				var c = this._crearCapaPredefinida(opciones.toLowerCase());
				this.mapa.addLayer(c);
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
			}
		},
		agregarCapaWMS: function(opciones)
		{
			var predeterminadasWms = {
				esCapaBase: true,
				singleTile: false,
				transparente: false,
				formato: "image/jpg",
				version: "1.1.1",
				servicio: "wms",
				srs: this.opciones.proyeccion,
				noMagic: true,
				proyeccion: this.opciones.proyeccion
			};
			var o = traducirObjeto($.extend({},predeterminadasWms,opciones));
			var l = new OpenLayers.Layer.WMS(o.nombre,o.url,o,o);
			if(this.mapa) this.mapa.addLayer(l);
		},
		agregarMarcador: function(opciones)
		{
			console.log(opciones);
		},
		/* INTERNAS / PRIVADAS */
		_traerCapaPorNombre: function(nombre)
		{
			for(var i = 0; i < this.capas.length; i++)
			{
				if(this.capas[i].nombre = nombre) return this.capas[i];
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
				if(undefined != capasArray[i].isBaseLayer && capasArray[i].isBaseLayer == true)
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
		_crearCapaPredefinida: function(capaString)
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
						esCapaBase: true,
						singleTile: false,
						transparente: false,
						version: "1.1.1",
						servicio: "wms",
						srs: this.opciones.proyeccion
					});
					o = traducirObjeto({
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
						noMagic: true,
						singleTile: false,
						esCapaBase: false,
						proyeccion: this.opciones.proyeccion
					});
					c = new OpenLayers.Layer.WMS("IGN","http://www.ign.gob.ar/wms",p,o);
				break;
				case "bing":
				case "google":
				break;
			}
			/*si no hay mapa simplemente la agregamos a las capas de argenmap*/
			if(!this.mapa) this.capas.push(c);
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
					'min-height': '200px',
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
	$.fn.argenmap = function(opciones)
	{
		//if(!this.length) return [];
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
	//prueba modelo de subplugins
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
	$.fn.agregarCapa = function(opciones)
	{
		//chainability
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			// var capa = null;
			// capa = a._crearCapaWMS(opciones);
			// if(capa) a._agregarCapa(capa);
			a.agregarCapa(opciones);
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
	$.fn.agregarMarcador = function(opciones)
	{
		return this.each(function(){
			var $this = $(this);
			var a = $this.data('argenmap');
			if(!a) return;
			a.agregarMarcador(opciones);
		});
	}
})(jQuery, window);
