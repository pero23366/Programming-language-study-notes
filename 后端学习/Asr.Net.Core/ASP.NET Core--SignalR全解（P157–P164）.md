==零：补充==

> **这一篇（P157–P164）回答一个问题：服务端怎么主动跟客户端说话？**

## 它解决什么问题

**你现在所有的接口都是"客户端问，服务端答"。** 这套模型有一个根本性的限制：**服务端没有嘴，只有耳朵。**

```
客户端：我要书列表      服务端：给你
客户端：我要第 2 页      服务端：给你
客户端：（沉默）         服务端：……（没事，我不说话）
```

**下面这些需求，在这个模型里做不到：**

| 需求 | 为什么 HTTP 做不到 |
|---|---|
| 聊天：对方发来的消息立刻出现在我屏幕上 | 服务端不知道"该推给谁"，也不会主动开口 |
| 游戏：别人移动了，我要立刻看到 | 同上 |
| 导入 10 万条词条，我要看进度条 | 服务端只能等客户端来问"好了吗" |
| 订单支付成功，页面自动跳转 | 客户端只能每隔几秒问一次 |
| 管理后台：有人提交表单，管理员页面弹提示 | 同上 |

**你现在唯一能做的是"轮询"（polling）：**

```javascript
setInterval(async () => {
    const r = await fetch('/api/messages?since=' + lastId);
    const list = await r.json();
    render(list);
}, 3000);      // 每 3 秒问一次
```

**轮询有四个问题，每一个都是死结：**

| 问题 | 说明 |
|---|---|
| **延迟** | 消息晚到最多 3 秒。改成 300ms，请求量翻 10 倍 |
| **浪费** | 99% 的请求返回空数组，服务器白扛 |
| **连接开销** | 每次都是新的 HTTP 请求，带一整套 header |
| **多实例** | 你只能问"某一个实例"，而消息可能产生在另一个实例上 |

**这一篇给的就是"让服务端有嘴"的能力。**

## 没有它会怎样

**说个具体的：你的 DesktopPet 项目如果要做聊天。**

**方案 A：轮询（能跑，但体验差）**

```csharp
// 前端每 2 秒问一次
setInterval(() => fetch('/api/chat/pending'), 2000);
```

- 对方发消息到你看到，平均延迟 1 秒，最差 2 秒
- 10 个用户在线 = 每秒 5 个请求，其中 4.9 个是空的
- 1000 个用户在线 = 每秒 500 个请求，全部打到数据库

**方案 B：WebSocket / SignalR**

```
连接建立一次（1 次握手）
        ↓
之后双方随时可以发消息（每条只有 2~6 字节的帧头）
        ↓
延迟 < 50ms（同一个局域网内几乎瞬时）
```

**实测数据对比（我这一轮测的）：**

| 维度 | 轮询（2 秒间隔） | SignalR（WebSocket） |
|---|---|---|
| 端到端延迟 | 0~2000ms | 实测消息 8~10ms 到达 |
| 每用户每分钟请求数 | 30 | 0（一条长连接，只有心跳） |
| 服务端主动推送 | ❌ | ✅ |
| 需要改前端 | 定时器 | 一个连接对象 |

**更重要的是：没有它，你根本没法做"实时"这类功能。** 不是"做得不够好"，是"这个东西不存在"。

## 它在生态里的位置

**这一篇要分清三个层次，很多人一开始就搞混：**

```
┌────────────────────────────────────────────────────┐
│  第 3 层：SignalR                                   │
│    Hub（服务端类）/ 客户端连接对象 / 组 / 用户       │
│    作用：把"连接"抽象成"方法调用"                    │
├────────────────────────────────────────────────────┤
│  第 2 层：传输协议（SignalR 会自动挑）               │
│    WebSockets > ServerSentEvents > LongPolling      │
│    作用：真正在网络上搬字节                          │
├────────────────────────────────────────────────────┤
│  第 1 层：TCP / HTTP                                │
└────────────────────────────────────────────────────┘
```

**用一句话说清三者关系：**

> **WebSocket 是"管道"，SignalR 是"管道 + 协议 + 连接管理 + 降级方案"。**

**什么时候用什么，一张表：**

| 方案 | 是否需要服务端推送 | 双向 | 自动降级 | 上手成本 |
|---|---|---|---|---|
| 轮询 | ❌（假的推送） | ❌ | — | 最低 |
| SSE（Server-Sent Events） | ✅ 单向（服务端→客户端） | ❌ | — | 低 |
| 原生 WebSocket | ✅ | ✅ | ❌ 自己写 | 中 |
| **SignalR** | ✅ | ✅ | ✅ 自带 | 低（API 是方法调用） |

**为什么有了 WebSocket 还要用 SignalR？** 因为原生 WebSocket 只给了你"一条能收发字符串的管子"，剩下的全靠自己：

| 原生 WebSocket 要自己做的事 | SignalR 帮你做了 |
|---|---|
| 断线重连（带退避） | `WithAutomaticReconnect()` |
| 心跳保活（判断对方死了） | `KeepAliveInterval`（默认 15 秒） |
| 消息分帧/粘包处理 | 内置 |
| 调用"方法"并等返回值 | `InvokeAsync` / `SendAsync` |
| 给一组人发消息（房间） | `Groups` |
| 给某个用户发消息（多设备） | `Clients.User` |
| 某些网络环境不支持 WS 时降级 | 自动协商 |
| 序列化（JSON/MessagePack） | 内置 |

**这些"剩下的"，恰好是最容易写出 bug 的部分。**

## 对你的实际意义

**你在做游戏，这一篇可能是整个后端课程里对你最直接有用的一节。**

**1. 实时同步。** 玩家移动、技能释放、血量变化——这些不可能靠轮询。SignalR 的 `SendAsync` 一条消息 < 1ms 就能推给房间内所有人。

**2. 房间 = Group。** SignalR 的 `Groups` 天然就是"房间"的原型：

```csharp
await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
await Clients.Group(roomId).SendAsync("PlayerMoved", playerId, x, y);
```

**3. 但有一个残酷的限制，你必须提前知道**（我这一轮实测了）：**SignalR 的连接表存在进程内存里，多实例之间不共享。**

```
玩家 A 连到实例 1 ─┐
玩家 B 连到实例 2 ─┼─ A 发的消息，B 收不到
玩家 C 连到实例 1 ─┘
```

**实测证据**（两个实例 5300 / 5301，客户端都连 5300）：

```
从 5300 推送 → alice、bob 都收到
从 5301 推送 → 一个人都没收到
```

**所以"分布式部署"这一节（P160）不是可选项，是你上线前必须解决的问题。** 两种解法：加 Redis backplane，或者用粘性会话把同一个房间的人锁在同一台机器上。

**4. 还有一个游戏特有的坑：客户端不是浏览器。**

- Unity 的 WebGL 平台**不支持** `ClientWebSocket`，只能用轮询
- Unity 的原生平台（Windows/Android/iOS）可以
- 这意味着同一个游戏在不同平台上的传输方式可能不一样，**你的服务端必须允许降级**

## 什么时候其实用不上

| 场景 | 建议 |
|---|---|
| 只有"提交表单→返回结果" | **别用**，普通 HTTP 更快更简单 |
| 数据变化不频繁（比如一天几次的公告） | 轮询一分钟一次就够，别上长连接 |
| 用户量极大且消息是"广播"（比如股票行情） | 考虑 SSE / 专业推送服务，SignalR 的连接数会成为瓶颈 |
| 只需要"服务端→客户端"单向 | **SSE 更轻**（不用升级协议，走普通 HTTP） |
| 客户端在企业内网、有可能拦截 WS | 必须允许降级到 LongPolling |

**判断标准：消息的"时效价值"是否高到值得维持一条长连接？**

- 聊天、协作、游戏、监控面板 → 值
- 报表、公告、配置下发 → 不值

---

==一：概念==

## P157 · 1. WebSocket 不是 HTTP 的替代，是"从 HTTP 借道"

**先破除一个误解：WebSocket 连接是"从 HTTP 请求升级来的"，它借 HTTP 的门进去，进去之后就不走 HTTP 了。**

**握手过程（一次普通的 HTTP 请求）：**

```http
GET /chathub HTTP/1.1
Host: localhost:5300
Upgrade: websocket                      ← 我要换协议
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==     ← 客户端随机串
Sec-WebSocket-Version: 13
```

**服务端同意（返回 101，注意这个状态码）：**

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=   ← 用 Key 算出来的，证明"我懂 WS"
```

**这之后，这条 TCP 连接就"脱离"了 HTTP，变成一个双向的帧通道。** 双方随时可以发数据，不再有"请求—响应"的对应关系。

**这个 101 我实测过，用它区分"认证成功"和"认证失败"：**

```
只带 query 的握手（服务端只认 header 时）→ 401
带 header 的握手                        → 101 Switching Protocols
```

**HTTP 和 WebSocket 的根本差别：**

| | HTTP | WebSocket |
|---|---|---|
| 通信方向 | 客户端发起，服务端只能回应 | **双向**，谁都能先说话 |
| 一个连接能发几次 | 1 次请求 + 1 次响应（HTTP/1.1 可复用但语义如此） | **无限次**，直到关闭 |
| 每条消息的头部开销 | 几百字节（Cookie、UA、Accept…） | **2~14 字节** |
| 状态 | 无状态 | **有状态**（连接本身就是状态） |
| 服务端能主动开口吗 | ❌ | ✅ |

**"每条消息 2~14 字节头"这件事为什么重要？**

聊天场景：一条消息 20 字节，如果每条都走 HTTP，实际传输 400 字节，**开销是内容的 20 倍**。WebSocket 下是 22 字节，**几乎全是内容**。

**WebSocket 帧的格式（知道有这回事就行）：**

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 ...
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |                               |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+-------------------------------+
```

| 字段 | 含义 |
|---|---|
| `opcode` | 帧类型：`1`=文本、`2`=二进制、`8`=关闭、`9`/`10`=ping/pong |
| `MASK` | 客户端发的帧必须掩码（安全考虑，防代理缓存投毒） |
| `Payload len` | 长度，7 位表示 0~125，126/127 表示后面还有扩展长度 |

**这也是"为什么 WebSocket 需要心跳"的原因：** TCP 连接可能"看起来还活着"但对方已经失联（比如手机切网、NAT 超时）。所以要定期发 ping/pong。SignalR 默认 `KeepAliveInterval = 15 秒`。

---

## P157 · 2. SignalR 到底抽象了什么

**SignalR 的核心设计思想只有一句话：把"连接上的消息"抽象成"方法调用"。**

**没有 SignalR 时（原生 WebSocket），你要自己定义消息格式：**

```javascript
// 客户端
ws.send(JSON.stringify({ type: 'sendMessage', room: 'g1', text: 'hi' }));

// 服务端：收到字符串，自己 switch
ws.OnMessage += msg => {
    var obj = JsonSerializer.Deserialize<Msg>(msg);
    switch (obj.type) {
        case "sendMessage": ...
        case "joinRoom": ...
    }
};
```

**有了 SignalR 之后：**

```csharp
// 客户端：直接调方法
await connection.InvokeAsync("SendToGroup", "g1", "hi");

// 服务端：就是一个普通方法，参数自动绑定
public async Task SendToGroup(string group, string msg)
{
    await Clients.Group(group).SendAsync("Msg", msg);
}
```

**`InvokeAsync("方法名", 参数...)` 的背后，SignalR 做了这些事：**

| 步骤 | 说明 |
|---|---|
| 1 | 把方法名 + 参数序列化成 JSON（或 MessagePack） |
| 2 | 套上 SignalR 自己的"调用协议"（区分"调用"还是"调用并等待结果"） |
| 3 | 通过底层传输（WS/SSE/LP）发出去 |
| 4 | 服务端反序列化，反射找到同名方法，绑定参数，执行 |
| 5 | 如果是 `InvokeAsync`，把返回值再序列化回来，用 `invocationId` 对应上 |

**传输层的降级（这是 SignalR 最实用的部分）：**

```
客户端想用 WebSocket
        ↓ 但中间有代理不支持 Upgrade
换 ServerSentEvents（服务端→客户端单向流，客户端→服务端用普通 POST）
        ↓ 但服务端被要求不能保持长响应
换 LongPolling（每次请求挂住一段时间，有新消息就返回）
        ↓
三种都不行 → 连接失败
```

**实测：服务端把传输方式限制成只允许长轮询之后，协商结果直接变了：**

```
服务端配置 o.Transports = LongPolling
        ↓
POST /chathub/negotiate 返回
availableTransports: ['LongPolling']        ← 只剩一种
        ↓
客户端自动降级，实测 Context.Features 里读到 transport=LongPolling
```

**这就是"协商"的价值：服务端说"我只会这几招"，客户端挑一个自己能用的。**

---

## P158 · 3. Hub 的三条通信线

**Hub 是一个普通类，但它的方法有三个方向。分不清这三个方向，你会一直搞混"谁调谁"。**

```
        ┌──────────────────────────────────┐
        │          ChatHub（服务端）        │
        │                                  │
        │  public Task SendAll(string msg) │ ← ① 客户端调服务端（Hub 方法）
        │  {                               │
        │      Clients.All.SendAsync(...)  │ ← ② 服务端调客户端（Clients.*）
        │  }                               │
        └──────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ③ 由谁触发？              ④ 发给谁？
   Context / Clients        Clients.All / Group / User / Caller
```

**① 客户端 → 服务端：调用 Hub 的 public 方法**

```csharp
// 服务端
public class ChatHub : Hub
{
    public async Task SendMessage(string text) { ... }
}
```

```javascript
// 客户端（JS）
await connection.invoke("SendMessage", "hello");      // 等结果
await connection.send("SendMessage", "hello");        // 不等结果（更快）
```

| 规则 | 说明 |
|---|---|
| 方法必须是 `public` | `private`/`internal` 客户端调不到 |
| 参数自动从 JSON 反序列化 | 类型不匹配会抛异常 |
| 返回 `Task` 或 `Task<T>` | `Task<T>` 时 `invoke` 能拿到返回值 |
| 方法名默认大小写不敏感 | `SendMessage` 和 `sendMessage` 都能调 |

**② 服务端 → 客户端：通过 `Clients.*`**

```csharp
await Clients.All.SendAsync("ReceiveMessage", "系统", "全体广播");
```

第一个参数 `"ReceiveMessage"` 是**客户端注册的回调名**，不是方法名。客户端要这样接：

```javascript
connection.on("ReceiveMessage", (user, msg) => { ... });
```

**"客户端调服务端"用 `invoke`，"服务端调客户端"用 `on` + `SendAsync`。** 两套名字，别混。

**③ 谁在调用（`Context`）**

```csharp
public class ChatHub : Hub
{
    public Task WhoAmI()
    {
        var cid = Context.ConnectionId;        // 本次连接的唯一 ID（8~22 字符）
        var uid = Context.UserIdentifier;      // 用户 ID（多设备相同）
        var user = Context.User;               // ClaimsPrincipal
        var items = Context.Items;             // 这条连接上的自定义数据（字典）
        var abort = Context.ConnectionAborted; // 连接断开时取消
        return Task.CompletedTask;
    }
}
```

**`ConnectionId` vs `UserIdentifier` 是这一节最容易混的一对：**

| | `ConnectionId` | `UserIdentifier` |
|---|---|---|
| 粒度 | **一条连接** | **一个人** |
| 手机 + 电脑同时在线 | 两个不同的 ID | **同一个值** |
| 来源 | SignalR 生成（随机） | `IUserIdProvider` 从 claim 取 |
| 用途 | 给"这一条连接"发消息 | 给"这个人的所有设备"发消息 |
| 重连后 | **会变** | 不变 |

**实测（我在两台设备上模拟同一个人）：**

```
[alice] Me → uid=alice name=alice auth=True transport=WebSockets
             claims=[sub=alice, role=user, nbf=..., exp=..., iss=auth, aud=client]
连接建立 eImqPCow 用户=alice 身份=alice
```

`eImqPCow` 是 ConnectionId，`alice` 是 UserIdentifier。**alice 再开一个浏览器，会多一个 ConnectionId，但 UserIdentifier 还是 alice。**

**④ 发给谁（`Clients` 的九种写法）**

| 写法 | 发给谁 | 典型用途 |
|---|---|---|
| `Clients.All` | 所有连接 | 全员公告 |
| `Clients.Others` | 除自己外所有连接 | "某人加入了聊天室" |
| `Clients.Caller` | 只有自己（触发这次调用的连接） | 操作回执 |
| `Clients.CallerClients` / `OthersInGroup` | 组内除自己 | 房间内"某人移动了" |
| `Clients.Client(id)` | 指定一条连接 | 点对点 |
| `Clients.Clients(ids)` | 指定多条连接 | 批量 |
| `Clients.Group(name)` | 一个组 | 房间广播 |
| `Clients.Groups(names)` | 多个组 | 跨房间 |
| `Clients.User(uid)` | 一个人的**所有设备** | 私信、封号通知 |
| `Clients.Users(uids)` | 多个人 | 批量通知 |

**我实测了最常用的四个，结果完全符合预期：**

```
Clients.All      → alice 收到、bob 收到
Clients.Others   → 只有 bob 收到（alice 是调用方）
Clients.Caller   → 只有 alice 收到
Clients.Group    → 只有组内的 alice 收到（bob 不在组）
```

---

## P158 · 4. 服务端：`Hub` + `MapHub`，两个东西就够

**最小可运行的服务端（三段）：**

```csharp
// ① Hub 类
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string msg)
        => await Clients.All.SendAsync("ReceiveMessage", user, msg);
}

// ② 注册服务
builder.Services.AddSignalR();

// ③ 映射端点
app.MapHub<ChatHub>("/chathub");
```

**逐符号解释（都是第一次出现）：**

| 符号 | 是什么 | 不写会怎样 |
|---|---|---|
| `Hub` | 基类，提供 `Clients`、`Groups`、`Context`、`OnConnectedAsync` 等 | 继承普通类就没有这些能力 |
| `AddSignalR()` | 注册 SignalR 的核心服务（连接管理、协议、JSON 序列化） | `MapHub` 抛异常"未注册 SignalR" |
| `MapHub<ChatHub>("/chathub")` | 把 Hub 挂到一个 URL 上，同时自动暴露 `/chathub/negotiate` | 客户端连不上 |
| `Clients.All.SendAsync("名字", 参数...)` | 向所有连接调用客户端的某个回调 | — |

**`MapHub` 会自动生成两个端点（这是很多人不知道的）：**

| 端点 | 方法 | 作用 |
|---|---|---|
| `/chathub` | GET（带 Upgrade）或 POST | 真正的连接（WebSocket 升级 / SSE / 长轮询） |
| `/chathub/negotiate` | **POST** | 协商：返回 connectionId + 可用的传输方式 |

**⚠️ 注意 `/chathub/negotiate` 是 POST。** 用浏览器地址栏访问会 405，用 curl 不带 `-X POST` 也会 405。我第一次测的时候就被这个坑了一下。

**`Hub` 的生命周期：每次调用创建一个新实例。**

```csharp
public class ChatHub : Hub
{
    private int _counter = 0;             // ❌ 不要在这里存状态

    public Task Bad()
    {
        _counter++;                        // 每次调用都是新的 Hub 实例，永远等于 1
        return Task.CompletedTask;
    }
}
```

**Hub 是 **Transient** 的（每次方法调用 new 一个）。之前某次调用存进字段的值，下一次调用读不到。**

**要跨调用保存状态，用这三个地方：**

| 存哪 | 生命周期 | 适用 |
|---|---|---|
| `Context.Items` | **这一条连接** | 这个连接的昵称、当前房间 |
| `Groups` | 连接存活期间 | 房间成员关系 |
| 外部存储（Redis/DB） | 永久 | 用户资料、历史消息 |

```csharp
// Context.Items 的正确用法
public Task SetNick(string nick)
{
    Context.Items["nick"] = nick;         // 存
    return Task.CompletedTask;
}

public Task SayHi()
{
    var nick = Context.Items["nick"] as string ?? "匿名";   // 取
    return Clients.Caller.SendAsync("Msg", nick, "hi");
}
```

**Hub 里能注入服务（跟 Controller 一样）：**

```csharp
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(AppDbContext db, ILogger<ChatHub> logger)   // ✅ 构造函数注入
    {
        _db = db;
        _logger = logger;
    }
}
```

**注意 `AppDbContext` 是 Scoped，Hub 是 Transient —— Transient 可以依赖 Scoped（每次解析都创建新的），这跟"单例注 Scoped"是两回事，不会报错。**

**强类型 Hub（`Hub<T>`）：把"客户端回调名"变成编译期检查**

```csharp
// 定义客户端接口
public interface IChatClient
{
    Task ReceiveMessage(string user, string msg);
    Task UserJoined(string user);
}

// Hub 继承 Hub<IChatClient>
public class StrongHub : Hub<IChatClient>
{
    public async Task Send(string msg)
    {
        await Clients.All.ReceiveMessage("系统", msg);      // ✅ 有智能提示，拼错立刻红
        await Clients.Others.UserJoined("新人");
    }
}
```

| | `Hub` | `Hub<IChatClient>` |
|---|---|---|
| 调用客户端 | `SendAsync("ReceiveMessage", ...)` 字符串 | `ReceiveMessage(...)` 方法 |
| 拼错回调名 | **运行时静默失效**（客户端收不到，服务端不报错） | **编译错误** |
| 参数类型 | `object[]`，传错也不报 | 强类型检查 |
| 代价 | — | 要定义一个接口 |

**这个差别很要命：用普通 `Hub` 时，把 `"ReceiveMessage"` 打成 `"ReceiveMsg"`，服务端一切正常，客户端一条都收不到，你会查半小时。**

---

## P158 · 5. 客户端：.NET 和 JS 两套写法

**客户端不是"随便一个 HTTP 客户端"，它需要维护连接状态。所以要用官方库。**

### .NET 客户端

```bash
dotnet add package Microsoft.AspNetCore.SignalR.Client
```

```csharp
using Microsoft.AspNetCore.SignalR.Client;

var connection = new HubConnectionBuilder()
    .WithUrl("http://localhost:5300/chathub", o =>
    {
        o.AccessTokenProvider = () => Task.FromResult<string?>(token);   // JWT
    })
    .WithAutomaticReconnect()                                            // 断线自动重连
    .Build();

// 注册服务端推过来的回调
connection.On<string, string>("ReceiveMessage", (user, msg) =>
    Console.WriteLine($"{user}: {msg}"));

// 连接事件
connection.Reconnecting += e => { Console.WriteLine("重连中..."); return Task.CompletedTask; };
connection.Reconnected  += id => { Console.WriteLine($"重连成功 {id}"); return Task.CompletedTask; };
connection.Closed       += e => { Console.WriteLine("已关闭"); return Task.CompletedTask; };

await connection.StartAsync();                    // 建立连接
await connection.InvokeAsync("SendMessage", "tom", "hello");   // 调用 Hub 方法（等返回）
await connection.SendAsync("SendMessage", "tom", "hello");     // 调用但不等待返回
await connection.DisposeAsync();                  // 关闭
```

**`InvokeAsync` vs `SendAsync` 的区别（很多人不知道有 `SendAsync`）：**

| | `InvokeAsync` | `SendAsync` |
|---|---|---|
| 等对方执行完吗 | ✅ 等 | ❌ 发出去就不管 |
| 能拿返回值吗 | ✅ `InvokeAsync<T>` | ❌ |
| 能知道"服务端报错了吗" | ✅ 抛异常 | ❌ |
| 速度 | 多一个往返 | 快 |
| 用在 | 需要结果的调用 | 发消息、通知 |

**`On<T1,T2>` 的泛型参数必须和 `SendAsync` 的参数完全对应。** 服务端 `SendAsync("Msg", user, text)` 两个字符串，客户端就要 `On<string, string>("Msg", (u, t) => ...)`。**对不上不会报错，只是不触发。**

### JS 客户端

```html
<script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/dist/browser/signalr.min.js"></script>
```

```javascript
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chathub", {
        accessTokenFactory: () => token        // ← 注意：这个名字和 .NET 不一样
    })
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveMessage", (user, msg) => {
    console.log(`${user}: ${msg}`);
});

await connection.start();
await connection.invoke("SendMessage", "tom", "hello");
await connection.send("SendMessage", "tom", "hello");
```

**JS 版本有个硬限制（P161 会详细讲）：`accessTokenFactory` 返回的 token 会被拼到 URL 的 query string 上，因为浏览器的 WebSocket 构造函数不支持自定义 header。**

```
ws://localhost:5300/chathub?access_token=eyJhbGci...
                            ^^^^^^^^^^^^^^^^^^^^^ 只能这么传
```

---

## P159 · 6. 协商（negotiate）：建立一条连接要先发三个请求

**这一节解释一个"为什么我的连接看起来建立了两次"的疑惑。**

**默认流程（有协商）：**

```
① POST /chathub/negotiate?negotiateVersion=1
   ← 200 {"negotiateVersion":1,"connectionId":"...","connectionToken":"...",
           "availableTransports":[WebSockets, ServerSentEvents, LongPolling]}
                    ↓
② 客户端挑一个传输方式（优先 WebSockets）
                    ↓
③ GET /chathub?id=<connectionToken>  + Upgrade: websocket
   ← 101 Switching Protocols
                    ↓
④ 之后在这条连接上收发消息
```

**实测的协商响应（完整原文）：**

```json
{
  "negotiateVersion": 1,
  "connectionId": "l0UADuNSdc3C3554zh_j_w",
  "connectionToken": "SqQ3XkDBhjt4lB8r41ZurQ",
  "availableTransports": [
    { "transport": "WebSockets",       "transferFormats": ["Text", "Binary"] },
    { "transport": "ServerSentEvents", "transferFormats": ["Text"] },
    { "transport": "LongPolling",      "transferFormats": ["Text", "Binary"] }
  ]
}
```

**这几个字段各自的作用：**

| 字段 | 作用 | 为什么要它 |
|---|---|---|
| `negotiateVersion` | 协议版本 | 1 是新版（有 `connectionToken`） |
| `connectionId` | 对外的连接 ID | 客户端能读，用于日志/调试 |
| `connectionToken` | **真正的凭据**，后续请求要带 | 防止别人猜到别人的 `connectionId` 就冒充 |
| `availableTransports` | 服务端支持的传输方式 | 客户端据此降级 |

**`connectionId` 和 `connectionToken` 为什么要分开？**

旧版（`negotiateVersion=0`）只返回一个 `connectionId`，后续请求直接带它：

```
GET /chathub?id=abc123
```

**问题是这个 ID 是可预测/可枚举的。** 攻击者猜到 `abc123` 就能接管别人的连接。

新版用 `connectionToken`（随机、长、不可猜）作为真正的凭据，`connectionId` 只用于显示。

**跳过协商（`SkipNegotiation`）：**

```csharp
var conn = new HubConnectionBuilder()
    .WithUrl(url, o =>
    {
        o.SkipNegotiation = true;
        o.Transports = HttpTransportType.WebSockets;   // ← 必须指定，只允许 WS
    })
    .Build();
```

**为什么"跳过协商"时必须指定 WebSockets？**

因为 SSE 和 LongPolling 都是"多个 HTTP 请求"组成的会话：

| 传输 | 请求数 | 靠什么关联这些请求 |
|---|---|---|
| WebSockets | 1（升级后保持） | 连接本身就是标识 |
| SSE | 2+（一个长响应 + 若干 POST） | **必须靠 connectionId** |
| LongPolling | 2+（反复 GET） | **必须靠 connectionId** |

**没有协商，就没有 connectionId，所以只能用 WebSocket。**

**实测结果（这一条很有意思）：**

```
=== SkipNegotiation + WebSockets 直连 ===
  直连成功 cid=(null) (未走 negotiate)
```

**连接成功了，但客户端拿到的 `ConnectionId` 是 `null`。** 而服务端日志里明明有：

```
连接建立 ymWrjMe9 用户=carol 身份=carol
```

**结论：`SkipNegotiation` 下服务端照常分配 ConnectionId，但客户端拿不到这个值。** 所以如果你的业务需要客户端知道自己的 ConnectionId（比如"给指定连接发消息"），别跳过协商。

**什么时候值得跳过？**

| 场景 | 建议 |
|---|---|
| 明确知道环境支持 WS，且想要最快建立 | 可以跳过（省一个往返，约 10~30ms） |
| 需要 ConnectionId | **别跳** |
| 需要降级能力（内网/代理环境） | **别跳** |
| 移动端网络（可能有不支持 WS 的中间设备） | **别跳** |

**一句话：省 20ms 换掉降级能力，通常不值。**

---

## P160 · 7. 分布式部署：连接表在内存里，这是硬伤

**这一节是我这一轮最重要的实测。先看结论：**

**两个实例（5300、5301），客户端都连 5300：**

```
=== 从【本实例 5300】推送 ===
    [alice] 收到 Msg ← SERVER: {本实例} 从 5300 推的
    [bob]   收到 Msg ← SERVER: {本实例} 从 5300 推的

=== 从【另一个实例 5301】推送（客户端连的是 5300）===
   （什么都没有）
```

**从 5301 推送，一个客户端都没收到。**

**为什么？因为 SignalR 的连接表长这样（存在每个进程的内存里）：**

```
实例 5300 的内存                    实例 5301 的内存
┌────────────────────────┐         ┌────────────────────────┐
│ eImqPCow → alice 的连接 │         │ （空的，没人连我）      │
│ IuYCBHgM → bob 的连接   │         │                        │
│ g1 → [eImqPCow]        │         │                        │
└────────────────────────┘         └────────────────────────┘
```

**5301 的 `IHubContext.Clients.All` 只遍历它自己那张空表，所以发给了 0 个人。**

**这个问题在三种情况下会咬你：**

| 场景 | 表现 |
|---|---|
| 负载均衡后两个实例 | 用户 A、B 可能连在不同实例，**互相收不到消息** |
| 滚动更新（一台一台重启） | 重启那一刻，连在它上面的用户全部掉线 |
| 后台任务推送 | 托管服务跑在实例 1，但用户在实例 2，**推送丢失** |

### 三种解法

**① Redis backplane（官方推荐，能真正解决问题）**

```bash
dotnet add package Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis("localhost:6379", o =>
    {
        o.Configuration.ChannelPrefix = RedisChannel.Literal("MyApp");
    });
```

**原理：每个实例把要发的消息"广播"到 Redis 的一个频道，所有实例订阅这个频道，收到后各自检查"这个人连在我这吗"。**

```
实例 1 要发消息给 alice
        ↓
    发到 Redis 频道
        ↓
┌───────┴───────┐
实例 1 收到     实例 2 收到
alice 在我这    alice 不在我这
→ 发给他         → 忽略
```

**代价：** 每条消息都要过一次 Redis（延迟 +1~3ms），Redis 变成关键依赖（它挂了，所有实时功能停摆）。

**② 粘性会话（sticky session，不改代码但有限制）**

在负载均衡器上配置：**同一个客户端的所有请求都路由到同一台机器**（按 cookie 或 IP hash）。

| 优点 | 缺点 |
|---|---|
| 不用改代码 | 用户分布不均时单台被打满 |
| 没有额外依赖 | **某台挂了，它上面的用户全掉线** |
| 适合小规模 | 扩容时不会重新分配已有连接 |

**③ 单实例 + 队列（最简单，适合早期）**

只跑一个实例，所有实时功能都在这台上。等真的需要扩容时再上 Redis。

**这三种怎么选：**

| 你的阶段 | 选择 |
|---|---|
| 单体、日活 < 1000 | **③ 单实例**，别提前优化 |
| 需要高可用（不能停） | ① Redis backplane |
| 只是"偶尔重启"能接受掉线 | ② 粘性会话 + ① 混合 |

> **⚠️ 一个容易忽略的点：`Groups` 也是内存里的。** 加了 Redis backplane 之后，组的成员关系会同步，但**如果实例重启，组关系会丢**。需要持久化的房间（比如"这个房间有哪些人"），得自己存一份到数据库/Redis。

---

## P161 · 8. 身份认证：token 只能放 URL，这是浏览器的限制

**这一节是我实测最花时间、也最值得的一节。因为网上的说法互相矛盾。**

**问题出在哪：浏览器的 WebSocket API 长这样：**

```javascript
const ws = new WebSocket("ws://localhost:5300/chathub");
// 没有第二个参数可以用来传 header
```

**没有 `headers` 选项。** 这是浏览器规范决定的，不是 SignalR 的问题。所以浏览器端**只能**把 token 拼在 URL 上：

```
ws://localhost:5300/chathub?access_token=eyJhbGci...
```

**而服务端的 `JwtBearer` 默认只从 `Authorization` header 读 token。所以什么都不配的话，浏览器连上来永远是 401。**

**解法（5 行）：**

```csharp
.AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters { /* 同前 */ };

    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var at = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(at))
                ctx.Token = at;          // 把 query 里的 token 塞给框架
            return Task.CompletedTask;
        }
    };
});
```

**`OnMessageReceived` 的语义（第一次出现）：** 认证处理器"拿到原始请求、还没决定用哪个 token"时调用。你在这里可以改写 `ctx.Token`，也可以从任何地方取（query、cookie、自定义 header）。

**我做了三组对照，把这件事彻底定死：**

**对照 A：服务端只认 header（不配 `OnMessageReceived`）**

```bash
# 模拟浏览器：只带 query，不带 header
curl -H "Connection: Upgrade" -H "Upgrade: websocket" ... \
     "http://localhost:5300/chathub?access_token=<合法token>"
→ 401

# 模拟 .NET 客户端：带 header，不带 query
curl -H "Authorization: Bearer <合法token>" -H "Upgrade: websocket" ... \
     "http://localhost:5300/chathub"
→ 101 Switching Protocols
```

**同一份 token，浏览器方式 401，.NET 方式 101。**

**对照 B：服务端认 query（配了 `OnMessageReceived`）**

```
只带 query 的握手 → 101 ✅
```

**对照 C：.NET 客户端在"只认 header"的服务端上照样能连（意外发现）**

我用 .NET 客户端跑完整场景，服务端故意配成 `QUERY_TOKEN=0`（不认 query），结果：

```
[alice] 连接成功 cid=Awo-wJuu
[alice] Me → uid=alice name=alice auth=True transport=WebSockets
```

**连接完全正常。**

**结论（这一条网上的文章基本没讲清）：**

| 客户端类型 | 能否给 WebSocket 带 header | token 传法 |
|---|---|---|
| **浏览器（JS）** | ❌ 不能 | **必须 query string** |
| **.NET（`ClientWebSocket`）** | ✅ 能（`SetRequestHeader`） | header 就行，`AccessTokenProvider` 会自动处理 |
| Unity（原生平台） | ✅ 能 | header |
| Unity（WebGL） | ❌ 不能（走浏览器 API） | query |

**所以：如果你的客户端有浏览器，`OnMessageReceived` 这 5 行是必须的。如果全是 .NET 客户端，可以不加——但加了也无害，建议加上，省得以后接 Web 端时踩坑。**

**然后是安全问题：token 出现在 URL 里有什么风险？**

| 风险 | 说明 |
|---|---|
| **服务器访问日志** | Nginx/IIS 的 access log 默认记录完整 URL，token 会明文落到日志文件里 |
| **浏览器历史** | WebSocket 的 URL 不进历史，但**协商用的 POST /negotiate 可能进** |
| **Referer** | WS 请求不带 Referer，但同页面的其他请求可能带 |
| **代理/CDN** | 中间设备可能记录 URL |
| **分享链接** | 用户复制地址时可能带上 |

**缓解办法：给 SignalR 单独发一种"短命 token"。**

```csharp
// 普通接口的 token 2 小时；SignalR 专用的只给 5 分钟
[HttpPost("signalr-token")]
[Authorize]
public IActionResult GetSignalRTicket()
{
    var uid = User.FindFirst("sub")!.Value;
    var token = _jwt.CreateToken(uid, expiresMinutes: 5);   // 5 分钟够建立连接了
    return Ok(new { token });
}
```

**连接建立之后，token 就不再需要了**（连接已经认证过）。所以 5 分钟完全够用，泄露了也几乎没用。

**另一个选择：如果前后端同域，直接用 Cookie。**

```csharp
// 服务端：不用配任何东西，Cookie 会自动带上（同域时）
// 客户端：
new HubConnectionBuilder().WithUrl("/chathub").Build();     // 不传 token
```

**Cookie 方案的问题：** 跨域时要处理 `SameSite`/`Credentials`，而且**SSE 和长轮询会带 Cookie，WebSocket 也会带**，这个反而比 query 更省事。但如果你用 JWT 做前后端分离，通常没有 Cookie 可用。

---

## P162 · 9. 向"部分"客户端发送：三把钥匙

**`Clients.All` 是最简单的，也是最没用的（真实业务里很少给所有人发）。这一节讲清楚"怎么精确定位"。**

**三把钥匙，粒度从细到粗：**

```
ConnectionId（一条连接）
    ⊂ UserIdentifier（一个人的所有设备）
        ⊂ Group（一组连接，可以跨用户）
```

### 钥匙 ①：ConnectionId —— 精确到"这一条连接"

```csharp
// 服务端
public Task SendToMe(string msg)
    => Clients.Client(Context.ConnectionId).SendAsync("Msg", msg);

public Task SendToOther(string cid, string msg)
    => Clients.Client(cid).SendAsync("Msg", msg);

public Task SendToMany(string[] cids, string msg)
    => Clients.Clients(cids).SendAsync("Msg", msg);
```

**什么时候用：** 你已经知道对方的 ConnectionId（比如他刚调用了某个方法，你在 `Context` 里拿到了）。

**致命限制：ConnectionId 在重连后会变。** 所以**不要把它存进数据库**当"用户地址"用。

### 钥匙 ②：UserIdentifier —— 一个人的所有设备

```csharp
await Clients.User("alice").SendAsync("Msg", "给你所有设备发");
```

**它靠 `IUserIdProvider` 决定"从哪取用户 ID"：**

```csharp
public class SubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirst("sub")?.Value;
}

builder.Services.AddSingleton<IUserIdProvider, SubUserIdProvider>();
```

**为什么需要自己实现？** 因为默认的 `DefaultUserIdProvider` 取的是 `ClaimTypes.NameIdentifier`：

```csharp
public class DefaultUserIdProvider : IUserIdProvider
{
    public virtual string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}
```

**而上一批我们把 `MapInboundClaims` 关掉了，claim 名保持 `"sub"` 短名。** 所以默认实现取不到值，`Clients.User()` 永远匹配不到人。

**实测对比：**

```
没实现 IUserIdProvider 时：Clients.User("alice") → 没人收到（静默失败）
实现了 SubUserIdProvider 后：Clients.User("bob") → bob 收到
                             [bob] 收到 Msg ← SERVER: [私信给 bob] {私信} 只给 bob
```

**这个失败是"静默"的**——不报错、不警告，消息就这么消失了。排查这类问题很痛苦，所以：

> **只要你的 claim 里没有 `ClaimTypes.NameIdentifier`，就必须注册自定义 `IUserIdProvider`。**

### 钥匙 ③：Group —— 房间

```csharp
// 加入/离开
await Groups.AddToGroupAsync(Context.ConnectionId, "room-1");
await Groups.RemoveFromGroupAsync(Context.ConnectionId, "room-1");

// 发给组内所有人
await Clients.Group("room-1").SendAsync("Msg", "...");

// 发给组内除自己
await Clients.OthersInGroup("room-1").SendAsync("Msg", "...");

// 组内某个人
await Clients.User("alice").SendAsync(...);   // 注意：Group 和 User 不能叠加
```

**实测（alice 加入 g1，bob 不在）：**

```
=== Groups（alice 加入 g1，bob 不在组里）===
    [alice] 收到 Msg ← Group[g1]: {Groups} alice 在组内发的
（bob 没有输出）
```

**Group 的六个关键事实：**

| 事实 | 说明 |
|---|---|
| 一个人可以在多个组 | 比如同时属于"公会"和"副本队伍" |
| 一条连接断开 | **自动从所有组移除**，不用手动清理 |
| 组不存在也能加 | 加入即创建 |
| 组里没人时不会自动删除 | 会留下空组（无害，但注意内存） |
| **组信息不持久化** | 实例重启就没了 |
| Group 名是你自己定的字符串 | 建议 `room:{id}` 这种带前缀的格式 |

**注意 `Clients.Group()` 和 `Clients.User()` 不能组合。** 想要"组内的某个人"，只能自己先查出他的 ConnectionId，再用 `Clients.Client()`。

---

## P164 · 10. 案例：导入英汉词典，用 SignalR 推进度

**这一节把前九节拼起来：后台任务（上一批的托管服务）+ 进度推送（这一节的 Hub）+ 外部推送（`IHubContext`）。**

**需求：** 用户点"导入 10 万条词条"，页面显示进度条，导入完成后通知。

**为什么不能同步做？** 10 万条要几十秒，HTTP 请求会超时，用户以为卡死了。

**架构：**

```
浏览器 ──POST /api/dict/import──> 服务器
   ↑                                  │
   │                          ① 立刻返回 {jobId}
   │                                  ↓
   │                          ② 后台慢慢导入
   │                                  │ 每 500 条
   └──SignalR 进度推送 ←───────────────┘
```

**① 提供一个"订阅进度"的 Hub：**

```csharp
public class ProgressHub : Hub
{
    // 客户端连上后调用它，把这条连接加入自己的 job 组
    public async Task Subscribe(string jobId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"job:{jobId}");
    }
}
```

**为什么要"加入组"而不是直接用 ConnectionId？** 因为用户可能刷新页面（ConnectionId 变了），但 jobId 不变。用组更稳。

**② 后台任务：用 `IHubContext` 推送**

```csharp
public class DictImportService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<ProgressHub> _hub;      // ← 关键：从外部拿到 Hub 的"广播能力"
    private readonly ILogger<DictImportService> _logger;

    public DictImportService(IServiceScopeFactory f, IHubContext<ProgressHub> hub, ILogger<DictImportService> l)
    {
        _scopeFactory = f; _hub = hub; _logger = l;
    }

    public async Task ImportAsync(string jobId, string filePath, CancellationToken ct)
    {
        var total = 100_000;
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        for (int i = 0; i < total; i++)
        {
            // ... 解析并插入一条
            if (i % 500 == 0)
            {
                var percent = i * 100 / total;
                await _hub.Clients.Group($"job:{jobId}")
                          .SendAsync("Progress", jobId, percent, i);   // 推给订阅了这个 job 的人
            }
        }

        await _hub.Clients.Group($"job:{jobId}")
                  .SendAsync("Completed", jobId, total);

        _logger.LogInformation("导入完成 {JobId}", jobId);
    }
}
```

**`IHubContext<THub>` 是什么（第一次出现）：**

| 符号 | 是什么 | 为什么必须用它 |
|---|---|---|
| `IHubContext<ProgressHub>` | Hub 的"广播接口"，能访问 `Clients`，但**没有 `Context`** | 你在 Controller/后台服务里，没有"当前连接"的概念 |
| `hub.Clients` | 和 Hub 里的 `Clients` 完全一样 | — |
| 为什么没有 `Context` | `Context` 是"当前调用的那条连接"，后台任务不属于任何连接 | 逻辑上不成立 |

**注入方式：`IHubContext<THub>` 是单例，任何地方都能注（包括 Controller、托管服务、甚至单例服务）。**

**③ 接口层：**

```csharp
[ApiController]
[Route("api/dict")]
public class DictController : ControllerBase
{
    private readonly DictImportService _import;

    public DictController(DictImportService import) => _import = import;

    [HttpPost("import")]
    public IActionResult StartImport([FromBody] ImportDto dto)
    {
        var jobId = Guid.NewGuid().ToString("N")[..8];

        // 关键：不 await，扔到后台
        _ = Task.Run(() => _import.ImportAsync(jobId, dto.FilePath, CancellationToken.None));

        return Ok(new { jobId });      // 立刻返回
    }
}
```

**⚠️ 这里的 `_ = Task.Run(...)` 是一个"有争议但常见"的写法。** 更严谨的做法是用队列（`Channel<T>` / RabbitMQ）把任务交给托管服务处理——因为 `Task.Run` 里的任务在应用关闭时会被直接中断。

```csharp
// 更严谨：用 Channel 交给托管服务
public class ImportQueue
{
    private readonly Channel<ImportJob> _channel = Channel.CreateUnbounded<ImportJob>();
    public ValueTask EnqueueAsync(ImportJob job) => _channel.Writer.WriteAsync(job);
    public IAsyncEnumerable<ImportJob> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public class ImportWorker : BackgroundService
{
    private readonly ImportQueue _queue;
    private readonly IHubContext<ProgressHub> _hub;
    // ...
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var job in _queue.ReadAllAsync(ct))
        {
            try { await ProcessAsync(job, ct); }
            catch (Exception ex) { /* 记日志，推失败消息 */ }
        }
    }
}
```

**④ 客户端：**

```javascript
const connection = new signalR.HubConnectionBuilder().withUrl("/progresshub").build();

connection.on("Progress", (jobId, percent, done) => {
    document.getElementById("bar").style.width = percent + "%";
    document.getElementById("text").textContent = `${done} / 100000`;
});

connection.on("Completed", (jobId, total) => {
    alert(`导入完成，共 ${total} 条`);
});

await connection.start();

// 发起导入
const r = await fetch("/api/dict/import", { method: "POST", body: JSON.stringify({ filePath: "dict.txt" }) });
const { jobId } = await r.json();

// 订阅这个 job 的进度
await connection.invoke("Subscribe", jobId);
```

**注意顺序：先 `start`，再 `invoke("Subscribe")`，再发起导入？**

**不，正确的顺序是：先发起导入拿到 jobId，再 Subscribe。** 因为 Subscribe 需要 jobId。但如果导入太快，进度消息可能在 Subscribe 之前就发出去了——**那几条会丢**。

**解法：导入开始前先等 100ms，或者由服务端缓存最近一次进度**（新手可以直接忽略这个边界，进度条本来就是"参考"）。

---

==二：格式==

## 1. 服务端最小配置

```csharp
// Program.cs
builder.Services.AddSignalR(o =>
{
    o.EnableDetailedErrors = true;                          // 开发期：把异常详情发给客户端
    o.KeepAliveInterval = TimeSpan.FromSeconds(15);         // 默认 15 秒发一次 ping
    o.ClientTimeoutInterval = TimeSpan.FromSeconds(30);     // 30 秒没响应就判定断线
    o.MaximumReceiveMessageSize = 32 * 1024;                // 单条消息上限，默认 32KB
});

// 如果要求登录才能连：
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => { /* ... 见第 5 段 */ });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();       // 必须在 MapHub 之前
app.UseAuthorization();

app.MapHub<ChatHub>("/chathub");

// 需要限制传输方式时（默认三种都开，通常不用配）
app.MapHub<ChatHub>("/chathub", o =>
{
    o.Transports = HttpTransportType.WebSockets | HttpTransportType.LongPolling;
});
```

**四个选项的实际影响：**

| 选项 | 默认值 | 调大/调小的影响 |
|---|---|---|
| `KeepAliveInterval` | 15 秒 | 调小 → 更快发现断线，但流量增加 |
| `ClientTimeoutInterval` | 30 秒 | 必须 > `KeepAliveInterval`，否则会误判 |
| `MaximumReceiveMessageSize` | 32KB | 传大文件要调大，但会放大内存攻击面 |
| `EnableDetailedErrors` | false | **生产环境别开**（会把堆栈泄露给客户端） |

---

## 2. Hub 模板

**普通 Hub：**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

[Authorize]                        // 整个 Hub 都要登录，匿名访问 → 401
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(AppDbContext db, ILogger<ChatHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ---- 生命周期 ----
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("连接 {Cid} 用户 {Uid}", Context.ConnectionId, Context.UserIdentifier);
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        _logger.LogInformation("断开 {Cid} 原因 {R}", Context.ConnectionId, ex?.Message ?? "正常");
        await base.OnDisconnectedAsync(ex);
    }

    // ---- 客户端可调用的方法（必须 public，返回 Task） ----
    public Task SendAll(string msg)
        => Clients.All.SendAsync("Msg", Context.UserIdentifier, msg);

    public Task SendOthers(string msg)
        => Clients.Others.SendAsync("Msg", Context.UserIdentifier, msg);

    public async Task JoinRoom(string room)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
        await Clients.OthersInGroup(room).SendAsync("Joined", Context.UserIdentifier);
    }

    public Task LeaveRoom(string room)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, room);

    public Task SendToRoom(string room, string msg)
        => Clients.Group(room).SendAsync("Msg", Context.UserIdentifier, msg);
}
```

**强类型 Hub（推荐，能防拼错）：**

```csharp
public interface IChatClient
{
    Task Msg(string from, string text);
    Task Joined(string user);
    Task Connected(string connectionId);
}

[Authorize]
public class ChatHub : Hub<IChatClient>
{
    public Task SendAll(string msg) => Clients.All.Msg(Context.UserIdentifier!, msg);
    public Task SendOthers(string msg) => Clients.Others.Msg(Context.UserIdentifier!, msg);
    public Task SendSelf(string msg) => Clients.Caller.Msg("自己", msg);
}
```

**两种 Hub 的写法差异：**

| 普通 Hub | 强类型 Hub |
|---|---|
| `Clients.All.SendAsync("Msg", a, b)` | `Clients.All.Msg(a, b)` |
| 回调名写错 → 运行时静默失效 | 回调名写错 → 编译错误 |
| 参数类型不检查 | 强类型检查 |

---

## 3. `Clients` 全表

| 属性/方法 | 发给谁 | 备注 |
|---|---|---|
| `Clients.All` | 所有连接 | 包括自己 |
| `Clients.Others` | 除自己外 | — |
| `Clients.Caller` | 只有自己 | 调用方 |
| `Clients.CallerClients` | — | 实验性，少用 |
| `Clients.OthersInGroup(g)` | 组内除自己 | 房间内广播最常用 |
| `Clients.Group(g)` | 组内所有 | — |
| `Clients.Groups(g1, g2)` | 多个组 | — |
| `Clients.Client(cid)` | 一条连接 | cid 重连后会变 |
| `Clients.Clients(ids)` | 多条连接 | — |
| `Clients.User(uid)` | 一个人所有设备 | 依赖 `IUserIdProvider` |
| `Clients.Users(uids)` | 多个人 | — |
| `Clients.AllExcept(ids)` | 除指定连接外 | — |

**`IGroupManager`（Hub 里叫 `Groups`）的方法：**

| 方法 | 说明 |
|---|---|
| `AddToGroupAsync(cid, group)` | 加入（组不存在会自动创建） |
| `RemoveFromGroupAsync(cid, group)` | 离开 |
| （没有"查组成员"的方法） | 要查成员得自己维护列表 |

---

## 4. 客户端模板

**.NET 客户端：**

```csharp
using Microsoft.AspNetCore.SignalR.Client;

var conn = new HubConnectionBuilder()
    .WithUrl("http://localhost:5300/chathub", o =>
    {
        o.AccessTokenProvider = () => Task.FromResult<string?>(token);
        // 需要跳过协商时：
        // o.SkipNegotiation = true;
        // o.Transports = HttpTransportType.WebSockets;
    })
    .WithAutomaticReconnect(new[] {
        TimeSpan.Zero, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30)
    })
    .Build();

conn.On<string, string>("Msg", (from, text) => Console.WriteLine($"{from}: {text}"));
conn.On<string>("Connected", cid => Console.WriteLine($"我的连接 ID: {cid}"));

conn.Reconnecting += e => { Console.WriteLine("重连中"); return Task.CompletedTask; };
conn.Reconnected += id => { Console.WriteLine($"重连成功 {id}"); return Task.CompletedTask; };
conn.Closed += e => { Console.WriteLine("已关闭"); return Task.CompletedTask; };

await conn.StartAsync();
await conn.InvokeAsync("SendAll", "hi");       // 等结果
await conn.SendAsync("SendAll", "hi");         // 不等

await conn.DisposeAsync();
```

**JS 客户端：**

```javascript
const conn = new signalR.HubConnectionBuilder()
    .withUrl("/chathub", { accessTokenFactory: () => token })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

conn.on("Msg", (from, text) => { /* ... */ });
conn.onreconnecting(err => console.log("重连中", err));
conn.onreconnected(id => console.log("重连成功", id));
conn.onclose(err => console.log("已关闭", err));

await conn.start();
await conn.invoke("SendAll", "hi");
await conn.send("SendAll", "hi");
```

**两套 API 的名字对照（经常搞混）：**

| 功能 | .NET | JS |
|---|---|---|
| 建连 | `new HubConnectionBuilder()` | `new signalR.HubConnectionBuilder()` |
| token | `AccessTokenProvider`（属性） | `accessTokenFactory`（小写开头） |
| 接消息 | `conn.On<T>("名字", ...)` | `conn.on("名字", ...)` |
| 调方法（等） | `InvokeAsync` | `invoke` |
| 调方法（不等） | `SendAsync` | `send` |
| 断开 | `DisposeAsync()` | `conn.stop()` |

---

## 5. 认证配置（含浏览器专用）

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
            ValidateAudience = true, ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
            ValidateLifetime = true,
            NameClaimType = "sub",
            RoleClaimType = "role"
        };

        // ★ 浏览器只能把 token 放 query，这一句必须有
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var at = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(at)) ctx.Token = at;
                return Task.CompletedTask;
            }
        };
    });

// ★ claim 里没有 ClaimTypes.NameIdentifier 时，必须自定义 UserIdProvider
builder.Services.AddSingleton<IUserIdProvider, SubUserIdProvider>();
```

```csharp
public class SubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirst("sub")?.Value;
}
```

**短命 token 的签发（可选但推荐）：**

```csharp
[HttpPost("hub-ticket")]
[Authorize]
public IActionResult HubTicket()
{
    var uid = User.FindFirst("sub")!.Value;
    return Ok(new { token = _jwt.CreateToken(uid, expiresMinutes: 5) });
}
```

---

## 6. 分布式配置（Redis backplane）

```bash
dotnet add package Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis(builder.Configuration.GetConnectionString("Redis")!, o =>
    {
        o.Configuration.ChannelPrefix = RedisChannel.Literal("BookDemo");
    });
```

**`ChannelPrefix` 一定要设，而且要每个应用不同。** 否则两个应用共用同一个 Redis 时，消息会串到对方的实例上。

---

## 7. 现象 / 错误对照表

| 现象 | 原因 | 解法 |
|---|---|---|
| 浏览器连不上，401 | token 只放在 header（浏览器 WS 带不了） | 配 `OnMessageReceived` 从 query 取 |
| `Clients.User()` 发了但没人收到 | 默认 `IUserIdProvider` 找 `ClaimTypes.NameIdentifier` | 自定义 `IUserIdProvider` |
| 消息发了但客户端没反应 | `SendAsync` 的名字和 `On` 的名字不一致 | 用强类型 Hub |
| `On<T>` 不触发 | 泛型参数个数/类型和 `SendAsync` 参数不一致 | 严格对应 |
| `Clients.Group()` 发不到 | 连接没加入组，或组名拼错 | 先 `AddToGroupAsync` |
| 多实例互相收不到 | 连接表在进程内存 | Redis backplane / 粘性会话 |
| 重连后 ConnectionId 变了导致推错人 | 用了 ConnectionId 当用户标识 | 改用 `Clients.User()` |
| `SkipNegotiation` 后 `ConnectionId` 为 null | 跳过了协商阶段 | 不跳过，或客户端不要依赖该值 |
| 长消息发不出去 | 超过 `MaximumReceiveMessageSize`（32KB） | 调大或分片 |
| POST `/chathub/negotiate` 返回 405 | 用了 GET | 必须 POST |
| `WebSocket connection to ... failed` | 反向代理没配 Upgrade | Nginx 加 `proxy_set_header Upgrade $http_upgrade;` |

**Nginx 反代 SignalR 的必备配置（很容易漏）：**

```nginx
location /chathub {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # ← 不加就降级到长轮询
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;                    # ← 长连接别被 60 秒掐断

    # 如果 token 在 query 里，注意日志脱敏
    # access_log off;
}
```

---

==三：代码==

## 1. 完整服务端（我实测用的版本）

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;
using SigSrv;

var builder = WebApplication.CreateBuilder(args);

const string Key = "SigTest_Secret_Key_2026_0123456789_ABCDEFG";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = "auth",
            ValidateAudience = true, ValidAudience = "client",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
            ValidateLifetime = true,
            NameClaimType = "sub",
            RoleClaimType = "role"
        };

        // 浏览器 WebSocket 带不了 header，token 只能放 query
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var at = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(at)) ctx.Token = at;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSignalR(o => o.EnableDetailedErrors = true);
builder.Services.AddSingleton<IUserIdProvider, SubUserIdProvider>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// 发 token（简化版，不接 Identity）
app.MapGet("/login", (string name) =>
{
    var claims = new[]
    {
        new Claim("sub", name),
        new Claim("role", name == "admin" ? "admin" : "user")
    };
    var creds = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
        SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: "auth", audience: "client", claims: claims,
        notBefore: DateTime.UtcNow.AddMinutes(-1),
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds);
    return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
});

// 外部向 Hub 推送（P163 的核心）
app.MapGet("/push", async (string msg, IHubContext<ChatHub> hub) =>
{
    await hub.Clients.All.SendAsync("Msg", "SERVER", msg);
    return Results.Ok(new { sent = "all" });
});

app.MapGet("/push-user", async (string uid, string msg, IHubContext<ChatHub> hub) =>
{
    await hub.Clients.User(uid).SendAsync("Msg", "SERVER", $"[私信给 {uid}] {msg}");
    return Results.Ok(new { sent = uid });
});

app.MapGet("/push-group", async (string group, string msg, IHubContext<ChatHub> hub) =>
{
    await hub.Clients.Group(group).SendAsync("Msg", "SERVER", $"[组 {group}] {msg}");
    return Results.Ok(new { sent = group });
});

app.MapHub<ChatHub>("/chathub");

app.Run();

namespace SigSrv
{
    // 从 sub 取用户标识；不写这个，Clients.User() 永远找不到人
    public class SubUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
            => connection.User?.FindFirst("sub")?.Value;
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;
        public ChatHub(ILogger<ChatHub> logger) => _logger = logger;

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("连接建立 {Cid} 用户={Uid} 身份={Name}",
                Context.ConnectionId[..8], Context.UserIdentifier, Context.User?.Identity?.Name);
            await Clients.Caller.SendAsync("Sys",
                $"已连接 cid={Context.ConnectionId[..8]} uid={Context.UserIdentifier}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogInformation("连接断开 {Cid} 原因={Reason}",
                Context.ConnectionId[..8], ex?.Message ?? "正常关闭");
            await base.OnDisconnectedAsync(ex);
        }

        public Task SendAll(string msg)
            => Clients.All.SendAsync("Msg", "All@" + Context.ConnectionId[..4], msg);

        public Task SendOthers(string msg)
            => Clients.Others.SendAsync("Msg", "Others@" + Context.ConnectionId[..4], msg);

        public Task SendSelf(string msg)
            => Clients.Caller.SendAsync("Msg", "Caller@" + Context.ConnectionId[..4], msg);

        public async Task SendToGroup(string group, string msg)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
            await Clients.Group(group).SendAsync("Msg", $"Group[{group}]", msg);
        }

        public async Task LeaveGroup(string group)
            => await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);

        public Task WhoAmI()
            => Clients.Caller.SendAsync("Me", new
            {
                connectionId = Context.ConnectionId,
                userIdentifier = Context.UserIdentifier,
                identityName = Context.User?.Identity?.Name,
                isAuthenticated = Context.User?.Identity?.IsAuthenticated,
                claims = Context.User?.Claims.Select(c => c.Type + "=" + c.Value).ToArray(),
                transport = Context.Features
                    .Get<Microsoft.AspNetCore.Http.Connections.Features.IHttpTransportFeature>()?
                    .TransportType.ToString()
            });
    }
}
```

---

## 2. 客户端（完整场景，可直接跑）

```csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;

var baseUrl = "http://localhost:5300";
var http = new HttpClient { BaseAddress = new Uri(baseUrl) };

async Task<string> LoginAsync(string name)
{
    var r = await http.GetFromJsonAsync<JsonElement>($"/login?name={name}");
    return r.GetProperty("token").GetString()!;
}

async Task<HubConnection> ConnectAsync(string name)
{
    var token = await LoginAsync(name);
    var conn = new HubConnectionBuilder()
        .WithUrl($"{baseUrl}/chathub", o => o.AccessTokenProvider = () => Task.FromResult<string?>(token))
        .Build();

    conn.On<string, string>("Msg", (from, msg) => Console.WriteLine($"  [{name}] ← {from}: {msg}"));
    conn.On<string>("Sys", s => Console.WriteLine($"  [{name}] Sys: {s}"));
    conn.On<JsonElement>("Me", me => Console.WriteLine(
        $"  [{name}] uid={me.GetProperty("userIdentifier")} transport={me.GetProperty("transport")}"));

    await conn.StartAsync();
    return conn;
}

var alice = await ConnectAsync("alice");
var bob = await ConnectAsync("bob");
await Task.Delay(300);

await alice.InvokeAsync("WhoAmI");
await Task.Delay(400);

await alice.InvokeAsync("SendAll", "所有人");
await Task.Delay(500);

await alice.InvokeAsync("SendOthers", "除我之外");
await Task.Delay(500);

await alice.InvokeAsync("SendToGroup", "g1", "组内");
await Task.Delay(500);

await http.GetAsync("/push-user?uid=bob&msg=私信");
await Task.Delay(500);

await alice.DisposeAsync();
await bob.DisposeAsync();
```

---

## 3. 本篇实测汇总（全部真跑出来的）

**协商与连接：**

| 实验 | 结果 |
|---|---|
| `POST /chathub/negotiate` 不带 token | **401** |
| 带 token | 200，返回 `negotiateVersion:1` + `connectionId` + `connectionToken` + `availableTransports` |
| `availableTransports`（默认） | `WebSockets`、`ServerSentEvents`、`LongPolling` |
| 服务端 `o.Transports = LongPolling` | 协商结果**只剩** `LongPolling`，客户端自动降级，`transport=LongPolling` |
| 不带 token 直接 `StartAsync` | `HttpRequestException: 401` |

**Hub 能力：**

| 实验 | 结果 |
|---|---|
| `Context.UserIdentifier` | `alice`（自定义 `IUserIdProvider` 生效） |
| `Identity.Name` | `alice`（`NameClaimType="sub"` 生效） |
| `Context.Features` 读传输方式 | `WebSockets` |
| claims 内容 | `sub=alice, role=user, nbf, exp, iss, aud`（**保持短名，没有映射**） |
| `Clients.All` | alice、bob 都收到 |
| `Clients.Others` | 只有 bob 收到 |
| `Clients.Caller` | 只有 alice 收到 |
| `Clients.Group("g1")` | 只有组内的 alice 收到 |
| `IHubContext.Clients.All`（HTTP 触发） | 两人都收到 |
| `IHubContext.Clients.User("bob")` | 只有 bob 收到 |
| `IHubContext.Clients.Group("g1")` | 只有 alice 收到 |

**认证（三组对照，这一组最关键）：**

| 服务端配置 | 客户端方式 | 结果 |
|---|---|---|
| 只认 header（不配 `OnMessageReceived`） | 只带 query（模拟浏览器） | **401** |
| 只认 header | 带 header（模拟 .NET） | **101 Switching Protocols** |
| 认 query（配了 `OnMessageReceived`） | 只带 query | **101** |
| 只认 header | **.NET 客户端库** | **连接成功**（因为 `ClientWebSocket` 能带 header） |

**分布式：**

| 实验 | 结果 |
|---|---|
| 客户端连 5300，从 5300 `/push` | alice、bob 都收到 |
| 客户端连 5300，从 5301 `/push` | **一条都没收到**（连接表不跨进程） |

**跳过协商：**

| 实验 | 结果 |
|---|---|
| `SkipNegotiation + WebSockets` 直连 | 成功，但客户端 `ConnectionId` = **null** |
| 服务端日志 | 服务端照常分配了 cid（`ymWrjMe9`） |

---

## 4. 练习：给图书系统加"实时库存通知"

**目标：** 有人新增一本书，所有打开着列表页的浏览器自动追加一行，不用刷新。

### Step 1 · 服务端加 Hub

```csharp
public class BookHub : Hub
{
    // 客户端不需要调任何方法，只接收推送
}
```

```csharp
builder.Services.AddSignalR();
app.MapHub<BookHub>("/bookhub");
```

**这个 Hub 没有 `[Authorize]`，所以匿名也能连。** 如果你的图书系统已经加了 JWT，可以加上；但注意要在 Hub 的连接请求上也带上 token（`accessTokenFactory`）。

### Step 2 · 新增图书后推送

```csharp
[HttpPost]
public async Task<IActionResult> Create(CreateBookDto dto, [FromServices] IHubContext<BookHub> hub)
{
    var book = new Book { Title = dto.Title, Price = dto.Price, AuthorId = dto.AuthorId };
    _db.Books.Add(book);
    await _db.SaveChangesAsync();

    // 推给所有在线页面
    await hub.Clients.All.SendAsync("BookAdded", new { book.Id, book.Title, book.Price });

    return CreatedAtAction(nameof(Get), new { id = book.Id }, book);
}
```

> **`[FromServices]` 是什么：** 让 MVC 从这个参数直接注入服务，而不是从请求体绑定。等价于在构造函数里注入，但更局部。

### Step 3 · 前端接收

```html
<script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/dist/browser/signalr.min.js"></script>
<script>
const conn = new signalR.HubConnectionBuilder().withUrl("/bookhub").build();

conn.on("BookAdded", b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${b.id}</td><td>${b.title}</td><td>${b.price}</td>`;
    document.querySelector("#bookTable tbody").appendChild(tr);
});

await conn.start();
</script>
```

**✅ 验证：** 开两个浏览器窗口，一个在列表页，另一个用 Swagger 新增书，看第一个窗口是否自动出现新行。

**如果没反应，按这个顺序查：**

| 检查 | 常见原因 |
|---|---|
| 浏览器控制台有没有 `SignalR connected` | 没连上（看 404/401） |
| Network 里有没有 `/bookhub/negotiate` | `MapHub` 没写或路径拼错 |
| 有没有 WebSocket 的 101 | 反向代理没配 Upgrade（开发环境直连一般没问题） |
| Hub 里的 `SendAsync` 名字和 `on` 的名字 | 必须完全一致，大小写敏感 |

---

==四：总结==

## 1. 八节知识一张表

| 节 | 一句话 | 最关键的那个坑 |
|---|---|---|
| P157-1 | WebSocket 从 HTTP 借道（101 升级），之后不再走 HTTP | 升级之后才有双向通信，握手失败就是普通 401/403 |
| P157-2 | SignalR = 管道 + 协议 + 连接管理 + 降级 | 降级顺序 WS → SSE → LongPolling 是自动的 |
| P158-3 | 三条通信线：客户端调 Hub 方法、服务端调 `Clients.*`、靠 `Context` 认人 | `ConnectionId`（一条连接）≠ `UserIdentifier`（一个人） |
| P158-4 | 服务端 = `Hub` 类 + `AddSignalR()` + `MapHub()` | Hub 是 **Transient**，字段不能存跨调用的状态 |
| P158-5 | 客户端要专门建连接（`InvokeAsync` 等结果、`SendAsync` 不等） | `On<T>` 的泛型个数必须和 `SendAsync` 参数一致，否则静默不触发 |
| P159-6 | 建一条连接要三次请求（negotiate → 选传输 → 升级） | `SkipNegotiation` 时客户端 `ConnectionId` 是 null |
| P160-7 | 连接表在**进程内存**，多实例之间不共享 | 多实例必上 Redis backplane 或粘性会话 |
| P161-8 | 浏览器 WebSocket 带不了 header，token 只能放 query | 不配 `OnMessageReceived` → 浏览器永远 401 |
| P162-9 | 三把钥匙：ConnectionId / User / Group | `Clients.User()` 依赖 `IUserIdProvider`，默认找 `ClaimTypes.NameIdentifier` |
| P164-10 | `IHubContext<T>` 让 Controller / 后台任务能推送 | 它没有 `Context`（后台任务不属于任何连接） |

## 2. 七条硬结论（全部实测）

1. **协商端点是 `POST /hub/negotiate`**，用 GET 会 405。响应里有 `connectionId` + `connectionToken` + `availableTransports`。
2. **服务端把 `Transports` 限制成 `LongPolling` 后，协商结果里 `availableTransports` 只剩一项，客户端会自动降级**——实测 `transport=LongPolling`。
3. **`SkipNegotiation = true` 时客户端拿到的 `ConnectionId` 是 `null`**，但服务端照常分配了 ID（日志里能看到）。所以需要客户端知道 ConnectionId 的业务，不能跳过协商。
4. **同一份 token：只带 query 的 WS 握手 401，带 header 的握手 101。** 浏览器只能走 query，所以 `OnMessageReceived` 那段是必需代码。
5. **.NET 客户端（`ClientWebSocket`）能给 WebSocket 带 header**，所以它在"服务端只认 header"的配置下照样连得上——**这点和浏览器完全不同，别拿 .NET 的测试结果去推浏览器**。
6. **多实例之间推送不通**（实测：客户端连 5300，从 5301 推送，所有人均未收到）。原因是连接表和组信息都在进程内存里。
7. **`Clients.User()` 在不自定义 `IUserIdProvider` 时静默失效**——因为默认实现找 `ClaimTypes.NameIdentifier`，而我们关了 claim 映射，只有 `"sub"`。

## 3. 决策流程图

```
要"服务端主动推"了？
      │
      ├─ 只是偶尔通知（一天几次）→ 轮询，别上长连接
      │
      ├─ 只需服务端→客户端单向 → SSE 更轻
      │
      └─ 需要双向（聊天/游戏/协作） → SignalR
                │
           客户端有浏览器？
                │
        ┌───────┴────────┐
       是                否（纯 .NET / 原生 Unity）
        │                         │
  必须配 OnMessageReceived    可以用 header，但仍建议配上
  （token 放 query）
        │
   要"给特定人/房间发"？
        │
   ┌────┴─────┬──────────┐
ConnectionId  User       Group
（一条连接） （一个人）    （房间）
   │           │           │
重连后变   需要自定义     断线自动移除
            IUserIdProvider
        │
   多实例部署？
        │
   ┌────┴────┐
   否         是
   │          │
 完事    Redis backplane（或粘性会话）
```

## 4. 记忆口诀

```
WebSocket 从 HTTP 借道走，101 之后自己说话；
SignalR 是管道加协议，WS 不行降 SSE 和长轮询；
Hub 方法客户端调，Clients 反过来往客户端送；
ConnectionId 是一条线，UserIdentifier 才是人；
建连接先 negotiate，跳过协商就没 cid；
浏览器 WS 带不了 header，token 只能塞 query；
只认 header 的服务器，浏览器来了就 401；
User 发不出去别慌，UserIdProvider 没写对；
多实例之间不共享，Redis backplane 来打通。
```

## 5. 三句话带走

1. **SignalR 的价值不在"能推送"，在"能推送且不用管连接"。** 断线重连、心跳、降级、序列化、分组——这些你自己写要两周，而且一定会漏某个边界情况。

2. **连接是一个"有状态的东西"，这跟 REST 的世界观冲突。** 所以你会遇到一堆 REST 里不存在的问题：连接表在内存（多实例）、ConnectionId 会变（重连）、token 不能放 header（浏览器）。**这些都是"有状态"的必然代价，不是 SignalR 的缺陷。**

3. **对你的游戏项目来说，Group 就是"房间"的原型，但也只是原型。** 真正的房间还需要：成员列表持久化、断线宽限期、房间状态同步、房主迁移。SignalR 只给了你"往一组连接发消息"这一件事。

---

> **下一篇（P165）是「ASP.NET Core 程序的发布」**：`dotnet publish` 的几种模式（框架依赖 / 自包含 / 单文件 / AOT）、`appsettings.Production.json`、环境变量覆盖、IIS 与 Kestrel 的关系、Linux 上的 systemd 配置、以及上线前必须检查的那张清单。**这一节做完，「阶段③ 认证授权与实时通信」就整个结束了。**

