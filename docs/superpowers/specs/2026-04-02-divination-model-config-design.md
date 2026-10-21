# 测算逻辑（64卦规则）与模型配置设计

## 目标

- 易经规则内置：64卦卦辞+爻辞（简体中文为基准），测算过程严格按规则计算本卦/变爻/之卦与命中爻辞。
- 用户输出由模型润色：模型必须在“卦辞/爻辞原文约束”下输出可读解读（JSON 格式）。
- 模型配置平台化：管理端提供全站统一的模型配置入口，默认 DeepSeek，并支持 OpenAI 兼容与 Gemini。

## 非目标

- 不做全套术数推演（互卦/错综/纳甲等）第一版先不做。
- 不做用户自配置 API Key（第一版仅全站配置）。

## 内置规则数据

- 数据文件（Edge Runtime 内置）：
  - `infra/supabase/volumes/functions/main/iching64.zh.json`：简体中文卦辞/爻辞
  - `infra/supabase/volumes/functions/main/iching64.en.json`：英文（公版译文数据源）
- 生成脚本：
  - `scripts/generate_iching64.mjs`：从 Wikisource 抽取易经段落并转简体；补齐二进制映射与英文文本。

## 起卦与推演规则（第一版）

- 三枚铜钱法分布：
  - 6/9（变爻）概率 1/8；7/8 概率 3/8
- 本卦：
  - 6/8 为阴（0），7/9 为阳（1）
  - 二进制字符串按“上爻→初爻”（自上而下）编码，长度 6
- 之卦：
  - 仅对变爻（6/9）翻转阴阳得到
- 命中爻辞选择：
  - 有变爻：选取所有变爻对应爻辞（按初爻→上爻序）
  - 无变爻：以卦辞为主

## 模型调用约束

- 提示词中必须包含：
  - 维度、用户问题、用户资料摘要
  - 本卦/之卦信息、变爻序号
  - 卦辞与命中爻辞原文（当前语言）
- 模型输出固定为 JSON：`{ "analysis": string }`

## 数据落库

- 仍使用既有 `divination_records`：
  - `hexagram_name/hexagram_binary` 记录本卦
  - `hexagram_lines(jsonb)` 扩展存储：coins、本卦/之卦结构、变爻、依据文本（中英）

## 全站模型配置

- 新增表：`ai_provider_configs`
  - provider: deepseek/openai_compatible/gemini
  - base_url、model
  - api_key_encrypted（加密存储）+ api_key_last4（掩码展示）
  - is_default（仅一个默认）
- 加密策略：
  - `app.settings.ai_enc_key` 写入数据库 settings
  - SQL 提供加解密函数，仅 service_role 可执行
- Edge Functions：
  - `divination`/`daily-fortunes` 调用时优先读取默认配置；无默认则回退到 `.env`
  - 管理端接口：列表/保存/设默认/连通性测试

## 管理端 UI

- 新增页面：`/admin/models`
  - DeepSeek/OpenAI兼容/Gemini 模板
  - 新增/编辑（API Key 可留空表示不变）
  - 设为默认
  - 连通性测试
