#!/bin/bash

cd /home/amplify/amplify-choreo-video-examples

helm upgrade --devel --install --wait --namespace=amplify-choreo -f order-splitter/overrides.yaml order-splitter-0.0.1 ./order-splitter/deployment/order-splitter
helm upgrade --devel --install --wait --namespace=amplify-choreo -f order-quantity/overrides.yaml order-quantity-0.0.1 ./order-quantity/deployment/order-quantity
helm upgrade --devel --install --wait --namespace=amplify-choreo -f order-info/overrides.yaml order-info-0.0.1 ./order-info/deployment/order-info
helm upgrade --devel --install --wait --namespace=amplify-choreo -f order-aggregation/overrides.yaml order-aggregation-0.0.1 ./order-aggregation/deployment/order-aggregation