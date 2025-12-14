FROM ghcr.io/puppeteer/puppeteer:latest

# 切换到 root 用户来安装依赖 (如果需要)
USER root

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制所有源代码
COPY . .

# 暴露端口
EXPOSE 4000

# 启动命令
CMD [ "node", "index.js" ]
