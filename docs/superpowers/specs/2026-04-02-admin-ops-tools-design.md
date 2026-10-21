# 管理后台（运营工具）补全设计

## 目标

- 以“运营提效”为第一优先级，补齐兑换码与用户运营的常用能力：批量生成、筛选检索、详情视图、导出、用户权益调整、操作留痕。
- 保持现有技术路线：管理端基于 Supabase（RLS + 少量 Edge Functions）；重操作/批处理集中在 `admin/*` 函数。

## 非目标

- 不引入独立的自建后端服务。
- 不做异步任务队列/离线导出（第一版以同步导出为主）。
- 不设计复杂 RBAC（第一版仅区分 `admin` 与非 `admin`）。

## 现状与痛点

- 兑换码：仅支持单个生成、缺少批次、缺少导出与精细筛选、缺少追溯信息。
- 用户：列表展示有限，缺少“用户详情+最近行为”、缺少运营侧权益调账入口。
- 审计：关键操作缺少可追溯性（谁改了什么、何时改的）。

## 方案选择

### 推荐：方案 A（混合）

- 列表查询：前端直连（依赖 RLS + admin 权限）。
- 写/批处理/导出：统一走 `admin/*` Edge Functions。

优点：落地快、与现有结构一致；导出/批量不会把大数据搬到前端。

## 数据模型调整

### 1) redeem_codes 扩展字段

- `batch_id uuid null`：生成批次标识，用于导出、追溯。
- `note text null`：批次/用途备注（如“渠道A 2026-04 活动”）。
- `created_by uuid null`：生成者（管理员 id）。

索引：
- `(batch_id)`、`(created_at)`、`(status)` 已有/补充。

### 2) 新增 admin_audit_logs（轻量审计）

字段建议：
- `id uuid pk`
- `actor_id uuid not null`（管理员）
- `action text not null`（如 `codes.generate`、`codes.revoke`、`users.set_role`、`users.set_status`、`users.adjust_quota`）
- `target_type text not null`（`redeem_code`/`profile`/`divination_record`）
- `target_id text not null`（uuid 或 code）
- `meta jsonb not null default '{}'`（变更前后、参数、批次等）
- `created_at timestamptz not null default now()`

RLS：
- 仅 `admin` 可读；写入由 `admin/*` functions（service role）完成。

## API / Edge Functions（新增/扩展）

### 1) POST /functions/v1/admin/generate-code（扩展）

输入：
- `type: monthly|quarterly|yearly|permanent`
- `count: 1..2000`（第一版建议 200 上限）
- `note?: string`

行为：
- 生成 `batch_id`（uuid）
- 批量插入 `redeem_codes`，写入 `batch_id/note/created_by`
- 写 `admin_audit_logs`

输出：
- `batchId`
- `codes: [{ id, code, type, status, created_at, batch_id, note }]`

### 2) POST /functions/v1/admin/revoke-codes（新增）

输入：
- `ids: uuid[]`（或 `batchId` 二选一）

行为：
- 仅允许对 `unused` 作废
- 写审计

输出：
- `updatedCount`

### 3) GET /functions/v1/admin/export-codes（新增）

查询参数：
- `status?`、`type?`、`batchId?`、`q?`、`from?`、`to?`

输出：
- `content-type: text/csv`
- 内容字段：`code,type,status,created_at,used_at,used_by,batch_id,note,created_by`

### 4) POST /functions/v1/admin/user-update（新增）

输入（允许组合）：
- `userId`
- `status?: active|banned`
- `role?: free|paid|admin`
- `vipExpiry?: string|null|infinity`
- `dailyRemaining?: number`
- `monthlyRemainingDelta?: number`（支持正负）

行为：
- 统一做校验与写入（避免前端直接 update 多字段导致口径不一致）
- 写审计

输出：
- 更新后的 `profile`

### 5) GET /functions/v1/admin/export-users（新增）

查询参数：
- `role?`、`status?`、`q?`、`vipActive?`

输出：
- CSV：`id,email,role,status,locale,vip_expiry,daily_remaining,monthly_remaining,created_at`

## 前端（管理端）交互设计

### 1) 兑换码管理页（/admin/codes）

- 批量生成：
  - 输入：类型、数量（1/10/100/200）、备注
  - 生成后弹窗显示 `batch_id`，支持：
    - “复制全部兑换码”
    - “下载 CSV（本批次）”
- 列表筛选：
  - 关键词（code 精确/模糊）
  - 状态（unused/used/revoked）
  - 类型
  - 批次 batch_id
  - 时间范围（created_at / used_at）
- 批量操作：
  - 勾选多条 `unused` → 一键作废（走 `admin/revoke-codes`）

### 2) 用户管理页（/admin/users）

- 列表：
  - 搜索：email/name
  - 过滤：role/status/vip 是否有效
- 详情抽屉：
  - 基础信息 + 权益（vip_expiry、daily_remaining、monthly_remaining）
  - 最近 N 条测算记录（按 created_at desc）
- 运营动作：
  - 升降级、封禁/解封
  - 设置/清空 vip 到期
  - 调整高级次数（+/-）
  - 重置今日次数
  - 所有动作走 `admin/user-update`，并在 UI 上二次确认

### 3) 审计页（可选第一版 /admin/audit）

- 仅管理员可见：按时间倒序
- 支持按 `action/actor/target` 筛选

## 权限与风控

- Admin 判定：`profiles.role = 'admin'`
- 前端只用于展示；关键操作必须走 `admin/*` functions（避免仅靠前端控制）
- 对导出/批量：
  - 限制 `count`、限制导出最大行数（例如 10k）
  - 必要时分页/分批导出

## 测试与验收

- 数据库：
  - `admin` 与非 `admin` 权限边界验证（RLS）
  - 批量生成唯一性、作废规则、审计写入
- 前端：
  - 兑换码：批量生成→列表可见→导出 CSV 可下载
  - 用户：搜索→打开详情→修改权益→列表刷新

## 迁移与回滚

- 增量变更：
  - 表结构：增加列/新表（不破坏现有）
  - Functions：新增 endpoint（不影响现有调用）
- 回滚：
  - 前端回滚：恢复旧页面调用
  - DB 回滚：保留新增字段/表（不影响旧逻辑），必要时禁用新 functions 路由
