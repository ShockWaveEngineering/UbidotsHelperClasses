class VariableApplicationRateLayer
{
	constructor(name, mapObject, centreCoordinatesVariable, endCoordinatesVariable, variableApplicationRateVariable)
	{
		//----Update member variables/references
		this.name = name;
		//source names
		this.sourceName = this.name + '_source';
		//layer names
		this.fillLayerName = this.name + '_fill_layer';
		this.outlineLayerName = this.name + '_outline_layer';

		this.mapObject = mapObject;
		this.centreCoordinatesVariable = centreCoordinatesVariable;
		this.endCoordinatesVariable = endCoordinatesVariable;
		this.variableApplicationRateVariable = variableApplicationRateVariable;

		//----Subscribe to updates from the variables
		const _localRef = this;
		this.centreCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onCentreCoordinatesUpdated(event);
		});
		this.endCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onEndCoordinatesUpdated(event);
		});
		this.variableApplicationRateVariable.addEventListener('onUpdate', function(event){			
			_localRef.onVariableApplicationRateUpdated(event);
		});
		
		//----Add initial sources and layers
		this.mapObject.on('style.load', function()
		{
			//console.log("this.mapObject.on.style.load()");
			_localRef.addSource();
			_localRef.addLayer();
		});

		//----Pop up object
		this.applicationRateEditPopup = undefined;

		//----Add mouse click for source
		this.mapObject.on('click', this.fillLayerName, function(event)
		{
			_localRef.onClick(event);
		});

		//----Change the cursor to a pointer when the mouse is over this layer.
		this.mapObject.on('mouseenter', this.fillLayerName, () => {
			this.mapObject.getCanvas().style.cursor = 'pointer';
		});
			
		//----Change it back to the default cursor when the mouse leaves
		this.mapObject.on('mouseleave', this.fillLayerName, () => {
			this.mapObject.getCanvas().style.cursor = '';
		});
	}

	getHtmlForPopup(inputFieldId, sectorIndex, initialApplicationRate)
	{	
		
		let html = "";
		html += "<div>Sector Index: "+ sectorIndex +"</div>";
		html += "<div>Sector Application [mm]:</div>";
		html += "<input id=\'" + inputFieldId + "\' type=\"number\" step=\"0.1\" value=" + initialApplicationRate + ">";
		//html += "<button id=\'btn-sectors-" + sectorIndex + "\'>Save</button>";

		return html;
	}

	onClick(event)
	{
		console.log(`onClick() ${this.fillLayerName} layer`);

		//first we close/remove the current popup
		if(this.applicationRateEditPopup != undefined)
		{
			this.applicationRateEditPopup.remove();
		}

		//get the feature we have clicked on
		let _feature = event.features[0];

		//get properties of the feature
		let _coordinates = [event.lngLat.lng, event.lngLat.lat];
		let _applicationRate = _feature.properties.application;
		let _sectorIndex = _feature.properties.sectorIndex;
		let _inputFieldId = this.name + "_sector" + _sectorIndex + "_inputField"; //name of the number input on the popup	
		
		//Create the popup object
		this.applicationRateEditPopup = new mapboxgl.Popup()
		.setLngLat(_coordinates)
		.setHTML(this.getHtmlForPopup(_inputFieldId, _sectorIndex, _applicationRate));	

		//What to do when the popup is displayed/enabled/shown
		let _localRef = this;
		this.applicationRateEditPopup.on('open', function()
		{
			//Get the input element
			let inputElement = document.getElementById(_inputFieldId);
			//add a listener for when the application rate for the sector has been changed
			inputElement.addEventListener('change', function(event)
			{			
				_localRef.onApplicationRateChangedForSector(_sectorIndex, event.target.value);
			});
		});

		//Add the popup to the map
		this.applicationRateEditPopup.addTo(this.mapObject);
	}

	onApplicationRateChangedForSector(sectorIndex, newApplicationRate)
	{
		console.log(`onApplicationRateChangedForSector() sectorIndex: ${sectorIndex}, newApplicationRate: ${newApplicationRate}`);


		if(this.variableApplicationRateVariable.context == undefined)
		{
			console.error("Trying to edit application rate for sector that doesn't have an initial value somehow");
			return;
		}
		
		//create a temporary copy
		var _variableApplicationRate = this.variableApplicationRateVariable.context;
		_variableApplicationRate.r[sectorIndex] = Number(newApplicationRate);

		//upload the new context for the variable application rate
		this.variableApplicationRateVariable.updateUbidotsVariable(1, JSON.stringify(_variableApplicationRate));
	}

	getVariableApplicationRateSourceData()
	{
		//number of sectors
		let _sectorCount = 0;
		if(this.variableApplicationRateVariable.context != undefined)
		{
			_sectorCount = this.variableApplicationRateVariable.context.a.length;
		}		 
		//console.log("_sectorCount: " + _sectorCount);

		//new feature form/format
		let new_data = {
			'type':'FeatureCollection',
			'features': [
				{
					'type':'Feature',
					'geometry':{
						'type':'Polygon',
						'coordinates': []
					}
				}
			]        
		};

		let _centreCoordinates = [0,0];
		let _endCoordinates = [0,0];
		let _pivotRadius = 0.3; //km
		if(this.centreCoordinatesVariable.context != undefined && this.endCoordinatesVariable.context != undefined)
		{
			_centreCoordinates = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
			_endCoordinates = [this.endCoordinatesVariable.context.lng, this.endCoordinatesVariable.context.lat];
			_pivotRadius = turf.distance(_centreCoordinates, _endCoordinates, {units: 'kilometers'});		
		}		
		
		let _options = {steps: 720, units: 'kilometers'};

		//at this point if the sctor count > 0, then we have a defined variableApplicationRateVariable context
		for(let i = 0; i < _sectorCount; i++)
		{
			//new_feature data structure for adding a new sector feature
			let new_feature = {
				'type':'Feature',
				'geometry':{
					'type':'Polygon',
					'coordinates': []
				},
				'properties':{
					'sectorIndex':0,
					'application':0
				}
			};
			
			//generate coordinates for particular sector
			let bearing1 = this.variableApplicationRateVariable.context.a[i];
			let bearing2 = 0;

			//Note: all angles are clockwise positive
			if(i < _sectorCount-1)
			{     
				//then there is another sector line afterwards and we can use this as the next angle       
				bearing2 = this.variableApplicationRateVariable.context.a[i+1];			       
			}
			else
			{
				//this is the last sector, and the next bearing is the first bearing
				bearing2 = this.variableApplicationRateVariable.context.a[0];
			}       
			
			//generate coordinates for sector
			let _turfSector = turf.sector(_centreCoordinates, _pivotRadius, bearing1, bearing2, _options);		

			//Populate the new feature with information from this particular sector
			new_feature.geometry.coordinates = _turfSector.geometry.coordinates; //coordinates for polygon sector
			new_feature.properties.application = this.variableApplicationRateVariable.context.r[i]; //application
			new_feature.properties.sectorIndex = i; //index		
			
			//push the new feature to the new_data json file
			new_data.features.push(new_feature);
		}

		return new_data;
	}

	onCentreCoordinatesUpdated(event)
	{
		let _variableApplicationRateSourceData = this.getVariableApplicationRateSourceData();
		this.mapObject.getSource(this.sourceName).setData(_variableApplicationRateSourceData);
	}
	onEndCoordinatesUpdated(event)
	{
		let _variableApplicationRateSourceData = this.getVariableApplicationRateSourceData();
		this.mapObject.getSource(this.sourceName).setData(_variableApplicationRateSourceData);
	}
	onVariableApplicationRateUpdated(event)
	{
		let _variableApplicationRateSourceData = this.getVariableApplicationRateSourceData();
		this.mapObject.getSource(this.sourceName).setData(_variableApplicationRateSourceData);
	}

	addSource()
	{
		//console.log("addSource()");
		//create initial data objects for the source
		let _variableApplicationRateSourceData = this.getVariableApplicationRateSourceData();		

		//Add the sources with the initial data
		this.mapObject.addSource(this.sourceName, 
		{
			'type': 'geojson',
			'data': _variableApplicationRateSourceData
		});
	}
	
	removeLayer()
	{
		if(map.getLayer(this.fillLayerName))
		{
			map.removeLayer(this.fillLayerName);
		}
		if(map.getLayer(this.outlineLayerName))
		{
			map.removeLayer(this.outlineLayerName);
		}
	}
	
	addLayer()
	{
		//fill layer
		this.mapObject.addLayer({
			"id": this.fillLayerName,
			"type": "fill",
			"source": this.sourceName,
			"layout": {},
			"paint": {
				"fill-color": "blue",
				"fill-opacity": 0.3
			}
		});

		//outline
		this.mapObject.addLayer({
			"id": this.outlineLayerName,
			"type": "line",
			"source": this.sourceName,
			"layout": {},
			"paint": {
				"line-color": "#00146c",
				"line-width": 1
			}
		});
	}

	showLayer()
	{
		if(this.mapObject.getLayer(this.fillLayerName))
		{
			this.mapObject.setLayoutProperty(this.fillLayerName, 'visibility', 'visible');
		}
		if(this.mapObject.getLayer(this.outlineLayerName))
		{
			this.mapObject.setLayoutProperty(this.outlineLayerName, 'visibility', 'visible');
		}
	}
	hideLayer()
	{
		if(this.mapObject.getLayer(this.fillLayerName))
		{
			this.mapObject.setLayoutProperty(this.fillLayerName, 'visibility', 'none');
		}
		if(this.mapObject.getLayer(this.outlineLayerName))
		{
			this.mapObject.setLayoutProperty(this.outlineLayerName, 'visibility', 'none');
		}
	}
}