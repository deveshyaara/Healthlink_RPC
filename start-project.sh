#!/bin/bash

# A robust script to start the HealthLink Pro project.
# This script handles network startup, peer readiness checks, and application launch.

# Exit immediately if a command exits with a non-zero status.
set -e

# Get the absolute path of the script's directory to ensure reliable navigation.
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
TEST_NETWORK_DIR="$SCRIPT_DIR/fabric-samples/test-network"
RPC_SERVER_DIR="$SCRIPT_DIR/my-project/rpc-server"

# --- 1. Start the Hyperledger Fabric Network ---
echo "--- Starting Hyperledger Fabric Network ---"
cd "$TEST_NETWORK_DIR"

echo "--> Tearing down any existing network..."
./network.sh down

echo "--> Starting network containers (Peers, Orderers, CAs, CouchDB)..."
# The 'up' command brings up containers but does not create or join channels yet.
./network.sh up -ca -s couchdb

echo "--> Waiting for CouchDB instances to be fully ready..."
sleep 5
echo "--> Initializing CouchDB admin databases..."
curl -X PUT http://admin:adminpw@localhost:5984/_users 2>/dev/null || true
curl -X PUT http://admin:adminpw@localhost:7984/_users 2>/dev/null || true
echo "--> Waiting for CouchDB to settle..."
sleep 3

# Function to wait for a port to be open and the service ready.
# It uses nc to check the port and adds a grace period.
wait_for_peer() {
  local port=$1
  local org=$2
  echo "--> Waiting for Org$org peer on port $port to be ready..."
  
  # Loop until the port is open on the IPv4 loopback address
  while ! nc -z 127.0.0.1 "$port"; do   
    echo "    Port $port is not yet open. Retrying in 2 seconds..."
    sleep 2
  done
  echo "--> Port $port is open."
  
  # Add a grace period for the gRPC service to initialize inside the container.
  echo "--> Giving Org$org peer an extra 10 seconds to fully initialize..."
  sleep 10
}

# Wait for both peers to be fully ready before proceeding.
wait_for_peer 7051 1
wait_for_peer 9051 2

echo "--> Creating channel 'mychannel' and joining peers..."
# This command now runs after the peers are confirmed to be ready.
# We explicitly set the peer addresses to the IPv4 loopback to avoid connection issues.
export CORE_PEER_ADDRESS=127.0.0.1:7051
./network.sh createChannel -c mychannel

echo "--> Deploying HealthLink chaincode (version 1.0)..."
./network.sh deployCC -ccn healthlink-contract -ccp ../chaincode/healthlink-contract -ccl javascript -ccv 1.0 -ccs 1 -ccep "OR('Org1MSP.member','Org2MSP.member')" -cccg ../chaincode/healthlink-contract/collections_config.json

echo "--- Fabric Network and Chaincode are ready ---"
echo ""


# --- 2. Prepare and Start the Node.js RPC Server ---
echo "--- Preparing and Starting Node.js RPC Server ---"
cd "$RPC_SERVER_DIR"

echo "--> Removing old wallet identity to ensure a clean start..."
rm -rf wallet

echo "--> Enrolling new admin identity for the application..."
node addToWallet.js

echo "--> Installing npm dependencies..."
npm install --silent # Use --silent to reduce log noise

echo "--> Starting RPC server in the background on port 4000..."
# Start the server as a background process and log output to a file.
nohup npm start > rpc-server.log 2>&1 &

echo ""
echo "✅ --- HealthLink Pro is now running! ---"
echo "The RPC server is running in the background."
echo "You can view its logs with: tail -f $RPC_SERVER_DIR/rpc-server.log"
echo "You can test the APIs in a new terminal using the './test-api.sh' script."
echo "To stop the server later, run: kill \$(lsof -t -i:4000)"
