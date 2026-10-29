==零：补充==

> **这一篇（P144–P149）回答一个问题：你的接口凭什么相信"来的人是谁"，又凭什么决定"他能不能干这件事"？**

## 它解决什么问题

**先看你现在的图书系统。** `BooksController` 里的 `[HttpDelete("{id}")]`，任何人拿到 URL 就能删书：

```bash
curl -X DELETE http://localhost:5003/api/books/1
# 200 OK，书没了
```

**这不是"还没做权限"，是"系统里根本不存在'人'这个概念"。** 你的数据库里有 `Book`、`Author`、`Category`，但没有任何一行记录能回答"你是谁"。

**这一批的六节，就是往系统里补上"人"：**

| 问题 | 这一批给的答案 | 对应节 |
|---|---|---|
| 用户怎么存？密码怎么写进数据库才安全？ | Identity 的 7 张表 + `PasswordHasher` | P144–P145 |
| 用户忘了密码怎么办？ | 重置令牌（加密、一次性、1 天过期） | P146 |
| 登录成功后，怎么让后续每个请求都"被认出来"？ | JWT（自包含的凭证） | P147–P148 |
| 认出来之后，怎么区分普通用户和管理员？ | `[Authorize(Roles=...)]` / Policy | P149 |

**没有这一批，你后面所有东西都做不了：**

- 做 DesktopPet 的聊天记录 → 不知道每条消息属于谁
- 做游戏服务端的存档 → 不知道存档该给谁
- 做后台管理 → 谁都能进
- 上线 → 端口一开，数据库等于公开

## 没有它会怎样

**大部分人第一反应是"自己写一个登录"。写出来通常长这样：**

```csharp
// ❌ 教科书级别的错误示范，但 90% 的人第一版就是这样
public bool Login(string name, string pwd)
{
    var user = db.Users.FirstOrDefault(u => u.Name == name);
    if (user == null) return false;
    return user.Password == Md5(pwd);     // ← 三个致命错误挤在一行
}
```

**这三处错误，每一处都能单独搞死一个项目：**

| 写法 | 错在哪 | 后果 |
|---|---|---|
| `user.Password == pwd`（或 `Md5(pwd)`） | MD5 是**为速度设计的**，一张消费级显卡每秒能算几百亿次 | 8 位以内的密码，彩虹表/暴力破解几小时内出结果 |
| 没有盐 | 相同密码 → 相同哈希 | 撞库：A 站的泄露库直接能登 B 站；而且一眼能看出"这两个人密码一样" |
| 单次哈希、无迭代 | 没有人为拉高单次验证成本 | 攻击成本永远不会上升 |

**这不是"注意安全"的层面，是"一旦泄露就是全责"的层面。** 国内《个人信息保护法》第 51 条明确要求采取加密、去标识化等安全技术措施，明文存密码属于违法。

**再看第二个坑——Session。** 你可能想："登录成功就 `Session["uid"]=1`，多简单。"

```
浏览器 ──(Cookie: ASP.NET_SessionId=abc)──> 服务器
                                             │
                                    内存里的字典
                                    abc → {uid:1}
```

| 场景 | Session 会怎样 |
|---|---|
| 部署两个实例做负载均衡 | 请求打到 B 实例，B 不认识 `abc` → 用户"随机掉线" |
| 服务重启 | 内存清空 → **所有人同时掉线** |
| 手机 App / Unity 客户端 | 没有 Cookie 这个概念 → 根本带不上 |
| 跨域（前后端分离，不同端口） | Cookie 受同源策略限制，要配 `SameSite`/`Credentials`，很容易配错 |

**JWT 就是为了干掉"服务端要记住谁登录过"这件事**：把所有需要的信息**写进凭证本身**，服务器只要验签，不需要查任何表。代价是"发出去的凭证收不回来"——这个代价我们 P151 再细算。

## 它在生态里的位置

**这一批最容易搞混的，是"Identity"和"JWT"到底是什么关系。它们不是二选一，是两个不同的层：**

```
┌─────────────────────────────────────────────────┐
│  第 3 层：授权（能不能干）                        │
│    [Authorize] / Roles / Policy                 │
│    ← 读 HttpContext.User 里的 Claims 做判断      │
├─────────────────────────────────────────────────┤
│  第 2 层：凭证怎么来回（你是谁）                  │
│    Cookie（服务端有状态）  或  JWT（自包含）      │
│    ← 一个字符串，每次请求带上来                    │
├─────────────────────────────────────────────────┤
│  第 1 层：用户数据怎么存                          │
│    Identity（AspNetUsers 等 7 张表）             │
│    ← 用户名、密码哈希、角色、锁定状态              │
└─────────────────────────────────────────────────┘
```

**所以下面四种组合都真实存在，都是对的：**

| 组合 | 用在哪 | 说明 |
|---|---|---|
| Identity + Cookie | 传统 MVC、后台管理页面 | 最常见，`AddIdentity` 默认就是这个 |
| Identity + JWT | 前后端分离、App、游戏客户端 | **这一批的重点**，注意 P145 那个 302 大坑 |
| 纯 JWT，不用 Identity | 用户数据在别的系统（比如已有账号中心） | JWT 只是格式，不依赖 Identity |
| 只用 Identity 的密码哈希 | 你只想借它的 `PasswordHasher` | 完全合法，可以只引一个包 |

> **一句话记住：Identity 管"人存在哪"，JWT 管"这次请求怎么证明是他"。`[Authorize]` 只是读结果做判断的裁判。**

## 对你的实际意义

**你要做游戏，这一批的价值比做网站大得多。**

**1. 客户端根本不是浏览器。** Unity / Godot 的 `UnityWebRequest` 里没有 Cookie 容器，你得自己管 `Set-Cookie`。而 JWT 就是一个字符串，`req.SetRequestHeader("Authorization", "Bearer " + token)` 一行搞定。**这不是"JWT 更先进"，是"只有它能在非浏览器环境里正常工作"。**

**2. 游戏服务端必然要多实例。** 一个区服一台机器，玩家跨服、匹配、排行榜都要跨进程。Session 在内存里，扩到第二台就废；JWT 每台机器拿同一个密钥就能独立验签，**不需要任何共享存储**。

**3. 断线重连。** 手游玩家切后台、地铁进隧道，回来要无感续上。用 Cookie 你得处理"cookie 过期但游戏还在跑"；用 JWT 你只要在客户端存好 token，过期前静默刷新。

**4. 一个反面教材也值得知道：** JWT 的 payload 是**明文**（下一节实测给你看）。把玩家金币数写进 token 是灾难——客户端能读也能改（改了就验签失败，但**能读**这件事本身就会泄露设计）。

## 什么时候其实用不上

**这一批内容很重，但它的适用范围比你想的窄。**

| 场景 | 建议 | 理由 |
|---|---|---|
| 单体 MVC + 只有浏览器访问 | **Identity + Cookie 就够，别上 JWT** | JWT 要自己管过期、刷新、存储位置（localStorage 有 XSS 风险），纯增负担 |
| 内网小工具、给自己用的脚本 | **别做登录** | 加个固定 API Key 头，20 行搞定 |
| 用户量 < 10 的后台 | **HTTP Basic Auth 都够** | 别为了"正规"上一整套 |
| 用户数据在微信/QQ 登录体系里 | **看 OAuth2，不是自己存密码** | 你只需要拿 openid，不需要 `AspNetUsers` 那 15 个字段 |
| 需要"立刻踢人下线"的功能 | **JWT 天生做不到，必须有额外机制** | 这是 P151 的主题，别指望这一批解决 |

**判断标准：你的客户端里有没有浏览器？**

- 有 → Cookie 优先，省事
- 没有（App / Unity / 小程序 / 第三方调用） → JWT

---

==一：概念==

## P144 · 1. 认证（Authentication）和授权（Authorization）是两件事

**这两个词在中文里都翻成"权限"，但在框架里是两个完全独立的环节，写错一个就会得到很奇怪的现象。**

| | 认证 Authentication | 授权 Authorization |
|---|---|---|
| 回答的问题 | **你是谁？** | **你能干什么？** |
| 输入 | 请求里的凭证（Cookie / Bearer token） | `HttpContext.User`（认证的产物） |
| 输出 | `HttpContext.User`（一个 `ClaimsPrincipal`） | 放行 or 401/403 |
| 对应的中间件 | `app.UseAuthentication()` | `app.UseAuthorization()` |
| 对应特性 | （无） | `[Authorize]` |
| 失败返回 | 401 Unauthorized | 403 Forbidden |

**顺序不能反：**

```csharp
app.UseAuthentication();   // 先认人：把 token 解析成 User
app.UseAuthorization();    // 再判权：读 User 决定放不放
```

**反了会怎样？** `UseAuthorization` 跑的时候 `User` 还是个空对象（`IsAuthenticated=false`），于是**所有带 `[Authorize]` 的接口全部 401**，即使你带了合法 token。这个错误没有编译警告，只有运行时"怎么都不通"。

**`ClaimsPrincipal` 是什么（第一次出现，必须解释）：**

```csharp
public class ClaimsPrincipal : IPrincipal
{
    public IList<ClaimsIdentity> Identities { get; }   // 一个人可以有多个身份（多张证件）
    public ClaimsIdentity? Identity { get; }           // 最常用的那个
    public IEnumerable<Claim> Claims { get; }          // 所有身份的所有条目摊平
    public bool IsInRole(string role);
}

public class ClaimsIdentity : IIdentity
{
    public string? Name { get; }
    public bool IsAuthenticated { get; }
    public string NameClaimType { get; }               // 哪个 Claim 算"名字"
    public string RoleClaimType { get; }               // 哪个 Claim 算"角色"
    public IEnumerable<Claim> Claims { get; }
}

public class Claim
{
    public string Type { get; }    // 条目的"字段名"，如 "role" / "sub"
    public string Value { get; }   // 条目的"值"，如 "admin"
}
```

**用 C# 的直觉翻译：**

- `Claim` ≈ 一行键值对（像 `Dictionary<string,string>` 的一项）
- `ClaimsIdentity` ≈ 一张证件（护照/工牌），里面有若干条目
- `ClaimsPrincipal` ≈ 一个人，身上可以挂多张证件

**为什么框架要搞这么复杂，而不是直接给你一个 `User` 实体？**

因为认证来源可能不止一个：你可能同时支持"账号密码"和"微信登录"，一个人身上就挂了两张证件。而且**授权层不需要认识你的 `User` 实体**——它只需要"条目"。这个解耦让你换用户表结构时，授权代码一行都不用改。

---

## P144 · 2. 密码到底该怎么存：`PasswordHasher` 拆开看

**核心认知先立住：密码不是"加密"存储，是"哈希"存储。**

| | 加密 Encrypt | 哈希 Hash |
|---|---|---|
| 可逆吗 | 可逆（有密钥就能解回来） | 不可逆（数学上单向） |
| 验证方式 | 解密后比对 | 用同样算法算一遍，比对结果 |
| 泄露后果 | 攻击者拿到密钥 → 全部明文 | 攻击者拿到哈希 → 还得爆破 |

**为什么不加密？** 因为只要存了可逆的东西，你的系统里就必然存在"能还原用户密码的人/代码"。**你自己都不该有能力知道用户的密码。**

**但"哈希"也不够，还得加两味：盐（salt）和迭代（iteration）。**

| 措施 | 解决什么 | 不加会怎样 |
|---|---|---|
| 盐：每个用户一个随机串，和密码一起哈希 | 相同密码不产生相同哈希 | 撞库、批量识别同密码用户、彩虹表直接命中 |
| 迭代：把哈希函数跑 10 万次 | 拉高单次验证成本 | 攻击者用 GPU 每秒算几百亿次，8 位密码几小时破 |

**Identity 的 `PasswordHasher<TUser>` 就是这三件事的封装。实测它的输出：**

```csharp
var hasher = new PasswordHasher<IdentityUser>();
var u = new IdentityUser("probe");
var h1 = hasher.HashPassword(u, "abc123");
var h2 = hasher.HashPassword(u, "abc123");   // 同一个密码，再哈希一次
```

```
h1 = "AQAAAAIAAYagAAAAELyYIB2ZwAkNdTSJdTBFofpXIMSCYv/ovmTJ2m9reomPiFR3f3BlyAjPuDbfPz0Ehg=="
长度        = 84 字符
两次是否相同 = false        ← 相同的密码，哈希值不同（盐是随机的）
Base64 解码后 = 61 字节
第一字节     = 0x01        ← 格式版本号 v3
```

**这 61 个字节不是乱码，是有严格结构的。拆开看：**

| 偏移 | 长度 | 内容 | 实测值 |
|---|---|---|---|
| 0 | 1 | 格式版本 | `0x01`（v3） |
| 1 | 4 | PRF 算法标识（大端） | `0x00000002` = HMAC-SHA512 |
| 5 | 4 | 迭代次数 | `0x000186A0` = **100000** 次 |
| 9 | 4 | 盐长度 | `0x00000010` = 16 字节 |
| 13 | 16 | 盐（随机） | （每次不同） |
| 29 | 32 | 子密钥（= 哈希结果） | （32 字节 = 256 位） |

**1 + 4 + 4 + 4 + 16 + 32 = 61 字节**，正好对上实测。**注意迭代次数是 10 万次**——这就是"验证一次密码"要花几十毫秒的原因，也是攻击者成本被拉高的原因。

> **`IdentityUser` 是什么（第一次出现）：** 就是默认的用户实体类，带 `Id`（`string`，GUID）、`UserName`、`NormalizedUserName`、`PasswordHash`、`Email`、`SecurityStamp` 等 15 个属性。你完全可以自己写一个 `class MyUser : IdentityUser` 加字段（比如加 `Nickname`、`Gold`），Identity 全程用泛型 `TUser` 支持这件事。

**验证时的三态返回，`PasswordVerificationResult`：**

```csharp
public enum PasswordVerificationResult
{
    Failed,                 // 密码不对
    Success,                // 密码对，哈希格式也是当前版本
    SuccessRehashNeeded     // 密码对，但哈希是旧格式（比如你调高了迭代次数）
}
```

**实测：**

```
VerifyHashedPassword(u, h1, "abc123")  →  Success
VerifyHashedPassword(u, h1, "abc123x") →  Failed
```

**`SuccessRehashNeeded` 是给"升级算法"留的后门。** Identity 官方推荐的做法是：登录成功且返回这个值时，用新密码重新 `HashPassword` 存回去。这样你能无感地把全站密码从 v2 升级到 v3，用户完全不知道。

```csharp
// ✅ 官方推荐写法
var result = hasher.VerifyHashedPassword(user, user.PasswordHash!, inputPwd);
if (result == PasswordVerificationResult.SuccessRehashNeeded)
{
    user.PasswordHash = hasher.HashPassword(user, inputPwd);
    await userManager.UpdateAsync(user);      // 静默升级
}
```

---

## P144 · 3. Identity 到底是什么：7 张表 + 一个门面

**很多人以为 Identity 是个"库"或者"中间件"，其实它是两样东西：**

1. **一套表结构**（数据放哪）
2. **一组 Manager 类**（怎么操作这套表）

**实测：跑一次 `EnsureCreated()` 之后，数据库里多出来的表：**

```
AspNetUsers          ← 用户
AspNetRoles          ← 角色
AspNetUserRoles      ← 用户↔角色（多对多中间表）
AspNetUserClaims     ← 用户的额外条目（比如 "level=99"）
AspNetRoleClaims     ← 角色自带的条目（比如 "perm=delete_book"）
AspNetUserLogins     ← 第三方登录（微信/Google 的 openid 绑在这）
AspNetUserTokens     ← 外部令牌（比如刷新令牌）
```

**`AspNetUsers` 的 15 个列，逐个说清楚（这是你以后一定会去翻的表）：**

| 列名 | 类型 | 作用 | 不写会怎样 |
|---|---|---|---|
| `Id` | `string`(GUID) | 主键 | — |
| `UserName` | `string?` | 登录名（**可以重复大小写**，`Tom` 和 `tom` 是两个不同字符串） | — |
| `NormalizedUserName` | `string?` | 统一转大写后的名字（实测 `tom` → `TOM`） | 无法做"大小写不敏感"的唯一约束和查询 |
| `Email` / `NormalizedEmail` | `string?` | 同上 | — |
| `EmailConfirmed` | `bool` | 邮箱是否验证过 | 无法做"未验证邮箱不能下单" |
| **`PasswordHash`** | `string?` | 上面那 84 个字符 | — |
| **`SecurityStamp`** | `string?` | 随机串，**改密码/改角色时会变** | 旧凭证永不过期，改密码踢不掉别人 |
| `ConcurrencyStamp` | `string?` | 乐观并发令牌（EF Core 用它防覆盖） | 两个管理员同时改同一用户，后写的静默覆盖先写的 |
| `PhoneNumber` / `PhoneNumberConfirmed` | | 同上 | — |
| `TwoFactorEnabled` | `bool` | 是否开了二步验证 | — |
| **`LockoutEnd`** | `DateTimeOffset?` | 锁定到这个时间点为止 | 无法防暴力破解 |
| `LockoutEnabled` | `bool` | 是否允许被锁（**默认 true**） | — |
| **`AccessFailedCount`** | `int` | 连续失败次数 | 无法触发锁定 |

**`SecurityStamp` 是这一批最重要的一个字段，先记住它，P146 会用它解释"为什么重置令牌只能用一次"，P151 会用它解释"怎么实现踢人下线"。**

**实测数据（`tom` 这一行）：**

```
Id              = ee2ae963-...（GUID）
UserName        = tom
NormalizedUserName = TOM
PasswordHash    = AQAAAAIAAYagAAAAEEQ5qOGGbGxLIr0z/OplbZYiC83EbS8RWdOT7paf4/F0yillJ31QbCGg5iBvRF3TgQ==
SecurityStamp   = RQ7Z2BBVTCLE5EN2NZP7P2DZIIQTXPIC     ← 32 位随机串
AccessFailedCount = 0
LockoutEnd      = null
```

**为什么要 `NormalizedUserName` 这个冗余列？**

因为 SQL Server / SQLite 的默认排序规则不一定大小写不敏感（尤其跨数据库移植时）。Identity 的做法是：**存两份，查询时查归一化那一份**。

```csharp
// Identity 内部实际做的事（简化）
var normalized = userName.ToUpperInvariant();     // 代价：每次查询都转一次
var user = await users.FirstOrDefaultAsync(u => u.NormalizedUserName == normalized);
```

`FindByNameAsync("tom")` 和 `FindByNameAsync("TOM")` 都能查到同一个人，就是这个列在起作用。**代价是：你自己写 SQL 改用户表时，如果只改了 `UserName` 没改 `NormalizedUserName`，登录就查不到了。**

**`IdentityDbContext<TUser>` 又是什么（第一次出现）：**

```csharp
public class IdentityDbContext<TUser> : IdentityDbContext<TUser, IdentityRole, string>
    where TUser : IdentityUser
{ }
```

**它是 EF Core 的 `DbContext` 子类，把上面 7 张表全部配好了**（主键、索引、外键、列名）。你的 `AppDbContext` 只要继承它，一行 `DbSet` 都不用写：

```csharp
public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> o) : base(o) { }

    // 你自己的表照常加
    public DbSet<Book> Books => Set<Book>();
}
```

**不继承它会怎样？** 你得自己写 7 个实体类 + `OnModelCreating` 里几十行配置，而且**很容易漏掉唯一索引**（比如 `NormalizedUserName` 的唯一约束），导致能注册出两个 `tom`。

**最后，这套表从哪来——迁移还是 `EnsureCreated`？**

| 方式 | 适用 | 注意 |
|---|---|---|
| `EnsureCreated()` | 实验、临时项目 | **不能和迁移混用**，且不支持后续结构变更 |
| `dotnet ef migrations add xxx` | 正经项目 | 用它，表的索引约束才完整落库 |

```bash
# 正经项目：加迁移（你的图书系统应该用这个）
dotnet ef migrations add AddIdentity -p Infra -s Web
dotnet ef database update -p Infra -s Web
```

> **⚠️ 一个你的项目马上会遇到的问题：** 你现在的 `Book` 实体里如果打算存"谁创建的"，别用 `IdentityUser.Id` 当外键硬编码。用 `string CreatorId` + 导航属性，而且 `IdentityDbContext` 的 `Id` 是 `string`，你的 `Book.Id` 是 `long`，别搞混。

---

## P145 · 4. 注册方式：`AddIdentity` 会把你的 JWT 抢走（实测 302 大坑）

**这一节是我实测踩出来的，教程视频里未必讲，但你一定会撞上。**

**先看两种注册 API 的差别：**

```csharp
// 写法 A：给"浏览器 + 页面"的项目用
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options => { /* 密码规则 */ })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// 写法 B：给"纯 API + JWT"的项目用
builder.Services.AddIdentityCore<IdentityUser>(options => { /* 密码规则 */ })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders()
    .AddSignInManager();     // 需要 SignInManager 时再加
```

**它们到底差在哪？逐个拆：**

| 方法 | 注册了什么 | 有没有 Cookie 方案 |
|---|---|---|
| `AddIdentity<TUser,TRole>` | `UserManager` + `RoleManager` + `SignInManager` + **三套 Cookie 方案**（`Identity.Application` / `.External` / `.TwoFactorUserId`） | ✅ 有 |
| `AddIdentityCore<TUser>` | **只有** `UserManager`（和一堆校验器） | ❌ 没有 |
| `.AddRoles<TRole>()` | 补上 `RoleManager`（`AddIdentityCore` 不带） | — |
| `.AddSignInManager()` | 补上 `SignInManager` | — |
| `.AddEntityFrameworkStores<TContext>()` | 把"存哪"接到你的 `DbContext` | — |
| `.AddDefaultTokenProviders()` | 注册重置密码/邮箱验证的令牌生成器 | — |

**`AddDefaultTokenProviders()` 漏了会怎样？** 这是个纯运行时的坑，编译完全通过，启动也正常，直到用户点"忘记密码"：

```
System.NotSupportedException: No IUserTwoFactorTokenProvider<IdentityUser>
named 'Default' is registered.
   at Microsoft.AspNetCore.Identity.UserManager`1.GenerateUserTokenAsync(...)
```

**实测确认：`AddIdentity` 不会自动帮你加这一行。** 必须自己写。（模板项目里之所以有，是脚手架生成的，不是框架默认。）

**接下来是真正的大坑。我按"看起来最自然"的方式写：**

```csharp
// ❌ 看起来完全合理，实测失败
builder.Services.AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)   // ← 单参数版本
    .AddJwtBearer(o => { o.TokenValidationParameters = /* ... */ });
```

**实测结果（带一个完全合法的 JWT 请求 `/jwt/me`，该端点有 `[Authorize]`）：**

```
无 token   → HTTP 302，Location: http://localhost:5100/Account/Login?ReturnUrl=%2Fjwt%2Fme
有 token   → HTTP 302，Location: http://localhost:5100/Account/Login?ReturnUrl=%2Fjwt%2Fme
```

**带了合法 token 也跳登录页。** 302 是 Cookie 方案的行为（未登录 → 重定向到登录页），说明**请求根本没走 JWT 方案**。

**为什么？看 `AddAuthentication` 两个重载的实现差别：**

```csharp
// 重载 1：单参数
public static AuthenticationBuilder AddAuthentication(this IServiceCollection services, string defaultScheme)
    => services.AddAuthentication(o => o.DefaultScheme = defaultScheme);
```

它只设了 `DefaultScheme`。而 `AddIdentity` 内部设的是另外三个：

```csharp
// AddIdentity 内部（简化）
services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = IdentityConstants.ApplicationScheme;   // ← Cookie
    options.DefaultChallengeScheme   = IdentityConstants.ApplicationScheme;    // ← Cookie
    options.DefaultSignInScheme      = IdentityConstants.ExternalScheme;
})
.AddCookie(IdentityConstants.ApplicationScheme)
.AddCookie(IdentityConstants.ExternalScheme)
.AddCookie(IdentityConstants.TwoFactorUserIdScheme);
```

**而框架选方案的优先级是：**

```
DefaultAuthenticateScheme（Identity 设的 Cookie）
        ↓ 为 null 才看
DefaultScheme（你设的 Bearer）
```

**`DefaultAuthenticateScheme` 不为 null，所以 `DefaultScheme` 被完全忽略。** 你的 JWT 方案注册了，但**永远不会被默认选中**。

**`AuthenticationOptions` 这几个属性的含义，一张表：**

| 属性 | 什么时候用 | 不设的后果 |
|---|---|---|
| `DefaultScheme` | 兜底 | 三者都没设时用它 |
| `DefaultAuthenticateScheme` | **解析请求、构建 `User`** 时用 | 落到 `DefaultScheme` |
| `DefaultChallengeScheme` | 未认证要拒绝时用（决定返回 401 还是 302） | 落到 `DefaultScheme` |
| `DefaultForbidScheme` | 已认证但无权时用（决定 403 的写法） | 落到 `DefaultScheme` |
| `DefaultSignInScheme` | `SignInAsync` 写凭证时用 | 落到 `DefaultScheme` |

**解法一：显式覆盖三个（保留 `AddIdentity`）：**

```csharp
builder.Services.AddAuthentication(o =>
{
    o.DefaultScheme           = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme  = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o => { /* ... */ });
```

**实测改成这样之后：**

```
/jwt/me      无 token          → 401   （不再是 302）
/jwt/me      垃圾 token        → 401
/jwt/me      合法 token        → 200
```

**解法二（更推荐）：纯 API 项目就别让 Cookie 进来。**

```csharp
builder.Services.AddIdentityCore<IdentityUser>(o => { /* 密码规则 */ })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)   // 这时候单参数就够了
    .AddJwtBearer(o => { /* ... */ });
```

**为什么这时候单参数就够了？** 没有 `AddIdentity` 去设 `DefaultAuthenticateScheme`，`DefaultScheme` 就是唯一答案。

**怎么记：**

> **`AddIdentity` 是给"浏览器要看登录页"的项目准备的。你是纯 API，用 `AddIdentityCore`。**
> **只要你在项目里看见 `AddIdentity` + `AddJwtBearer` 同时出现，就必须检查 `DefaultAuthenticateScheme`。**

---

## P145 · 5. `UserManager` / `SignInManager` / `RoleManager`：三把钥匙，别拿错

**这三个类名字很像，职责边界却是硬边界。用错不会报错，只会"功能悄悄不生效"——这是最恶心的一类 bug。**

| 类 | 管什么 | 典型方法 | 泛型参数 |
|---|---|---|---|
| `UserManager<TUser>` | **用户数据本身**：增删改查、密码哈希、加角色、生成令牌 | `CreateAsync` / `FindByNameAsync` / `CheckPasswordAsync` / `AddToRoleAsync` / `AddPasswordAsync` | `UserManager<IdentityUser>` |
| `SignInManager<TUser>` | **"登录"这个动作**：写 Cookie、累计失败次数、锁定、二步验证 | `PasswordSignInAsync` / `CheckPasswordSignInAsync` / `SignOutAsync` | `SignInManager<IdentityUser>` |
| `RoleManager<TRole>` | **角色表**：建角色、角色是否存在、角色的 Claims | `CreateAsync` / `RoleExistsAsync` / `AddClaimAsync` | `RoleManager<IdentityRole>` |

**关键区别：`UserManager` 只看"数据对不对"，`SignInManager` 才管"这次登录行不行"。**

**实测证明（这条很重要，很多人以为 `CheckPasswordAsync` 会触发锁定）：**

先只用 `UserManager.CheckPasswordAsync` 连错 3 次：

```
第1次错密码: { ok: false, accessFailed: 0, lockoutEnd: null }
第2次错密码: { ok: false, accessFailed: 0, lockoutEnd: null }
第3次错密码: { ok: false, accessFailed: 0, lockoutEnd: null }
```

**`AccessFailedCount` 始终是 0，永远不锁定。** 它只回答"这个密码对不对"，不负责风控。

再换成 `SignInManager.CheckPasswordSignInAsync(user, pwd, lockoutOnFailure: true)`：

```
第1次错密码: { succeeded: false, isLockedOut: false, accessFailed: 1 }
第2次错密码: { succeeded: false, isLockedOut: false, accessFailed: 2 }
第3次错密码: { succeeded: false, isLockedOut: true,  accessFailed: 0 }   ← 达到上限，锁定！
第4次错密码: { succeeded: false, isLockedOut: true,  accessFailed: 0 }
```

**注意第 3 次的两个变化：** `IsLockedOut` 变 `true`，同时 `AccessFailedCount` **被清零**（因为已经锁了，继续累加没意义）。

**锁定期内用正确密码呢？**

```
SignInManager 登录（正确密码）      → { succeeded: false, isLockedOut: true }
UserManager.CheckPasswordAsync（正确密码） → { ok: true, lockoutEnd: "2026-10-29T15:36:56Z" }
```

**这就是那个会要命的组合：** 如果有人自己写登录接口、只用 `CheckPasswordAsync` 判密码，**他的系统里锁定机制形同虚设**——密码对了就放行，压根不看 `LockoutEnd`。

**✅ 正确姿势（自己写 API 登录接口时）：**

```csharp
[HttpPost("login")]
public async Task<IActionResult> Login(LoginDto dto)
{
    var user = await _userManager.FindByNameAsync(dto.UserName);
    if (user == null) return Unauthorized("用户名或密码错误");   // 别提示"用户不存在"

    // 关键：lockoutOnFailure: true —— 累计失败次数 + 到阈值就锁
    var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

    if (result.IsLockedOut)
        return StatusCode(423, "账号已锁定，请 5 分钟后再试");    // 423 Locked
    if (!result.Succeeded)
        return Unauthorized("用户名或密码错误");

    return Ok(new { token = IssueJwt(user) });
}
```

**三个设计细节解释一下：**

| 写法 | 为什么 |
|---|---|
| 用户不存在也返回"用户名或密码错误" | 否则接口变成"用户名枚举器"：攻击者能批量试出哪些用户名存在 |
| `lockoutOnFailure: true` 必须显式传 | 默认是 `false`，不传就永远不锁 |
| 锁定返回 423 而不是 401/403 | `423 Locked` 是 WebDAV 的语义扩展，业界通用；401 会让客户端自动弹登录框 |

**`IdentityResult` 是什么（第一次出现，你会天天见到它）：**

```csharp
public class IdentityResult
{
    public bool Succeeded { get; }
    public IEnumerable<IdentityError> Errors { get; }   // Code + Description
    public static IdentityResult Success { get; }
    public static IdentityResult Failed(params IdentityError[] errors);
}
```

**它不用异常来表示失败，而是返回一个"结果对象"。** 因为"密码太短"不是程序错误，是正常的业务分支。

**实测 `CreateAsync` 的返回（密码 `abc`，规则里设了最短 6 位 + 必须含数字）：**

```json
{
  "succeeded": false,
  "errors": [
    { "code": "PasswordTooShort", "description": "Passwords must be at least 6 characters." },
    { "code": "PasswordRequiresDigit", "description": "Passwords must have at least one digit ('0'-'9')." }
  ]
}
```

**注意它一次把**所有**违规项都报出来了，不是遇到第一个就返回。** 所以前端可以直接遍历 `Errors` 显示成列表，不需要反复提交试错。

**常用错误码对照（写前端提示时用得上）：**

| `Code` | 触发条件 |
|---|---|
| `PasswordTooShort` | 长度 < `RequiredLength`（默认 6） |
| `PasswordRequiresDigit` | 没有数字 |
| `PasswordRequiresUpper` / `Lower` | 没有大写 / 小写 |
| `PasswordRequiresNonAlphanumeric` | 没有符号 |
| `PasswordRequiresUniqueChars` | 不同字符种类不够 |
| `DuplicateUserName` | 用户名已存在 |
| `DuplicateEmail` | 邮箱已存在 |
| `InvalidUserName` | 含非法字符（默认只允许字母数字和 `-._@+`） |

**改密码规则的完整选项（放 `AddIdentity`/`AddIdentityCore` 的 lambda 里）：**

```csharp
builder.Services.AddIdentityCore<IdentityUser>(o =>
{
    o.Password.RequiredLength = 6;
    o.Password.RequireDigit = true;
    o.Password.RequireUppercase = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireNonAlphanumeric = false;
    o.Password.RequiredUniqueChars = 1;

    o.Lockout.MaxFailedAccessAttempts = 3;                       // 默认 5
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);  // 默认 5 分钟
    o.Lockout.AllowedForNewUsers = true;

    o.User.RequireUniqueEmail = false;        // 默认 false，改成 true 就要查重邮箱
    o.SignIn.RequireConfirmedEmail = false;   // true 时未验证邮箱不能登录
});
```

> **⚠️ 注意 `RequireUniqueEmail = true` 的坑：** 它对**空邮箱**不生效，但如果你允许用户不填邮箱，最好别开这个开关（否则多个 `null` 邮箱会不会冲突取决于数据库的 NULL 唯一性语义，SQL Server 允许多个 NULL，SQLite 也允许，但这个是靠运气而非设计）。

---

## P146 · 6. 密码重置：一个只能用一次的加密字符串

**这一节看着简单（发个邮件、点链接、改密码），但它是"不泄露账号存在性"和"防止令牌被复用"两个安全要求的交汇点。**

**完整流程先摆出来，每一步都标出"为什么不这么做会出事"：**

```
① 用户提交邮箱/用户名
        ↓  ← 不管账号存不存在，都返回"已发送"（防账号枚举）
② 服务端生成令牌
        ↓
③ 拼成链接发邮件：https://xxx/reset?uid=xxx&token=<令牌>
        ↓
④ 用户点链接，前端把 uid + token + 新密码 提交回来
        ↓
⑤ 服务端校验令牌 + 改密码
        ↓  ← 改密码会变 SecurityStamp，令牌自动失效
⑥ 令牌作废（同一个令牌不能再改第二次）
```

**② 的令牌长什么样？实测：**

```csharp
var token = await userManager.GeneratePasswordResetTokenAsync(user);
```

```
token   = "CfDJ8KWJRn0hqLRPm13wLPN8hs7TOb+hE2KZCZZSWQwWicBkzi2XILbxs0hgdicTxu
           lZlrwNZrMkGH+cMcp4Na9ETJTPB6xcBiAEa8yG8e8kvsqT8GIkI4MwQOUlPkrcQHkl2
           VsLbOgvj3F2l+zk2Z5ixGJi68wlxGKTpuRSVG1cdNTMi5iCMpOmhHXo98+NR4H5TCAO
           gGVdfKlrbehmEZQjV0VjcqRqG1AKE1ZI5mVSr+Lx"
长度     = 240 字符
开头     = CfDJ8
URL 安全 = false      ← 里面有 "+"，直接塞进 query string 会被解析成空格
```

**`CfDJ8` 这个开头不是随机的，它是 ASP.NET Core Data Protection 的魔数（magic header）**，二进制是 `09 F0 C9 F0`，Base64 之后正好在开头形成 `CfDJ8`。

**也就是说：这个令牌不是"随机字符串"，是 Data Protection 加密后的密文。** 解开之后的明文是：

```
<用户Id>:<用途标识>:<当时的 SecurityStamp>
```

| 部分 | 作用 | 缺了会怎样 |
|---|---|---|
| 用户 Id | 指明给谁重置 | 得靠前端传 uid，前端能篡改 |
| 用途标识 | 区分"重置密码"/"验证邮箱"/"二步验证" | 邮箱验证令牌能拿来重置密码 |
| `SecurityStamp` | **绑定"生成令牌那一刻的账号状态"** | 令牌永不作废，泄露一次终身可用 |
| 过期时间 | 由 Data Protection 的时间戳机制保证 | 令牌永久有效 |

**"绑定 SecurityStamp"是这一节的核心机制，它顺便解决了三个问题：**

1. **令牌只能用一次** —— 改完密码 `SecurityStamp` 变了，令牌解密后比对不上
2. **改密码后，其他设备上的"忘记密码"链接自动失效**
3. **管理员手动重置（也是改密码）能让所有在途令牌失效**

**实测证明"只能用一次"：**

```
第一次重置（token=同一个）  → { succeeded: true }
第二次重置（token=同一个）  → { succeeded: false, errors: [{ code: "InvalidToken" }] }
用新密码登录                → { ok: true }
用旧密码登录                → { ok: false }
```

**`SecurityStamp` 的变化也实测到了：**

```
重置前：BYFAADN34FJMWRQPN72G6HGM2ZSRVBY2
重置后：RQ7Z2BBVTCLE5EN2NZP7P2DZIIQTXPIC     ← 变了
```

**③ 那一步的坑：令牌必须 URL 编码。**

```csharp
// ❌ 错：令牌里的 "+" 在 query string 里会被解码成空格，验证时必然 InvalidToken
var link = $"https://xxx/reset?uid={user.Id}&token={token}";

// ✅ 对：先转成 URL 安全的形式
var safeToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
var link = $"https://xxx/reset?uid={user.Id}&token={safeToken}";
```

**收到的端要先还原：**

```csharp
var rawToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(safeToken));
```

**`WebEncoders` 是什么（第一次出现）：** `Microsoft.AspNetCore.WebUtilities` 里的静态工具类，做 Base64 ↔ Base64Url 的转换。它做的事就是三个字符替换 + 去填充：

| 步骤 | 普通 Base64 | Base64Url |
|---|---|---|
| 字符 62 | `+` | `-` |
| 字符 63 | `/` | `_` |
| 末尾填充 | `=` | 去掉 |

**为什么不直接 `UrlEncode(token)`？** 也可以，`UrlEncoder.Default.Encode(token)` 会把 `+` 变成 `%2B`，能工作但字符串会变长（每个 `+` 变三个字符）。`Base64UrlEncode` 更短，且不依赖接收方正确解码。

> **为什么不用 `HttpUtility.UrlEncode`？** 因为在 query string 场景它会把空格编码成 `+`，而 `+` 在 query 里又被解码成空格，遇到本来就含 `+` 的 Base64 会双重歧义。**用 `WebEncoders`，别自己拼。**

**⑤ 校验并重置的完整代码：**

```csharp
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
{
    var user = await _userManager.FindByIdAsync(dto.UserId);
    if (user == null) return BadRequest("链接无效");       // 别提示"用户不存在"

    var rawToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
    var result = await _userManager.ResetPasswordAsync(user, rawToken, dto.NewPassword);

    if (!result.Succeeded)
        return BadRequest(result.Errors.Select(e => e.Description));   // 通常是 InvalidToken

    return Ok("密码已重置，请重新登录");
}
```

**`ResetPasswordAsync` 内部做了三件事（知道这个才能排查故障）：**

1. 用 `VerifyUserTokenAsync` 验证令牌（解密 → 比对用途 → 比对 `SecurityStamp` → 查过期）
2. 用 `PasswordHasher` 生成新哈希，写进 `PasswordHash`
3. **调用 `UpdateSecurityStampAsync`** —— 这就是"令牌作废"和"旧登录失效"的根源

**默认有效期是 1 天**（`DataProtectionTokenProviderOptions.TokenLifespan = TimeSpan.FromDays(1)`）。想改：

```csharp
builder.Services.Configure<DataProtectionTokenProviderOptions>(o =>
{
    o.TokenLifespan = TimeSpan.FromHours(2);     // 2 小时，更安全
});
```

**三个必须知道的边界：**

| 情况 | 结果 |
|---|---|
| 令牌过期 | `InvalidToken`（不是专门错误码，和"被复用"无法区分） |
| 令牌被复用 | `InvalidToken` |
| 令牌被篡改一个字符 | `InvalidToken`（DataProtection 解密失败） |
| 用户改密码后又生成一个新令牌 | 新令牌有效，旧令牌无效（因为都基于当前 SecurityStamp） |

> **📌 邮箱验证用的是同一套机制：** `GenerateEmailConfirmationTokenAsync` + `ConfirmEmailAsync`，原理一模一样（也绑 `SecurityStamp`）。区别只是"用途标识"不同，所以**邮箱验证令牌不能拿来重置密码**。

---

## P147 · 7. JWT 是什么：把"身份证"发给你自己保管

**先把 Session 的模型和 JWT 的模型并排放：**

```
【Session：服务端记账】
  客户端只拿一个"账号"。            服务端有一本账。
  ┌────────┐                    ┌──────────────────────┐
  │ abc123 │ ────────────────>  │ abc123 → {uid:1}     │
  └────────┘                    │ def456 → {uid:2}     │  ← 每次请求都要查这本账
                                └──────────────────────┘

【JWT：自包含凭证】
  客户端拿一整张"证件"，上面写满信息。  服务端不记账，只验章。
  ┌──────────────────────────────────────────┐
  │ {"sub":"tom","role":"admin","exp":...}   │ ───────>  验签（不用查库）
  │ + 服务端私章的签名                         │
  └──────────────────────────────────────────┘
```

**JWT = JSON Web Token，格式是三段 Base64Url 用点号连接：**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiJ0b20iLCJ1aWQiOiIxMDAxIiwi... . Rx477UqOH-YMs9Hggx7w5ZHWB1gNU7NGkfEeMv35WQk
└──────────── Header ────────────┘   └──────────── Payload ─────────────┘   └──────────── Signature ────────────┘
```

**实测：我把这三段分别解码（不验签，纯解码）：**

```json
// Header（36 字符）
{"alg":"HS256","typ":"JWT"}

// Payload（105 字节）
{"sub":"tom","uid":"1001","role":"admin","nbf":1793287284,"exp":1793288004,"iss":"auth","aud":"client"}

// Signature（43 字符 = 32 字节 HMAC-SHA256 结果）
Rx477UqOH-YMs9Hggx7w5ZHWB1gNU7NGkfEeMv35WQk
```

**⚠️ 这一段是整篇最需要记住的：Payload 是明文。**

**任何人拿到 token，复制粘贴到 [jwt.io](https://jwt.io) 或跑三行代码，就能看到里面所有内容。** 不需要密钥、不需要破解、不需要"攻击"。

| 误解 | 事实 |
|---|---|
| "JWT 是加密的" | ❌ **不是**。只是 Base64Url 编码，等同于不编码 |
| "放在 token 里就安全了" | ❌ 你的用户自己就能读到 |
| "签名能防篡改所以能放敏感数据" | ❌ 签名防**改**，不防**读** |

**所以这三类东西绝对不能放进 JWT：**

- 密码、密码哈希
- 身份证号、手机号（除非你确定要暴露给客户端）
- 任何"用户知道了会不开心"的业务数据

**签名保证的是什么？** 保证"这个 payload 确实是持有密钥的服务端发出的，且一个字都没被改过"。

**签名算法怎么选：**

| 算法 | 类型 | 谁验签 | 适用 |
|---|---|---|---|
| `HS256`（HMAC + SHA256） | **对称**：签发和验签用同一个密钥 | 只有签发方 | 单体 / 自己的服务集群（这节用的） |
| `RS256`（RSA + SHA256） | **非对称**：私钥签，公钥验 | 任何拿到公钥的人 | 多个服务共享、第三方要验你的 token |

**你的场景（单体游戏服务端）用 HS256 就够。** 一旦有第二个系统要验你的 token 而你又不想把密钥给它，就得换 RS256。

**Payload 里的标准字段（registered claims），写错会直接影响验证：**

| 字段 | 全名 | 含义 | 不写会怎样 |
|---|---|---|---|
| `iss` | issuer | 谁签发的 | 开了 `ValidateIssuer` 就验不过 |
| `sub` | subject | 主体（用户标识） | 你得自己塞一个自定义字段当 ID |
| `aud` | audience | 给谁用的 | 开了 `ValidateAudience` 就验不过 |
| `exp` | expiration | **过期时间（Unix 秒）** | 永不过期 |
| `nbf` | not before | 生效时间 | 立即生效 |
| `iat` | issued at | 签发时间 | — |
| `jti` | JWT ID | 唯一标识（防重放用） | 无法做单条令牌黑名单 |

**注意 `exp` 和 `nbf` 是"Unix 秒"，不是毫秒、不是字符串。** 实测值 `1793288004` 对应 2026-10-29 15:33:24 UTC——和 `DateTime.UtcNow.AddSeconds(120)` 对得上。

**JWT 最大的代价：发出去就收不回来。**

```
用户登录 → 服务端签名发 token（exp = 2 小时后）
                              ↓
                     这 2 小时内，服务端无法"收回"它
                              ↓
        你封了号 / 用户点退出 / 密码被改 —— token 依然有效
```

**为什么？** 因为"有效"的判定标准只有两条：**签名对不对 + 没过期**。没有第三条"服务端记不记得它"。这正是它能"无状态"的原因，也是它最疼的地方。

| 想实现 | JWT 天然支持吗 | 需要额外做什么 |
|---|---|---|
| 退出登录 | ❌ | 客户端删 token（但 token 本身仍有效） |
| 封号立即生效 | ❌ | 黑名单 / 短有效期 + 刷新令牌 / 每次查库（等于放弃无状态） |
| 修改权限立即生效 | ❌ | 同上 |

**这就是 P151 的主题。** 现在先记住这个结论，别急着解决——先会用，再解决它的缺陷。

---

## P148 · 8. 在 .NET 里签发和验证 JWT

**签发只需要四个东西：密钥、算法、payload、序列化器。**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

const string Key = "AuthTest_Secret_Key_2026_0123456789_ABCDEF";   // 45 字节

string IssueToken(string userName, string role, int expiresInSeconds = 120)
{
    // ① 要写进 payload 的内容
    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, userName),   // "sub"
        new("uid", "1001"),                           // 自定义字段
        new("role", role)                             // 短名，⚠️ 后面有坑
    };

    // ② 签名凭证 = 密钥 + 算法
    var creds = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
        SecurityAlgorithms.HmacSha256);

    // ③ 组装
    var token = new JwtSecurityToken(
        issuer: "auth",
        audience: "client",
        claims: claims,
        notBefore: DateTime.UtcNow.AddMinutes(-10),
        expires: DateTime.UtcNow.AddSeconds(expiresInSeconds),
        signingCredentials: creds);

    // ④ 序列化成字符串（就是那个三段式）
    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

**逐符号拆解（这些类第一次出现，都得说清楚）：**

| 符号 | 是什么 | 谁在用 | 不写会怎样 |
|---|---|---|---|
| `JwtRegisteredClaimNames` | 常量类，提供标准 claim 名（`Sub` = `"sub"`、`Iss`、`Aud`…） | 你写 claim 时 | 手打 `"sub"` 也能跑，但拼错不报错，只是验不过 |
| `SigningCredentials` | "签名凭证"：把**密钥**和**算法**绑在一起 | `JwtSecurityToken` 构造时 | 没有它 → 签不出签名段 |
| `SymmetricSecurityKey` | 对称密钥的包装类（内部就是一个 `byte[]`） | `SigningCredentials` | — |
| `SecurityAlgorithms.HmacSha256` | 常量 = `"HS256"` | `SigningCredentials` | 硬编码字符串容易拼错 |
| `JwtSecurityToken` | **内存中的一个 token 对象**（还没序列化） | 你构造、`WriteToken` 序列化 | — |
| `JwtSecurityTokenHandler` | 序列化/反序列化/验证 token 的处理器 | `WriteToken` / `ValidateToken` | 直接 `ToString()` 拿不到字符串，会得到类名 |

**`issuer` 和 `audience` 到底填什么？**

| 参数 | 该填什么 | 有没有约束 |
|---|---|---|
| `issuer`（iss） | **你自己的服务标识**，任意字符串，如 `"auth"` / `"https://api.myapp.com"` | 无格式要求，只要签发和验证两边一致 |
| `audience`（aud） | **这个 token 是给谁用的**，如 `"client"` / `"web"` / `"game"` | 同上 |

**它们存在的意义是"防止 token 被用在别的系统上"**：如果你的账号系统同时给"商城"和"论坛"发 token，两边带着不同的 `aud`，那商城拿到的 token 去访问论坛就会被 `ValidateAudience` 拒掉。

**实测踩到的第一个坑：`nbf` 不能晚于 `exp`。**

我第一次想造一个"已过期"的 token，写了：

```csharp
var t = new JwtSecurityToken(
    notBefore: DateTime.UtcNow.AddSeconds(-1),      // 1 秒前生效
    expires: DateTime.UtcNow.AddSeconds(-10),       // 10 秒前过期  ← 比 nbf 还早
    ...);
```

**结果 `JwtSecurityToken` 构造时直接抛异常，端点返回 500。** 因为逻辑上"生效时间晚于过期时间"的 token 没有意义。正确做法是 `nbf` 往前推更多：

```csharp
notBefore: DateTime.UtcNow.AddMinutes(-10),
expires: DateTime.UtcNow.AddSeconds(expiresInSeconds),   // 可以为负数
```

**实测踩到的第二个坑：密钥太短。**

```csharp
IssueToken("tom", "admin", 60, key: "123456");   // 6 字节 = 48 bit
```

```
ArgumentOutOfRangeException
IDX10653: The encryption algorithm 'HS256' requires a key size of at least '128' bits.
Key 'Null', is of size: '48'.
```

**要求 ≥ 128 bit = 16 字节。** 报错文案写的是 128（不是 256），照它说的来即可。**生产环境请用 32 字节（256 bit）以上的随机串**，别用 `"1234567890123456"` 这种一眼看穿的。

生成一个合格的密钥：

```bash
# Linux / macOS / Git Bash
openssl rand -base64 32
# 或者
head -c 32 /dev/urandom | base64
```

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

**然后，怎么验证一个 token？**

```csharp
var handler = new JwtSecurityTokenHandler();

var parameters = new TokenValidationParameters
{
    ValidateIssuer = true,              // 校验 iss
    ValidIssuer = "auth",
    ValidateAudience = true,            // 校验 aud
    ValidAudience = "client",
    ValidateIssuerSigningKey = true,    // 校验签名
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
    ValidateLifetime = true             // 校验 exp / nbf
};

try
{
    var principal = handler.ValidateToken(tokenString, parameters, out var validatedToken);
    // principal 就是 ClaimsPrincipal，成功
}
catch (SecurityTokenException ex)
{
    // 验证失败
}
```

**五个开关，缺一个都是洞：**

| 开关 | 关掉的后果 |
|---|---|
| `ValidateIssuer` | 别的系统签的 token 也能用（只要有同一个密钥） |
| `ValidateAudience` | 给"商城"发的 token 能访问"论坛" |
| `ValidateIssuerSigningKey` | **等于不验签**，谁都能伪造 |
| `ValidateLifetime` | 过期 token 永久有效 |
| `ValidateActor` / `ValidateTokenReplay` | 默认关，需要防重放时手动开 |

**实测：篡改 payload 会怎样？**

我把 payload 里的 `"role":"admin"` 改成 `"role":"Admin"`，**签名段原封不动**，然后验证：

```json
{
  "valid": false,
  "exception": "SecurityTokenSignatureKeyNotFoundException",
  "message": "IDX10517: Signature validation failed. The token's kid is missing.
              Keys tried: 'Microsoft.IdentityModel.Tokens.SymmetricSecurityKey, KeyId: ''...'."
}
```

**注意这个异常类型的名字很迷惑：`SecurityTokenSignatureKeyNotFoundException`（"找不到签名密钥"），但错误码 `IDX10517` 说的是"签名验证失败"。**

**这不是 bug。** 微软故意在"签名不对"和"密钥不对"时返回同一个异常，避免攻击者通过错误信息的差异来判断"我离成功还差多远"。

**排查时记住这个组合：看到 `IDX10517` + `kid is missing` = 你手里的 token 和配置的密钥/签名算法不匹配。** 常见原因：

| 现象 | 原因 |
|---|---|
| 我刚发的 token 立刻验不过 | 签发和验证用了不同的 `Key`（比如一个在 `appsettings.json`、一个在代码里硬编码） |
| 换了密钥后所有 token 失效 | 正常，签名对不上 |
| `kid is missing` | 你没在 header 里写 `kid`（对称密钥通常不需要，可以忽略这一句） |

**实测：`ClockSkew` 默认容忍 5 分钟（这条能救你也能坑你）。**

我造一个 **10 秒前就过期** 的 token，用两种配置验证：

```
不设置 ClockSkew（用默认值）  → passed          ← 过期了居然通过！
ClockSkew = TimeSpan.Zero     → SecurityTokenExpiredException
                                IDX10223: Lifetime validation failed. The token is expired.
```

**`ClockSkew` 是什么（第一次出现）：** `TokenValidationParameters` 上的一个属性，含义是"**允许服务器之间的时钟误差**"。默认 `TimeSpan.FromMinutes(5)`。

**为什么要有它？** 签发 token 的机器和验证 token 的机器时间不可能完全一致（NTP 同步也有毫秒级偏差）。如果不留余量，一台机器快 3 秒就会导致刚发的 token 被另一台判为"已过期"。

**但它的副作用很实在：**

```
token 上写的 exp = 12:00:00
实际失效时间     = 12:05:00     ← 多活 5 分钟
```

**这意味着：** 用户点"退出登录"、你封了号，**token 还能再用最多 5 分钟**。对安全要求高的场景（支付、后台管理），把它调小：

```csharp
ClockSkew = TimeSpan.FromSeconds(30),   // 30 秒余量，够抵消时钟漂移
```

**调太小也有风险：** 如果服务器时钟没同步好（比如容器时间漂移），会出现"刚拿到 token 就说过期"的诡异现象，用户看到的是"登录成功立刻被踢回登录页"。**30 秒 ~ 1 分钟是实践中的甜点。**

---

## P149 · 9. `AddJwtBearer`：把 token 变成 `HttpContext.User`

**上一节的 `ValidateToken` 是你手动调的。这一节用框架的封装，让它对每个请求自动发生。**

```csharp
builder.Services.AddAuthentication(o =>
{
    o.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = "auth",
        ValidateAudience = true, ValidAudience = "client",
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
        ValidateLifetime = true
    };
});
```

**逐个符号：**

| 符号 | 是什么 | 不写会怎样 |
|---|---|---|
| `JwtBearerDefaults.AuthenticationScheme` | 常量 `"Bearer"`，一个方案的名字 | 魔改字符串 `"Bearer"` 也能跑，但打错就静默失效 |
| `AddJwtBearer(...)` | 注册一个**认证处理器**（`AuthenticationHandler` 子类），负责读 header、验签、建 `User` | 没有它 → 带 token 也永远是未登录 |
| `JwtBearerOptions.TokenValidationParameters` | 上一节那五个开关 | 默认全开但 `ValidIssuer`/`ValidAudience` 为空 → 校验必失败 |

**`AddJwtBearer` 在每个请求里做的四件事：**

```
① 读请求头：Authorization: Bearer eyJhbGci...
        ↓ 没有这个头 → 直接"未认证"（不报错，交给后续判断）
② 拆三段，取签名，用 IssuerSigningKey 验签
        ↓ 验不过 → 认证失败（401）
③ 检查 iss / aud / nbf / exp
        ↓ 违反 → 认证失败（401）
④ 把 payload 转成 ClaimsIdentity，塞进 HttpContext.User
        ↓
   后面的 [Authorize] 就能读到 User 了
```

**注意第 ① 步的语义：没有 token 不是错误，是"匿名"。** 这也解释了为什么有时候 401 有时候 200——取决于端点有没有 `[Authorize]`。

**然后是 401 和 403 的分界线，实测矩阵：**

| 请求 | 端点要求 | 结果 |
|---|---|---|
| 不带 token | `[Authorize]` | **401** Unauthorized |
| `abc.def.ghi` 垃圾 token | `[Authorize]` | **401** |
| 合法 token（role=user） | `[Authorize]` | **200** |
| 合法 token（role=admin） | `[Authorize(Roles="admin")]` | **200** |
| 合法 token（role=user） | `[Authorize(Roles="admin")]` | **403** Forbidden |
| 合法 token（无 role） | `[Authorize(Roles="admin")]` | **403** |
| 合法 token（role=admin） | Policy `RequireRole("admin")` | **200** |
| 合法 token（role=user） | Policy `RequireRole("admin")` | **403** |

**一句话记住：**

> **401 = "我不知道你是谁"（认证失败）。403 = "我知道你是谁，但你没这个权"（授权失败）。**
> **401 是"再试一次可能行"，403 是"再试也没用"。**

**三种授权写法，从粗到细：**

```csharp
// ① 只要登录
[Authorize]
public IActionResult Profile() => ...;

// ② 要求特定角色（可以写多个，是"或"关系）
[Authorize(Roles = "admin,manager")]
public IActionResult Manage() => ...;

// ③ 要求满足某个策略
[Authorize(Policy = "adminOnly")]
public IActionResult Delete() => ...;
```

**Policy 的注册：**

```csharp
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("adminOnly", p => p.RequireRole("admin"));
    o.AddPolicy("vipOrAdmin", p => p.RequireRole("vip", "admin"));
    o.AddPolicy("adult", p => p.RequireClaim("age", "18", "19", "20"));     // 值在列表里
    o.AddPolicy("hasGold", p => p.RequireAssertion(ctx =>
        int.TryParse(ctx.User.FindFirst("gold")?.Value, out var g) && g > 1000));
});
```

**为什么不直接用 `Roles=`，非要绕一层 Policy？**

| 对比 | `Roles = "admin"` | Policy |
|---|---|---|
| 能表达"角色" | ✅ | ✅ |
| 能表达"claim 值" | ❌ | ✅ |
| 能表达"组合条件"（且/或） | ❌ | ✅（`RequireAssertion`） |
| 改名/改规则时 | **要改所有 `[Authorize(Roles=...)]`** | 只改 `AddPolicy` 一处 |
| 拼错时 | 运行时不报错，只是永远 403 | 同样，但集中在注册处，好查 |

**实战建议：业务代码里只写 `[Authorize(Policy = "xxx")]`，角色字符串只出现在 `AddAuthorization` 里一次。** 这样以后"管理员"改叫"运营"，你只改一处。

**还有三个常被忽略的开关：**

```csharp
.AddJwtBearer(o =>
{
    // ① 自定义 401/403 的响应体（默认是空的，前端拿不到原因）
    o.Events = new JwtBearerEvents
    {
        OnChallenge = ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode = 401;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync("""{"code":401,"msg":"token 无效或已过期"}""");
        },
        OnForbidden = ctx =>
        {
            ctx.Response.StatusCode = 403;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync("""{"code":403,"msg":"权限不足"}""");
        }
    };

    // ② 从 query string / cookie 里取 token（默认只认 Authorization 头）
    //    ⚠️ 不推荐用 query string：token 会进浏览器历史、服务器日志、Referer
    o.Events ??= new JwtBearerEvents();
    o.Events.OnMessageReceived = ctx =>
    {
        var t = ctx.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(t)) ctx.Token = t;
        return Task.CompletedTask;
    };
});
```

**为什么要自定义 401 响应体？** 因为默认的 401 响应**完全没有 body**，前端只能看到状态码，无法区分"token 过期"（该刷新）和"token 伪造"（该重新登录）。这个在真实项目里是必须做的。

---

## P149 · 10. 那个把所有人坑一遍的 claim 名映射（实测）

**这是这一批最"反直觉"的一个点。先看现象。**

**我签发的 payload（原样打印）：**

```json
{"sub":"tom","uid":"1001","role":"admin","nbf":1793287284,"exp":1793288004,"iss":"auth","aud":"client"}
```

**我在端点里打印 `HttpContext.User` 的实际情况：**

```csharp
app.MapGet("/jwt/me", (HttpContext ctx) => new
{
    identityName = ctx.User.Identity?.Name,
    isInRole_admin = ctx.User.IsInRole("admin"),
    claims = ctx.User.Claims.Select(c => new { c.Type, c.Value })
});
```

**实测输出：**

```json
{
  "identityName": null,                                        ← ❗名字是 null
  "isInRole_admin": true,
  "roleClaimType": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  "findClaimTypesRole": "admin",
  "findClaimShortRole": null,                                  ← ❗按 "role" 找不到
  "claims": [
    { "type": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", "value": "tom" },   ← ❗sub 变了
    { "type": "uid", "value": "1001" },
    { "type": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "value": "admin" },         ← ❗role 变了
    { "type": "nbf", "value": "1793287284" },
    { "type": "exp", "value": "1793288004" },
    { "type": "iss", "value": "auth" },
    { "type": "aud", "value": "client" }
  ]
}
```

**三件事同时发生了，每一件都能让你 debug 半小时：**

| 你写的 | 你读到的 | 结果 |
|---|---|---|
| `"sub": "tom"` | `.../nameidentifier` | `User.Identity.Name` = **null** |
| `"role": "admin"` | `.../role` | `User.FindFirst("role")` = **null**，但 `IsInRole` 恰好能用 |
| `"uid": "1001"` | `"uid"`（没变） | 自定义字段不受影响 |

**为什么？因为 `JwtSecurityTokenHandler` 有一张"入站 claim 名映射表"**（`DefaultInboundClaimTypeMap`），把 JWT 的标准短名换成 .NET 的 `ClaimTypes` 长 URI：

| JWT 短名 | 被映射成 `ClaimTypes` 的 | 常量 |
|---|---|---|
| `sub` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` | `ClaimTypes.NameIdentifier` |
| `unique_name` / `name` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` | `ClaimTypes.Name` |
| `role` | `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` | `ClaimTypes.Role` |
| `email` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | `ClaimTypes.Email` |

**这个映射的历史原因：** .NET 早年是给 WS-Federation / SAML 用的，那套规范里 claim 名就是长 URI。后来接 JWT 时，为了"让现有代码不用改"，加了这个兼容层。**但对 JWT 来说，这是个纯粹的负担。**

**`User.Identity.Name = null` 的直接原因：** `ClaimsIdentity.Name` 读的是 `NameClaimType` 指定的那个 claim，默认是 `ClaimTypes.Name`（长 URI）。而 JWT 里的 `sub` 被映射成了 `ClaimTypes.NameIdentifier`（另一个长 URI），**对不上**，所以是 null。

> **为什么 `IsInRole("admin")` 还能用？** 因为 `RoleClaimType` 默认就是 `ClaimTypes.Role`，而 `"role"` 恰好被映射到了 `ClaimTypes.Role`——**运气好对上了**。如果你把 payload 字段写成 `"roles"`（复数），`IsInRole` 立刻失效。

**解法一（推荐）：关掉映射，并把 Name/Role 指到短名。**

```csharp
.AddJwtBearer("jwt-nomap", o =>
{
    o.MapInboundClaims = false;                    // ← 关掉映射表
    o.TokenValidationParameters = new TokenValidationParameters
    {
        // ... 其他校验同前
        NameClaimType = "sub",                     // ← 名字从 "sub" 取
        RoleClaimType = "role"                     // ← 角色从 "role" 取
    };
});
```

**实测（同一份 token，只用关掉映射的方案再读一次）：**

```json
{
  "identityName": "tom",            ← ✅ 有值了
  "isInRole_admin": true,
  "roleClaimType": "role",
  "nameClaimType": "sub",
  "claims": [
    { "type": "sub",  "value": "tom" },
    { "type": "uid",  "value": "1001" },
    { "type": "role", "value": "admin" },
    ...
  ]
}
```

**而且 `[Authorize(Roles = "admin")]` 在这个方案下依然通过（实测 200）。** 因为 `Roles=` 是靠 `RoleClaimType` 找的，你指对了就行。

**解法二（不推荐）：签发时直接写长名。**

```csharp
claims.Add(new Claim(ClaimTypes.Role, "admin"));
claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id));
```

这样映射表里没有对应项，会原样保留，`User.Identity.Name` 依然需要额外设 `NameClaimType = ClaimTypes.NameIdentifier`。**坏处：token 变长（每个长 URI 约 60 字节，五个 claim 就多 300 字节），而且不通用（别的语言/框架看不懂）。**

**解法三（最省事，只在"我就要个名字"时用）：**

```csharp
// 不改配置，直接从 payload 短名读
var name = ctx.User.FindFirst("sub")?.Value
        ?? ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
```

**三种方案对比：**

| 方案 | 改动量 | token 大小 | 跨语言友好 | 推荐度 |
|---|---|---|---|---|
| `MapInboundClaims = false` + 指定 Name/Role | 配置 3 行 | 不变 | ✅ | ⭐⭐⭐⭐⭐ |
| 签发时写 `ClaimTypes.*` | 签发端全改 | **变长 30%** | ❌ | ⭐⭐ |
| 读的时候兼容两种 | 每处读取都写 | 不变 | ✅ | ⭐⭐⭐（临时救急） |

**一句话记住：**

> **JWT 里写 `"role"` 和 `"sub"`，.NET 默认会把它们改名成六十多个字符的 URI。要么关掉映射（`MapInboundClaims = false`），要么永远用 `ClaimTypes.*` 常量去读，别用短名字符串去 `FindFirst`。**

---

==二：格式==

## 1. Identity 注册：两种项目，两套配置

**① 纯 API 项目（前后端分离 / App / 游戏客户端）—— 用这个：**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// 只注册"用户数据"能力，不引入任何 Cookie 方案
builder.Services.AddIdentityCore<IdentityUser>(o =>
{
    o.Password.RequiredLength = 6;
    o.Password.RequireDigit = true;
    o.Password.RequireUppercase = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireNonAlphanumeric = false;

    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    o.Lockout.AllowedForNewUsers = true;

    o.User.RequireUniqueEmail = false;
})
.AddRoles<IdentityRole>()                       // 需要角色就加
.AddEntityFrameworkStores<AppDbContext>()       // 接到你的 DbContext
.AddDefaultTokenProviders()                     // 需要"忘记密码/验证邮箱"就加
.AddSignInManager();                            // 需要 SignInManager（锁定/二步验证）就加

var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;             // ← 关掉 claim 名映射
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,  ValidIssuer = jwt["Issuer"],
            ValidateAudience = true, ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();    // 必须在 UseAuthorization 之前
app.UseAuthorization();

app.MapControllers();
app.Run();
```

**② 传统 MVC 项目（服务端渲染页面 / 后台管理）—— 用这个：**

```csharp
builder.Services.AddIdentity<IdentityUser, IdentityRole>(o =>
{
    o.Password.RequiredLength = 6;
    o.SignIn.RequireConfirmedEmail = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

app.UseAuthentication();
app.UseAuthorization();
```

> **判断标准：客户端有没有浏览器页面？** 有 → ①以外的写法（`AddIdentity` + Cookie）；没有 → ①。

---

## 2. `UserManager` 方法速查（按你会用到的频率排）

| 方法 | 作用 | 返回 | 备注 |
|---|---|---|---|
| `CreateAsync(user, password)` | 建用户 + 存密码哈希 | `IdentityResult` | 密码规则不符合时返回多条错误 |
| `FindByNameAsync(name)` | 按登录名查（大小写不敏感） | `TUser?` | 内部用 `NormalizedUserName` |
| `FindByIdAsync(id)` | 按主键查 | `TUser?` | — |
| `FindByEmailAsync(email)` | 按邮箱查 | `TUser?` | — |
| `CheckPasswordAsync(user, pwd)` | **只验密码** | `bool` | ⚠️ 不累计失败次数、不看锁定 |
| `AddToRoleAsync(user, role)` | 加角色 | `IdentityResult` | 角色不存在会失败，先 `RoleExistsAsync` |
| `RemoveFromRoleAsync(user, role)` | 移角色 | `IdentityResult` | — |
| `GetRolesAsync(user)` | 查这个人的角色 | `IList<string>` | 一次查询 |
| `IsInRoleAsync(user, role)` | 判断是否有角色 | `bool` | — |
| `GeneratePasswordResetTokenAsync(user)` | 生成重置令牌 | `string`（240 字符密文） | 需 `AddDefaultTokenProviders()` |
| `ResetPasswordAsync(user, token, pwd)` | 用令牌改密码 | `IdentityResult` | 成功后会改 `SecurityStamp` |
| `ChangePasswordAsync(user, old, new)` | 知道旧密码时改 | `IdentityResult` | 同样会改 `SecurityStamp` |
| `AddPasswordAsync(user, pwd)` | 给"无密码用户"设密码 | `IdentityResult` | 第三方登录用户首次设密码用 |
| `UpdateAsync(user)` | 保存对这个用户的所有修改 | `IdentityResult` | 不调用等于没改 |
| `UpdateSecurityStampAsync(user)` | 手动换 stamp（踢人下线用） | `IdentityResult` | 所有旧凭证/令牌立即失效 |
| `SetLockoutEndDateAsync(user, time)` | 手动锁到某时 | `IdentityResult` | 传 `null` 解锁 |
| `GenerateEmailConfirmationTokenAsync(user)` | 邮箱验证令牌 | `string` | 同一套机制，用途不同 |

**`RoleManager` 只有五个常用的：**

| 方法 | 作用 |
|---|---|
| `CreateAsync(new IdentityRole("admin"))` | 建角色 |
| `RoleExistsAsync("admin")` | 是否存在 |
| `DeleteAsync(role)` | 删角色 |
| `AddClaimAsync(role, claim)` | 给角色挂 claim（"角色自带权限"） |
| `GetClaimsAsync(role)` | 读角色的 claim |

**`SignInManager` 只有三个常用的：**

| 方法 | 作用 | 关键参数 |
|---|---|---|
| `CheckPasswordSignInAsync(user, pwd, lockoutOnFailure)` | 验密码 + 风控 | **`lockoutOnFailure` 决定要不要锁定** |
| `PasswordSignInAsync(name, pwd, persist, lockoutOnFailure)` | 验密码 + 写 Cookie | 只有 Cookie 方案才用得上 |
| `SignOutAsync()` | 清 Cookie | — |

---

## 3. 密码重置完整模板（前后端两段）

**后端 · 发起重置：**

```csharp
[HttpPost("forgot-password")]
[AllowAnonymous]
public async Task<IActionResult> ForgotPassword([FromBody] ForgotDto dto)
{
    var user = await _userManager.FindByEmailAsync(dto.Email);

    // 无论用户是否存在，都返回同样的响应（防账号枚举）
    if (user == null) return Ok("如果该邮箱已注册，重置邮件已发送");

    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
    var safeToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

    var link = $"{_config["App:BaseUrl"]}/reset-password?uid={user.Id}&token={safeToken}";

    // 这里换成真实发信（SMTP / 第三方服务）
    await _emailSender.SendAsync(dto.Email, "重置密码", $"点击链接重置：{link}");

    return Ok("如果该邮箱已注册，重置邮件已发送");
}
```

**后端 · 执行重置：**

```csharp
[HttpPost("reset-password")]
[AllowAnonymous]
public async Task<IActionResult> ResetPassword([FromBody] ResetDto dto)
{
    var user = await _userManager.FindByIdAsync(dto.UserId);
    if (user == null) return BadRequest(new { msg = "链接无效或已过期" });

    string rawToken;
    try
    {
        rawToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
    }
    catch
    {
        return BadRequest(new { msg = "链接无效或已过期" });
    }

    var result = await _userManager.ResetPasswordAsync(user, rawToken, dto.NewPassword);
    if (!result.Succeeded)
        return BadRequest(new { msg = "链接无效或已过期",
                                errors = result.Errors.Select(e => e.Code) });

    return Ok(new { msg = "密码已重置，请用新密码登录" });
}
```

> **注意：`ResetPasswordAsync` 失败时不要区分"过期"和"密码不合规"以外的原因。** 但密码不合规（`PasswordTooShort` 等）必须告诉用户，否则他会一直卡在同一个错误上。

---

## 4. JWT 签发：封装成一个服务

```csharp
public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";
    public int ExpiresMinutes { get; set; } = 120;
}

public class JwtService
{
    private readonly JwtOptions _opt;

    public JwtService(IOptions<JwtOptions> opt) => _opt = opt.Value;

    public string CreateToken(IdentityUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id),                                    // 用户主键
            new("name", user.UserName ?? ""),                        // 显示名
            new("stamp", user.SecurityStamp ?? ""),                  // 可选：给"踢人"留钩子
        };
        foreach (var r in roles) claims.Add(new Claim("role", r));

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(_opt.ExpiresMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

**`appsettings.json`：**

```json
{
  "Jwt": {
    "Issuer": "BookDemo",
    "Audience": "BookDemoClient",
    "Key": "请换成 openssl rand -base64 32 生成的 44 字符串",
    "ExpiresMinutes": 120
  }
}
```

> **⚠️ `Key` 绝不能提交到 Git。** 用 `dotnet user-secrets`（Development）或环境变量 `Jwt__Key`（生产），你上一批 P129–P130 已经学过这两招了。

**登录接口把它接起来：**

```csharp
[HttpPost("login")]
[AllowAnonymous]
public async Task<IActionResult> Login([FromBody] LoginDto dto)
{
    var user = await _userManager.FindByNameAsync(dto.UserName);
    if (user == null) return Unauthorized(new { msg = "用户名或密码错误" });

    var check = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
    if (check.IsLockedOut) return StatusCode(423, new { msg = "账号已锁定，请稍后再试" });
    if (!check.Succeeded) return Unauthorized(new { msg = "用户名或密码错误" });

    var roles = await _userManager.GetRolesAsync(user);
    var token = _jwt.CreateToken(user, roles);

    return Ok(new { token, expiresIn = 120 * 60 });
}
```

---

## 5. 三种授权写法的选择表

| 需求 | 写法 | 注册 |
|---|---|---|
| 只要登录 | `[Authorize]` | 无 |
| 要求角色 | `[Authorize(Policy = "adminOnly")]` | `o.AddPolicy("adminOnly", p => p.RequireRole("admin"))` |
| 要求多个角色任一 | `[Authorize(Policy = "vipOrAdmin")]` | `p.RequireRole("vip", "admin")` |
| 要求某 claim 存在 | `[Authorize(Policy = "hasPhone")]` | `p.RequireClaim("phone")` |
| 要求 claim 值匹配 | `[Authorize(Policy = "adult")]` | `p.RequireClaim("age", "18", "19")` |
| 复杂条件 | `[Authorize(Policy = "rich")]` | `p.RequireAssertion(c => ...)` |
| 最小年龄 + 角色组合 | `[Authorize(Policy = "combo")]` | `p.RequireRole("user").RequireClaim("age", "18")` |
| 匿名可访问 | `[AllowAnonymous]` | 无（会覆盖类上的 `[Authorize]`） |

> **`RequireRole("a","b")` 是"或"，多次 `.RequireXxx()` 链式调用是"且"。** 这个区别写错会导致权限过宽。

---

## 6. 状态码与异常对照表（排错时按这个查）

**状态码：**

| 码 | 含义 | 出现原因 |
|---|---|---|
| 401 | 未认证 | 没带 token / token 过期 / 验签失败 / **方案没选对（会变 302）** |
| 403 | 已认证但无权 | 角色不匹配 / Policy 不满足 |
| 302 | 重定向 | **`AddIdentity` 抢走了默认方案**（P145 那个坑） |
| 423 | 已锁定 | `IsLockedOut = true` |

**异常 / 错误码：**

| 错误 | 类型 | 原因 | 解法 |
|---|---|---|---|
| `IDX10653` | `ArgumentOutOfRangeException` | HS256 密钥 < 128 bit | 密钥至少 16 字节，建议 32 字节 |
| `IDX10517` + `kid is missing` | `SecurityTokenSignatureKeyNotFoundException` | 签名不对（密钥换了 / 签发验证密钥不一致 / payload 被改） | 检查两边 `Key` 完全一致 |
| `IDX10223` | `SecurityTokenExpiredException` | 真的过期了（或 `ClockSkew=0` 且刚过期） | 检查 `ClockSkew` 与客户端时钟 |
| `IDX10205` / `IDX10204` | `SecurityTokenInvalidIssuerException` | `iss` 不匹配 | 检查 `ValidIssuer` |
| `IDX10214` | `SecurityTokenInvalidAudienceException` | `aud` 不匹配 | 检查 `ValidAudience` |
| `NotSupportedException: No IUserTwoFactorTokenProvider...` | — | 漏了 `AddDefaultTokenProviders()` | 加上 |
| `InvalidToken`（`IdentityResult`） | — | 重置令牌过期/复用/被篡改 | 只能重新发一封 |
| `PasswordTooShort` / `PasswordRequiresDigit`… | `IdentityResult` | 密码不合规 | 展示给用户 |
| `DuplicateUserName` | `IdentityResult` | 用户名已存在 | 提示换名 |

---

==三：代码==

## 1. 最小可运行项目（本篇所有实验的合集）

**新建项目：**

```bash
dotnet new web -o AuthDemo
cd AuthDemo

dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

**`Program.cs` 全文（照抄可跑）：**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AuthDemo;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------- 数据库 ----------
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=auth.db"));

// ---------- Identity（纯 API：用 AddIdentityCore） ----------
builder.Services.AddIdentityCore<IdentityUser>(o =>
{
    o.Password.RequiredLength = 6;
    o.Password.RequireDigit = true;
    o.Password.RequireUppercase = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireNonAlphanumeric = false;
    o.Lockout.MaxFailedAccessAttempts = 3;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders()      // 少了它：重置密码 500
.AddSignInManager();             // 少了它：注入 SignInManager 失败

// ---------- JWT ----------
const string Key = "AuthDemo_Secret_Key_2026_0123456789_ABCDEF";   // 45 字节 > 16

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;            // 关掉 claim 名映射
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = "auth",
            ValidateAudience = true, ValidAudience = "client",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("adminOnly", p => p.RequireRole("admin"));
});

var app = builder.Build();

// 实验用 EnsureCreated；正经项目换成迁移
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();

app.UseAuthentication();     // 必须在 UseAuthorization 之前
app.UseAuthorization();

// ---------- 签发 token 的小工具 ----------
string MakeToken(string userName, string? role, int expiresInSeconds = 3600)
{
    var claims = new List<Claim>
    {
        new("sub", userName),
        new("uid", "1001")
    };
    if (role != null) claims.Add(new Claim("role", role));

    var creds = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
        SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: "auth", audience: "client", claims: claims,
        notBefore: DateTime.UtcNow.AddMinutes(-1),
        expires: DateTime.UtcNow.AddSeconds(expiresInSeconds),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}

// ---------- 注册 ----------
app.MapPost("/register", async (string name, string pwd, UserManager<IdentityUser> um) =>
{
    var r = await um.CreateAsync(new IdentityUser(name), pwd);
    return r.Succeeded
        ? Results.Ok(new { ok = true })
        : Results.BadRequest(r.Errors.Select(e => new { e.Code, e.Description }));
});

// ---------- 登录（唯一正确姿势） ----------
app.MapPost("/login", async (string name, string pwd,
    UserManager<IdentityUser> um, SignInManager<IdentityUser> sm) =>
{
    var user = await um.FindByNameAsync(name);
    if (user == null) return Results.Unauthorized();

    // lockoutOnFailure: true 才会累计失败次数并锁定
    var check = await sm.CheckPasswordSignInAsync(user, pwd, lockoutOnFailure: true);
    if (check.IsLockedOut)
        return Results.Problem(statusCode: 423, title: "账号已锁定");
    if (!check.Succeeded)
        return Results.Unauthorized();

    var roles = await um.GetRolesAsync(user);
    var token = MakeToken(user.UserName!, roles.FirstOrDefault());
    return Results.Ok(new { token });
});

// ---------- 重置密码：生成令牌 ----------
app.MapGet("/reset-token", async (string name, UserManager<IdentityUser> um) =>
{
    var u = await um.FindByNameAsync(name);
    if (u == null) return Results.NotFound();
    var token = await um.GeneratePasswordResetTokenAsync(u);
    var safe = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
    return Results.Ok(new { raw = token, urlSafe = safe });
});

// ---------- 重置密码：执行 ----------
app.MapPost("/reset", async (string name, string safeToken, string newPwd,
    UserManager<IdentityUser> um) =>
{
    var u = await um.FindByNameAsync(name);
    if (u == null) return Results.BadRequest("链接无效");

    var raw = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(safeToken));
    var r = await um.ResetPasswordAsync(u, raw, newPwd);
    return r.Succeeded
        ? Results.Ok(new { ok = true })
        : Results.BadRequest(r.Errors.Select(e => e.Code));
});

// ---------- 需要登录 ----------
app.MapGet("/me", (HttpContext ctx) => Results.Ok(new
{
    name = ctx.User.Identity?.Name,                 // MapInboundClaims=false 下能拿到
    isAdmin = ctx.User.IsInRole("admin"),
    claims = ctx.User.Claims.Select(c => new { c.Type, c.Value })
})).RequireAuthorization();

// ---------- 需要 admin 角色 ----------
app.MapGet("/admin/only", () => "you are admin")
   .RequireAuthorization("adminOnly");

app.Run();

namespace AuthDemo
{
    public class AppDbContext : IdentityDbContext<IdentityUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> o) : base(o) { }
    }
}
```

**验证脚本（Git Bash）：**

```bash
BASE=http://localhost:5100

# 1. 注册（故意用弱密码，看错误列表）
curl -s -X POST "$BASE/register?name=tom&pwd=abc" ; echo

# 2. 注册（合格密码）
curl -s -X POST "$BASE/register?name=tom&pwd=abc123" ; echo

# 3. 登录拿 token
TOKEN=$(curl -s -X POST "$BASE/login?name=tom&pwd=abc123" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "token 长度: ${#TOKEN}"

# 4. 访问受保护端点
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/me" ; echo

# 5. 无 token
curl -s -o /dev/null -w "无 token -> %{http_code}\n" "$BASE/me"

# 6. 有 token 但没有 admin 角色
curl -s -o /dev/null -w "非 admin 访问 admin 端点 -> %{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" "$BASE/admin/only"
```

**预期输出：**

```
# 1
[{"code":"PasswordTooShort","description":"Passwords must be at least 6 characters."},
 {"code":"PasswordRequiresDigit","description":"Passwords must have at least one digit ('0'-'9')."}]

# 2
{"ok":true}

# 3
token 长度: 219

# 4
{"name":"tom","isAdmin":false,"claims":[{"type":"sub","value":"tom"}, ...]}

# 5
无 token -> 401

# 6
非 admin 访问 admin 端点 -> 403
```

---

## 2. 本篇实测输出汇总（对照着验证你理解对没有）

**Identity 部分：**

| 实验 | 实测结果 |
|---|---|
| `PasswordHasher.HashPassword` 两次 | 结果**不同**（盐随机），长度固定 84 字符 / 61 字节 |
| 哈希首字节 | `0x01`（v3 格式），内含 100000 次迭代 + 16 字节盐 + 32 字节子密钥 |
| `CreateAsync` 密码 `abc` | 一次返回 **2 条** 错误：`PasswordTooShort` + `PasswordRequiresDigit` |
| `EnsureCreated` 建的表 | 7 张 `AspNet*` 表 |
| `NormalizedUserName` | `tom` → `TOM` |
| **`CheckPasswordAsync` 连错 3 次** | `AccessFailedCount` **恒为 0**，永不锁定 |
| **`CheckPasswordSignInAsync(lockoutOnFailure:true)` 连错 3 次** | 第 3 次 `IsLockedOut=true`，且 `AccessFailedCount` 归 0 |
| 锁定期内用**正确**密码 `SignIn` | `IsLockedOut=true`，登录失败 |
| 锁定期内用**正确**密码 `CheckPasswordAsync` | **`ok=true`** ← 自己写登录不用 SignInManager，锁定白做 |
| 漏 `AddDefaultTokenProviders()` | 运行时抛 `NotSupportedException: No IUserTwoFactorTokenProvider named 'Default'` |
| 重置令牌形态 | 240 字符，`CfDJ8` 开头，**含 `+`，URL 不安全** |
| 同一令牌重置两次 | 第一次 `Succeeded`，第二次 `InvalidToken` |
| 重置前后 `SecurityStamp` | `BYFAADN3...` → `RQ7Z2BBV...`（变了） |
| 重置后用新/旧密码 | 新密码 `ok=true`，旧密码 `ok=false` |

**JWT 部分：**

| 实验 | 实测结果 |
|---|---|
| token 形态 | 3 段、共 219 字符、签名段 43 字符 |
| Header 解码 | `{"alg":"HS256","typ":"JWT"}` |
| Payload 解码 | **明文可见**：`{"sub":"tom","uid":"1001","role":"admin",...}` |
| 6 字节密钥签发 | `IDX10653`：HS256 要求 **≥128 bit** |
| `nbf` 晚于 `exp` | 构造 `JwtSecurityToken` 就抛异常（端点 500） |
| 篡改 payload 一个字符 | `SecurityTokenSignatureKeyNotFoundException` / **`IDX10517`** |
| 过期 10 秒 + **不设 ClockSkew** | **passed**（默认容忍 5 分钟） |
| 过期 10 秒 + `ClockSkew=Zero` | `SecurityTokenExpiredException` / `IDX10223` |
| 无 token 访问 `[Authorize]` | **401** |
| 垃圾 token 访问 `[Authorize]` | **401** |
| 合法 token 无角色访问 `Roles="admin"` | **403** |
| **`AddIdentity` + `AddAuthentication("Bearer")`** | **带合法 token 也 302 到 `/Account/Login`** |
| 改成显式设三个 Default* | 恢复正常 401 / 403 |
| payload 写 `"sub"` / `"role"` | `User.Claims` 里变成 **长 URI**；`User.Identity.Name` = **null**；`FindFirst("role")` = **null** |
| `MapInboundClaims=false` + `NameClaimType="sub"` | `User.Identity.Name` = `tom`，`IsInRole("admin")` = true，claims 保持短名 |

---

## 3. 练习：给你的图书系统加上"登录"和"管理员专属删除"

**目标：** 不改现有业务代码结构，加上三件事——注册/登录接口、`/api/books` 必须登录、删除只允许 `admin`。

**你的项目环境（按 2026-10-28 实测的 csproj）：**

```
net10.0 · EF Core 10.0.13 · SqlServer LocalDB · 库名 BookDemo
实体：Book(long Id, string Title, double Price, DateTime PubTime, long AuthorId, ...)
控制器：BooksController / QueryController
```

---

### Step 1 · 加包 + 改造 `DbContext`

```bash
cd "D:\code\编程语言学习\后端\练习\ASP.NET Core--图书管理系统\ASP.NET Core--图书管理系统\ASP.NET Core--图书管理系统"
# 注意：这个项目"解决方案目录与项目目录同名"，先 cd 两层再操作
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

> **版本要对上 net10.0**。如果 `dotnet add package` 拉到的版本报"不支持 net10.0"，手动在 csproj 里写 `Version="10.0.x"`。

**把 `BookDbContext` 的父类改掉：**

```csharp
// 改之前
public class BookDbContext : DbContext

// 改之后
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

public class BookDbContext : IdentityDbContext<IdentityUser>
{
    public BookDbContext(DbContextOptions<BookDbContext> o) : base(o) { }

    public DbSet<Book> Books => Set<Book>();
    public DbSet<Author> Authors => Set<Author>();
    // ... 你原有的
}
```

```bash
dotnet ef migrations add AddIdentity -p . -s .
dotnet ef database update -p . -s .
```

**验证：** 用 SSMS 或 `dotnet ef dbcontext info` 看 `BookDemo` 库里是否多了 7 张 `AspNet*` 表。

---

### Step 2 · 注册 Identity + JWT

**`appsettings.json` 加一节：**

```json
"Jwt": {
  "Issuer": "BookDemo",
  "Audience": "BookDemoClient",
  "Key": "换成你自己生成的 32 字节以上随机串",
  "ExpiresMinutes": 120
}
```

**`Program.cs`（在你现有代码后面追加）：**

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

var jwt = builder.Configuration.GetSection("Jwt");

builder.Services.AddIdentityCore<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BookDbContext>()
    .AddDefaultTokenProviders()
    .AddSignInManager();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
            ValidateAudience = true, ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("adminOnly", p => p.RequireRole("admin"));
});

// 注意顺序：在你原有的 app.UseXxx 之后、MapControllers 之前
app.UseAuthentication();
app.UseAuthorization();
```

> **⚠️ 这里有个必踩的坑：** 如果你的项目里还留着 `builder.Services.AddIdentity<...>()` 或 `AddDefaultIdentity<...>()`（脚手架生成的 `Program.cs` 可能自带），**必须删掉**，否则会重现 P145 的 302 问题。

---

### Step 3 · 写 `AuthController`

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _config;

    public AuthController(UserManager<IdentityUser> um,
                          SignInManager<IdentityUser> sm,
                          RoleManager<IdentityRole> rm,
                          IConfiguration config)
    {
        _userManager = um; _signInManager = sm; _roleManager = rm; _config = config;
    }

    public record RegisterDto(string UserName, string Password);
    public record LoginDto(string UserName, string Password);

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var user = new IdentityUser(dto.UserName);
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => new { e.Code, e.Description }));

        // 第一个注册的人自动成为 admin（方便你测试，生产别这么干）
        if (!await _roleManager.RoleExistsAsync("admin"))
            await _roleManager.CreateAsync(new IdentityRole("admin"));

        var count = _userManager.Users.Count();
        if (count == 1)
            await _userManager.AddToRoleAsync(user, "admin");

        return Ok(new { user.Id, user.UserName });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _userManager.FindByNameAsync(dto.UserName);
        if (user == null) return Unauthorized(new { msg = "用户名或密码错误" });

        var check = await _signInManager.CheckPasswordSignInAsync(
            user, dto.Password, lockoutOnFailure: true);

        if (check.IsLockedOut) return StatusCode(423, new { msg = "账号已锁定，请 5 分钟后再试" });
        if (!check.Succeeded) return Unauthorized(new { msg = "用户名或密码错误" });

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { token = CreateToken(user, roles) });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.FindByIdAsync(User.FindFirst("sub")!.Value);
        if (user == null) return NotFound();
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { user.Id, user.UserName, roles });
    }

    private string CreateToken(IdentityUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id),
            new("name", user.UserName ?? "")
        };
        foreach (var r in roles) claims.Add(new Claim("role", r));

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiresMinutes"]!)),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

---

### Step 4 · 给 `BooksController` 加锁

```csharp
[ApiController]
[Route("api/books")]
[Authorize]                                  // ← 整个控制器要求登录
public class BooksController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]                         // ← 查询列表仍然公开
    public async Task<IActionResult> List() { ... }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(long id) { ... }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookDto dto) { ... }   // 登录即可

    [HttpDelete("{id:long}")]
    [Authorize(Policy = "adminOnly")]        // ← 只有 admin 能删
    public async Task<IActionResult> Delete(long id) { ... }
}
```

> **注意 `[Authorize]` 在类上、`[AllowAnonymous]` 在方法上** —— 后者会覆盖前者。这个组合是"默认全锁、逐个开放"的标准写法，比在每个方法上挂 `[Authorize]` 安全得多（漏挂就是漏洞）。

---

### Step 5 · 验证（用 `.http` 文件或 curl）

```http
### 注册
POST http://localhost:5003/api/auth/register
Content-Type: application/json

{ "userName": "tom", "password": "abc123" }

### 登录
POST http://localhost:5003/api/auth/login
Content-Type: application/json

{ "userName": "tom", "password": "abc123" }

### 不带 token 查书（应该 200，因为 AllowAnonymous）
GET http://localhost:5003/api/books

### 不带 token 加书（应该 401）
POST http://localhost:5003/api/books
Content-Type: application/json

{ "title": "测试", "price": 10, "authorId": 1 }

### 带 token 加书（应该 200/201）
POST http://localhost:5003/api/books
Authorization: Bearer <粘贴上一步的 token>
Content-Type: application/json

{ "title": "测试", "price": 10, "authorId": 1 }

### 带 token 删书（tom 是第一个用户 → admin → 应该 204）
DELETE http://localhost:5003/api/books/1
Authorization: Bearer <token>
```

**✅ 标准答案检查表：**

| 检查点 | 期望 | 不通过说明 |
|---|---|---|
| 库里多了 7 张 `AspNet*` 表 | ✅ | 迁移没跑 |
| `POST /api/auth/register` 弱密码返回错误数组 | ✅ | 密码规则没生效（检查 `AddIdentityCore` lambda） |
| `POST /api/auth/login` 返回 219 字符左右的 token | ✅ | Key 太短 / 配置没读到 |
| 不带 token 查书 200 | ✅ | `[AllowAnonymous]` 没写或位置错 |
| 不带 token 加书 401 | ✅ | `UseAuthentication` 漏了 → 会是 **302**（去检查是否有 `AddIdentity`） |
| 带 token 加书 200 | ✅ | `MapInboundClaims` / 密钥不一致 |
| 带 token 删书 204 | ✅ | 角色没加上（查 `AspNetUserRoles` 表） |
| 第二个用户删书 403 | ✅ | `adminOnly` 策略没生效 |

---

==四：总结==

## 1. 六节知识一张表

| 节 | 一句话 | 最关键的那个坑 |
|---|---|---|
| P144-1 | 认证（你是谁）和授权（你能干什么）是两个中间件、两个错误码 | 顺序反了 → 全部 401 |
| P144-2 | 密码是**哈希**不是加密：加盐 + 10 万次迭代 | 自己写 MD5 = 一旦泄露就是全责 |
| P144-3 | Identity = 7 张表 + 一组 Manager；`SecurityStamp` 是全套机制的枢纽 | 自己改用户表漏改 `NormalizedUserName` → 登不上 |
| P145-4 | 纯 API 用 `AddIdentityCore`，页面项目用 `AddIdentity` | **`AddIdentity` 会抢走默认认证方案 → 带合法 token 也 302** |
| P145-5 | `UserManager` 管数据，`SignInManager` 管登录动作 | **`CheckPasswordAsync` 不累计失败、不看锁定** |
| P146-6 | 重置令牌是 Data Protection 密文，绑 `SecurityStamp`，只能用一次 | 忘了 `AddDefaultTokenProviders()` → 运行时 500 |
| P147-7 | JWT 三段 Base64Url，**payload 明文**，签名防改不防读 | 把敏感数据写进 token = 主动泄露 |
| P148-8 | 签发要 `SigningCredentials`，验证要五个开关全开 | 默认 `ClockSkew` = 5 分钟，token 多活 5 分钟 |
| P149-9 | `AddJwtBearer` 把 token 自动变成 `HttpContext.User` | 401 = 没认出来，403 = 认出来了但没权 |
| P149-10 | `"sub"`/`"role"` 被默认改名成长 URI | **`User.Identity.Name` 是 null**，不是 bug 是映射 |

## 2. 八条硬结论（全部实测，可以拿去争论）

1. **`AddIdentity` 和 `AddJwtBearer` 同时出现，`[Authorize]` 必定走 Cookie** → 未登录 302 而不是 401。因为 `AddIdentity` 设了 `DefaultAuthenticateScheme`，它优先级高于 `DefaultScheme`。
2. **`CheckPasswordAsync` 连错 10 次，`AccessFailedCount` 依然是 0。** 锁定只有 `CheckPasswordSignInAsync(..., lockoutOnFailure: true)` 才会触发。
3. **锁定之后，`CheckPasswordAsync` 对正确密码仍然返回 `true`。** 自己写登录接口不用 `SignInManager`，锁定机制等于没有。
4. **`AddIdentity` 不会自动注册 token provider。** 漏 `AddDefaultTokenProviders()` → 用户点"忘记密码"时才 500，编译和启动都不报错。
5. **重置令牌只能用一次，且不区分"过期"和"复用"** —— 两种情况都是 `InvalidToken`。因为改密码会换 `SecurityStamp`。
6. **HS256 密钥最少 128 bit（16 字节），不是 256。** 报错文案是 `IDX10653 ... at least '128' bits`。
7. **`ClockSkew` 默认 5 分钟，过期 10 秒的 token 照样通过。** 实测：不设 ClockSkew → passed；设 `Zero` → `IDX10223`。
8. **payload 里写 `"sub"`，`User.Identity.Name` 是 null。** `MapInboundClaims=false` + `NameClaimType="sub"` 才拿得到。

## 3. 决策流程图（贴在手边）

```
                      要加"用户"了
                           │
              ┌────────────┴────────────┐
        客户端是浏览器页面？          客户端是 App / Unity / 第三方
              │                          │
        ┌─────┴─────┐                    │
   服务端渲染页面   前后端分离            │
        │             │                  │
 AddIdentity     AddIdentityCore ◄───────┘
 + Cookie        + JWT
        │             │
        └──────┬──────┘
               │
        需要"忘记密码"？
               │
        ┌──────┴──────┐
       是              否
        │              │
 AddDefaultTokenProviders()   （可以不加）
               │
        需要"角色"？
               │
        ┌──────┴──────┐
       是              否
        │              │
 .AddRoles<IdentityRole>()   （可以不加）
               │
        写业务接口
               │
     [Authorize(Policy = "xxx")]
               │
        要"立刻踢人"？
               │
        ┌──────┴──────┐
       否              是
        │              │
     就这样       P151 见（黑名单 / SecurityStamp 校验）
```

## 4. 记忆口诀

```
认证认人，授权判权，中间件顺序不能颠；
哈希加盐，十万迭代，明文存密码是犯罪；
七张表里 SecurityStamp，改密换章全失效；
重置令牌加过密，用过一次就作废；
JWT 三段点分隔，payload 明文谁都看得见；
签名防改不防读，密钥三十二字节；
过期还留五分钟，ClockSkew 是元凶；
sub role 被改名，关掉映射才认亲。
```

## 5. 三句话带走

1. **密码的问题，别自己发明方案。** `PasswordHasher` 已经把盐、迭代、格式版本都处理好了，你要做的只是"别用 MD5"，以及"别忘了 `AddDefaultTokenProviders()`"。

2. **Identity 和 JWT 是两层，不是二选一。** Identity 管"人在哪"，JWT 管"这次请求怎么证明是他"，`[Authorize]` 只是读结果的裁判。混用的时候最容易死在 `AddIdentity` 抢走默认方案上。

3. **JWT 的所有"缺点"都来自它的设计目标：无状态。** 它收不回来、它 5 分钟宽限、它不能立刻踢人——这些不是 bug，是"服务端不记账"的必然代价。想清楚你要不要这个代价，再决定用不用它。

---

> **下一批（P150–P156）预告：** 让 Swagger 带 JWT 报文头（调试体验）、**解决 JWT 无法提前撤回**（P151，本批所有缺陷的总解）、托管服务与定时导出、FluentValidation。
