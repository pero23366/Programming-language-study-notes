.NET （总称，包括以下，旧只指.NET Formwork）
.NET Standrard（标准，.NET Formwork .NET Core实现的方法）
.NET Formwork（只Windows)
.NET Mono(开源被收购，跨平台，但是有小问题)
.NET Core（跨，云）

### 整个[ASP.NET](https://asp.net/) Core项目的运行逻辑

用“**餐厅**”的比喻，把整个流程走一遍：

#### 📁 项目文件夹的角色

|文件夹/文件|角色|比喻|
|---|---|---|
|`Program.cs`|程序入口，配置所有服务|餐厅的**筹备委员会**|
|`Controllers/`|接收HTTP请求，返回数据|餐厅的**服务员**|
|`Services/`|业务逻辑|餐厅的**厨师**|
|`Models/`|数据模型|餐厅的**菜谱**|
|`appsettings.json`|配置文件|餐厅的**规章制度**|
|`launchSettings.json`|启动配置（端口号等）|餐厅的**门牌号**|

#### 🔄 整体运行流程

**第一阶段：启动（`Program.cs`）**

1. `WebApplication.CreateBuilder(args)`：创建“筹备委员会”，准备搭建餐厅。
    
2. `builder.Services.AddTransient<IGreetingService, ChineseGreetingService>()`：**把厨师（Services）登记到花名册（DI容器）**。告诉筹备委员会：“如果有人要点菜，就派这个厨师去做。”
    
3. `builder.Build()`：餐厅搭建完成。
    
4. `app.MapControllers()`：告诉餐厅：“客人来了，去服务员（Controllers）那里点菜。”
    
5. `app.Run()`：餐厅正式开门营业，开始监听端口（比如7236）。
    

**第二阶段：接收请求（浏览器 → 服务器）**

1. 你在浏览器输入 `https://localhost:7236/api/greeting/张三`。
    
2. 请求通过**端口7236**，进入你的程序。
    
3. **路由系统**根据 `/api/greeting`，找到 `GreetingController`。
    
4. 根据 `{name}` 和 `[HttpGet]`，找到 `Get(string name)` 方法。
    

**第三阶段：创建控制器（DI容器登场）**

这是最关键的一步：

1. 框架需要创建 `GreetingController` 对象。
    
2. 框架发现它的构造函数需要一个 `IGreetingService`。
    
3. 框架去**DI容器（花名册）** 里找：“谁登记了 `IGreetingService`？”
    
4. 找到最后注册的 `EnglishGreetingService`（因为最后注册者胜出）。
    
5. 框架创建 `EnglishGreetingService` 对象，**注入**到 `GreetingController` 的构造函数里。
    
6. `GreetingController` 创建完成。
    

**第四阶段：执行并返回**

1. 调用 `Get("张三")`。
    
2. 控制器调用 `_greetingService.Greet("张三")`。
    
3. `EnglishGreetingService` 返回 `"Hello, 张三! Welcome to .NET!"`。
    
4. 控制器把字符串返回给框架。
    
5. 框架把字符串作为HTTP响应体，发回给浏览器。
    
6. 浏览器显示结果。