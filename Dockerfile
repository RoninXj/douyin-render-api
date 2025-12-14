# 使用官方 Puppeteer 镜像，自带 Chrome，省去配置烦恼
FROM ghcr.io/puppeteer/puppeteer:latest

# 切换到 root 权限
USER root

# 设置工作目录
WORKDIR /usr/src/app

# 复制依赖定义
COPY package*.json ./

# ⚠️ 这里改了！把 npm ci 改成了 npm install
# npm install 不需要 lock 文件也能运行
RUN npm install

# 复制所有代码
COPY . .

# 暴露端口
EXPOSE 4000

# 启动命令
CMD [ "node", "index.js" ]
