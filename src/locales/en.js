/**
 * dsh-session-delete — 客户端文案目录（English）。
 *
 * 扁平 key → 模板字符串，占位符 {name}。键集合必须与 zh.js 完全一致
 *（test/locales.mjs 断言）；en 缺键时的回退链：en → zh。
 *
 * 安全约定（上游 PR 必须保持）：
 *   - 可恢复删除与不可恢复删除在英文里不允许只差一个词；
 *     两处确认文案均显式回收站语义 / 不可恢复语义。
 *   - 中文原文里「删除 / 彻底删除」只差二字前缀（源码固有的武器态歧义），
 *     英文翻译如遇先行歧义必须写得更明确，见各 key 的注释。
 */
export default {
  // -- Navigation / tabs --
  'nav.archived': 'Archived sessions',
  'tab.archived': 'Archived sessions',
  'tab.all': 'All sessions',
  'tab.trash': 'Recycle Bin',

  // -- Common --
  'common.close': 'Close',
  'common.reload': 'Reload',
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.untitled': 'Untitled',
  'common.noWorkspace': '(no workspace)',

  // -- Row tags --
  'tag.running': 'Running',
  'tag.open': 'Open',
  'tag.subagent': 'Subagent',

  // -- Relative time --
  'time.justNow': 'just now',
  'time.minutesAgo': '{count} minutes ago',
  'time.hoursAgo': '{count} hours ago',
  'time.daysAgo': '{count} days ago',

  // -- Recoverable delete (moves to the Recycle Bin) --
  'delete.label': 'Delete (to Recycle Bin)',
  'delete.confirm': 'Confirm: delete to Recycle Bin (recoverable)',
  'delete.hint': 'Moves the session to the Recycle Bin and keeps it hidden; you can restore it from the Recycle Bin tab',
  'delete.selected': 'Delete selected ({count})',
  'delete.confirmSelected': 'Confirm: delete {count} selected (to Recycle Bin, recoverable)',
  'delete.selectedHint': 'Moves the selected sessions to the Recycle Bin; you can restore them from the Recycle Bin tab',

  // -- Irreversible delete (purge inside the Recycle Bin / emptying it) --
  'purge.label': 'Permanently delete — cannot be undone',
  'purge.confirm': 'Confirm: permanently delete this item — CANNOT be undone',
  'purge.selected': 'Permanently delete selected ({count})',
  'purge.confirmSelected': 'Confirm: permanently delete {count} selected — CANNOT be undone',
  'purge.empty': 'Empty the Recycle Bin (permanently)',
  'purge.confirmEmpty': 'Confirm: empty the Recycle Bin — cannot be undone',

  // -- Restore --
  'restore.label': 'Restore',
  'restore.selected': 'Restore selected ({count})',
  'restore.selectedHint': 'Restore the selected items in place and unarchive them',
  'restore.rowHint': 'Unarchive: the session returns to its original sidebar group immediately',
  'restore.selectedUnarchHint': 'Unarchive the selected sessions; they reappear in their original sidebar groups immediately',

  // -- Footer (shared) --
  'footer.progress': 'Working',
  'footer.progressDelete': 'Deleting',
  'footer.progressRestore': 'Restoring',
  'footer.progressPurge': 'Permanently deleting',
  'footer.selectedCount': '{count} selected · {size}',
  'footer.countSize': '{count} items · {size}',
  'footer.selectAll': 'Select all ({count})',
  'footer.deselectAll': 'Deselect all',
  'footer.selectAllHint': 'Select every session in this list (follows the current filter and search)',
  'footer.selectAllHintOff': 'Deselect every session in this list',
  'footer.clear': 'Clear',

  // -- Notices --
  // Safer than the Chinese, which only says "deleted": here the title itself
  // names the Recycle Bin destination, so it can never read like a purge.
  'notice.deleteOne.title': 'Moved to Recycle Bin: {name}',
  'notice.deleteOne.detail': 'Moved to the Recycle Bin ({size}); hidden from the sidebar; restore it from the Recycle Bin tab',
  'notice.deleteBatch.title': 'Deleted {count} sessions · freed {size}',
  'notice.deleteBatch.detail': 'Moved to the Recycle Bin; hidden from the sidebar; restore them from the Recycle Bin tab',
  'notice.deleteFailed': 'Delete failed',
  'notice.deletePartial.title': 'Deleted {ok} · {failed} failed',
  'notice.deletePartial.detail': 'The recoverable copies are in the Recycle Bin; first failure: {message}',
  'notice.deleteAllFailed': 'All {count} deletions failed',
  'notice.restoreOne.title': 'Restored: {name}',
  'notice.restoreOk.title': 'Restored ({id})',
  'notice.restoreOk.detail': 'Unarchived; visible again in its original sidebar group',
  'notice.restoreFailed': 'Restore failed',
  'notice.restoreBatch.title': 'Restored {count} sessions',
  'notice.restoreBatchItems.title': 'Restored {count} items',
  'notice.restoreBatchPartial.title': 'Restored {ok} items · {failed} failed',
  'notice.restoreAndUnarchiveBatch.title': 'Restored {ok} · {failed} failed',
  'notice.restoreBatchAllFailed': 'All {count} restores failed',
  'notice.firstFailure': 'First failure: {message}',
  // Carried-over caveat (Chinese original kept verbatim as the zh string):
  // on some DSH versions a restore returns the files but leaves the session
  // archived. The English names that consequence directly, where the Chinese
  // only says "cannot unarchive online".
  'notice.stillArchived.title': 'Files restored ({id})',
  'notice.stillArchived.detail': 'The files are back, but this DSH version cannot unarchive sessions online; the session stays archived — to fully recover it, follow the README unhide steps',
  'notice.stillArchived.altDetail': 'The files are back in place; to unarchive them, see the Archived sessions tab',
  'notice.purgeOne.title': 'Permanently deleted 1 item — cannot be undone',
  'notice.purgeOne.detail': 'Gone; it cannot be restored from the Recycle Bin',
  'notice.purgeFailed': 'Permanent delete failed',
  'notice.purgeBatch.title': 'Permanently deleted {count} items — cannot be undone',
  'notice.purgeBatchPartial.title': 'Permanently deleted {ok} items · {failed} failed',
  'notice.purgeBatchAllFailed': 'All {count} permanent deletions failed',
  'notice.purgeAll.title': 'Emptied the Recycle Bin ({count} items) — gone for good',
  'notice.purgeAllFailed': 'Emptying the Recycle Bin failed',

  // -- Toolbar (All sessions tab) --
  'toolbar.searchPlaceholder': 'Search title / id',
  'filter.active': 'Not archived',
  'filter.stale30': 'Untouched for 30 days',
  'filter.archived': 'Archived',
  'filter.all': 'All',
  'filter.matchCount': '{shown} / {total}',

  // -- Toolbar (Archived tab hints) --
  'toolbar.archivedSummary': '{count} archived session(s) · {size} in total; deleting moves them to the Recycle Bin (recoverable) or permanently destroys them.',
  'toolbar.unarchHint': 'Click Restore on a row, or tick rows and Restore selected: the sessions return to their original sidebar groups immediately, no restart needed.',
  'toolbar.unarchUnavailable': 'This DSH version cannot unarchive sessions online; to recover one, follow the README unhide steps.',
  'toolbar.keepHidden': 'Deleted sessions stay archived-hidden and never reappear in the sidebar; the archived flag is cleaned up for good at the next DSH restart, while restoring from the Recycle Bin makes the session visible again immediately.',

  // -- Empty states --
  'empty.archived': 'No archived sessions.',
  'empty.archivedHint': 'After you archive a session from the sidebar, you can really delete its on-disk records here.',
  'empty.list': 'No sessions to list',
  'empty.filtered': 'No sessions match the current filter',
  'empty.trash': 'The Recycle Bin is empty',

  // -- Group header --
  'group.countSize': '{count} sessions · {size}',

  // -- Error boundary --
  'error.title': 'Settings page "Archived sessions" failed to render',

  // -- Plugin config card (Plugins settings section) --
  'card.title': 'Archived sessions',
  'card.description': 'Text language and the sidebar delete button',
  'card.locale.label': 'Text language',
  'card.locale.hint': '"Follow the app" uses the app-wide language setting.',
  'card.locale.zh': 'Chinese',
  'card.locale.en': 'English',
  'card.locale.auto': 'Follow the app',
  'card.sidebarButton.label': 'Show a delete button at the sidebar foot',
  'card.sidebarButton.hint': 'The button still asks for a two-step confirmation and defaults to the recoverable (Recycle Bin) action.',
  'card.save': 'Save',
  'card.saving': 'Saving',
  'card.discard': 'Discard changes',
  'card.unsaved': 'Unsaved',
  'card.readOnly': 'Read-only: this deployment does not allow editing plugin configuration here',
  'card.saveFailed': 'Save failed',

  // -- Sidebar foot button --
  'sidebar.delete.name': 'Delete current session',
  'sidebar.delete.hint': 'Delete the currently open session (moves it to the Recycle Bin; restore it from the Recycle Bin tab)',
  'sidebar.delete.confirm': 'Confirm delete?',
  'sidebar.delete.confirmHint': 'Moves to the Recycle Bin, recoverable',
}
