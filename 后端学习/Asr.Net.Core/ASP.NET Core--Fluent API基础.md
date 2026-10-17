==一：概念==
这一节的核心是学习**如何精细地控制C#实体类与数据库表之间的映射规则**，不再完全依赖EF Core的默认约定，而是学会使用**Fluent API**和**Data Annotation**这两种自定义配置方式。
EF Core的映射遵循“**约定优于配置**”的原则，例如类名`Book`默认映射为表`Books`，属性`Id`默认映射为主键[](https://blog.csdn.net/WSSsharon/article/details/158418258?utm_term=%2b%e5%ae%9e%e4%bd%93%e9%85%8d%e7%bd%ae#1)。但当数据库命名规范与C#命名不一致，或需要设置字段长度、必填等约束时，就需要**自定义配置**。

自定义配置主要有两种方式：

- **Fluent API（流畅API）** ：将配置写在**单独的配置类**中，实现`IEntityTypeConfiguration<T>`接口。优点是**解耦**（实体类保持干净），缺点是**相对复杂**[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
- **Data Annotation（数据注解）** ：将配置以**特性（Attribute）** 的形式直接标注在实体类的属性上。优点是**简单直观**，缺点是**耦合性高**（实体类被配置污染）[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    

二者功能大部分重叠，可以混用，但建议**选择一个项目统一使用**。长远来看，Fluent API更灵活、更解耦，是更推荐的方式[](https://www.jianshu.com/p/52c4720b7fd5#1)。
==二：格式==
**1. Data Annotation 格式**  
直接在实体类上添加`[Table("表名")]`、`[Required]`、`[MaxLength(50)]`等特性[](https://developer.aliyun.com/article/1161952#1)。

**2. Fluent API 格式**  
分为三步：

- **第一步**：为每个实体类创建一个配置类，实现`IEntityTypeConfiguration<T>`接口，在`Configure`方法中使用`builder.ToTable()`、`builder.Property().IsRequired()`等方法进行配置[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
- **第二步**：在`DbContext`的`OnModelCreating`方法中，通过`modelBuilder.ApplyConfigurationsFromAssembly()`自动加载当前程序集中所有配置类[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
- **第三步**：在`DbContext`中定义`DbSet<T>`属性[](https://www.jianshu.com/p/52c4720b7fd5#1)。
==三：代码==
**1. Data Annotation 示例**

```csharp

[Table("T_Books")] // 指定表名
public class Book
{
    public long Id { get; set; }
    [Required]          // 不能为空
    [MaxLength(50)]     // 最大长度50
    public string Title { get; set; } // 标题
    public DateTime PubTime { get; set; } // 发布日期
    public double Price { get; set; }    // 单价
}
```

引用来源：[](https://developer.aliyun.com/article/1161952#1)

**2. Fluent API 示例**

```csharp

// 配置类
public class BookConfig : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("T_Books"); // 表名
        builder.Property(b => b.Title)
               .HasMaxLength(50)    // 最大长度
               .IsRequired();       // 不能为空
    }
}

```
```csharp

// DbContext
public class MyDbContext : DbContext
{
    public DbSet<Book> Books { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // 自动加载当前程序集中所有实现了IEntityTypeConfiguration的配置类
        modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
    }
}
```

引用来源：
==四：总结==

1. **约定优先**：EF Core默认按“类名→表名、属性名→列名”规则映射，简单场景无需配置。
    
2. **两种自定义方式**：
    
    - **Data Annotation**：特性标注在实体类上，**简单但耦合**。
        
    - **Fluent API**：配置写在独立类中，**解耦但相对复杂**，推荐长期使用。
        
3. **Fluent API 三步走**：写配置类 → 在`OnModelCreating`中自动加载 → 定义`DbSet`。
    
4. **常用配置**：`ToTable`（改表名）、`HasColumnName`（改列名）、`HasMaxLength`（长度）、`IsRequired`（非空）、`HasKey`（主键）等。
    
5. **迁移生效**：配置修改后，需重新执行`Add-Migration`和`Update-Database`，EF Core会生成对应的建表/改表脚本[](https://blog.csdn.net/weixin_46407269/article/details/143532854?ops_request_misc=elastic_search_misc&request_id=5fb4c4c50c16d5160734c47fcd51a982&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-11-143532854-null-null.nonlogin&utm_term=efcore#1)