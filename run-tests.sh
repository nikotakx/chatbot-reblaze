#!/bin/bash

# Script to run different types of tests

case "$1" in
  "unit")
    echo "Running unit tests..."
    npx jest --testMatch='**/__tests__/unit/**/*.test.[jt]s?(x)'
    ;;
  "integration")
    echo "Running integration tests..."
    npx jest --testMatch='**/__tests__/integration/**/*.test.[jt]s?(x)'
    ;;
  "e2e")
    echo "Running end-to-end tests..."
    npx jest --config jest.client.config.js --testMatch='**/__tests__/e2e/**/*.test.[jt]s?(x)'
    ;;
  "client")
    echo "Running client tests..."
    npx jest --config jest.client.config.js
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npx jest --watch
    ;;
  *)
    echo "Running all tests..."
    npx jest
    ;;
esac