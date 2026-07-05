# Use lightweight Node 20 Alpine Linux image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package definition files first (to leverage Docker layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy backend application source code
COPY . .

# HuggingFace Spaces requires web servers to listen on port 7860
ENV PORT=7860
ENV NODE_ENV=production

# Expose port 7860 for HuggingFace routing
EXPOSE 7860

# Start the Node.js backend server
CMD ["node", "server.js"]
