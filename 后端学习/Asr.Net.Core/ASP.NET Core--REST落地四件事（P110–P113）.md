==零：补充==

> **这一节回答三个问题：为什么"返回什么状态码"值得单独讲四节课？不讲究会怎样？什么时候可以偷懒？**

## 它解决什么问题

上一批（P105–P109）解决了"URL 该长什么样"。这一批解决的是**另一半**：

> **一次请求结束，你告诉客户端什么？**

同样是"删除一本不存在的书"，有六种返回方式，全都能跑：

```csharp
return Ok();                                  // 200，前端以为删成功了
return Ok(false);                             // 200 + false，前端得判 data
return Ok(new { code = 404, msg = "没有" });  // 200，但 body 里写 404（自欺欺人）
return NoContent();                           // 204，前端以为删成功了
return NotFound();                            // 404，语义准确
return NotFound(problemDetails);              // 404 + 标准错误结构，最完整
```

**这六种写法，代码量差不到一行，但对前端、对运维、对三个月后的你，成本差十倍。**

### 具体的成本差在哪

**① 前端要写多少判断**

```js
// 你返回 200 + {success:false}
const res = await fetch('/api/books/999', { method: 'DELETE' })
const body = await res.json()
if (res.ok && body.success) { 提示成功 }
else if (body.code === 404) { 提示不存在 }
else { 提示未知错误 }
// 每个接口都要写一遍，且每个接口的 code 含义都不一样

// 你返回标准状态码
const res = await fetch('/api/books/999', { method: 'DELETE' })
if (res.ok) { 提示成功 }                          // 204 也算 ok
else if (res.status === 404) { 提示不存在 }
// 可以抽成一个统一的请求封装，一次写完，全局复用
```

**② 运维能不能配监控**

```yaml
# 状态码标准化后，一行配置就能告警
alert: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
```

**如果你所有响应都是 200**，监控看到的是"错误率 0%"，而用户已经在骂了。**这是最致命的一条：你在生产环境变成了瞎子。**

**③ CDN / 网关 / 重试机制还能不能用**

- `404` / `400` → 网关通常不重试（重试也没用）
- `503` / `502` / `504` → 网关自动重试
- `409` → 前端可以提示"刷新后重试"
- `429` → 客户端应退避等待（看 `Retry-After` 头）

**全都返回 200，这些机制全部失效。**

**④ 你自己三个月后还看不看得懂**

```csharp
// A
public IActionResult Delete(long id) { ...; return Ok(); }

// B
public IActionResult Delete(long id)
{
    var book = _ctx.Books.Find(id);
    if (book is null) return NotFound();
    _ctx.Books.Remove(book);
    _ctx.SaveChanges();
    return NoContent();
}
```

A 需要你回忆"删除成功返回什么、失败返回什么"。B 一眼看完，不需要注释。

## 没有它会怎样

**场景一：前端无法区分"没登录"和"没权限"。**

你统一返回 `200 + {code: 401}`，前端拿到后不知道"该跳登录页"还是"该提示无权限"。**而 `401` 和 `403` 在 HTTP 里本来就是两个不同的东西**：401 = 你没证明你是谁，403 = 你证明了但不够格。

**场景二：并发冲突被静默吞掉。**

两个用户同时编辑同一本书，后提交的覆盖了先提交的。你的接口返回 `200 成功`——**丢数据的人完全不知道**。

正确做法是 `409 Conflict`（或者 `412 Precondition Failed`），让前端提示"内容已被他人修改，请刷新"。

**场景三：业务校验和参数格式错误混在一起。**

用户提交"库存不足"，你返回 `400 参数错误`，前端弹"请检查输入格式"——**用户会一脸问号，因为格式明明是对的**。

`400` 是"你的请求格式/语法有问题"，`422` 是"格式对，但语义上不成立"（库存不足、余额不够、书名重复）。**分开之后，前端能给出完全不同的提示。**

**场景四：异常直接变成 500 并把堆栈吐给用户。**

```json
{
  "error": "System.NullReferenceException: Object reference not set...",
  "stackTrace": "at BookApi.Controllers.BooksController.Get(Int64 id) in D:\\code\\...\\BooksController.cs:line 42"
}
```

**这既是安全问题（暴露源码路径和结构），也是体验问题（用户看不懂）。** 用户该看到的是"服务暂时不可用，请稍后重试"，日志里才该有堆栈。

## 它在整个生态里的位置

**这一批是"接口工程化"的分水岭。** 前一批（P105–109）教你"URL 怎么设计"，这一批教你"响应怎么设计"，两批合起来才是一个完整接口规范。

后面所有章节都建立在这一批的产物上：

| 后面的内容 | 依赖这一批的什么 |
|---|---|
| P134 ExceptionFilter | 异常 → 状态码的映射（`ArgumentException` → 400、`KeyNotFoundException` → 404） |
| P135–137 ActionFilter | 统一包装响应、记录耗时、限流返回 429 |
| P144–151 JWT 认证 | `401` 未登录 / `403` 无权限的分工 |
| P128 缓存 | `304 Not Modified`、`Cache-Control` |
| P119–123 响应缓存 | 只有 `GET` + `200` 才可缓存 |
| Part6 DDD | 领域异常 → 业务错误码的层次 |

## 对你个人的实际意义

**第一，你现在项目里的返回几乎是"全 200"。**

你的 `QueryController` / `BooksController` 大概率是这样：

```csharp
[HttpGet("books")]
public IActionResult GetBooks(...) => Ok(new { total, items });

[HttpPost("bulk-slow")]
public IActionResult BulkSlow() { ...; return Ok(new { elapsed }); }
```

`Ok(...)` 用得多不是错——**查询接口本来就该返回 200**。真正缺的是：**找不到的时候你有没有返回 404、业务校验失败时你有没有返回 400/422、异常时你有没有返回结构化的 500。**

**第二，这一批会让你写代码的"手感"变。**

以前你写接口的流程是：**写业务逻辑 → 包装成 JSON → return Ok**。
以后会变成：**想清楚有哪几种结局 → 每种结局对应什么状态码 → 再写逻辑**。

**这个顺序反过来，你的代码会自动变得清晰**，因为你在写第一行之前就知道了所有出口。

**第三，P112 的异步返回值会解决你一个真实的困惑。**

你一定想过："我的 Action 有时候 `async Task<IActionResult>`，有时候直接 `IActionResult`，到底该用哪个？"（这跟你 P12 学的"有些方法标 async 有些不标"是同一个问题的 Web 版）。

**第四，P113 的参数问题是你踩坑最多的地方。**

`[FromBody]` 收不到值、数组绑不上、日期格式不对、`null` 和空字符串分不清——**这些坑每个都浪费过你半小时**。这一节把它们一次性讲清。

## 诚实的话：什么时候可以偷懒

**状态码这件事，80% 的收益来自 20% 的规则。**

| 内容 | 重要度 | 说明 |
|---|---|---|
| `200` / `201` / `204` 分清 | ★★★ | 创建必须 201，删除/更新成功用 204 |
| `400` / `404` / `500` 分清 | ★★★ | 这三条覆盖了绝大多数场景 |
| `401` / `403` 分清 | ★★★ | 做认证时必须分清 |
| `409` 处理并发 | ★★ | 有多人编辑时才需要 |
| `422` vs `400` | ★★ | 团队约定即可，不必强求 |
| `ProblemDetails` 标准 | ★★ | 建议用，但自定格式也能活 |
| 业务错误码体系 | ★ | **别过度设计**。几十个错误码的体系对小项目是负担 |
| `202 Accepted`（异步任务） | ★ | 只有"提交后后台处理"才用 |
| `410 Gone` / `451` 之类 | ★ | 知道就行，几乎不用 |

**特别提醒：不要为了"专业感"搞 30 个业务错误码 + 一套错误码字典。** 我在 P111 会讲一个"两层错误码"的轻量方案，够用且不累。

**一句话总结这批的定位：P110 讲每个状态码什么时候用，P111 把它们拼成一份落地规范，P112 让接口不阻塞线程，P113 让参数一定收得到。**

---

==一：概念==

> 本篇覆盖 **P110–P113**：Web API 如何返回状态码、ASP.NET Core 中 REST 落地指南、WebAPI 的异步及返回值、Web API 的参数问题。
> 环境：**.NET 10**。
> 承接：P105–P109 的 REST 语义是这一批的前提。**这一批不再讲"什么是 REST"，只讲"怎么把它写成代码"。**
> 本篇用 EF Core（你的 `BookDbContext` 那套）做例子，因为异步和参数绑定在真实项目里都跟 EF Core 一起出现。

---

# P110　Web API 如何返回状态码

**一句话：状态码不是"顺便返回的东西"，它是接口契约的一部分——每一种可能的结局都必须有一个确定的码。**

## 1. 先把 4xx 里最容易混的五对讲清

### ① `400` vs `422`：语法错 vs 语义错

| 状态码 | 含义 | 例子 |
|---|---|---|
| **400 Bad Request** | 请求**语法/格式**有问题，服务端没法解析 | JSON 格式错、`price` 传了 `"abc"`、必填字段缺失、类型对不上 |
| **422 Unprocessable Entity** | 格式**没问题**，但**业务上不成立** | 库存不足、余额不够、书名重复、日期区间倒置 |

```csharp
// 400：这是框架自动给的（模型验证失败）
// {"price": "abc"}  → 400 + errors: { "price": ["The JSON value could not be converted..."] }

// 422：这是你自己判断的（业务规则）
if (book.Stock < req.Quantity)
    return UnprocessableEntity(new { message = $"库存只剩 {book.Stock} 本" });
```

> **ASP.NET Core 默认不用 422**——`[ApiController]` 的自动验证一律返回 400。
> **实务建议**：小项目全用 400 也能活；但只要你有"格式对但业务不成立"的场景，**422 能让前端的提示准确得多**。团队内部统一即可。

### ② `401` vs `403`：没证明身份 vs 证明身份但不够格

| 状态码 | 含义 | 触发条件 | 前端该做什么 |
|---|---|---|---|
| **401 Unauthorized** | **你没告诉我你是谁**（或凭证过期/无效） | 没带 token、token 过期、签名错 | **跳登录页** |
| **403 Forbidden** | **我知道你是谁，但你不够格** | 已登录，但角色/权限不足 | **提示"无权限"**，不要跳登录 |

```csharp
// 401：认证失败（凭证问题）
return Unauthorized();                       // 或交给 [Authorize] 中间件自动返回

// 403：授权失败（权限问题）
return Forbid();                             // 注意：不是 NotFound，也不是 Unauthorized
```

> **名字的坑**：`401 Unauthorized` 这个名字是历史遗留的错译，它真正的意思是 **Unauthenticated（未认证）**。别被名字带偏。
>
> **另一个坑**：用 `[Authorize]` 时，**未登录**返回 401，**已登录但角色不符**返回 403，这是框架自动分的。但如果你手写 `if (!user.IsInRole("Admin")) return Unauthorized();`，**那就错了**——应该是 `Forbid()`。

### ③ `404` vs `410`：从来没有 vs 曾经有过

| 状态码 | 含义 | 用不用 |
|---|---|---|
| **404 Not Found** | 资源不存在（也可能是不想让你知道它存在） | **99% 的情况用它** |
| **410 Gone** | 资源曾经存在，被永久删除了 | 几乎不用。除非做 SEO，要告诉搜索引擎"这个页面永久没了，别再来爬" |

**实务：一律 404。** `410` 知道就行。

### ④ `409` vs `412`：状态冲突 vs 前置条件失败

| 状态码 | 含义 | 场景 |
|---|---|---|
| **409 Conflict** | 请求与资源当前状态冲突 | 用户名已存在、重复发布、**乐观并发冲突** |
| **412 Precondition Failed** | `If-Match` 等前置条件不满足 | 基于 ETag 的并发控制（HTTP 标准做法） |

```csharp
// 409：业务层面的冲突
if (await _ctx.Books.AnyAsync(b => b.Title == req.Title))
    return Conflict(new { message = "同名图书已存在" });

// 409：并发冲突（你 P88–P89 学的并发令牌，在 API 层就变成 409）
catch (DbUpdateConcurrencyException)
{
    return Conflict(new { message = "数据已被他人修改，请刷新后重试" });
}
```

> **注意**：你学 EF Core 并发那一批（P88–P89）时，`DbUpdateConcurrencyException` 只是个异常。**这一节告诉你它该变成什么 HTTP 响应：409。**

### ⑤ `500` vs `503`：代码挂了 vs 服务暂时不可用

| 状态码 | 含义 | 例子 |
|---|---|---|
| **500 Internal Server Error** | 服务端代码出错了（bug） | 空引用、数据库约束违反、序列化失败 |
| **503 Service Unavailable** | 服务暂时不可用（不是 bug，是状态） | 正在重启、维护中、依赖的下游服务挂了、过载保护 |

**关键区别**：`503` 可以带 `Retry-After: 30`，告诉客户端"30 秒后再试"。**`500` 不该被重试**（重试还是错）。

## 2. 2xx 里最容易搞错的三个

| 状态码 | 什么时候用 | 有没有 body |
|---|---|---|
| **200 OK** | 查询成功；或者"更新成功且要返回更新后的数据" | 有 |
| **201 Created** | **创建**成功 | 有 + **必须带 `Location` 头** |
| **204 No Content** | 成功，但**没有内容可返回**（删除、更新、状态切换） | **绝对没有**（不能有 body） |

```csharp
// ✅ 创建：201 + Location
return CreatedAtAction(nameof(Get), new { id = book.Id }, book);
// 响应头：Location: /api/books/6
// 响应体：{ "id": 6, "title": "..." }

// ✅ 删除：204，无 body
return NoContent();

// ⚠️ 常见错误：204 + body
return NoContent();  // 后面绝对不能 WriteAsync，框架会抛异常
```

> **`201` 为什么必须带 `Location`**：REST 的约定是"创建成功后告诉我新资源在哪"。前端拿到 `Location` 可以直接跳转或后续操作，**不用猜 id**。
>
> **`CreatedAtAction` 三个参数**：① 用来生成 URL 的 Action 名 ② 路由参数 ③ 返回的 body。它会自动拼出 `Location`。

### 202 Accepted 是什么（知道就行）

```csharp
// 提交了一个耗时任务，还没做完
return AcceptedAtAction(nameof(GetStatus), new { taskId }, new { taskId, status = "pending" });
// 202 + Location: /api/tasks/{id}
```

**只有当"提交后后台异步处理"时才用**。你的项目暂时用不上（学到托管服务 P152–153 会用到）。

## 3. `ProblemDetails`：为什么要有标准错误格式

### 自己定义的格式有什么问题

```csharp
// 项目 A
return BadRequest(new { code = 4001, msg = "书名不能为空" });

// 项目 B
return BadRequest(new { success = false, error = new { field = "title", reason = "required" } });

// 项目 C
return BadRequest(new { message = "参数错误", errors = new[] { "title is required" } });
```

**三个项目三种格式，前端要写三套解析；调第三方 API 时更是抓瞎。**

### RFC 9457（原 RFC 7807）定义的标准结构

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "detail": " See the errors property for details.",
  "instance": "/api/books",
  "traceId": "00-8a1f3c2e9b7d4a1f-3c2e9b7d4a1f2b6c-00",
  "errors": {
    "Title": ["The Title field is required."]
  }
}
```

| 字段 | 含义 | 谁在用 |
|---|---|---|
| `type` | 错误类型的 URI（指向文档，可点开看说明） | 机器可读，客户端可按 type 分支处理 |
| `title` | 错误标题（人类可读，简短） | 展示用 |
| `status` | HTTP 状态码（和响应行里的一致） | 冗余但方便 |
| `detail` | 这次错误的具体说明 | 展示用 |
| `instance` | 出错的请求路径 | 排查用 |
| `traceId` | **链路追踪 id**（ASP.NET Core 自动加） | **排查线上问题的命根子** |
| `errors` | 字段级错误（`ValidationProblemDetails` 才有） | 表单逐字段提示 |

> **`traceId` 是这套格式最值钱的字段**。用户截图给你一个 `traceId`，你去日志里 grep 这一条，就能定位到那一次请求的全部日志。**没有它，你只能靠时间戳大海捞针。**

### 三个返回 ProblemDetails 的方法

```csharp
// ① 最简单：框架自动包装（status 由方法决定）
return Problem(statusCode: 500, title: "服务器内部错误");

// ② 带详情
return Problem(
    detail: "数据库连接超时",
    statusCode: 503,
    title: "服务暂时不可用");

// ③ 验证错误（返回 400 + ValidationProblemDetails）
ModelState.AddModelError("Title", "书名不能重复");
return ValidationProblem(ModelState);
```

### 全局开启 ProblemDetails

```csharp
builder.Services.AddProblemDetails();      // 注册服务
// ...
app.UseExceptionHandler();                 // 异常 → 自动变成 ProblemDetails
app.UseStatusCodePages();                  // 空响应体 → 自动补 ProblemDetails
```

**这两个中间件的行为差别**：

| 中间件 | 管什么 |
|---|---|
| `UseExceptionHandler()` | **未处理异常** → 500 + ProblemDetails（生产环境）；开发环境走 `UseDeveloperExceptionPage()` |
| `UseStatusCodePages()` | **没有 body 的 4xx/5xx**（比如 `return NotFound()` 不带参数）→ 自动补一个 ProblemDetails body |

> **只用 `return NotFound()` 会得到空 body**。要看 JSON 就得配 `UseStatusCodePages()`，或者显式 `return NotFound(problem)`。**这是很多人的困惑："为什么我的 404 响应体是空的？"**

## 4. 自定义 `[ApiController]` 的自动 400

`[ApiController]` 的自动验证返回的 400 格式可以改。这是全局配置：

```csharp
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            // 把 ModelState 里的错误摊平成字符串数组
            var errors = context.ModelState
                .Where(e => e.Value!.Errors.Count > 0)
                .ToDictionary(
                    k => k.Key,
                    v => v.Value!.Errors.Select(e =>
                        string.IsNullOrEmpty(e.ErrorMessage) ? e.Exception?.Message : e.ErrorMessage
                    ).ToArray());

            return new BadRequestObjectResult(new
            {
                code = "INVALID_PARAM",
                message = "请求参数校验失败",
                errors,
                traceId = context.HttpContext.TraceIdentifier
            });
        };
    });
```

> **什么时候需要改它**：公司已有统一的返回格式（比如 `{code, message, data}`），要和它对齐。**新项目直接用默认的 ProblemDetails 更好**，因为标准格式能被工具识别。

## 5. 业务错误码怎么设计（别过度）

**核心问题：HTTP 状态码只有几十个，但业务错误有几百种。怎么办？**

### 方案对比

| 方案 | 长什么样 | 评价 |
|---|---|---|
| **A. 全靠 HTTP 状态码** | 只有 400/404/409 | 太粗，前端没法区分"库存不足"和"余额不足" |
| **B. 全塞进 body 的 code** | 永远 200 + `{code: 40023}` | **最糟**：丢了 HTTP 语义，监控全瞎 |
| **C. 两层：HTTP 状态码 + 业务码** | `400` + `{code:"STOCK_NOT_ENOUGH"}` | **推荐** |

### 推荐做法（轻量版）

```csharp
// 业务异常：携带业务码
public class BusinessException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }
    public BusinessException(string code, string message, int statusCode = 400)
        : base(message) { Code = code; StatusCode = statusCode; }
}

// Controller 里
if (book.Stock < req.Quantity)
    throw new BusinessException("STOCK_NOT_ENOUGH", $"库存只剩 {book.Stock} 本", 422);
```

全局异常处理把它变成：

```json
{
  "type": "https://api.example.com/errors/stock-not-enough",
  "title": "库存不足",
  "status": 422,
  "detail": "库存只剩 3 本",
  "code": "STOCK_NOT_ENOUGH",
  "traceId": "00-..."
}
```

**规则**：

```
HTTP 状态码 → 给"机器/网关/监控"看（决定重试、告警、缓存）
业务码     → 给"前端代码"看（决定提示文案、跳哪个页面）
message    → 给"人"看（直接展示，或做兜底）
```

> **数量控制**：业务码**不超过 30 个**。超过说明你在把"参数校验的每种情况"都变成错误码，那是模型验证该干的事。**P134 会给出完整的异常处理实现。**

## 6. 状态码速查表（贴在屏幕上）

| 场景 | 状态码 | 方法 |
|---|---|---|
| 查询成功 | 200 | `Ok(data)` 或 `return data` |
| 创建成功 | **201** | `CreatedAtAction(nameof(Get), new { id }, data)` |
| 更新/删除成功（无 body） | **204** | `NoContent()` |
| 更新成功（要回数据） | 200 | `Ok(data)` |
| 提交后台任务 | 202 | `Accepted(...)` |
| 参数格式/必填错 | **400** | 框架自动 / `BadRequest(...)` |
| 业务规则不成立 | 422 | `UnprocessableEntity(...)` |
| 未登录/凭证无效 | **401** | `Unauthorized()` / `[Authorize]` 自动 |
| 已登录但无权限 | **403** | `Forbid()` / `[Authorize(Roles=...)]` 自动 |
| 资源不存在 | **404** | `NotFound()` |
| 唯一约束冲突/并发冲突 | **409** | `Conflict(...)` |
| 不支持的 Content-Type | 415 | 框架自动 |
| 请求方法不允许 | 405 | 框架自动 |
| 请求太频繁 | **429** | 手动返回 + `Retry-After` 头 |
| 服务端 bug | **500** | 让异常冒泡 / `Problem(500)` |
| 服务维护中 | 503 | `Problem(503)` + `Retry-After` |

---
# P111　ASP.NET Core 中 REST 落地指南

**一句话：落地指南就是把这些零散的规则固化成"团队不需要讨论"的默认值——路由怎么起名、DTO 怎么分、错误怎么返、分页怎么包装。**

这一节是全课程最"工程"的一节。它没有新 API，全是**约定**。但**约定才是团队协作的地基**。

## 1. 项目结构：三层还是两层

### 小项目（你现在的阶段）

```
BookApi/
├─ Controllers/        ← 接口层：收参数、调 EF、返结果
├─ Models/             ← 实体 + DTO
├─ Dtos/
└─ Data/               ← DbContext
```

**Controller 里直接写 EF Core 查询**。理由：**你的业务逻辑还没复杂到需要额外一层**，多一层只是多一次跳转。

### 中大型项目（学完 Part6 DDD 之后）

```
BookApi/
├─ Controllers/        ← 只做：参数校验、调 Service、映射成 HTTP 响应
├─ Services/           ← 业务逻辑（可单测，不依赖 HttpContext）
├─ Repositories/       ← 数据访问（可选，EF Core 本身就是仓储）
├─ Models/Entities/    ← 实体
├─ Models/Dtos/        ← 入参/出参
└─ Data/
```

**判断标准（三条，满足任一就该分层）**：

1. 同一个业务逻辑被 **2 个以上 Controller** 用到
2. 业务逻辑需要**单测**（Controller 里有 `HttpContext`，很难测）
3. Controller 方法**超过 50 行**

> **别提前分层**。你在 Part2 DI 学的"服务注册"是给分层做准备的，但**分层的时机是"痛了再分"，不是"一开始就分"**。

## 2. DTO 必须分入参和出参

```csharp
// ❌ 一个类打天下
public class Book
{
    public long Id { get; set; }          // 创建时不该由客户端传
    public string Title { get; set; }
    public double Price { get; set; }
    public long AuthorId { get; set; }
    public DateTime CreatedAt { get; set; }   // 客户端不该能设置
    public bool IsDeleted { get; set; }       // 客户端绝对不该能设置
}
```

**问题一：越权赋值（Mass Assignment）**

前端传 `{"id":1,"title":"x","isDeleted":true,"createdAt":"1999-01-01"}`：
- `id=1` → **覆盖了别人的书**
- `isDeleted` → **客户端能软删除任意数据**
- `createdAt` → 篡改创建时间

**问题二：入参约束和出参形态不同**

创建时 `Id` 必填？不，服务端生成。更新时 `Title` 可选（改别的字段）？创建时必填。**一个类表达不了两种约束。**

**问题三：出参泄露内部字段**

`PasswordHash`、`InternalNote`、`RowVersion` 不该返回给前端。

### 推荐的三套 DTO

```csharp
// 出参：只含前端需要的字段
public record BookDto(long Id, string Title, double Price, DateTime PubTime,
                      string AuthorName, string CategoryName);

// 入参（创建）：不含 Id、不含系统字段
public record CreateBookRequest(
    [property: Required, StringLength(100)] string Title,
    [property: Range(0.01, 9999)] double Price,
    [property: Required] long AuthorId,
    DateTime PubTime);

// 入参（更新）：字段可空，表示"不改这个字段"
public record UpdateBookRequest(
    [property: StringLength(100)] string? Title,
    [property: Range(0.01, 9999)] double? Price,
    long? AuthorId);
```

> **`UpdateBookRequest` 全字段可空是一个重要的设计选择**：它为 `PATCH` 语义服务——`null` 表示"这个字段别动"。**但要注意，这时你就不能用 `PUT` 了（`PUT` 是整体替换）。要么改 `PATCH`，要么约定"前端必须传全字段"。**

## 3. 统一响应结构：包装还是不包装

这是**团队争议最大**的一个问题。两种流派：

### 流派 A：直接返回数据（REST 纯正派）

```json
// 200
{ "id": 5, "title": "C# 入门", "price": 59.9 }

// 404
{ "type": "...", "title": "Not Found", "status": 404, "traceId": "..." }
```

**优点**：状态码承载结果，响应体干净，能直接对接任何 HTTP 工具。

### 流派 B：统一包装（国内常见）

```json
{ "code": 0, "message": "success", "data": { "id": 5, "title": "C# 入门" } }
```

**优点**：前端只需判断 `code === 0`，不用关心 HTTP 状态码。**这是微信小程序、很多国内公司 API 的默认风格。**

**缺点**：**丢掉了 HTTP 语义**——监控看到全是 200，网关不重试，CDN 不缓存，问题很大。

### 我的建议（明确表态）

```csharp
// ✅ 推荐：HTTP 状态码 + ProblemDetails，不额外包装
[HttpGet("{id:long}")]
public ActionResult<BookDto> Get(long id) => book is null ? NotFound() : book;
```

**理由**：

1. **你的前端是你自己写的**，一个统一的 `fetch` 封装就能处理所有状态码
2. **`{code, message, data}` 包装在"中间加一层"时会带来无穷麻烦**（网关、监控、日志解析都要特判）
3. **第三方集成时，别人期待的是标准 REST**

**但如果你要对接微信小程序/支付宝小程序**，它们的习惯是 `code` 风格——**那就包一层，但务必让 HTTP 状态码也正确**：

```csharp
// 折中：HTTP 语义正确 + body 里也带业务码
return StatusCode(422, new { code = "STOCK_NOT_ENOUGH", message = "库存不足", data = (object?)null });
```

## 4. 分页的统一结构

```csharp
public record PagedResult<T>(
    int Total,          // 总条数
    int Page,           // 当前页（从 1 开始）
    int Size,           // 每页条数
    int TotalPages,     // 总页数（方便前端渲染页码）
    IReadOnlyList<T> Items);
```

```csharp
[HttpGet]
public ActionResult<PagedResult<BookDto>> List([FromQuery] BookQuery q)
{
    var size = Math.Clamp(q.Size, 1, 100);       // ← 上限保护，别漏
    var page = Math.Max(q.Page, 1);
    var query = _ctx.Books.AsNoTracking().Where(...);
    var total = await query.CountAsync();
    var items = await query.OrderBy(b => b.Id)
                           .Skip((page - 1) * size).Take(size)
                           .Select(b => new BookDto(...))   // ← 投影，别返回实体
                           .ToListAsync();
    return Ok(new PagedResult<BookDto>(total, page, size,
        (int)Math.Ceiling(total / (double)size), items));
}
```

**四条硬规则**：

| 规则 | 为什么 |
|---|---|
| **`size` 必须有上限** | `?size=100000` 能把数据库拖死（一次查全表 + 序列化） |
| **`page` 必须 ≥ 1** | 负数会导致 `Skip(-10)` 抛异常 |
| **必须 `OrderBy`** | 不排序时 SQL Server 的 `OFFSET/FETCH` 结果顺序**不保证**，翻页会出现重复/丢失 |
| **必须 `AsNoTracking`** | 只读查询不需要跟踪，省内存（你 P83 学的） |

> **分页的两个流派**：`page/size`（页码分页）vs `cursor/limit`（游标分页）。
> **游标分页**（`?after=123&limit=20`）在"无限滚动"场景下性能更好（不受页码深度影响），但**不能跳页**。你的图书列表用页码分页就够。

## 5. 幂等性怎么落地

P107 讲了"`PUT`/`DELETE` 天然幂等"，但**`POST` 天生不幂等**。而"创建订单""支付"这类操作**必须防重复**。

### 方案：幂等键（Idempotency-Key）

```csharp
[HttpPost]
public async Task<ActionResult<OrderDto>> Create(
    [FromBody] CreateOrderRequest req,
    [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
{
    if (string.IsNullOrWhiteSpace(idempotencyKey))
        return BadRequest(new { message = "缺少 Idempotency-Key 头" });

    // ① 查这个 key 是否已经处理过
    var existing = await _cache.GetAsync<OrderDto>($"idem:{idempotencyKey}");
    if (existing is not null) return Ok(existing);      // 直接返回上次的结果

    // ② 处理业务
    var order = await _orderService.CreateAsync(req);

    // ③ 记录 key → 结果（过期时间 24 小时）
    await _cache.SetAsync($"idem:{idempotencyKey}", order, TimeSpan.FromHours(24));

    return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
}
```

**客户端每次提交生成一个 UUID 作为 key，重试时用同一个 key** → 服务端只会真正处理一次。

> **这是支付/下单类接口的标配**。你的项目暂时用不上，但**面试问"如何防止重复下单"时，这就是标准答案**。

## 6. 并发控制怎么落地

你在 P88–P89 学了乐观并发（并发令牌 / RowVersion），**在 API 层它长这样**：

```csharp
[HttpPut("{id:long}")]
public async Task<IActionResult> Update(long id, [FromBody] UpdateBookRequest req)
{
    var book = await _ctx.Books.FindAsync(id);
    if (book is null) return NotFound();

    book.Title = req.Title ?? book.Title;
    book.Price = req.Price ?? book.Price;

    try
    {
        await _ctx.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
        // ← 这就是 409 的真实来源
        return Conflict(new
        {
            message = "数据已被他人修改，请刷新后重试",
            hint = "建议 GET 一次最新数据再提交"
        });
    }
    return NoContent();
}
```

**409 的响应里给 `hint` 很重要**：告诉前端"该怎么办"，而不是只说"冲突了"。

## 7. 一份可直接用的接口规范清单

```markdown
# 接口规范 v1

## 路由
- 前缀：/api/v{版本}/
- 资源用名词复数：/api/v1/books
- 单个资源：/api/v1/books/{id:long}
- 子资源最多两层：/api/v1/authors/{id}/books
- 路径全小写，多词用连字符：/api/v1/book-reviews
- 状态转移用 POST 子资源：POST /api/v1/books/{id}/publish

## 动词
- 查询用 GET，创建用 POST，整体更新用 PUT，删除用 DELETE
- 禁止用 GET 做任何有副作用的操作

## 状态码
- 查询成功 200 / 创建 201 + Location / 更新删除 204
- 参数错 400 / 业务错 422 / 未登录 401 / 无权限 403
- 不存在 404 / 冲突 409 / 限流 429 / 服务端错 500

## 参数
- 资源标识走路径，筛选分页走查询串，内容走 body
- 分页参数统一：page（从 1 起）/ size（默认 20，上限 100）
- 排序参数统一：sort=字段名&order=asc|desc，服务端白名单校验

## 响应
- 错误一律用 ProblemDetails（含 traceId）
- 列表统一 PagedResult：{ total, page, size, totalPages, items }
- 入参出参 DTO 分离，禁止直接返回 EF 实体

## 其他
- 时间统一 ISO 8601（UTC），字段名 dateTime 后缀
- 金额统一用 decimal，JSON 里用字符串或保留两位的小数
- 所有接口返回 traceId（排查用）
- 幂等接口必带 Idempotency-Key
```

> **这份清单可以直接抄进你的项目**。等你开始写前后端分离（P114–116），前后端各拿一份，能省掉大量扯皮。

---

# P112　WebAPI 的异步及返回值

**一句话：Web API 的 Action 应该永远是 `async Task<ActionResult<T>>`——因为它做的事（查数据库、调外部接口）本质都是 I/O 等待，同步会白白占着线程。**

## 1. 为什么 Web API 必须异步（用数字说话）

ASP.NET Core 的线程池默认线程数 ≈ **CPU 核数**（假设 8 核，约 8–16 个线程可用）。

**同步 Action 的灾难**：

```
请求 1 进来 → 线程 1 开始查数据库（耗时 100ms，线程 1 全程阻塞等待）
请求 2 进来 → 线程 2 开始查数据库（阻塞）
...
请求 9 进来 → 没有空闲线程 → 排队等待
```

**100 个并发请求，8 个线程，每个请求阻塞 100ms** → 总耗时 **1.25 秒**，且第 9 个之后的请求全在排队。

**异步 Action**：

```
请求 1 进来 → 线程 1 发起 SQL 查询 → 立刻释放线程 1（去处理请求 2）
SQL 返回 → 从线程池随便取一个线程继续执行后续代码
```

**同样 100 个并发** → 8 个线程可以轮流"发起 I/O"，总耗时 **约 100ms**（受数据库并发能力限制）。

**差了 12 倍。** 而且**内存差得更多**：每个阻塞的线程占 1MB 栈。

> **核心认知：异步不是"更快"，是"同样多的线程能干更多活"。** 单个请求的延迟几乎不变，**吞吐量**天差地别。（这正是你 Part2 学的"异步方法不等于多线程"在 Web 场景下的体现。）

## 2. 四种写法对比（选第二种）

```csharp
// ❌ ① 同步：阻塞线程
[HttpGet]
public ActionResult<IEnumerable<BookDto>> GetAll()
{
    var books = _ctx.Books.ToList();       // ← 线程在这里干等数据库
    return Ok(books);
}

// ✅ ② async Task<ActionResult<T>>：标准写法
[HttpGet]
public async Task<ActionResult<IEnumerable<BookDto>>> GetAll()
{
    var books = await _ctx.Books.AsNoTracking().ToListAsync();
    return Ok(books);
}

// ✅ ③ async Task<ActionResult>：不关心具体类型时
[HttpDelete("{id:long}")]
public async Task<ActionResult> Delete(long id)
{
    var book = await _ctx.Books.FindAsync(id);
    if (book is null) return NotFound();
    _ctx.Books.Remove(book);
    await _ctx.SaveChangesAsync();
    return NoContent();
}

// ☠️ ④ async void：绝对不要
[HttpGet("bad")]
public async void Bad()      // ← 框架无法等待它，异常会直接杀死进程
{
    await Task.Delay(100);
}
```

**`async void` 为什么致命**：调用方无法 `await` 它，所以**异常不会被捕获**，直接抛到线程池 → **整个进程崩溃**。这是 .NET 里唯一会让"一个请求的错误拖垮整个服务"的写法。

## 3. 返回值类型的选择

| 写法 | 什么时候用 | 注意 |
|---|---|---|
| `Task<ActionResult<T>>` | **默认选它** | 既能 `return data` 又能 `return NotFound()` |
| `Task<ActionResult>` | 不需要返回具体类型（删除、更新） | |
| `Task<T>`（直接返回 DTO） | 只会成功，失败靠异常 | 错误处理只能抛异常 |
| `Task`（无返回） | 基本不用（框架需要结果） | |
| `ValueTask<T>` | **极高 QPS** 且经常同步完成时 | 用错会出 bug（不能 await 两次），**别碰** |

```csharp
// 三者的实际差别
public async Task<BookDto> A(long id)                          // 只能 200 或 抛异常
public async Task<ActionResult<BookDto>> B(long id)            // 200 / 404 / 任意
public async Task<ActionResult> C(long id)                     // 204 / 404 / 任意（无 body 类型）
```

## 4. EF Core 的异步方法（必须一一对应）

| 同步 | 异步 | 说明 |
|---|---|---|
| `ToList()` | `ToListAsync()` | |
| `FirstOrDefault()` | `FirstOrDefaultAsync()` | |
| `Single()` | `SingleAsync()` | |
| `Any()` | `AnyAsync()` | **判存在优先用它**，比 `Count() > 0` 快 |
| `Count()` | `CountAsync()` | |
| `Find()` | `FindAsync()` | 先查本地缓存再查库 |
| `SaveChanges()` | `SaveChangesAsync()` | |
| `Sum()`/`Max()` | `SumAsync()`/`MaxAsync()` | |

```csharp
// 完整示例
[HttpGet("{id:long}")]
public async Task<ActionResult<BookDto>> Get(long id)
{
    var dto = await _ctx.Books
        .AsNoTracking()
        .Where(b => b.Id == id)
        .Select(b => new BookDto(b.Id, b.Title, b.Price, b.PubTime,
                                 b.Author!.Name, b.Category!.Name))
        .FirstOrDefaultAsync();

    return dto is null ? NotFound() : dto;
}
```

> **两个细节**：
> 1. **`Select` 投影 + `FirstOrDefaultAsync`** 比 `Include` + 手工映射**更快**（只 SELECT 需要的列，不产生笛卡尔积）
> 2. **`AsNoTracking()` 必须加**（只读场景），否则 EF 会为每个对象建跟踪快照

## 5. `CancellationToken`：用户关掉页面时，别让数据库还在跑

```csharp
[HttpGet("search")]
public async Task<ActionResult> Search(
    [FromQuery] string keyword,
    CancellationToken ct)                     // ← 框架自动注入 HttpContext.RequestAborted
{
    var books = await _ctx.Books
        .AsNoTracking()
        .Where(b => b.Title.Contains(keyword))
        .ToListAsync(ct);                     // ← 用户断开时，SQL 查询会被取消

    await SomeSlowHttpCall(ct);               // ← 外部调用也传下去
    return Ok(books);
}
```

**`CancellationToken` 从哪来**：ASP.NET Core 会自动把 `HttpContext.RequestAborted` 绑到这个参数上（**不需要 `[FromServices]`**，这是特殊绑定）。

**它什么时候被触发**：

- 用户关掉浏览器 / 刷新页面
- 前端 `AbortController.abort()`
- 请求超时（`RequestTimeouts` 中间件，.NET 8+）

**不传会怎样**：用户早就走了，数据库还在跑一个 30 秒的查询，白占连接和 CPU。**高并发下这是雪崩的起点。**

> **实务建议**：**所有异步数据库操作都传 `ct`**。这是"免费的性能优化"，成本只是多写一个参数。

## 6. 三个关于 async 的常见误解

### 误解一：`.Result` 会死锁

```csharp
// 网上都说会死锁，其实在 ASP.NET Core 里不会
var books = _ctx.Books.ToListAsync().Result;
```

**真相**：死锁发生在**有 SynchronizationContext 的环境**（WinForms、WPF、老 ASP.NET）。**ASP.NET Core 没有 SynchronizationContext**，所以不会死锁。

**但 `.Result` 依然有害**：

- **阻塞线程池线程** → 线程饥饿 → 吞吐量暴跌（跟同步写法一样糟）
- **异常被包成 `AggregateException`** → `catch (DbUpdateException)` 捕获不到
- **可能造成死锁**：在 `Task.Run` + 线程池饥饿的极端情况下仍可能

**结论：不要用 `.Result` / `.Wait()` / `.GetAwaiter().GetResult()`。** 原因不是"会死锁"，是"白瞎了异步"。

### 误解二：需要 `ConfigureAwait(false)`

```csharp
var books = await _ctx.Books.ToListAsync().ConfigureAwait(false);   // 在 ASP.NET Core 里没必要
```

**真相**：`ConfigureAwait(false)` 是为了"不回到原来的 SynchronizationContext"。**ASP.NET Core 没有 SynchronizationContext**，所以加不加都一样。

> **例外**：**写类库时**建议加（因为类库可能被 WinForms 调用）。**写 Web 项目时不用加。**

### 误解三：`async` 会自动开新线程

```csharp
public async Task<IActionResult> Get()
{
    Console.WriteLine($"线程 {Environment.CurrentManagedThreadId}");
    await Task.Delay(100);
    Console.WriteLine($"线程 {Environment.CurrentManagedThreadId}");   // 可能变了，也可能没变
    return Ok();
}
```

**真相**：`async` **不创建线程**。它只是把方法编译成状态机，`await` 时"让出线程"。**线程变化是线程池调度导致的，不是 async 的承诺。**（这就是你 Part2 学的"异步方法不等于多线程"。）

## 7. 并发调用：`Task.WhenAll`

```csharp
// ❌ 串行：3 次往返，总耗时 = 三者之和
var a = await GetAuthorAsync(1);
var b = await GetCategoryAsync(2);
var c = await GetStatsAsync();

// ✅ 并行：总耗时 ≈ 最慢的那个
var t1 = GetAuthorAsync(1);
var t2 = GetCategoryAsync(2);
var t3 = GetStatsAsync();
await Task.WhenAll(t1, t2, t3);
var a = await t1; var b = await t2; var c = await t3;
```

> **重要限制：EF Core 的 `DbContext` 不是线程安全的。**
> **同一个 `DbContext` 实例不能并行执行多个查询**（会抛 `InvalidOperationException: A second operation was started on this context`）。
>
> 所以上面这种并行只适合"独立的外部 HTTP 调用"或"用 `IDbContextFactory` 创建多个上下文"。**在同一个 Controller 里并行查 EF Core 是错的。**

---
# P113　Web API 的参数问题

**一句话：参数绑定的所有坑，本质都是"框架在猜这个值该从哪来"——你要做的不是记住规则，而是把猜测变成显式指定。**

## 1. 绑定源的优先级（框架的猜测顺序）

**没有 `[FromXxx]` 特性时**，框架按这个顺序找值：

```
① 路由值（RouteValues）
② 查询串（QueryString）
③ 表单（Form）
④ 请求体（Body）—— 只有 [ApiController] + 复杂类型才会自动走这里
```

**关键推论**：如果 `?id=99` 和路由 `/books/5` 同时存在，**路由值优先**（`id` 会绑成 5）。

```csharp
// GET /api/books/5?id=99
[HttpGet("{id:long}")]
public ActionResult Get(long id)      // id == 5，不是 99
```

> **这是好事**：防止客户端用查询串"篡改"路径参数。但也可能让你困惑"我明明传了 99"。

## 2. 简单类型 vs 复杂类型

| 类型 | 例子 | 默认从哪读 |
|---|---|---|
| **简单类型** | `int` `long` `string` `DateTime` `bool` `Guid` `枚举`、以及它们的可空版本 | Route → Query → Form |
| **复杂类型** | 类、record、集合、数组 | **有 `[ApiController]`：Body**；没有：按属性名从 Route/Query/Form 凑 |

**"简单"的判定不是看有没有属性，而是看框架有没有内置 `TypeConverter`。**

```csharp
public record BookQuery(string? Keyword, int Page = 1);   // 复杂类型

[HttpGet]
public ActionResult Search(BookQuery q)        // 有 [ApiController] → 从 body 读（哪怕 GET！）
```

> **这是个真坑**：`GET /api/books?keyword=x` 配 `Search(BookQuery q)`，如果 Controller 上有 `[ApiController]`，**框架会去 body 里找**，而 `GET` 没有 body → `q` 是 null。
>
> **正确写法**：**显式加 `[FromQuery]`**。

```csharp
[HttpGet]
public ActionResult Search([FromQuery] BookQuery q)     // ✅ 明确指定
```

## 3. `[FromBody]` 只能有一个（以及怎么办）

```csharp
public IActionResult Create([FromBody] Book b, [FromBody] Author a)   // ☠️ 运行时报错
```

**报错**：
```
System.InvalidOperationException: Action 'Create' has more than one parameter
that is bound to the request body. Only one parameter can be bound to the request body.
```

**原因**：请求体是一条**只能读一次的流**。

### 解决办法一：包一层 DTO（推荐）

```csharp
public record CreateBookWithAuthorRequest(BookDto Book, AuthorDto Author);

[HttpPost]
public IActionResult Create([FromBody] CreateBookWithAuthorRequest req) { ... }
```

```json
{ "book": { "title": "x" }, "author": { "name": "y" } }
```

### 解决办法二：拆成两个接口（更 REST）

```
POST /api/authors       → 创建作者，返回 id
POST /api/books         → 带着 authorId 创建书
```

**这是更好的设计**：两个资源的生命周期本来就该分开。

## 4. 数组和集合的六种传法（这是最坑的一块）

### 查询串：只有两种格式能用

```csharp
// GET /api/books/batch?ids=1&ids=2&ids=3        ← ✅ 重复键，原生支持
// GET /api/books/batch?ids[0]=1&ids[1]=2        ← ✅ 索引格式，也支持
// GET /api/books/batch?ids=1,2,3                ← ❌ 不默认支持！

[HttpGet("batch")]
public ActionResult Batch([FromQuery] long[] ids)     // 只有前两种能绑上
```

**`?ids=1,2,3` 实际会得到什么**：`ids = [0]`（单个元素，转换失败则长度为 0）。**很多人以为"能跑"，其实是空数组**。

### 让逗号格式也能用（自定义 ModelBinder）

```csharp
// Binders/CommaSeparatedArrayBinder.cs
using Microsoft.AspNetCore.Mvc.ModelBinding;

public class CommaSeparatedArrayBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);
        if (value == ValueProviderResult.None)
        {
            bindingContext.Result = ModelBindingResult.Failed();
            return Task.CompletedTask;
        }

        // 支持 ?ids=1,2,3 和 ?ids=1&ids=2
        var parts = value.Values
            .SelectMany(v => (v ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(s => s.Trim())
            .ToArray();

        var elementType = bindingContext.ModelType.GetElementType()
                       ?? bindingContext.ModelType.GetGenericArguments()[0];

        var result = Array.CreateInstance(elementType, parts.Length);
        for (int i = 0; i < parts.Length; i++)
        {
            if (!TypeDescriptor.GetConverter(elementType).CanConvertFrom(typeof(string)))
                continue;
            result.SetValue(Convert.ChangeType(parts[i], elementType), i);
        }

        bindingContext.Result = ModelBindingResult.Success(result);
        return Task.CompletedTask;
    }
}
```

```csharp
// 用法
[HttpGet("batch")]
public ActionResult Batch(
    [FromQuery, ModelBinder(BinderType = typeof(CommaSeparatedArrayBinder))] long[] ids)
```

> **`using System.ComponentModel;`** 要加（`TypeDescriptor` 在 `System.ComponentModel` 里）。
> **实务建议**：**如果你的前端是自己写的，就别写 binder 了——让前端发 `?ids=1&ids=2`。** 只在"对接第三方、格式改不了"时才需要它。

### 前端（axios / fetch）的三个坑

```js
// ☠️ 坑 1：axios 默认把数组序列化成 ids[]=1&ids[]=2（带方括号）→ 绑不上！
axios.get('/api/books/batch', { params: { ids: [1, 2, 3] } })
// 实际发出：?ids[]=1&ids[]=2&ids[]=3

// ✅ 解法 A：改用 URLSearchParams
const sp = new URLSearchParams()
[1,2,3].forEach(id => sp.append('ids', id))
fetch(`/api/books/batch?${sp}`)

// ✅ 解法 B：axios 配 paramsSerializer
axios.get('/api/books/batch', {
  params: { ids: [1,2,3] },
  paramsSerializer: { indexes: null }      // 生成 ids=1&ids=2&ids=3
})
```

```js
// ☠️ 坑 2：手拼 URL 不编码
fetch('/api/books?keyword=' + kw)          // kw 里有 & 或 + 就炸
// ✅
fetch('/api/books?' + new URLSearchParams({ keyword: kw }))
```

```js
// ☠️ 坑 3：POST 忘了 Content-Type
fetch('/api/books', { method: 'POST', body: JSON.stringify(data) })
// 实际 Content-Type: text/plain → 415
// ✅
fetch('/api/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

## 5. `null`、空字符串、没传：三者怎么区分

这是**表单和查询串处理里最容易出错的地方**。

| 前端发的 | `string? title` 得到 | `int? price` 得到 | `int price` 得到 |
|---|---|---|---|
| 不传 / JSON 里没有这个字段 | `null` | `null` | `0`（默认值） |
| `?title=`（空字符串） | `""`（空串，不是 null） | **`null`** | **`0`**（空串 = 没提供值） |
| `?title=null` | `"null"`（字符串！） | 绑定失败 → 400 | 绑定失败 → 400 |
| `{"title": null}`（body） | `null` | `null` | 绑定失败 → 400 |

> **注意最后两行的区别**：查询串里的 `null` 是**字面量字符串 `"null"`**（会被当成字符串），
> 而 JSON body 里的 `null` 是**真正的 null**（绑到非可空 `int` 会失败）。**这是两种通道的语义差异，很容易混。**

### 三个实用结论

**① 想区分"没传"和"传了空"，只能用 `string?` 接**

```csharp
[HttpPut("{id:long}")]
public async Task<ActionResult> Update(long id, [FromBody] UpdateBookRequest req)
{
    // req.Title == null      → 前端没传 → 不改
    // req.Title == ""        → 前端清空了 → 改成空（但要校验是否允许）
    if (req.Title is not null)
    {
        if (req.Title.Trim().Length == 0) return BadRequest(new { message = "书名不能为空" });
        book.Title = req.Title;
    }
}
```

**② 查询串里的空值，别指望 `[Required]` 拦住**

`?title=` 绑到 `string` 上是 `""`，`[Required]` **会认为它是空**（`""` 算空），能拦住。但 `string?` + 没有 `[Required]` 就拦不住，得自己判 `IsNullOrWhiteSpace`。

**③ 表单里 `"null"` 这个字符串是经典事故**

前端如果做 `String(value)` 而 value 是 null，会发出字面量 `"null"`，后端当字符串存进库。

## 6. 日期、时间、枚举

### 日期

| 类型 | JSON 格式 | 说明 |
|---|---|---|
| `DateTime` | `"2026-01-01T00:00:00"` | **推荐用 ISO 8601**。`"2026/1/1"` 在 JSON 里**绑不上**（会 400） |
| `DateOnly` | `"2026-01-01"` | **.NET 7+ 的 System.Text.Json 原生支持**。适合"只有日期"的字段 |
| `TimeOnly` | `"14:30:00"` | 同上 |
| `DateTimeOffset` | `"2026-01-01T00:00:00+08:00"` | **跨时区系统必须用它**，`DateTime` 会丢时区 |

**查询串里的日期更严格**：

```
✅ ?from=2026-01-01
✅ ?from=2026-01-01T00:00:00
❌ ?from=2026/1/1            （美国格式，绑不上）
❌ ?from=01-01-2026
```

> **`DateTime` vs `DateTimeOffset` 的选择**：单机/单时区系统用 `DateTime` 没问题；**一旦有跨时区用户（或部署到 UTC 服务器），必须用 `DateTimeOffset`**。你现在在国内单机，`DateTime` 够用，但**存库时统一存 UTC，展示时转本地时区**是好习惯。

### 枚举：默认接受数字，不接受字符串（除非配置）

```csharp
public enum BookStatus { Draft = 0, Published = 1, Archived = 2 }

// ?status=1  → ✅ 绑上
// ?status=Published → ✅ 绑上（名字也行，不区分大小写）
// JSON body: {"status": 1} → ✅
// JSON body: {"status": "Published"} → ❌ 默认绑不上！需要配置
```

**配置全局枚举字符串支持**：

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
```

**加了之后**：JSON 里 `"Published"` 和 `1` **都接受**，**输出时变成字符串**。

> **建议开着**。原因：数字枚举在日志和前端调试时完全不可读（`status: 1` 是什么意思？），字符串自解释。

## 7. 文件上传 + 表单字段混合

```csharp
// DTO 里同时有文件和普通字段
public class UploadBookCoverRequest
{
    public long BookId { get; set; }
    public string? Remark { get; set; }
    public IFormFile? File { get; set; }
}

[HttpPost("upload-cover")]
[Consumes("multipart/form-data")]                  // ← 明确声明，Swagger 才能正确显示
public async Task<ActionResult> UploadCover([FromForm] UploadBookCoverRequest req)
{
    if (req.File is null || req.File.Length == 0)
        return BadRequest(new { message = "请选择文件" });

    // ① 大小限制（业务层校验，框架默认 30MB）
    if (req.File.Length > 5 * 1024 * 1024)
        return BadRequest(new { message = "文件不能超过 5MB" });

    // ② 类型校验：不要只信 ContentType（客户端可伪造），要看扩展名 + 魔数
    var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
    var ext = Path.GetExtension(req.File.FileName).ToLowerInvariant();
    if (!allowed.Contains(ext)) return BadRequest(new { message = "只支持 jpg/png/webp" });

    // ③ 生成安全的文件名（绝对不要用客户端传来的文件名！）
    var fileName = $"{Guid.NewGuid():N}{ext}";
    var dir = Path.Combine(env.WebRootPath, "uploads", "covers");
    Directory.CreateDirectory(dir);
    var path = Path.Combine(dir, fileName);

    await using var fs = System.IO.File.Create(path);
    await req.File.CopyToAsync(fs);

    return Ok(new { url = $"/uploads/covers/{fileName}" });
}
```

**五个必须注意的安全点**：

| 风险 | 后果 | 防护 |
|---|---|---|
| 用客户端文件名当路径 | **路径穿越**（`../../appsettings.json`） | 用 GUID 重命名 |
| 只校验 `ContentType` | 可伪造（改成 `image/png` 就过） | 查扩展名 + 文件头魔数 |
| 不限制大小 | 上传 10GB 打爆磁盘 → 服务瘫痪 | 业务层限 + 框架 `MaxRequestBodySize` |
| 上传可执行文件（`.aspx` `.php`） | 若目录可执行 → 远程代码执行 | 白名单扩展名 + 上传目录禁止执行 |
| 文件存在 `wwwroot` 下可直连 | 任何人都能猜到 URL 访问 | 敏感文件存外部/对象存储 + 鉴权 |

**框架层的大小限制**（默认值要知道）：

```csharp
builder.Services.Configure<KestrelServerOptions>(o =>
{
    o.Limits.MaxRequestBodySize = 100 * 1024 * 1024;   // 默认 30MB
});

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 100 * 1024 * 1024;    // 默认 128MB
});
```

## 8. `[Required]` / `[BindRequired]` / `[BindNever]` 的区别

| 特性 | 管什么 | 场景 |
|---|---|---|
| `[Required]` | **验证**：值不能为空 | 业务必填字段 |
| `[BindRequired]` | **绑定**：这个来源必须提供值 | 区分"没传"和"传了 null" |
| `[BindNever]` | **不参与绑定** | 防止客户端覆盖（如 `Id`、`IsAdmin`） |

```csharp
public class CreateBookRequest
{
    [Required] public string Title { get; set; } = "";     // 空字符串不通过

    [BindRequired] public int Page { get; set; }            // 必须传 ?page=，不传就报绑定错误

    [BindNever] public long Id { get; set; }                // 客户端传了也忽略
}
```

> **`[BindNever]` 是防越权赋值（Mass Assignment）的利器**。但**更好的做法是根本不把这些字段放进 DTO**（P111 讲的入参/出参分离）。

## 9. 查询串的长度限制

**Kestrel 默认限制请求行（含查询串）为 8KB**（`MaxRequestLineSize`）。超了会返回 **414 URI Too Long**。

```csharp
builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestLineSize = 16 * 1024;
});
```

> **这解释了一件事**：为什么 P109 说"筛选条件超过 8 个就别用查询串了"。**不是 REST 洁癖，是物理限制。**

## 10. 一个能验证全部绑定行为的实验

```csharp
[ApiController]
[Route("api/[controller]")]
public class BindTestController : ControllerBase
{
    // ① 各来源混用，一次性看清每个参数从哪来
    [HttpGet("sources/{id:long}")]
    public ActionResult Sources(
        long id,                                              // 路径（优先）
        [FromQuery] string? q,                                // 查询串
        [FromHeader(Name = "X-Test")] string? header,         // 头
        [FromServices] ILogger<BindTestController> logger)    // DI
    {
        logger.LogInformation("id={Id} q={Q} header={H}", id, q, header);
        return Ok(new { id, q, header });
    }

    // ② 复杂类型必须显式 [FromQuery]，否则 GET 会去找 body
    [HttpGet("query-object")]
    public ActionResult QueryObject([FromQuery] BookQuery q) => Ok(q);

    // ③ 数组：重复键可以，逗号不行
    [HttpGet("array")]
    public ActionResult Array([FromQuery] long[] ids) => Ok(new { count = ids.Length, ids });

    // ④ 嵌套对象（查询串用 . 表示层级）
    // ?filter.title=core&filter.page=1
    [HttpGet("nested")]
    public ActionResult Nested([FromQuery] NestedFilter filter) => Ok(filter);

    // ⑤ record 的构造参数绑定（.NET 5+ 支持）
    [HttpGet("record")]
    public ActionResult Record([FromQuery] BookQuery q) => Ok(q);

    // ⑥ 可空 vs 非空：注意 ?price= 的行为差异
    [HttpGet("nullable")]
    public ActionResult Nullable(int? price, int count) => Ok(new { price, count });
}

public class NestedFilter
{
    public string? Title { get; set; }
    public int Page { get; set; }
}
```

```http
### ① 各来源
GET {{host}}/api/bindtest/sources/5?id=99&q=hello
X-Test: abc

### ② 对象
GET {{host}}/api/bindtest/query-object?keyword=核心&page=2&sort=price&order=desc

### ③ 数组（对）
GET {{host}}/api/bindtest/array?ids=1&ids=2&ids=3

### ③b 数组（错，会得到空数组）
GET {{host}}/api/bindtest/array?ids=1,2,3

### ④ 嵌套
GET {{host}}/api/bindtest/nested?filter.title=core&filter.page=3

### ⑥ 可空
GET {{host}}/api/bindtest/nullable?price=&count=
```

---
==二：格式==

## P110 · 状态码返回骨架

```csharp
// 2xx
return Ok(data);                                              // 200
return CreatedAtAction(nameof(Get), new { id = x.Id }, x);     // 201 + Location
return NoContent();                                            // 204（无 body）
return Accepted(new { taskId });                               // 202

// 4xx
return BadRequest(new { message = "参数错" });                  // 400
return UnprocessableEntity(new { message = "库存不足" });        // 422
return Unauthorized();                                         // 401 没登录
return Forbid();                                               // 403 没权限
return NotFound();                                             // 404
return Conflict(new { message = "已被他人修改" });               // 409

// ProblemDetails
return Problem(statusCode: 500, title: "内部错误", detail: "...");
```

## P110 · 全局 ProblemDetails 注册

```csharp
builder.Services.AddProblemDetails();

app.UseExceptionHandler();      // 未处理异常 → 500 + ProblemDetails
app.UseStatusCodePages();       // 空 body 的 4xx/5xx → 补 ProblemDetails
```

## P110 · 自定义自动 400 的格式

```csharp
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
    {
        o.InvalidModelStateResponseFactory = ctx =>
            new BadRequestObjectResult(new
            {
                code = "INVALID_PARAM",
                errors = ctx.ModelState
                    .Where(e => e.Value!.Errors.Count > 0)
                    .ToDictionary(k => k.Key,
                                  v => v.Value!.Errors.Select(e => e.ErrorMessage).ToArray())
            });
    });
```

## P111 · 接口规范骨架（可直接抄）

```
路由：/api/v1/{资源复数}[/{id:long}][/{子资源}]
动词：GET 查 / POST 建 / PUT 整体改 / DELETE 删；GET 禁副作用
状态：200 / 201+Location / 204 / 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500
参数：标识走路径，筛选分页走查询串（page 从 1、size ≤100），内容走 body
响应：错误用 ProblemDetails（含 traceId）；列表用 PagedResult
DTO：入参出参分离，禁止返回实体
并发：DbUpdateConcurrencyException → 409
幂等：POST 敏感操作带 Idempotency-Key
```

## P112 · 异步 Action 骨架

```csharp
[HttpGet("{id:long}")]
public async Task<ActionResult<BookDto>> Get(long id, CancellationToken ct)
{
    var dto = await _ctx.Books
        .AsNoTracking()
        .Where(b => b.Id == id)
        .Select(b => new BookDto(b.Id, b.Title, b.Price))
        .FirstOrDefaultAsync(ct);

    return dto is null ? NotFound() : dto;
}
```

```csharp
// 并行（只用于独立的外部调用，不能并行同一个 DbContext）
var t1 = _http.GetAsync(url1, ct);
var t2 = _http.GetAsync(url2, ct);
await Task.WhenAll(t1, t2);
```

## P113 · 绑定源显式指定

```csharp
[HttpPost("{id:long}")]
public async Task<ActionResult> Update(
    [FromRoute] long id,
    [FromQuery] bool? force,
    [FromBody] UpdateBookRequest req,
    [FromHeader(Name = "If-Match")] string? etag,
    CancellationToken ct)
```

## P113 · 枚举字符串化

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

---

==三：代码==

## 3.1 状态码演示控制器（逐个调用一遍）

```csharp
[ApiController]
[Route("api/[controller]")]
public class StatusDemoController : ControllerBase
{
    [HttpGet("ok")]                public ActionResult Ok200() => Ok(new { msg = "成功的 200" });
    [HttpGet("created")]           public ActionResult Created() =>
        CreatedAtAction(nameof(Ok200), null, new { msg = "创建成功" });

    [HttpGet("nocontent")]         public ActionResult NoContent204() => NoContent();

    [HttpGet("bad")]               public ActionResult Bad400() =>
        BadRequest(new { message = "参数格式错误" });

    [HttpGet("unprocessable")]     public ActionResult Unprocessable422() =>
        UnprocessableEntity(new { message = "库存不足，只剩 3 本" });

    [HttpGet("unauthorized")]      public ActionResult Unauthorized401() => Unauthorized();

    [HttpGet("forbidden")]         public ActionResult Forbidden403() => Forbid();

    [HttpGet("notfound")]          public ActionResult NotFound404() => NotFound();

    [HttpGet("conflict")]          public ActionResult Conflict409() =>
        Conflict(new { message = "该书名已存在" });

    [HttpGet("problem")]           public ActionResult Problem500() =>
        Problem(statusCode: 500, title: "内部错误", detail: "数据库连接超时");

    [HttpGet("throw")]             public ActionResult Throw() =>
        throw new InvalidOperationException("演示未处理异常 → 全局处理器接管");

    [HttpGet("chinese")]
    public ActionResult Chinese()
    {
        // 演示中文转义：默认会变成 \u4E2D\u6587
        return Ok(new { text = "中文会变成转义序列吗？" });
    }
}
```

**观察重点**：

| 接口 | 看什么 |
|---|---|
| `/created` | 响应头有 `Location` |
| `/nocontent` | **响应体完全为空**（204 不允许有 body） |
| `/notfound` | 配了 `UseStatusCodePages()` 才有 body，否则空 |
| `/forbid` | 403，**注意不是 401** |
| `/throw` | 配了 `UseExceptionHandler()` → 500 + ProblemDetails（**不含堆栈**） |
| `/chinese` | 默认 `"\u4E2D\u6587..."`；配了 `UnicodeRanges.All` 才是中文 |

## 3.2 全局异常处理（异常 → 状态码的映射表）

**这是 P111/P110 落地的核心组件**，也是 P134 ExceptionFilter 的"现代化替代方案"（.NET 8+ 推荐用 `IExceptionHandler`）。

```csharp
// Infrastructure/GlobalExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        // ── 异常 → (状态码, 标题, 业务码) 的映射
        var (status, title, code) = exception switch
        {
            BusinessException be => (be.StatusCode, "业务规则不满足", be.Code),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "资源不存在", "NOT_FOUND"),
            ArgumentException or FormatException
                                  => (StatusCodes.Status400BadRequest, "参数错误", "INVALID_ARGUMENT"),
            UnauthorizedAccessException
                                  => (StatusCodes.Status403Forbidden, "无权限", "FORBIDDEN"),
            DbUpdateConcurrencyException
                                  => (StatusCodes.Status409Conflict, "数据已被修改", "CONCURRENCY_CONFLICT"),
            DbUpdateException      => (StatusCodes.Status409Conflict, "数据冲突", "DB_CONFLICT"),
            TimeoutException       => (StatusCodes.Status503ServiceUnavailable, "服务繁忙", "TIMEOUT"),
            _                      => (StatusCodes.Status500InternalServerError, "服务器内部错误", "INTERNAL_ERROR")
        };

        // ── 日志分级：5xx 记 Error（要告警），4xx 记 Warning（不用告警）
        if (status >= 500)
            _logger.LogError(exception, "未处理异常 {Path} traceId={TraceId}",
                httpContext.Request.Path, httpContext.TraceIdentifier);
        else
            _logger.LogWarning("业务异常 {Code} {Path}", code, httpContext.Request.Path);

        // ── 组装 ProblemDetails
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            // 生产环境不暴露内部异常信息
            Detail = status >= 500
                ? "服务器处理请求时发生错误，请稍后重试"
                : exception.Message,
            Instance = httpContext.Request.Path,
            Type = $"https://api.example.com/errors/{code.ToLowerInvariant()}"
        };
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, ct);
        return true;                              // true = 已处理，不再往下传
    }
}
```

```csharp
// Program.cs
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();       // 开发环境要有堆栈，方便调试
else
    app.UseExceptionHandler();             // 生产环境 → 全局处理器

app.UseStatusCodePages();                  // 补空 body 的 4xx
```

> **注意 `if/else`**：`UseDeveloperExceptionPage()` 和 `UseExceptionHandler()` **不要同时启用**，前者会抢先处理（它在更外层）。

## 3.3 异步 Controller 完整版（含 CancellationToken）

```csharp
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly BookDbContext _ctx;
    private readonly ILogger<BooksController> _logger;

    public BooksController(BookDbContext ctx, ILogger<BooksController> logger)
    {
        _ctx = ctx;
        _logger = logger;
    }

    // 列表：异步 + 投影 + 分页
    [HttpGet]
    public async Task<ActionResult<PagedResult<BookDto>>> List(
        [FromQuery] BookQuery q, CancellationToken ct)
    {
        var size = Math.Clamp(q.Size, 1, 100);
        var page = Math.Max(q.Page, 1);

        IQueryable<Book> query = _ctx.Books.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Keyword))
            query = query.Where(b => b.Title.Contains(q.Keyword));
        if (q.MinPrice is not null) query = query.Where(b => b.Price >= q.MinPrice);
        if (q.MaxPrice is not null) query = query.Where(b => b.Price <= q.MaxPrice);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(b => b.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(b => new BookDto(b.Id, b.Title, b.Price, b.PubTime,
                                     b.Author!.Name, b.Category!.Name))
            .ToListAsync(ct);

        return Ok(new PagedResult<BookDto>(total, page, size,
            (int)Math.Ceiling(total / (double)size), items));
    }

    // 单条
    [HttpGet("{id:long}")]
    public async Task<ActionResult<BookDto>> Get(long id, CancellationToken ct)
    {
        var dto = await _ctx.Books.AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new BookDto(b.Id, b.Title, b.Price, b.PubTime,
                                     b.Author!.Name, b.Category!.Name))
            .FirstOrDefaultAsync(ct);

        return dto is null ? NotFound(new { message = $"图书 {id} 不存在" }) : dto;
    }

    // 创建
    [HttpPost]
    public async Task<ActionResult<BookDto>> Create(
        [FromBody] CreateBookRequest req, CancellationToken ct)
    {
        if (await _ctx.Books.AnyAsync(b => b.Title == req.Title, ct))
            return Conflict(new { message = "同名图书已存在" });

        var book = new Book
        {
            Title = req.Title,
            Price = req.Price,
            PubTime = req.PubTime,
            AuthorId = req.AuthorId
        };
        _ctx.Books.Add(book);
        await _ctx.SaveChangesAsync(ct);       // ← 这里才是真正拿 id 的时刻

        var dto = new BookDto(book.Id, book.Title, book.Price, book.PubTime, "", "");
        return CreatedAtAction(nameof(Get), new { id = book.Id }, dto);
    }

    // 更新（含并发冲突 → 409）
    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(
        long id, [FromBody] UpdateBookRequest req, CancellationToken ct)
    {
        var book = await _ctx.Books.FindAsync([id], ct);
        if (book is null) return NotFound();

        book.Title = req.Title ?? book.Title;
        book.Price = req.Price ?? book.Price;

        try
        {
            await _ctx.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            _logger.LogWarning("并发冲突 bookId={Id}", id);
            return Conflict(new { message = "数据已被他人修改，请刷新后重试" });
        }

        return NoContent();
    }

    // 删除
    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id, CancellationToken ct)
    {
        var book = await _ctx.Books.FindAsync([id], ct);
        if (book is null) return NotFound();

        _ctx.Books.Remove(book);
        await _ctx.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

> **`FindAsync([id], ct)` 的方括号**：`FindAsync` 的参数是 `params object?[]`，传 `ct` 时要把 key 包成数组，否则 `ct` 会被当成第二个主键值。
> 这是 .NET 里 `params` + 可选参数混用的坑，**写法记住：`FindAsync([id], ct)`**。

## 3.4 参数绑定完整测试

```csharp
[ApiController]
[Route("api/[controller]")]
public class BindController : ControllerBase
{
    // 1) 五种来源一次演示
    [HttpGet("all/{id:long}")]
    public ActionResult All(
        long id,
        [FromQuery] string? q,
        [FromHeader(Name = "X-Trace")] string? trace,
        [FromServices] ILogger<BindController> logger)
    {
        logger.LogInformation("id={Id},q={Q},trace={T}", id, q, trace);
        return Ok(new { id, q, trace });
    }

    // 2) 空串 vs 缺省
    [HttpGet("empty")]
    public ActionResult Empty(string? s, int? n, int m)
        => Ok(new { s = s is null ? "<null>" : $"\"{s}\"", n, m });
    // ?s=&n=&m=        → s=""（空串）, n=null, m=0（空串被视为"没有值"，用默认值，不报错）
    // ?s=&n=abc&m=x    → 类型转换失败 → ModelState 报错 → [ApiController] 自动 400

    // 3) 数组两种格式
    [HttpGet("arr")]
    public ActionResult Arr([FromQuery] long[] ids)
        => Ok(new { count = ids.Length, ids });

    // 4) 嵌套对象
    [HttpGet("nested")]
    public ActionResult Nested([FromQuery] Filter f) => Ok(f);

    // 5) 枚举（默认接受数字和名字）
    [HttpGet("enum")]
    public ActionResult Enum(BookStatus status) => Ok(new { status, name = status.ToString() });

    // 6) 日期
    [HttpGet("date")]
    public ActionResult Date(DateTime? from, DateOnly? to)
        => Ok(new { from, to });

    // 7) 文件
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> Upload([FromForm] IFormFile file, [FromForm] string? remark)
    {
        if (file.Length == 0) return BadRequest(new { message = "空文件" });
        return Ok(new { name = file.FileName, size = file.Length, remark });
    }
}

public class Filter { public string? Title { get; set; } public int Page { get; set; } = 1; }
public enum BookStatus { Draft, Published, Archived }
```

```http
### 1 五源
GET {{host}}/api/bind/all/5?id=99&q=hello
X-Trace: t-001

### 2 空串 vs 缺省（逐个试，观察差异）
GET {{host}}/api/bind/empty?s=&n=&m=

### 2b 类型转换失败 → 400
GET {{host}}/api/bind/empty?s=&n=abc&m=x

### 3 数组（对）
GET {{host}}/api/bind/arr?ids=1&ids=2&ids=3

### 3b 数组（错，得到 0 个元素）
GET {{host}}/api/bind/arr?ids=1,2,3

### 4 嵌套
GET {{host}}/api/bind/nested?title=core&page=2

### 5 枚举（两种都行）
GET {{host}}/api/bind/enum?status=Published
GET {{host}}/api/bind/enum?status=1

### 6 日期
GET {{host}}/api/bind/date?from=2026-01-01&to=2026-12-31
```

> **`?n=`（空字符串）绑到 `int?`** 得到 `null`；绑到 **非可空 `int`** 时得到 **`0`**（空串被当成"没提供值"，不报错）。
> **只有"转换失败"才 400**，比如 `?n=abc`。
> **结论：想区分"没传"和"传了空"，就用可空类型接，然后自己判——不要指望框架替你区分。**

## 3.5 把这一批应用到你的项目（一次改完）

```csharp
// 改造前
[HttpGet("books")]
public IActionResult GetBooks(int page, int size) =>
    Ok(new { total = 0, items = new List<Book>() });

// 改造后
[HttpGet]
public async Task<ActionResult<PagedResult<BookDto>>> List(
    [FromQuery] BookQuery q, CancellationToken ct)
{
    var size = Math.Clamp(q.Size, 1, 100);
    var page = Math.Max(q.Page, 1);
    ...
    return Ok(new PagedResult<BookDto>(total, page, size, pages, items));
}
```

**改造清单**：

| # | 改什么 | 为什么 |
|---|---|---|
| 1 | 所有 Action 加 `async` + `CancellationToken ct` | 不阻塞线程；用户断开时停止查询 |
| 2 | 所有 EF 调用换 `XxxAsync(ct)` | 同上 |
| 3 | 只读查询加 `AsNoTracking()` | 省内存 |
| 4 | 返回 DTO 而不是实体 | 避免循环引用 + 减少传输 |
| 5 | 查询接口加 `[FromQuery] 对象` 收参数 | 参数一多方法签名会爆炸 |
| 6 | 找不到返回 `NotFound()`，不要 `Ok(null)` | 前端能区分 |
| 7 | 加 `AddProblemDetails()` + `UseExceptionHandler()` | 统一错误格式 + traceId |
| 8 | 分页 `size` 加 `Math.Clamp` 上限 | 防 `?size=999999` |

---

==四：总结==

## 4.1 四节核心结论

| # | 结论 | 一句话 |
|---|---|---|
| 1 | **状态码是契约的一部分** | 每种结局必须有确定的码；全返回 200 = 监控全瞎 + 网关失效 |
| 2 | **落地指南 = 把约定变成默认值** | 路由、DTO、分页、错误格式定死，团队不用再讨论 |
| 3 | **Web API 的 Action 永远异步** | 不是为了单次更快，是为了同样线程数扛更多并发 |
| 4 | **参数绑定要显式，不要靠猜** | `[FromQuery]` / `[FromBody]` 写清楚，比记规则靠谱 |

## 4.2 状态码决策表（打印贴屏幕）

```
成功了？
├─ 创建了资源 → 201 + Location
├─ 有内容要返回 → 200
└─ 没内容 → 204

失败了？
├─ 客户端的问题
│   ├─ 格式/类型/必填错 → 400
│   ├─ 格式对但业务不成立 → 422
│   ├─ 没登录/凭证过期 → 401
│   ├─ 登录了但没权限 → 403
│   ├─ 资源不存在 → 404
│   ├─ 状态冲突（重名/并发） → 409
│   └─ 请求太频繁 → 429
└─ 服务端的问题
    ├─ 代码 bug → 500
    └─ 暂时不可用（维护/过载/下游挂） → 503 + Retry-After
```

## 4.3 异步三张表

| 写法 | 评价 |
|---|---|
| `async Task<ActionResult<T>>` | ✅ 默认选它 |
| `async Task<ActionResult>` | ✅ 无返回类型时（删除/更新） |
| `async Task<T>` | ⚠️ 只能靠异常表达失败 |
| `async void` | ☠️ 异常会杀进程 |
| `.Result` / `.Wait()` | ❌ 阻塞线程池（**在 ASP.NET Core 里不死锁，但照样有害**） |
| `ConfigureAwait(false)` | ❌ ASP.NET Core 里不需要（类库要加） |
| `ValueTask` | ⚠️ 极高 QPS 才考虑，用错出 bug |

## 4.4 参数绑定速查（含坑）

| 场景 | 正确写法 | 坑 |
|---|---|---|
| 复杂对象查询条件 | `[FromQuery] BookQuery q` | 不加 `[FromQuery]` + 有 `[ApiController]` → 去 body 找 |
| 多个 body 对象 | 包一层 DTO | `[FromBody]` 只能一个 |
| 数组 | `?ids=1&ids=2` | `?ids=1,2,3` **不支持**；axios 默认发 `ids[]=` 也绑不上 |
| 空串 vs null | 用 `string?` 接，自己判 | `?n=`（空）到 `int` 是 **0**（不报错）；`?n=abc` 才 400 |
| 日期 | ISO 8601 `2026-01-01` | `2026/1/1` 绑不上 |
| 枚举 | 数字或名字都能绑 | JSON 字符串要 `JsonStringEnumConverter` |
| 文件 | `[FromForm] IFormFile` + `[Consumes]` | 别信客户端文件名和 ContentType |
| record 验证 | `[property: Required]` | 直接写 `[Required]` 不生效 |
| 查询串长度 | ≤ 8KB（Kestrel 默认） | 超长 → 414；条件多就改 POST |
| POST 请求 | 必带 `Content-Type: application/json` | 不写 → 415 |

## 4.5 记忆口诀

```
创建 201 带地址，删除 204 不说话
格式错 400，业务错 422
没登录 401，没权限 403
不存在 404，撞车 409
服务挂了 500，暂时不行 503

Action 一律 async Task，CancellationToken 一路传下去
不许 async void，不许 .Result

参数从哪来，显式写出来
标识走路径，条件走查询，内容走 body
数组用重复键，逗号不认账
```

## 4.6 五个高频易错点

| # | 易错点 | 正确做法 |
|---|---|---|
| 1 | 所有响应都返回 200 + `{code, message}` | HTTP 状态码必须正确，业务码只能作为补充 |
| 2 | `return NotFound()` 但响应体是空的 | 配 `UseStatusCodePages()`，或 `return NotFound(problem)` |
| 3 | 生产环境把异常堆栈返回给客户端 | 500 只返回通用文案，堆栈进日志 |
| 4 | 异步方法里用 `.Result` | 全部改成 `await`，参数一路传 `ct` |
| 5 | `GET` + 复杂对象参数没加 `[FromQuery]` | 加 `[FromQuery]`，否则框架去 body 找（GET 没有 body） |

## 4.7 留给下一批的问题（P114–P116 前后端分离）

1. 前端 `fetch` 跨域到 `localhost:5003`，为什么浏览器报 CORS 错误？服务端要加什么？
2. 前端怎么统一处理 401（自动跳登录）和 500（弹全局提示）？
3. 登录成功后 token 存哪里？`localStorage` 有什么风险？
4. 前后端联调时，为什么有时候"后端返回了数据，前端拿到的是 undefined"？（提示：`res.json()` 和响应体为空）
5. 开发环境怎么避免每次都要重启两个服务？（Vite 代理）

**这五个问题都在你下一个项目里会真实撞上。下一批用你自己的 Vite + 5003 项目走一遍。**



