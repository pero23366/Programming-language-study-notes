==一：概念==
在 DI 容器里，每个服务都有生命周期：**Singleton（单例，最长） > Scoped（作用域，中等） > Transient（瞬态，最短）**。

“长生命周期引用短生命周期”的意思是：**一个寿命长的对象（比如单例），在它的构造函数里，要求注入一个寿命短的对象（比如作用域）**。

这会导致两个致命问题：

1. **内存泄漏**：短命对象本该被销毁，但被长命对象死死拽住，永远无法释放。
    
2. **数据错乱**：单例一直持有第一个请求的短命对象，导致所有后续请求都看到第一个请求的数据。
    

[ASP.NET](https://asp.net/) Core 为了保护你，会**直接抛出异常**，阻止程序运行。
==二：格式==
**错误注册格式（会报错）：**

```csharp

services.AddSingleton<IEmailService, EmailService>(); // 长命
services.AddScoped<IConfigService, ConfigService>();  // 短命（被长命依赖）

```
**报错信息格式：**

```text

Cannot consume scoped service 'IConfigService' from singleton 'IEmailService'.
```

**正确注册格式（三选一）：**

```csharp

// 方案1：都改成长命（最推荐，无状态服务适用）
services.AddSingleton<IEmailService, EmailService>();
services.AddSingleton<IConfigService, ConfigService>();
// 方案2：都改成短命（有状态服务适用）
services.AddScoped<IEmailService, EmailService>();
services.AddScoped<IConfigService, ConfigService>();
// 方案3：长的保持长，短的改成方法内临时借用（高级用法）
```
==三：代码==
**错误示范（运行直接抛异常）：**

```csharp

// 单例（营业执照）依赖了作用域（一次性菜单）
services.AddSingleton<IEmailService, EmailService>();
services.AddScoped<IConfigService, ConfigService>();
```

**正确示范（都改成单例）：**

```csharp

services.AddSingleton<IEmailService, EmailService>();
services.AddSingleton<IConfigService, ConfigService>();
// 运行正常，因为“长命”没有依赖“短命”
```

**验证方式：**

```csharp

// 在构造函数里打印 Guid，观察创建次数
public EmailService(IConfigService config, ILogService log)
{
    Console.WriteLine($"EmailService 创建，ID：{Guid.NewGuid().ToString().Substring(0, 8)}");
}
```
==四：总结==


1. **黄金法则**：**“长不能吃短”**。单例只能依赖单例；作用域可以依赖作用域和单例；瞬态可以依赖任何生命周期。
    
2. **报错原因**：[ASP.NET](https://asp.net/) Core 在启动时会检查依赖链，发现“长依赖短”直接抛异常，防止内存泄漏和数据错乱。
    
3. **解决方案**：优先把被依赖的服务也改成**长生命周期**（Singleton）；如果它必须有状态，就把依赖方改成**短生命周期**（Scoped）。
    
4. **记忆口诀**：**单例是营业执照，作用域是一次性菜单。营业执照背面不能粘菜单，粘了收不走，还会串数据。**