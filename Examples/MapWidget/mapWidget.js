//--------Account Information for dashboard
let DEVICE_API_LABEL = "33_1_4";
let TOKEN = undefined;

//let _w = window.innerWidth;
//let _h = window.innerHeight;
//alert(`Width: ${_w}, Height: ${_h}`);

//----Ubidots device instance
const ubidotsDevice = new UbidotsDevice(DEVICE_API_LABEL);

//----Initialisation
var ubidots = new Ubidots();
ubidots.on('receivedToken', function (data)
{
	//Update global token
	TOKEN = data;

	//Get the last values for the entire device
	ubidotsDevice.onReceiveApiToken(data);
});

//----Ubidots Variables
let end_coordinates = new UbidotsVariableClass('aend_pos', ubidotsDevice);
let centre_coordinates = new UbidotsVariableClass('centre_pos', ubidotsDevice);
let aend_bearing = new UbidotsVariableClass('aend_bearing', ubidotsDevice);
let variable_application_rate = new UbidotsVariableClass('variable_application_rate', ubidotsDevice);
let virt_endstop_1 = new UbidotsVariableClass('virt_endstop_1', ubidotsDevice);
let virt_endstop_2 = new UbidotsVariableClass('virt_endstop_2', ubidotsDevice);

//----Map Object
mapboxgl.accessToken = 'pk.eyJ1Ijoic2NvdHRhbGV4Z3JheSIsImEiOiJja3lvZ2hjd3MwZGFzMnVuMnlzMGR5OTRmIn0.rv56rls1EfTb-MMKFpIhrg';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  interactive: false,
  center: [29, -28],
  zoom: 15
});

//----Map Scaler
let pivotMapScaler = new PivotMapScaler(map, centre_coordinates, end_coordinates);

//----Pivot Bearing
aend_bearing.addEventListener('onUpdate', function(event){
	//console.log("Received \"onUpdate\" Event For aend_bearing");
	var _bearing = event.detail.value;
	document.getElementById("pivot_bearing").innerHTML = "Pivot Bearing: " + _bearing + " deg";
});

//----End Position Coordinate Age
function Update_Coordinate_Age_Element()
{ 
    var local_date = new Date(); //this will yield the current date and time of the machine used (UTC +2) example: 14:00    
    var timezone_offset_ms = local_date.getTimezoneOffset() * 60 * 1000;
    var coordinate_creation_date = new Date(end_coordinates.timestamp); //The timezone used for the ubidots timestamps are UTC example: 12:00
    var age_date = new Date((local_date.getTime() + timezone_offset_ms) - coordinate_creation_date.getTime());
    document.getElementById("end_pos_last_timestamp").innerHTML = "End Coordinate Age: " + age_date.getHours() + "hours " + age_date.getMinutes() + "minutes " + age_date.getSeconds() + "seconds";
}

//----Realtime Pivot Layer
let realtimePivotLayer = new RealtimePivotLayer("pivot1", map, centre_coordinates, end_coordinates);

//enabling and disabling realtime pivot layers
document.getElementById("live_pivot_layer_enable").addEventListener('change', e => {setRealtimePivotVisibility(e);});

function setRealtimePivotVisibility(e)
{
	if(e.target.checked)
	{
		realtimePivotLayer.showLayer();
    }
	else
	{
		realtimePivotLayer.hideLayer();
	}
}


//----------------VariableApplicationRateLayer
let variableApplicationRateLayer = new VariableApplicationRateLayer('applicationRates1', map, centre_coordinates, end_coordinates, variable_application_rate);

//enabling and disabling realtime pivot layers
document.getElementById("application_sectors_layer_enable").addEventListener('change', e => {setApplicationSectorVisibility(e);});

function setApplicationSectorVisibility(e)
{
	if(e.target.checked)
	{
		variableApplicationRateLayer.showLayer();
    }
	else
	{
		variableApplicationRateLayer.hideLayer();
	}
}



//----------------End Stop Stuff

let virtualEndStopLayer1 = new VirtualEndStopLayer("virtual_endstop_1", map, centre_coordinates, end_coordinates, virt_endstop_1);
let virtualEndStopLayer2 = new VirtualEndStopLayer("virtual_endstop_2", map, centre_coordinates, end_coordinates, virt_endstop_2);


//enabling and disabling end stop layers
document.getElementById("end_stop_layer_enable").addEventListener('change', e => {setEndStopLayerVisibility(e);});

function setEndStopLayerVisibility(e)
{
	if(e.target.checked)
	{
		virtualEndStopLayer1.showLayer();
		virtualEndStopLayer2.showLayer();		
    }
	else
	{
		virtualEndStopLayer1.hideLayer();
		virtualEndStopLayer2.hideLayer();	
	}
}


//----------------Synchronous Interval Calls
window.setInterval(Update_Coordinate_Age_Element, 1000); //update the age of the end_pos every 1000ms

