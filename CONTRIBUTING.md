# 🚲 数据贡献指南

欢迎车技顾问和开发人员扩展本项目的知识库！本文档说明如何通过 GitHub 安全地新增/修改知识数据。

---

## 🗂 数据文件结构

```
data/
├── templates/          # 推荐方案模板（每个车型一个 JSON 文件）
├── rules/
│   └── compat-rules.json   # 零件兼容性规则
├── pricing/
│   └── bands.json      # 零件参考价格区间
└── prompts/
    └── recommend-system.md  # AI 顾问 System Prompt
```

---

## 🔧 方式一：通过后台管理页面（推荐，无需懂代码）

1. 克隆项目后本地运行（见 [README](../README.md)）
2. 打开 `http://localhost:3000/admin`
3. 在对应 Tab 新增/编辑数据，自动写入本地 JSON 文件
4. 用 `git diff` 查看改动，提交 Pull Request

---

## 📝 方式二：直接编辑 JSON 文件

### 新增配置模板

在 `data/templates/` 目录下新建 `{TEMPLATE_ID}.json`：

```json
{
  "template_id": "R3-SPORTIVE-6K-10K",
  "name": "运动竞技公路（6k-10k）",
  "category": "road",
  "budget": { "min": 6000, "max": 10000, "currency": "CNY" },
  "frame_logic": {
    "type": "race_road",
    "material": ["Al", "CF-entry"]
  },
  "drivetrain_logic": {
    "level": ["Shimano 105 R7000", "Shimano Ultegra R8000"],
    "config": ["2x11"]
  },
  "wheel_logic": {
    "rim": "Al",
    "tire_width": "25C-28C"
  },
  "brake_logic": {
    "type": ["rim_brake", "mechanical_disc"]
  }
}
```

**`category` 允许值：** `road` | `mountain` | `mtb` | `commute` | `city` | `gravel`

---

### 新增定价区间

在 `data/pricing/bands.json` 数组中追加：

```json
{
  "band_id": "DRV-FORCE-AXS",
  "component": "drivetrain",
  "level": "SRAM Force AXS 2×12速电变",
  "price": { "min": 8000, "max": 11000, "currency": "CNY" },
  "source": "sram-cn-2025",
  "last_verified_at": "2025-01-01"
}
```

**`component` 允许值：** `frame` | `drivetrain` | `wheelset` | `brake` | `saddle` | `handlebar` | `fork`

**注意：** `band_id` 在整个文件中必须唯一。

---

### 新增兼容规则

在 `data/rules/compat-rules.json` 数组中追加：

```json
{
  "rule_id": "AXLE-THRU-QR-001",
  "type": "hard_error",
  "description": "12mm贯通轴车架不兼容快拆轮组",
  "condition": {
    "frame_axle": "12mm_thru",
    "wheel_axle": "quick_release"
  },
  "message": "您选择的车架使用12mm贯通轴，与快拆轮组不兼容",
  "suggestion": "请选择12mm贯通轴规格的轮组",
  "enabled": true
}
```

**`type` 允许值：**
- `warning`：警告，顾问可以选择忽略
- `hard_error`：严重错误，阻止该配置组合

---

## 🔄 提交流程

```bash
# 1. Fork 本仓库，克隆到本地
git clone https://github.com/your-org/ai-bike-builder.git
cd ai-bike-builder

# 2. 创建功能分支（用清晰的名称）
git checkout -b data/add-sram-force-pricing

# 3. 修改数据文件后，先本地校验
node scripts/validate-data.mjs

# 4. 提交
git add data/
git commit -m "data: 新增 SRAM Force AXS 定价区间"

# 5. 推送并创建 Pull Request
git push origin data/add-sram-force-pricing
```

---

## ✅ 数据审核规则

Pull Request 提交后，CI 会自动运行数据校验脚本，检查：

| 检查项 | 说明 |
|--------|------|
| JSON 格式 | 所有文件必须是合法 JSON |
| 必填字段 | 各数据类型的必填字段不能为空 |
| ID 唯一性 | `band_id`、`rule_id`、`template_id` 不能重复 |
| 字段枚举值 | `category`、`type`、`component` 只允许特定值 |
| 价格合理性 | `price.min` 不能大于 `price.max` |

CI 通过后，由主仓库维护者审核数据内容合理性，再合并到 `main` 分支。

---

## 📌 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定版本，只接受 PR 合并 |
| `dev` | 开发集成分支 |
| `data/xxx` | 知识库数据更新 |
| `feat/xxx` | 新功能开发 |
| `fix/xxx` | Bug 修复 |

---

## 🆘 帮助

如有疑问，请在 GitHub Issues 中提问，或联系项目维护者。
