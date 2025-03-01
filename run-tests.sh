#!/bin/bash

# Script to run different types of tests

case "$1" in
  "unit")
    echo "Running unit tests..."
    npx jest --config jest.config.cjs --testMatch='**/__tests__/unit/**/*.test.[jt]s?(x)'
    ;;
  "integration")
    echo "Running integration tests..."
    npx jest --config jest.config.cjs --testMatch='**/__tests__/integration/**/*.test.[jt]s?(x)'
    ;;
  "e2e")
    echo "Running end-to-end tests..."
    npx jest --config jest.client.config.cjs --testMatch='**/__tests__/e2e/**/*.test.[jt]s?(x)'
    ;;
  "client")
    echo "Running client tests..."
    npx jest --config jest.client.config.cjs
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npx jest --config jest.config.cjs --watch
    ;;
  *)
    echo "Running all tests..."
    npx jest --config jest.config.cjs
    ;;
esac