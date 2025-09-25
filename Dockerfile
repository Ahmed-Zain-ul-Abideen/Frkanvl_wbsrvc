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

# Copy project files
COPY package*.json ./
COPY fork.js ./
COPY script ./script
COPY include ./include

# Install Node deps
RUN npm install


# Install Forge deps (like forge-std)
RUN forge install foundry-rs/forge-std --no-commit

# Expose Anvil RPC port
EXPOSE 8545

# Start Anvil (fork.js will also run setup scripts)
CMD ["npm", "start"]
