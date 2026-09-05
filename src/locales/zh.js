/**
 * dsh-session-delete — 文案目录（中文，默认语言）。
 *
 * 扁平 key → 模板字符串；占位符写 {name} 形式（见 client 半 t() 实现）。
 * zh 与 en 的键集合必须完全一致（test/locales.mjs 断言）；
 * en 缺键时的回退链：en → zh（而不是显示裸 key）。
 *
 * src/client.js 内嵌同一份 目录（无构建步骤，浏览器 bundle 是单文件）；
 * test/locales.mjs 断言两者逐键相等，防止改目录忘改内嵌副本。
 */
export default {
  // -- 导航 / 页签 --
  'nav.archived': '归档会话',
  'tab.archived': '归档会话',
  'tab.all': '全部会话',
  'tab.trash': '回收站',

  // -- 通用 --
  'common.close': '关闭',
  'common.reload': '重新加载',
  'common.loading': '加载中…',
  'common.retry': '重试',
  'common.untitled': '未命名',
  'common.noWorkspace': '(无目录)',

  // -- 行标记 --
  'tag.running': '运行中',
  'tag.open': '打开中',
  'tag.subagent': '子代理',

  // -- 相对时间 --
  'time.justNow': '刚刚',
  'time.minutesAgo': '{count} 分钟前',
  'time.hoursAgo': '{count} 小时前',
  'time.daysAgo': '{count} 天前',

  // -- 可恢复删除（进回收站） --
  'delete.label': '删除',
  'delete.confirm': '确认删除（入回收站，可还原）',
  'delete.hint': '删除后移入回收站并保持侧栏隐藏，可在「回收站」页签还原',
  'delete.selected': '删除所选 ({count})',
  'delete.confirmSelected': '确认删除 ({count})（入回收站，可还原）',
  'delete.selectedHint': '删除后移入回收站，可在「回收站」页签还原',

  // -- 不可恢复删除（回收站内彻底删除 / 清空） --
  'purge.label': '彻底删除',
  'purge.confirm': '确认彻底删除（不可恢复）',
  'purge.selected': '彻底删除所选 ({count})',
  'purge.confirmSelected': '确认彻底删除 ({count})（不可恢复）',
  'purge.empty': '清空回收站',
  'purge.confirmEmpty': '确认清空（不可恢复）',

  // -- 还原 --
  'restore.label': '还原',
  'restore.selected': '还原所选 ({count})',
  'restore.selectedHint': '还原所选：文件归位并解除归档',
  'restore.rowHint': '解除归档：会话立即回到侧栏原分组',
  'restore.selectedUnarchHint': '解除所选会话的归档：侧栏原分组立即可见',

  // -- 页脚通用 --
  'footer.progress': '处理中',
  'footer.progressDelete': '删除中',
  'footer.progressRestore': '还原中',
  'footer.progressPurge': '彻底删除中',
  'footer.selectedCount': '已选 {count} 项 · {size}',
  'footer.countSize': '{count} 项 · {size}',
  'footer.selectAll': '全选 ({count})',
  'footer.deselectAll': '取消全选',
  'footer.selectAllHint': '选中当前列表的全部会话（跟随过滤与搜索）',
  'footer.selectAllHintOff': '取消选择当前列表的全部会话',
  'footer.clear': '清除',

  // -- 通知 --
  'notice.deleteOne.title': '已删除「{name}」',
  'notice.deleteOne.detail': '已移入回收站（{size}）· 侧栏已隐藏 · 可在「回收站」页签还原',
  'notice.deleteBatch.title': '已删除 {count} 个会话 · 释放 {size}',
  'notice.deleteBatch.detail': '已移入回收站 · 侧栏已隐藏 · 可在「回收站」页签还原',
  'notice.deleteFailed': '删除失败',
  'notice.deletePartial.title': '已删除 {ok} 个 · {failed} 个失败',
  'notice.deletePartial.detail': '成功部分已入回收站；首条失败：{message}',
  'notice.deleteAllFailed': '全部删除失败（{count} 个）',
  'notice.restoreOne.title': '已还原「{name}」',
  'notice.restoreOk.title': '已还原（{id}）',
  'notice.restoreOk.detail': '已解除归档 · 侧栏原分组立即可见',
  'notice.restoreFailed': '还原失败',
  'notice.restoreBatch.title': '已还原 {count} 个会话',
  'notice.restoreBatchItems.title': '已还原 {count} 项',
  'notice.restoreBatchPartial.title': '已还原 {ok} 项 · {failed} 项失败',
  'notice.restoreAndUnarchiveBatch.title': '已还原 {ok} 个 · {failed} 个失败',
  'notice.restoreBatchAllFailed': '全部还原失败（{count} 项）',
  'notice.firstFailure': '首条失败：{message}',
  // 原文此句为「在线解除归档」能力缺失的告警：文件找回但会话仍处于归档态。
  'notice.stillArchived.title': '文件已还原（{id}）',
  'notice.stillArchived.detail': '当前 DSH 版本无法在线解除归档；彻底找回见 README 的 unhide 步骤',
  'notice.stillArchived.altDetail': '文件已归位；解除归档见「归档会话」页签',
  'notice.purgeOne.title': '已彻底删除 1 项',
  'notice.purgeOne.detail': '回收站中已不可恢复',
  'notice.purgeFailed': '彻底删除失败',
  'notice.purgeBatch.title': '已彻底删除 {count} 项',
  'notice.purgeBatchPartial.title': '已彻底删除 {ok} 项 · {failed} 项失败',
  'notice.purgeBatchAllFailed': '全部彻底删除失败（{count} 项）',
  'notice.purgeAll.title': '已清空回收站（{count} 项）',
  'notice.purgeAllFailed': '清空失败',

  // -- 工具条（全部会话页签） --
  'toolbar.searchPlaceholder': '搜索标题 / id',
  'filter.active': '未归档',
  'filter.stale30': '30 天未动',
  'filter.archived': '已归档',
  'filter.all': '全部',
  'filter.matchCount': '{shown} / {total}',

  // -- 工具条（归档页签提示） --
  'toolbar.archivedSummary': '{count} 个已归档会话 · 共 {size}；删除后进入回收站，可还原或彻底删除。',
  'toolbar.unarchHint': '点击行内「还原」或勾选后批量还原：会话立即回到侧栏原分组，无需重启。',
  'toolbar.unarchUnavailable': '当前 DSH 版本不支持在线解除归档；如需找回，见 README 的 unhide 步骤。',
  'toolbar.keepHidden': '删除后会话保持归档隐藏，不会回到侧栏；归档标记在下次重启 DSH 时彻底清理，回收站还原则立即恢复显示。',

  // -- 空态 --
  'empty.archived': '没有已归档的会话。',
  'empty.archivedHint': '在侧栏会话上右键「归档会话」后，可在此处真正删除其磁盘记录。',
  'empty.list': '没有可列出的会话',
  'empty.filtered': '当前过滤条件下没有会话',
  'empty.trash': '回收站为空',

  // -- 分组头 --
  'group.countSize': '{count} 会话 · {size}',

  // -- 错误边界 --
  'error.title': '「归档会话」页渲染失败',

  // -- 插件配置卡片（Plugins 设置区） --
  'card.title': '归档会话',
  'card.description': '配置文案语言与侧栏删除按钮',
  'card.locale.label': '文案语言',
  'card.locale.hint': '「中文」与「English」之外的选项跟随应用语言设置。',
  'card.locale.zh': '中文',
  'card.locale.en': 'English',
  'card.locale.auto': '跟随应用',
  'card.sidebarButton.label': '在侧栏底部显示删除按钮',
  'card.sidebarButton.hint': '点击后仍走两步确认；默认只做可恢复删除（进回收站）。',
  'card.save': '保存',
  'card.saving': '保存中',
  'card.discard': '放弃修改',
  'card.unsaved': '未保存',
  'card.readOnly': '只读：此部署不允许在页面上修改插件配置',
  'card.saveFailed': '保存失败',

  // -- 侧栏底部按钮 --
  'sidebar.delete.name': '删除当前会话',
  'sidebar.delete.hint': '删除当前打开的会话（移入回收站，可在「回收站」页签还原）',
  'sidebar.delete.confirm': '确认删除？',
  'sidebar.delete.confirmHint': '移入回收站，可还原',
}
