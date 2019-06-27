# ACE Business Service

Your microservice description goes here

# Service Implementation and Using the SDK

## Implement the callback method

### The callback method signature

Implement the callback method that will process the received message. Below is the signature of the method

```
    function businessMessageProcessor(context, businessMsgs, msgProducer)
```

### Input processing

The businessMsgs parameter is an array of type ace.BusinessMessage. Each identify a business message and holds the payload and the metadata associated with the payload.

#### Processing payload

The payload can be retrieved using the interface method getPayload() on a ace.BusinessMessage object from the businessMsgs Array.

The payload [type ace.Payload] can be actual payload (use ace.Payload.getBody() to retrieve the content) or a reference to a location (use ace.Payload.getLocationReference() to identify if the payload body is location reference)

#### Processing metadata

The metadata can be retrieved using the interface method getMetaDataMap() on a ace.BusinessMessage object which returns map of string key/value pairs identifying the metadata associated with the payload.

### Output processing

The output of the processing can be responded by generating new message(s). To create a new message construct business message and setup metadata. The new message can then be produced using msgProducer parameter.

#### Creating new ACE business message

-   Construct the metadata

    Constructing the metadata is done by setting values using getMetaDataMap().set(key, value)

-   Construct the payload

    Create the payload with content as demonstrated below. The newContent in the example below is a byte array holding the raw content

    ```
            let newPayload = ace.Payload();
            newPayload.setBody(newContent);
    ```

    OR

    Create the payload with location reference as demonstrated below. The newContent in the example below is a byte array holding the location reference.

    ```
            let newPayload = ace.Payload();
            newPayload.setBody(newContent);
            newPayload.setLocationReference(true);
    ```

-   Construct the ACE business message

    Create new business message object as demonstrated below. The "newPayload" in the example below identifies payload for the new business message. MetaData may also be added.

    ```
        let newBusinessMessage = new ace.BusinessMessage();
        newBusinessMessage.setPayload(newPayload);
        newBusinessMessage.getMetaDataMap().set("md1", "md1-value")
    ```

#### Producing message

To produce messages use the Send method on msgProducer parameter as demonstrated below

```
    msgProducer.send(newBusinessMessage)
```

## Add trace for service execution (Optional)

ACE SDK has instrumentation for OpenTracing(https://opentracing.io/specification/) built-in and provides ability to allow the business service to inject the tracing spans.

To start a span as child of span managed by ACE, use startSpanFromContext method from the ace package. Using the created span the business service can log details as demonstrated below.

```
    let span = ace.tracing.startSpanFromContext(context, "business-service");
    span.log("event", "processed message");
    span.finish();
```

## Add log lines (Optional)

ACE SDK sets up a logger object that can be used by the service to add additional logging to the console.  Using the provided logger will write the lines consistent with the ACE SDK.

A call to the logger method and level will include a message and an optional object with 1 or many additional fields.  The SDK provides field names that may be used.

```
	ace.logger.debug("Starting business service", {[ace.fields.logFieldServiceName]: cfg.serviceName});
```

## Handling errors in the service execution

ACE SDK had three error types defined.

SendingError - Can be returned from calling send method on the MsgProducer.

```
    let error = msgProducer.send(newBusinessMessage);
```

ProcessingError - Returned by the businessMessageProcessor.

```
	let simError = new ace.ProcessingError('processing error');
	return simError;
```

SystemError - Returned by the businessMessageProcessor to clientRelay.

```
	let simError = new ace.SystemError('system error');
	return simError;
```

## Register the service callback method with ACE

ACE business service must register the service info and callback method for making it usable as a step to build choreographies
The service registration needs following details

-   Service Name
-   Service Version
-   Service Type (optional)
	- NATIVE
	- AGGREGATION
-   Service Description
-   Callback method

Below are 2 examples of Registering the service info & callback method.  Then starting the ACE processing.
```
	// Service Type is defaulted to Native when implemented in this manner
    ace.register(serviceName, serviceVersion, serviceDescription, businessMessageProcessor, (link, error) => {
		if (error) {
			ace.logger.error(error);
			return;
		}
		// Start the link between the business message processor and linker
		link.start();
	});
```
```
	// Create a ServiceConfig object to send into ace.register
	let serviceCfg = new ace.ServiceConfig(serviceName, serviceVersion, ace.ServiceType.NATIVE, serviceDescription);

	ace.register(serviceCfg, businessMessageProcessor, (link, error) => {
		if (error) {
			ace.logger.error(error);
			return;
		}
		// Start the link between the business message processor and linker
		link.start();
	});
```

The provided template reads the serviceName, serviceVersion, serviceType, and serviceDescription from following environment variables respectively, but it's the implementation choice on how to setup these details.

-   SERVICE_NAME
-   SERVICE_VERSION
-   SERVICE_TYPE
-   SERVICE_DESCRIPTION

If the environment variable is not set it will read them from the package.json file when the service is started via npm.

# Building the ACE business service

The template contains a sample package.json for build and packaging the ACE business service. The package.json provides following scripts

Modify the Makefile for any path related changes and any additional environment configurations.

-   start

    Start the business service

-   build

    Run "npm run build" to compile the business service and generate the docker image for the ACE business service.

# Deploying the ACE business service to ACE runtime

Deploying the business service assumes that ACE runtime is up and running. The template contains the helm charts for deploying the business service to ACE runtime. Modify the helm chart to use the docker image for the business service and any additional configuration needed for the business service.

The business service must be deployed in the same namespace as the ACE runtime.

Below are the instructions to deploy the business service using the helm chart provided with the template

Replace the following placeholders where applicable in file content/commands examples below

| Placeholder                             | Description                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| {RUNTIME_NAMESPACE}                     | Kubernetes namespace in which ACE runtime is deployed                          |
| {SERVICE_NAME}                          | ACE Business service name                                                      |
| {SERVICE_VERSION}                       | ACE Business service version                                                   |
| {SERVICE_TYPE}                          | ACE Business service type                                                      |
| {SERVICE_DESCRIPTION}                   | Description for the ACE Business service                                       |
| {LOG_LEVEL}                             | Defines the verbosity of the log information produced                          |
| {BUSINESS_SERVICE_DOCKER_IMAGE}         | Name of the docker image for ACE Business service                              |
| {BUSINESS_SERVICE_REGISTRY}             | Docker registry that hosts the ACE Business service docker image               |
| {BUSINESS_SERVICE_REGISTRY_USER}        | User for ACE Business service docker image registry                            |
| {BUSINESS_SERVICE_REGISTRY_PASSWORD}    | Password for ACE Business service docker image registry                        |
| {BUSINESS_SERVICE_REGISTRY_USER_EMAIL}  | Email of the user for ACE Business service docker image registry               |
| {BUSINESS_SERVICE_REGISTRY_SECRET_NAME} | Name of the secret for ACE business service that stores the docker credentials |
| {ACE_SDK_REGISTRY}                      | Docker registry that hosts the ACE SDK docker images                           |
| {ACE_SDK_REGISTRY_USER}                 | User for ACE SDK docker image registry                                         |
| {ACE_SDK_REGISTRY_PASSWORD}             | Password for ACE Business service docker image registry                        |
| {ACE_SDK_REGISTRY_USER_EMAIL}           | Email of the user for ACE SDK docker image registry                            |
| {ACE_SDK_REGISTRY_SECRET_NAME}          | Name of the secret for ACE SDK that stores the docker credentials              |

# For business service docker image, create K8s Secret of docker type to store image credentials

-   Run the command below to create the secret for docker registry.
    `kubectl create secret docker-registry {BUSINESS_SERVICE_REGISTRY_SECRET_NAME} --docker-server={BUSINESS_SERVICE_REGISTRY} --docker-username={BUSINESS_SERVICE_REGISTRY_USER} --docker-password={BUSINESS_SERVICE_REGISTRY_PASSWORD} --docker-email={BUSINESS_SERVICE_REGISTRY_USER_EMAIL}`

# For ACE SDK docker image, create K8s Secret of docker type to store image credentials

ACE SDK image available over public registry. This step is needed only if ACE SDK image is pushed to private registry

-   Run the command below to create the secret for docker registry.
    `kubectl create secret docker-registry {ACE_SDK_REGISTRY_SECRET_NAME} --docker-server={ACE_SDK_REGISTRY} --docker-username={ACE_SDK_REGISTRY_USER} --docker-password={ACE_SDK_REGISTRY_PASSWORD} --docker-email={ACE_SDK_REGISTRY_USER_EMAIL}`

### Create a yaml file (e.g. ace_business_service_values.yaml) to override the default properties in helm chart if needed. Sample below

```
  serviceName: {SERVICE_NAME}
  serviceVersion: {SERVICE_VERSION}
  serviceType: {SERVICE_TYPE}
  serviceDescription: {SERVICE_DESCRIPTION}
  serviceLogLevel: {LOG_LEVEL}

  image:
    name: {BUSINESS_SERVICE_DOCKER_IMAGE}

  imageCredentials:
    secretName: {BUSINESS_SERVICE_REGISTRY_SECRET_NAME}

  ace:
    imageCredentials:
      name: {ACE_SDK_REGISTRY_SECRET_NAME}
```

### Run the command below to deploy ACE business service

```
helm upgrade --devel --install --wait \
    --namespace={RUNTIME_NAMESPACE} \
    -f ./ace_business_service_values.yaml \
    {SERVICE_NAME}-{SERVICE_VERSION} ./deployment/order-info
```
