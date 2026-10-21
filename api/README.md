# Hostinger 部署说明（Node.js + MySQL）

## 0. 两种部署模式

- 模式A（推荐给 Hostinger 静态站点）：前端静态单独上传，API 单独部署（子域名或独立 App URL）
- 模式B（单包部署）：前端打包后的 `dist/` 放进 API 的 `public/`，只上传一个 Node.js ZIP，Node 同时提供前台与 `/api` 接口

## 1. 初始化数据库

在 Hostinger 的 MySQL 管理（phpMyAdmin）中创建数据库，然后执行：

- [schema.mysql.sql](./schema.mysql.sql)

## 2. 配置 Node.js App 环境变量

在 Hostinger 的 Node.js App 设置里添加（示例见 [.env.example](./.env.example)）：

- `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE`
- `JWT_SECRET`
- `CORS_ORIGIN`（前端域名，开发时可用 `http://localhost:5173`）
- `AI_PROVIDER` / `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`（可选：没有在后台“模型配置”里配置时使用）

## 3. 启动命令

入口文件：

- `api/src/index.js`

安装依赖：

- `npm install`

启动：

- `npm run start`

## 4. 前端对接

前端默认使用相对路径请求 `/api/*`。

如果你把 API 部署到独立子域名（例如 `https://api.example.com`），在前端构建环境里设置：

- `VITE_API_BASE_URL=https://api.example.com`

## 5. 管理员账号

注册后默认是 `free`。将某个账号升级为管理员可在数据库执行：

- `update users set role='admin' where email='你的邮箱';`
- `update profiles set role='admin' where email='你的邮箱';`

## 6. 单包部署（模式B）

ZIP 第一层结构示例：

- `package.json`
- `server.js`
- `src/*`
- `public/index.html`
- `public/assets/*`

Hostinger 面板：

- 入口文件：`server.js`
- 安装：`npm install`
- 启动：`npm run start`
