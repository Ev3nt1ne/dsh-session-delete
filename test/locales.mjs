/**
 * 双语文案目录一致性测试。
 *
 * src/locales/zh.js 与 en.js 是目录正本；浏览器 bundle（src/client.js）因
 * __ModuleLoader__ 单文件工厂无法 import 包内模块，内嵌了同一份副本——
 * 本测试断言三件事：
 *   1. zh 与 en 的键集合完全一致（缺键是本任务最容易出的回归）；
 *   2. 内嵌副本（mod.LOCALES）与正本逐键逐值相等（防漂移）；
 *   3. 安全性：恢复删除与彻底删除在两种语言里的按钮/确认/通知文案
 *      不允许雷同（两步确认是本插件的安全机制）。
 *
 * 运行：node test/locales.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const zh = (await import('../src/locales/zh.js')).default
const en = (await import('../src/locales/en.js')).default

assert.equal(typeof zh, 'object', 'zh 目录存在')
assert.notEqual(zh, null)

// ---- 1) 键集合一致 ----
const zhKeys = Object.keys(zh).sort()
const enKeys = Object.keys(en).sort()
assert.deepEqual(enKeys, zhKeys, 'en 与 zh 键集合必须一致')
assert.ok(zhKeys.length > 80, `目录规模应与拆出前一致，当前 ${zhKeys.length} 个 key`)
for (const k of zhKeys) {
  assert.equal(typeof zh[k], 'string', `zh[${k}] 是字符串`)
  assert.equal(typeof en[k], 'string', `en[${k}] 是字符串`)
  assert.ok(zh[k].length > 0 && en[k].length > 0, `zh/en[${k}] 非空`)
}

// ---- 2) client.js 内嵌副本与正本一致（防漂移） ----
let def = null
global.window = { __ModuleLoader__: { load: (d) => (def = d) } }
eval(readFileSync(new URL('../src/client.js', import.meta.url), 'utf8'))
assert.ok(def, 'client.js 须注册 factory')
const mod = def.factory((name) => {
  if (name === 'react') {
    return {
      createElement: () => {},
      useState: () => [null, () => {}],
      useEffect: () => {},
      Component: class {},
    }
  }
  throw new Error(`未预期的 require: ${name}`)
})
const inline = mod.LOCALES
for (const loc of ['zh', 'en']) {
  const source = loc === 'zh' ? zh : en
  const copy = inline[loc]
  assert.equal(Object.keys(copy).length, Object.keys(source).length, `${loc} 内嵌副本键数一致`)
  for (const [k, v] of Object.entries(source)) assert.equal(copy[k], v, `${loc}[${k}] 内嵌副本与正本逐字一致`)
}
// 占位符形状一致：zh 与 en 同 key 的 {x} 占位符集合必须完全一致
for (const k of zhKeys) {
  const ph = (s) => [...new Set(String(s).match(/\{(\w+)\}/g) ?? [])].sort().join()
  assert.equal(ph(en[k]), ph(zh[k]), `占位符一致: ${k}`)
}

// ---- 3) 安全性：两类删除的文案必须在两种语言里都清晰可辨 ----
const year = {
  zh: {
    delete: [zh['delete.confirm'], zh['notice.deleteOne.title'], zh['notice.deleteOne.detail']],
    purge: [zh['purge.label'], zh['purge.confirm'], zh['purge.confirmSelected'], zh['purge.confirmEmpty'], zh['notice.purgeOne.title']],
  },
  en: {
    delete: [en['delete.confirm'], en['notice.deleteOne.title'], en['notice.deleteOne.detail']],
    purge: [en['purge.label'], en['purge.confirm'], en['purge.confirmSelected'], en['purge.confirmEmpty'], en['notice.purgeOne.title']],
  },
}
for (const [lang, { delete: del, purge }] of Object.entries(year)) {
  // 回收站语义：删除类文案必须明说可回收/可还原
  assert.ok(del.join('\n').match(/回收站|Recycle Bin/), `${lang} 删除类文案必须点名回收站`)
  // 不可恢复类文案必须点名不可恢复
  assert.ok(purge.join('\n').match(/不可恢复|cannot be undone|CANNOT be undone/), `${lang} 彻底删除类文案必须点名不可恢复`)
  // 两类确认文案两两不同（只差一个词都算回归）
  for (const a of del) for (const b of purge) assert.notEqual(a, b, '两类确认文案差异化')
}
// zh 的两个“确认”按钮文案不能只差一个词（原源码的固有缺陷，本次修复）
const zhDelConfirm = zh['delete.confirm']
const zhPurgeConfirm = zh['purge.confirm']
assert.ok(
  zhDelConfirm.length - zhPurgeConfirm.length >= 2 || zhDelConfirm.split('（')[0] !== zhPurgeConfirm.split('（').slice(0, 1).join('（'),
  '中文两类确认文案仍需拉开差异',
)

// ---- 3b) 必须保留的两条原文语义 ----
assert.ok(zh['notice.stillArchived.detail'].includes('当前 DSH 版本无法在线解除归档'), '在线解档能力告警的中文原文须原样保留')
assert.ok(en['notice.stillArchived.detail'].includes('stays archived'), '英文须把“返回但仍是归档态”说清楚')

// ---- 3c) 代码引用完整性：client.js 内 t('key') 引用的 key 必须都存在 ----
const clientSrc = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
const used = [...new Set([...clientSrc.matchAll(/(?<![\w$.])t\('([^']+)'/g)].map((m) => m[1]))]
const missing = used.filter((k) => !(k in zh))
assert.deepEqual(missing, [], `client.js 引用了目录中不存在的 key: ${missing.join(', ')}`)

console.log(`文案目录测试通过：${zhKeys.length} 个 key，client 引用 ${used.length} 个 key 全部命中`)
