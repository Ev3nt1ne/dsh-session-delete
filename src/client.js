/**
 * dsh-session-delete — Client half.
 *
 * 手写 __ModuleLoader__ 包壳（与 tsdown 产物同构），零构建步骤。
 * 槽位：
 *   settings.section  设置页「归档会话」管理页（唯一入口）：
 *     · 归档会话（默认页签）—— 已归档会话清单：在线还原（解除归档，侧栏
 *       原分组立即可见）+ 单条删除（两步确认）+ 多选批量
 *     · 全部会话 —— 按工作区分组的全量清单，搜索/过滤/批量删除
 *     · 回收站 —— 按名称识别被删会话，多选批量还原 / 彻底删除 / 一键清空
 *   settings.plugin.item  Plugins 设置区本插件配置卡片（提交 2 起存在）：
 *     新增配置 locale（zh/en/auto，默认 zh）、sidebarButton（默认 false）。
 *   sidebar.footer.action  侧栏底部删除按钮（sidebarButton=true 才注册）：
 *     复用与设置页完全相同的两步确认/删除路径，默认仅可恢复删除。
 *
 * 文案：双语目录（zh 默认 / en），key 与 src/locales/*.js 正本一一对应
 * （test/locales.mjs 断言内嵌副本与正本逐键相等——目录文件在无构建的
 * 浏览器 bundle 里不可 import，内嵌由测试保证不漂移）。t(key, params)
 * 读插件配置 locale：zh/en 强制、auto 跟随宿主 locale 服务；缺键回退
 * 中文，回退仍缺则显示 key。
 *
 * 数据全部来自本机 Host API（/api/session-delete/*）；删除当前打开的会话后
 * 经 workspaces.startSession() 切到同工作区空白会话，UI 不悬空。
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-delete',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const PREFIX = '/api/session-delete'
    const HDR = 'x-dsh-plugin'

    // ---------- 交互样式（注入 <style>，随插件停止移除） ----------
    const CSS = `
      @keyframes sdFade { from { opacity: 0; transform: translateY(2px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes sdSpin { to { transform: rotate(360deg) } }
      .sd-fade { animation: sdFade .18s ease-out both }
      .sd-btn { transition: background .15s ease, border-color .15s ease, color .15s ease, transform .1s ease, opacity .15s ease }
      .sd-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-1)); border-color: var(--dsw-alias-border-l2) }
      .sd-btn:active:not(:disabled) { transform: scale(.96) }
      .sd-btn:disabled { opacity: .55; cursor: default }
      .sd-spin { display: inline-block; animation: sdSpin .8s linear infinite }
      /* 列表行：行间真实间距让相邻的选中背景彼此分开；选中/悬停样式统一在类里，
       * 避免 inline style 压掉 :hover（选中行悬停加深的反馈不能丢）。 */
      .sd-row { border-radius: 6px; margin-bottom: 3px; transition: background .14s ease, box-shadow .14s ease }
      .sd-row:hover { background: color-mix(in srgb, var(--dsw-alias-label-secondary) 6%, transparent) }
      /* 选中态三件套：品牌色底 + 3px 左侧强调条 + 1px 内描边——描边让选中行
       * 在密集列表里「浮」出来，与仅变灰的悬停态拉开层级；切换有 0.14s 过渡。 */
      .sd-row.sd-sel {
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
        box-shadow:
          inset 3px 0 0 var(--dsw-alias-brand-primary),
          inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
      }
      .sd-row.sd-sel:hover {
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
      }
      /* 复选框统一 14px：会话行/分组头/回收站行三处共用 .sd-check 类——
       * 尺寸规则挂在类上而非位置派生选择器上，分组头（非 .sd-row）不会漏；
       * 默认 13px 与显式 14px 混用正是「分组的选择框看起来更小」的原因。 */
      .sd-check { width: 14px; height: 14px; flex: none }
      /* 工作区分组头：标签化（小一号/加粗/次要色），吸顶 + 底部分隔线——
       * 长列表滚动时分组归属始终可见；与 13px/常规/主色的会话行形成清晰层级。 */
      .sd-grouphd {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 6px 5px 10px;
        margin-top: 8px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2);
        cursor: pointer;
      }
      .sd-grouphd:first-child { margin-top: 0 }
      .sd-grouphd:hover { background: color-mix(in srgb, var(--dsw-alias-label-secondary) 5%, transparent) }
      /*
       * 滚动让渡：官方设置面板把 section 内容放进 .options 容器（overflow-y:auto、
       * 普通 block）——按设计各 section 整体长高、容器滚动，tab 栏会跟着滚走。
       * 本页激活时（slot 锚点的直接子元素是 .sd-page）把该容器变成有界 flex 列并
       * 关掉自身滚动，让页面内部的列表区接管滚动、头部区固定。
       * 选择器只用结构（data-slot 锚点 + 类名），不依赖官方 CSS-module 哈希类名。
       */
      div:has(> [data-slot="settings.section"] > .sd-page) {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      /* 设置面板 nav 行：把回退的齿轮图标换成 16px 线性垃圾桶（currentColor mask） */
      button[data-sd-nav] > svg:first-of-type { display: none !important }
      button[data-sd-nav] > span:first-of-type::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 7px;
        flex: none;
        vertical-align: -3px;
        background-color: currentColor;
        -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'><path d='M2.5 4.2h11M6.3 2.2h3.4M3.8 4.2l.55 8.5a1 1 0 0 0 1 .93h5.3a1 1 0 0 0 1-.93l.55-8.5M6.5 7v4.3M9.5 7v4.3'/></svg>") center / contain no-repeat;
        mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'><path d='M2.5 4.2h11M6.3 2.2h3.4M3.8 4.2l.55 8.5a1 1 0 0 0 1 .93h5.3a1 1 0 0 0 1-.93l.55-8.5M6.5 7v4.3M9.5 7v4.3'/></svg>") center / contain no-repeat;
      }
      @media (prefers-reduced-motion: reduce) {
        .sd-fade, .sd-spin { animation: none !important }
        .sd-btn, .sd-row { transition: none !important }
      }
    `

    const T = {
      bg: 'var(--dsw-alias-bg-layer-2)',
      layer1: 'var(--dsw-alias-bg-layer-1)',
      border: 'var(--dsw-alias-border-l1)',
      border2: 'var(--dsw-alias-border-l2)',
      label: 'var(--dsw-alias-label-primary)',
      secondary: 'var(--dsw-alias-label-secondary)',
      brand: 'var(--dsw-alias-brand-primary)',
      ok: 'var(--dsw-alias-state-success-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      err: 'var(--dsw-alias-state-error-primary)',
    }

    // =========================================================================
    // 文案：双语目录 + t()（无第三方 i18n）
    // =========================================================================
    /**
     * 目录正本在 src/locales/zh.js / en.js（宿主半、test/locales.mjs 直接读取）；
     * 本文件是浏览器 bundle 的一部分（__ModuleLoader__ 单文件工厂，无法 import
     * 包内其他文件），所以内嵌同一主题副本。两处的一致性由 test/locales.mjs
     * 断言（逐键深度相等），不依赖任何构建步骤。
     */
    const LOCALES = {
      zh: {
      "nav.archived": "归档会话",
      "tab.archived": "归档会话",
      "tab.all": "全部会话",
      "tab.trash": "回收站",
      "common.close": "关闭",
      "common.reload": "重新加载",
      "common.loading": "加载中…",
      "common.retry": "重试",
      "common.untitled": "未命名",
      "common.noWorkspace": "(无目录)",
      "tag.running": "运行中",
      "tag.open": "打开中",
      "tag.subagent": "子代理",
      "time.justNow": "刚刚",
      "time.minutesAgo": "{count} 分钟前",
      "time.hoursAgo": "{count} 小时前",
      "time.daysAgo": "{count} 天前",
      "delete.label": "删除",
      "delete.confirm": "确认删除（入回收站，可还原）",
      "delete.hint": "删除后移入回收站并保持侧栏隐藏，可在「回收站」页签还原",
      "delete.selected": "删除所选 ({count})",
      "delete.confirmSelected": "确认删除 ({count})（入回收站，可还原）",
      "delete.selectedHint": "删除后移入回收站，可在「回收站」页签还原",
      "purge.label": "彻底删除",
      "purge.confirm": "确认彻底删除（不可恢复）",
      "purge.selected": "彻底删除所选 ({count})",
      "purge.confirmSelected": "确认彻底删除 ({count})（不可恢复）",
      "purge.empty": "清空回收站",
      "purge.confirmEmpty": "确认清空（不可恢复）",
      "restore.label": "还原",
      "restore.selected": "还原所选 ({count})",
      "restore.selectedHint": "还原所选：文件归位并解除归档",
      "restore.rowHint": "解除归档：会话立即回到侧栏原分组",
      "restore.selectedUnarchHint": "解除所选会话的归档：侧栏原分组立即可见",
      "footer.progress": "处理中",
      "footer.progressDelete": "删除中",
      "footer.progressRestore": "还原中",
      "footer.progressPurge": "彻底删除中",
      "footer.selectedCount": "已选 {count} 项 · {size}",
      "footer.countSize": "{count} 项 · {size}",
      "footer.selectAll": "全选 ({count})",
      "footer.deselectAll": "取消全选",
      "footer.selectAllHint": "选中当前列表的全部会话（跟随过滤与搜索）",
      "footer.selectAllHintOff": "取消选择当前列表的全部会话",
      "footer.clear": "清除",
      "notice.deleteOne.title": "已删除「{name}」",
      "notice.deleteOne.detail": "已移入回收站（{size}）· 侧栏已隐藏 · 可在「回收站」页签还原",
      "notice.deleteBatch.title": "已删除 {count} 个会话 · 释放 {size}",
      "notice.deleteBatch.detail": "已移入回收站 · 侧栏已隐藏 · 可在「回收站」页签还原",
      "notice.deleteFailed": "删除失败",
      "notice.deletePartial.title": "已删除 {ok} 个 · {failed} 个失败",
      "notice.deletePartial.detail": "成功部分已入回收站；首条失败：{message}",
      "notice.deleteAllFailed": "全部删除失败（{count} 个）",
      "notice.restoreOne.title": "已还原「{name}」",
      "notice.restoreOk.title": "已还原（{id}）",
      "notice.restoreOk.detail": "已解除归档 · 侧栏原分组立即可见",
      "notice.restoreFailed": "还原失败",
      "notice.restoreBatch.title": "已还原 {count} 个会话",
      "notice.restoreBatchItems.title": "已还原 {count} 项",
      "notice.restoreBatchPartial.title": "已还原 {ok} 项 · {failed} 项失败",
      "notice.restoreAndUnarchiveBatch.title": "已还原 {ok} 个 · {failed} 个失败",
      "notice.restoreBatchAllFailed": "全部还原失败（{count} 项）",
      "notice.firstFailure": "首条失败：{message}",
      "notice.stillArchived.title": "文件已还原（{id}）",
      "notice.stillArchived.detail": "当前 DSH 版本无法在线解除归档；彻底找回见 README 的 unhide 步骤",
      "notice.stillArchived.altDetail": "文件已归位；解除归档见「归档会话」页签",
      "notice.purgeOne.title": "已彻底删除 1 项",
      "notice.purgeOne.detail": "回收站中已不可恢复",
      "notice.purgeFailed": "彻底删除失败",
      "notice.purgeBatch.title": "已彻底删除 {count} 项",
      "notice.purgeBatchPartial.title": "已彻底删除 {ok} 项 · {failed} 项失败",
      "notice.purgeBatchAllFailed": "全部彻底删除失败（{count} 项）",
      "notice.purgeAll.title": "已清空回收站（{count} 项）",
      "notice.purgeAllFailed": "清空失败",
      "toolbar.searchPlaceholder": "搜索标题 / id",
      "filter.active": "未归档",
      "filter.stale30": "30 天未动",
      "filter.archived": "已归档",
      "filter.all": "全部",
      "filter.matchCount": "{shown} / {total}",
      "toolbar.archivedSummary": "{count} 个已归档会话 · 共 {size}；删除后进入回收站，可还原或彻底删除。",
      "toolbar.unarchHint": "点击行内「还原」或勾选后批量还原：会话立即回到侧栏原分组，无需重启。",
      "toolbar.unarchUnavailable": "当前 DSH 版本不支持在线解除归档；如需找回，见 README 的 unhide 步骤。",
      "toolbar.keepHidden": "删除后会话保持归档隐藏，不会回到侧栏；归档标记在下次重启 DSH 时彻底清理，回收站还原则立即恢复显示。",
      "empty.archived": "没有已归档的会话。",
      "empty.archivedHint": "在侧栏会话上右键「归档会话」后，可在此处真正删除其磁盘记录。",
      "empty.list": "没有可列出的会话",
      "empty.filtered": "当前过滤条件下没有会话",
      "empty.trash": "回收站为空",
      "group.countSize": "{count} 会话 · {size}",
      "error.title": "「归档会话」页渲染失败",
      "card.title": "归档会话",
      "card.description": "配置文案语言与侧栏删除按钮",
      "card.locale.label": "文案语言",
      "card.locale.hint": "「中文」与「English」之外的选项跟随应用语言设置。",
      "card.locale.zh": "中文",
      "card.locale.en": "English",
      "card.locale.auto": "跟随应用",
      "card.sidebarButton.label": "在侧栏底部显示删除按钮",
      "card.sidebarButton.hint": "点击后仍走两步确认；默认只做可恢复删除（进回收站）。",
      "card.save": "保存",
      "card.saving": "保存中",
      "card.discard": "放弃修改",
      "card.unsaved": "未保存",
      "card.readOnly": "只读：此部署不允许在页面上修改插件配置",
      "card.saveFailed": "保存失败",
      "sidebar.delete.name": "删除当前会话",
      "sidebar.delete.hint": "删除当前打开的会话（移入回收站，可在「回收站」页签还原）",
      "sidebar.delete.confirm": "确认删除？",
      "sidebar.delete.confirmHint": "移入回收站，可还原",
      },
      en: {
      "nav.archived": "Archived sessions",
      "tab.archived": "Archived sessions",
      "tab.all": "All sessions",
      "tab.trash": "Recycle Bin",
      "common.close": "Close",
      "common.reload": "Reload",
      "common.loading": "Loading…",
      "common.retry": "Retry",
      "common.untitled": "Untitled",
      "common.noWorkspace": "(no workspace)",
      "tag.running": "Running",
      "tag.open": "Open",
      "tag.subagent": "Subagent",
      "time.justNow": "just now",
      "time.minutesAgo": "{count} minutes ago",
      "time.hoursAgo": "{count} hours ago",
      "time.daysAgo": "{count} days ago",
      "delete.label": "Delete (to Recycle Bin)",
      "delete.confirm": "Confirm: delete to Recycle Bin (recoverable)",
      "delete.hint": "Moves the session to the Recycle Bin and keeps it hidden; you can restore it from the Recycle Bin tab",
      "delete.selected": "Delete selected ({count})",
      "delete.confirmSelected": "Confirm: delete {count} selected (to Recycle Bin, recoverable)",
      "delete.selectedHint": "Moves the selected sessions to the Recycle Bin; you can restore them from the Recycle Bin tab",
      "purge.label": "Permanently delete — cannot be undone",
      "purge.confirm": "Confirm: permanently delete this item — CANNOT be undone",
      "purge.selected": "Permanently delete selected ({count})",
      "purge.confirmSelected": "Confirm: permanently delete {count} selected — CANNOT be undone",
      "purge.empty": "Empty the Recycle Bin (permanently)",
      "purge.confirmEmpty": "Confirm: empty the Recycle Bin — cannot be undone",
      "restore.label": "Restore",
      "restore.selected": "Restore selected ({count})",
      "restore.selectedHint": "Restore the selected items in place and unarchive them",
      "restore.rowHint": "Unarchive: the session returns to its original sidebar group immediately",
      "restore.selectedUnarchHint": "Unarchive the selected sessions; they reappear in their original sidebar groups immediately",
      "footer.progress": "Working",
      "footer.progressDelete": "Deleting",
      "footer.progressRestore": "Restoring",
      "footer.progressPurge": "Permanently deleting",
      "footer.selectedCount": "{count} selected · {size}",
      "footer.countSize": "{count} items · {size}",
      "footer.selectAll": "Select all ({count})",
      "footer.deselectAll": "Deselect all",
      "footer.selectAllHint": "Select every session in this list (follows the current filter and search)",
      "footer.selectAllHintOff": "Deselect every session in this list",
      "footer.clear": "Clear",
      "notice.deleteOne.title": "Moved to Recycle Bin: {name}",
      "notice.deleteOne.detail": "Moved to the Recycle Bin ({size}); hidden from the sidebar; restore it from the Recycle Bin tab",
      "notice.deleteBatch.title": "Deleted {count} sessions · freed {size}",
      "notice.deleteBatch.detail": "Moved to the Recycle Bin; hidden from the sidebar; restore them from the Recycle Bin tab",
      "notice.deleteFailed": "Delete failed",
      "notice.deletePartial.title": "Deleted {ok} · {failed} failed",
      "notice.deletePartial.detail": "The recoverable copies are in the Recycle Bin; first failure: {message}",
      "notice.deleteAllFailed": "All {count} deletions failed",
      "notice.restoreOne.title": "Restored: {name}",
      "notice.restoreOk.title": "Restored ({id})",
      "notice.restoreOk.detail": "Unarchived; visible again in its original sidebar group",
      "notice.restoreFailed": "Restore failed",
      "notice.restoreBatch.title": "Restored {count} sessions",
      "notice.restoreBatchItems.title": "Restored {count} items",
      "notice.restoreBatchPartial.title": "Restored {ok} items · {failed} failed",
      "notice.restoreAndUnarchiveBatch.title": "Restored {ok} · {failed} failed",
      "notice.restoreBatchAllFailed": "All {count} restores failed",
      "notice.firstFailure": "First failure: {message}",
      "notice.stillArchived.title": "Files restored ({id})",
      "notice.stillArchived.detail": "The files are back, but this DSH version cannot unarchive sessions online; the session stays archived — to fully recover it, follow the README unhide steps",
      "notice.stillArchived.altDetail": "The files are back in place; to unarchive them, see the Archived sessions tab",
      "notice.purgeOne.title": "Permanently deleted 1 item — cannot be undone",
      "notice.purgeOne.detail": "Gone; it cannot be restored from the Recycle Bin",
      "notice.purgeFailed": "Permanent delete failed",
      "notice.purgeBatch.title": "Permanently deleted {count} items — cannot be undone",
      "notice.purgeBatchPartial.title": "Permanently deleted {ok} items · {failed} failed",
      "notice.purgeBatchAllFailed": "All {count} permanent deletions failed",
      "notice.purgeAll.title": "Emptied the Recycle Bin ({count} items) — gone for good",
      "notice.purgeAllFailed": "Emptying the Recycle Bin failed",
      "toolbar.searchPlaceholder": "Search title / id",
      "filter.active": "Not archived",
      "filter.stale30": "Untouched for 30 days",
      "filter.archived": "Archived",
      "filter.all": "All",
      "filter.matchCount": "{shown} / {total}",
      "toolbar.archivedSummary": "{count} archived session(s) · {size} in total; deleting moves them to the Recycle Bin (recoverable) or permanently destroys them.",
      "toolbar.unarchHint": "Click Restore on a row, or tick rows and Restore selected: the sessions return to their original sidebar groups immediately, no restart needed.",
      "toolbar.unarchUnavailable": "This DSH version cannot unarchive sessions online; to recover one, follow the README unhide steps.",
      "toolbar.keepHidden": "Deleted sessions stay archived-hidden and never reappear in the sidebar; the archived flag is cleaned up for good at the next DSH restart, while restoring from the Recycle Bin makes the session visible again immediately.",
      "empty.archived": "No archived sessions.",
      "empty.archivedHint": "After you archive a session from the sidebar, you can really delete its on-disk records here.",
      "empty.list": "No sessions to list",
      "empty.filtered": "No sessions match the current filter",
      "empty.trash": "The Recycle Bin is empty",
      "group.countSize": "{count} sessions · {size}",
      "error.title": "Settings page \"Archived sessions\" failed to render",
      "card.title": "Archived sessions",
      "card.description": "Text language and the sidebar delete button",
      "card.locale.label": "Text language",
      "card.locale.hint": "\"Follow the app\" uses the app-wide language setting; Chinese is the built-in default.",
      "card.locale.zh": "Chinese",
      "card.locale.en": "English",
      "card.locale.auto": "Follow the app",
      "card.sidebarButton.label": "Show a delete button at the sidebar foot",
      "card.sidebarButton.hint": "The button still asks for a two-step confirmation and defaults to the recoverable (Recycle Bin) action.",
      "card.save": "Save",
      "card.saving": "Saving",
      "card.discard": "Discard changes",
      "card.unsaved": "Unsaved",
      "card.readOnly": "Read-only: this deployment does not allow editing plugin configuration here",
      "card.saveFailed": "Save failed",
      "sidebar.delete.name": "Delete current session",
      "sidebar.delete.hint": "Delete the currently open session (moves it to the Recycle Bin; restore it from the Recycle Bin tab)",
      "sidebar.delete.confirm": "Confirm delete?",
      "sidebar.delete.confirmHint": "Moves to the Recycle Bin, recoverable",
      },
    }

    /** 宿主/客户端共享的 locale namespace（注册进 ctx.locale 回退链）。 */
    const LOCALE_NS = 'session-delete'

    // ---------- 插件配置（宿主 settings 命名空间 session-delete） ----------
    // 配置：locale = 'zh' | 'en' | 'auto'（默认 zh）；sidebarButton boolean = false。
    // 无 settingsScope（测试/极端环境）时走下方默认值：zh + 关闭，即上游行为。
    let localeCtx = null // ctx.locale（注入时赋值；缺省时 t 只认显式配置）
    let configScope = null // ctx.settingsScope.bind({ namespace })（注入时绑定）
    const configStore = {
      snapshot: { locale: 'zh', sidebarButton: false, writable: false, draftLocale: null, draftSidebar: null, saving: false, saveFailed: false, revision: 0 },
      listeners: new Set(),
      getSnapshot() { return this.snapshot },
      set(next) {
        if (next === this.snapshot) return
        this.snapshot = next
        for (const fn of this.listeners) fn()
      },
      subscribe(fn) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
      },
    }

    /** 解析生效语言：强制 zh/en，auto 跟随宿主 locale 快照（未知/缺省回退 zh）。 */
    function activeLocale() {
      const pref = configStore.getSnapshot().locale
      if (pref === 'en') return 'en'
      if (pref === 'auto') {
        let id = null
        try { id = localeCtx?.getLocale?.().active ?? null } catch {}
        return id === 'en' ? 'en' : 'zh'
      }
      return 'zh'
    }

    /** 模板插值：{name} 形式的占位符，缺参时保留原样（便于发现问题）。 */
    function formatParams(str, params) {
      if (!params) return str
      return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k])))
    }

    /**
     * 取文案：所处语言缺键回退中文，中文仍缺显示 key（防裸 key 抖给用户——
     * zh/en 键集合一致时理论上不会走到）。
     */
    function t(key, params) {
      const dict = LOCALES[activeLocale()] ?? LOCALES.zh
      const template = dict[key] ?? LOCALES.zh[key]
      if (template === undefined) return key
      return formatParams(template, params)
    }

    /** 语言的 hook 反应性：config 快照或宿主 locale 变化时重渲染。 */
    function useLocaleTick() {
      const [, setTick] = useState(0)
      useEffect(() => {
        const bump = () => setTick((n) => n + 1)
        const offs = [configStore.subscribe(bump)]
        if (localeCtx && typeof localeCtx.subscribe === 'function') offs.push(localeCtx.subscribe(bump))
        return () => { for (const off of offs) off() }
      }, [])
    }

    // ---------- workspaces 客户端服务（apply 时注入） ----------
    let workspacesService = null
    // 插件 client ctx（apply 时记录）：用于删除/还原后刷新宿主会话列表 store。
    let clientCtx = null

    /**
     * 让操作方客户端的 list store 重拉 session.list 基线。
     * 删除冷会话后宿主不发任何帧，本客户端 store 里的残留行只能靠基线重拉
     * 剪掉（mergeOrderedBaseline 会移除基线中不存在的 id）——不刷新的话行虽
     * 被归档隐藏，却仍留在内存里。refresh 不在 ISessions 类型化接口上（具体
     * 类 SessionRuntime 的方法），故惰性解析 + 能力探测，失败静默。
     */
    function refreshClientSessionList() {
      try {
        const s = clientCtx?.sessions ?? clientCtx?.get?.('sessions')
        s?.refresh?.()?.catch?.(() => {})
      } catch {
        /* 能力缺失时跳过：归档隐藏本身已保证已删会话不复活 */
      }
    }

    // ---------- 本机 API ----------
    async function api(path, options) {
      const res = await fetch(path, options)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw Object.assign(new Error(data?.error?.message ?? `HTTP ${res.status}`), { data })
      return data
    }
    function post(path, body) {
      return api(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [HDR]: 'session-delete' },
        body: JSON.stringify(body ?? {}),
      })
    }

    // ---------- 批量删除（返回统计与成功 id；命中当前会话时自动切走） ----------
    async function deleteMany(ids, currentId, onProgress) {
      let ok = 0
      let failed = 0
      let message = null
      const okIds = []
      let deletedCurrent = false
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        try {
          await post(`${PREFIX}/delete`, { id })
          ok += 1
          okIds.push(id)
          if (id === currentId) deletedCurrent = true
        } catch (e) {
          failed += 1
          if (message === null) message = `${shortId(id)}：${e?.message ?? e}`
        }
        if (onProgress) onProgress(i + 1, ids.length)
      }
      if (deletedCurrent && workspacesService) {
        try {
          workspacesService.startSession()
        } catch {}
      }
      return { ok, failed, message, okIds }
    }

    // ---------- 格式化 ----------
    function fmtSize(b) {
      if (b == null) return '—'
      if (b < 1024) return `${b} B`
      if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
      if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
      return `${(b / 1024 ** 3).toFixed(2)} GB`
    }
    function fmtAgo(ms) {
      if (!ms) return '—'
      const s = Math.floor((Date.now() - ms) / 1000)
      if (s < 60) return t('time.justNow')
      const m = Math.floor(s / 60)
      if (m < 60) return t('time.minutesAgo', { count: m })
      const hh = Math.floor(m / 60)
      if (hh < 48) return t('time.hoursAgo', { count: hh })
      return t('time.daysAgo', { count: Math.floor(hh / 24) })
    }
    function fmtDate(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      const p = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
    function shortId(id) {
      return String(id ?? '').replace(/^session-/, '').slice(0, 8)
    }

    // ---------- 样式片段 ----------
    const btnBase = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      background: 'transparent',
      color: T.label,
      fontSize: 13,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }
    const smallBtn = {
      ...btnBase,
      padding: '3px 9px',
      fontSize: 12,
    }
    const inputStyle = {
      padding: '4px 8px',
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      background: T.layer1,
      color: T.label,
      fontSize: 13,
      outline: 'none',
      minWidth: 0,
    }
    const tagStyle = (color) => ({
      fontSize: 11,
      color,
      border: `1px solid ${color}`,
      borderRadius: 4,
      padding: '0 4px',
      lineHeight: '15px',
      flexShrink: 0,
      opacity: 0.9,
    })
    /**
     * 统一操作反馈通知：状态点 + 标题 + 详情 + 关闭。
     * ok 6 秒自动消失；warn/err 常驻直到手动关闭或下一次操作。
     */
    function NoticeBanner({ notice, onClose }) {
      if (!notice) return null
      const color = notice.kind === 'err' ? T.err : notice.kind === 'warn' ? T.warn : T.ok
      return h(
        'div',
        {
          className: 'sd-fade',
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            margin: '10px 0 0',
            padding: '7px 10px',
            borderRadius: 8,
            flex: 'none',
            background: `color-mix(in srgb, ${color} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, ${T.border})`,
          },
        },
        [
          h('span', { key: 'dot', style: { width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 } }),
          h(
            'div',
            { key: 'body', style: { flex: 1, minWidth: 0 } },
            [
              h('div', { key: 't', style: { fontSize: 13, fontWeight: 600, color: T.label, lineHeight: '20px', wordBreak: 'break-word' } }, notice.title),
              notice.detail
                ? h('div', { key: 'd', style: { fontSize: 12, color: T.secondary, lineHeight: '18px', marginTop: 2, wordBreak: 'break-word' } }, notice.detail)
                : null,
            ].filter(Boolean),
          ),
          h(
            'button',
            {
              key: 'x',
              className: 'sd-btn',
              onClick: onClose,
              title: t('common.close'),
              'aria-label': t('common.close'),
              style: { border: 'none', background: 'transparent', color: T.secondary, cursor: 'pointer', padding: '0 2px', fontSize: 12, lineHeight: '18px', flexShrink: 0 },
            },
            '✕',
          ),
        ],
      )
    }

    /** 4 秒未确认自动解除武装（单条两步确认与侧栏按钮共用同一时间窗）。 */
    function useArmExpire(key, release) {
      useEffect(() => {
        if (key === null) return
        const timer = setTimeout(release, 4000)
        return () => clearTimeout(timer)
      }, [key])
    }

    /**
     * 单条两步确认删除按钮：第一次点击武装（变红），4 秒内再点执行。
     * armed/label 均由调用方传入文案——恢复删除与彻底删除在此层面就分岔，
     * 武器态文案绝不允许两种动作共用一个词。
     */
    function ArmDeleteButton({ armed, onArm, onFire, busy, label, armedLabel, hint }) {
      return h(
        'button',
        {
          className: 'sd-btn',
          style: {
            ...smallBtn,
            background: armed ? T.err : 'transparent',
            borderColor: armed ? T.err : T.border,
            color: armed ? '#fff' : T.label,
            fontWeight: armed ? 600 : 400,
          },
          disabled: busy,
          title: hint,
          onClick: armed ? onFire : onArm,
        },
        armed ? armedLabel : label,
      )
    }

    // =========================================================================
    // 设置页
    // =========================================================================
    function SettingsPage(props) {
      const currentId = props?.currentId

      useLocaleTick()

      // 可选 initial* 用于测试注入（生产恒为 undefined → 走 fetch 加载），
      // 让渲染测试能确定性覆盖「有数据」的分支（页脚/行/分组头等）。
      const [tab, setTab] = useState(props?.initialTab ?? 'archived') // archived | all | trash
      const [list, setList] = useState(props?.initialList ?? null)
      const [workspaces, setWorkspaces] = useState(props?.initialWorkspaces ?? [])
      const [trash, setTrash] = useState(props?.initialTrash ?? null)
      // 按数据域独立的加载/错误状态：回收站后台刷新不会干扰会话页签的按钮与错误提示
      const [listLoading, setListLoading] = useState(false)
      const [listError, setListError] = useState(null)
      const [trashLoading, setTrashLoading] = useState(false)
      const [trashError, setTrashError] = useState(null)
      // 宿主 /list 上报的在线解除归档能力（registry 内部状态机可用性）；
      // 旧版 DSH 为 false：隐藏还原入口，保留离线 unhide 指引
      const [unarchiveSupported, setUnarchiveSupported] = useState(props?.initialUnarchiveSupported ?? true)
      const [query, setQuery] = useState('')
      const [filter, setFilter] = useState('active') // active | archived | stale30 | all（仅 all 页签）
      const [selected, setSelected] = useState(new Set())
      const [busy, setBusy] = useState(false)
      const [progress, setProgress] = useState(null)
      const [notice, setNotice] = useState(null) // { kind: 'ok'|'warn'|'err', title, detail, at }
      const [arm, setArm] = useState(null) // 单条两步确认的目标（会话 id 或回收站条目名）
      const [purgeAllArmed, setPurgeAllArmed] = useState(false)

      // ok 类通知 6 秒自动消失（warn/err 常驻，直到手动关闭或下一次操作）
      useEffect(() => {
        if (!notice || notice.kind !== 'ok') return
        const timer = setTimeout(() => setNotice(null), 6000)
        return () => clearTimeout(timer)
      }, [notice?.at])

      async function loadList() {
        setListLoading(true)
        setListError(null)
        try {
          const data = await api(`${PREFIX}/list`)
          setList(data.sessions ?? [])
          setWorkspaces(data.workspaces ?? [])
          setUnarchiveSupported(data.unarchiveSupported === true)
        } catch (e) {
          setListError(String(e?.message ?? e))
        } finally {
          setListLoading(false)
        }
      }
      async function loadTrash() {
        setTrashLoading(true)
        setTrashError(null)
        try {
          const data = await api(`${PREFIX}/trash`)
          setTrash(data.items ?? [])
        } catch (e) {
          setTrashError(String(e?.message ?? e))
        } finally {
          setTrashLoading(false)
        }
      }

      useEffect(() => {
        setNotice(null)
        setArm(null)
        setSelected(new Set())
        // 页签切入总是重拉：/trash 毫秒级、/list 有宿主 mtime 缓存，均为无感刷新；
        // 若只在 null 时加载，删除/还原后切回页签会展示陈旧列表。
        if (tab === 'trash') loadTrash()
        else {
          loadList()
          // 预载回收站计数：首开即有「回收站 (N)」徽标，删除后能立即递增
          if (trash === null) loadTrash()
        }
      }, [tab])

      // 4 秒未确认自动解除武装
      useArmExpire(`${arm ?? ''}|${purgeAllArmed ? 'p' : ''}`, () => { setArm(null); setPurgeAllArmed(false) })

      // ---------- 动作 ----------
      /** 删除成功后本地移除对应行，并同步回收站状态（页签徽标即时反映新删条目）。 */
      function removeDeletedLocally(okIds) {
        if (okIds.length === 0) return
        if (list !== null) {
          const gone = new Set(okIds)
          setList(list.filter((s) => !gone.has(s.id)))
        }
        loadTrash() // 1ms 级接口；trash 从 null→有值 后「回收站 (N)」徽标立即出现/更新
        refreshClientSessionList() // 剪掉本客户端 list store 里的残留行
      }
      /** 在线解除归档成功后本地把对应行标记为未归档：离开归档页签、徽标即时递减。 */
      function markUnarchivedLocally(okIds) {
        if (okIds.length === 0 || list === null) return
        const done = new Set(okIds)
        setList(list.map((s) => (done.has(s.id) ? { ...s, archived: false } : s)))
      }
      /** 成功删除的会话体积合计（按删除前清单精确计算）。 */
      const sizeById = new Map((list ?? []).map((s) => [s.id, s.sizeBytes ?? 0]))
      const freedOf = (okIds) => okIds.reduce((acc, id) => acc + (sizeById.get(id) ?? 0), 0)
      const at = () => Date.now()

      async function fireSingleDelete(id) {
        setArm(null)
        setBusy(true)
        const title = (list ?? []).find((s) => s.id === id)?.title
        try {
          const r = await deleteMany([id], currentId)
          if (r.ok > 0) {
            setNotice({
              kind: 'ok',
              title: t('notice.deleteOne.title', { name: title || shortId(id) }),
              detail: t('notice.deleteOne.detail', { size: fmtSize(freedOf(r.okIds)) }),
              at: at(),
            })
          } else {
            setNotice({ kind: 'err', title: t('notice.deleteFailed'), detail: r.message, at: at() })
          }
          removeDeletedLocally(r.okIds)
        } finally {
          setBusy(false)
          setSelected(new Set())
        }
      }
      async function fireBatchDelete(ids) {
        setArm(null)
        setBusy(true)
        setProgress({ done: 0, total: ids.length })
        try {
          const r = await deleteMany(ids, currentId, (done, total) => setProgress({ done, total }))
          if (r.failed === 0) {
            setNotice({
              kind: 'ok',
              title: t('notice.deleteBatch.title', { count: r.ok, size: fmtSize(freedOf(r.okIds)) }),
              detail: t('notice.deleteBatch.detail'),
              at: at(),
            })
          } else if (r.ok > 0) {
            setNotice({
              kind: 'warn',
              title: t('notice.deletePartial.title', { ok: r.ok, failed: r.failed }),
              detail: t('notice.deletePartial.detail', { message: r.message }),
              at: at(),
            })
          } else {
            setNotice({ kind: 'err', title: t('notice.deleteAllFailed', { count: r.failed }), detail: r.message, at: at() })
          }
          removeDeletedLocally(r.okIds)
        } finally {
          setBusy(false)
          setProgress(null)
          setSelected(new Set())
        }
      }
      async function fireSingleUnarchive(id) {
        setBusy(true)
        const title = (list ?? []).find((s) => s.id === id)?.title
        try {
          await post(`${PREFIX}/unarchive`, { id })
          markUnarchivedLocally([id])
          setNotice({
            kind: 'ok',
            title: t('notice.restoreOne.title', { name: title || shortId(id) }),
            detail: t('notice.restoreOk.detail'),
            at: at(),
          })
        } catch (e) {
          const code = e?.data?.error?.code
          setNotice({
            kind: code === 'UNSUPPORTED' ? 'warn' : 'err',
            title: t('notice.restoreFailed'),
            detail: String(e?.message ?? e),
            at: at(),
          })
        } finally {
          setBusy(false)
        }
      }
      async function fireBatchUnarchive(ids) {
        setBusy(true)
        setProgress({ done: 0, total: ids.length, label: t('footer.progressRestore') })
        let ok = 0
        let failed = 0
        let message = null
        const okIds = []
        try {
          for (let i = 0; i < ids.length; i += 1) {
            const id = ids[i]
            try {
              await post(`${PREFIX}/unarchive`, { id })
              ok += 1
              okIds.push(id)
            } catch (e) {
              failed += 1
              if (message === null) message = `${shortId(id)}：${e?.message ?? e}`
            }
            setProgress({ done: i + 1, total: ids.length, label: t('footer.progressRestore') })
          }
          markUnarchivedLocally(okIds)
          if (failed === 0) {
            setNotice({ kind: 'ok', title: t('notice.restoreBatch.title', { count: ok }), detail: t('notice.restoreOk.detail'), at: at() })
          } else if (ok > 0) {
            setNotice({ kind: 'warn', title: t('notice.restoreAndUnarchiveBatch.title', { ok, failed }), detail: t('notice.firstFailure', { message }), at: at() })
          } else {
            setNotice({ kind: 'err', title: t('notice.restoreBatchAllFailed', { count: failed }), detail: message, at: at() })
          }
        } finally {
          setBusy(false)
          setProgress(null)
          setSelected(new Set())
        }
      }
      async function fireRestore(entry) {
        setArm(null)
        setBusy(true)
        try {
          const r = await post(`${PREFIX}/restore`, { entry })
          if (r.stillArchived) {
            setNotice({
              kind: 'warn',
              title: t('notice.stillArchived.title', { id: shortId(r.id ?? '') }),
              detail: t('notice.stillArchived.detail'),
              at: at(),
            })
          } else {
            setNotice({ kind: 'ok', title: t('notice.restoreOk.title', { id: shortId(r.id ?? '') }), detail: t('notice.restoreOk.detail'), at: at() })
          }
        } catch (e) {
          setNotice({ kind: 'err', title: t('notice.restoreFailed'), detail: String(e?.message ?? e), at: at() })
        } finally {
          setBusy(false)
          await loadTrash()
          loadList() // 还原的会话回到清单（归档页签/全部页签与徽标同步）
          refreshClientSessionList() // 拉最新基线，让还原的会话行数据与磁盘一致
        }
      }
      async function firePurge(entry) {
        setArm(null)
        setBusy(true)
        try {
          await post(`${PREFIX}/purge`, { entry })
          setNotice({ kind: 'ok', title: t('notice.purgeOne.title'), detail: t('notice.purgeOne.detail'), at: at() })
        } catch (e) {
          setNotice({ kind: 'err', title: t('notice.purgeFailed'), detail: String(e?.message ?? e), at: at() })
        } finally {
          setBusy(false)
          await loadTrash()
        }
      }
      async function firePurgeAll() {
        setPurgeAllArmed(false)
        setBusy(true)
        try {
          const r = await post(`${PREFIX}/purge`, { all: true })
          setNotice({ kind: 'ok', title: t('notice.purgeAll.title', { count: r.count ?? 0 }), detail: null, at: at() })
        } catch (e) {
          setNotice({ kind: 'err', title: t('notice.purgeAllFailed'), detail: String(e?.message ?? e), at: at() })
        } finally {
          setBusy(false)
          await loadTrash()
        }
      }
      /** 批量还原回收站条目：文件归位 + 自动解除归档，逐条容错。 */
      async function fireBatchRestore(entries) {
        setArm(null)
        setBusy(true)
        setProgress({ done: 0, total: entries.length, label: t('footer.progressRestore') })
        let ok = 0
        let failed = 0
        let message = null
        try {
          for (let i = 0; i < entries.length; i += 1) {
            try {
              await post(`${PREFIX}/restore`, { entry: entries[i] })
              ok += 1
            } catch (e) {
              failed += 1
              if (message === null) message = String(e?.message ?? e)
            }
            setProgress({ done: i + 1, total: entries.length, label: t('footer.progressRestore') })
          }
          if (failed === 0) {
            setNotice({
              kind: 'ok',
              title: t('notice.restoreBatchItems.title', { count: ok }),
              detail: unarchiveSupported ? t('notice.restoreOk.detail') : t('notice.stillArchived.altDetail'),
              at: at(),
            })
          } else if (ok > 0) {
            setNotice({ kind: 'warn', title: t('notice.restoreBatchPartial.title', { ok, failed }), detail: t('notice.firstFailure', { message }), at: at() })
          } else {
            setNotice({ kind: 'err', title: t('notice.restoreBatchAllFailed', { count: failed }), detail: message, at: at() })
          }
        } finally {
          setBusy(false)
          setProgress(null)
          setSelected(new Set())
          await loadTrash()
          loadList()
          refreshClientSessionList()
        }
      }
      /** 批量彻底删除所选条目（两步确认后进入）。 */
      async function fireBatchPurgeSelected() {
        const entries = [...selected]
        setArm(null)
        setBusy(true)
        setProgress({ done: 0, total: entries.length, label: t('footer.progressPurge') })
        let ok = 0
        let failed = 0
        let message = null
        try {
          for (let i = 0; i < entries.length; i += 1) {
            try {
              await post(`${PREFIX}/purge`, { entry: entries[i] })
              ok += 1
            } catch (e) {
              failed += 1
              if (message === null) message = String(e?.message ?? e)
            }
            setProgress({ done: i + 1, total: entries.length, label: t('footer.progressPurge') })
          }
          if (failed === 0) {
            setNotice({ kind: 'ok', title: t('notice.purgeBatch.title', { count: ok }), detail: t('notice.purgeOne.detail'), at: at() })
          } else if (ok > 0) {
            setNotice({ kind: 'warn', title: t('notice.purgeBatchPartial.title', { ok, failed }), detail: t('notice.firstFailure', { message }), at: at() })
          } else {
            setNotice({ kind: 'err', title: t('notice.purgeBatchAllFailed', { count: failed }), detail: message, at: at() })
          }
        } finally {
          setBusy(false)
          setProgress(null)
          setSelected(new Set())
          await loadTrash()
        }
      }

      // ---------- 数据视图 ----------
      const sessions = list ?? []
      const archivedSessions = sessions.filter((s) => s.archived)
      const q = query.trim().toLowerCase()
      const now = Date.now()
      const filteredAll = sessions.filter((s) => {
        if (filter === 'active' && s.archived) return false
        if (filter === 'archived' && !s.archived) return false
        if (filter === 'stale30' && now - (s.mtimeMs ?? 0) < 30 * 86400000) return false
        if (q && !`${s.title ?? ''}\n${s.id}`.toLowerCase().includes(q)) return false
        return true
      })

      const toggle = (id) => {
        // 批量删除/彻底删除处于武装态时改选集会让按钮计数失真——直接解除武装
        if (arm === 'trash-sel' || arm === 'sel:del') setArm(null)
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      const toggleGroup = (groupSessions) => {
        if (arm === 'sel:del') setArm(null)
        setSelected((prev) => {
          const next = new Set(prev)
          const allIn = groupSessions.every((s) => next.has(s.id))
          for (const s of groupSessions) {
            if (allIn) next.delete(s.id)
            else next.add(s.id)
          }
          return next
        })
      }

      const groups = new Map()
      for (const s of filteredAll) {
        const key = s.cwd ?? t('common.noWorkspace')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(s)
      }
      const groupMeta = (key) => {
        const ws = workspaces.find((w) => w.path === key)
        const name = ws?.title || (key === t('common.noWorkspace') ? key : key.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || key)
        return { name, path: key }
      }

      const tabBtn = (id, label, count) => {
        const active = tab === id
        return h(
          'button',
          {
            key: id,
            className: 'sd-btn',
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              border: 'none',
              borderRadius: 6,
              background: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)' : 'transparent',
              color: active ? T.brand : T.secondary,
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              lineHeight: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            },
            onClick: () => setTab(id),
          },
          [
            h('span', { key: 'l' }, label),
            count !== undefined && count !== null
              ? h('span', { key: 'c', style: { fontSize: 11, opacity: 0.8, fontVariantNumeric: 'tabular-nums' } }, String(count))
              : null,
          ].filter(Boolean),
        )
      }

      const selectedBytes = (rows) => rows.filter((s) => selected.has(s.id)).reduce((acc, s) => acc + (s.sizeBytes ?? 0), 0)

      // ---------- 行渲染 ----------
      /** 会话行：整行可点击切换选中（复选框/操作按钮自身阻止冒泡）。选中态样式见 .sd-sel。 */
      const sessionRow = (s, opts) => {
        const isSel = selected.has(s.id)
        return h(
          'div',
          {
            key: s.id,
            className: isSel ? 'sd-row sd-sel' : 'sd-row',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: opts?.indent ? '4px 6px 4px 22px' : '4px 6px 4px 10px',
              cursor: 'pointer',
              minHeight: 32,
            },
            onClick: () => toggle(s.id),
          },
          [
            h('input', {
              key: 'c',
              type: 'checkbox',
              className: 'sd-check',
              checked: selected.has(s.id),
              onChange: () => toggle(s.id),
              onClick: (e) => e.stopPropagation(),
              style: { accentColor: T.brand, cursor: 'pointer' },
            }),
            h(
              'span',
              { key: 't', style: { fontSize: 13, color: T.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }, title: `${s.title ?? t('common.untitled')}\n${s.id}\n${s.cwd ?? ''}` },
              s.title || `${t('common.untitled')} · ${shortId(s.id)}`,
            ),
            s.running ? h('span', { key: 'r', style: tagStyle(T.err) }, t('tag.running')) : null,
            s.live && !s.running ? h('span', { key: 'lv', style: tagStyle(T.brand) }, t('tag.open')) : null,
            s.origin === 'subagent' ? h('span', { key: 'sa', style: tagStyle(T.warn) }, t('tag.subagent')) : null,
            h('span', { key: 'm', title: fmtDate(s.mtimeMs), style: { fontSize: 11, color: T.secondary, flexShrink: 0, width: 64, textAlign: 'right' } }, fmtAgo(s.mtimeMs)),
            h('span', { key: 's', style: { fontSize: 11, color: T.secondary, flexShrink: 0, width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, fmtSize(s.sizeBytes)),
            opts?.restore
              ? h(
                  'span',
                  { key: 'rw', onClick: (e) => e.stopPropagation(), style: { display: 'inline-flex', flexShrink: 0 } },
                  h('button', {
                    className: 'sd-btn',
                    style: { ...smallBtn, borderColor: `color-mix(in srgb, ${T.brand} 45%, ${T.border})`, color: T.brand },
                    disabled: busy,
                    title: t('restore.rowHint'),
                    onClick: () => fireSingleUnarchive(s.id),
                  }, t('restore.label')),
                )
              : null,
            opts?.singleDelete
              ? h(
                  'span',
                  { key: 'dw', onClick: (e) => e.stopPropagation(), style: { display: 'inline-flex', flexShrink: 0 } },
                  h(ArmDeleteButton, {
                    armed: arm === s.id,
                    onArm: () => setArm(s.id),
                    onFire: () => fireSingleDelete(s.id),
                    busy,
                    label: t('delete.label'),
                    armedLabel: t('delete.confirm'),
                    hint: t('delete.hint'),
                  }),
                )
              : null,
          ].filter(Boolean),
        )
      }

      /** 回收站行：与会话行同款多选交互（整行点击选中，按钮阻止冒泡）。
       * 主文本优先显示会话名（删除时随 meta.json 带入），旧条目无标题回退 id。 */
      const trashRow = (it) => {
        const isSel = selected.has(it.entry)
        return h(
          'div',
          {
            key: it.entry,
            className: isSel ? 'sd-row sd-sel' : 'sd-row',
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px 5px 10px', minHeight: 32, cursor: 'pointer' },
            onClick: () => toggle(it.entry),
          },
          [
            h('input', {
              key: 'c',
              type: 'checkbox',
              className: 'sd-check',
              checked: isSel,
              onChange: () => toggle(it.entry),
              onClick: (e) => e.stopPropagation(),
              style: { accentColor: T.brand, cursor: 'pointer' },
            }),
            h(
              'span',
              { key: 't', style: { fontSize: 13, color: T.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }, title: `${it.title ?? ''}\n${it.id}\n${it.cwd ?? ''}` },
              it.title || it.id,
            ),
            h('span', { key: 'm', title: it.trashedAt ?? '', style: { fontSize: 11, color: T.secondary, flexShrink: 0, width: 64, textAlign: 'right' } }, fmtAgo(it.trashedAt ? Date.parse(it.trashedAt) : 0)),
            h('span', { key: 's', style: { fontSize: 11, color: T.secondary, flexShrink: 0, width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, fmtSize(it.sizeBytes)),
            h(
              'span',
              { key: 'rw', onClick: (e) => e.stopPropagation(), style: { display: 'inline-flex', flexShrink: 0 } },
              h('button', { className: 'sd-btn', style: { ...smallBtn, borderColor: `color-mix(in srgb, ${T.brand} 45%, ${T.border})`, color: T.brand }, disabled: busy, onClick: () => fireRestore(it.entry) }, t('restore.label')),
            ),
            h(
              'span',
              { key: 'pw', onClick: (e) => e.stopPropagation(), style: { display: 'inline-flex', flexShrink: 0 } },
              h(ArmDeleteButton, {
                armed: arm === `t:${it.entry}`,
                onArm: () => setArm(`t:${it.entry}`),
                onFire: () => firePurge(it.entry),
                busy,
                label: t('purge.label'),
                armedLabel: t('purge.confirm'),
              }),
            ),
          ],
        )
      }

      // ---------- 页签内容（仅滚动列表区） ----------
      function ArchivedTab() {
        if (listLoading && list === null) return h('div', { style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('common.loading'))
        if (archivedSessions.length === 0) {
          return h('div', { style: { fontSize: 13, color: T.secondary, padding: '8px 0', lineHeight: '20px' } }, [
            h('div', { key: 'a' }, t('empty.archived')),
            h('div', { key: 'b', style: { marginTop: 4 } }, t('empty.archivedHint')),
          ])
        }
        return h('div', null, archivedSessions.map((s) => sessionRow(s, { singleDelete: true, restore: unarchiveSupported })))
      }

      function AllTab() {
        if (listLoading && list === null) return h('div', { style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('common.loading'))
        if (sessions.length === 0) return h('div', { style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('empty.list'))
        return h(
          'div',
          null,
          groups.size === 0
            ? h('div', { key: 'e', style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('empty.filtered'))
            : [...groups].map(([key, groupSessions]) => {
                const meta = groupMeta(key)
                return h(
                  'div',
                  { key: `g:${key}` },
                  [
                    h('div', {
                      key: 'h',
                      className: 'sd-grouphd',
                      onClick: () => toggleGroup(groupSessions),
                    }, [
                      h('input', {
                        key: 'c',
                        type: 'checkbox',
                        className: 'sd-check',
                        checked: groupSessions.every((s) => selected.has(s.id)),
                        onChange: () => toggleGroup(groupSessions),
                        onClick: (e) => e.stopPropagation(),
                        style: { accentColor: T.brand, cursor: 'pointer' },
                      }),
                      h('span', { key: 'n', style: { fontSize: 12, fontWeight: 600, color: T.secondary, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: meta.path }, meta.name),
                      h('span', { key: 'i', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary))', flexShrink: 0 } }, t('group.countSize', { count: groupSessions.length, size: fmtSize(groupSessions.reduce((a, s) => a + (s.sizeBytes ?? 0), 0)) })),
                    ]),
                    ...groupSessions.map((s) => sessionRow(s, { indent: true, singleDelete: true, restore: s.archived && unarchiveSupported })),
                  ],
                )
              }),
        )
      }

      function TrashTab() {
        if (trashLoading && trash === null) return h('div', { style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('common.loading'))
        const items = trash ?? []
        return h(
          'div',
          null,
          items.length === 0
            ? h('div', { key: 'e', style: { fontSize: 13, color: T.secondary, padding: '8px 0' } }, t('empty.trash'))
            : items.map((it) => trashRow(it)),
        )
      }

      // ---------- 底部操作条 ----------
      function Footer() {
        if (tab === 'trash') {
          const items = trash ?? []
          if (items.length === 0) return null
          const selItems = items.filter((i) => selected.has(i.entry))
          const allSelected = items.every((i) => selected.has(i.entry))
          const purgeSelArmed = arm === 'trash-sel'
          return h(
            'div',
            { style: { borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8, flex: 'none' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, [
              h(
                'span',
                { key: 'n', style: { fontSize: 12, color: T.secondary } },
                busy
                  ? `${progress?.label ?? t('footer.progress')} ${progress?.done ?? 0}/${progress?.total ?? 0}`
                  : selected.size > 0
                    ? t('footer.selectedCount', { count: selected.size, size: fmtSize(selItems.reduce((a, i) => a + (i.sizeBytes ?? 0), 0)) })
                    : t('footer.countSize', { count: items.length, size: fmtSize(items.reduce((a, i) => a + (i.sizeBytes ?? 0), 0)) }),
              ),
              h(
                'button',
                { key: 'all', className: 'sd-btn', style: smallBtn, disabled: busy || trashLoading, onClick: () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.entry))) },
                allSelected ? t('footer.deselectAll') : t('footer.selectAll', { count: items.length }),
              ),
              selected.size > 0
                ? h('button', { key: 'c', className: 'sd-btn', style: smallBtn, disabled: busy, onClick: () => setSelected(new Set()) }, t('footer.clear'))
                : null,
              h(
                'button',
                {
                  key: 'r',
                  className: 'sd-btn',
                  style: { ...smallBtn, borderColor: `color-mix(in srgb, ${T.brand} 45%, ${T.border})`, color: T.brand, fontWeight: 600 },
                  disabled: busy || selected.size === 0,
                  title: t('restore.selectedHint'),
                  onClick: () => fireBatchRestore([...selected]),
                },
                t('restore.selected', { count: selected.size }),
              ),
              h(
                'button',
                {
                  key: 'ps',
                  className: 'sd-btn',
                  style: { ...smallBtn, marginLeft: 'auto', background: purgeSelArmed ? T.err : 'transparent', borderColor: purgeSelArmed ? T.err : T.border, color: purgeSelArmed ? '#fff' : T.err, fontWeight: 600 },
                  disabled: busy || selected.size === 0,
                  onClick: () => (purgeSelArmed ? fireBatchPurgeSelected() : setArm('trash-sel')),
                },
                purgeSelArmed ? t('purge.confirmSelected', { count: selected.size }) : t('purge.selected', { count: selected.size }),
              ),
              h(
                'button',
                {
                  key: 'p',
                  className: 'sd-btn',
                  style: { ...smallBtn, background: purgeAllArmed ? T.err : 'transparent', borderColor: purgeAllArmed ? T.err : T.border, color: purgeAllArmed ? '#fff' : T.err, fontWeight: 600 },
                  disabled: busy,
                  onClick: () => (purgeAllArmed ? firePurgeAll() : setPurgeAllArmed(true)),
                },
                purgeAllArmed ? t('purge.confirmEmpty') : t('purge.empty'),
              ),
            ]),
          )
        }
        const rows = tab === 'archived' ? archivedSessions : filteredAll
        if (rows.length === 0) return null
        // 全选切换：作用于当前页签的可见行（归档页=全部归档；全部会话页=过滤+搜索后）
        const allSelected = rows.every((s) => selected.has(s.id))
        const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((s) => s.id)))
        const showRestore = tab === 'archived' && unarchiveSupported
        // 批量删除与行内单删/回收站清空同款两步确认：第一次点击武装（4 秒有效），
        // 再点执行——误触不会一次删掉整组会话。改选集/切页签会自动解除武装。
        const batchDelArmed = arm === 'sel:del'
        return h('div', { style: { borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8, flex: 'none' } }, [
          h('div', { key: 'b', style: { display: 'flex', alignItems: 'center', gap: 8 } }, [
            h('span', { key: 'n', style: { fontSize: 12, color: T.secondary } }, busy ? `${progress?.label ?? t('footer.progressDelete')} ${progress?.done ?? 0}/${progress?.total ?? 0}` : t('footer.selectedCount', { count: selected.size, size: fmtSize(selectedBytes(rows)) })),
            h(
              'button',
              { key: 'all', className: 'sd-btn', style: smallBtn, disabled: busy || listLoading, onClick: toggleSelectAll, title: allSelected ? t('footer.selectAllHintOff') : t('footer.selectAllHint') },
              allSelected ? t('footer.deselectAll') : t('footer.selectAll', { count: rows.length }),
            ),
            selected.size > 0
              ? h('button', { key: 'c', className: 'sd-btn', style: smallBtn, disabled: busy, onClick: () => setSelected(new Set()) }, t('footer.clear'))
              : null,
            showRestore
              ? h(
                  'button',
                  {
                    key: 'rs',
                    className: 'sd-btn',
                    style: { ...smallBtn, marginLeft: 'auto', borderColor: `color-mix(in srgb, ${T.brand} 45%, ${T.border})`, color: T.brand, fontWeight: 600 },
                    disabled: busy || selected.size === 0,
                    title: t('restore.selectedUnarchHint'),
                    onClick: () => fireBatchUnarchive([...selected]),
                  },
                  t('restore.selected', { count: selected.size }),
                )
              : null,
            h(
              'button',
              {
                key: 'd',
                className: 'sd-btn',
                style: { ...smallBtn, marginLeft: showRestore ? 0 : 'auto', background: selected.size > 0 ? T.err : 'transparent', borderColor: selected.size > 0 ? T.err : T.border, color: selected.size > 0 ? '#fff' : T.label, fontWeight: 600 },
                disabled: busy || selected.size === 0,
                title: t('delete.selectedHint'),
                onClick: () => (batchDelArmed ? fireBatchDelete([...selected]) : setArm('sel:del')),
              },
              busy ? h('span', { className: 'sd-spin' }, '↻') : null,
              batchDelArmed ? t('delete.confirmSelected', { count: selected.size }) : t('delete.selected', { count: selected.size }),
            ),
          ]),
        ])
      }

      // ---------- 固定工具区（不随列表滚动） ----------
      function Toolbar() {
        if (tab === 'all' && list !== null && sessions.length > 0) {
          const filterBtn = (id, label) =>
            h(
              'button',
              { key: id, className: 'sd-btn', style: { ...smallBtn, borderColor: filter === id ? T.brand : T.border, color: filter === id ? T.brand : T.secondary, fontWeight: filter === id ? 600 : 400 }, onClick: () => { setFilter(id); setSelected(new Set()); setArm(null) } },
              label,
            )
          return h(
            'div',
            { key: 'tb-all', style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0 0', flex: 'none' } },
            [
              h('input', { key: 'q', style: { ...inputStyle, width: 160 }, placeholder: t('toolbar.searchPlaceholder'), value: query, onChange: (e) => setQuery(e.target.value) }),
              filterBtn('active', t('filter.active')),
              filterBtn('stale30', t('filter.stale30')),
              filterBtn('archived', t('filter.archived')),
              filterBtn('all', t('filter.all')),
              h('span', { key: 'n', style: { fontSize: 12, color: T.secondary, marginLeft: 'auto' } }, t('filter.matchCount', { shown: filteredAll.length, total: sessions.length })),
            ],
          )
        }
        if (tab === 'archived' && archivedSessions.length > 0) {
          return h(
            'div',
            { key: 'tb-arch', style: { margin: '10px 0 0', flex: 'none' } },
            [
              h('div', { key: 'a', style: { fontSize: 12, color: T.secondary, lineHeight: '18px' } },
                t('toolbar.archivedSummary', {
                  count: archivedSessions.length,
                  size: fmtSize(archivedSessions.reduce((a, s) => a + (s.sizeBytes ?? 0), 0)),
                })),
              h('div', { key: 'b', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary))', lineHeight: '17px', marginTop: 2 } },
                unarchiveSupported ? t('toolbar.unarchHint') : t('toolbar.unarchUnavailable')),
              h('div', { key: 'c', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary))', lineHeight: '17px', marginTop: 2 } },
                t('toolbar.keepHidden')),
            ],
          )
        }
        return null
      }

      // ---------- 页面：头部区固定，仅列表滚动 ----------
      return h(
        'div',
        { className: 'sd-page', style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
        [
          h('div', { key: 'hd', style: { display: 'flex', alignItems: 'center', gap: 8, flex: 'none' } }, [
            h(
              'div',
              { key: 'tabs', style: { display: 'inline-flex', gap: 2, padding: 2, background: T.layer1, border: `1px solid ${T.border}`, borderRadius: 8 } },
              [
                tabBtn('archived', t('tab.archived'), list ? archivedSessions.length : undefined),
                tabBtn('all', t('tab.all'), list ? sessions.length : undefined),
                tabBtn('trash', t('tab.trash'), trash ? trash.length : undefined),
              ],
            ),
            h(
              'button',
              { key: 'r', className: 'sd-btn', style: { ...smallBtn, marginLeft: 'auto' }, disabled: busy || (tab === 'trash' ? trashLoading : listLoading), title: t('common.reload'), onClick: () => (tab === 'trash' ? loadTrash() : loadList()) },
              h('span', { className: (tab === 'trash' ? trashLoading : listLoading) || busy ? 'sd-spin' : undefined }, '↻'),
            ),
          ]),
          h(Toolbar, { key: 'tb' }),
          (tab === 'trash' ? trashError : listError) ? h('div', { key: 'err', style: { fontSize: 13, color: T.err, padding: '8px 0', flex: 'none' } }, tab === 'trash' ? trashError : listError) : null,
          h(NoticeBanner, { key: 'notice', notice, onClose: () => setNotice(null) }),
          h(
            'div',
            { key: 'body', style: { overflowY: 'auto', flex: 1, minHeight: 0, marginTop: 8 } },
            tab === 'archived' ? h(ArchivedTab) : tab === 'all' ? h(AllTab) : h(TrashTab),
          ),
          h(Footer, { key: 'ft' }),
        ],
      )
    }

    // =========================================================================
    // 注册壳：恒定 hooks + 自有错误边界 + nav 图标 retag
    // =========================================================================

    /** 设置面板 nav 行的显示文本（与注册 label 一致；随生效语言变化）。 */
    const NAV_LABEL = () => t('nav.archived')

    /**
     * 给设置面板 nav 行打 data-sd-nav 标记（幂等）。
     * 官方面板按 section id 硬编码 nav 图标（models/agent-presets/plugins），
     * 其余 id 一律回退为与设置入口相同的齿轮；注册协议没有 icon 字段。
     * 判定条件：按钮的直接子 span 文本 === 当前 nav 标签且按钮有 svg 直接子节点
     * （nav 行图标是 svg；本插件页签里的同名文本按钮没有 svg，不会误伤）。
     * 标记后由 CSS 隐藏齿轮、以 currentColor mask 画 16px 线性垃圾桶。
     */
    function tagNavButtons(root) {
      if (typeof document === 'undefined') return
      try {
        const currentNavLabel = t('nav.archived')
        const scope = root ?? document
        const buttons = scope.querySelectorAll ? scope.querySelectorAll('button') : []
        for (const btn of buttons) {
          if (btn.hasAttribute('data-sd-nav')) continue
          const span = btn.querySelector(':scope > span')
          if (span && span.textContent === currentNavLabel && btn.querySelector(':scope > svg')) {
            btn.setAttribute('data-sd-nav', '1')
          }
        }
      } catch {
        /* retag 失败只影响图标，不影响功能 */
      }
    }

    /** 渲染错误兜底：把「一片空白」变成可见的错误信息（SlotErrorBoundary 只渲染空 div）。 */
    class SectionErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }
      static getDerivedStateFromError(error) {
        return { error }
      }
      componentDidCatch(error) {
        console.error('[dsh-session-delete] 设置页渲染失败:', error)
      }
      render() {
        if (this.state.error !== null) {
          return h(
            'div',
            { style: { fontSize: 13, color: T.err, lineHeight: '20px', padding: '12px 0' } },
            [
              h('div', { key: 't', style: { fontWeight: 600 } }, t('error.title')),
              h('div', { key: 'm', style: { color: T.secondary } }, String(this.state.error?.message ?? this.state.error)),
              h(
                'button',
                {
                  key: 'r',
                  className: 'sd-btn',
                  style: { ...btnBase, marginTop: 8 },
                  onClick: () => this.setState({ error: null }),
                },
                t('common.retry'),
              ),
            ],
          )
        }
        return this.props.children
      }
    }

    /**
     * 注册进 settings.section 的组件：
     * - 恒定调用 useSessions（不用条件式 hook，遵守 hooks 规则）；
     * - 自有 ErrorBoundary 兜底渲染错误。
     */
    function ArchiveSettingsSection(props) {
      const useSessionsHook = props?.useSessions ?? ((selector) => selector(undefined))
      const currentId = useSessionsHook((s) => s?.current)
      return h(SectionErrorBoundary, null, h(SettingsPage, { close: props?.close, currentId }))
    }

    // =========================================================================
    // 插件配置（宿主 settings 命名空间 session-delete 的卡片）
    // =========================================================================

    /**
     * Plugins 设置区的本插件配置卡：
     * - locale：下拉（中文 / English / 跟随应用），生效语言即时切换本插件全部文案；
     * - sidebarButton：开关（默认关；开启后在侧栏底部注册删除入口）。
     * 写路径与官方插件卡一致：ctx.settingsScope.bind({ namespace }) + scope.set 字段写入。
     * 卡片文案用本插件自家 t()（不依赖 slot 系统的 t 注入）。
     */
    function SessionDeleteConfigCard(props) {
      useLocaleTick()
      const state = props?.useSessionDeleteCard ? props.useSessionDeleteCard((s) => s) : configStore.getSnapshot()
      if (state == null) return null
      const writable = state.writable !== false
      const localeValue = state.draftLocale ?? state.locale ?? 'zh'
      const sidebarChecked = (state.draftSidebar ?? state.sidebarButton) === true
      const dirty = state.draftLocale != null || state.draftSidebar != null
      const saving = state.saving === true
      const failed = state.saveFailed === true

      function edit(field, value) {
        const s = { ...configStore.getSnapshot() }
        if (field === 'locale') s.draftLocale = value
        else if (field === 'sidebarButton') s.draftSidebar = value
        configStore.set(s)
      }
      function discard() {
        configStore.set({ ...configStore.getSnapshot(), draftLocale: null, draftSidebar: null, saveFailed: false })
      }
      async function save() {
        const s = { ...configStore.getSnapshot() }
        const changes = []
        if (s.draftLocale != null) changes.push(['locale', s.draftLocale])
        if (s.draftSidebar != null) changes.push(['sidebarButton', s.draftSidebar])
        if (changes.length === 0) return
        configStore.set({ ...s, saving: true, saveFailed: false })
        try {
          if (configScope) {
            for (const [field, value] of changes) await configScope.set(field, value)
          } else {
            configStore.set({
              ...configStore.getSnapshot(),
              locale: changes.some(([f]) => f === 'locale') ? s.draftLocale : configStore.getSnapshot().locale,
              sidebarButton: changes.some(([f]) => f === 'sidebarButton') ? s.draftSidebar === true : configStore.getSnapshot().sidebarButton,
              draftLocale: null,
              draftSidebar: null,
              saving: false,
              saveFailed: false,
            })
          }
        } catch {
          configStore.set({ ...configStore.getSnapshot(), saving: false, saveFailed: true })
          return
        }
        configStore.set({ ...configStore.getSnapshot(), saving: false, saveFailed: false })
      }

      return h(
        'div',
        { style: { fontSize: 13, color: T.secondary, width: '100%' } },
        [
          !writable ? h('p', { key: 'ro', role: 'status', style: { margin: '0 0 4px' } }, t('card.readOnly')) : null,
          h('div', { key: 'row1', style: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', flexWrap: 'wrap' } }, [
            h('label', { key: 'l', htmlFor: 'sd-cfg-locale', style: { color: T.label, flex: 'none' } }, t('card.locale.label')),
            h('select', {
              key: 's',
              id: 'sd-cfg-locale',
              style: { ...inputStyle, flex: 'none' },
              disabled: !writable || saving,
              value: localeValue,
              onChange: (e) => (props.edit ? props.edit('locale', e.target.value) : edit('locale', e.target.value)),
            }, [
              h('option', { key: 'zh', value: 'zh' }, t('card.locale.zh')),
              h('option', { key: 'en', value: 'en' }, t('card.locale.en')),
              h('option', { key: 'auto', value: 'auto' }, t('card.locale.auto')),
            ]),
            state.draftLocale != null ? h('span', { key: 'u', style: { fontSize: 12, color: T.warn } }, t('card.unsaved')) : null,
          ]),
          h('div', { key: 'row2', style: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' } }, [
            h('input', {
              key: 'c',
              id: 'sd-cfg-sidebar',
              type: 'checkbox',
              style: { accentColor: T.brand, cursor: 'pointer' },
              checked: sidebarChecked,
              disabled: !writable || saving,
              onChange: (e) => (props.edit ? props.edit('sidebarButton', e.target.checked) : edit('sidebarButton', e.target.checked)),
            }),
            h('label', { key: 'l', htmlFor: 'sd-cfg-sidebar', style: { color: T.label, cursor: writable && !saving ? 'pointer' : 'default' } }, t('card.sidebarButton.label')),
            state.draftSidebar != null ? h('span', { key: 'u', style: { fontSize: 12, color: T.warn } }, t('card.unsaved')) : null,
          ]),
          h('p', { key: 'h1', style: { margin: '4px 0 0', lineHeight: '18px' } }, t('card.locale.hint')),
          h('p', { key: 'h2', style: { margin: '2px 0 0', lineHeight: '18px' } }, t('card.sidebarButton.hint')),
          (dirty || saving || failed) && writable
            ? h('div', { key: 'act', style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } }, [
                failed ? h('span', { key: 'f', role: 'status', style: { color: T.err } }, t('card.saveFailed')) : null,
                h('button', {
                  key: 'd',
                  className: 'sd-btn',
                  style: smallBtn,
                  disabled: !dirty || saving,
                  onClick: () => (props.discard ? props.discard() : discard()),
                }, t('card.discard')),
                h('button', {
                  key: 's',
                  className: 'sd-btn',
                  style: { ...smallBtn, borderColor: T.brand, color: T.brand, fontWeight: 600 },
                  disabled: !dirty || saving,
                  onClick: () => (props.save ? props.save() : save()),
                }, saving ? t('card.saving') : t('card.save')),
              ])
            : null,
        ],
      )
    }

    // =========================================================================
    // 注册
    // =========================================================================

    /** 把宿主 settingsScope 的解析值流进 configStore（卡片与侧栏共用同一存储）。 */
    function syncConfigFromScope() {
      try {
        const s = configScope.getSnapshot()
        const resolved = { ...(s.base ?? {}), ...(s.value ?? {}) }
        configStore.set({
          locale: resolved.locale ?? 'zh',
          sidebarButton: resolved.sidebarButton === true,
          writable: s.writable !== false,
          revision: (configStore.getSnapshot().revision ?? 0) + 1,
        })
      } catch {
        /* scope 契约外：保持默认 zh/关闭 */
      }
    }

    /** apply：client 半的注册入口。 */
    function apply(ctx) {
      workspacesService = ctx.workspaces
      clientCtx = ctx

      // 宿主 locale 服务（可选注入）：登记双语文案 + auto 跟随 active locale
      try { localeCtx = ctx.locale ?? null } catch {}
      if (localeCtx && typeof localeCtx.register === 'function') {
        ctx.effect(() => {
          const d1 = localeCtx.register(LOCALE_NS, 'zh', LOCALES.zh)
          const d2 = localeCtx.register(LOCALE_NS, 'en', LOCALES.en)
          return () => { d1(); d2() }
        })
      }

      // 宿主 settings 命名空间（可选注入）：config 流 + 卡片读写共用 configScope
      try {
        configScope = ctx.settingsScope?.bind?.({ namespace: 'session-delete' }) ?? null
      } catch {
        configScope = null
      }
      if (configScope) {
        ctx.effect(() => {
          syncConfigFromScope()
          if (typeof configScope.subscribe !== 'function') return undefined
          const off = configScope.subscribe(syncConfigFromScope)
          return off
        })
      }

      ctx.effect(() => {
        const el = document.createElement('style')
        el.id = 'dsh-session-delete-styles'
        el.textContent = CSS
        document.head.appendChild(el)
        return () => el.remove()
      })
      // 常驻 nav 图标 retag：设置面板每次打开/切换 section 都会重建 nav 行 DOM，
      // 依赖组件渲染时机调度会漏（未选中本页时组件根本不渲染）。观察 DOM 变化，
      // 按钮一出现就打标——开销极小（只查新增节点里的 button）。
      ctx.effect(() => {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== 1) continue
              if (node.tagName === 'BUTTON') tagNavButtons(node)
              else if (node.querySelectorAll) tagNavButtons(node)
            }
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        tagNavButtons()
        return () => observer.disconnect()
      })
      ctx.effect(() =>
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register({ name: 'settings.section', id: 'session-delete', order: 20, label: NAV_LABEL }, ArchiveSettingsSection),
        ),
      )

      // Plugins 设置区：本插件配置卡（键 = settings 命名空间，官方按 ns 分发卡片）。
      // 卡面通过 hooks 拿 configStore 快照、通过 actions 拿编辑/写路径（与官方卡同构）。
      ctx.effect(() =>
        ctx.slots.inject('settings.plugin.item', () =>
          ctx.slots.register(
            {
              name: 'settings.plugin.item',
              key: 'session-delete',
              locale: LOCALE_NS,
              inject: () => ({
                hooks: { sessionDeleteCard: configStore },
                edit: (field, value) => {
                  const s = { ...configStore.getSnapshot() }
                  if (field === 'locale') s.draftLocale = value
                  if (field === 'sidebarButton') s.draftSidebar = value
                  s.revision = (s.revision ?? 0) + 1
                  configStore.set(s)
                },
                discard: () =>
                  configStore.set({ ...configStore.getSnapshot(), draftLocale: null, draftSidebar: null, saveFailed: false, revision: (configStore.getSnapshot().revision ?? 0) + 1 }),
                save: saveDraft,
              }),
            },
            SessionDeleteConfigCard,
          ),
        ),
      )

    }

    /** 卡片「保存」：草稿字段逐个写入 settings scope；无 scope（离线）就地生效。 */
    async function saveDraft() {
      const s = { ...configStore.getSnapshot() }
      const changes = []
      if (s.draftLocale != null) changes.push(['locale', s.draftLocale])
      if (s.draftSidebar != null) changes.push(['sidebarButton', s.draftSidebar])
      if (changes.length === 0) return
      configStore.set({ ...s, saving: true, saveFailed: false })
      try {
        if (configScope) {
          for (const [field, value] of changes) await configScope.set(field, value)
          configStore.set({ ...configStore.getSnapshot(), draftLocale: null, draftSidebar: null, saving: false })
        } else {
          const next = {}
          for (const [field, value] of changes) next[field] = value
          configStore.set({
            ...configStore.getSnapshot(),
            ...next,
            draftLocale: null,
            draftSidebar: null,
            saving: false,
            saveFailed: false,
            revision: (configStore.getSnapshot().revision ?? 0) + 1,
          })
        }
      } catch {
        configStore.set({ ...configStore.getSnapshot(), saving: false, saveFailed: true })
      }
    }

    exports.apply = apply
    exports.inject = ['slots', 'workspaces', 'locale', 'settingsScope']
    exports.SettingsPage = SettingsPage
    exports.ArchiveSettingsSection = ArchiveSettingsSection
    exports.SessionDeleteConfigCard = SessionDeleteConfigCard
    exports.LOCALES = LOCALES
    return module.exports
  },
})
