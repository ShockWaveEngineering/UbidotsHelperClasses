// Simple On/Off indicator 
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
        this.lowValue = 0;
        this.highValue = 1;        
        this.state = this.lowValue;
        this.releasedColor = releasedColor;
        this.pressedColor = pressedColor;
        this.releasedText = releasedText;
        this.pressedText = pressedText;
        this.updateVisuals(this.state);
    }
    
    constructor(elementId, variableApiLabel, ubidotsDeviceObject, releasedColor, pressedColor, releasedText, pressedText, lowValue, highValue)
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
        this.lowValue = lowValue;
        this.highValue = highValue;        
        this.state = this.lowValue;
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
        if(this.state == this.lowValue)
        {
            this.state = this.highValue;
        }
        else
        {
            this.state = this.lowValue;
        }
        
        if(!(typeof this.state === typeof Number))
        {
            console.error("lowValue or highValue isn't a number for elementId: " + this.elementId + " for ubidots varaible name: " + this.variableApiLabel);
            return;
        }
        
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

        if(value == this.highValue)
        {
            element.innerHTML = this.pressedText;
            element.style.backgroundColor = this.pressedColor;
            element.style.transform = "translate(0px, 4px)";			
            element.style.boxShadow = "1px 2px #333333";
        }
        else if(value == this.lowValue)
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
        //console.log("NumberInput value: " + event.target.value);
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
