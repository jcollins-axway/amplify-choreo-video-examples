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
	// 				"order_number":"0003",
	// 				"item_id":"ABC"
	// 			}]
	// 		}
	//
	// Sample Output
	// 		{
	// 		"orders":
	// 			[{
	// 				"order_number":"0001",
	// 				"item_id":"ABC"
	// 			},{
	// 				"order_number":"0003",
	// 				"item_id":"ABC"
	// 			}],
	//		"item_id": "ABC",
	//		"quantity": 2
	// 		}

	// Start a new span from the context sent into the processor
	var span = ace.tracing.startSpanFromContext(context, 'Add Order Quantity Service');

	// Get the payload body of the first, and only, business message
	var payloadBody = JSON.parse(Buffer.from(businessMsgs[0].getPayload().getBody_asU8()).toString());

	// Pull the item_id and the number of orders in the array out into the base of the payload
    payloadBody['item_id'] = payloadBody.orders[0].item_id;
	payloadBody['quantity'] = payloadBody.orders.length;
	
	// Create a new Business message, and send it to the Message Producer
	createNewBusinessMessage(JSON.stringify(payloadBody), payloadBody.orders.length, function(newBusinessMessage) {
        try {
			// Log the payload to the tracing spam, we will be able to see this in Jaeger
			span.log({ Payload: JSON.stringify(payloadBody) });
			
			// Send the newBusinessMessage to the msgProducer so it may be forwarded to the next service, if applicable
            msgProducer.send(newBusinessMessage);
        }
        catch (error) {
			// If we hit an error, finish the span and return it
			span.finish()
            return error;
        }
	});
	
	// Close out this tracing span
    span.finish();
    return;
}

function createNewBusinessMessage(newPayload, quantity, callback) {
    // Create a new business message
    var newBMsg = new ace.BusinessMessage();
	var msgPayload = new ace.Payload();
	
    // Set the new payload, converting the UTF8 string into a byte array
    msgPayload.setBody(ByteBuffer.fromUTF8(newPayload).buffer);
	newBMsg.setPayload(msgPayload);
	
    // Lets add a the quantity value in the business message metadata
	newBMsg.getMetaDataMap().set('quantity', quantity.toString());
	
	// Send back the business message
    callback(newBMsg);
}

main();
