/**
 * Ubidots device class
 */
 class UbidotsDevice extends EventTarget
 {
     constructor(deviceApiLabel)
     {
         super();
         //API token to use for device
         this.token = undefined;
         //Ubidots Device Info
         this.deviceApiLabel = deviceApiLabel;
 
         //JSON object
         this.deviceInfo = new Object();
 
         //socket.io stuff
         //this.socket = io.connect("https://"+ window.location.hostname + ":443", {path: '/notifications'});
 
         //list of subscribed variableApiLabels
         this.subscribedVariableApiLabels = [];
     }
     onReceiveApiToken(token) //called externally when we receive the API token
     {
         console.log("onReceiveApiToken()");
         this.token = token;
         //get the initial values
         this.#getAllVariablesForDevice();
     }
     publish(variableApiLabel, value, context)
     {
         //console.log("publish()");
         //check if the device contains this variableApiLabel
         if(this.deviceInfo[variableApiLabel] == null || this.deviceInfo[variableApiLabel] == undefined)
         {
             console.error("UbidotsDevice.publish(): Cannot publish a variable with a label that doesn't exist");
             return;
         }
         if(this.token == null || this.token == undefined)
         {	
             console.error("UbidotsDevice.publish(): Cannot publish as the token isn't set yet");
             return;
         }
         //get the variable ID
         const _variableApiId = this.deviceInfo[variableApiLabel].id;
 
         //construct the context
         const _context = "{}";
         if(context != null && context != undefined && context != "")
         {
             _context = context;
         }
 
         var url = 'https://' + window.location.hostname +"/api/v1.6/variables/" + _variableApiId + "/values/";
         var headers = {'Content-Type' : 'application/json', 'X-Auth-Token' : this.token};
         var data = "{\"value\": " + value + ", \"context\":" + _context + "}";
         
         const _localRef = this;
         $.post({url: url, headers: headers, data: data}, function(res, status)
         {
             //this means the post request has succeeded
             //console.log(`publish res: ${JSON.stringify(res)}`);			
 
             _localRef.#onReceiveRealtimeUpdate(variableApiLabel, _variableApiId, res.value, res.context, res.timestamp, res.created_at);
 
         });
     }
     addEventListener(type, listener, options)
     {
         super.addEventListener(type, listener, options);
 
         //console.log(`UbidotsDevice.addEventListener(${type}, ${listener}, ${options})`);
 
         if(!this.subscribedVariableApiLabels.includes(type))
         {
             this.subscribedVariableApiLabels.push(type);
         }
         else
         {
             console.warn("UbidotsDevice.subscribedVariableApiLabels already contains the api label: " + type);
         }
     }
     
     //unsubscribe(variableApiLabel) //Completely unused/useless
     //{
     //	socket.emit('unsub/rt/variables/id/last_value', {variable: variable});
     //	var pst = subscribedVars.indexOf(variable);
     //	if (pst !== -1)
     //	{
     //		subscribedVars.splice(pst, 1);
     //	}
     //}
 
     //private functions
     #getAllVariablesForDevice()
     {
         console.log("#getAllVariablesForDevice()");
 
         var url = 'https://' + window.location.hostname + '/api/v2.0/devices/~' + this.deviceApiLabel +'/variables/';
         //console.log("url: " + url);
 
         const _localRef = this;
         $.get(url, { token: this.token}, function (res) 
         {        
             var _obj = JSON.parse(JSON.stringify(res));
             //console.log("JSON.stringify(res): " + JSON.stringify(res));	
             //console.log("obj.results count:" + obj.results.length);
             _localRef.#updateDeviceInfo(_obj);
         });
     }
     #updateDeviceInfo(rawData)
     {
         console.log("#updateDeviceInfo()");
         var _count = rawData.results.length;
         for (let i = 0; i < rawData.count; i++)
         {
             //console.log("result: " + JSON.stringify(rawData.results[i]));
 
             this.deviceInfo[rawData.results[i].label] = {
                 label:rawData.results[i].label,
                 id:rawData.results[i].id,
                 value:rawData.results[i].lastValue.value,
                 context:rawData.results[i].lastValue.context,
                 timestamp:rawData.results[i].lastValue.timestamp,
                 created_at:rawData.results[i].lastValue.created_at
             };			
         }
         //console.log("deviceInfo: " + JSON.stringify(this.deviceInfo));
 
         //start the realtime connection
         this.#initialiseRealtimeConnection();
 
         //Subscribe to all
         //this.#subscribeToRealtimeVariables();
 
         //Dispatch an event for all variables
         for (const [key, variableObject] of Object.entries(this.deviceInfo))
         {
             //console.log(`${key}: ${JSON.stringify(value)}`);
             //console.log("s.variableApiLabel: " + s.variableApiLabel);
 
             //create object for the detail property
             const _detail = {
                 detail:variableObject				
             };
             //create the custom event
             const _event = new CustomEvent(key, _detail);
             //dispatch the event
             this.dispatchEvent(_event);
         }
     }
 
     #initialiseRealtimeConnection()
     {
         console.log("#initialiseRealtimeConnection()");
         // Implements the connection to the server
         this.socket = io.connect("https://"+ window.location.hostname + ":443", {path: '/notifications'});
                 
         this.#connectSocket();
         // Should try to connect again if connection is lost
         this.socket.on('reconnect', this.#connectSocket);
     }
     #connectSocket()
     {
         console.log("#connectSocket()");
         //get a reference to the local object
         const _localRef = this;
         // Implements the socket connection
         this.socket.on('connect', function()
         {
             _localRef.socket.emit('authentication', {token: this.token});
         });
         window.addEventListener('online', function () {
             _localRef.socket.emit('authentication', {token: this.token});
         });		
         this.socket.on('authenticated', function(){
             console.log("#onAuthenticated()");
             //Subscribe to all
             _localRef.#subscribeToRealtimeVariables();
         });
     }
     #subscribeToRealtimeVariables()
     {
         console.log("#subscribeToRealtimeVariables()");
         for(const _variableApiLabel of this.subscribedVariableApiLabels)
         {
             //console.log("_variableApiLabel: " + _variableApiLabel);
             //try get the object for the variable
             var _variableObject = this.deviceInfo[_variableApiLabel];
             //test if it exists
             if(_variableObject == null || _variableObject == undefined)
             {
                 console.error("#subscribeToRealtimeVariables() => this.subscribedVariableApiLabels contains label that device does not have");
                 continue;
             }
             //console.log(JSON.stringify(_variableObject));
             const _variableApiId = _variableObject.id;
             //console.log("_variableApiId: " + _variableApiId);
             //if it does exist then tell the server we want to receive updates from it
             this.socket.emit('rt/variables/id/last_value', { variable: _variableApiId });
 
             const _localRef = this;
             this.socket.on('rt/variables/' + _variableApiId + '/last_value', function(res)
             {
                 const _update = JSON.parse(res);
                 _localRef.#onReceiveRealtimeUpdate(_variableApiLabel, _variableApiId, _update.value, _update.context, _update.timestamp, _update.created_at);
             });
         }
     }
     #onReceiveRealtimeUpdate(variableApiLabel, variableApiId, value, context, timestamp, created_at) //this is for updating variables at any time
     {
         console.log(`#onReceiveRealtimeUpdate(), variableApiLabel: ${variableApiLabel}, variableApiId: ${variableApiId} , value: ${value}, context: ${JSON.stringify(context)}`);
         //const _update = JSON.parse(res);
 
         if(this.deviceInfo[variableApiLabel] != null && this.deviceInfo[variableApiLabel] != undefined)
         {
             //update the local copies
             //console.log("old values: " + JSON.stringify(this.deviceInfo[variableApiLabel]));
 
             this.deviceInfo[variableApiLabel].value = value;
             this.deviceInfo[variableApiLabel].context = context;
             this.deviceInfo[variableApiLabel].timestamp = timestamp;
             this.deviceInfo[variableApiLabel].created_at = created_at;
 
             //console.log("updated values: " + JSON.stringify(this.deviceInfo[variableApiLabel]));
 
             //create object for the detail property
             const _detail = {
                 detail:this.deviceInfo[variableApiLabel]				
             };
             //create the custom event
             const _event = new CustomEvent(variableApiLabel, _detail);
             //dispatch the event
             this.dispatchEvent(_event);
         }
         else
         {
             console.error("Received realtime update for variable that does not exist");
         }
     }
 }
 
 // Simle On/Off indicator 
 class Indicator
 {
     static color_low_default = "#919191";
     static color_high_default = "#FFF05D";
 
     constructor(elementId, variableApiLabel, ubidotsDeviceObject)
     {
         //this.element = document.getElementById(elementId);
         this.elementId = elementId; //the id of the element that will show the status of the indicator
         this.variableApiLabel = variableApiLabel;
         this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data		
 
         const _localRef = this;
         //subscribe to updates
         this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
             _localRef.onVariableUpdated(event);
             });
     }
 
     onVariableUpdated(event)
     {
         //console.log(`onVariableUpdated() -> event.detail: ${JSON.stringify(event.detail)}`);
         //console.log(`this.variableApiLabel: ${this.variableApiLabel}`);
         const value = event.detail.value;
         this.updateVisuals(value);
     }
     updateVisuals(value)
     {
         var $element = $('#' + this.elementId);
 
         if(value == 1)
         {			
             $element.css('background-color', Indicator.color_high_default);
         }
         if(value == 0)
         {
             $element.css('background-color', Indicator.color_low_default);
         }
     }
 }
 
 // Custom Indicator with color and text options for various values
 class IndicatorCustom extends Indicator
 {
     static colorNotFound = "#FF00FF";
 
     constructor(elementId, variableApiLabel, ubidotsDeviceObject, profile)
     {
         super(elementId, variableApiLabel, ubidotsDeviceObject);
 
         this.profile = profile;		
     }
     updateVisuals(value)
     {
         var $element = $('#' + this.elementId);
 
         //get the text and color for this value
         const _text = this.profile[value].text;
         const _color = this.profile[value].color;
 
         //set the text
         if(_text != null && _text != undefined)
         {
             $element.text(_text);
         }
         else
         {
             console.error(`updateVisuals(${value}) for elementId: ${this.elementId}, exceeds profile for text`);
         }
 
         //set the color
         if(_color != null && _color != undefined)
         {
             $element.css('background-color', _color);
         }
         else
         {
             $element.css('background-color', colorNotFound);
             console.error(`updateVisuals(${value}) for elementId: ${this.elementId}, exceeds profile for color`);
         }
     }
 }
 
 //----Indicator that displays a value
 class IndicatorValue
 {
     constructor(elementId, variableApiLabel, ubidotsDeviceObject, serialiseFunction)
     {
         this.serialiseFunction = serialiseFunction;
         this.elementId = elementId; //the id of the element that will show the status of the indicator
         this.variableApiLabel = variableApiLabel;
         this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data		
 
         const _localRef = this;
         //subscribe to updates
         this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
             _localRef.onVariableUpdated(event);
             });
     }
 
     onVariableUpdated(event)
     {
         const value = event.detail.value;
         this.updateVisuals(value);
     }
     updateVisuals(value)
     {
         //element we are going to change
         let element = document.getElementById(this.elementId);
         element.style.backgroundColor = this.pressedColor;
         element.innerHTML = this.serialiseFunction(value);
     }
 }
 
 //Simple Button
 class Button
 {
     constructor(elementId, variableApiLabel, ubidotsDeviceObject, releasedColor, pressedColor)
     {
         this.elementId = elementId; //the id of the element that will show the status of the indicator
         this.variableApiLabel = variableApiLabel;
         this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data		
 
         const _localRef = this;
         //subscribe to updates
         this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
             _localRef.onVariableUpdated(event);
             });
 
         //(this is an agnostic event so it can be used with both a mouse and a touch screen)
         let element = document.getElementById(this.elementId);
         element.addEventListener('pointerup', (event) => {
             _localRef.onPointerUp(event);
         });
 
         //initialise element
         this.state = 0;
         this.releasedColor = releasedColor;
         this.pressedColor = pressedColor;
         this.updateVisuals(this.state);
     }
 
     //User input callbacks
     onPointerUp(event)
     {
         //console.log(`onPointerUp() -> event.detail: ${JSON.stringify(event.detail)}`);
         this.state = !this.state | 0; //so that the state stays a number
 
 
         this.updateVisuals(this.state);
         this.ubidotsDeviceObject.publish(this.variableApiLabel, this.state, "");
     }
 
     //event handler for when ubidots updates our variable
     onVariableUpdated(event)
     {
         console.log(`onVariableUpdated() -> event.detail: ${JSON.stringify(event.detail)}`);
         //console.log(`this.variableApiLabel: ${this.variableApiLabel}`);
         const value = event.detail.value;
         console.log(`value: ${value}`);
         this.updateVisuals(value);
     }
 
     //called when you want to update the look of the element based on the value received from ubidots
     updateVisuals(value)
     {
         console.log(`updateVisuals(${value})`);
         let element = document.getElementById(this.elementId);
 
         if(value == 1)
         {
             element.style.backgroundColor = this.pressedColor;
             element.style.transform = "translate(0px, 4px)";			
             element.style.boxShadow = "1px 2px #333333";
         }
         else if(value == 0)
         {
             element.style.backgroundColor = this.releasedColor;
             element.style.transform = "translate(0px, 0px)";
             element.style.boxShadow = "1px 6px #666666";
         }
     }
 }
 
 //Simple Switch
 class Switch
 {
     constructor(elementId, variableApiLabel, ubidotsDeviceObject, releasedColor, pressedColor, releasedText, pressedText)
     {
         this.elementId = elementId; //the id of the element that will show the status of the indicator
         this.variableApiLabel = variableApiLabel;
         this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data		
 
         const _localRef = this;
         //subscribe to updates
         this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
             _localRef.onVariableUpdated(event);
             });
 
         //(this is an agnostic event so it can be used with both a mouse and a touch screen)
         let element = document.getElementById(this.elementId);
         element.addEventListener('pointerup', (event) => {
             _localRef.onPointerUp(event);
         });
 
         //initialise element
         this.state = 0;
         this.releasedColor = releasedColor;
         this.pressedColor = pressedColor;
         this.releasedText = releasedText;
         this.pressedText = pressedText;
         this.updateVisuals(this.state);
     }
 
     //User input callbacks
     onPointerUp(event)
     {
         //console.log(`onPointerUp() -> event.detail: ${JSON.stringify(event.detail)}`);
         this.state = !this.state | 0; //so that the state stays a number
         this.updateVisuals(this.state);
         this.ubidotsDeviceObject.publish(this.variableApiLabel, this.state, "");
     }
 
     //event handler for when ubidots updates our variable
     onVariableUpdated(event)
     {
         //console.log(`onVariableUpdated() -> event.detail: ${JSON.stringify(event.detail)}`);
         //console.log(`this.variableApiLabel: ${this.variableApiLabel}`);
         const value = event.detail.value;
         //console.log(`value: ${value}`);
         this.updateVisuals(value);
     }
 
     //called when you want to update the look of the element based on the value received from ubidots
     updateVisuals(value)
     {
         //console.log(`updateVisuals(${value})`);
         let element = document.getElementById(this.elementId);
 
         if(value == 1)
         {
             element.innerHTML = this.pressedText;
             element.style.backgroundColor = this.pressedColor;
             element.style.transform = "translate(0px, 4px)";			
             element.style.boxShadow = "1px 2px #333333";
         }
         else if(value == 0)
         {
             element.innerHTML = this.releasedText;
             element.style.backgroundColor = this.releasedColor;
             element.style.transform = "translate(0px, 0px)";
             element.style.boxShadow = "1px 6px #666666";
         }
     }
 }
 
 //----Number Input
 class NumberInput
 {
     constructor(elementId, variableApiLabel, ubidotsDeviceObject)
     {
         this.elementId = elementId; //the id of the element that will show the status of the indicator
         this.variableApiLabel = variableApiLabel;
         this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data		
 
         const _localRef = this;
         //subscribe to updates
         this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
             _localRef.onVariableUpdated(event);
             });
 
         //(this is an agnostic event so it can be used with both a mouse and a touch screen)
         let element = document.getElementById(this.elementId);
         element.addEventListener('change', (event) => {
             _localRef.onChange(event);
         });
 
         //initialise element
         this.state = 0;
     }
 
     //User input callbacks
     onChange(event)
     {
         //console.log(`onPointerUp() -> event.detail: ${JSON.stringify(event.detail)}`);
         console.log("NumberInput value: " + event.target.value);
         this.state = event.target.value;
         this.updateVisuals(this.state);
         this.ubidotsDeviceObject.publish(this.variableApiLabel, this.state, ""); // Publish value to ubidots
     }
 
     //event handler for when ubidots updates our variable
     onVariableUpdated(event)
     {
         //console.log(`onVariableUpdated() -> event.detail: ${JSON.stringify(event.detail)}`);
         //console.log(`this.variableApiLabel: ${this.variableApiLabel}`);
         this.state = event.detail.value;				
         this.updateVisuals(this.state);
     }
 
     //called when you want to update the look of the element based on the value received from ubidots
     updateVisuals(value)
     {
         let element = document.getElementById(this.elementId);
         element.value = value;
     }
 }