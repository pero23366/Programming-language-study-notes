==一：概念==
这一节的核心是：**在异步方法中暂停，不要用 `Thread.Sleep()`，要用 `await Task.Delay()`** [](https://blog.csdn.net/weixin_42929745/article/details/153579379?ops_request_misc=elastic_search_misc&request_id=2b81e3b447943f7b4f2f6c890d64fbf0&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-4-153579379-null-null.142%5Ev102%5Epc_search_result_base6&utm_term=%E5%BC%82%E6%AD%A5%E6%96%B9%E6%B3%95#2)。

`Thread.Sleep()` 会**阻塞当前线程**，导致该线程无法去处理其他请求；而 `await Task.Delay()` 是**非阻塞等待**，线程会被释放去干别的事情[](https://www.e-com-net.com/article/1742255097800310784.htm)。
==二：格式==
```csharp

// ❌ 错误：阻塞线程
Thread.Sleep(1000);
// ✅ 正确：非阻塞等待
await Task.Delay(1000);
```
==三：代码==
作业示例：下载网页失败后，停顿500毫秒再重试，最多重试3次：
```csharp

public async Task<string> DownloadWithRetryAsync(string url)
{
    int retryCount = 0;
    while (retryCount < 3)
    {
        try
        {
            using var client = new HttpClient();
            return await client.GetStringAsync(url);
        }
        catch
        {
            retryCount++;
            if (retryCount >= 3)
                throw new Exception("下载失败");
            await Task.Delay(500); // 非阻塞等待500毫秒
        }
    }
    throw new Exception("下载失败");
}
```
==四：总结==
- `Thread.Sleep()` 阻塞线程，降低并发能力
    
- `await Task.Delay()` 非阻塞等待，释放线程
    
- 在 [ASP.NET](https://asp.net/) Core 中，用 `Sleep` 会导致所有线程被占满，无法处理新请求
    
- 重试逻辑是 `Task.Delay` 的经典应用场景