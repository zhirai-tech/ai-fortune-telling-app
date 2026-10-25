[English](README.md) | [简体中文](README.zh-CN.md) | [个人网站](https://zhinian-ai.com)

---

# AI 算命应用

## 1) 配置环境变量

把 `.env.docker.example` 复制为 `.env.docker`，填写：

- `SUPABASE_UPSTREAM_URL`：你现有 Supabase 的 Kong/API 根地址  
  - 如果 Supabase 运行在宿主机，容器里一般用 `http://host.docker.internal:54321`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) 启动

在仓库根目录执行：

```bash
docker compose --env-file .env.docker up -d
```

## 3) 访问

- 前端：`http://localhost:5173`
- 本地网关（浏览器端 Supabase URL）：`http://localhost:64321`

## 4) 校验

```bash
# 期望返回 401 not_authenticated（说明路由打通，本地 functions 被接管）
curl -i http://localhost:64321/functions/v1/divination
```

## 清理通用后端数据库（可选）

如果你要把“通用后端”里的旧业务数据清掉，再让当前前端从零开始用：

- 仅清业务数据（保留已有用户账号）：[reset_app_data_keep_users.sql](file:///c:/Users/Administrator/Desktop/ZHIRAI-DockerFiles/shared-dev/workspace/yijing_dataset/infra/dev/reset_app_data_keep_users.sql)
- 全量清理（含用户账号）：[reset_app_data_full.sql](file:///c:/Users/Administrator/Desktop/ZHIRAI-DockerFiles/shared-dev/workspace/yijing_dataset/infra/dev/reset_app_data_full.sql)

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

---

## 个人网站

**ZHIRAI / 智睿科技** — [zhinian-ai.com](https://zhinian-ai.com)
