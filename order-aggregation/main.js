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

	// Sample Input, each in a different business message
	// [
	// 		{
	// 			"order_number":"0001",
	//	 		"item_id":"ABC"
	// 		}
	// ],
	// [
	//		{
	// 			"order_number":"0002",
	// 			"item_id":"DEF"
	// 		}
	// ],
	// [
	//		{
	// 			"order_number":"0003",
	// 			"item_id":"ABC"
	// 		}
	// ],
	// [
	//		{
	// 			"order_number":"0004",
	// 			"item_id":"CAB"
	// 		}
	// ],
	// [
	//		{
	// 			"order_number":"0005",
	// 			"item_id":"DEF"
	// 		}
	// ]
	//
	// Sample Output 1
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
	// Sample Output 2
	// 		{
	// 		"orders":
	// 			[{
	// 				"order_number":"0002",
	// 				"item_id":"DEF"
	// 			},{
	// 				"order_number":"0005",
	// 				"item_id":"DEF"
	// 			}]
	// 		}
	//
	// Sample Output 3
	// 		{
	// 		"orders":
	// 			[{
	// 				"order_number":"0004",
	// 				"item_id":"CAB"
	// 			}]
	// 		}

	// Start a new span from the context sent into the processor
	var span = ace.tracing.startSpanFromContext(context, 'Order Aggregation Service');

	// We first loop through all the busines messages that were received and get the payloads
	var orders = [];
    for (var i in businessMsgs) {
        var spanLog = {};
        var payloadString = Buffer.from(businessMsgs[i].getPayload().getBody_asU8()).toString();
        orders.push(JSON.parse(payloadString));
        spanLog['Order[' + i + ']'] = payloadString;
        span.log(spanLog);
	}
	
	
    var groupBy = function (objArray, key) {
        return objArray.reduce(function (rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
	};
	// Next we want to group the payloads by item_id
	var orderGroups = groupBy(orders, 'item_id');
	
	// Using theose groupings we will forward a new message for each item_id found
    for (var grouping in orderGroups) {
        // Creating an object with an array of orders
        var ordersObj = { orders: orderGroups[grouping] };
        // Create new Business Message using current one as base
        createNewBusinessMessage(span, businessMsgs[0], JSON.stringify(ordersObj), function (newBusinessMessage) {
			// Send that Business Message back to the linker client
			try {
				var spanLog = {};
				spanLog['Payload[' + grouping + ']'] = JSON.stringify(ordersObj);
				span.log(spanLog);
				
				var error = msgProducer.send(newBusinessMessage);
            } catch(error) {
				span.finish();
                return error;
            }
        });
    }
	
	// Close out this tracing span
	span.finish();
    return;
}

function createNewBusinessMessage(span, bMsg, newPayload, callback) {
	// Clone the incoming business message
	var newBMsg = ace.cloneBusinessMessage(bMsg);
	
    // Set the new payload, converting the UTF8 string into a byte array
	newBMsg.getPayload().setBody(ByteBuffer.fromUTF8(newPayload).buffer);
	
    callback(newBMsg);
}

main();
