//Ubidots Device
//Can subscribe to the initialisation and update of variables from the ubidots

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
        var _context = "{}";
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
        const _localRef = this;
        this.socket.on('reconnect', function () {
            _localRef.#connectSocket();
        });
    }
    #connectSocket()
    {
        console.log("#connectSocket()");
        //get a reference to the local object
        const _localRef = this;
        // Implements the socket connection
        this.socket.on('connect', function()
        {
            _localRef.socket.emit('authentication', {token: _localRef.token});
        });
        window.addEventListener('online', function () {
            _localRef.socket.emit('authentication', {token: _localRef.token});
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
                console.error(`#subscribeToRealtimeVariables() => cannot find API ID for API label: ${_variableApiLabel}, this means that the Ubidots Device (${this.deviceApiLabel}) doesn't have a variable named \"${_variableApiLabel}\"`);
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
