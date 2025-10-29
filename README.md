# HealthLink Pro

## Description

HealthLink Pro is an enhanced blockchain-based project designed to demonstrate a secure and decentralized system for managing health-related data. It utilizes Hyperledger Fabric for the blockchain network, with a focus on **private data collections**, robust **consent management**, and immutable **audit logging**. A Node.js application provides a RESTful API for client-side interaction.

## Project Structure

The project is organized into two main directories:

-   `fabric-samples/`: Contains all necessary Hyperledger Fabric components, chaincode (smart contracts), and scripts to launch and manage the blockchain network.
-   `my-project/`: The Node.js client application (an Express.js API server) that provides a RESTful API to interact with the blockchain network.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v16.x or higher)
-   [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
-   [Go](https://golang.org/doc/install) (v1.17 or higher, required for Fabric tooling)
-   `jq` (a command-line JSON processor, recommended for viewing API output)

## Getting Started

Follow these steps to set up and run the project.

### 1. Set Up and Launch the Hyperledger Fabric Network

First, start the blockchain network with CouchDB and deploy the chaincode.

```bash
# Navigate to the test-network directory
cd fabric-samples/test-network

# Bring down any existing network
./network.sh down

# Start the network with CouchDB and create a channel
./network.sh up createChannel -c mychannel -ca -s couchdb

# Deploy the HealthLink chaincode
./network.sh deployCC -ccn healthlink-contract -ccp ../chaincode/healthlink-contract -ccl javascript -ccv 1.0 -ccs 1 -ccep "OR('Org1MSP.member','Org2MSP.member')" -cccg ../chaincode/healthlink-contract/collections_config.json
```

This will start the Fabric network, create a channel, and deploy the `healthlink-contract` chaincode.

### 2. Run the Node.js Application

Next, set up and run the Node.js server to interact with the network.

```bash
# Navigate to the Node.js project directory
cd my-project

# Install project dependencies
npm install

# Start the Express.js server
npm start
```

## Usage

Once both the Fabric network and the Node.js application are running, you can interact with the blockchain through the API.

The API server will be accessible at `http://localhost:3000`.

You can use tools like `curl` or Postman to send requests to the available API endpoints to query or update the ledger.
