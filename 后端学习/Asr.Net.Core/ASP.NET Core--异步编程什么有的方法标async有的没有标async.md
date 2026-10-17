==一：概念==
这一节讲解**何时可以省略 `async` 关键字**。

`async` 方法有一个缺点：**编译器会为它生成一个状态机类，运行效率没有普通方法高**，而且可能会占用非常多的线程[](https://www.e-com-net.com/article/1742255097800310784.htm)。因此，在某些场景下，去掉 `async` 反而更高效。

==二：格式==
**可以去掉 async 的场景**：方法内部只是简单地转发调用，没有其他逻辑：

```csharp

// 有 async：多生成一个状态机类
public async Task<string> GetDataAsync()
{
    return await _client.GetStringAsync(url);
}
// 去掉 async：直接返回 Task，更高效
public Task<string> GetDataAsync()
{
    return _client.GetStringAsync(url);
}
```

**不能去掉 async 的场景**：方法内部有其他逻辑需要等待结果：

```csharp

public async Task<string> GetDataAsync()
{
    var data = await _client.GetStringAsync(url);
    return data.ToUpper(); // 需要拿到结果后再处理
}
```
==三：代码==
```csharp

public async Task<string> GetDataAsync()
{
    var data = await _client.GetStringAsync(url);
    return data.ToUpper(); // 需要拿到结果后再处理
}
```
==四：总结==
- `async` 方法会生成状态机类，有额外开销
    
- 简单转发时，直接返回 `Task`，去掉 `async` 更高效
    
- **需要等待结果后再处理时，必须保留 `async/await`**