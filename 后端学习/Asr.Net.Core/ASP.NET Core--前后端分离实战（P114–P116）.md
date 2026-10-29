==零：补充==

> **这一节回答三个问题：前后端分离到底"分"出了什么问题？这些问题为什么以前没有？你现在的项目卡在哪一步？**

## 它解决什么问题

**"前后端分离"这四个字，听起来像一种"更先进的架构"。它不是。它是一次权衡：用"两个进程 + 两个端口"换"前端能独立演进"。**

先看它换掉了什么：

| | 不分离（Razor MVC） | 分离（你的项目） |
|---|---|---|
| 进程 | **1 个** | **2 个** |
| 端口 | 1 个（5003） | 2 个（5173 + 5003） |
| 谁生成 HTML | 后端（`.cshtml`） | **前端（浏览器里的 JS）** |
| 页面跳转 | 浏览器发新请求，后端返回新 HTML | **JS 换 DOM，不发页面请求** |
| 数据格式 | HTML 片段 | JSON |
| 前端改样式要重启后端吗 | **要**（重新编译） | 不要（Vite 热更新） |
| 前端能独立部署吗 | 不能 | **能** |

**收益**（你选择它的理由）：

1. **前端改一行 CSS 不用重启后端**，Vite 的 HMR 一秒生效
2. **前端能独立部署**（放到 Nginx / CDN，后端只出 API）
3. **一套 API 能服务多个客户端**（网页、小程序、桌面端）
4. **前后端可以并行开发**（约定好接口就能各写各的）

**代价**（这一批课的全部内容）：

> **两个端口 = 两个"源" = 浏览器认为它们是两个不同的网站。**

于是凭空多出三个以前不存在的问题：

```
① 跨域（CORS）—— 浏览器不允许 5173 的页面读 5003 的响应
② 认证 —— 没有 Session 了（因为跨域默认不带 Cookie），怎么记住"我登录过"
③ 联调与部署 —— 开发时两个端口，上线时怎么变成一个域名
```

**这三件事，就是不分离时代你一次都没遇到、分离之后天天遇到的东西。**

## 没有它会怎样

**问题一：控制台一片红，但后端日志显示 200。**

```
Access to fetch at 'http://localhost:5003/api/books' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

**新手最容易误判的地方**：看到这个错误，以为是"后端没返回"或"接口写错了"。于是去改后端逻辑、加日志、重启——**全都白费，因为请求确实到了后端，后端也确实返回了 200，只是浏览器拒绝把响应交给你的 JS。**

**这就是跨域最反直觉的一点：它不是"请求失败"，是"响应被浏览器扣下了"。**

**问题二：接口能调通，但登录状态永远留不住。**

```js
// 登录接口返回了 Set-Cookie: sessionId=abc
// 下一个请求带不上这个 Cookie → 后端认为你没登录 → 401
```

**原因**：跨域请求默认**不携带 Cookie**（`credentials: 'same-origin'` 是默认值）。你要显式设 `credentials: 'include'`，同时后端要 `AllowCredentials()` + 指定具体 Origin。**两个都得改，改一个还是失败。**

**问题三：开发环境一切正常，上线后全挂。**

开发时你写死 `http://localhost:5003`，上线后域名变了、协议从 http 变 https，**所有请求的 URL 全要改**。更糟的是**混合内容**：https 页面调 http 接口，浏览器直接拦死，连错误都不给你看。

## 它在整个生态里的位置

**这一批课是"从写接口"到"做出能用的产品"的最后一公里。** 前面 11 批你都在写后端，但**后端再对，前后端接不上就等于 0**。

而且这三个问题**后面还会反复出现**：

| 后面的内容 | 和这一批的关系 |
|---|---|
| P144–P151 JWT 认证 | 分离架构下的认证方案（没有 Session 可用） |
| P157–P161 SignalR | WebSocket 也要处理跨域和认证 |
| P165 发布 | 上线时前端静态托管 + 后端 API 的域名方案 |
| 你自己的 DesktopPet 项目 | 就是这个结构：5173 + 5003 |

## 对你个人的实际意义

**第一，你的项目结构已经踩在这个坑上了，只是你可能还没系统性理解。**

根据你之前的设定：

```
前端：原生 HTML/CSS/JS + Vite → http://localhost:5173
后端：ASP.NET Core           → http://localhost:5003（VS F5）
```

**这两个端口就是两个"源"。** 所以你现在一定遇到过（或即将遇到）：

- `fetch('http://localhost:5003/api/xxx')` 报 CORS
- 后端 `UseHttpsRedirection` 导致 307，浏览器 `fetch` 跟着跳转到 https，然后证书不受信任 → 请求挂掉（你已经注释掉它了）
- `.http` 能通，浏览器里不通 —— **因为 `.http` 不走浏览器的同源策略，浏览器走**

**第二，CORS 这件事，你要能在 30 秒内判断"是谁的问题"。**

判断顺序（这一批会讲透）：

```
1. 后端日志有没有收到这个请求？
   ├─ 没收到 → 网络/端口/防火墙/HTTPS 重定向问题
   └─ 收到了，返回 200
        └─ 浏览器还是报 CORS → 就是响应头没配对
2. 是不是预检（OPTIONS）失败了？
   └─ Network 面板能看到两条请求：OPTIONS + 真正的请求
3. 带 Cookie 了吗？
   └─ 带了就得 AllowCredentials + 具体 Origin，不能用 *
```

**这套判断流程比"搜报错信息"快十倍**，因为它让你知道该看哪。

**第三，Vite 的代理能让你在开发阶段彻底绕开 CORS。**

这是很多人不知道的一点：**开发时根本不需要配 CORS**。只要在 `vite.config.js` 里配一行代理，前端的 `/api/*` 就会被 Vite 转发到 `localhost:5003`——**对浏览器来说，请求是发给 5173 自己的**，同源，没有跨域。

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5003', changeOrigin: true }
    }
  }
})
```

**这一行能让你的开发效率立刻提升**，因为你不用再纠结后端 CORS 配置对不对。**CORS 留到部署时再处理**（或者用同域名反代，也不需要 CORS）。

**这个"开发用代理、生产用同源"的组合，是现在最主流的做法。**

## 诚实的话：什么时候用不上

| 情况 | 要不要 CORS |
|---|---|
| 开发时用 Vite 代理 | **不需要**（同源了） |
| 生产时前端静态文件放 Nginx，`/api` 反代到后端 | **不需要**（同源了） |
| 前端部署在 CDN（`www.xxx.com`），后端在 `api.xxx.com` | **需要**（不同源，但同站点） |
| 小程序调你的 API | **不需要 CORS**（小程序没有同源策略，但要配"合法域名"白名单） |
| 桌面端（Electron / WPF）调 API | **不需要**（没有浏览器同源限制） |
| 第三方系统调你的 API | **不需要 CORS**（服务端到服务端） |

**关键认知：CORS 是"浏览器的限制"，不是"服务器的限制"。** 只有"浏览器里的 JS"才受它约束。**这也是为什么 `.http`、curl、Postman 全都好好的。**

> **一句话总结这一批：分离带来了三个新问题——跨域、认证、联调部署。跨域的本质是"浏览器扣下了响应"，解决靠"配响应头"或"干脆同源（代理/反代）"；认证的本质是"没有 Session 了"，解决靠"token 放请求头"；联调部署的本质是"URL 会变"，解决靠"环境变量"。**

---

==一：概念==

> 本篇覆盖 **P114–P116**：前后端分离开发 1/2/3。
> 环境：**前端 原生 HTML/CSS/JS + Vite（5173）**，**后端 ASP.NET Core .NET 10（5003）**。
> 承接：P110–P113 的接口已经能返回正确状态码，这一批让前端真正能用上。
> **本篇不写 Vue/React**——你的技术栈是原生 JS，用原生 `fetch` 演示，概念完全通用。

---

# P114　前后端分离开发 1：跨域（CORS）

**一句话：同源策略是浏览器的一条安全规则——它允许你"发出"跨域请求，但**不允许你"读到"跨域的响应**，除非对方明确说"我允许你读"。**

## 1. 什么叫"同源"

**同源 = 协议 + 域名 + 端口，三者完全相同。**

以 `http://localhost:5173/index.html` 为基准：

| 目标 URL | 同源？ | 原因 |
|---|---|---|
| `http://localhost:5173/api/books` | ✅ | 完全一致 |
| `http://localhost:5003/api/books` | ❌ | **端口不同** |
| `https://localhost:5173/api` | ❌ | 协议不同 |
| `http://127.0.0.1:5173/api` | ❌ | **域名不同**（`localhost` ≠ `127.0.0.1`，虽然指向同一台机器） |
| `http://localhost:5173/../` | ✅ | 同源只看前三个部分，路径不影响 |

> **`localhost` 和 `127.0.0.1` 不同源**——这条坑过无数人。你前端配 `localhost:5173`，请求写 `127.0.0.1:5003`，就是跨域。

## 2. 同源策略到底限制了什么（这是最关键的一节）

**它限制的不是"发请求"，是"读响应"。**

```
① 你的 JS 发出 fetch('http://localhost:5003/api/books')
   ↓
② 请求真的发出去了！后端真的收到了！后端真的执行了！返回 200 + JSON
   ↓
③ 浏览器检查响应头里有没有 Access-Control-Allow-Origin: http://localhost:5173
   ├─ 有 → 把响应交给你的 JS
   └─ 没有 → 拦下来，你的 fetch 抛 TypeError，控制台报 CORS 错误
```

**证据**：你在后端打日志，会看到请求**确实进来了**：

```csharp
app.Use(async (ctx, next) =>
{
    Console.WriteLine($"[收到] {ctx.Request.Method} {ctx.Request.Path}");
    await next();
});
```

**前端报 CORS，后端日志有记录——这两件事同时成立，不矛盾。**

### 这条规则的三个后果（都很反直觉）

**后果一：`GET` 请求可能已经"生效"了，但你看不到结果。**

如果跨域的是 `GET /api/books/delete/5`（假设你这么写了），**删除已经执行了**，只是响应被拦下。**这是"用 GET 做修改"的另一重危险。**

**后果二：`POST` 的写入也可能已经发生了，但前端以为失败。**

前端 `fetch` 抛错 → 用户点重试 → **数据被插了两条**。这是跨域 + 非幂等接口的组合事故，**真实项目里发生过很多次**。

**后果三：你不能靠"后端报错了"来判断。**

CORS 错误里看不到后端的任何信息（状态码、响应体都拿不到）。**所以你永远要先看后端日志，而不是盯前端控制台。**

## 3. CORS 的两条路径：简单请求 vs 预检请求

浏览器不是每次都直接发业务请求。**它会先判断"这个请求危险性如何"**。

### 简单请求（Simple Request）：直接发，回来再看头

满足**全部**条件才算简单请求：

| 条件 | 允许的值 |
|---|---|
| 方法 | `GET` / `HEAD` / `POST` **之一** |
| 请求头 | 只能是 **CORS 安全首部**（`Accept`、`Accept-Language`、`Content-Language`、`Content-Type`、`Range` 等） |
| `Content-Type` | 只能是 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain` **之一** |

**注意：`Content-Type: application/json` 不在列表里！** 所以**任何 JSON 的 POST 都是"非简单请求"**。

### 预检请求（Preflight）：先问一句"我能发吗"

```http
① 浏览器自动发：
OPTIONS /api/books HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

② 服务端必须回：
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 600

③ 浏览器看到"允许"了 → 才发真正的 POST
```

**关键点**：

- **预检是浏览器自动发的，你的代码里看不到**
- 预检失败 → 真正的请求**根本不会发出去**
- **预检不带 Cookie、不带 `Authorization`**——所以它必须被允许匿名通过（这就是为什么 `UseCors` 要排在 `UseAuthorization` 前面）

> **调试技巧**：在浏览器 Network 面板，如果只看到一条 `OPTIONS` 且状态是失败/红色，**说明预检没通过**，问题在响应头配置。如果看到 `OPTIONS` 成功 + 真正的请求成功但控制台还报 CORS，**说明是"响应头缺 `Access-Control-Allow-Origin`"或"Origin 不匹配"**。

## 4. 六个 CORS 响应头（逐个说清）

| 头 | 作用 | 注意 |
|---|---|---|
| `Access-Control-Allow-Origin` | 允许哪个源读响应 | **`*` 或具体一个源**，不能是列表 |
| `Access-Control-Allow-Methods` | 允许哪些方法 | 预检时用 |
| `Access-Control-Allow-Headers` | 允许哪些请求头 | 你用了 `Authorization` 就必须列上 |
| `Access-Control-Allow-Credentials` | 允许带 Cookie/凭证 | **和 `*` 互斥**（见下） |
| `Access-Control-Max-Age` | 预检结果缓存多久（秒） | Chrome 上限 **7200**（2 小时） |
| `Access-Control-Expose-Headers` | 前端能读哪些**自定义响应头** | 默认只能读 6 个基础头 |

### `Allow-Credentials` 与 `*` 的互斥（必错点）

```
❌ Access-Control-Allow-Origin: *
   Access-Control-Allow-Credentials: true

✅ Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Credentials: true
```

**为什么不能 `*`**：如果允许"任何网站"带 Cookie，那 `evil.com` 也能带着你的 Cookie 请求你的接口。**所以规范强制：带凭证时必须明确指定源。**

**ASP.NET Core 里写错会直接抛异常**：

```csharp
// 启动时抛：InvalidOperationException
// The CORS protocol does not allow specifying a wildcard (any) origin and credentials at the same time.
policy.AllowAnyOrigin().AllowCredentials();
```

### `Expose-Headers` 的意义（你迟早要用）

前端默认只能读这几个响应头：`Cache-Control`、`Content-Language`、`Content-Type`、`Expires`、`Last-Modified`、`Pragma`。

**你想读自定义头（比如 `X-Total-Count` 做分页），必须显式暴露**：

```csharp
policy.WithExposedHeaders("X-Total-Count");
```

```js
const res = await fetch('/api/books')
const total = res.headers.get('X-Total-Count')   // 不配 ExposeHeaders 就是 null
```

## 5. ASP.NET Core 配置 CORS（三种粒度）

### ① 全局命名策略（推荐）

```csharp
// Program.cs
var MyCors = "MyCors";

builder.Services.AddCors(options =>
{
    options.AddPolicy(MyCors, policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173",      // 开发：Vite
                  "https://www.example.com")    // 生产：你的域名
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()               // 需要带 Cookie 时加
              .WithExposedHeaders("X-Total-Count")
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

var app = builder.Build();

app.UseRouting();            // ← 必须在 UseCors 之前
app.UseCors(MyCors);         // ← 必须在 UseAuthorization 之前
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

**顺序的三个硬规则**：

| 规则 | 原因 |
|---|---|
| `UseCors` 必须在 **`UseRouting` 之后** | 它要读端点信息（每个端点可以有不同 CORS 策略） |
| `UseCors` 必须在 **`UseAuthentication`/`UseAuthorization` 之前** | 预检请求不带凭证，先认证会直接 401 把预检拦死 |
| `UseCors` 必须在 **`UseEndpoints`/`MapControllers` 之前** | 一样是管线顺序问题 |

> **不按这个顺序会怎样**：不报错，但 CORS 静默失效（或者预检永远 401）。**这是最难查的一类问题**，因为没有任何错误提示。

### ② 按环境区分（生产别用 localhost）

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("Dev", p => p
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials());

    options.AddPolicy("Prod", p => p
        .WithOrigins("https://www.example.com", "https://example.com")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();

app.UseCors(app.Environment.IsDevelopment() ? "Dev" : "Prod");
```

### ③ 端点级（`[EnableCors]`）

```csharp
[EnableCors("Dev")]
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase { ... }

// 或者只对某个 Action
[EnableCors("Dev")]
[HttpGet("public")]
public ActionResult Public() => Ok(new { open = true });
```

**用途**：全局不开放，只有特定几个接口允许跨域（比如公开的查询接口）。

> **注意**：用 `[EnableCors]` 时，`app.UseCors()` 仍然要调用（不带策略名），否则特性不生效：
> ```csharp
> app.UseCors();     // 无参数版本，配合 [EnableCors] 特性
> ```

## 6. CORS 报错逐条解读（对照你的控制台）

| 报错信息 | 原因 | 修法 |
|---|---|---|
| `No 'Access-Control-Allow-Origin' header is present` | 后端根本没配 CORS，或 `UseCors` 顺序错，或策略没生效 | 检查 `AddCors` + `UseCors` 位置 |
| `The 'Access-Control-Allow-Origin' header has a value 'http://localhost:5173' that is not equal to the supplied origin` | 前端 Origin 和后端允许的不一致（`127.0.0.1` vs `localhost`、https vs http） | 逐字符核对 |
| `Response to preflight request doesn't pass access control check` | 预检失败（`Allow-Methods`/`Allow-Headers` 不全） | 加 `AllowAnyMethod/Header` |
| `The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'` | `*` + `credentials: include` | 改成具体 Origin |
| `Request header field authorization is not allowed by Access-Control-Allow-Headers` | 用了 `Authorization` 但没在允许列表 | `AllowAnyHeader()` 或列出 `authorization` |
| `Redirect is not allowed for a preflight request` | 预检被 301/302/307 重定向了 | **典型原因：`UseHttpsRedirection` 把 OPTIONS 307 到 https** |

> **最后一条是你的真实经历**：你之前把 `UseHttpsRedirection` 注释掉，就是因为 `.http` 拿到空 307。**在前后端分离的开发环境，这一行基本都该注释掉**（或者只对非开发环境启用）。

## 7. 为什么"生产环境往往不需要 CORS"

因为生产环境有两种主流部署方式，**它们都让前后端"同源"**：

```
方案 A：Nginx 统一入口（最常见）
  用户 → https://www.example.com
         ├─ /            → 静态文件（前端 dist）
         └─ /api/*       → 反代到 http://localhost:5003
  对浏览器来说：所有请求都是 www.example.com → 同源 → 不需要 CORS

方案 B：CDN + API 子域名
  前端 → https://www.example.com（CDN）
  后端 → https://api.example.com
  → 不同源 → 需要 CORS（且要配 credentials）
```

**所以"要不要 CORS"的答案取决于你的部署方式，不是取决于"你分不分离"。** P116 会给出具体的 Nginx 配置。

---

# P115　前后端分离开发 2：联调

**一句话：联调的核心不是"调接口"，是"建一套前端能复用的请求层"——把 baseURL、token、错误处理、超时全部收口到一个文件里。**

## 1. 先解决开发期的 CORS：Vite 代理（最省事）

**这是开发阶段的最优解：不配 CORS，用代理把请求变成同源。**

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // 所有 /api 开头的请求，转发到后端
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,       // 改 Host 头，让后端以为是同源
        secure: false,            // 后端是自签名 https 时用
        // rewrite: (path) => path.replace(/^\/api/, '')   // 如果后端路由没有 /api 前缀才需要
      }
    }
  }
})
```

**它做了什么**：

```
浏览器 → http://localhost:5173/api/books          （同源！浏览器不管）
              ↓ Vite 开发服务器转发
          http://localhost:5003/api/books          （服务端到服务端，没有同源策略）
```

**代码里就这么写**：

```js
// 不需要写 http://localhost:5003，直接写 /api
const res = await fetch('/api/books')
```

**收益**：

| 好处 | 说明 |
|---|---|
| 开发期完全不用管 CORS | 浏览器认为同源 |
| 不用写死域名端口 | 换后端端口只改 `vite.config.js` |
| Cookie 能正常工作 | 同源请求默认带 Cookie |
| 生产环境和开发环境代码一致 | 生产用 Nginx 做同样的反代 |

> **注意**：`changeOrigin: true` 的作用是**改请求的 `Host` 头**为目标地址。有些后端会校验 Host（比如 ASP.NET Core 的 `AllowedHosts`），不设可能返回 400。

## 2. 环境变量：让 baseURL 可切换

**绝对不要在代码里写死 `http://localhost:5003`。** 用 Vite 的环境变量：

```ini
# .env.development          （npm run dev 时加载）
VITE_API_BASE=/api

# .env.production           （npm run build 时加载）
VITE_API_BASE=https://api.example.com/api
```

```js
// src/api/config.js
const BASE = import.meta.env.VITE_API_BASE ?? '/api'
export { BASE }
```

**三条规则**：

| 规则 | 说明 |
|---|---|
| 变量名**必须以 `VITE_` 开头** | 否则不会注入到前端代码里（防止误把密钥打到前端） |
| 用 `import.meta.env` 读 | 不是 `process.env` |
| 只有 `VITE_` 开头的才会被打包进去 | **所以绝对不要在前端环境变量里放密钥**（打包后所有人可见） |

## 3. 统一请求层：一个 `http.js` 收口所有事

**这是这一节最值钱的代码。** 有了它，你写业务代码时只需要 `await http.get('/api/books')`。

```js
// src/api/http.js

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

// 从 localStorage 取 token（P116 会讨论存哪更安全）
function getToken() {
  return localStorage.getItem('token')
}

// 统一的错误对象
export class ApiError extends Error {
  constructor(status, problem, raw) {
    super(problem?.title || `HTTP ${status}`)
    this.status = status
    this.code = problem?.code
    this.problem = problem
    this.raw = raw
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const url = path.startsWith('http') ? path : BASE + path

  const finalHeaders = { ...headers }
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined
            : body instanceof FormData ? body
            : JSON.stringify(body),
      signal,
      credentials: 'same-origin'      // 用代理时同源；用 cookie 认证时改 'include'
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e          // 主动取消，不当作错误
    throw new ApiError(0, { title: '网络异常，请检查连接' })
  }

  // ★ 关键：204 / 205 没有响应体，不能 res.json()
  if (res.status === 204 || res.status === 205) return null

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (res.ok) return data

  // ── 统一错误处理
  if (res.status === 401) {
    localStorage.removeItem('token')
    // 跳登录（注意：不要在这里无限循环）
    if (!location.pathname.startsWith('/login')) {
      location.href = '/login?redirect=' + encodeURIComponent(location.pathname)
    }
  }

  throw new ApiError(res.status, data, text)
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return text }
}

export const http = {
  get:  (path, opt) => request(path, { ...opt, method: 'GET' }),
  post: (path, body, opt) => request(path, { ...opt, method: 'POST', body }),
  put:  (path, body, opt) => request(path, { ...opt, method: 'PUT', body }),
  del:  (path, opt) => request(path, { ...opt, method: 'DELETE' }),
  upload: (path, formData, opt) => request(path, { ...opt, method: 'POST', body: formData })
}
```

### 这段代码解决的六个真实问题

| # | 问题 | 解决方式 |
|---|---|---|
| 1 | 每个接口都要拼 baseURL | `BASE + path` |
| 2 | 每个请求都要手动加 token | 拦截器统一加 |
| 3 | **204 响应调 `res.json()` 报 `Unexpected end of JSON input`** | 判断 `status === 204` 直接返回 `null` |
| 4 | 400/409 的 ProblemDetails 拿不到字段级错误 | 统一抛 `ApiError`，带 `problem.errors` |
| 5 | 401 到处要写跳转 | 统一处理 |
| 6 | 网络断了以后报 `TypeError: Failed to fetch`，看不出是网络问题 | 包成 `ApiError(0, ...)` |

> **第 3 条是你一定会遇到的**：`DELETE` 返回 204，你写 `const data = await res.json()` → 直接抛异常。**这是前后端分离最常见的第一个 bug。**

## 4. 业务代码写起来就干净了

```js
// src/api/books.js
import { http } from './http'

export const bookApi = {
  list: (query) => {
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v)
    })
    return http.get(`/books?${qs}`)
  },
  get:    (id) => http.get(`/books/${id}`),
  create: (data) => http.post('/books', data),
  update: (id, data) => http.put(`/books/${id}`, data),
  remove: (id) => http.del(`/books/${id}`)
}
```

```js
// 页面里
try {
  const page = await bookApi.list({ keyword: 'core', page: 1, size: 10 })
  render(page.items)
} catch (e) {
  if (e.status === 404) showEmpty()
  else if (e.status === 422) showFieldErrors(e.problem.errors)
  else toast(e.message)
}
```

**注意 `e.problem.errors`**：这是 P110 里 `ValidationProblemDetails` 的字段，**前端可以直接拿到"哪个字段错了、错在哪"**，不用自己猜。

## 5. 联调时最常见的七个问题（对照排查）

| # | 现象 | 原因 | 修法 |
|---|---|---|---|
| 1 | `Unexpected end of JSON input` | 204/205 没有响应体却调了 `res.json()` | 判断状态码（见上面的 `http.js`） |
| 2 | `415 Unsupported Media Type` | POST 没设 `Content-Type: application/json` | 请求层统一设 |
| 3 | `404` 但 `.http` 能通 | **路径大小写**（Linux 部署后区分）、少了 `/api` 前缀、路由模板拼错 | 打印端点表核对 |
| 4 | 请求发了但后端没日志 | 打到别的端口了（`.env` 没生效 / Vite 没重启） | 看 Network 面板的 Request URL |
| 5 | 明明返回 200，前端 `data` 是 `undefined` | 忘了 `await res.json()`，或函数没 `return` | 检查请求层 |
| 6 | 中文乱码 / 变 `\uXXXX` | 后端 JSON 编码器默认转义中文 | `Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)` |
| 7 | 时间显示差 8 小时 | 后端返回 UTC，前端当本地时间显示 | 前端转时区，或后端返回带时区的时间 |

> **第 7 条展开**：`DateTime.Now` 在服务器上取的是**服务器时区**的时间（没有时区信息）。前端 `new Date("2026-01-01T00:00:00")` 会当成**本地时间**解析。
> **正确做法**：后端用 UTC 存储和输出（`DateTime.UtcNow` 或 `DateTimeOffset`），前端用 `toLocaleString()` 显示。

## 6. 用浏览器开发者工具定位（三步法）

```
① Network 面板 → 找到那条红色请求
   ├─ Status 显示 (failed) / CORS error → 跨域问题（P114）
   ├─ Status 404 → 路由问题
   ├─ Status 415 → Content-Type
   ├─ Status 400 → 看 Response 里的 errors
   └─ Status 500 → 看后端日志（Response 里只有通用文案）

② 有没有 OPTIONS 请求？
   ├─ 有且失败 → 预检没通过
   └─ 没有 → 简单请求，直接看响应头

③ 后端日志有没有这条请求？
   ├─ 没有 → 请求根本没到（端口/代理/HTTPS 重定向）
   └─ 有 → 请求到了，问题在响应
```

**这套流程能覆盖 90% 的联调问题。** 剩下的 10% 打开后端控制台看异常堆栈。

---
# P116　前后端分离开发 3：认证与部署

**一句话：分离之后没有 Session 可用了，认证要靠"每次请求自带凭证"；而部署的本质是"让两个进程在浏览器眼里变成一个源"。**

## 1. 为什么 Session 在分离架构里不好使

**不分离时代**：登录后服务端存 `Session["userId"]=5`，返回一个 `Set-Cookie: .AspNetCore.Session=xxx`。之后每个请求浏览器**自动带上这个 Cookie**，服务端查 Session 就知道你是谁。

**分离之后，这个链条断在三个地方**：

| 断点 | 具体问题 |
|---|---|
| **① 跨域不带 Cookie** | `fetch` 默认 `credentials: 'same-origin'`，跨域请求**不发送 Cookie** |
| **② `SameSite` 默认值** | 现代浏览器默认 `SameSite=Lax`，跨站请求不带 Cookie |
| **③ 服务端要水平扩展** | Session 存在某台机器的内存里，多台机器就不认了（P107 讲的"无状态"） |

**你可以硬撑：**

```js
credentials: 'include'        // 前端带 Cookie
```
```csharp
policy.AllowCredentials()     // 后端允许凭证（不能用 *）
    .WithOrigins("http://localhost:5173");
```
```csharp
cookie.SameSite = SameSiteMode.None;   // 跨站必须 None
cookie.Secure = true;                   // None 必须配 Secure（必须 https）
```

**但这套组合有三个硬伤**：

1. **`SameSite=None` 要求必须 HTTPS**，本地 http 调试直接失败
2. **第三方 Cookie 正在被浏览器淘汰**（Safari ITP、Chrome 逐步限制）
3. **仍然是有状态**，多实例部署要配 Redis 共享 Session

> **所以主流选择是：分离架构用 token（JWT），把"我是谁"编码进请求头。** 这也是 P107"无状态"那一条的实践。

## 2. Token 存哪里（这是安全问题，不是风格问题）

| 存储位置 | XSS 能偷到吗 | CSRF 会中招吗 | 刷新页面还在吗 | 多标签页共享 |
|---|---|---|---|---|
| **`localStorage`** | ☠️ **能**（`localStorage.getItem` 一行搞定） | ✅ 不会（不自动带） | ✅ 在 | ✅ 共享 |
| **`sessionStorage`** | ☠️ 能 | ✅ 不会 | ✅ 在（同标签页） | ❌ 不共享 |
| **内存变量**（JS 闭包） | ⚠️ 较难（要执行任意代码） | ✅ 不会 | ❌ **刷新就没了** | ❌ 不共享 |
| **`httpOnly` Cookie** | ✅ **偷不到**（JS 读不到） | ☠️ **会中招**（浏览器自动带） | ✅ 在 | ✅ 共享 |

### 怎么选（说人话）

**没有绝对安全的选项，只有"你更怕哪种攻击"。**

| 你的场景 | 建议 |
|---|---|
| 学习项目 / 内部系统 | `localStorage` 够用（简单，刷新不丢） |
| 有用户资金/隐私的产品 | `httpOnly` Cookie + `SameSite=Strict` + CSRF Token |
| 高安全要求 | `httpOnly` Cookie（access token 短命）+ refresh token 存 Cookie |
| 纯前后端分离 + 跨域 | access token 放内存，refresh token 放 `httpOnly` Cookie（最稳） |

**`localStorage` 的真实风险**：只要你的页面有一个 XSS 漏洞（比如把用户输入直接塞进 `innerHTML`），token 就被偷走，攻击者可以冒充你直到 token 过期。

```js
// 这个"看起来无害"的写法就是 XSS 入口
el.innerHTML = `<div>${userComment}</div>`      // ☠️ userComment 里可以是 <img onerror=...>

// 用 textContent
el.textContent = userComment                     // ✅ 不会执行
```

> **对你的建议（现阶段）**：先用 `localStorage`，因为简单且你要专注把功能跑通。但**记住一件事：绝不能把用户输入用 `innerHTML` 拼进页面**。这一条守住了，`localStorage` 的风险就小很多。

## 3. 完整的 token 认证流程

```
① 前端提交账号密码
   POST /api/auth/login  { "userName": "x", "password": "y" }
   ↓
② 后端验证，签发 JWT
   200 { "token": "eyJhbGci...", "expiresIn": 3600, "userName": "x", "roles": ["Admin"] }
   ↓
③ 前端存起来（localStorage）
   ↓
④ 之后每个请求自动带
   Authorization: Bearer eyJhbGci...
   ↓
⑤ 后端 [Authorize] 验证签名和过期时间 → 解析出 ClaimsPrincipal
   ↓
⑥ 过期后返回 401 → 前端跳登录
```

### 后端最小实现（P148 会深入）

```csharp
// 1) 注册
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "BookApi",
            ValidAudience = "BookClient",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();

// 2) 管线（注意顺序）
app.UseCors("Dev");
app.UseAuthentication();      // ← 必须在 UseAuthorization 之前
app.UseAuthorization();

// 3) 登录接口
[HttpPost("api/auth/login")]
[AllowAnonymous]
public ActionResult Login([FromBody] LoginRequest req)
{
    var user = _userService.Validate(req.UserName, req.Password);
    if (user is null) return Unauthorized(new { message = "用户名或密码错误" });

    var token = _jwt.Create(user);       // 见 P148
    return Ok(new { token, expiresIn = 3600, userName = user.Name });
}

// 4) 受保护接口
[Authorize]
[HttpGet("api/profile")]
public ActionResult Profile() => Ok(new { name = User.Identity!.Name });
```

### 前端（复用 P115 的 `http.js`）

```js
// 登录
const res = await http.post('/api/auth/login', { userName, password })
localStorage.setItem('token', res.token)

// 之后所有请求自动带 Authorization: Bearer ...（http.js 里已经做了）
const profile = await http.get('/api/profile')
```

> **`Bearer` 后面有一个空格**：`Authorization: Bearer eyJ...`。少了空格 → 401，而且报错里不会告诉你是空格问题。**这是最常见的低级错。**

## 4. 401 的重试与刷新（知道结构即可）

**access token 设短（15 分钟）更安全，但用户会频繁掉线。** 解法是"双 token"：

```
access token  ：15 分钟，放内存
refresh token ：7 天，放 httpOnly Cookie
```

流程：

```
请求 → 401（access 过期）
  → 用 refresh token 换新 access token
  → 重放原请求（只重放一次）
  → refresh 也过期 → 真跳登录
```

```js
// http.js 里加一段（伪代码，注意防死循环）
if (res.status === 401 && !opt._retried) {
  const ok = await tryRefresh()
  if (ok) return request(path, { ...opt, _retried: true })
}
```

> **你的项目现在不需要这个**。但要知道：**"401 自动刷新并重放请求"必须在请求层实现，且必须防无限循环**（refresh 接口自己也 401 时不能再去 refresh）。

## 5. 部署：让两个进程变成一个"源"

### 方案 A：Nginx 统一入口（最常用，也最省事）

```
用户浏览器
   ↓ https://www.example.com
Nginx
   ├─ location /        → 前端静态文件（dist 目录）
   └─ location /api/    → 反代到 http://127.0.0.1:5003
```

```nginx
server {
    listen 443 ssl;
    server_name www.example.com;

    # ① 前端静态文件
    root /var/www/bookapp;
    index index.html;

    # ② SPA 路由回退（Vue Router history 模式必需）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ③ API 反代
    location /api/ {
        proxy_pass         http://127.0.0.1:5003;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ④ 静态资源缓存（带指纹的文件可以长缓存）
    location ~* \.(js|css|png|jpg|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**关键点**：

| 配置 | 为什么 |
|---|---|
| `try_files $uri $uri/ /index.html` | **前端路由刷新 404 的根因**：`/books/5` 在服务器上没有这个文件，要回退给 `index.html` 让前端路由处理 |
| `X-Forwarded-Proto` | 后端要生成正确的 https 链接（重定向、`Location` 头） |
| `/api/` 末尾的斜杠 | `location /api/` + `proxy_pass http://...`（不带路径）才对；写成 `proxy_pass http://.../api/` 会重复拼接 |

**用了这个方案，生产环境不需要 CORS**（同源了）。

### 方案 B：前后端不同域名

```
前端：https://www.example.com（CDN / 对象存储）
后端：https://api.example.com
```

**这时候必须配 CORS**，而且要注意：

```csharp
policy.WithOrigins("https://www.example.com")   // 不能用 *
      .AllowCredentials()
      .AllowAnyHeader().AllowAnyMethod();
```

**而且要处理预检缓存**，否则每个请求前都多一次 OPTIONS 往返（`SetPreflightMaxAge`）。

### 后端发布（P165 会细讲）

```bash
dotnet publish -c Release -o ./publish
# 产物：publish/ 目录，包含 dll + 依赖 + 静态文件（如果有）
# 运行：dotnet BookApi.dll --urls http://0.0.0.0:5003
```

**生产环境的三条必备**：

| 项 | 做法 |
|---|---|
| 环境变量 | `ASPNETCORE_ENVIRONMENT=Production`（**千万别留 Development**，会暴露详细异常页） |
| 监听地址 | `ASPNETCORE_URLS=http://127.0.0.1:5003`（只监听本机，外面由 Nginx 挡） |
| 反向代理头 | `app.UseForwardedHeaders()`（否则 `Request.Scheme` 永远是 http） |

```csharp
// Program.cs 前面加
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});
app.UseForwardedHeaders();      // 必须在其他中间件之前
```

## 6. HTTPS 与混合内容（上线必踩）

**规则：https 页面里不能发 http 请求。**

```
https://www.example.com  →  fetch('http://api.example.com/books')
                            ☠️ 被浏览器拦截：Mixed Content
```

**表现**：请求直接变成 `(blocked:mixed-content)`，**后端连日志都没有**。

**三种修法**：

| 情况 | 修法 |
|---|---|
| 后端支持 https | 前端把 baseURL 改成 `https://` |
| 后端只在 http（内网） | 用 Nginx 反代成 https（方案 A） |
| 开发环境 http / https 混着 | 用 Vite 代理（同源），绕开 |

> **开发环境的自签名证书坑**：`https://localhost:5003` 用的是开发证书，浏览器第一次访问会警告。**如果用 `fetch` 直连，会直接失败**（没有"继续访问"的按钮）。
> **解法**：要么先把 `https://localhost:5003` 在浏览器里手动打开一次并信任证书，要么开发期干脆用 http + Vite 代理。

## 7. 开发 / 生产配置对照表（照这个检查一遍）

| 项 | 开发（本地） | 生产 |
|---|---|---|
| 前端地址 | `http://localhost:5173` | `https://www.example.com` |
| 后端地址 | `http://localhost:5003` | `https://www.example.com`（反代）或 `https://api.example.com` |
| 前端如何调后端 | **Vite 代理**（`/api` → 5003） | **Nginx 反代**（`/api/` → 5003） |
| 需要 CORS 吗 | **不需要**（代理同源） | 同域名不需要；跨子域名需要 |
| `UseHttpsRedirection` | **注释掉** | 交给 Nginx 做 301 |
| 环境变量 | `VITE_API_BASE=/api` | `VITE_API_BASE=/api`（同域）或 `https://api.../api` |
| 后端环境 | `Development` | **`Production`** |
| 异常页 | `UseDeveloperExceptionPage()` | `UseExceptionHandler()` + ProblemDetails |
| 数据库连接串 | `appsettings.Development.json` / User Secrets | 环境变量 |
| 日志 | Console | 文件 / 集中日志（P46–49 学的 NLog） |

> **这张表的意义**：`F5 能跑` 和 `能上线` 之间，差的就是这些配置。**把这八行逐条对一遍，能避免 80% 的"上线后挂了"。**

---
==二：格式==

## P114 · CORS 配置骨架

```csharp
var MyCors = "MyCors";

builder.Services.AddCors(o => o.AddPolicy(MyCors, p => p
    .WithOrigins("http://localhost:5173")     // 具体源，不能是 *（要带凭证时）
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("X-Total-Count")
    .SetPreflightMaxAge(TimeSpan.FromMinutes(10))));

var app = builder.Build();

app.UseRouting();          // ← 必须在 UseCors 之前
app.UseCors(MyCors);       // ← 必须在认证/授权之前
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

## P114 · 环境区分

```csharp
app.UseCors(app.Environment.IsDevelopment() ? "Dev" : "Prod");
```

## P114 · 端点级

```csharp
[EnableCors("Dev")]
[ApiController]
public class PublicController : ControllerBase { ... }
// 仍需 app.UseCors();（无参数）
```

## P115 · Vite 代理（开发期免 CORS）

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

## P115 · 环境变量

```ini
# .env.development
VITE_API_BASE=/api

# .env.production
VITE_API_BASE=/api
```

```js
const BASE = import.meta.env.VITE_API_BASE ?? '/api'
```

## P115 · 请求层骨架

```js
const BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const h = { ...headers }
  if (body !== undefined && !(body instanceof FormData)) h['Content-Type'] = 'application/json'
  const token = localStorage.getItem('token')
  if (token) h['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method, headers: h, signal,
    body: body === undefined ? undefined
        : body instanceof FormData ? body : JSON.stringify(body)
  })

  if (res.status === 204 || res.status === 205) return null      // ← 关键
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (res.ok) return data
  if (res.status === 401) { localStorage.removeItem('token'); /* 跳登录 */ }
  throw Object.assign(new Error(data?.title ?? `HTTP ${res.status}`),
                      { status: res.status, problem: data })
}
```

## P116 · 认证骨架

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => { o.TokenValidationParameters = new() { /* ... */ }; });
builder.Services.AddAuthorization();

app.UseCors(...);
app.UseAuthentication();     // ← 在 Authorization 之前
app.UseAuthorization();
```

```js
// 登录后
localStorage.setItem('token', res.token)
// 之后：Authorization: Bearer <token>  ← Bearer 后有一个空格
```

## P116 · Nginx 反代骨架

```nginx
location / {
    try_files $uri $uri/ /index.html;      # SPA 路由回退
}

location /api/ {
    proxy_pass         http://127.0.0.1:5003;    # 末尾不要带路径
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

## P116 · 转发头

```csharp
builder.Services.Configure<ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);
app.UseForwardedHeaders();      // 放在最前面
```

---

==三：代码==

## 3.1 后端：一个完整的可跨域 + 可认证的 `Program.cs`

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── 服务
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<BookDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ── CORS：开发 + 生产两套策略
builder.Services.AddCors(o =>
{
    o.AddPolicy("Dev", p => p
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()
        .WithExposedHeaders("X-Total-Count")
        .SetPreflightMaxAge(TimeSpan.FromMinutes(10)));

    o.AddPolicy("Prod", p => p
        .WithOrigins("https://www.example.com")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// ── 认证（P148 会讲细节，这里先能跑）
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            ValidIssuer = "BookApi", ValidAudience = "BookClient",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "dev-only-key-please-change-32chars"))
        };
    });
builder.Services.AddAuthorization();

// ── 转发头（放在最前，反向代理时需要）
builder.Services.Configure<ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

var app = builder.Build();

// ── 管线（顺序就是这一批的全部重点）
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();
}
else
{
    app.UseExceptionHandler();
}

// app.UseHttpsRedirection();     // ← 开发期注释掉（会把 OPTIONS 预检 307 走掉）

app.UseRouting();
app.UseCors(app.Environment.IsDevelopment() ? "Dev" : "Prod");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

## 3.2 前端：完整 `http.js`（可直接用）

```js
// src/api/http.js
const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.title || problem?.detail || (status ? `HTTP ${status}` : '网络异常'))
    this.name = 'ApiError'
    this.status = status
    this.code = problem?.code
    this.problem = problem
  }
}

function parse(text) {
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

async function request(path, { method = 'GET', body, headers = {}, signal, _retried } = {}) {
  const url = /^https?:\/\//.test(path) ? path : BASE + path

  const h = { Accept: 'application/json', ...headers }
  let payload
  if (body instanceof FormData) {
    payload = body                                     // 让浏览器自己设 boundary
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const token = localStorage.getItem('token')
  if (token) h['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method, headers: h, body: payload, signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, { title: '网络异常，请检查后端是否启动' })
  }

  // 204 / 205：成功但无响应体
  if (res.status === 204 || res.status === 205) return null

  const data = parse(await res.text())

  if (res.ok) return data

  if (res.status === 401) {
    localStorage.removeItem('token')
    const back = encodeURIComponent(location.pathname + location.search)
    if (!location.pathname.startsWith('/login')) location.href = `/login?redirect=${back}`
    throw new ApiError(401, data)
  }

  throw new ApiError(res.status, data)
}

export const http = {
  get: (p, o) => request(p, { ...o, method: 'GET' }),
  post: (p, b, o) => request(p, { ...o, method: 'POST', body: b }),
  put: (p, b, o) => request(p, { ...o, method: 'PUT', body: b }),
  patch: (p, b, o) => request(p, { ...o, method: 'PATCH', body: b }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
  upload: (p, fd, o) => request(p, { ...o, method: 'POST', body: fd })
}
```

## 3.3 前端：图书列表（含分页、错误处理、取消请求）

```js
// src/pages/books.js
import { http, ApiError } from '../api/http'

let controller = null

export async function loadBooks({ keyword = '', page = 1, size = 10 } = {}) {
  // 取消上一次未完成的请求（防止"后发先至"导致列表错乱）
  controller?.abort()
  controller = new AbortController()

  const qs = new URLSearchParams({ page, size })
  if (keyword) qs.append('keyword', keyword)

  try {
    const data = await http.get(`/books?${qs}`, { signal: controller.signal })
    renderList(data)                    // { total, page, size, totalPages, items }
    renderPager(data)
  } catch (e) {
    if (e.name === 'AbortError') return          // 主动取消，静默
    if (e instanceof ApiError) {
      if (e.status === 400) renderFieldErrors(e.problem?.errors)
      else if (e.status === 500) toast('服务器开小差了')
      else toast(e.message)
    } else {
      console.error(e)
    }
  }
}

function renderList(page) {
  const box = document.querySelector('#book-list')
  box.textContent = ''                              // ← 清空用 textContent，不用 innerHTML
  if (page.items.length === 0) {
    box.append(Object.assign(document.createElement('p'), { textContent: '没有数据' }))
    return
  }
  const frag = document.createDocumentFragment()
  for (const b of page.items) {
    const row = document.createElement('div')
    row.className = 'book-row'

    const title = document.createElement('span')
    title.textContent = b.title                     // ✅ 不会触发 XSS

    const price = document.createElement('span')
    price.textContent = `¥${Number(b.price).toFixed(2)}`

    const del = document.createElement('button')
    del.textContent = '删除'
    del.onclick = () => removeBook(b.id)

    row.append(title, price, del)
    frag.append(row)
  }
  box.append(frag)
}

async function removeBook(id) {
  if (!confirm('确定删除？')) return
  try {
    await http.del(`/books/${id}`)                  // 后端返回 204 → http.js 返回 null
    toast('已删除')
    loadBooks()
  } catch (e) {
    toast(e.status === 404 ? '这本书已经不存在了' : e.message)
  }
}

function toast(msg) {
  const el = document.querySelector('#toast') ?? document.body.appendChild(
    Object.assign(document.createElement('div'), { id: 'toast' }))
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 2500)
}
```

> **两个细节值得注意**：
> 1. `AbortController` 用来取消上一次请求——**搜索框连续输入时，不取消旧请求会导致"旧结果覆盖新结果"**
> 2. 全部用 `textContent` / `createElement` 而不是 `innerHTML`——**这是防 XSS 最有效的一条习惯**

## 3.4 开发 / 生产两种跑法（对照实验）

### 开发：Vite 代理（不需要 CORS）

```bash
# 终端 1
cd BookApi && dotnet run          # http://localhost:5003

# 终端 2
cd book-web && npm run dev        # http://localhost:5173
```

```js
// vite.config.js —— 有了这段，后端不配 CORS 也能跑
proxy: { '/api': { target: 'http://localhost:5003', changeOrigin: true } }
```

**验证**：浏览器访问 `http://localhost:5173`，Network 里请求 URL 是 `http://localhost:5173/api/books`（**不是 5003**）——说明代理生效。

### 对照实验：故意关掉代理，看 CORS 报错

注释掉 `proxy`，并把 `BASE` 改成 `http://localhost:5003`，你会看到：

```
Access to fetch at 'http://localhost:5003/api/books' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**然后打开后端 CORS 配置，再试** → 成功。

**这个实验做一遍，以后一辈子认得这个错。**

### 生产：发布前端 + Nginx 反代

```bash
cd book-web
npm run build          # 产物在 dist/

# 把 dist/ 拷到服务器 /var/www/bookapp
# 后端发布
cd BookApi
dotnet publish -c Release -o ./publish
dotnet publish/BookApi.dll --urls http://127.0.0.1:5003
```

```nginx
location /        { try_files $uri $uri/ /index.html; }
location /api/    { proxy_pass http://127.0.0.1:5003; proxy_set_header Host $host; }
```

**验证要点**：

| 检查 | 期望 |
|---|---|
| `https://www.example.com/api/books` | 返回 JSON（说明反代通） |
| 刷新 `https://www.example.com/books/5` | 不 404（说明 `try_files` 生效） |
| 响应头里 `Access-Control-Allow-Origin` | **不需要有这个头**（同源了） |
| 后端日志里的请求 | 有（说明 Nginx 转发了） |

## 3.5 排查清单（存下来，出问题照着走）

```
【现象】浏览器报 CORS
  ├─ 后端日志有请求吗？
  │   ├─ 没有 → 请求没发出去（预检失败 / https 重定向 / 端口错）
  │   └─ 有 → 看响应头
  │        ├─ 没有 Access-Control-Allow-Origin → UseCors 顺序或策略没生效
  │        └─ 有但值不对 → Origin 逐字符核对（localhost vs 127.0.0.1、http vs https）
  └─ 带 Cookie 了吗？
      ├─ 带了 → 后端必须 AllowCredentials + 具体 Origin（不能用 *）
      │        且 cookie 要 SameSite=None; Secure
      └─ 没带 → 只配 AllowAnyOrigin 就够

【现象】Unexpected end of JSON input
  └─ 204/205 响应调了 res.json() → 判断状态码

【现象】415
  └─ POST 少了 Content-Type: application/json

【现象】404 但 .http 能通
  ├─ 路径大小写（Linux 区分）
  ├─ 少了 /api 前缀（代理 rewrite 配错）
  └─ 前端带上了完整域名，绕过了代理

【现象】登录后下一个请求还是 401
  ├─ Authorization 头有没有带上（Network 看清楚）
  ├─ Bearer 后面有空格吗
  └─ 后端 UseAuthentication 在 UseAuthorization 之前吗

【现象】上线后接口全 404
  ├─ Nginx location /api/ 写成 /api（少了斜杠）
  ├─ proxy_pass 末尾多带了路径导致重复拼接
  └─ 前端 dist 里 BASE 还是 localhost
```

---

==四：总结==

## 4.1 三节核心结论

| # | 结论 | 一句话 |
|---|---|---|
| 1 | **跨域不是"请求失败"，是"响应被扣下"** | 后端日志有记录、状态码 200、但浏览器不给你的 JS 读 |
| 2 | **开发用代理，生产用反代** | 两者都让前后端"同源"，从根上不需要 CORS |
| 3 | **请求层必须收口** | baseURL、token、204、错误解析、401 跳转，一个文件解决 |

## 4.2 CORS 速查表

| 项 | 值 |
|---|---|
| 同源判定 | 协议 + 域名 + **端口** 三者全同 |
| 简单请求 | GET/HEAD/POST + 安全头 + Content-Type 仅三种（**JSON 不算**） |
| 预检 | `OPTIONS`，浏览器自动发，**不带 Cookie/Authorization** |
| 预检缓存 | `Access-Control-Max-Age`（Chrome 上限 7200 秒） |
| 带凭证 | 必须具体 Origin（**不能 `*`**）+ `AllowCredentials` |
| 前端 | `credentials: 'include'`（默认 `same-origin` 即跨域不带） |
| 中间件顺序 | `UseRouting` → `UseCors` → `UseAuthentication` → `UseAuthorization` |
| 自定义响应头 | 必须 `WithExposedHeaders` 才读得到 |

## 4.3 联调七连问（出问题按顺序问）

```
1. Network 里请求的 URL 是 5173 还是 5003？
2. 有没有 OPTIONS 请求？它成功了吗？
3. 后端日志里有这条请求吗？
4. 响应状态码是多少？
5. 响应头有 Access-Control-Allow-Origin 吗？值对得上吗？
6. 带了 Authorization 吗？Bearer 后有空格吗？
7. 是 204 却调了 res.json() 吗？
```

## 4.4 Token 存储对比

| 位置 | XSS | CSRF | 刷新不丢 | 建议 |
|---|---|---|---|---|
| `localStorage` | ☠️ 能偷 | ✅ 免疫 | ✅ | 学习项目可用 |
| `sessionStorage` | ☠️ 能偷 | ✅ 免疫 | 同标签页 | 一般 |
| 内存 | ⚠️ 较难 | ✅ 免疫 | ❌ 丢 | 配合 refresh token |
| `httpOnly` Cookie | ✅ 偷不到 | ☠️ 中招 | ✅ | 生产推荐 + CSRF 防护 |

## 4.5 记忆口诀

```
同源看三样：协议、域名、端口
跨域不拦请求，只拦你读响应
JSON 的 POST 一定走预检
带 Cookie 就不能用星号
UseCors 夹在 Routing 和 Authorization 中间

开发用代理，生产用反代
同源之后，CORS 自动消失

204 别 json()，POST 别忘 Content-Type
Bearer 后要有空格
```

## 4.6 六个高频易错点

| # | 易错点 | 正确做法 |
|---|---|---|
| 1 | `AllowAnyOrigin()` + `AllowCredentials()` | **运行时会抛异常**；改 `WithOrigins(...)` |
| 2 | `UseCors` 写在 `UseAuthorization` 后面 | 预检不带凭证 → 401，CORS 静默失效 |
| 3 | 前端 `credentials: 'include'` 但后端没 `AllowCredentials` | 响应头缺 `Allow-Credentials` |
| 4 | 204 调 `res.json()` | 判断 `status === 204` 返回 `null` |
| 5 | 生产环境残留 `ASPNETCORE_ENVIRONMENT=Development` | 详细异常页对外暴露堆栈 |
| 6 | 前端 `try_files` 没配 | 刷新任何非根路由都 404 |

## 4.7 你下一步可以做的三件事（把这一批变成自己的）

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 给自己的项目配好 Vite 代理，把 `fetch` 里的 `http://localhost:5003` 全删掉 | 开发期再也不会看到 CORS 报错 |
| 2 | 抄一份 `http.js` 进去，把现有请求都换掉 | 少写一堆重复代码，401/204 一次解决 |
| 3 | 故意注释掉代理跑一次，看 CORS 报错长什么样 | 以后一眼能认出这个错 |

## 4.8 留给下一批的问题（P117–P123 DI + 缓存）

1. 为什么 Controller 里注入 `BookDbContext` 是"每个请求一个"，而 `IMemoryCache` 是"全局一个"？
2. 缓存能省多少数据库压力？什么样的接口最该加缓存？
3. `Cache-Control` 的 `max-age`、`no-store`、`no-cache`、`private`、`public` 分别是什么语义？
4. 为什么"服务器端响应缓存"被老师说成"鸡肋"？
5. 内存缓存和分布式缓存，什么时候必须用后者？

**这五个问题是"能让接口跑得快"的开始。下一批进入缓存的完整体系。**


