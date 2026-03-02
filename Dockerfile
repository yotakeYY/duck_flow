# 阶段一：开发 / 构建
FROM node:20-slim AS develop-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 默认以开发模式运行
CMD ["npm", "run", "dev", "--", "--host"]

# 阶段二：生产构建
FROM develop-stage AS build-stage
RUN npm run build

# 阶段三：生产服务器（Nginx）
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
