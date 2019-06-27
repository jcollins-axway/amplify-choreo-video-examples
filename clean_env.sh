#!/bin/bash

cd /home/amplify/amplify-choreo-video-examples

helm delete --purge order-aggregation-0.0.1
helm delete --purge order-quantity-0.0.1
helm delete --purge order-info-0.0.1
helm delete --purge order-splitter-0.0.1
helm delete --purge amplify-choreo-runtime-services

