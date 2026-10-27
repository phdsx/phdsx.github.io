# Unity 对局空引用调查

- 现象：Chromium 本地版进入首局后，Unity 控制台记录一次 `NullReferenceException`，堆栈仅含 `UnityEngine.Bindings.ThrowHelper.ThrowNullReferenceException`；浏览器 JavaScript 没有异常。首局中移动、吞噬、计时和免费延长时间均可继续。
- 复现：使用 README 中的 `browser-smoke.mjs`；在 `docs/audit/evidence/hole-city/replica/results.json` 的 `unityErrors` 可见该日志。该现象在加中文资源前的本地原始构建也出现过，因此不能简单归因于中文字体或文本替换。
- 原站对照：一次原站观察进入菜单及对局，但未采集拖动后的完整日志；后续两次对照中一次未找到画布、一次画布始终隐藏，未取得可比较的操作结果。以上不足以判断错误是否原版既有问题。
- 当前假设：本地桥接、运行环境差异或原始游戏内部的可选对象均可能相关，尚无证据确认任一根因；不要把该警告描述成已修复或原版必有问题。
- 下一步：在原站可正常运行的浏览器中执行同样的开始、拖动、吞噬动作并保存对照日志；如仅本地出现，再针对桥接生命周期或缺失的可选对象分别进行最小验证。连续两次同一根因假设失败后停止该路线，更新本文件。
