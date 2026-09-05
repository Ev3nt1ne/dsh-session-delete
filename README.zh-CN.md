# dsh-session-delete

[Switch to English / 切换到英文](README.md)

DSH（DeepSeek Harness）会话删除插件：官方「归档」只把会话移出侧栏，磁盘日志永久堆积——本插件补上真正的删除，先进回收站可还原。

- **删除（可恢复）**：会话先入回收站，「还原」放回侧栏原位
- **彻底删除**：不可恢复；确认文案经过刻意区分，两者不会混淆
- **全部会话**：按工作区分组，支持搜索、过滤、全选、批量删除
- **回收站**：批量还原 / 彻底删除 / 一键清空
- 正在运行的会话拒绝删除；删除当前打开的会话时自动切到空白会话

## 本 fork 新增

- **中英双语文案**（`src/locales/{zh,en}.js`）+ 插件配置 `locale`：`'zh' | 'en' | 'auto'`。
  默认为 **`'en'`**（本 fork 的运维环境）；中文仍完整可选，且是缺键回退语言。`'auto'` 跟随浏览器
  语言。绝不显示原始键名。
- **侧栏删除按钮（可选）**：配置 `sidebarButton`（默认 **关**）。开启后在侧栏底部出现垃圾桶
  按钮，两步确认：第一次按下进入待确认状态，4 秒内再按一次才删除——进回收站，绝不直接
  彻底删除。
- `npm test` 额外校验中英文文案键一一对应。

## 安装

```sh
dsh plugin --profile web add github:Ev3nt1ne/dsh-session-delete
```

零构建（纯 JS，无打包步骤），git 安装不会踩「源码没跑 build」的坑。新配置项在
**设置 → 插件 → 归档会话** 卡片中。

## 使用

1. 打开 **设置 → 归档会话**
2. 侧栏右键归档会话，或在「全部会话」页签处理任意会话
3. 删除先入回收站（`~/.dsh/trash/sessions/`）；确定不要再「彻底删除」
4. 旧版 DSH 无法在线解除归档时：自动隐藏还原入口，可在 DSH 停止时运行
   `node tools/unhide.mjs <sessionId>` 离线找回

## 开发

```sh
npm test   # smoke + render + locales（校验 zh/en 键一致性）
```

## License

Apache-2.0
