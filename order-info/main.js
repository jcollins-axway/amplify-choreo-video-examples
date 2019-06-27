const ace = require('@axway/ace-sdk'),
	ByteBuffer = require('bytebuffer');

function main() {
	// Create new App Config and register the service with the ACE Linker
	var cfg = new ace.ServiceConfig(
		process.env.SERVICE_NAME || process.env.npm_package_name,
		process.env.SERVICE_VERSION || process.env.npm_package_version.anchor,
		ace.ServiceType[process.env.SERVICE_TYPE],
		process.env.SERVICE_DESCRIPTION || process.env.npm_package_description
	);

	ace.logger.debug("Starting business service", {[ace.fields.logFieldServiceName]: cfg.serviceName});

	//Registers businessMessageProcessor as service handler
	ace.register(cfg, businessMessageProcessor, (link, error) => {
		if (error) {
			ace.logger.error('registration error', {[ace.fields.logFieldError]: error.message});
			return;
		}
		// Start the link between the business message processor and linker
		link.start();
	});
}

// businessMessageProcessor -  Represents ACE service callback handler to perform business processing
/*
	context - The Open Tracing span context of this business message
	businessMsgs - The Array of Business Message being sent to process
	msgProducer - Calls any downstream processes to the processor
*/
function businessMessageProcessor(context, businessMsgs, msgProducer) {
	// Business Logic and message production goes here

	// Sample Input
	// 		{
	// 			"order_number":"0002",
	// 			"item_id":"DEF"
	// 		}
	//
	// Sample Output
	//	order_info = item_id * (order_number + 1)
	// 		{
	// 			"order_number":"0002",
	// 			"item_id":"DEF"
	//		    "order_info":"DEFDEFDEF"
	// 		}

	// Start a new span from the context sent into the processor
	var span = ace.tracing.startSpanFromContext(context, 'Add Order Info Service');

	// Get the payload body of the first, and only, business message
	var payloadBody = JSON.parse(Buffer.from(businessMsgs[0].getPayload().getBody_asU8()).toString());

	// Repeat the item_id into the order_info (1 + the order number)
	payloadBody.order_info = '';
    for (var i = 0; i < Number(payloadBody.order_number) + 1; i++) {
        payloadBody.order_info = payloadBody.order_info + payloadBody.item_id;
	}
	
	// Create a new Business message, and send it to the Message Producer
	createNewBusinessMessage(JSON.stringify(payloadBody), function(newBusinessMessage) {
        try {
			// Log the payload to the tracing spam, we will be able to see this in Jaeger
			span.log({ Payload: JSON.stringify(payloadBody) });
			
			// Send the newBusinessMessage to the msgProducer so it may be forwarded to the next service, if applicable
            msgProducer.send(newBusinessMessage);
        }
        catch (error) {
			// If we hit an error, finish the span and return it
            span.finish();
            return error;
        }
	});
	
	// Close out this tracing span
    span.finish();
    return;
}

function createNewBusinessMessage(newPayload, callback) {
    // Create a new business message
    var newBMsg = new ace.BusinessMessage();
	var msgPayload = new ace.Payload();

    // Set the new payload, converting the UTF8 string into a byte array
    msgPayload.setBody(ByteBuffer.fromUTF8(newPayload).buffer);
	newBMsg.setPayload(msgPayload);
	
    // Set a new metadata item and update one that existed
	newBMsg.getMetaDataMap().set('new_metadata', 'new_metadata_value');
    newBMsg.getMetaDataMap().set('metadata', 'new_value');
	
    callback(newBMsg);
}

main();
