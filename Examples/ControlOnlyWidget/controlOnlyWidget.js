//last edited 03/11/2022

//--------Account Information for dashboard
var TOKEN = undefined;
var DEVICE_API_LABEL = "3_1_16"; //must be null for dynamic dashboard, must be set for normal dashboard

console.log("document ready");
document.getElementById("system_name").innerHTML = "System Name: " + DEVICE_API_LABEL;

//--------------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------------


//----Ubidots device instance
const ubidotsDevice = new UbidotsDevice(DEVICE_API_LABEL);

//----Indicator
const indicator_on = new Indicator("indicator_on", "indicator_on", ubidotsDevice);
const indicator_pp_pumprun = new Indicator("indicator_pp_pumprun", "indicator_pp_pumprun", ubidotsDevice);
const indicator_startlatch = new Indicator("indicator_startlatch", "indicator_startlatch", ubidotsDevice);
const indicator_forward = new Indicator("indicator_forward", "indicator_forward", ubidotsDevice);
const indicator_reverse = new Indicator("indicator_reverse", "indicator_reverse", ubidotsDevice);

let indicator_dry_wet_profile = {
	0:{text: "Dry", color: "#FFA30D"},
	1:{text: "Wet", color: "#2CCCE4"}
};
const indicator_dry_wet = new IndicatorCustom("indicator_dry_wet", "indicator_dry_wet", ubidotsDevice, indicator_dry_wet_profile);

let indicator_opmode_profile = {
0 : {text: "Standby", color: "#555555"},
1 : {text: "Ready", color: "#94cf6b"},
2 : {text: "Startup", color: "#FFA30D"},
3 : {text: "Running Wet", color: "#234BDC"},
4 : {text: "Running Dry", color: "#AE7416"},
5 : {text: "Trip Safety", color: "#E72F2F"},
6 : {text: "Pump Fault", color: "#BA68C8"},
7 : {text: "Shutdown", color: "#0bced9"}};
const indicator_opmode = new IndicatorCustom("indicator_opmode", "indicator_opmode", ubidotsDevice, indicator_opmode_profile);

let indicator_safety_profile = {0 : {text: "Trip", color: "#ff0000"}, 1 : {text: "Safe", color: "#00e233"}};
const indicator_safety = new IndicatorCustom("indicator_safety", "indicator_safety", ubidotsDevice, indicator_safety_profile);

//----Indicator Values
function runspeedSerialiser(value)
{
	return `${value}%`;
}
const indicator_runspeed = new IndicatorValue("indicator_runspeed", "indicator_runspeed", ubidotsDevice, runspeedSerialiser);
function minimumApplicationSerialiser(value)
{
	return `Min Application Rate: ${value}mm`;
}
const indicator_minimum_application = new IndicatorValue("indicator_minimum_application", "minimum_application_rate", ubidotsDevice, minimumApplicationSerialiser);
function maximumApplicationSerialiser(value)
{
	let _maximumApplicationRate = -(value/50)*(1) + (3*value);
	//alert("_maximumApplicationRate: " + _maximumApplicationRate);
	_maximumApplicationRate = _maximumApplicationRate.toFixed(2);
	return `Max Application Rate: ${_maximumApplicationRate}mm`;
}
const indicator_maximum_application = new IndicatorValue("indicator_maximum_application", "minimum_application_rate", ubidotsDevice, maximumApplicationSerialiser);


//----Buttons
let	colorReleasedDefault = "#b0f8b0";
let	colorPressedDefault = "#2ebe30";
const button_start = new Button("button_start", "button_start", ubidotsDevice, colorReleasedDefault, colorPressedDefault);
const button_stop = new Button("button_stop", "button_stop", ubidotsDevice, '#ffaaaa', '#ff0000');
const button_forward = new Button("button_forward", "button_forward", ubidotsDevice, colorReleasedDefault, colorPressedDefault);
const button_reverse = new Button("button_reverse", "button_reverse", ubidotsDevice, colorReleasedDefault, colorPressedDefault);

//----Switch
const switch_dry_wet = new Switch("switch_dry_wet", "control_dry_wet", ubidotsDevice, colorReleasedDefault, colorPressedDefault, "Dry", "Wet");

//----Number Input
const input_fixed_application_rate = new NumberInput("input_fixed_application_rate", "fixed_application_rate", ubidotsDevice);






//----Initialisation
var ubidots = new Ubidots();
ubidots.on('receivedToken', function (data)
{
	//Update global token
	TOKEN = data;

	//Get the last values for the entire device
	ubidotsDevice.onReceiveApiToken(data);
});

//setInterval(function(){ubidotsDevice.publish("atest2", 55);}, 3000);

