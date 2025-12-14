# 使用官方 Puppeteer 镜像，自带 Chrome，省去配置烦恼
FROM ghcr.io/puppeteer/puppeteer:latest

# 切换到 root 权限 (Render 有时需要)
USER root

# 设置工作目录
WORKDIR /usr/src/app

# 复制依赖定义
COPY package*.json ./

# 安装依赖 (使用 ci 模式更稳)
RUN npm ci

# 复制所有代码
COPY . .

# 暴露 Render 默认分配的端口 (虽然 Render 会自动处理，但写上是个好习惯)
EXPOSE 4000

# 启动命令
CMD [ "node", "index.js" ]