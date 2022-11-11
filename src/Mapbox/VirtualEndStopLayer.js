class VirtualEndStopLayer
{
	constructor(name, mapObject, centreCoordinatesVariable, endCoordinatesVariable, endStopBearingVariable)
	{
		//----Visuals
		this.endStopLengthUI = 0.05; //km //end stop ui handle offset from pivot diameter/radius

		//----Setting member variables
		this.name = name;
		//source names
		this.endPointSourceName = this.name + '_endPoint_source';
		this.lineSourceName = this.name + '_line_source';
		//layer names
		this.endPointLayerName = this.name + '_endPoint_layer';
		this.lineLayerName = this.name + '_line_layer';

		this.mapObject = mapObject;
		this.centreCoordinatesVariable = centreCoordinatesVariable;
		this.endCoordinatesVariable = endCoordinatesVariable;
		this.endStopBearingVariable = endStopBearingVariable;

		//----Subscribe to updates from the variables
		const _localRef = this;
		this.centreCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onCentreCoordinatesUpdated(event);
		});
		this.endCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onEndCoordinatesUpdated(event);
		});
		this.endStopBearingVariable.addEventListener('onUpdate', function(event){			
			_localRef.onEndStopBearingUpdated(event);
		});
		
		//----Add initial sources and layers
		this.mapObject.on('style.load', function()
		{
			//console.log("VirtualEndStopLayer map.style.load");
			_localRef.addSource();
			_localRef.addLayer();
		});

		//----Moving the end stop		
		this.beingDragged = false;
		//mouse
		this.mapObject.on('mousedown', this.endPointLayerName, function(event){
			 _localRef.onMouseDown(event);
		});
		this.mapObject.on('mousemove', function(event){
			 _localRef.onCursorDrag(event);
		});
		this.mapObject.on('mouseup', function(event){
			 _localRef.onCursorUp(event);
		});

		//touch
		this.mapObject.on('touchstart', this.endPointLayerName, function(event)
		{
			if (event.points.length !== 1) return; // more than one touch on the screen
			_localRef.onMouseDown(event);
		});
		this.mapObject.on('touchmove', function(event)
		{			
			_localRef.onCursorDrag(event);
		});
		this.mapObject.on('touchend', function(event)
		{			
			_localRef.onCursorUp(event);
		});
	}
	onMouseDown(event)
	{
		console.log(`onMouseDown for ${this.name}`);

		// Prevent the default map drag behavior (should already be off as map isn't interactable)
		event.preventDefault();

		//stop the user being able to scroll the whole page with touch
		//this.mapObject.getContainer().style.touchAction = "none";

		//visual aspect of the end stop
		this.mapObject.setPaintProperty(this.endPointLayerName, 'circle-color', '#b33737');
		this.mapObject.setPaintProperty(this.lineLayerName, 'line-color', '#b33737');
		this.mapObject.getCanvas().style.cursor = 'grab';

		this.beingDragged = true;
	}
	onCursorDrag(event)
	{
		if(!this.beingDragged)
		{
			return;
		}
		console.log(`onCursorDrag for ${this.name}`);

		//stop the user being able to scroll the whole page with touch
		//this.mapObject.getContainer().style.touchAction = "none";

		//Mouse cursor coords
		let _mouseCoordinates = [event.lngLat.lng, event.lngLat.lat];
		let _mousePoint = turf.point(_mouseCoordinates);

		//Centre coords
		let _centreCoords = [0,0];
		if(this.centreCoordinatesVariable.context != undefined)
		{
			_centreCoords = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
		}
		let _centrePoint = turf.point(_centreCoords);

		//get the bearing from the centre_coords to the mouse_coords with turf.js	
		let _mouseBearing = turf.bearing(_centrePoint, _mousePoint);
		
		// Set a UI indicator for dragging.		
		this.mapObject.getCanvas().style.cursor = 'grabbing';
		
		let _endPointSourceData = this.getEndPointSourceData(_mouseBearing);
		this.mapObject.getSource(this.endPointSourceName).setData(_endPointSourceData);
		
		let _lineSourceData = this.getLineSourceData(_mouseBearing);
		this.mapObject.getSource(this.lineSourceName).setData(_lineSourceData);
	}
	onCursorUp(event)
	{	
		if(!this.beingDragged)
		{
			return; //we do not want to upload the end stop based on the mouse cursor if we are not being dragged
		}
		this.beingDragged = false;

		//allow the user being able to scroll the whole page with touch
		//this.mapObject.getContainer().style.touchAction = "auto";

		console.log(`onCursorUp for ${this.name}`);

		//visual aspect
		this.mapObject.setPaintProperty(this.endPointLayerName, 'circle-color', '#f84c4c');
		this.mapObject.setPaintProperty(this.lineLayerName, 'line-color', '#f84c4c');
		this.mapObject.getCanvas().style.cursor = '';

		//Mouse cursor coords
		let _mouseCoordinates = [event.lngLat.lng, event.lngLat.lat];
		let _mousePoint = turf.point(_mouseCoordinates);

		//Centre coords
		let _centreCoords = [0,0];
		if(this.centreCoordinatesVariable.context != undefined)
		{
			_centreCoords = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
		}
		let _centrePoint = turf.point(_centreCoords);

		//get the bearing from the centre_coords to the mouse_coords with turf.js	
		let _mouseBearing = turf.bearing(_centrePoint, _mousePoint);
		
		// Set a UI indicator for dragging.		
		this.mapObject.getCanvas().style.cursor = '';

		let _endPointSourceData = this.getEndPointSourceData(_mouseBearing);
		this.mapObject.getSource(this.endPointSourceName).setData(_endPointSourceData);
		
		let _lineSourceData = this.getLineSourceData(_mouseBearing);
		this.mapObject.getSource(this.lineSourceName).setData(_lineSourceData);

		//publish the new endstop bearing
		let _context = {
			enabled: true,
			action: "bounce"
		};
		this.endStopBearingVariable.updateUbidotsVariable(_mouseBearing, JSON.stringify(_context));

	}

	getEndPointSourceData(bearingParameter)
	{
		let geojson_end_stop_1 = 
		{
			'type': 'FeatureCollection',
			'features': 
			[
				{
					'type': 'Feature',
					'geometry': 
					{
						'type': 'Point',
						'coordinates': [0, 0]
					}
				}
			]
		};

		//Get the centre of the pivot
		let _centreCoordinates = [0,0];
		if(this.centreCoordinatesVariable.context != undefined)
		{
			_centreCoordinates = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
		}
		let _centrePoint = turf.point(_centreCoordinates);


		//End stop bearing
		let _endStopBearing = 0;
		//from ubidots
		if(this.endStopBearingVariable.value != undefined)
		{
			_endStopBearing = this.endStopBearingVariable.value;
		}
		//from parameter if it exists
		if(bearingParameter != undefined)
		{
			//console.log("bearingParameter != undefined");
			_endStopBearing = bearingParameter;
		}

		//Pivot Radius
		let _pivotRadius = 0.3; //km
		if(this.endCoordinatesVariable.context != undefined && this.centreCoordinatesVariable.context != undefined)
		{
			let _centreCoords = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
			let _endCoords = [this.endCoordinatesVariable.context.lng, this.endCoordinatesVariable.context.lat];
			_pivotRadius = turf.distance(_centreCoords, _endCoords, {units: 'kilometers'});
		}

		//Radius of the end stop UI
		
		let _endStopLengthUI = _pivotRadius + this.endStopLengthUI;

		//Calculate coordinates of the end stop ui handle/ dot
		let _endPoint = turf.destination(_centrePoint, _endStopLengthUI, _endStopBearing);
		
		//update the 0th feature in 'geojson_end_stop_1' (aka the draggable element)
		geojson_end_stop_1.features[0].geometry.coordinates = [_endPoint.geometry.coordinates[0], _endPoint.geometry.coordinates[1]];		

		return geojson_end_stop_1;
	}
	
	getLineSourceData(bearingParameter)
	{
		let geojson_end_stop_1_line = 
		{
			'type': 'Feature',
			'properties': {},	
			'geometry': 
			{
				'type': 'LineString',
				'coordinates': [[0,0],[0,0]]
			}		
		};

		//Get the centre of the pivot
		let _centreCoordinates = [0,0];
		if(this.centreCoordinatesVariable.context != undefined)
		{
			_centreCoordinates = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
		}
		let _centrePoint = turf.point(_centreCoordinates);

		//End stop bearing
		let _endStopBearing = 0;
		//from ubidots
		if(this.endStopBearingVariable.value != undefined)
		{
			_endStopBearing = this.endStopBearingVariable.value;
		}
		//from parameter if it exists
		if(bearingParameter != undefined)
		{
			//console.log("bearingParameter != undefined");
			_endStopBearing = bearingParameter;
		}

		//Pivot Radius
		let _pivotRadius = 0.3; //km
		if(this.endCoordinatesVariable.context != undefined && this.centreCoordinatesVariable.context != undefined)
		{
			let _centreCoords = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
			let _endCoords = [this.endCoordinatesVariable.context.lng, this.endCoordinatesVariable.context.lat];
			_pivotRadius = turf.distance(_centreCoords, _endCoords, {units: 'kilometers'});
		}

		//Radius of the end stop UI
		let _endStopLengthUI = _pivotRadius + this.endStopLengthUI;

		//Calculate coordinates of the end stop ui handle/ dot
		let _endPoint = turf.destination(_centrePoint, _endStopLengthUI, _endStopBearing);

		geojson_end_stop_1_line.geometry.coordinates[0] = _centreCoordinates;
		geojson_end_stop_1_line.geometry.coordinates[1] = [_endPoint.geometry.coordinates[0], _endPoint.geometry.coordinates[1]];

		return geojson_end_stop_1_line;
	}
	addSource()
	{
		//end point / handle
		let _endPointSourceData = this.getEndPointSourceData();
		this.mapObject.addSource(this.endPointSourceName,
		{
			'type': 'geojson',
			'data': _endPointSourceData
		});

		// line
		let _lineSourceData = this.getLineSourceData();
		this.mapObject.addSource(this.lineSourceName, 
		{
			'type': 'geojson',
			'data': _lineSourceData
		});
	}
	addLayer()
	{
		this.mapObject.addLayer(
		{
			'id': this.endPointLayerName,
			'type': 'circle',
			'source': this.endPointSourceName,
			'paint': 
			{
				'circle-radius': 10,
				'circle-color': '#f84c4c' //
			}
		});

		this.mapObject.addLayer(
		{
			'id': this.lineLayerName,
			'type': 'line',
			'source': this.lineSourceName,
			'layout': {
				'line-join': 'round',
				'line-cap': 'round'
			},
			'paint': {
				'line-color': '#f84c4c',
				'line-width': 4
			}
		});
	}
	onCentreCoordinatesUpdated(event)
	{
		let _endPointSourceData = this.getEndPointSourceData();
		this.mapObject.getSource(this.endPointSourceName).setData(_endPointSourceData);

		let _lineSourceData = this.getLineSourceData();
		this.mapObject.getSource(this.lineSourceName).setData(_lineSourceData);
	}
	onEndCoordinatesUpdated(event)
	{
		let _endPointSourceData = this.getEndPointSourceData();
		this.mapObject.getSource(this.endPointSourceName).setData(_endPointSourceData);

		let _lineSourceData = this.getLineSourceData();
		this.mapObject.getSource(this.lineSourceName).setData(_lineSourceData);
	}
	onEndStopBearingUpdated(event)
	{
		let _endPointSourceData = this.getEndPointSourceData();
		this.mapObject.getSource(this.endPointSourceName).setData(_endPointSourceData);

		let _lineSourceData = this.getLineSourceData();
		this.mapObject.getSource(this.lineSourceName).setData(_lineSourceData);
	}
	showLayer()
	{
		if(this.mapObject.getLayer(this.endPointLayerName))
		{
			this.mapObject.setLayoutProperty(this.endPointLayerName, 'visibility', 'visible');
		}
		if(this.mapObject.getLayer(this.lineLayerName))
		{
			this.mapObject.setLayoutProperty(this.lineLayerName, 'visibility', 'visible');
		}
	}
	hideLayer()
	{
		if(this.mapObject.getLayer(this.endPointLayerName))
		{
			this.mapObject.setLayoutProperty(this.endPointLayerName, 'visibility', 'none');
		}
		if(this.mapObject.getLayer(this.lineLayerName))
		{
			this.mapObject.setLayoutProperty(this.lineLayerName, 'visibility', 'none');
		}
	}
}