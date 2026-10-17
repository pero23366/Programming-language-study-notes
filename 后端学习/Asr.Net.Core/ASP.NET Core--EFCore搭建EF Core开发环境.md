==一：概念==
1. **Code First（代码先行）**：这是EF Core最推荐的开发模式。它的核心思想是：**先写C#的实体类，再由EF Core根据这些类自动生成数据库的表结构**[](https://blog.csdn.net/wsssharon/article/details/158379361?ops_request_misc=elastic_search_misc&request_id=1cae17f1a436b5d622321d865beccbb2&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-28-158379361-null-null.nonlogin&utm_term=BatchUpdateAsync#1)。这是一种“以代码为中心”的思维方式。
    
2. **实体配置类（IEntityTypeConfiguration）**：虽然EF Core能根据类名、属性名自动推断出表结构（比如把`Book`类的`Id`属性识别为主键），但这往往不够灵活。为了更精细地控制表名、字段类型、长度、是否必填等，我们需要一个“配置类”来专门负责这些设定[](https://www.jianshu.com/p/47492cd97443#1)。
    
3. **DbContext（数据库上下文）**：它是EF Core的“总管”或“管家”。它负责：
    
    - 建立与数据库的连接（通过连接字符串）。
        
    - 管理所有实体类到数据库表的映射（通过`DbSet<T>`属性）。
        
    - 加载所有的实体配置类[](https://www.jianshu.com/p/47492cd97443#1)。
        
4. **迁移（Migration）**：这是EF Core的一个强大功能。它不是直接操作数据库，而是**将你对C#模型的修改（比如新增一个类、修改一个属性）生成一个“迁移脚本”**。这个脚本是C#代码，记录了从当前数据库状态到新状态的所有变化[](https://www.jianshu.com/p/47492cd97443#1)。
==二：格式==
搭建EF Core开发环境，需要遵循一个固定的格式流程。整个流程可以分为四个步骤：

5. **安装NuGet包**：为项目引入必要的EF Core库。
    
6. **创建实体类**：定义你要映射到数据库的C#类。
    
7. **创建实体配置类**：为每个实体类提供详细的配置。
    
8. **创建DbContext**：定义数据库的“总管”。
==三：代码==
#### 1. 安装NuGet包

在Visual Studio中，通过“程序包管理器控制台”安装以下两个包[](https://www.jianshu.com/p/47492cd97443#1)：

```powershell

Install-Package Microsoft.EntityFrameworkCore.SqlServer
Install-Package Microsoft.EntityFrameworkCore.Tools

```
#### 2. 创建实体类（Book.cs）

在项目中的`Models`文件夹下创建一个`Book`类[](https://www.jianshu.com/p/47492cd97443#1)：

```csharp

namespace ImportExcelMVCTest.Models
{
    public class Book
    {
        public long Id { get; set; }        // 主键
        public string? Title { get; set; }   // 标题
        public DateTime PubTime { get; set; } // 发布日期
        public double Price { get; set; }    // 单价
    }
}

```
#### 3. 创建实体配置类（BookConfig.cs）

在`Models`文件夹下创建`BookConfig`类，它实现了`IEntityTypeConfiguration<Book>`接口[](https://www.jianshu.com/p/47492cd97443#1)：

```csharp

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace ImportExcelMVCTest.Models
{
    public class BookConfig : IEntityTypeConfiguration<Book>
    {
        public void Configure(EntityTypeBuilder<Book> builder)
        {
            // 指定Book实体对应的数据库表名称为"T_Books"
            builder.ToTable("T_Books");
        }
    }
}
```

#### 4. 创建DbContext（MyDbContext.cs）

创建`MyDbContext`类，它继承自`DbContext`[](https://www.jianshu.com/p/47492cd97443#1)：

```csharp

using Microsoft.EntityFrameworkCore;
namespace ImportExcelMVCTest.Models
{
    public class MyDbContext : DbContext
    {
        // 1. 定义DbSet属性，代表数据库中的一张表
        public DbSet<Book> Books { get; set; }
        // 2. 配置数据库连接
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            base.OnConfiguring(optionsBuilder);
            optionsBuilder.UseSqlServer("Data Source=计算机名\\服务器名;Initial Catalog=数据库名;User ID=xxx;Password=xxx;TrustServerCertificate=true");
        }
        // 3. 加载所有实体配置类
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // 从当前程序集加载所有的IEntityTypeConfiguration配置类
            modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
        }
    }
}
```

#### 5. 生成数据库（迁移命令）

在“程序包管理器控制台”中依次执行以下两个命令[](https://www.jianshu.com/p/47492cd97443#1)：

```powershell

# 1. 创建迁移文件（此时还未操作数据库）
Add-Migration InitialCreate
# 2. 执行迁移，将变更应用到数据库
Update-Database
```

执行完`Update-Database`后，数据库中就成功创建了`T_Books`这张表。
==四：总结==

本节的核心是**搭建EF Core的开发环境**，其关键流程可以概括为：

1. **安装EF Core工具包**：`Microsoft.EntityFrameworkCore.SqlServer` 和 `Microsoft.EntityFrameworkCore.Tools`。
    
2. **定义数据模型**：创建实体类（如`Book`），EF Core会据此生成数据库表。
    
3. **精细化配置**：通过实现`IEntityTypeConfiguration<T>`的配置类，灵活控制表名、字段等细节。
    
4. **定义数据库上下文**：创建继承自`DbContext`的类，在其中声明`DbSet`，并配置连接字符串和加载所有配置类。
    
5. **迁移建库**：使用`Add-Migration`生成迁移脚本，再用`Update-Database`将模型变更同步到数据库，最终生成实际的数据库表。