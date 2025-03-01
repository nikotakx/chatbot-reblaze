#!/bin/bash

# Test queries
curl -s -X POST -H "Content-Type: application/json" -d {message:What are Dynamic Rules in Reblaze?, sessionId: test-dynamic} http://localhost:5000/api/chat | jq

curl -s -X POST -H "Content-Type: application/json" -d {message:Explain security profiles in Reblaze, sessionId: test-profiles} http://localhost:5000/api/chat | jq

curl -s -X POST -H "Content-Type: application/json" -d {message:What is WAF/IPS in Reblaze?, sessionId: test-waf} http://localhost:5000/api/chat | jq

curl -s -X POST -H "Content-Type: application/json" -d {message:What is the Reblaze API?, sessionId: test-api} http://localhost:5000/api/chat | jq

