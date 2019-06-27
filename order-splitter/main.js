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
	// 		"orders":
	// 			[{
	// 				"order_number":"0001",
	// 				"item_id":"ABC"
	// 			},{
	// 				"order_number":"0002",
	// 				"item_id":"DEF"
	// 			}]
	// 		}
	//
	// Sample Outputs
	//    Output 1
	// 		{
	// 			"order_number":"0001",
	// 			"item_id":"ABC"
	// 		}
	//    Output 2
	// 		{
	// 			"order_number":"0002",
	// 			"item_id":"DEF"
	// 		}

	// Start a new span from the context sent into the processor
	var span = ace.tracing.startSpanFromContext(context, 'Order Split Service');

	// Get the payload body of the first, and only, business message
	var payloadBody = JSON.parse(Buffer.from(businessMsgs[0].getPayload().getBody_asU8()).toString());

		
	// Loop through the number of orders in the array
	for (var i = 0; i < payloadBody['orders'].length; i++) {
		var order = payloadBody['orders'][i];

		// Create a new Business Message, for each order, and send it to the Message Producer
		createNewBusinessMessage(businessMsgs[0], JSON.stringify(order), function(newBusinessMessage) {
			// Send that Business Message back to the linker client
			try {
				// Log the payload of each message being sent to the same tracing event
				var spanLog = {};
				spanLog['Payload[' + i + ']'] = JSON.stringify(order);
				span.log(spanLog);

				// Send the newBusinessMessage to the msgProducer so it may be forwarded to the next service, if applicable
				msgProducer.send(newBusinessMessage);
			}
			catch (error) {
				// If we hit an error, finish the span and return it
				span.finish()
				return error;
			}
		});
	};
	
	// Close out this tracing span
    span.finish();
	return null;
}

function createNewBusinessMessage(bMsg, newPayload, callback) {
	// Clone the incoming business message
	var newBMsg = ace.cloneBusinessMessage(bMsg);
	
    // Set the new payload, converting the UTF8 string into a byte array
	newBMsg.getPayload().setBody(ByteBuffer.fromUTF8(newPayload).buffer);
	
    callback(newBMsg);
}

main();
