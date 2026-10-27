==一：概念==

**这一节到底在学什么**

一对多，外键能塞在"多"的那张表里。一对一，外键塞在任意一边。那多对多呢？

学生和老师：一个学生有多个老师，一个老师有多个学生。你试着把外键放进去 —— 无论放哪张表都塞不下：

```
T_Students
Id  Name   TeacherId
1   张三   1,2,3        ← 一列存了三个值，数据库不认
```

这就是**第一范式（1NF）**的要求：**一个格子只能有一个值**（原子性）。一列存 `1,2,3` 这种"逗号分隔的 Id 列表"，是新手最常见的作死法 —— 你没法建外键约束、没法建索引、`WHERE TeacherId = 2` 会误匹配 `12`，还得靠 `LIKE '%2%'`。

**所以关系型数据库里，多对多在物理层面根本不存在。它只是"两个一对多"拼出来的假象。**

```
        多对多（你以为）              实际存法（数据库里）
                                    
  Student  ←──────→  Teacher      T_Students        T_Students_Teachers        T_Teachers
    张三             杨中科        Id  Name          StudentId  TeacherId        Id  Name
    李四             王五          1   张三          1          1                 1   杨中科
                                   2   李四          1          2                 2   王五
                                                    ↑ 中间表（连接表）
```

这张中间表干的事只有一件：**记录"谁和谁有关系"**。它自己没有任何业务数据，两列全是外键，指向两边的表。

> 换个视角看：`Student` 1:N `StudentTeacher`，`Teacher` 1:N `StudentTeacher`。**多对多 = 中间表当"多"方的两个一对多**。上一节学的所有东西（外键、删除行为、Include）在这里原样复用。

---

**术语对齐（看报错、看文档都会撞见）**

| 叫法 | 英文 | 含义 |
|---|---|---|
| 中间表 | join table / junction table / linking table | 只存两列外键的表 |
| 连接实体 | join entity | 中间表对应的 C# 类 |
| 跳过导航属性 | **skip navigation** | 隐式中间表下，`Student.Teachers` 这种"跳过中间表直接到对方"的集合属性 |
| 负载列 | payload | 中间表上除两个外键之外**额外的业务列**（成绩、报名时间） |

> **skip navigation 这个词必须认识**。EF Core 的异常信息里会直接写 `The skip navigation property 'Teachers' ...`，看不懂就卡死。

---

**EF Core 给了三条路，选哪条取决于一件事**

| 方案 | C# 里有没有中间实体类 | 中间表能加业务列吗 | 能 `ctx.Set<中间表>()` 吗 | 适用 |
|---|---|---|---|---|
| **A. 隐式中间表**（EF Core 5+） | 没有 | **不能**（只能塞共享属性，很别扭） | 不能（类型不存在） | 纯"有关系/没关系"，如文章 ↔ 标签 |
| **B. 显式中间实体 + `UsingEntity<T>`** | 有 | **能**，就是普通属性 | 能 | 有关系**还有数据**，如选课有成绩、点赞有时间 |
| **C. 只建中间实体，不配多对多** | 有 | 能 | 能 | EF Core 5 之前的老写法，现在不推荐（拿不到 `student.Courses`） |

**判定口诀：中间表上有没有"除了 A 和 B 之外"的列？**

- 没有 → 方案 A，两行配置搞定。
- 有 → 方案 B。比如"选课"要记成绩，"点赞"要记时间，"关注"要记关注日期。**这些数据没地方放，只能放在中间表上。**

> 杨中科课上多讲方案 B，因为 EF Core 5 之前多对多**只能**这么写，而且真实业务里中间表十有八九要带字段。但方案 A 你必须会，因为看到别人代码里没有中间实体的 `HasMany().WithMany()`，不懂就会以为"关系没配上"。

---

**中间表的主键怎么定 —— 这个决定会防住一类脏数据**

| 主键方案 | 写法 | 后果 |
|---|---|---|
| **复合主键**（推荐） | `HasKey(e => new { e.StudentId, e.CourseId })` | 同一对学生-课程只能出现一次，重复选课直接被数据库顶回来 |
| 独立自增 Id | `public long Id { get; set; }` + 默认主键 | 同一对可以出现两次 → 数据重复，要自己写代码去重 |

隐式中间表**自动**用复合主键，这是它比手写更省心的地方。显式中间实体时，**永远记得自己写 `HasKey` 复合主键**，否则你会莫名其妙多出一列 `Id`，还允许重复关系。

---

**符号逐个拆解（本节新增，第一次出现必须讲清）**

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `HasMany(expr)` | 从"我"这端声明：我有 N 个对方（返回 `CollectionNavigationBuilder`） | Fluent 链开头 | — |
| `WithMany(expr)` | 接在 `HasMany` 后，声明对方也有 N 个我 → **这就是多对多** | 链式调用 | 不写 `WithMany` 就是一对多 |
| `WithMany()` **空参** | 声明"对方没有集合导航"，但也参与这条关系 | 链式调用 | 用在显式中间实体里，避免和已有集合导航重复配关系 |
| `UsingEntity(...)` | **多对多专属**：告诉 EF 这条关系的中间表该怎么建 | 链式调用 | 走默认：中间表名和列名全由 EF 拼，改不动 |
| `UsingEntity(j => j.ToTable("x"))` | 单参数重载，只配置**隐式**中间表的表名/列名 | 链式调用 | 表名是 `StudentTeacher` 这种拼出来的名字 |
| `UsingEntity<TJoin>(右配, 左配, 表配)` | 三参数重载，`TJoin` 是**显式中间实体类型** | 链式调用 | 用隐式表，拿不到业务列 |
| `EntityTypeBuilder<TJoin>` | 三参数的第三个 lambda 的参数类型，**中间表本身的实体构建器** | 框架传入 | — |
| `HasKey(expr)` | 指定主键（可以是多个属性 = 复合主键） | 链式调用 | 走约定：找名为 `Id`/`<类名>Id` 的属性 |
| `new { e.A, e.B }` | **匿名类型**，这里只是"一次传多个属性"的语法糖，EF 解析表达式树读出属性列表 | 你写，EF 解析 | 只能指定单属性主键 |
| `Property<TProp>(expr)` | 配置某个**标量属性**的列规则（长度、默认值、精度） | 链式调用 | 用约定映射 |
| `Set<T>()` | 按类型取 `DbSet<T>`，用于**中间实体**没有在 `DbContext` 上暴露成属性时 | 你的 LINQ 里 | 只能给 `DbContext` 加 `DbSet` 属性 |
| `FindAsync(keys)` | 按主键查一条，**先查内存跟踪缓存**，命中就不发 SQL | 你的代码里 | 用 `FirstAsync(x => x.Id == 1)` 每次都发 SQL |
| `Include` / `ThenInclude` | 预加载导航属性（上一节已讲），多对多照样用 | 你的 LINQ 里 | 集合恒为空，**不报错** |
| `AsSplitQuery()` | 让 EF 把 `Include` 多个集合的查询**拆成多条 SQL**，避免 JOIN 笛卡尔积 | 链式调用 | 一条大 SQL，行数 = 两集合数量相乘 |

---

**为什么隐式中间表的列名那么丑**

EF 会自己造一个 join entity type，类型名是两边实体名按字母序拼起来（`Teacher` + `Student` → `StudentTeacher`），列名取**导航属性名 + `Id`**（`Students` → `StudentsId`）。

| 项目 | 默认值 | 能不能改 |
|---|---|---|
| 表名 | 两个实体名拼接，如 `StudentTeacher` | 能，`UsingEntity(j => j.ToTable("T_Students_Teachers"))` |
| 列名 | 导航属性名 + `Id`，如 `StudentsId` / `TeachersId` | 单参数重载改不了；要改列名就得转方案 B |
| 主键 | `(StudentsId, TeachersId)` 复合主键 | 改不了 |
| 外键删除行为 | 两边都是 **Cascade** | 能，`UsingEntity(j => j.HasOne<Student>().WithMany().HasForeignKey("StudentsId").OnDelete(...))`，很麻烦 |

> **实践建议**：表名一定要改（数据库里 `StudentTeacher` 这种名字，DBA 看了想打人）。列名忍不了就上方案 B。

---

**六个坑，全是真踩过的**

1. **两端都配 `WithMany`** —— 在 `StudentConfig` 里配一次 `HasMany(s=>s.Teachers).WithMany(t=>t.Students)`，又在 `TeacherConfig` 里反向再配一次，EF 会当成**两条不同的关系**，最后出来两张中间表。**只配一端就行。**
2. **隐式中间表想加列** —— 没有中间实体，你只能在 `UsingEntity(j => j.Property<DateTime>("CreatedAt"))` 里加"共享属性"，读的时候要靠 `ctx.Entry(x).Property("CreatedAt").CurrentValue`。**能不用就别用，直接转方案 B。**
3. **忘了复合主键** —— 显式中间实体不给 `HasKey`，EF 找不到 `Id` 就**报错**（`The entity type 'Enrollment' requires a primary key`），或者你随手加了个 `Id`，从此允许重复关系。
4. **`Include` 两个集合导致结果翻倍** —— `Include(s => s.Teachers).Include(s => s.Courses)` 一条 SQL 出来，行数 = 老师数 × 课程数。加 `.AsSplitQuery()` 拆成三条。
5. **给已存在的实体加关系时把对方也 Add 了** —— `ctx.Students.Add(student)` 而 `student.Teachers` 里装的是从库里查出来的老师，EF 会尝试**再插一遍老师**（主键冲突）。正确做法是只 `Add` 中间关系，或者确保对方是"被跟踪的已存在实体"。
6. **SQL Server 多级联路径报错** —— 中间表两条外键都 `Cascade` 是**允许的**（指向两张不同的表）；但如果 A→B 级联、B→A 也级联这种**环**，才会报 `may cause cycles or multiple cascade paths`。自引用关系最容易撞（上一节 `Category` 就是）。

==二：格式==

**1. 隐式中间表（最短写法，两行）**
```csharp
// Student.Teachers / Teacher.Students 两个集合导航都要有
builder.HasMany(s => s.Teachers)
       .WithMany(t => t.Students);
```

**2. 隐式中间表 + 改表名（推荐的最低配）**
```csharp
builder.HasMany(s => s.Teachers)
       .WithMany(t => t.Students)
       .UsingEntity(j => j.ToTable("T_Students_Teachers"));
```

**3. 单向多对多（对方没有集合导航）**
```csharp
builder.HasMany(s => s.Teachers)
       .WithMany()          // 空参：Teacher 类里不写 List<Student>
       .UsingEntity(j => j.ToTable("T_Students_Teachers"));
```

**4. 显式中间实体 + 三参数 `UsingEntity`（要业务列就用这个）**
```csharp
builder.HasMany(s => s.Courses)
       .WithMany(c => c.Students)
       .UsingEntity<Enrollment>(
           // 参数①：中间表 → 对方（Course）的那条一对多
           j => j.HasOne(e => e.Course).WithMany().HasForeignKey(e => e.CourseId),
           // 参数②：中间表 → 本端（Student）的那条一对多
           j => j.HasOne(e => e.Student).WithMany().HasForeignKey(e => e.StudentId),
           // 参数③：中间表自己的建表规则
           j =>
           {
               j.ToTable("T_Enrollments");
               j.HasKey(e => new { e.StudentId, e.CourseId });   // 复合主键，防重复
               j.Property(e => e.Score).HasDefaultValue(0);
           });
```

> 注意参数①②里的 `WithMany()` 是**空参**。因为 `Student.Courses` 已经被最外层的 `HasMany` 占了，再写一次就重复配关系。

**5. 查询（两个方向都一样，都要 `Include`）**
```csharp
var students = await ctx.Students.Include(s => s.Teachers).ToListAsync();   // 学生 → 老师
var teachers = await ctx.Teachers.Include(t => t.Students).ToListAsync();   // 老师 → 学生

// 带条件：哪些学生选了"杨中科"
var picked = await ctx.Students
    .Where(s => s.Teachers.Any(t => t.Name == "杨中科"))
    .ToListAsync();
```

**6. 加 / 删关系（不删实体，只动中间表）**
```csharp
student.Teachers.Add(teacher);      // INSERT 中间表一行
await ctx.SaveChangesAsync();

student.Teachers.Remove(teacher);   // DELETE 中间表一行
await ctx.SaveChangesAsync();
```

**7. 显式中间实体时，直接查中间表拿业务数据**
```csharp
var rows = await ctx.Set<Enrollment>()
    .Include(e => e.Student)
    .Include(e => e.Course)
    .Where(e => e.Score >= 90)
    .OrderByDescending(e => e.Score)
    .ToListAsync();
```

==三：代码==

**场景**：控制台项目 `ManyToManyDemo`。先做 `Student` ↔ `Teacher` 的**隐式中间表**（看 DDL、看 SQL、跑通增删查），再改成 `Student` ↔ `Course` 的**显式中间实体**（带成绩）。

**第 0 步：建项目**
```bash
dotnet new console -n ManyToManyDemo
cd ManyToManyDemo
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
```

**第 1 步：实体（隐式方案，注意没有任何中间类）**
```csharp
// Models/Student.cs
public class Student
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<Teacher> Teachers { get; set; } = new();   // 集合导航，指向老师
}

// Models/Teacher.cs
public class Teacher
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<Student> Students { get; set; } = new();   // 集合导航，指向学生
}
```

**第 2 步：配置类（只在一端写，这是重点）**
```csharp
// Models/Configs/StudentConfig.cs
public class StudentConfig : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("T_Students");
        builder.Property(s => s.Name).HasMaxLength(50).IsRequired();

        builder.HasMany(s => s.Teachers)
               .WithMany(t => t.Students)
               .UsingEntity(j => j.ToTable("T_Students_Teachers"));
    }
}

// Models/Configs/TeacherConfig.cs —— 只配自己的列，绝对不要再配一次关系
public class TeacherConfig : IEntityTypeConfiguration<Teacher>
{
    public void Configure(EntityTypeBuilder<Teacher> builder)
    {
        builder.ToTable("T_Teachers");
        builder.Property(t => t.Name).HasMaxLength(50).IsRequired();
    }
}
```

**第 3 步：DbContext**
```csharp
public class DemoContext : DbContext
{
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Teacher> Teachers => Set<Teacher>();

    protected override void OnConfiguring(DbContextOptionsBuilder opt)
    {
        opt.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=ManyToManyDemo;Trusted_Connection=True;TrustServerCertificate=True")
           .LogTo(Console.WriteLine, LogLevel.Information)     // 顺手看 SQL
           .EnableSensitiveDataLogging();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
    }
}
```

**第 4 步：迁移，然后盯住 DDL**
```bash
dotnet ef migrations add AddStudentTeacher
dotnet ef database update
```
打开 `Migrations/xxx_AddStudentTeacher.cs` 的 `Up()`，你会看到三张表，其中：
```sql
CREATE TABLE [T_Students_Teachers] (
    [StudentsId] bigint NOT NULL,
    [TeachersId] bigint NOT NULL,
    CONSTRAINT [PK_T_Students_Teachers] PRIMARY KEY ([StudentsId], [TeachersId]),
    CONSTRAINT [FK_T_Students_Teachers_T_Students_StudentsId]
        FOREIGN KEY ([StudentsId]) REFERENCES [T_Students] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_T_Students_Teachers_T_Teachers_TeachersId]
        FOREIGN KEY ([TeachersId]) REFERENCES [T_Teachers] ([Id]) ON DELETE CASCADE
);
CREATE INDEX [IX_T_Students_Teachers_TeachersId] ON [T_Students_Teachers] ([TeachersId]);
```
**四件事必须自己看明白**：

| 看到什么 | 说明什么 |
|---|---|
| 表名 `T_Students_Teachers` | 来自 `UsingEntity(j => j.ToTable(...))`，不写就是 `StudentTeacher` |
| 列名 `StudentsId` / `TeachersId` | EF 拿**导航属性名 + Id** 拼的，不是 `StudentId`。所以名字丑，忍不了就用显式实体 |
| `PRIMARY KEY ([StudentsId], [TeachersId])` | **复合主键**，同一对学生-老师不可能重复 |
| 两条 `ON DELETE CASCADE` | 删学生或删老师，中间表对应行自动清掉（不留孤儿行） |
| `IX_..._TeachersId` | 复合主键已经覆盖了 `StudentsId` 开头的查询，EF 只补建 `TeachersId` 的索引 |

**第 5 步：插入数据（两种写法，效果不同）**
```csharp
using var ctx = new DemoContext();

// 写法一：整张图一起建 —— 学生和老师都是新的
var s1 = new Student
{
    Name = "张三",
    Teachers =
    {
        new Teacher { Name = "杨中科" },
        new Teacher { Name = "李四" }
    }
};
ctx.Students.Add(s1);
await ctx.SaveChangesAsync();
// 执行顺序：INSERT T_Students → INSERT T_Teachers ×2 → INSERT T_Students_Teachers ×2
```
输出的 SQL 里能看到最后那两条：
```sql
INSERT INTO [T_Students_Teachers] ([StudentsId], [TeachersId]) VALUES (@p0, @p1);
```
> `Student.Teachers = { ... }` 是**集合初始化器**语法（省略 `new List<Teacher>`），因为第 1 步已经给了初始值 `= new()`。写成 `Teachers = new List<Teacher> { ... }` 也完全等价。

**第 6 步：给"已经存在"的学生加一个"已经存在"的老师（最常用的真实场景）**
```csharp
// 先补两条基础数据
ctx.Teachers.AddRange(new Teacher { Name = "王五" }, new Teacher { Name = "赵六" });
ctx.Students.Add(new Student { Name = "李四" });
await ctx.SaveChangesAsync();

// 关键：双方都必须是"被跟踪的已存在实体"
var student = await ctx.Students.Include(s => s.Teachers).FirstAsync(s => s.Name == "李四");
var teacher = await ctx.Teachers.FirstAsync(t => t.Name == "王五");

student.Teachers.Add(teacher);
await ctx.SaveChangesAsync();     // 只产生一条 INSERT，插中间表
```
**如果这里报 `DbUpdateException: 违反 PRIMARY KEY 约束`**，说明你把老师当成新对象又插了一遍 —— 那是"对象引用"和"数据库行"没对上，见总结里的坑 5。

**第 7 步：查询（两个方向 + 条件过滤）**
```csharp
// 学生 → 老师
var students = await ctx.Students.Include(s => s.Teachers).ToListAsync();
foreach (var s in students)
{
    Console.WriteLine($"{s.Name} 的老师：{string.Join("、", s.Teachers.Select(t => t.Name))}");
}

// 老师 → 学生
var teachers = await ctx.Teachers.Include(t => t.Students).ToListAsync();
foreach (var t in teachers)
{
    Console.WriteLine($"{t.Name} 教 {t.Students.Count} 个学生");
}

// 条件过滤：哪些学生是"杨中科"的学生
var mine = await ctx.Students
    .Where(s => s.Teachers.Any(t => t.Name == "杨中科"))
    .Select(s => s.Name)
    .ToListAsync();
```
输出：
```
张三 的老师：杨中科、李四
李四 的老师：王五
杨中科 教 1 个学生
...
```
> `Any(...)` 会被翻译成 `EXISTS (SELECT 1 FROM T_Students_Teachers JOIN T_Teachers ...)`，**这是多对多过滤的标准写法**，比先 `Include` 再到内存里筛快得多（P71 会专门讲这类"基于关系的复杂查询"）。

**第 8 步：删关系 ≠ 删实体**
```csharp
var s = await ctx.Students.Include(x => x.Teachers).FirstAsync(x => x.Name == "张三");
var t = s.Teachers.First(x => x.Name == "李四");

s.Teachers.Remove(t);
await ctx.SaveChangesAsync();
// 只 DELETE 中间表那一行；T_Teachers 里的"李四"还在
Console.WriteLine($"老师数：{await ctx.Teachers.CountAsync()}，张三的老师数：{s.Teachers.Count}");
```
输出：
```
老师数：4，张三的老师数：1
```
> 想彻底删老师，就 `ctx.Teachers.Remove(t)` —— 那时**中间表的行会被级联删掉**（`ON DELETE CASCADE`），学生本身不受影响。

**第 9 步：换方案 B —— 显式中间实体，因为"选课要记成绩"**
```csharp
// Models/Course.cs
public class Course
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Student> Students { get; set; } = new();
}

// Models/Enrollment.cs —— 中间表，业务列放这儿
public class Enrollment
{
    public long StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public long CourseId { get; set; }
    public Course Course { get; set; } = null!;

    public int Score { get; set; }              // 负载列：成绩
    public DateTime EnrolledAt { get; set; }    // 负载列：选课时间
}
```
给 `Student` 加一行 `public List<Course> Courses { get; set; } = new();`，然后配置：
```csharp
// Models/Configs/StudentConfig.cs 追加
builder.HasMany(s => s.Courses)
       .WithMany(c => c.Students)
       .UsingEntity<Enrollment>(
           j => j.HasOne(e => e.Course).WithMany().HasForeignKey(e => e.CourseId),
           j => j.HasOne(e => e.Student).WithMany().HasForeignKey(e => e.StudentId),
           j =>
           {
               j.ToTable("T_Enrollments");
               j.HasKey(e => new { e.StudentId, e.CourseId });
               j.Property(e => e.EnrolledAt).HasDefaultValueSql("GETDATE()");
           });
```
> `HasDefaultValueSql("GETDATE()")` 让**数据库**填默认值（SQL Server 函数），C# 侧不赋值也行。它是 `Property(...)` 上的方法，作用在列定义上，生成 `DEFAULT (GETDATE())`。

再迁移一次：
```bash
dotnet ef migrations add AddCourseEnrollment
dotnet ef database update
```

**第 10 步：用显式中间表插入 + 查成绩**
```csharp
ctx.Courses.AddRange(new Course { Name = "C#" }, new Course { Name = "日语" });
await ctx.SaveChangesAsync();

var stu = await ctx.Students.FirstAsync(x => x.Name == "张三");
var c1 = await ctx.Courses.FirstAsync(x => x.Name == "C#");

// 方式一：只加关系，成绩后面再改（中间表由 EF 自动插，Score 取默认 0）
stu.Courses.Add(c1);

// 方式二：直接操作中间实体，一次写全
ctx.Set<Enrollment>().Add(new Enrollment { StudentId = stu.Id, CourseId = c1.Id, Score = 95 });

await ctx.SaveChangesAsync();
```
查询：
```csharp
var rows = await ctx.Set<Enrollment>()
    .Include(e => e.Student)
    .Include(e => e.Course)
    .OrderByDescending(e => e.Score)
    .ToListAsync();

foreach (var r in rows)
    Console.WriteLine($"{r.Student.Name} — {r.Course.Name} — {r.Score}");
```
输出：
```
张三 — C# — 95
```

**第 11 步：故意撞一次复合主键**
```csharp
ctx.Set<Enrollment>().Add(new Enrollment { StudentId = stu.Id, CourseId = c1.Id, Score = 60 });
await ctx.SaveChangesAsync();   // ← 这里炸
```
```
Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes.
  ---> Microsoft.Data.SqlClient.SqlException:
  Violation of PRIMARY KEY constraint 'PK_T_Enrollments'. Cannot insert duplicate key ...
```
**这是好事**：数据库替你把"同一门课选两次"这种脏数据挡住了。如果当初贪方便给了 `Enrollment` 一个自增 `Id`，这条重复数据会**安静地插进去**，等你算平均分的时候才发现。

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 数据库能直接存多对多吗 | 不能。一列只能一个值（1NF），必须靠中间表 |
| 多对多的本质 | 两个一对多 + 一张只存两列外键的中间表 |
| C# 侧表达 | 两个集合导航：`List<Teacher>` 和 `List<Student>` |
| 隐式中间表 | `HasMany().WithMany().UsingEntity(j => j.ToTable("x"))`，EF Core 5+ |
| 显式中间实体 | `HasMany().WithMany().UsingEntity<TJoin>(右配, 左配, 表配)` |
| 选哪个 | 中间表有没有业务列：没有用隐式，有用显式 |
| 配几端 | **只配一端**，两端都配会生成两张中间表 |
| 默认表名 | 两个实体名按字母序拼接，如 `StudentTeacher` |
| 默认列名 | 导航属性名 + `Id`，如 `StudentsId` |
| 默认主键 | 复合主键（两列），天然防重复关系 |
| 显式中间实体 | **必须自己写 `HasKey` 复合主键**，否则报错或产生重复 |
| 加/删关系 | `student.Teachers.Add(t)` / `.Remove(t)`，只动中间表行 |
| 删实体 | 中间表行被 `ON DELETE CASCADE` 清掉，对方实体不受影响 |
| 查询 | 两个方向都要 `Include`；带条件过滤用 `集合.Any(...)` → `EXISTS` |
| 隐式 vs 显式的代价 | 隐式省一个类，但列名/删除行为改不动，不能 `Set<中间表>()` |

**隐式 vs 显式 对照**

| 维度 | 隐式中间表 | 显式中间实体 |
|---|---|---|
| C# 代码量 | 少一个类 | 多一个类（但很薄） |
| 加业务列 | 做不到（只能共享属性） | 普通属性即可 |
| 改列名 | 不能 | 能（`HasForeignKey(e => e.CourseId)`） |
| 改删除行为 | 很难写 | 正常 `OnDelete` |
| 直接查中间表 | 不能（没有类型） | 能，`ctx.Set<Enrollment>()` |
| 主键 | 自动复合主键 | 自己写 `HasKey` |
| 典型场景 | 文章 ↔ 标签、学生 ↔ 老师 | 选课（成绩）、点赞（时间）、关注（日期） |

**六个易错点**

1. **两端各配一次关系** → 两张中间表，数据分家。**只在一端写**。
2. **隐式中间表想加列** → 加不了，硬塞共享属性后读取要 `ctx.Entry(...).Property("x")`。直接转显式。
3. **显式中间实体忘了 `HasKey`** → `requires a primary key` 报错；随手加 `Id` 则允许重复关系。
4. **给已存在的实体加关系时 `Add` 了对方** → 主键冲突。用"查出来的被跟踪实体"。
5. **`Include` 多个集合没加 `AsSplitQuery`** → 笛卡尔积，10 个老师 × 10 门课 = 100 行。
6. **以为 `Remove` 会删对方** → 只删中间表行，实体还在。删实体才会级联清中间表。

**记忆口诀**

> **多对多是无中生有 —— 数据库里只有两张一对多，中间表只管"谁认识谁"。**
> **没业务列用隐式：「HasMany + WithMany + UsingEntity 改表名」，两行收工。**
> **有业务列用显式：「UsingEntity<中间表>(右、左、表配)」，别忘了 HasKey 复合主键。**
> **关系只配一端，配两端出两张表。**
> **加关系是 Add，删关系是 Remove，删实体才级联。**
> **过滤用 Any 翻成 EXISTS，Include 只用来显示。**
