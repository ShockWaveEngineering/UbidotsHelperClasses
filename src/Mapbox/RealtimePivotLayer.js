class RealtimePivotLayer
{
	constructor(name, mapObject, centreCoordinatesVariable, endCoordinatesVariable)
	{
		//----Update member variables/references
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

		//----Subscribe to updates from the variables
		const _localRef = this;
		this.centreCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onCentreCoordinatesUpdated(event);
		});
		this.endCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onEndCoordinatesUpdated(event);
		});
		
		//----Add initial sources and layers
		this.mapObject.on('style.load', function()
		{
			//console.log("this.mapObject.on.style.load()");
			_localRef.addSource();
			_localRef.addLayer();
		});
	}
	//Function for retrieving the end data for the end source
	getSourceDataForPivotEnd()
	{
		const geojson_realtime_pivot = 
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

		//try update the coordinates for the line
		if(this.endCoordinatesVariable.context != undefined)
		{
			//get the coordinates
			let _endLat = this.endCoordinatesVariable.context.lat;
			let _endLng = this.endCoordinatesVariable.context.lng;
			//update the coordinates
			geojson_realtime_pivot.features[0].geometry.coordinates = [_endLng, _endLat];
		}

		//console.log(`getSourceDataForPivotEnd(), geojson_realtime_pivot: ${JSON.stringify(geojson_realtime_pivot)}`);

		return geojson_realtime_pivot;		
	}
	//Function for retrieving the line data for the line source
	getSourceDataForPivotLine()
	{
		//data to give to source for line
		const geojson_realtime_pivot_line = 
		{
			'type': 'Feature',
			'properties': {},	
			'geometry': 
			{
				'type': 'LineString',
				'coordinates': [[0,0],[0,0]]
			}	
		};

		//try update the coordinates for the line
		if(this.centreCoordinatesVariable.context != undefined && this.endCoordinatesVariable.context != undefined)
		{
			//get the coordinates
			let _centreLat = this.centreCoordinatesVariable.context.lat;
			let _centreLng = this.centreCoordinatesVariable.context.lng;
			let _endLat = this.endCoordinatesVariable.context.lat;
			let _endLng = this.endCoordinatesVariable.context.lng;
			//update the coordinates
			geojson_realtime_pivot_line.geometry.coordinates[0] = [_centreLng, _centreLat];
			geojson_realtime_pivot_line.geometry.coordinates[1] = [_endLng, _endLat];
		}

		//console.log(`getSourceDataForPivotLine(), geojson_realtime_pivot_line: ${JSON.stringify(geojson_realtime_pivot_line)}`);

		return geojson_realtime_pivot_line;
	}
	//callback handler for when the centre coordinates are updated
	onCentreCoordinatesUpdated(event)
	{
		//console.log(`onCentreCoordinatesUpdated() event.detail: ${JSON.stringify(event.detail)}`);		
		let  pivotEndData = this.getSourceDataForPivotEnd();
		this.mapObject.getSource(this.endPointSourceName).setData(pivotEndData);
		let  pivotLineData = this.getSourceDataForPivotLine();		
		this.mapObject.getSource(this.lineSourceName).setData(pivotLineData);
	}
	//callback handler for when the end coordinates are updated
	onEndCoordinatesUpdated(event)
	{
		//console.log(`onEndCoordinatesUpdated() event.detail: ${JSON.stringify(event.detail)}`);		
		let  pivotEndData = this.getSourceDataForPivotEnd();
		this.mapObject.getSource(this.endPointSourceName).setData(pivotEndData);
		let  pivotLineData = this.getSourceDataForPivotLine();		
		this.mapObject.getSource(this.lineSourceName).setData(pivotLineData);
	}

	//only gets called once
	addSource()
	{
		//console.log("addSource()");
		//create initial data objects for the source
		let pivotEndData = this.getSourceDataForPivotEnd();		
		let pivotLineData = this.getSourceDataForPivotLine();

		//Add the sources with the initial data
		this.mapObject.addSource(this.endPointSourceName, 
		{
			'type': 'geojson',
			'data': pivotEndData
		});

		this.mapObject.addSource(this.lineSourceName, 
		{
			'type': 'geojson',
			'data': pivotLineData
		});
	}
	//remove the layer
	removeLayer()
	{
		if(this.mapObject.getLayer(this.endPointLayerName))
		{
			this.mapObject.removeLayer(this.endPointLayerName);
		}
		if(this.mapObject.getLayer(this.lineLayerName))
		{
			this.mapObject.removeLayer(this.lineLayerName);
		}	
	}
	//add a layer based on source
	addLayer()
	{
		let realtime_pivot_color = "#FFFFFF";
		let realtime_pivot_line_width = 2;
		let realtime_pivot_end_radius = 8;
		//add layer representing the pivot end position
		this.mapObject.addLayer(
		{
			'id': this.endPointLayerName,
			'type': 'circle',
			'source': this.endPointSourceName,
			'paint': 
			{
				'circle-radius': realtime_pivot_end_radius,
				'circle-color': realtime_pivot_color
			}
		});

		this.mapObject.addLayer(
		{
			'id': this.lineLayerName,
			'type': 'line',
			'source': this.lineSourceName,
			'layout': {
				'line-join': 'round',
				'line-cap': 'round',
				'visibility':'visible'
			},
			'paint': {
				'line-color': realtime_pivot_color,
				'line-width': realtime_pivot_line_width
			}
		});
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