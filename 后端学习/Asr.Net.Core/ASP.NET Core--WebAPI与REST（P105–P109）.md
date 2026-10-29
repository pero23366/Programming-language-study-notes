==零：补充==

> **这一节回答三个问题：REST 这套规矩为什么存在？不照它写会怎样？你什么时候可以不理它？**

## 它解决什么问题

到目前为止，你写接口的方式大概率是这样的：

```csharp
[HttpGet("getBooks")]        public IActionResult GetBooks()
[HttpGet("getBookById")]     public IActionResult GetBookById(long id)
[HttpPost("addBook")]        public IActionResult AddBook(Book book)
[HttpPost("updateBook")]     public IActionResult UpdateBook(Book book)
[HttpPost("deleteBook")]     public IActionResult DeleteBook(long id)
```

**这套写法没有任何技术错误**——它能跑、能返回数据、前端能用。但它有三个隐形代价：

**① 你的接口只对"你"有意义。**

一个新人（或者三个月后的你）拿到 `/api/deleteBook?id=5`，无法判断：

- 这个操作成功返回什么？200 还是 204？body 是 `true` 还是 `{}`？
- 失败返回什么？200 + `{success:false}` 还是 500？
- 重复调用一次会怎样？删两次报错还是静默成功？

**这些问题的答案不在 URL 里，也不在 HTTP 语义里，只在你脑子里。** 于是每个接口都得配一份文档，文档和代码还会不同步。

**② 你放弃了 HTTP 二十多年积累的全部中间设施。**

HTTP 自带一整套"语义标签"：`GET` 表示"只读"、`PUT` 表示"整个替换"、`DELETE` 表示"删除"、`404` 表示"不存在"、`201 + Location` 表示"新建成功且资源在那边"。

**当你把这些信息全塞进 URL 的方法名里，这些标签就失效了**，连带失效的是：

| 设施 | 依赖什么 | 你的写法为什么会破坏它 |
|---|---|---|
| 浏览器/CDN/代理的缓存 | 只有 `GET` 可缓存 | 你用 `POST /getBooks` 查数据，缓存全废 |
| 重试机制（网络抖动重发） | 幂等性（`PUT`/`DELETE` 可安全重试） | 你用 `POST /deleteBook`，重发可能报错或重复 |
| 网关限流、审计、监控 | 按"动词 + 路径模式"统计 | 你的路径全是动作名，无法归类 |
| OpenAPI 自动生成客户端 SDK | 资源化的路径 + 语义化的动词 | 生成出来是一堆 `getBooks`、`addBook` 方法名 |
| 前端 `fetch` 的语义化处理 | `res.status === 404` → 显示"没找到" | 你的 200 + `{success:false, msg:"没找到"}` 得每次手写判断 |

**③ 你没法回答"这个接口该用什么状态码"这类问题。**

因为你的设计里根本没有"状态码"这个概念的位置——`POST /deleteBook` 返回 200 就完事了。等前端要区分"没权限""不存在""已被别人改过"，你只能再加 `code: 4003`、`code: 4004` 这种自造编号。**而 HTTP 已经有这些编号了，只是你没用。**

## 没有它会怎样

**具体到一个场景，你立刻能感受到差别。**

假设前端要做"图书详情页"，需要：书名、作者名、分类名。

**你的写法**（三次调用，三个 URL）：

```
GET /api/getBookById?id=5
GET /api/getAuthorById?id=3
GET /api/getCategoryById?id=7
```

**REST 写法**（一次调用，因为关系在 URL 里）：

```
GET /api/books/5?include=author,category
```

第二种为什么更好？不只是"少两次请求"。而是：

- **URL 本身表达了资源关系**（`books/5` 是书 5，作者是它的属性）
- **可以嵌套**：`GET /api/authors/3/books` 一眼知道是"作者 3 的书"
- **可以被缓存**（`GET` + 同一个 URL = 同一个结果，加 `Cache-Control` 就能命中）

**而第一种写法里，`getBookById` 和 `getAuthorById` 之间没有任何关系信息**，只能靠文档说"详情页要调这三个"。

## 它在整个生态里的位置

REST 不是一个库、不是框架特性，它是**一套"怎么用 HTTP"的约定**。它的地位可以用一句话概括：

> **REST 是 HTTP 的"正确用法说明书"，而 ASP.NET Core 是"照着这份说明书造的工具"。**

所以你会看到这些现象：

| 现象 | 原因 |
|---|---|
| 为什么 `[HttpGet("{id}")]` 的写法比 `[HttpGet("getById")]` 更"正统" | 前者是资源标识，后者是动作名 |
| 为什么 ASP.NET Core 有 `CreatedAtAction` 这个方法 | 它专门生成 `201 + Location` 头，这是 REST 的标准动作 |
| 为什么 `[ApiController]` 会自动返回 `400 + ProblemDetails` | `ProblemDetails` 是 RFC 9457 标准错误格式，REST 生态通用 |
| 为什么 Swagger/OpenAPI 生成的文档那么规整 | 因为你的接口是资源化的，它能推断出"这是 books 的增删改查" |
| 为什么公司里"接口规范"文档第一条永远是"URL 用名词复数" | 那是 REST 的第一条军规 |

**你后面要学的所有东西，都建在这套语义上**：P110 的状态码、P111 的落地指南、P134 的 ExceptionFilter（它要按状态码分类）、P144 的 JWT（`401` 和 `403` 的区别就是 REST 语义）。

## 对你个人的实际意义

**第一，这是"能跑"和"专业"之间最明显的一条分界线。**

面试官问"你写过 RESTful 接口吗"，标准答案不是"我用了 `[HttpGet]`"，而是能说清：**资源怎么划分、动词怎么选、状态码怎么定、幂等性怎么保证、复杂查询怎么表达**。这五条答得出来，你的接口水平立刻从"会用框架"升到"懂设计"。

**第二，你现在的 `BooksController` / `QueryController` 就处在"半对半错"的状态。**

大概率你的接口长这样：

```csharp
[HttpGet("books")]          // 对：名词复数
[HttpGet("stats/by-category")]   // 半对：统计是"派生资源"，勉强能接受
[HttpPost("bulk-slow")]     // 错：动词进了 URL
[HttpPost("seed-relations")]     // 错：这是运维操作，不该是业务 API
```

**这批课之后你会知道每个"错"错在哪、怎么改、哪些可以不改（因为它是调试接口）。**

**第三，REST 的缺点这一节（P108）比优点更重要。**

网上讲 REST 的文章 99% 只讲优点，导致很多人以为"REST 是唯一正确答案"。**实际上 REST 有四个硬伤**（过度获取、多次往返、批量操作别扭、事务性差），这也是 GraphQL 和 gRPC 存在的理由。

知道缺点，你才不会在"导出十万条数据"这种场景硬套 REST，也不会觉得"没用 REST 就是我不专业"。

## 诚实的话：什么时候可以不理它

**REST 不是宗教，它是个工具。下面这些场景，硬套 REST 反而更糟：**

| 场景 | 为什么不适用 | 更合适的做法 |
|---|---|---|
| **实时推送**（聊天、协同编辑） | REST 是"请求-响应"，天生不支持服务端主动推 | WebSocket / SignalR（P157 会讲） |
| **内部服务间高频调用** | JSON + HTTP/1.1 的文本开销大 | gRPC（二进制 + HTTP/2） |
| **一次要拿多种不相关数据**（移动端首屏） | REST 要发 N 个请求 | GraphQL / BFF 聚合层 |
| **复杂批量操作**（一次改 8 张表） | REST 的"一个 URL 一个资源"表达不了事务 | 专门的"命令式"端点，如 `POST /api/orders/place` |
| **文件上传下载** | 二进制大对象不适合塞进 JSON 资源模型 | 独立的上传端点 + 对象存储直传 |
| **报表/导出** | 一个 URL 产出动态文件，没有"资源"可指 | `GET /api/reports/sales?from=&to=` 返回文件流 |

**关键判断：REST 适合"以资源为中心"的系统（图书、订单、用户），不适合"以操作为中心"的系统（工作流引擎、任务调度）。**

你的图书管理系统，是**典型的、几乎教科书级的 REST 适用场景**——所以这批课对你不是"学个规范"，是"学对的东西"。

**一句话总结：REST 让你少写文档、少造状态码、多蹭 HTTP 的现成设施；代价是牺牲了一部分表达力（复杂查询、批量、事务）。判断标准是——你的系统是"一堆资源"还是"一堆动作"。**

---

==一：概念==

> 本篇覆盖 **P105–P109**：WebAPI 入门 1/2、什么是 REST、REST 的优缺点、Restful 中如何传递参数。
> 环境：**.NET 10**，模板用 `dotnet new webapi -controllers`（带 Controller 的版本）。
> 承接：P102–P104 的管线 / 路由 / 参数绑定是这一批的前置——**这一批几乎全部在"路由 + 参数 + 返回值"这三层上做文章**。
> 本篇没有 EF Core 的新内容，用内存 List 演示，注意力全部放在"接口设计"上。

---

# P105　WebAPI 入门 1

**一句话：Web API 就是"只返回数据、不返回页面"的 Controller——它的全部工作流是「接收 HTTP 请求 → 解析参数 → 返回 JSON + 状态码」。**

## 1. 先看清 WebAPI 与 MVC 的物理差别

| 维度 | MVC（P103） | Web API |
|---|---|---|
| 父类 | `Controller` | `ControllerBase` |
| 返回 | `View()` → 渲染 `.cshtml` → HTML | 返回对象 → 序列化 → JSON |
| 注册 | `AddControllersWithViews()` | `AddControllers()` |
| 路由 | 约定路由（`{controller}/{action}`） | **特性路由**（`[Route]` + `[HttpGet]`） |
| 客户端 | 浏览器（要页面） | 前端代码 / App / 第三方系统（要数据） |
| 内容协商 | HTML 优先 | JSON 优先（`Accept: application/json`） |

**同一个框架，两种模式。** 差别只有三处：继承谁、注册哪个、返回什么。

## 2. 创建项目（.NET 10 的两种模板）

```bash
# ① 带 Controller 的 Web API（本课要用的）
dotnet new webapi -controllers -n BookApi

# ② 不带 Controller 的 Minimal API（.NET 6+ 默认）
dotnet new webapi -n BookApiMin

cd BookApi
dotnet run
```

**生成的 `Program.cs`（Controller 版）**：

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();          // ← 只注册 API 相关服务
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                       // /openapi/v1.json
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

**和 Minimal API 版对比**：

```csharp
// Minimal API 版：没有 Controller，端点直接写在 Program.cs
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

var summaries = new[] { "Freezing", "Bracing", "Chilly" };
app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast(DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                            Random.Shared.Next(-20, 55),
                            summaries[Random.Shared.Next(summaries.Length)]))
        .ToArray();
    return forecast;
});

app.Run();
```

| 对比项 | Controller 版 | Minimal API 版 |
|---|---|---|
| 代码位置 | 每个资源一个类 | 全在 `Program.cs`（或拆成扩展方法） |
| 适合 | **业务复杂的项目**（你要做的） | 微服务、少量端点、函数式风格 |
| Filter / 模型绑定特性 | 完整支持 | 支持有限（.NET 7+ 逐步补齐） |
| 团队协作 | 一个类一个文件，冲突少 | 一个文件，容易冲突 |

> **给你的判断**：**用 Controller。** 你的图书管理系统会有几十个接口 + EF Core + 校验 + 认证，Minimal API 写到 20 个端点就会开始失控。**但要知道 Minimal API 存在**——因为它暴露了一个真相：**Controller 只是"端点"的一种包装**，`MapGet("/x", handler)` 和 `[HttpGet("x")]` 干的是同一件事。

## 3. 第一个接口：从零到能调通

```csharp
// Controllers/BooksController.cs
using Microsoft.AspNetCore.Mvc;

namespace BookApi.Controllers;

public record BookDto(long Id, string Title, double Price, DateTime PubTime);

[ApiController]
[Route("api/[controller]")]                    // → api/Books
public class BooksController : ControllerBase
{
    // 演示用：静态 List 代替数据库
    private static readonly List<BookDto> _books =
    [
        new(1, "C# 入门", 59.9, new DateTime(2024, 1, 1)),
        new(2, "EF Core 深入", 89.0, new DateTime(2025, 3, 15)),
    ];

    // GET api/books
    [HttpGet]
    public ActionResult<IEnumerable<BookDto>> GetAll() => _books;

    // GET api/books/2
    [HttpGet("{id:long}")]
    public ActionResult<BookDto> GetById(long id)
    {
        var book = _books.FirstOrDefault(b => b.Id == id);
        return book is null ? NotFound() : book;
    }
}
```

**启动后访问 `/api/books`，你会拿到**：

```json
[
  { "id": 1, "title": "C# 入门", "price": 59.9, "pubTime": "2024-01-01T00:00:00" },
  { "id": 2, "title": "EF Core 深入", "price": 89.0, "pubTime": "2025-03-15T00:00:00" }
]
```

**注意两件事**：

| 现象 | 原因 |
|---|---|
| **属性名变成小驼峰**（`Id` → `id`） | `System.Text.Json` 默认 `JsonNamingPolicy.CamelCase`，这是 JS 的命名习惯 |
| `DateTime` 带 `T00:00:00` | 默认 ISO 8601 格式。前端要显示日期得自己 `slice(0, 10)` 或用 `ToString("yyyy-MM-dd")` 转成 string |

> **这两个默认值会一直跟着你**，要么接受它（推荐，前端适配更省事），要么全局改：
> ```csharp
> builder.Services.AddControllers()
>     .AddJsonOptions(o => {
>         o.JsonSerializerOptions.PropertyNamingPolicy = null;   // 保留 PascalCase
>         o.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);  // 中文不转 \uXXXX
>     });
> ```

## 4. 三种测试方式（选一种就够，但要知道三种）

### ① `.http` 文件（你已经在用，最推荐）

```http
@host = http://localhost:5003

### 全部图书
GET {{host}}/api/books

### 单本
GET {{host}}/api/books/2

### 不存在
GET {{host}}/api/books/999
```

VS 里直接点 "发送请求"，结果在右侧窗口。**优点**：跟代码一起提交、可复用、不用装东西。

### ② Scalar / Swagger UI（要给别人看文档时）

```csharp
// Program.cs，需要 nuget: Scalar.AspNetCore
builder.Services.AddOpenApi();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();     // /scalar/v1
}
```

**注意**：.NET 9 起模板只有 `MapOpenApi()`（纯 JSON），**没有 UI**。想要 UI 必须自己加 Scalar 或 Swashbuckle。

### ③ 浏览器 / curl / Postman

- 浏览器只能发 `GET`（地址栏），**不能测 `POST`/`PUT`/`DELETE`**
- `curl -X POST http://localhost:5003/api/books -H "Content-Type: application/json" -d "{\"id\":3,...}"`
- Postman 功能全但重，且接口变了不会跟代码同步

> **对你的建议**：`.http` 为主，Scalar 只在"要给前端同学接口文档"时开。

## 5. JSON 序列化：三个必须知道的默认行为

| 行为 | 默认值 | 怎么改 |
|---|---|---|
| 属性命名 | `camelCase`（`Title` → `title`） | `PropertyNamingPolicy = null` |
| 反序列化大小写 | **不敏感**（`"Title"` 和 `"title"` 都能绑） | `PropertyNameCaseInsensitive = false` |
| `null` 值 | **会输出**（`"title": null`） | `DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull` |
| 中文 | **会转义成 `\u4E2D\u6587`** | `Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)` |
| 循环引用 | **抛异常**（`JsonException: A possible object cycle`） | 用 DTO 投影，**不要直接返回 EF 实体** |

> **最后一条是你会踩的坑**：你的 `Book` → `Author` → `Books` → `Author`… 直接返回实体会因为循环引用炸掉。
> **正确做法：永远返回 DTO**（`record BookDto(...)`）。这是 P71 关系查询里"投影"那一节的延伸。

---

# P106　WebAPI 入门 2

**一句话：这一节把「增删改查四个动作」和「参数从哪来」配齐——`GET` 读路径和查询串、`POST/PUT` 读 body、`DELETE` 读路径。**

## 1. 完整的 CRUD 五件套

```csharp
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private static readonly List<BookDto> _books = [ /* ... */ ];
    private static long _nextId = 3;

    // ① 查列表：GET api/books
    [HttpGet]
    public ActionResult<IEnumerable<BookDto>> GetAll() => _books;

    // ② 查单条：GET api/books/5
    [HttpGet("{id:long}")]
    public ActionResult<BookDto> GetById(long id)
    {
        var book = _books.FirstOrDefault(b => b.Id == id);
        return book is null ? NotFound() : book;
    }

    // ③ 新建：POST api/books   （body 是 JSON）
    [HttpPost]
    public ActionResult<BookDto> Create([FromBody] CreateBookRequest req)
    {
        var book = new BookDto(_nextId++, req.Title, req.Price, req.PubTime);
        _books.Add(book);
        // 201 + Location: /api/books/3
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
    }

    // ④ 整体替换：PUT api/books/5
    [HttpPut("{id:long}")]
    public ActionResult Update(long id, [FromBody] UpdateBookRequest req)
    {
        var index = _books.FindIndex(b => b.Id == id);
        if (index < 0) return NotFound();

        _books[index] = new BookDto(id, req.Title, req.Price, req.PubTime);
        return NoContent();                     // 204：成功，无返回体
    }

    // ⑤ 删除：DELETE api/books/5
    [HttpDelete("{id:long}")]
    public ActionResult Delete(long id)
    {
        var removed = _books.RemoveAll(b => b.Id == id);
        return removed == 0 ? NotFound() : NoContent();
    }
}

public record CreateBookRequest(string Title, double Price, DateTime PubTime);
public record UpdateBookRequest(string Title, double Price, DateTime PubTime);
```

**为什么 `Create` 用 `CreateBookRequest` 而不是 `BookDto`**——这是接口设计的重要习惯：

| 用实体/DTO 接收 | 用专门的 Request 类型接收 |
|---|---|
| 客户端能传 `id`（能伪造主键） | `Id` 不在入参里，由服务端生成 |
| 创建和更新共用一套字段 | 能分别约束（如创建必填、更新可选） |
| Swagger 文档显示 `id` 必填，误导前端 | 文档准确反映"前端该传什么" |

> **一句话原则：入参和出参永远分开定义。** 这条在 P111 会再强调一次。

## 2. 参数到底从哪来（实战版决策表）

| 场景 | 用什么 | 写法 |
|---|---|---|
| 标识某个资源 | **路径** | `[HttpGet("{id:long}")]` → `api/books/5` |
| 过滤/分页/排序 | **查询串** | `?keyword=核心&page=1&size=10` |
| 创建/更新的数据 | **body** | `[FromBody] CreateBookRequest` |
| 身份凭证 | **header** | `Authorization: Bearer xxx` |
| 文件 | **form** | `[FromForm] IFormFile file` |

**这张表是 P109 的结论提前放在这**，现在先记住"三句话"：

```
谁是资源 → 放路径
谁是条件 → 放查询串
谁是内容 → 放 body
```

## 3. 一个请求为什么变成 404 / 405 / 415 / 400

这四种错误码在入门阶段会反复出现，**搞清它们的分工，排查效率差十倍**。

| 状态码 | 含义 | 典型原因 | 怎么定位 |
|---|---|---|---|
| **404 Not Found** | 路径没匹配到任何端点 | ① 路由模板拼错 ② `{id}` 约束不过（`/5abc` 不匹配 `:long`）③ 大小写（Linux）④ `AddControllers`/`MapControllers` 漏了 | 打印端点表（P102 那段代码） |
| **405 Method Not Allowed** | 路径匹配上了，但**动词**不对 | 你写了 `[HttpPost]`，前端发 `GET` | 看响应头 `Allow: POST` |
| **415 Unsupported Media Type** | 有 `[FromBody]`，但 `Content-Type` 不是 `application/json` | 前端忘了设请求头；或发的是表单 | 看请求头 |
| **400 Bad Request** | 参数绑上了，但校验不过 | `[Required]` 未填、类型转换失败、`[ApiController]` 自动验证 | 看响应体的 `errors` 字段 |

**一个真实例子**：

```http
POST {{host}}/api/books
# 忘了这一行 ↓
# Content-Type: application/json

{"title":"新书","price":30,"pubTime":"2026-01-01"}
```

返回：

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.16",
  "title": "Unsupported Media Type",
  "status": 415,
  "detail": "Expected a supported JSON media type but got \"text/plain\"."
}
```

> **`.http` 文件的隐形坑**：POST 必须手写 `Content-Type: application/json` 这一行，**不写默认是 `text/plain`** → 415。

## 4. `[ApiController]` 到底替你做了什么（三条，必须背下来）

| # | 行为 | 没有它会怎样 |
|---|---|---|
| 1 | **复杂类型参数默认从 body 读**（等价 `[FromBody]`） | 得每个参数手写 `[FromBody]`，忘了就收不到值（从 Query 凑，全是 null） |
| 2 | **模型验证失败自动返回 400** + `ValidationProblemDetails` | 得每个 Action 写 `if (!ModelState.IsValid) return BadRequest(ModelState);` |
| 3 | **必须有特性路由**，否则启动抛异常 | 会误以为约定路由能用，实际报错 `Action ... does not have an attribute route` |

**第 2 条展开看**——你写了 `[Required]` 但没写任何判断代码，框架直接返回：

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Title": ["The Title field is required."],
    "Price": ["The field Price must be between 0 and 9999."]
  }
}
```

**这个格式叫 `ProblemDetails`（RFC 9457）**，是 REST 生态的标准错误格式。前端可以统一处理：`if (res.status === 400) 显示 res.errors`。

---
# P107　什么是 REST

**一句话：REST 是「把一切都看成资源，用 HTTP 的标准动词和状态码去操作资源的表示」的一套架构约定。**

## 1. 名字的来历（搞清楚这个，你就不会把它当"规范"背）

REST 是 **RE**presentational **S**tate **T**ransfer（表述性状态转移）的缩写，由 **Roy Fielding** 在 **2000 年**的博士论文《Architectural Styles and the Design of Network-based Software Architectures》中提出。

**注意两件事**：

1. **Fielding 是 HTTP/1.1 规范的主要作者之一**。所以 REST 不是"给 HTTP 打补丁"，而是**解释"HTTP 本来就该怎么用"**。
2. **它是一篇论文里的"架构风格描述"，不是 W3C/ISO 标准**。所以没有"REST 认证"，也没有"违反 REST 就报错"——只有"符不符合这套风格"。

> **这句话要记住**：REST 描述的是**约束**（constraints），不是**规则**（rules）。你可以违反任何一条，代价是"失去了它带来的好处"。

## 2. 六个架构约束（原文的六条，一条条说人话）

| # | 约束 | 原文意思 | 人话 | 违反的代价 |
|---|---|---|---|---|
| 1 | **客户端-服务器**（Client-Server） | 分离用户界面与数据存储 | 前端管展示，后端管数据，各改各的 | 前后端耦合，改 UI 要动后端 |
| 2 | **无状态**（Stateless） | 每个请求自带全部上下文，服务端不存会话 | **服务端不记"你上次问了什么"**，每个请求都是独立的 | 无法水平扩展（必须粘性会话） |
| 3 | **可缓存**（Cacheable） | 响应必须标明自己能不能缓存 | `GET` 加 `Cache-Control`，让代理/CDN 帮你扛流量 | 每次请求都打到数据库 |
| 4 | **统一接口**（Uniform Interface） | 所有资源用同一套方式操作 | 不管什么资源，都是"URL + 动词 + 状态码" | 每个接口一套玩法，学习成本爆炸 |
| 5 | **分层系统**（Layered System） | 客户端不需要知道连的是不是最终服务器 | 中间可以插 Nginx、网关、CDN、负载均衡 | 无法加中间层 |
| 6 | **按需代码**（Code on Demand，**可选**） | 服务端可以下发可执行代码 | 返回 JS 让客户端执行（几乎没人用） | 无（这条是可选的） |

**这六条里，对你影响最大的是第 2 条（无状态）和第 4 条（统一接口）。**

### 无状态到底意味着什么（这条最容易误解）

**无状态 ≠ 不能用 Session。** 无状态是**架构层面的选择**：

| 有状态（Stateful） | 无状态（Stateless） |
|---|---|
| 服务端存 `Session["userId"] = 5` | 每个请求带 `Authorization: Bearer <token>` |
| 扩容要同步 Session（或粘性会话） | **加机器就完事**，任何一台都能处理任何请求 |
| 服务重启 → 用户全部掉线 | 重启无感 |

```csharp
// 有状态：靠服务端记忆
[HttpPost("login")]
public IActionResult Login(string name)
{
    HttpContext.Session.SetString("user", name);   // ← 状态存在服务端
    return Ok();
}

// 无状态：靠每次请求自带的凭证
[HttpPost("login")]
public IActionResult Login(string name, string pwd)
{
    var token = _jwt.Create(name);                 // ← 状态编码进 token，客户端保存
    return Ok(new { token });
}

[Authorize]
[HttpGet("profile")]
public IActionResult Profile() => Ok(User.Identity!.Name);   // 从 token 解析，不查 Session
```

> **这就是为什么 JWT 会取代 Session**（P147 会讲）。不是 JWT 更"先进"，是**无状态让水平扩展变廉价**。

### 统一接口的四个子约束

| 子约束 | 含义 | 你的项目里对应什么 |
|---|---|---|
| **资源的标识** | 每个资源有唯一 URL | `/api/books/5` |
| **通过表示操作资源** | 你操作的不是资源本身，是它的"表示"（JSON） | 传 JSON 进去，拿 JSON 出来 |
| **自描述消息** | 每个消息自带足够信息（`Content-Type`、状态码） | `Content-Type: application/json` + `404` |
| **HATEOAS** | 响应里带"下一步能做什么"的链接 | 极少实现，见下文 |

### HATEOAS：知道它存在就行

理想状态：`GET /api/books/5` 返回

```json
{
  "id": 5,
  "title": "C# 入门",
  "_links": {
    "self":   { "href": "/api/books/5" },
    "update": { "href": "/api/books/5", "method": "PUT" },
    "delete": { "href": "/api/books/5", "method": "DELETE" },
    "author": { "href": "/api/authors/3" }
  }
}
```

**客户端不用预先知道 URL 规则**，跟着链接走就行——就像浏览网页点链接。

**现实**：**99% 的项目不实现 HATEOAS**（包括所有你听说过的公司）。原因：前端要写死 URL、响应体变大、工具链不支持。

> **给你的建议**：知道这个词、面试能说一句"REST 的成熟度模型里 HATEOAS 是最高级，实践很少"，就足够了。**别去实现它。**

## 3. 资源、表示、状态转移（三个词逐个拆）

| 词 | 含义 | 例子 |
|---|---|---|
| **资源**（Resource） | 一个"东西"，可以是实体、集合、概念、关系 | 一本书、所有书、书的作者、本月销售统计 |
| **表示**（Representation） | 资源在某一刻的**序列化形式** | JSON、XML、HTML、图片 |
| **状态转移**（State Transfer） | 你通过操作表示，让资源的状态发生变化 | `PUT` 改价格 → 资源从 59.9 变成 49.9 |

**关键认知：URL 指向"资源"，不是"操作"。**

```
✅ /api/books/5            资源：书 5
❌ /api/getBook?id=5       操作：获取书（"获取"是动词，不是资源）
❌ /api/books/delete/5     操作：删书（"delete"混进了路径）
```

**「资源」的判断标准**：能不能用名词回答"这是什么？"

- `books`（一组书）✓
- `books/5`（第 5 本书）✓
- `books/5/author`（第 5 本书的作者）✓
- `authors/3/books`（作者 3 写的书）✓
- `getBooks`（??? 这不是东西，是动作）✗

## 4. HTTP 动词的语义（这张表是 REST 的心脏）

| 动词 | 语义 | 安全（Safe） | 幂等（Idempotent） | 典型状态码 |
|---|---|---|---|---|
| `GET` | 读取资源 | ✅ | ✅ | 200 / 404 |
| `HEAD` | 只取响应头 | ✅ | ✅ | 200 |
| `OPTIONS` | 问"支持哪些操作" | ✅ | ✅ | 204 / 200 |
| `POST` | **创建**资源 / 执行非幂等操作 | ❌ | **❌** | 201 / 400 / 409 |
| `PUT` | **整体替换**资源 | ❌ | ✅ | 200 / 204 / 404 |
| `PATCH` | **部分更新**资源 | ❌ | **❌**（不保证） | 200 / 204 / 404 |
| `DELETE` | 删除资源 | ❌ | ✅ | 204 / 404 |

### 两个必须分清的概念

**安全（Safe）= 只读，不改变资源状态。**

`GET /api/books/5` 调用一百次，书还是那本书。**所以浏览器敢预取、代理敢缓存、爬虫敢随便爬。**

**幂等（Idempotent）= 调用一次和调用 N 次，最终结果一样。**

`DELETE /api/books/5`：

- 第 1 次 → 204（删掉了）
- 第 2 次 → 404（已经没了）

**"结果不一样"但"资源状态一样"**——**这仍然算幂等**。幂等看的是**服务端资源状态**，不是响应内容。

`POST /api/books`：
- 第 1 次 → 创建 id=3
- 第 2 次 → 创建 id=4

**资源多了一条，状态变了 → 不幂等。**

> **为什么幂等这么重要**：网络会抖动。客户端超时了，它不知道请求到底成功没有。
> - 幂等的请求 → **放心重试**（`PUT`/`DELETE` 重试安全）
> - 非幂等的请求 → 重试可能**创建两条订单**
>
> 这就是为什么"支付"这类操作必须带**幂等键**（`Idempotency-Key` 头）——我们 P111 会讲。

### `PUT` vs `PATCH` 的真实区别

```csharp
// PUT：整体替换。没传的字段 → 会被置为 null/默认值
[HttpPut("{id}")]
public IActionResult Replace(long id, [FromBody] BookDto dto)   // 必须传全部字段

// PATCH：部分更新。只改传了的字段
[HttpPatch("{id}")]
public IActionResult Patch(long id, [FromBody] JsonPatchDocument<BookDto> patch)
{
    var book = _books.FirstOrDefault(b => b.Id == id);
    if (book is null) return NotFound();
    patch.ApplyTo(book);
    return NoContent();
}
```

> **`JsonPatchDocument<T>` 的坑**：它**依赖 Newtonsoft.Json**，在 .NET 里必须：
> 1. `dotnet add package Microsoft.AspNetCore.Mvc.NewtonsoftJson`
> 2. `builder.Services.AddControllers().AddNewtonsoftJson();`
>
> 否则运行时抛 `InvalidOperationException: Unable to find the required services`。
>
> **而且 PATCH 的 body 格式很怪**（`[{"op":"replace","path":"/title","value":"新名"}]`），前端不友好。
> **实务建议：用 `PUT` 传完整对象，或者干脆 `POST /api/books/5/price` 这种"子资源"表达局部更新。PATCH 知道就行。**

## 5. 状态码的五个家族（先记分类，P110 讲细节）

| 家族 | 含义 | 你常用的 |
|---|---|---|
| **1xx** | 信息 | 基本不见（`101 Switching Protocols` 用于 WebSocket） |
| **2xx** | 成功 | `200 OK`、`201 Created`、`204 No Content` |
| **3xx** | 重定向 | `301` 永久、`302` 临时、`304 Not Modified`（缓存命中）、`307` 临时（保留方法） |
| **4xx** | **客户端错** | `400`、`401`、`403`、`404`、`405`、`409`、`415`、`422`、`429` |
| **5xx** | **服务端错** | `500`、`503` |

**一条判断原则**：

> **4xx 是"你的请求有问题，改了再来"；5xx 是"我的服务器有问题，请求本身没错"。**
>
> **分不清时，问自己：同样是这个请求，换一个合法的客户端发，会不会成功？会 → 4xx。不会 → 5xx。**

## 6. URL 设计军规（这一段是 P107 最实用的部分）

### 军规 1：用名词，不用动词

```
✅ GET    /api/books
❌ GET    /api/getBooks
✅ DELETE /api/books/5
❌ GET    /api/deleteBook?id=5        ← 更糟：用 GET 做删除
```

### 军规 2：集合用复数

```
✅ /api/books        （集合）
✅ /api/books/5      （单个）
❌ /api/book/5
```

**为什么不统一用单数？** 因为 `/api/books/5` 读起来是"books 里面 id=5 那个"，语义连贯。`/api/book/5` 的 `book` 是类型名，不是集合名。

### 军规 3：层级表达归属

```
GET /api/authors/3/books          作者 3 的所有书
GET /api/books/5/chapters         书 5 的所有章节
GET /api/books/5/chapters/2       书 5 的第 2 章
```

**层级深度控制在 2 层以内**。`/api/authors/3/books/5/chapters/2/paragraphs/7` —— 这种 URL 谁也记不住，**改用扁平资源 + 查询串**：

```
✅ /api/chapters/2?include=paragraphs
```

### 军规 4：动词留给 HTTP，不留给 URL

| 你想做的 | 别写 | 应该写 |
|---|---|---|
| 查询 | `/api/getBooks` | `GET /api/books` |
| 新增 | `/api/addBook` | `POST /api/books` |
| 修改 | `/api/updateBook` | `PUT /api/books/5` |
| 删除 | `/api/deleteBook` | `DELETE /api/books/5` |
| 搜索 | `/api/searchBooks` | `GET /api/books?keyword=xxx` |

### 军规 5：非 CRUD 的操作怎么办（这是最常被问的）

有些操作确实没有"资源"可指：登录、下单、转账、发布、审核。**三种处理办法**：

| 办法 | 写法 | 适用 |
|---|---|---|
| **① 当成"子资源"** | `POST /api/books/5/publish` | 状态转移（发布/上架/归档），最推荐 |
| **② 当成"新资源"** | `POST /api/orders`（下单 = 创建订单资源） | 动作本身就是创建 |
| **③ 当成"控制器"** | `POST /api/sessions`（登录 = 创建会话） | 会话/令牌 |
| **④ 用 `:action` 后缀**（Google AIP 风格） | `POST /api/books/5:publish` | 业界流行，但非标准 |

```csharp
// 登录：创建"会话"资源
[HttpPost("api/sessions")]
public IActionResult Login([FromBody] LoginRequest req) => Ok(new { token = ... });

// 发布一本书：书的状态转移，当成子资源
[HttpPost("api/books/{id:long}/publish")]
public IActionResult Publish(long id) { ... return NoContent(); }

// 下单：创建订单资源
[HttpPost("api/orders")]
public IActionResult PlaceOrder([FromBody] PlaceOrderRequest req) => ...;
```

> **一个诚实的分界线**：`GET /api/books/5/publish` 是错的（GET 不能改状态）；`POST /api/books/5/publish` 是可接受的（很多公司这么写）。**只要不用 GET 做修改，动词出现在子资源位置是可以商量的。**

### 军规 6：过滤、排序、分页全走查询串

```
GET /api/books?keyword=核心&categoryId=2&minPrice=10&maxPrice=100
              &sort=price&order=desc&page=2&size=20
```

**不要**做 `/api/books/category/2/page/2` 这种层级堆叠——**它是路径和查询的混用，改一个条件就要改路由**。

### 军规 7：版本号（知道有两种风格即可）

```
① URL 版本：  /api/v1/books        ← 直观，最常用
② Header 版本：Accept: application/vnd.myapp.v1+json   ← 更"纯"，但难调试
```

**你的项目用不着版本号**（没有外部消费者）。但只要接口要给别人用，**第一版就加 `/v1`**——后面想加就来不及了。

---

# P108　REST 的优缺点

**一句话：REST 赢在"标准化带来的通用性"，输在"表达力不足"——它把复杂操作压进简单的资源模型，压不进去的部分就成了痛点。**

## 1. 优点（但要说得具体，别说"简单易用"）

| 优点 | 具体是什么 | 对你意味着什么 |
|---|---|---|
| **通用性** | 任何语言、任何平台都能调 HTTP | 前端 Vue、移动端、第三方系统、Postman 全都能测 |
| **无状态 → 易扩展** | 加机器就完事，不用同步会话 | 以后上 Docker/K8s 水平扩容几乎零改造 |
| **可利用 HTTP 基础设施** | 缓存、压缩、CDN、重试、代理、限流全部现成 | 一个 `Cache-Control` 头就能省掉大量数据库压力 |
| **自描述** | 动词 + 状态码 + `Content-Type` 自带语义 | 前端不用看文档也知道"404 是没找到" |
| **工具链成熟** | OpenAPI、Swagger、Postman、各种代码生成器 | 接口写完，前端 SDK 能自动生成 |
| **可缓存（GET）** | 代理/CDN/浏览器三层缓存 | 读多写少的接口性能免费提升 |

## 2. 缺点（这一节比优点重要，网上很少讲清）

### 缺点一：过度获取 / 获取不足（Over-fetching / Under-fetching）

**过度获取**：`GET /api/books` 返回 30 个字段，前端只需要 `id` 和 `title`。

```json
[{ "id":1, "title":"C# 入门", "price":59.9, "pubTime":"...", "authorId":3,
   "reviewerId":null, "categoryId":2, "isbn":"...", "pages":320, "stock":12 }]
```

1000 本书 × 30 字段 = 传输浪费，移动端流量和解析时间都是成本。

**获取不足**：详情页要书 + 作者 + 分类，REST 只能调三次（或者写一个专门的聚合端点）。

```js
const book = await fetch('/api/books/5')
const author = await fetch(`/api/authors/${book.authorId}`)
const category = await fetch(`/api/categories/${book.categoryId}`)
// 三次往返，第一次的结果才能决定后两次
```

**GraphQL 就是为这个而生的**：一次请求，客户端指定要哪些字段。

```graphql
{ book(id: 5) { title author { name } category { name } } }
```

### 缺点二：多次往返带来的延迟

每次 HTTP 请求都有 RTT（往返时间）。同机房约 1ms，跨地域约 50–200ms。

**一个页面要 10 个接口 → 串行 10 次 → 移动网络下 2 秒起步。**

REST 的补丁是"聚合端点"（`GET /api/books/5/detail` 一次返回全部），但**每加一种组合就要加一个端点**，端点数量爆炸。

### 缺点三：批量操作很别扭

假设要"一次删除 100 本书"：

| 方案 | 写法 | 问题 |
|---|---|---|
| 循环调 100 次 | `DELETE /api/books/1` … ×100 | 100 次网络往返 |
| 查询串传数组 | `DELETE /api/books?ids=1,2,3,...` | **`DELETE` 带 body/长查询串语义模糊**，部分代理会截断 |
| 改成 POST | `POST /api/books/batch-delete` | **违反"URL 无动词"** |
| 改成子资源 | `POST /api/books/batch-deletion` | 略好，但仍然别扭 |

**实务上大家都这么干**：

```csharp
[HttpPost("batch-delete")]     // 或 DELETE + [FromBody]
public IActionResult BatchDelete([FromBody] long[] ids) { ... }
```

**这不是"不 REST"，是"REST 覆盖不到的场景，按工程实用主义处理"。**

### 缺点四：事务性操作难以表达

"下单"要：扣库存 → 生成订单 → 扣余额 → 发通知。**这是四个资源的联动，不是"一个资源的状态转移"。**

REST 模型的回答是"这是 `POST /api/orders`，服务端内部做事务"。**可以，但 URL 里看不出"这会改库存和余额"**——客户端调用时不知道副作用范围。

### 缺点五：动词表达力只有四个半

真实业务里需要区分的语义远比 CRUD 多：

| 业务动作 | CRUD 能表达吗 |
|---|---|
| 上架 / 下架 | 只能用 `PUT` 改 `status` 字段 |
| 审批通过 / 驳回 | 只能 `POST /approve` 或 `PUT` 改状态 |
| 冻结 / 解冻 | 同上 |
| 合并两个用户 | 无法表达 |
| 回滚到上一版本 | 无法表达 |

**结果：所有业务动作都被压成"改字段"，语义丢失。** 这就是 DDD（Part6）要解决的问题——**用例（Use Case）比资源更贴近业务**。

### 缺点六：无状态的代价——每次都要认证

每个请求都要验证 token（解析 JWT 或查库）。**高频接口上这是实打实的开销**，所以才有"token 缓存""会话网关"这些补丁。

## 3. 横向对比：REST vs gRPC vs GraphQL

| 维度 | REST | gRPC | GraphQL |
|---|---|---|---|
| 传输 | HTTP/1.1 + JSON（文本） | HTTP/2 + Protobuf（二进制） | HTTP + JSON |
| 性能 | 中 | **高**（体积小 3–10 倍） | 中（可减少往返） |
| 契约 | OpenAPI（可选） | **`.proto` 强契约**（必选） | Schema（强契约） |
| 浏览器支持 | 原生 | **需要 grpc-web 代理** | 原生 |
| 学习成本 | 低 | 中高 | 中 |
| 过度获取 | 严重 | 无（按需定义消息） | **无（客户端指定字段）** |
| 缓存 | **好**（HTTP 缓存直接可用） | 差 | 差（全是 POST） |
| 典型场景 | **对外 API、前后端分离** | **内部微服务高频调用** | 移动端/BFF、聚合多个服务 |

**判断口诀**：

```
对外给人用 → REST（通用、好调试）
内部机器间 → gRPC（快、强类型）
前端要灵活 → GraphQL（一次拿够）
```

## 4. 什么时候不该用 REST（四条判断）

| 场景 | 为什么 | 用什么 |
|---|---|---|
| 实时双向通信（聊天、协同、游戏） | REST 是请求-响应，服务端不能主动推 | WebSocket / SignalR |
| 内部服务间调用（QPS 上万） | JSON 文本 + HTTP/1.1 头开销大 | gRPC |
| 客户端需求千变万化（多端复用同一后端） | 端点组合爆炸 | GraphQL / BFF |
| 文件流、视频、大二进制 | 不适合塞进 JSON 资源模型 | 直传对象存储（预签名 URL） |

> **对你的判断**：你的图书管理系统是**标准 REST 场景**（以资源为中心、接口数量有限、前端固定）。**老老实实按 REST 写，不要过度设计。**

---

# P109　Restful 中如何传递参数

**一句话：参数的位置由"它的角色"决定——标识资源的进路径，描述条件的进查询串，构成内容的进 body，描述请求的进 header。**

## 1. 四位置决策表（这张表值得贴在屏幕上）

| 参数的角色 | 位置 | 例子 | 为什么 |
|---|---|---|---|
| **标识哪个资源** | 路径 | `/api/books/5` | URL 就是资源地址，标识必须在地址里 |
| **筛选/分页/排序** | 查询串 | `?keyword=x&page=1&size=10` | 它们是"同一资源的视图参数"，不是资源本身 |
| **要写入的内容** | body | `{"title":"x"}` | 数据量大、结构复杂、不该出现在日志/URL 历史里 |
| **请求的元信息** | header | `Authorization`、`Accept-Language` | 与资源无关，是"关于请求本身"的信息 |
| **文件** | form-data | `[FromForm] IFormFile` | 二进制不走 JSON |

### 三个反例（看看错在哪）

```csharp
❌ GET /api/books?id=5                    // id 是资源标识，应该在路径
❌ POST /api/books?title=xx&price=30      // 内容放查询串：中文要编码、日志泄露、长度受限
❌ GET /api/books/5  body: {"fields":...} // GET 带 body：语义未定义，部分代理会丢掉
```

## 2. 查询串的六种传参方式（含 .NET 的绑定写法）

### ① 简单类型：直接按名字绑

```csharp
// GET /api/books?keyword=核心&page=2&size=20
[HttpGet]
public ActionResult Search(string? keyword, int page = 1, int size = 20)
```

**注意**：

- `int page = 1` 的默认值在**没传时生效**（不是 0）
- **类型不匹配会怎样**：`?page=abc` → 绑定失败 → `page` 用默认值（不报错）**除非**加了 `[Required]` 或用了 `[Range]`

### ② 可空类型：区分"没传"和"传了空"

```csharp
// ?minPrice=&maxPrice=50   ← minPrice 传了空字符串
public ActionResult Search(double? minPrice, double? maxPrice)
// minPrice == null（空字符串绑到 double? 也是 null）
```

**这是最容易踩的坑**：你无法区分"前端没传"和"前端传了空"。**要区分就得用 string 接，再自己解析。**

### ③ 数组 / 集合：两种格式都能绑

```csharp
// 格式 A：重复键   ?ids=1&ids=2&ids=3
// 格式 B：逗号分隔 ?ids=1,2,3
[HttpGet("batch")]
public ActionResult Batch([FromQuery] long[] ids)
```

| 格式 | .NET 默认支持 | 备注 |
|---|---|---|
| `?ids=1&ids=2` | ✅ 支持 | **推荐**，标准做法 |
| `?ids=1,2,3` | ❌ **默认不支持**（会得到 `["1,2,3"]` 转换失败或单元素） | 需要自定义 model binder |

```csharp
// 想支持逗号分隔，写个 binder（约 20 行，P113 会给完整版）
public class CommaSeparatedArrayBinder : IModelBinder { ... }
// 用：[ModelBinder(BinderType = typeof(CommaSeparatedArrayBinder))] long[] ids
```

> **前端注意**：JS 用 `URLSearchParams` 时，`params.append('ids', 1)` 多次才是格式 A。
> `axios.get(url, { params: { ids: [1,2,3] } })` 默认生成 `ids[]=1&ids[]=2`（**带方括号**）→ **绑不上！**
> 要配 `paramsSerializer`。**这个坑我在前后端分离那批（P114–P116）会再提一次。**

### ④ 复杂对象作为查询条件：`[FromQuery]` 整个对象

```csharp
public record BookQuery(string? Keyword, long? CategoryId, double? MinPrice,
                        double? MaxPrice, int Page = 1, int Size = 20);

// GET /api/books?keyword=核心&categoryId=2&minPrice=10&page=2
[HttpGet]
public ActionResult Search([FromQuery] BookQuery q)
```

**这会自动把查询串按属性名映射到对象上**。这是**推荐做法**——参数一多，方法签名会爆炸。

### ⑤ 日期和枚举

```csharp
// 日期：必须 ISO 8601，否则绑定失败
// ✅ ?from=2026-01-01  ✅ ?from=2026-01-01T00:00:00
// ❌ ?from=2026/1/1   ❌ ?from=01-01-2026
public ActionResult Search(DateTime? from)

// 枚举：默认接受名字（不区分大小写）或数字
// ✅ ?status=Published   ✅ ?status=1
public ActionResult Search(BookStatus? status)

// ⚠️ 如果启用了 JsonStringEnumConverter，body 里也要用字符串
```

### ⑥ 布尔值

```
?onlyAvailable=true    ✅
?onlyAvailable=1       ✅
?onlyAvailable=TRUE    ✅（不区分大小写）
?onlyAvailable=yes     ❌（绑不上，用默认值）
```

## 3. body 传参的规则（比查询串严格）

| 规则 | 说明 |
|---|---|
| **一个 Action 只能一个 `[FromBody]`** | 请求体是一条流，读一次就没了 |
| **必须 `Content-Type: application/json`** | 否则 415 |
| **嵌套对象要能对上 JSON 结构** | 用 `record` 定义清晰的结构 |
| **`[ApiController]` 下复杂类型自动走 body** | 不用写 `[FromBody]`（但建议写，明确） |
| **循环引用会炸** | 别直接返回 EF 实体，用 DTO |

## 4. 复杂查询怎么表达（这是 P109 最难的部分）

### 场景一：多条件筛选（最常见）

```
GET /api/books?keyword=核心&categoryId=2&minPrice=10&maxPrice=100
              &pubFrom=2025-01-01&onlyAvailable=true&sort=price&order=desc&page=2&size=20
```

**能用查询串就用查询串**。这是最 REST 的做法。

### 场景二：筛选条件太多，查询串超长（>2000 字符）

真到了这一步（比如"高级搜索"有 30 个条件），**业界有两种做法**：

| 做法 | 写法 | 评价 |
|---|---|---|
| **A. POST 一个"查询对象"** | `POST /api/books/search` body: `{filters:[...]}` | **事实标准**（Elasticsearch 就这么干）。但违反"URL 无动词" |
| **B. 把查询当资源** | `POST /api/book-queries` → 返回 `{queryId}`，再 `GET /api/book-queries/{id}/results` | 纯 REST，但对前端太麻烦，几乎没人做 |

> **实务结论**：**查询条件超过 8 个、或含嵌套逻辑（AND/OR 组合），就用 `POST /api/books/search`。** 这不是"不懂 REST"，是"REST 不适合极端复杂查询"（P108 的缺点一）。
>
> **注意**：`POST /search` 必须是**只读**的（不产生副作用），并且要在文档里说明"这是查询，不是创建"。

### 场景三：字段选择（解决过度获取）

```
GET /api/books?fields=id,title,price
```

**部分实现就行**，不必强求。前端真需要精细控制，就该上 GraphQL 了。

### 场景四：关联数据（解决获取不足）

```
GET /api/books/5?include=author,category
GET /api/books?include=author
```

`include` 用逗号分隔，实现时按名字查表加载（EF Core 的 `Include`）。

## 5. 一个完整的参数设计示例（图书管理系统版）

```csharp
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    // ① 列表 + 筛选 + 分页 + 排序：全走查询串
    // GET /api/books?keyword=核心&categoryId=2&minPrice=10&page=1&size=20&sort=price&order=desc
    [HttpGet]
    public ActionResult<PagedResult<BookDto>> List([FromQuery] BookQuery q) { ... }

    // ② 单条：标识走路径
    // GET /api/books/5
    [HttpGet("{id:long}")]
    public ActionResult<BookDto> Get(long id) { ... }

    // ③ 创建：内容走 body
    // POST /api/books
    [HttpPost]
    public ActionResult<BookDto> Create([FromBody] CreateBookRequest req) { ... }

    // ④ 整体更新：标识走路径 + 内容走 body
    // PUT /api/books/5
    [HttpPut("{id:long}")]
    public ActionResult Update(long id, [FromBody] UpdateBookRequest req) { ... }

    // ⑤ 删除：只有标识
    // DELETE /api/books/5
    [HttpDelete("{id:long}")]
    public ActionResult Delete(long id) { ... }

    // ⑥ 批量删除：body 传数组（唯一的例外）
    // POST /api/books/batch-delete
    [HttpPost("batch-delete")]
    public ActionResult BatchDelete([FromBody] long[] ids) { ... }

    // ⑦ 复杂搜索：条件太多，用 POST + body
    // POST /api/books/search
    [HttpPost("search")]
    public ActionResult<PagedResult<BookDto>> Search([FromBody] BookSearchRequest req) { ... }

    // ⑧ 状态转移：子资源
    // POST /api/books/5/publish
    [HttpPost("{id:long}/publish")]
    public ActionResult Publish(long id) { ... }
}
```

## 6. URL 编码：中文和特殊字符

**URL 里不能直接出现中文、空格、`&`、`?`、`#` 等字符**，必须 percent-encoding。

```
关键词「核心」 → %E6%A0%B8%E5%BF%83
GET /api/books?keyword=%E6%A0%B8%E5%BF%83
```

| 客户端 | 会不会自动编码 |
|---|---|
| 浏览器地址栏 | ✅ 自动 |
| `fetch('/api/books?keyword=' + kw)` | ❌ **不会**，`&` 会截断 |
| `fetch('/api/books?' + new URLSearchParams({keyword: kw}))` | ✅ 会 |
| `encodeURIComponent(kw)` | ✅ 会 |
| `.http` 文件 | 建议手写编码，或直接写中文（VS 会编码） |

> **经典 bug**：关键词里带 `&`（比如搜 "C# & .NET"），没编码 → 后端只收到 "C# "，后半截被当成新参数。**前端一律用 `URLSearchParams`。**

---
==二：格式==

## P105 · WebAPI 项目骨架

```bash
dotnet new webapi -controllers -n BookApi     # 带 Controller
dotnet new webapi -n BookApiMin               # Minimal API（默认）
```

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();            // 只注册 API
builder.Services.AddOpenApi();                // .NET 9+ 内置
var app = builder.Build();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

## P105 · 一个接口的最小骨架

```csharp
[ApiController]                          // 参数推断 / 自动 400 / 强制特性路由
[Route("api/[controller]")]              // → api/Books
public class BooksController : ControllerBase
{
    [HttpGet]                            // GET api/books
    public ActionResult<IEnumerable<BookDto>> GetAll() => ...;

    [HttpGet("{id:long}")]               // GET api/books/5
    public ActionResult<BookDto> GetById(long id) => ...;
}
```

## P106 · CRUD 五件套（动词 + 路径 + 常规状态码）

```csharp
[HttpGet]                     // GET    api/books        → 200
[HttpGet("{id:long}")]        // GET    api/books/5      → 200 / 404
[HttpPost]                    // POST   api/books        → 201 + Location
[HttpPut("{id:long}")]        // PUT    api/books/5      → 204 / 404
[HttpDelete("{id:long}")]     // DELETE api/books/5      → 204 / 404
```

## P107 · HTTP 动词语义表

```
GET     安全 ✅  幂等 ✅   → 读
POST    安全 ❌  幂等 ❌   → 创建 / 非幂等操作
PUT     安全 ❌  幂等 ✅   → 整体替换
PATCH   安全 ❌  幂等 ❌   → 部分更新
DELETE  安全 ❌  幂等 ✅   → 删除
```

## P107 · URL 设计模板

```
集合：      /api/books
单个：      /api/books/{id}
子资源：    /api/books/{id}/chapters
嵌套集合：  /api/authors/{id}/books
状态转移：  POST /api/books/{id}/publish
筛选分页：  /api/books?keyword=&page=&size=&sort=&order=
版本：      /api/v1/books
```

## P109 · 参数位置决策

```
资源标识 → 路径      [FromRoute]  long id
筛选条件 → 查询串    [FromQuery]  BookQuery q
写入内容 → body      [FromBody]   CreateBookRequest req
元信息   → header    [FromHeader(Name="X-Trace-Id")] string? tid
文件     → form      [FromForm]   IFormFile file
服务     → DI        [FromServices] ILogger<T> logger
```

## P109 · 复杂查询对象

```csharp
public record BookQuery(
    string? Keyword = null,
    long? CategoryId = null,
    double? MinPrice = null,
    double? MaxPrice = null,
    bool? OnlyAvailable = null,
    string Sort = "id",
    string Order = "asc",
    int Page = 1,
    int Size = 20);

[HttpGet]
public ActionResult Search([FromQuery] BookQuery q)
```

---

==三：代码==

## 3.0 先看反例：你可能正在这么写

```csharp
// ❌ Controllers/BadBooksController.cs —— 能跑，但全是问题
[ApiController]
[Route("api/[controller]")]
public class BadBooksController : ControllerBase
{
    [HttpGet("getBooks")]                       // 动词进 URL → 破坏缓存语义
    public IActionResult GetBooks() => Ok(_books);

    [HttpGet("getBookById")]                    // id 走查询串，不是路径
    public IActionResult GetBookById(long id) => Ok(_books.FirstOrDefault(b => b.Id == id));

    [HttpPost("addBook")]                       // 创建没返回 201 + Location
    public IActionResult AddBook(BookDto dto) { _books.Add(dto); return Ok(true); }

    [HttpGet("deleteBook")]                     // ☠️ 用 GET 做删除：爬虫/预取会误删！
    public IActionResult DeleteBook(long id) { _books.RemoveAll(b => b.Id == id); return Ok(); }

    [HttpPost("updateBook")]                    // 用 POST 做更新：不幂等，无法安全重试
    public IActionResult UpdateBook(BookDto dto) { ... return Ok(new { success = true }); }

    [HttpGet("searchBooks")]                    // 搜索动词进 URL
    public IActionResult Search(string kw) => Ok(_books.Where(b => b.Title.Contains(kw)));
}
```

**这六个接口逐条对照错在哪**：

| # | 写法 | 错误 | 后果 |
|---|---|---|---|
| 1 | `GET /api/badbooks/getBooks` | 动词进 URL | 无法按"资源 + 动词"统计、无法生成 SDK、缓存规则无从下手 |
| 2 | `GET /api/badbooks/getBookById?id=5` | 标识不在路径 | 无法用 `404` 表达"不存在"（路径永远匹配），只能返回 `200 + null` |
| 3 | `POST /api/badbooks/addBook` → `Ok(true)` | 状态码错、无 `Location` | 前端拿不到新资源地址，只能再查一次 |
| 4 | **`GET /api/badbooks/deleteBook?id=5`** | **GET 产生副作用** | **灾难级**：浏览器预取、爬虫、代理重试都会触发删除 |
| 5 | `POST /api/badbooks/updateBook` | 非幂等 | 网络超时重试 → 可能重复执行业务逻辑 |
| 6 | `GET /api/badbooks/searchBooks` | 动词进 URL | 同上 |

> **第 4 条要单独记住**：**任何会改变服务端状态的操作，绝对不能用 `GET`。** 这不是风格问题，是安全问题。HTTP 规范里 `GET` 是"安全方法"，全世界的基层设施（浏览器预加载、CDN 预取、杀毒软件链接扫描）都会"放心地"发 `GET` 请求。

## 3.1 正例：完整的 RESTful 实现

```csharp
// Controllers/BooksController.cs
using Microsoft.AspNetCore.Mvc;

namespace BookApi.Controllers;

// ── 出参 DTO
public record BookDto(long Id, string Title, double Price, DateTime PubTime, bool IsPublished);

// ── 入参 DTO（和出参分开定义，防止客户端伪造 Id）
public record CreateBookRequest(string Title, double Price, DateTime PubTime);
public record UpdateBookRequest(string Title, double Price, DateTime PubTime);

// ── 查询对象（放在 query 上）
public record BookQuery(
    string? Keyword = null,
    double? MinPrice = null,
    double? MaxPrice = null,
    bool? OnlyPublished = null,
    string Sort = "id",
    string Order = "asc",
    int Page = 1,
    int Size = 10);

// ── 分页结果（前后端约定的统一结构）
public record PagedResult<T>(int Total, int Page, int Size, IReadOnlyList<T> Items);

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    // 演示数据
    private static readonly List<BookDto> _books =
    [
        new(1, "C# 入门", 59.9,  new DateTime(2024, 1, 1),  true),
        new(2, "EF Core 深入", 89.0, new DateTime(2025, 3, 15), true),
        new(3, "ASP.NET Core 实战", 99.0, new DateTime(2026, 6, 1), false),
        new(4, "算法图解", 45.0, new DateTime(2023, 8, 20), true),
        new(5, "数据库系统概念", 128.0, new DateTime(2022, 3, 1), false),
    ];
    private static long _nextId = 6;

    // ══════════ ① 列表：筛选 + 排序 + 分页全走查询串 ══════════
    // GET /api/books?keyword=核心&minPrice=50&onlyPublished=true&sort=price&order=desc&page=1&size=2
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<BookDto>), StatusCodes.Status200OK)]
    public ActionResult<PagedResult<BookDto>> List([FromQuery] BookQuery q)
    {
        IEnumerable<BookDto> query = _books;

        if (!string.IsNullOrWhiteSpace(q.Keyword))
            query = query.Where(b => b.Title.Contains(q.Keyword, StringComparison.OrdinalIgnoreCase));

        if (q.MinPrice is not null) query = query.Where(b => b.Price >= q.MinPrice);
        if (q.MaxPrice is not null) query = query.Where(b => b.Price <= q.MaxPrice);
        if (q.OnlyPublished is true) query = query.Where(b => b.IsPublished);

        // 排序：白名单，禁止客户端传任意字符串（防异常 + 减少注入面）
        query = (q.Sort.ToLower(), q.Order.ToLower()) switch
        {
            ("price", "desc")   => query.OrderByDescending(b => b.Price),
            ("price", _)        => query.OrderBy(b => b.Price),
            ("pubtime", "desc") => query.OrderByDescending(b => b.PubTime),
            ("pubtime", _)      => query.OrderBy(b => b.PubTime),
            (_, "desc")         => query.OrderByDescending(b => b.Id),
            _                   => query.OrderBy(b => b.Id),
        };

        var total = query.Count();
        var size = Math.Clamp(q.Size, 1, 100);          // 上限保护，防 ?size=1000000
        var page = Math.Max(q.Page, 1);
        var items = query.Skip((page - 1) * size).Take(size).ToList();

        return Ok(new PagedResult<BookDto>(total, page, size, items));
    }

    // ══════════ ② 单条 ══════════
    // GET /api/books/2
    [HttpGet("{id:long}")]
    public ActionResult<BookDto> Get(long id)
    {
        var book = _books.FirstOrDefault(b => b.Id == id);
        if (book is null) return NotFound(new { message = $"图书 {id} 不存在" });
        return book;
    }

    // ══════════ ③ 创建 ══════════
    // POST /api/books   body: {"title":"新书","price":30,"pubTime":"2026-01-01"}
    [HttpPost]
    public ActionResult<BookDto> Create([FromBody] CreateBookRequest req)
    {
        var book = new BookDto(_nextId++, req.Title, req.Price, req.PubTime, false);
        _books.Add(book);
        // 201 + Location: /api/books/6  ← Location 由 Get 的路由模板生成
        return CreatedAtAction(nameof(Get), new { id = book.Id }, book);
    }

    // ══════════ ④ 整体替换 ══════════
    // PUT /api/books/2   body: {"title":"新名","price":88,"pubTime":"2025-01-01"}
    [HttpPut("{id:long}")]
    public ActionResult Replace(long id, [FromBody] UpdateBookRequest req)
    {
        var index = _books.FindIndex(b => b.Id == id);
        if (index < 0) return NotFound();

        // PUT 语义：整体替换。没传的字段回到默认值
        _books[index] = new BookDto(id, req.Title, req.Price, req.PubTime, _books[index].IsPublished);
        return NoContent();                                  // 204：成功，无 body
    }

    // ══════════ ⑤ 删除 ══════════
    // DELETE /api/books/2
    [HttpDelete("{id:long}")]
    public ActionResult Delete(long id)
    {
        var removed = _books.RemoveAll(b => b.Id == id);
        return removed == 0 ? NotFound() : NoContent();
    }

    // ══════════ ⑥ 状态转移：当子资源 ══════════
    // POST /api/books/3/publish   ← 用 POST 因为它是业务动作，不是"改字段"
    [HttpPost("{id:long}/publish")]
    public ActionResult Publish(long id)
    {
        var index = _books.FindIndex(b => b.Id == id);
        if (index < 0) return NotFound();
        if (_books[index].IsPublished) return Conflict(new { message = "已发布，无需重复操作" });

        _books[index] = _books[index] with { IsPublished = true };
        return NoContent();
    }

    // ══════════ ⑦ 批量删除：REST 覆盖不到，实用主义 ══════════
    // POST /api/books/batch-delete   body: [1,2,3]
    [HttpPost("batch-delete")]
    public ActionResult BatchDelete([FromBody] long[] ids)
    {
        if (ids.Length == 0) return BadRequest(new { message = "ids 不能为空" });
        var count = _books.RemoveAll(b => ids.Contains(b.Id));
        return Ok(new { deleted = count, requested = ids.Length });
    }

    // ══════════ ⑧ 复杂搜索：条件太多，POST + body ══════════
    // POST /api/books/search  body: {"keyword":"core"}
    [HttpPost("search")]
    public ActionResult<IEnumerable<BookDto>> Search([FromBody] BookSearchRequest req)
    {
        // 只读操作，不产生副作用；POST 只是为了能塞复杂的 body
        var result = _books.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(req.Keyword))
            result = result.Where(b => b.Title.Contains(req.Keyword, StringComparison.OrdinalIgnoreCase));
        return Ok(result.ToList());
    }
}

public record BookSearchRequest(string? Keyword, List<RangeFilter>? Ranges = null);
public record RangeFilter(string Field, double? Min, double? Max);
```

## 3.2 `.http` 逐个验证（每个都对应一个 REST 语义点）

```http
@host = http://localhost:5003

### ① 列表 + 筛选 + 排序 + 分页  → 200 + PagedResult
GET {{host}}/api/books?keyword=核心&sort=price&order=desc&page=1&size=2

### ①b size 超限（防护生效，被 clamp 到 100）
GET {{host}}/api/books?size=99999

### ② 单条 → 200
GET {{host}}/api/books/2

### ②b 不存在 → 404 + message
GET {{host}}/api/books/999

### ③ 创建 → 201 + Location: /api/books/6
POST {{host}}/api/books
Content-Type: application/json

{"title":"新建的书","price":30,"pubTime":"2026-01-01T00:00:00"}

### ③b 缺 Content-Type → 415（手动去掉下面那行试试）
POST {{host}}/api/books
Content-Type: application/json

{"title":"x","price":1,"pubTime":"2026-01-01T00:00:00"}

### ③c 空 title → 400（需先给 record 加 [property: Required]，见 3.3）
POST {{host}}/api/books
Content-Type: application/json

{"title":"","price":-5,"pubTime":"2026-01-01T00:00:00"}

### ④ 整体替换 → 204
PUT {{host}}/api/books/2
Content-Type: application/json

{"title":"改过的书名","price":88.8,"pubTime":"2025-05-05T00:00:00"}

### ⑤ 删除 → 204
DELETE {{host}}/api/books/4

### ⑤b 再删一次 → 404（证明 DELETE 幂等：资源状态不变，但响应码变了）
DELETE {{host}}/api/books/4

### ⑥ 状态转移 → 204
POST {{host}}/api/books/3/publish

### ⑥b 重复发布 → 409 Conflict
POST {{host}}/api/books/3/publish

### ⑦ 批量删除 → 200 + {deleted,requested}
POST {{host}}/api/books/batch-delete
Content-Type: application/json

[1,2]

### ⑧ 复杂搜索 → 200
POST {{host}}/api/books/search
Content-Type: application/json

{"keyword":"core"}

### ✘ 错误示范：用 GET 调 POST 接口 → 405（响应头有 Allow: POST）
GET {{host}}/api/books/batch-delete
```

## 3.3 三个状态码的亲手复现（比记住概念有用）

### 复现 405 Method Not Allowed

```http
# 接口是 [HttpPost]，这里用 GET
GET {{host}}/api/books/batch-delete
```

响应：

```
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

**`Allow` 头告诉你"这个路径只接受 POST"**——排查 405 最快的线索。

### 复现 415 Unsupported Media Type

```http
POST {{host}}/api/books
# 故意不写 Content-Type: application/json

{"title":"x","price":1,"pubTime":"2026-01-01T00:00:00"}
```

响应：

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.16",
  "title": "Unsupported Media Type",
  "status": 415,
  "detail": "Expected a supported JSON media type but got \"text/plain\"."
}
```

### 复现 400 + ValidationProblemDetails

先给 DTO 加验证特性：

```csharp
public record CreateBookRequest(
    [property: Required, StringLength(100, MinimumLength = 1)] string Title,
    [property: Range(0.01, 9999)] double Price,
    DateTime PubTime);
```

```http
POST {{host}}/api/books
Content-Type: application/json

{"title":"","price":-5,"pubTime":"2026-01-01T00:00:00"}
```

响应（**注意：这是你一行 `if` 都没写就自动得到的**）：

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Title": ["The Title field is required."],
    "Price": ["The field Price must be between 0.01 and 9999."]
  }
}
```

> **`[property: Required]` 里的 `property:` 是什么？**
> record 的构造参数上直接写 `[Required]` 会标到**参数**上，而不是**属性**上，模型验证不认。
> `property:` 是"目标说明符"（target specifier），意思是"把这个特性标到生成的属性上"。
> **record + 验证特性必须写 `[property: ...]`，这是最容易忘的一条。**

## 3.4 对照检查：把你的项目改一遍

| 你现在的接口 | 问题 | 改成 |
|---|---|---|
| `GET /api/books` | 已对 | — |
| `GET /api/books/{id}` | 缺约束 | `{id:long}` |
| `POST /api/books` 返回 `Ok(book)` | 状态码错 | `CreatedAtAction(nameof(Get), new { id }, book)` |
| `PUT /api/books` 走 body 传 id | 标识在 body | `PUT /api/books/{id}` + body 只放内容 |
| `GET /api/query/books?...` | 路径带 `query` 前缀 | `GET /api/books?...`（筛选走查询串，不必另开控制器） |
| `GET /api/query/stats/by-category` | 派生资源，**可接受** | 保留，也可优化成 `GET /api/books/stats?groupBy=category` |
| `POST /api/books/bulk-slow` | 动词在 URL | `POST /api/books/bulk` + body 里带 `mode:"slow"`；或保留但明确标注是压测接口 |
| `POST /api/books/seed-relations` | 运维操作当业务 API | 移到开发环境专用端点，或改成命令行 seed |

---

==四：总结==

## 4.1 五节核心结论

| # | 结论 | 一句话 |
|---|---|---|
| 1 | **WebAPI = 只返回数据的 Controller** | 差别只有三处：继承 `ControllerBase`、注册 `AddControllers()`、返回对象而非 `View()` |
| 2 | **REST 是"资源 + 动词 + 状态码"的三元组** | URL 说"操作什么"，动词说"怎么操作"，状态码说"结果如何" |
| 3 | **REST 六条约束里，无状态最值钱** | 因为它让"加机器"变成扩容的唯一动作 |
| 4 | **REST 有四个硬伤**：过度获取、多次往返、批量别扭、事务难表达 | 所以才有 GraphQL 和 gRPC，不是 REST 过时了 |
| 5 | **参数位置由角色决定** | 标识进路径、条件进查询、内容进 body、元信息进 header |

## 4.2 动词 + 语义 + 状态码总表（面试直接用）

| 动作 | 动词 | 路径 | 成功码 | 失败码 | 幂等 |
|---|---|---|---|---|---|
| 查列表 | `GET` | `/api/books` | 200 | — | ✅ |
| 查单条 | `GET` | `/api/books/5` | 200 | 404 | ✅ |
| 新建 | `POST` | `/api/books` | **201 + Location** | 400 / 409 | ❌ |
| 整体替换 | `PUT` | `/api/books/5` | 204（或 200） | 404 / 400 | ✅ |
| 部分更新 | `PATCH` | `/api/books/5` | 204 | 404 / 400 | ❌ |
| 删除 | `DELETE` | `/api/books/5` | 204 | 404 | ✅ |
| 业务动作 | `POST` | `/api/books/5/publish` | 204 / 200 | 409 | ❌ |
| 复杂查询 | `POST` | `/api/books/search` | 200 | 400 | ✅（只读） |

## 4.3 URL 设计十条军规

```
1. 用名词，不用动词            /api/books     ✅    /api/getBooks   ❌
2. 集合用复数                  /api/books     ✅    /api/book       ❌
3. 标识放路径                  /api/books/5   ✅    ?id=5           ❌
4. 归属用层级（≤2 层）          /api/authors/3/books
5. 筛选/分页/排序全走查询串     ?page=2&size=10&sort=price
6. 状态转移放子资源 + POST      POST /api/books/5/publish
7. 不用 GET 做任何修改          ☠️ 灾难级错误
8. 版本号放在 /api/v1 之后      第一版就加，别等以后
9. 路径全小写，多词用连字符      /api/book-reviews   （不用 /BookReviews）
10. 批量/复杂操作用 POST + body，并在文档里说明它不是"创建"
```

## 4.4 参数位置速查

| 你要传什么 | 放哪 | 服务端怎么接 |
|---|---|---|
| 资源 id | 路径 | `[FromRoute] long id` 或直接 `long id` |
| 关键词/页码/排序 | 查询串 | `[FromQuery] BookQuery q` |
| 要创建/更新的数据 | body | `[FromBody] CreateBookRequest req` |
| token / traceId | header | `[FromHeader(Name="...")] string? x` |
| 文件 | form-data | `[FromForm] IFormFile file` |
| 数组 | 查询串重复键 `?ids=1&ids=2` | `long[] ids`（**逗号分隔不默认支持**） |
| 复杂筛选（>8 条件） | `POST /search` + body | `[FromBody] BookSearchRequest` |

## 4.5 记忆口诀

```
资源是名词，动词给 HTTP
查走 GET，建走 POST，改走 PUT，删走 DELETE
GET 绝不改数据，PUT 重试不闯祸
201 带地址，204 不说话，404 说没有，400 说你错
标识进路径，条件进查询，内容进 body，凭证进 header
```

## 4.6 六个高频易错点

| # | 易错点 | 正确做法 |
|---|---|---|
| 1 | 用 `GET` 做删除/修改 | **绝对禁止**。爬虫、预取、代理重试都会触发 |
| 2 | 创建返回 `Ok(true)` | 用 `CreatedAtAction(...)` 返回 **201 + Location** |
| 3 | `PUT` 只传部分字段 | `PUT` 是整体替换；部分更新用 `PATCH`，或另开子资源端点 |
| 4 | record 上加 `[Required]` | 必须写 **`[property: Required]`**，否则标到构造参数上，验证不生效 |
| 5 | 直接返回 EF 实体 | 循环引用会让序列化抛异常；**永远返回 DTO** |
| 6 | `?ids=1,2,3` 逗号分隔 | .NET **默认不支持**，要么前端改重复键，要么写自定义 binder |

## 4.7 留给下一批的问题（P110–P113 会回答）

1. 一个接口"成功了但什么都没做"（比如删除不存在的 id），应该返回 200、204 还是 404？
2. 业务校验失败（如"库存不足"）用 400 还是 422？ASP.NET Core 的 `[ApiController]` 默认返回什么？
3. 为什么要有 `ProblemDetails` 这个标准格式？自己定义 `{code, message}` 有什么问题？
4. 异步 Action（`async Task<ActionResult<T>>`）和同步 Action，在返回值和异常处理上有什么区别？
5. 前端传 `null`、传空字符串、不传，这三种在绑定时怎么区分？

**这五个问题是"接口能用"和"接口专业"的分界线。下一批专门解决。**

