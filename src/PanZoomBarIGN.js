OpenLayers.Control.PanZoomBarIGN=OpenLayers.Class(OpenLayers.Control.PanZoom,{
	//no se usa?
	// zoomStopWidth:29,

	//???? pixel step por cada zoom para el handler/knob?
	zoomStopHeight:9,

	//posizion Y del zoomBar, top de css
	zoomBarTop:30,
	zoomBarLeft:0,
	zoomBarHeight:196,
	zoomBar:true,
	slider:null,
	sliderEvents:null,
	zoombarDiv:null,
	forceFixedZoomLevel:true,
	mouseDragStart:null,
	deltaY:null,
	zoomStart:null,

	//es el top del handler/knob al maximo nivel de zoom (top)
	startTop:22,

	//el minHeight es el minimo de alto del map.div
	//para que se renderee el zoombar
	minHeight:315,
	destroy:function(){
		if(this.zoombarDiv) {
			this._removeZoomBar();
		}
		this.map.events.un({
			"changebaselayer":this.redraw,
			"updatesize":this.redraw,
			scope:this
		});
		OpenLayers.Control.PanZoom.prototype.destroy.apply(this,arguments);
		delete this.mouseDragStart;
		delete this.zoomStart;
	},
	setMap:function(map){
		OpenLayers.Control.PanZoom.prototype.setMap.apply(this,arguments);
		this.map.events.on({
			"changebaselayer":this.redraw,
			"updatesize":this.redraw,
			scope:this
		});

	},
	redraw:function(){
		if(this.div!=null){
			this.removeButtons();
			if(this.zoombarDiv) {
				this._removeZoomBar();
			}
		}
		this.draw();
	},
	draw:function(px){
		OpenLayers.Control.prototype.draw.apply(this,arguments);
		this.buttons=[];
		this._addHtmlButton("zoomin","<span class=\"olIgnIconos iconoMas\" title=\"Acercar\"><div class='mas_parte1'></div><div class='mas_parte2'></div></span>","static");
		if(this.zoomBar && this.map.viewPortDiv.clientHeight > this.minHeight){
			this._addZoomBar(new OpenLayers.Pixel(this.zoomBarLeft,this.zoomBarTop));
		}
		this._addHtmlButton("zoomout","<span class=\"olIgnIconos iconoMenos\" title=\"Alejar\"><div class='menos'></div></span>","static");
		return this.div;
	},
	_addZoomBar:function(centered){
		// var imgLocation=OpenLayers.Util.getImageLocation("knob.png");
		var id = this.id + "_" + this.map.id;
		var minZoom = 0;//this.map.getMinZoom();
		//zoomsToEnd me devuelve un entero que corresponde a cuantos steps desde top se va a ubicar el slider
		//ej: 20 - 1 - 19 (nivel de zoom mas alto) = 0
		//ej: 20 - 1 - 0 (nivel de zoom mas alto) = 19
		//entonces, en zoom(0) tiene que ser el punto mas bajo y en zoom(19) el punto mas alto
		//este numero, multiplicado por zoomStopHeight deberia dar el top en px del slider
		var zoomsToEnd = this.map.getNumZoomLevels() - 1 - this.map.getZoom();
		var slider = OpenLayers.Util.createDiv(id,centered.add(0,zoomsToEnd*this.zoomStopHeight),null,null,"absolute");
		slider.className="handler";
		slider.innerHTML="<span class=\"olIgnIconos handler\"></span>";
		slider.style.cursor="move";
		this.slider=slider;
		this.sliderEvents=new OpenLayers.Events(this,slider,null,true,{includeXY:true});
		this.sliderEvents.on({
			"touchstart":this.zoomBarDown,
			"touchmove":this.zoomBarDrag,
			"touchend":this.zoomBarUp,
			"mousedown":this.zoomBarDown,
			"mousemove":this.zoomBarDrag,
			"mouseup":this.zoomBarUp
		});
		//no se usa...?
		/*
		var sz={
			w:this.zoomStopWidth,
			h:this.zoomStopHeight*(this.map.getNumZoomLevels()-minZoom)
		};
		*/
		//este es el zoomBar, la guia del slider
		var div=null;
		div=OpenLayers.Util.createDiv('OpenLayers_Control_PanZoomBar_Zoombar'+this.map.id,null,null,null,"static");
		div.style.cursor="pointer";div.className="olButton zoombar";
		div.innerHTML="<div class=\"zoomBarBg\"></div>";
		this.zoombarDiv=div;
		this.div.appendChild(div);
		
		this.div.appendChild(slider);
		this.map.events.register("zoomend",this,this.moveZoomBar);
		centered = centered.add(0,this.zoomStopHeight * (this.map.getNumZoomLevels() - minZoom));
		return centered;
	},
	_removeZoomBar:function(){
		this.sliderEvents.un({
			"touchstart":this.zoomBarDown,
			"touchmove":this.zoomBarDrag,
			"touchend":this.zoomBarUp,
			"mousedown":this.zoomBarDown,
			"mousemove":this.zoomBarDrag,
			"mouseup":this.zoomBarUp
		});
		this.sliderEvents.destroy();
		this.div.removeChild(this.zoombarDiv);
		this.zoombarDiv=null;
		this.div.removeChild(this.slider);
		this.slider=null;
		this.map.events.unregister("zoomend",this,this.moveZoomBar);
	},
	onButtonClick:function(evt){
		OpenLayers.Control.PanZoom.prototype.onButtonClick.apply(this,arguments);
		if(evt.buttonElement===this.zoombarDiv){
			var levels = evt.buttonXY.y / this.zoomStopHeight;
			if(this.forceFixedZoomLevel||!this.map.fractionalZoom){
				levels= levels << 0;
			}
			var zoom=(this.map.getNumZoomLevels()-1)-levels;
			zoom=Math.min(Math.max(zoom,0),this.map.getNumZoomLevels()-1);
			this.map.zoomTo(zoom);
		}
	},
	passEventToSlider:function(evt){
		this.sliderEvents.handleBrowserEvent(evt);
	},
	zoomBarDown:function(evt){
		if(!OpenLayers.Event.isLeftClick(evt)&&!OpenLayers.Event.isSingleTouch(evt)){
			return;
		}
		this.map.events.on({
			"touchmove":this.passEventToSlider,
			"mousemove":this.passEventToSlider,
			"mouseup":this.passEventToSlider,
			scope:this
		});
		this.mouseDragStart=evt.xy.clone();
		this.zoomStart=evt.xy.clone();
		this.div.style.cursor="move";
		this.zoombarDiv.offsets=null;
		OpenLayers.Event.stop(evt);
	},
	zoomBarDrag:function(evt){
		if(this.mouseDragStart!=null){
			var deltaY=this.mouseDragStart.y-evt.xy.y;
			var offsets=OpenLayers.Util.pagePosition(this.zoombarDiv);
			if( (evt.clientY - offsets[1] - this.zoomStopHeight / 2) >  0 && (evt.clientY - offsets[1]) < this.zoomBarHeight - 2) {
				this.slider.style.top=String(parseInt(this.slider.style.top, 10) - deltaY)+"px";
				this.mouseDragStart=evt.xy.clone();
			}
			this.deltaY=this.zoomStart.y-evt.xy.y;
			OpenLayers.Event.stop(evt);
		}
	},
	zoomBarUp:function(evt){
		if(!OpenLayers.Event.isLeftClick(evt)&&evt.type!=="touchend"){
			return;
		}
		if(this.mouseDragStart){
			this.div.style.cursor="";
			this.map.events.un({
				"touchmove":this.passEventToSlider,
				"mouseup":this.passEventToSlider,
				"mousemove":this.passEventToSlider,
				scope:this
			});
			var zoomLevel=this.map.zoom;
			if(!this.forceFixedZoomLevel&&this.map.fractionalZoom){
				zoomLevel+=this.deltaY/this.zoomStopHeight;
			}else{
				zoomLevel+=this.deltaY/this.zoomStopHeight;
				zoomLevel=Math.max(Math.round(zoomLevel),0);
			}
			zoomLevel=Math.min(Math.max(zoomLevel,0),this.map.getNumZoomLevels()-1);
			this.map.zoomTo(zoomLevel);
			this.mouseDragStart=null;
			this.zoomStart=null;
			this.deltaY=0;
			OpenLayers.Event.stop(evt);
		}
	},
	moveZoomBar:function(){
		var newTop=((this.map.getNumZoomLevels()-1)-this.map.getZoom())*this.zoomStopHeight+this.startTop+1;
		this.slider.style.top=newTop+"px";
	},
	_addHtmlButton:function(id,html,position,xy,sz){
		var btn=OpenLayers.Util.createDiv(this.id+"_"+id,xy,sz,null,position);
		btn.innerHTML=html;
		btn.style.cursor="pointer";
		this.div.appendChild(btn);
		btn.action=id;
		btn.className="olButton "+id;
		this.buttons.push(btn);
		return btn;
	},
	CLASS_NAME:"OpenLayers.Control.PanZoomBarIGN"
});
