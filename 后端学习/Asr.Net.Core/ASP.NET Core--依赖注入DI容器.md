## 一、DI 容器是什么？

**一句话：DI 容器就是一个“对象工厂 + 仓库管理员”。**

你只需要告诉它两件事：

1. **“什么东西对应什么实现”** → 在 `Program.cs` 里注册。
    
2. **“这些东西要活多久”** → 选 Transient / Scoped / Singleton。
    

之后，**任何人需要什么，它负责创建、保管、送货上门**。你的 Controller 不需要自己 `new`，只需要在构造函数里喊一声“我要 `ICardService`”，容器就自动把对象塞进来。

csharp

// 你在 Program.cs 里做的事，就是给容器下订单
builder.Services.AddScoped<ICardService, CardService>();
// 你在 Controller 里做的事，就是收货
public CardController(ICardService cardService) // 容器自动送货
{
    _cardService = cardService;
}

**容器帮你做了三件事**：

1. **创建对象**：你不再写 `new CardService()`。
    
2. **管理生命周期**：决定对象什么时候创建、什么时候销毁。
    
3. **自动注入**：把对象送到需要它的类的构造函数里。
    

---

## 二、有状态 vs 无状态

### 核心定义

||无状态（Stateless）|有状态（Stateful）|
|---|---|---|
|**含义**|对象内部**不保存会变化的数据**，每次调用结果只取决于传入的参数|对象内部**保存了会变化的数据**，调用结果依赖于这些数据|
|**比喻**|计算器：你按 `1+1`，它永远输出 `2`|购物车：你加了商品，它就记住了，下次打开还在|
|**线程安全**|天然安全（大家用同一个也没事）|不安全（多人同时改会出乱子）|
|**生命周期建议**|Singleton（全局共享一个就行）|Scoped（每次请求独立一个）|

### 用你写过的代码来对比

**无状态服务：`CardService`（你写的名片服务）**

csharp

public class CardService : ICardService
{
    public Card GetMyCard()
    {
        // 每次调用，都返回同样的数据，不依赖任何外部变化
        return new Card { Name = "枕头", Title = "全栈开发学习者" };
    }
}

这个服务**不保存任何数据**，谁来调用、调多少次，结果都一样。所以它是**无状态**的，可以安全地注册为 **Singleton**（全局一个就够）。

**有状态服务：`LifeCycleService`（你写过的生命周期服务）**

csharp

public class LifeCycleService : ILifeCycleService
{
    // 这个 _id 是对象内部保存的数据，每个对象不一样
    private readonly string _id = Guid.NewGuid().ToString().Substring(0, 8);
    public string GetId() => _id;
}

这个服务**保存了一个 `_id`**，一旦创建就不会变，但不同对象有不同的 `_id`。它有“状态”，所以如果你希望每次请求拿到不同的 ID，就不能用 Singleton（否则所有人永远拿到同一个 ID）。

**真正危险的有状态服务：购物车**

csharp

public class CartService
{
    // 这个列表保存了用户加购的商品，会不断变化
    private List<string> _items = new List<string>();
    public void AddItem(string item) => _items.Add(item);
    public List<string> GetItems() => _items;
}

如果你把 `CartService` 注册为 **Singleton**，那么**所有用户的购物车会混在一起**！张三加了苹果，李四打开购物车看到的是张三的苹果。这就是有状态服务用错生命周期的灾难。

### 为什么生命周期选择和有/无状态有关？

|服务类型|推荐生命周期|原因|
|---|---|---|
|**无状态**|Singleton|大家共用一个就行，不担心串数据，还省内存|
|**有状态（请求级）**|Scoped|每个用户/请求独立一个，互不干扰|
|**有状态（临时用完就丢）**|Transient|每次都要全新的，比如每次生成一个随机验证码|

### 判断口诀

问自己一句话：**“这个对象里，有没有保存会变的数据？”**

- **没有** → 无状态 → 用 Singleton。
    
- **有，而且不同用户不能共享** → 有状态 → 用 Scoped。
    
- **有，但每次用完就丢，不需要保留** → 用 Transient。
    

---

## 三、把两者串起来

**DI 容器就像一个“员工派遣公司”**：

- 你告诉它：“我需要一个 `ICardService`”（注册）。
    
- 你告诉它：“这个员工是永久合同还是临时工”（生命周期）。
    
- 之后你只需要喊“我要人”，它就派人过来（注入）。
    

**有状态/无状态决定你签什么合同**：

- 无状态的员工（比如前台），一个就够了 → **Singleton**。
    
- 有状态的员工（比如专属客服），每个客户配一个 → **Scoped**。
    
- 临时工（比如发传单），每次都要新的 → **Transient**。
    

---

你现在只需要记住一句话：**DI 容器是帮你创建和管理对象的“大管家”；有状态就是“会记事的对象”，无状态就是“不记事的对象”。会记事的对象，不能全局共享，否则会串数据。**