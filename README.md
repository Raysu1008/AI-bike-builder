# 🚲 AI Bike Builder — 智能自行车配置顾问

基于自由对话的自行车配置推荐系统。用户用自然语言描述需求，AI 顾问给出专业的零件配置建议。

---

## ✨ 功能概览

- 💬 **自由对话配车**：输入「我想买辆 8000 以内的山地车，偏越野」，自动推荐配置
- 🚲 **专业推荐卡片**：车型方案含预算区间、车架/传动/轮组/刹车搭配建议
- 🤖 **AI + 规则双引擎**：有 OpenAI Key 时用 GPT，无 Key 时用规则解析（离线可用）
- 🔧 **顾问知识库管理**：后台可视化维护配置模板、兼容规则、定价区间、AI 提示词
- 🔄 **外部数据同步**：支持从外部 API 或 JSON URL 合并/替换本地知识库

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- pnpm 9+

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/ai-bike-builder.git
cd ai-bike-builder
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，填入 OPENAI_API_KEY（可选）
```

### 4. 启动开发服务

```bash
# 方式一：同时启动前后端（推荐）
pnpm dev

# 方式二：分别启动
pnpm --filter @ai-bike-builder/api dev   # 后端 :3001
pnpm --filter web dev                    # 前端 :3000
```

### 5. 打开浏览器

| 页面 | 地址 | 说明 |
|------|------|------|
| 首页 | http://localhost:3000 | 推荐方案浏览 |
| 对话配车 | http://localhost:3000/chat | AI 对话入口 |
| 知识库管理 | http://localhost:3000/admin | 顾问后台（开发模式无需登录）|

---

## 📁 项目结构

```
ai-bike-builder/
├── apps/
│   ├── api/          # 后端 Express + TypeScript（端口 3001）
│   │   └── src/
│   │       ├── routes/       # API 路由
│   │       └── services/     # 业务逻辑
│   └── web/          # 前端 Next.js 16（端口 3000）
│       └── app/
│           ├── page.tsx      # 首页
│           ├── chat/         # AI 对话页
│           └── admin/        # 知识库管理后台
├── data/             # 知识库数据（JSON，可直接编辑）
│   ├── templates/    # 推荐方案模板
│   ├── rules/        # 兼容性规则
│   ├── pricing/      # 零件定价区间
│   └── prompts/      # AI System Prompt
└── scripts/
    └── validate-data.mjs  # 数据校验脚本
```

---

## 🗄️ 知识库数据

所有知识库数据均以 JSON 文件存储在 `data/` 目录，**无需数据库**，便于 Git 版本管理和协作维护。

| 数据类型 | 文件 | 说明 |
|---------|------|------|
| 配置模板 | `data/templates/*.json` | 各场景推荐方案（车型/预算/组件） |
| 兼容规则 | `data/rules/compat-rules.json` | 零件搭配兼容性校验 |
| 定价区间 | `data/pricing/bands.json` | 各零件参考价格范围 |
| AI 提示词 | `data/prompts/recommend-system.md` | AI 顾问的回答风格 |

> **车技顾问** 可通过 Admin 后台页面直接维护，或按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交 PR。

---

## 🔑 API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/chat` | AI 对话配车 |
| POST | `/v1/recommend` | 直接推荐（按参数） |
| GET  | `/v1/admin/templates` | 获取配置模板列表 |
| POST/PUT/DELETE | `/v1/admin/templates/:id` | 模板 CRUD |
| GET/POST/PUT/DELETE | `/v1/admin/rules` | 兼容规则 CRUD |
| GET/POST/PUT/DELETE | `/v1/admin/pricing` | 定价区间 CRUD |
| GET/PUT | `/v1/admin/prompts` | AI Prompt 管理 |
| POST | `/v1/admin/sync` | 从外部 URL 同步数据 |

---

## 🤝 参与贡献

欢迎贡献新的车型模板、兼容规则和定价数据！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 License

MIT
