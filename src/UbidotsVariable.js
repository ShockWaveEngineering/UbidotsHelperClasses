//Requires UbidotsDevice.js

//Can subscribe to changes from a ubidots variable with the <variableApiLabel>
//from the device <ubidotsDeviceObject>

class UbidotsVariableClass extends EventTarget //has no html element to edit
{
	constructor(variableApiLabel, ubidotsDeviceObject)
	{
		super();
		this.variableApiLabel = variableApiLabel;
		this.ubidotsDeviceObject = ubidotsDeviceObject; //Object used for receiving and sending data

		//
		this.value = undefined;
		this.context = undefined;
		this.timestamp = undefined;
		this.created_at = undefined;

		//subscribe to updates
		const _localRef = this;		
		this.ubidotsDeviceObject.addEventListener(this.variableApiLabel, function(event){
			_localRef.onVariableUpdated(event);
			});

	}

	updateUbidotsVariable(value, context)
	{
		//console.log("updateUbidotsVariable()");
		this.ubidotsDeviceObject.publish(this.variableApiLabel, value, context);
	}

	//event handler for when ubidots updates our variable
	onVariableUpdated(event)
	{
		//console.log(`onVariableUpdated() -> event.detail: ${JSON.stringify(event.detail)}`);
		
		this.value = event.detail.value;
		this.context = event.detail.context;
		this.timestamp = event.detail.timestamp;
		this.created_at = event.detail.created_at;


		//create a new event and emit it
		const _detail = {
			detail:{
				value: this.value,
				context: this.context,
				timestamp: this.timestamp,
				created_at: this.created_at
			}
		}

		const _event = new CustomEvent("onUpdate", _detail);

		//dispatch event
		this.dispatchEvent(_event);

	}
}