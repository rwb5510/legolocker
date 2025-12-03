FROM node:18-alpine

# Install build dependencies for better-sqlite3 (python, make, g++)
# These are often needed because sqlite driver is a native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# Create directory for db volume
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "server.js"]
