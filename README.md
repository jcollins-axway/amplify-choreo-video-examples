# amplify-choreo-video-examples
Here you will find all the commands and source used for the Amplify Choreograph Video

### Amplify Choreography Documetation
You may find the steps for deploying the entire Runtime and installing the Command Line Tools here.

https://docs.axway.com/bundle/ACE_00_DeveloperGuide_allOS_en_HTML5/page/Content/AxwayStartPage.htm


### Variables Used
DOMAIN_NAME = lstmp0014.lab.phx.axway.int 
    DNS host name of the Ingress controller, in the lab enviornment this is equal to my Kubernetes Master Node
NAMESPACE = amplify-choreo
    Namespace to deploy all Amplify Choreo Runtime services and business services

### Create a TLS Certificate and Key
```
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout ./tls.key -out ./tls.crt -subj "/CN=${DOMAIN_NAME}/O=Axway"
```

### Deploy the TLS Secret
```
kubectl create secret tls amplify-choreo-runtime-tls-secret -n amplify-choreo --cert ./tls.crt --key ./tls.key -o yaml
```

### Deploy the Amplify Choreo Runtime
```
helm upgrade --install --wait --namespace amplify-choreo -f ./amplify-choreo-runtime-values.yaml amplify-choreo-runtime-services axway-public/ace-runtime-services
```

### Create a new Business Service Project
```
amplify auth logout --all
amplify auth login
amplify ace init
```

### Install Node Modules
```
npm install
```

### Build the Business Service docker image and push to dockerhub
```
npm run build
docker tag order-splitter:0.0.1 jcollins7227/order-splitter:0.0.1
docker push jcollins7227/order-splitter:0.0.1
```

### Deploy your Business Service to the Runtime
```
helm upgrade --devel --install --wait --namespace=amplify-choreo -f overrides.yaml order-splitter-0.0.1 ./deployment/order-splitter
```

