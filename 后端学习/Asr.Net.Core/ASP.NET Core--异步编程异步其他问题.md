==一：概念==
**1. 避免 `async void`**  
`async void` 只应该用于**事件处理器**。在其他地方使用 `async void`，调用者无法等待其完成，也无法捕获其抛出的异常，会导致程序崩溃且难以调试。

**2. 不要在异步方法中使用 `Thread.Sleep()`**  
`Thread.Sleep()` 会**阻塞当前线程**，使其无法去处理其他请求，严重降低Web服务器的并发能力[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。**始终使用 `await Task.Delay()`** 来代替，实现非阻塞等待[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。

**3. 谨慎使用 `.Result` 和 `.Wait()`**  
在异步方法中调用 `.Result` 或 `.Wait()` 来同步等待任务完成，极易导致**死锁**。在[ASP.NET](https://asp.net/) Core中，它们会阻塞线程，可能导致线程池耗尽。**原则：异步方法中，始终使用 `await`**。

**4. 配置 `ConfigureAwait(false)`**  
在**类库**代码中，为了提升性能并避免死锁，建议在 `await` 后加上 `.ConfigureAwait(false)`，表示不需要恢复到原始的同步上下文。在[ASP.NET](https://asp.net/) Core应用代码中，通常不需要，因为默认没有同步上下文。

**5. `ValueTask` 与 `Task`**  
`ValueTask` 是 `Task` 的轻量级替代品，用于**可能同步完成**的异步方法，可以减少内存分配。但它的使用场景有限，且不能像 `Task` 那样被多次等待。**除非有性能瓶颈，否则优先使用 `Task`**。
==二：格式==
==三：代码==
==四：总结==
这一节的核心是**安全使用异步**。记住：**`async void` 要避免，`Thread.Sleep` 要替换，`.Result/.Wait()` 要少用，`ConfigureAwait(false)` 看场景**。
