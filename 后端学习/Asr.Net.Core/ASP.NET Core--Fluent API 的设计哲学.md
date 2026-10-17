==一：概念==
- **约定 > 配置**：EF Core 会先按一套默认规则（比如类名对应表名）来工作。只有默认规则不满足需求时，我们才需要通过配置去覆盖它[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
- **Fluent API**：就是用来覆盖默认规则的主要方式。它通过链式调用的语法（如 `.ToTable()`、`.Property()`），以一种强类型、可读性高的方式来配置实体[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
- **“为什么”要用它**：除了自由控制表名、列名、数据类型、约束等，使用 Fluent API 最大的好处是**解耦**。配置写在独立类中，实体类可以保持干净，职责单一[](https://www.jianshu.com/p/52c4720b7fd5#1)。
==二：格式==
使用 Fluent API 的核心是创建一个配置类，它需要实现 `IEntityTypeConfiguration<T>` 接口[](https://www.jianshu.com/p/52c4720b7fd5#1)。

```csharp

public class StudentConfig : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        // 链式调用，配置表名、主键、属性约束等
        builder.ToTable("T_Students");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Name).HasMaxLength(20).IsRequired();
    }
}
```
==三：代码==
我们以你项目中的 `Student` 为例，展示 Fluent API 的几种核心配置[](https://www.e-com-net.com/article/1746659419669676032.htm)。


```csharp

public class StudentConfig : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        // 1. 映射表名
        builder.ToTable("T_Students");
        // 2. 配置主键（默认是Id，但显式写出更清晰）
        builder.HasKey(s => s.Id);
        // 3. 配置属性的约束
        builder.Property(s => s.Name)
               .HasMaxLength(20) // 最大长度20
               .IsRequired();    // 不能为空
        builder.Property(s => s.Email)
               .HasMaxLength(100)
               .IsRequired();
        // 4. 设置默认值
        builder.Property(s => s.Age)
               .HasDefaultValue(18);
        // 5. 配置列名映射 (如果C#属性名和数据库列名不一致)
        // builder.Property(s => s.Email).HasColumnName("email_address");
        // 6. 忽略某个属性 (不映射到数据库)
        // builder.Ignore(s => s.TempProperty);
    }
}
```
==四：总结==

1. **核心方法**：Fluent API 主要通过 `ToTable`、`HasKey`、`Property`、`HasIndex` 等方法，对实体和数据库的映射进行精细控制。
    
2. **配置位置**：推荐使用独立的 `IEntityTypeConfiguration<T>` 配置类，实现解耦[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
3. **生效方式**：在 `DbContext` 的 `OnModelCreating` 方法中，通过 `modelBuilder.ApplyConfigurationsFromAssembly()` 自动加载所有配置类[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
4. **与 Data Annotation 的对比**：Data Annotation 直接在实体类上打特性，更简单但耦合高；Fluent API 更复杂但解耦，是更推荐的方式[](https://www.jianshu.com/p/52c4720b7fd5#1)。
    
5. **先约定后配置**：先用 EF Core 的默认约定，只在需要覆盖时才使用 Fluent API。