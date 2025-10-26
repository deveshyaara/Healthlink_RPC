# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
# This includes server.js, fabric-client.js, etc.
COPY . .

# The wallet and connection profile will be mounted as volumes,
# but we still need to run addToWallet.js to create the wallet if it doesn't exist.
# We'll do this *outside* the container build.

# Expose the port the app runs on
EXPOSE 4000

# Define the command to run the app
CMD [ "node", "server.js" ]
