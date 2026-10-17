==一：概念==
**1. 从“为什么”到“怎么做”**  
上一节（P11）解决了“为什么要用异步”的认知问题。这一节的核心是：**如何在代码中正确地写出异步方法，并调用它**。

**2. 两个关键字的职责划分**

- **`async`**：是一个**修饰符**，用来标记一个方法是“异步方法”。它告诉编译器：这个方法内部可能会用到 `await`，请把它编译成状态机。
    
- **`await`**：是一个**运算符**，用在 `async` 方法内部。它的作用是“非阻塞地等待”一个 `Task` 完成，并从中取出结果。
    

**3. `async/await` 不等于多线程**  
这是杨中科老师反复强调的核心观点。异步方法执行时，在遇到 `await` 之前，代码仍然运行在**当前线程**上。只有在 `await` 等待的操作完成后，系统才可能从线程池中调度另一个线程来继续执行后续代码。`async/await` 是一种**语法糖**，底层会被编译器编译成“状态机”。
==二：格式==
**1. 方法定义格式**

```csharp

// 无返回值的异步方法
public async Task DoSomethingAsync()
{
    // ...
}
// 有返回值的异步方法，T 为返回值的类型
public async Task<int> GetNumberAsync()
{
    // ...
}
```

**要点：**

- `async` 和 `Task`/`Task<T>` 通常成对出现。`async` 方法**不写 `void`**（除非是事件处理器）。
    
- 命名惯例：异步方法以 **`Async`** 结尾。
    
- 方法内部**至少有一个 `await`**，否则编译器会给出警告。
    

**2. 方法调用格式**

```csharp

// 在另一个异步方法中调用
public async Task UseAsync()
{
    // 使用 await 等待并获取结果
    int result = await GetNumberAsync();
    Console.WriteLine(result);
}
```

**要点：**

- 调用异步方法时，在方法前加 **`await`**。
    
- `await` 会把 `Task<int>` 中的 `int` 解析出来，赋给 `result`。
    
- 如果不在 `await` 前加 `await`，得到的是 `Task<int>`，而不是 `int`。

==三：代码==
**1. 编写一个异步方法**

```csharp

public async Task<string> DownloadFileAsync(string url)
{
    using var client = new HttpClient();
    // 使用 await 等待网络请求完成
    string content = await client.GetStringAsync(url);
    return content;
}
```

**2. 调用异步方法**

```csharp

public async Task RunAsync()
{
    // 使用 await 等待结果
    string html = await DownloadFileAsync("https://www.example.com");
    Console.WriteLine($"下载完成，内容长度：{html.Length}");
}
```

**3. 一个常见的错误写法**

```csharp

// ❌ 错误：在异步方法中调用异步方法，却不写 await
public async Task WrongAsync()
{
    // 这里得到的是 Task<string>，不是 string
    var task = DownloadFileAsync("https://www.example.com");
    // 后续代码可能在下载完成前就执行了
}
```

**4. 本节课会涉及的关键点**

- 如何将同步方法改造为异步方法。
    
- `await` 的正确使用位置。
    
- `Task` 和 `Task<T>` 在调用时的区别。
    
- 常见错误：忘记写 `await` 会导致“火忘”（fire and forget）问题。
==四：总结==
这节课是异步编程的**实操起点**，核心要点如下：

1. **掌握格式**：`async` 修饰方法，返回 `Task`/`Task<T>`；调用时用 `await` 获取结果。
    
2. **理解职责**：`async` 是标记，`await` 是等待并解包结果。
    
3. **避开误区**：`async/await` 不是多线程，它只是让线程在等待 I/O 时不被阻塞。
    
4. **动手实践**：尝试把上一节（P11）的示例代码亲手敲一遍，感受从同步到异步的改写过程。