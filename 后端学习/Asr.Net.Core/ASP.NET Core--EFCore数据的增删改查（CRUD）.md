==一：概念==
EF Core 操作数据库的核心对象是 `DbContext`，它就像一个“数据库管家”。你通过它来告诉数据库要做什么：

1. **增（Create）**：向数据库表里添加一条新记录。
    
2. **删（Delete）**：从数据库表里删除一条记录。
    
3. **改（Update）**：修改数据库表里已有的记录。
    
4. **查（Read）**：从数据库表里读取记录。
    

**核心机制：跟踪（Tracking）**  
当 `DbContext` 从数据库查出一条数据时，它会**跟踪**这条数据的变化。如果你修改了这条数据的属性，`SaveChanges()` 会自动检测到变化，并生成对应的 UPDATE 语句。

**核心动作：`SaveChanges()`**  
**查询以外的所有操作（增、删、改），最终都必须调用 `SaveChanges()` 或 `SaveChangesAsync()` 才会真正写入数据库。** 否则只是在内存里“预演”。
==二：格式==
### 1. 增（Create）

```csharp

var book = new Book { Title = "新书", Price = 50.0 };
ctx.Books.Add(book);
await ctx.SaveChangesAsync(); // 关键：提交！
```

### 2. 删（Delete）

```csharp

var book = ctx.Books.Single(b => b.Title == "要删的书");
ctx.Books.Remove(book);
await ctx.SaveChangesAsync();
```

### 3. 改（Update）

```csharp

var book = ctx.Books.Single(b => b.Title == "要改的书");
book.Price = 100.0; // 直接修改属性
await ctx.SaveChangesAsync(); // EF Core 自动检测变化
```

### 4. 查（Read）

```csharp

// 查询所有
List<Book> all = ctx.Books.ToList();
// 条件查询
var expensive = ctx.Books.Where(b => b.Price > 20).ToList();
// 查单条
var one = ctx.Books.Single(b => b.Id == 1);
```
==三：代码==
#### 1. 增（Create）

```csharp

public async Task<IActionResult> AddBook()
{
    using (var ctx = new MyDbContext())
    {
        var book = new Book { Title = "《数学之美》", Price = 45.0 };
        ctx.Books.Add(book);
        await ctx.SaveChangesAsync(); // 提交到数据库
    }
    return Ok("添加成功");
}
```

#### 2. 删（Delete）

```csharp

public async Task<IActionResult> DeleteBook()
{
    using (var ctx = new MyDbContext())
    {
        var book = ctx.Books.Single(b => b.Title == "《数学之美》");
        ctx.Books.Remove(book);
        await ctx.SaveChangesAsync();
    }
    return Ok("删除成功");
}
```

#### 3. 改（Update）

```csharp

public async Task<IActionResult> UpdateBook()
{
    using (var ctx = new MyDbContext())
    {
        var book = ctx.Books.Single(b => b.Title == "《数学之美》");
        book.Price = 100.0; // 修改属性
        await ctx.SaveChangesAsync(); // 自动生成 UPDATE 语句
    }
    return Ok("修改成功");
}
```

#### 4. 查（Read）

```csharp

public IActionResult QueryBooks()
{
    using (var ctx = new MyDbContext())
    {
        // 查询价格大于20的书
        var books = ctx.Books.Where(b => b.Price > 20).ToList();
        return Ok(books);
    }
}
```
==四：总结==

1. **增删改必须调 `SaveChanges()`**：`Add`、`Remove`、修改属性都只是“标记”动作，只有 `SaveChanges()` 才是真正执行 SQL 的那一刻。
    
2. **查不需要 `SaveChanges()`**：查询是只读操作，直接执行 SQL 并返回结果。
    
3. **EF Core 自动跟踪变化**：从数据库查出来的对象，EF Core 会跟踪它的属性变化，`SaveChanges()` 时自动生成 UPDATE。
    
4. **推荐使用异步方法**：`SaveChangesAsync()`、`ToListAsync()` 等，避免阻塞线程，提升并发能力。
    
5. **⚠️ 性能瓶颈（重要）** ：对于**批量更新或删除**，EF Core 性能极低。比如“价格大于10的书全部涨价5元”，EF Core 会先查出所有符合条件的书，然后**逐条**生成 UPDATE 语句。数据量大时性能会非常差，此时应该用**原生 SQL**或**批量操作库**（如 EFCore.BulkExtensions）。