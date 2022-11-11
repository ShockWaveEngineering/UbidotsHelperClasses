//Scales a map based on the centre and end coordinates of a pivot, <_padding> and the width of the html element containing the map

//example HTML
/*<div id='map' style="touch-action: none"></div>*/

//example CSS
/*#map
{
	position: relative;
	margin-left: 10px;
	margin-right: 10px;
	margin-bottom: 10px;
	margin-top: 10px;
	padding-bottom: 100%;
}*/



class PivotMapScaler
{
	constructor(mapObject, centreCoordinatesVariable, endCoordinatesVariable)
	{
		this.mapObject = mapObject;
		this.centreCoordinatesVariable = centreCoordinatesVariable;
		this.endCoordinatesVariable = endCoordinatesVariable;

		const _localRef = this;
		this.centreCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onUpdate();
		});
		this.endCoordinatesVariable.addEventListener('onUpdate', function(event){			
			_localRef.onUpdate();
		});

		this.mapObject.on('resize', function(event){
			_localRef.onUpdate();			
		});
	}

	onUpdate()
	{
		//centre coordinates
		let _centreCoordinates = [0,0];
		if(this.centreCoordinatesVariable.context != undefined)
		{
			_centreCoordinates = [this.centreCoordinatesVariable.context.lng, this.centreCoordinatesVariable.context.lat];
		}

		//end coordinates
		let _endCoordinates = [0,0];
		if(this.endCoordinatesVariable.context != undefined)
		{
			_endCoordinates = [this.endCoordinatesVariable.context.lng, this.endCoordinatesVariable.context.lat];
		}

		//set the centering of the map
		this.mapObject.setCenter(_centreCoordinates);

		

		//----Adjust the zoom of the map
		//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Resolution_and_Scale
		//console.log("Adjusting Map Zoom");
		//--Get distance between two coordinates (pivot radius)
		let _options = {units: 'kilometers'};
		let _pivotRadiusMeters = turf.distance(_centreCoordinates, _endCoordinates, _options) * 1000;

		//--Get the maximum pixel size that the pivot can be
		let _htmlContainer = this.mapObject.getContainer();
		let _width = _htmlContainer.clientWidth;
		let _height = _htmlContainer.clientHeight;
		let _padding = 0.15; //%
		let _maximumPivotRadiusPixels = (_width - (2*_width*_padding))/2;
		//console.log(`_width: ${_width}, _maximumPivotRadiusPixels: ${_maximumPivotRadiusPixels}`);

		//--Loop through zooms to find appropriate zoom (where _pivotRadiusPixels < _maximumPivotRadiusPixels)
		let _minZoom = 0;
		let _maxZoom = 220;
		let _equatorLength = 40075.016686;
		let _metersPerPixelZoom0 = _equatorLength * 1000 / 512; //note 512 is tile size
		for(let _zoom10 = _maxZoom ; _zoom10 >= _minZoom; _zoom10--)
		{
			let _zoom = _zoom10/10;
			//console.log(`trying zoom ${_zoom}`);			

			//calculated every iteration
			let _metersPerPixel = _metersPerPixelZoom0 * Math.cos(_centreCoordinates[1] * Math.PI / 180) / Math.pow(2,_zoom);
			let _pivotRadiusPixels = _pivotRadiusMeters / _metersPerPixel;
			//console.log(`At zoom ${_zoom}, _pivotRadiusPixels = ${_pivotRadiusPixels}`);
			if(_pivotRadiusPixels <= _maximumPivotRadiusPixels)
			{
				//console.log(`At zoom ${_zoom}, _pivotRadiusPixels = ${_pivotRadiusPixels}`);
				//set zoom of map
				this.mapObject.setZoom(_zoom);
				break;
			}
		}
	}
}