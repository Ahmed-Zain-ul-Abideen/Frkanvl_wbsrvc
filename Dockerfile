# Start from Node.js base image
FROM node:22

# Install dependencies for Foundry
RUN apt-get update && apt-get install -y \
    curl git build-essential pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry (includes anvil, forge, cast)
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Set work directory
WORKDIR /app

# Copy package metadata first (for caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your project files
COPY . .

# Expose Anvil’s JSON-RPC port
EXPOSE 8545

# Start Anvil through fork.js
CMD ["node", "fork.js"]
