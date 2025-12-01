# Use Node 20
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "run", "start"]
