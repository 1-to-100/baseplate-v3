FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy the entire project
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build the application (including CLI)
RUN npm run build

# Make CLI executable
RUN chmod +x dist/cli/cli.js

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
# CMD ["sh", "-c", "npm run start:dev"]