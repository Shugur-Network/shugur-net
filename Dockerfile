# Dockerfile for Shugur Relay Network Dashboard
FROM nginx:alpine

# Copy the dashboard files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
