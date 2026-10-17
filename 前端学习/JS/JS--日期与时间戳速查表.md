# JS--日期与时间戳速查表（JS ↔ C# 对照）

> 覆盖第 **116-117 集**（应用篇 Day4）。本表随进度向后延伸。
> 权威来源：MDN —— [`Date()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)、[`getMonth()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/getMonth)、[`getTime()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime)、[`Date.now()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/now)。有分歧以 MDN 为准。
> 配套详解：同目录 [`JS--日期与时间戳-查找节点.md`](./JS--日期与时间戳-查找节点.md)

## 1. 创建

| 写法 | 含义 |
|---|---|
| `new Date()` | 现在这一刻 |
| `new Date(1792022400000)` | 毫秒时间戳 |
| `new Date('2026-10-15')` | 字符串，**只有日期 → 按 UTC 解析** |
| `new Date('2026-10-15T08:30:00')` | 字符串，**带时间 → 按本地解析** |
| `new Date(2026, 9, 15)` | 年、**月索引 0-11**、日（本地时区） |

## 2. 读取（⚠️ 两张错位表）

| 想要 | JS | C# | 错位 |
|---|---|---|---|
| 年 | `getFullYear()` | `.Year` | ✅（`getYear()` 已废弃） |
| 月 | `getMonth()` → **0-11** | `.Month` → 1-12 | ⚠️ **差 1** |
| **几号** | `getDate()` → 1-31 | `.Day` | ⚠️ **名字错位** |
| **星期几** | `getDay()` → 0-6（0=周日） | `.DayOfWeek` | ⚠️ **名字错位**；但 `0=周日` 碰巧一致 ✅ |
| 时 | `getHours()` | `.Hour` | ✅ |
| 分 | `getMinutes()` | `.Minute` | ✅ |
| 秒 | `getSeconds()` | `.Second` | ✅ |

**一句话**：`Day` 这个词在两边被用在了**不同地方**。JS 的 `getDay()` 是星期，`getDate()` 才是几号。

## 3. 格式化

| 写法 | 输出示例 | 备注 |
|---|---|---|
| `d.toLocaleDateString()` | `2026/10/15` | ⚠️ 格式跟随用户系统区域 |
| `d.toLocaleTimeString()` | `20:18:19` | 同上 |
| `d.toLocaleString()` | `2026/10/15 20:18:19` | 同上 |

⚠️ **要固定格式（如 `2026-10-15`）就自己拼** —— JS 原生没有 C# `ToString("yyyy-MM-dd")` 那种确定性。

## 4. 时间戳（⚠️ 单位与起点）

| 来源 | 单位 | 起点 | 与 JS 的关系 |
|---|---|---|---|
| `Date.now()` / `d.getTime()` | **毫秒** | 1970-01-01 UTC | —— |
| Unix 时间戳（多数后端 / PHP） | **秒** | 1970-01-01 UTC | `毫秒 ÷ 1000` |
| C# `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()` | 毫秒 | 1970-01-01 UTC | ✅ **完全一致** |
| C# `DateTimeOffset.UtcNow.ToUnixTimeSeconds()` | 秒 | 1970-01-01 UTC | `×1000` 得 JS 毫秒 |
| C# `DateTime.Ticks` | **100 纳秒** | **公元 1 年 1 月 1 日** | ❌ **起点+单位都不同，不可直接换算** |

- **1 毫秒 = 10 000 ticks。**
- 🔥 **秒 / 毫秒差 1000 倍 = 前后端联调第一颗雷。** 判别：**10 位数 = 秒，13 位数 = 毫秒。**
- `Date.now()` 是**静态方法**，必须写 `Date.now()`，不能 `new Date.now()`。
- ⚠️ **精度可能被浏览器取整**：MDN —— Firefox 默认 `privacy.reduceTimerPrecision` 取整到 **2ms**，开了 `resistFingerprinting` 可到 **100ms**。**别用它做高精度测量**（用 `Performance.now()` 或 `console.time`）。
- 时区不参与：`new Date(0)` 在中国显示 `1970-01-01 08:00:00`。

## 5. 非法日期与两个空值

| 输入 | 结果 |
|---|---|
| `new Date('乱写')` | `Invalid Date`（**不抛异常**） |
| `new Date(null)` | 1970-01-01（`null` → `0`） |
| `new Date(undefined)` | `Invalid Date`（`undefined` → `NaN`） |

检查办法：`isNaN(d.getTime())` → `true` 表示非法。

## 6. 最容易写错的六行

| 你写的 | 实际发生 | 结果 |
|---|---|---|
| `d.getMonth()` | 直接显示 | 十月显示成 `9` ← **最常见的日期 bug** |
| `new Date(2026, 10, 15)` | 以为是十月 | 其实是**十一月** |
| `d.getDay()` | 以为是"几号" | 拿到的是**星期几**（0-6） |
| `new Date(1792022400)` | 传了**秒** | 时间是 1970 年 1 月 |
| `new Date('2026-10-15').getDate()` | 以为跟本地一致 | 只有日期是 **UTC** 语义，跨时区出偏差 |
| `if (d)` 判断合法性 | 恒为真 | `Invalid Date` 是**真值**，必须用 `isNaN(d.getTime())` |

## 7. 倒计时的标准写法（⭐ 两条铁律）

```js
const target = new Date('2026-12-31T00:00:00').getTime();

const id = setInterval(function () {
  const rest = Math.floor((target - Date.now()) / 1000);   // ① 用「目标 − 现在」算
  if (rest <= 0) {
    clearInterval(id);                                      // ② 到点必须停
    return;
  }
  const day = Math.floor(rest / 60 / 60 / 24);
  const hour = Math.floor(rest / 60 / 60) % 24;
  const min = Math.floor(rest / 60) % 60;
  const sec = rest % 60;
}, 1000);
```

① **不能用"每秒减 1"** —— `setInterval` 真实间隔 ≥ 1000ms（第 90 集单线程队列），页面卡一下就会少扣。相减法永远准。
② **忘了 `clearInterval` 是最常见的性能漏点。**
