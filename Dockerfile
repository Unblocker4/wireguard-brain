# Use the official Node 20 image for a small, fast build
FROM node:24-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install 'wireguard-tools' for key generation
RUN apk add --no-cache wireguard-tools

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of your application code
COPY . .

# Expose the port your app will run on
EXPOSE 13121

# The command to start your application
CMD [ "node", "src/server.js" ]