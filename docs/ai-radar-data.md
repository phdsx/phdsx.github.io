# AI 雷达数据来源

2026-11-18 对实际接口与浏览器跨域读取进行了验证。独立入口为 `ai-radar.html`；首页只保留导航链接，不加载雷达脚本、不请求评分或预测。

## 当前评分

CodexRadar 当前公开数据：<https://codexradar.com/data/codex-four-task-results.json>。

验证时为 `codex-four-task-results/1`、`codex-four-weighted-150-v2`，轮次 `codex-four-20261118-issue-368-reviewed`，58 个档位、232 项评分。源站允许跨域读取，无需密钥或镜像。

页面遵循来源的 `task_weights`：秦始皇 `combined.score / 100 × 60`，庞贝 `pompeii.score100 / 100 × 45`，鹈鹕 `pelican.score / 100 × 22.5`，糖果正确计 22.5、错误计 0。总分是四项之和；缺项不补零，不完整档位不进入总分排名。协议或权重变化时显示失败，避免沿用不兼容的计算规则。单独显示的庞贝空间推理分数采用来源的百分制。

使用 `score_snapshot_at` / `verified_at` 标记评分快照时间，使用 `author_test_interval.display_zh` 显示实际测试时间。该评分不能直接替代旧版众测视觉 IQ。

## 恢复的旧版视觉 IQ

- 视觉归档：<https://codexradar.com/data/radar-legacy-visual.json>。36 个档位，`legacy_snapshot: true`，更新时间 `2026-09-30T01:27:54Z`。
- 软件工程：<https://codexradar.com/data/intelligence-efficiency.json>。36 个档位，更新时间 `2026-10-01T23:00:27+08:00`。来源另有相同日期的 `radar-legacy-software.json` 归档。
- 旧接口 `/api/visual-spatial-reasoning` 与 `/api/intelligence-efficiency-metrics` 验证时返回 502；API 子域的旧数据路径也未获得可用响应。

视觉归档允许直接跨域读取，因此不再通过 Jina 镜像读取失效接口。界面明确标注“归档已读取”，分别显示两个维度的原始时间，不把归档展示为当前实时评分。本站旧版综合 IQ 维持两项等权算术平均的既有规则，仅计算同一模型和档位的两个有效分数，属于本站派生值，不声称是源站当前综合口径。

两个维度独立加载，任何一项失效时保留另一项当次成功读取的数据；两项均失败时清空评分，不把缺失数据或旧值当作有效的 0 分。

## Artificial Analysis 智能指数

AI 雷达引用 [Artificial Analysis 官方榜单](https://artificialanalysis.ai/leaderboards/models) 中的部分模型档位和原始分数，页面标明摘录日期、[指数版本](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index)及[评测方法](https://artificialanalysis.ai/methodology/intelligence-benchmarking)。更新摘录时应一起核对榜单分数、测试档位、指数版本和日期。静态摘录在禁用 JavaScript 时仍可浏览，“刷新联网数据”更新使用接口的评分与预测。完整榜单与即时变化以 AA 原站为准。

## 预测

Codex Reset 继续读取公开 forecast/feed 接口；Will Codex Reset 继续通过只读镜像读取公开预测 JSON。各数据组可分别重试。所有预测仅供参考，不代表 OpenAI 官方结论。

## 验证

运行 `node --test scripts/test-ai-radar.mjs`，覆盖归档失效、单独重试恢复、缺失值和有效 0 分、四题权重及协议检查，以及首页不加载雷达的约束。站内检查使用 `node scripts/check-navigation.mjs` 和 `node scripts/check-site-links.mjs`。
