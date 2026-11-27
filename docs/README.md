# Wallpaper Prism Documentation Index · 文档导航 (`v2.5.0`)

**语言 / Language**: [简体中文](#简体中文索引) · [English](#english-index) · [返回主 README](../README.md)

---

## 简体中文索引

### 1. 当前 `v2.5.0` 活跃文档

| 文档 | 作用与内容定位 | 维护状态 |
|---|---|---|
| [../README.md](../README.md) | 项目中英双语主页：`v2.5.0` 核心亮点（可选自定义开场动画支持 Wallpaper 动态壁纸与自定义视频、12 区域对话气泡与控件玻璃化 + 默认无毛玻璃、4K60 MSE 零闪烁流控、Scene 高清 `.tex` 解码与 12 区域拾取器）、安装方法、快速开始、架构、脚本、排障与致谢 | **Active (`v2.5.0`)** |
| [CHANGELOG.md](./CHANGELOG.md) | 完整双语版本更新日志（覆盖 `v1.1.0` 至 `v2.5.0` 全部 Release、PR 与贡献者致谢） | **Active (`v2.5.0`)** |
| [dsh-parity-spec.md](./dsh-parity-spec.md) | 上游 `dsh-plugin-wallpaper-engine v1.4.2` 逆向分析（`§1`–`§3`）与 `agy-wallpaper-prism v2.5.0` 功能对齐清单（`§4`–`§5`） | **Active (`v2.5.0`)** |
| [../skills/wallpaper-prism/SKILL.md](../skills/wallpaper-prism/SKILL.md) | Agent 按需调度指南：Sidecar / Customizations 链接、`v2.5.0` 开场动画配置、12 区域拾取器流程与 `host/cli.mjs` 安全命令集 | **Active (`v2.5.0`)** |

### 2. 历史快照与硬冻结基线（只读存档）

| 文档 | 历史角色与说明 | 约束 |
|---|---|---|
| [V2.2_NEXT_AI_HANDOFF.md](./V2.2_NEXT_AI_HANDOFF.md) | `v2.1.0`（`HEAD ded7824`）交接实施手册，收录 15 项反馈、8 项锁定决策（`D1`–`D8`）及 `§5.6` `v2.3.0` 实时拾取器设计（`v2.2.0` 与 `v2.3.0` 已按此落地） | **历史快照 · 保留正文以维持 `ded7824` 行号引用完整** |
| [AI_HANDOFF.md](./AI_HANDOFF.md) | `v2.1.0` 工程交接基线手册，定义 Symbol-First 规范、7+3 版本锚点、5 条工程红线与 `v2.0.6`–`v2.1.0` 架构总结 | **HARD-FROZEN (`D1`)：严禁修改！** `test/verify-all.mjs` 强制断言 `git diff ded7824 -- docs/AI_HANDOFF.md` 为空 |
| [prism-design-spec.md](./prism-design-spec.md) | `v1.0` Obsidian Prism 光学设计谱系与界面重构规划档案（已被 `v2.1.0`+ 架构演进取代） | **只读存档** |
| [legacy-audit.md](./legacy-audit.md) | `2026-11-22` 前代 `agy-plugin-wallpaper-engine` 清理与 Antigravity 2.0 宿主取证快照 | **只读存档** |

> [!CAUTION]
> **维护红线提醒**：
> 1. **绝对不要编辑 `docs/AI_HANDOFF.md`**（受 `D1` 门禁硬锁定，哪怕修改 1 个字节都会导致 `npm test` 失败）。
> 2. 所有文档必须保持 **纯 UTF-8 LF（`0` 个 `\r` 字节、无 BOM）** 且 **零 PII**（统一使用 `<USER_HOME>` 或 `~/`）。
> 3. `skills/wallpaper-prism/SKILL.md` 禁止出现任何旧版扩展协议字面量（仅允许 `sidecar://` 与 `customization://`）。

---

## English Index

### 1. Active `v2.5.0` Documentation

| Document | Scope & Purpose | Status |
|---|---|---|
| [../README.md](../README.md) | Bilingual project homepage covering `v2.5.0` highlights (optional customizable Opening Animation with Wallpaper Engine dynamic wallpapers or custom videos, 12-region chat bubbles & controls glassmorphism with default no blur, 4K60 MSE zero-blanking flow, Scene HD `.tex` decoding & 12-region Live Host Region Picker), install methods, quick start, architecture, scripts, troubleshooting & acknowledgments | **Active (`v2.5.0`)** |
| [CHANGELOG.md](./CHANGELOG.md) | Complete bilingual release history from `v1.1.0` through `v2.5.0` with PR/Issue provenance | **Active (`v2.5.0`)** |
| [dsh-parity-spec.md](./dsh-parity-spec.md) | Upstream `dsh-plugin-wallpaper-engine v1.4.2` reverse-engineering reference (`§1`–`§3`) and `agy-wallpaper-prism v2.5.0` parity checklist (`§4`–`§5`) | **Active (`v2.5.0`)** |
| [../skills/wallpaper-prism/SKILL.md](../skills/wallpaper-prism/SKILL.md) | Agent navigation, Opening Animation & safe `host/cli.mjs` reference (`v2.5.0`) | **Active (`v2.5.0`)** |

### 2. Historical Snapshots & Frozen Baselines (Read-Only)

| Document | Historical Role | Constraint |
|---|---|---|
| [V2.2_NEXT_AI_HANDOFF.md](./V2.2_NEXT_AI_HANDOFF.md) | Pre-`v2.2.0` (`HEAD ded7824`) execution handoff capturing user feedback `#1`–`#15`, decisions `D1`–`D8`, and `§5.6` `v2.3.0` picker design (now shipped across `v2.2.0` & `v2.3.0`) | **Historical Snapshot — Keep body unmodified to preserve `ded7824` citations** |
| [AI_HANDOFF.md](./AI_HANDOFF.md) | `v2.1.0` engineering handoff defining Symbol-First anchoring, version anchors, 5 redlines, and `v2.0.6`–`v2.1.0` architecture | **HARD-FROZEN (`D1`): NEVER EDIT!** Enforced by `test/verify-all.mjs` (`git diff ded7824 -- docs/AI_HANDOFF.md`) |
| [prism-design-spec.md](./prism-design-spec.md) | Archived `v1.0` Obsidian Prism optical design lineage specification | **Read-Only Archive** |
| [legacy-audit.md](./legacy-audit.md) | Archived `2026-11-22` pre-`v2.0` legacy plugin audit & Antigravity 2.0 host survey | **Read-Only Archive** |

> [!CAUTION]
> **Documentation Hygiene Rules**:
> 1. **NEVER modify `docs/AI_HANDOFF.md`** (`D1` hard gate fails on any 1-byte diff vs `ded7824`).
> 2. Keep all Markdown files **pure UTF-8 LF (`CR=0`, no BOM)** with **zero PII** (`<USER_HOME>` or `~/`).
> 3. Keep `skills/wallpaper-prism/SKILL.md` strictly limited to `sidecar://` and `customization://` URIs.
