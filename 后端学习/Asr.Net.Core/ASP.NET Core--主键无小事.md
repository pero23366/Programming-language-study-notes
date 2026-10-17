==零：补充==
### 主键是什么？

**主键（Primary Key）就是每一行数据的“唯一身份证”。**

在你的 `T_Students` 表里，有两行数据：

- 第一行：李四，25，lisi@example.com
    
- 第二行：李四，22，lisi@example.com
    

**问题来了**：这两个人都叫李四，如果老师要“把李四的年龄改成 26”，数据库怎么知道该改哪一个？

这时候，**`Id` 就派上用场了**：

- 第一行是 `Id = 1`
    
- 第二行是 `Id = 3`
    

老师只需要说：“把 `Id = 1` 的那个学生的年龄改成 26。” 数据库就能精准定位，绝不会改错。

**主键的核心特性：**

- **唯一**：整个表里，每一行的主键值绝对不能重复。
    
- **不可空**：每一行必须有一个主键值（不能为空）。
    
- **不可变**：一旦分配，理论上就不应该再修改（你什么时候见过自己的身份证号变过？）。
    

**数据库会为主键自动建一个“索引”（就像书的目录）**。你查 `WHERE Id = 1` 时，它直接翻目录，瞬间定位，而不用把整个表从头翻到尾。这就是为什么主键查询特别快。

**在你的代码里**：

```csharp

public long Id { get; set; }  // 这就是主键
```

EF Core 看到叫 `Id` 的属性，就自动把它当主键，并且默认让数据库自增（1、2、3、4...）。你**不需要手动赋值**，数据库会帮你生成。
==一：概念==
**为什么说“主键无小事”？**

主键是表中每一行数据的唯一标识。EF Core 默认把名为 `Id` 或 `<类型名>Id` 的属性设为主键。但选什么类型做主键，背后有巨大的性能和安全考量：

|主键类型|优点|缺点|适用场景|
|---|---|---|---|
|**自增（int/long）**|简单、有序、性能好|分布式系统合并数据麻烦、ID可被预测（安全性差）|单库、内部系统|
|**Guid**|全局唯一、适合分布式|占用空间大、无序（聚集索引性能差）|多库合并、对外暴露|
|**混合（自增+Guid）**|兼顾性能与安全|多一个字段|对外业务系统|
|**Hi/Lo 算法**|本地生成、高效|非 EF Core 标准|高并发场景|

**自增主键的关键特性**：`long`、`int` 类型主键默认自增。**SaveChanges 后，EF Core 会自动把数据库生成的主键值更新到 Id 属性上**[](https://www.cnblogs.com/guan-tou6/p/18237579#1)。**代码中不能为自增主键赋值**，必须保持默认值 0，否则运行时会报错[](https://www.cnblogs.com/guan-tou6/p/18237579#1)。

**Guid 主键的关键特性**：Guid 算法生成全局唯一的 ID，适合分布式系统[](https://www.cnblogs.com/guan-tou6/p/18237579#1)。但 Guid 值不连续，**不能把 Guid 设为主键的聚集索引**，否则插入性能会非常差[](https://www.cnblogs.com/guan-tou6/p/18237579#1)。
==二：格式==
**1. 自增主键（默认）**

```csharp

public class Student
{
    public long Id { get; set; }  // long/int 默认自增
    public string Name { get; set; }
}
```

**2. Guid 主键**

```csharp

public class Rabbit
{
    public Guid Id { get; set; }  // Guid 类型默认由 EF Core 生成
    public string Name { get; set; }
}
```

**3. 复合主键（Fluent API）**

```csharp

builder.HasKey(s => new { s.StudentId, s.CourseId });
```

**4. 手动指定主键名（Fluent API）**

```csharp

modelBuilder.Entity<Blog>()
    .HasKey(b => b.BlogId)
    .HasName("PrimaryKey_BlogId");

```
**5. 混合方案（自增做主键 + Guid 做业务标识）**

```csharp

public class Order
{
    public long Id { get; set; }       // 物理主键，自增，用于表关联
    public Guid OrderNo { get; set; }  // 逻辑主键，用于对外展示
}
```
==三：代码==
**1. 自增主键演示**

```csharp

var student = new Student { Name = "张三", Age = 20, Email = "zs@example.com" };
// student.Id 此时是 0
_dbContext.Students.Add(student);
await _dbContext.SaveChangesAsync();
// student.Id 此时变成了数据库生成的值，比如 1
Console.WriteLine($"新学生的 Id 是：{student.Id}");

```
**关键**：`SaveChanges()` 之前 `Id` 是 0，之后自动变成了数据库生成的值。

**2. Guid 主键演示**

```csharp

var rabbit = new Rabbit { Name = "小白" };
rabbit.Id = Guid.NewGuid(); // 手动赋值（推荐）
Console.WriteLine($"插入前 Id：{rabbit.Id}");
_dbContext.Rabbits.Add(rabbit);
await _dbContext.SaveChangesAsync();
Console.WriteLine($"插入后 Id：{rabbit.Id}"); // 和插入前一样
```

**3. Fluent API 配置复合主键**

```csharp

public class StudentCourseConfig : IEntityTypeConfiguration<StudentCourse>
{
    public void Configure(EntityTypeBuilder<StudentCourse> builder)
    {
        builder.HasKey(sc => new { sc.StudentId, sc.CourseId });
    }
}
```

**4. 配置自增主键的起始值和步长（SQL Server）**

```csharp

builder.Property(s => s.Id).UseIdentityColumn(seed: 1000, increment: 10);
```
==四：总结==

1. **默认约定**：名为 `Id` 或 `<类型名>Id` 的属性自动成为主键。`int`/`long` 类型默认自增。
    
2. **自增主键**：`SaveChanges()` 后 Id 自动回填。**代码中不能手动赋值**，否则报错。
    
3. **Guid 主键**：适合分布式系统，但**不要设聚集索引**。推荐手动赋值 `Guid.NewGuid()`。
    
4. **复合主键**：用 `HasKey(s => new { s.A, s.B })` 配置。
    
5. **混合方案**：自增列做物理主键（表关联），Guid 列做逻辑主键（对外暴露），兼顾性能和安全。
    
6. **主键名**：可以用 `.HasName("PrimaryKey_BlogId")` 自定义主键约束名。