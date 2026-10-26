==一：概念==

**这一节只回答一个困惑**

> 同一份关系配置，写在 `Book` 的 builder 里，和写在 `Author` 的 builder 里，是同一件事吗？

答案：**是同一件事，但写法必须镜像。**

---

**为什么"哪边都行"**

在 EF 的模型里，一条关系就是一条**无向边**，连着两个实体：

```
   作者 ─────────────── 书
     └── 关系（Relation）──┘
```

这条边不属于谁，它属于**模型**。所以站在任意一端描述它，EF 都会把同一条边加进模型。

---

**但描述时必须镜像**

站在不同端，两个方法的作用对象会**对调**：

| 你站在 | 第一个方法描述 | 第二个方法描述 |
|---|---|---|
| **书**（依赖，外键在这） | `HasOne(b => b.Author)` —— 我有 1 个作者 | `WithMany(a => a.Books)` —— 作者有 N 个我 |
| **作者**（主体） | `HasMany(a => a.Books)` —— 我有 N 本书 | `WithOne(b => b.Author)` —— 每本书只有 1 个我 |

记法：

> **`Has*` 描述"我自己"，`With*` 描述"对方"。**
> 所以换一端，`HasOne ↔ HasMany`、`WithMany ↔ WithOne` 全部对调。

---

**四种组合分别代表什么（别乱搭）**

| 组合 | 关系类型 |
|---|---|
| `HasOne().WithMany()` | 一对多 |
| `HasMany().WithOne()` | 一对多（反过来写） |
| `HasOne().WithOne()` | 一对一 |
| `HasMany().WithMany()` | 多对多 |

`HasOne().WithOne()` 和 `HasMany().WithMany()` 是**另一种关系**，不是"镜像写法"。

---

**唯一真正的差别：`HasForeignKey` 的泛型**

`HasForeignKey` 必须作用在**依赖方**（`Book`）上。站在 `Author` 那侧时，`Book` 不是当前实体，编译器要靠关系推断类型。

| 写法 | 泛型要不要写 |
|---|---|
| `HasOne(b => b.Author).WithMany(a => a.Books).HasForeignKey(b => b.AuthorId)` | 不用，`b` 已是 `Book` |
| `HasMany(a => a.Books).WithOne(b => b.Author).HasForeignKey(b => b.AuthorId)` | **也不用**，`WithOne` 的 lambda 已把依赖方锁定成 `Book` |
| `HasMany<Book>().WithOne()`（对方没导航，全靠泛型） | **必须** `HasForeignKey<Book>(b => b.AuthorId)` |

> 注意这个细节：P66 说"在 Author 的 builder 里必须用泛型"是**过度概括**。真正必须写泛型的只有"两边都没有导航属性、全靠 `<T>` 指认"的情况。有 lambda 指认依赖方时，泛型可以省。

---

**两个 builder 类型方向相反**

| 写法 | 返回类型 | 泛型参数顺序 |
|---|---|---|
| `HasOne<TEntity, TRelated>` ... | `ReferenceCollectionBuilder<TPrincipal, TDependent>` | 主体在前 |
| `HasMany<TEntity, TRelated>` ... | `ReferenceCollectionBuilder<TPrincipal, TDependent>` / `CollectionNavigationBuilder` | 见方向 |

名字不用背，但要记住：**`HasOne/WithMany` 和 `HasMany/WithOne` 的链式顺序不能乱**，乱了就是另一种关系。

---

**配置位置 ≠ 导航属性位置（最容易混的一点）**

| 东西 | 由什么决定 |
|---|---|
| 配置写在哪 | 随便，哪边都行 |
| `Include` 能写哪个方向 | 只看**导航属性在哪个类上** |
| 外键列在哪 | 只看**谁是依赖方** |

三件事互不相干。

---

**符号逐个拆解（本节新增）**

| 符号 | 是什么 | 这里的含义 |
|---|---|---|
| `HasMany(expr)` | `EntityTypeBuilder<T>` 上的方法，"我有多个 X" | 从主体方起头时必须用它 |
| `ReferenceCollectionBuilder<TPrincipal, TDependent>` | `HasOne().WithMany()` / `HasMany().WithOne()` 的返回类型 | 外键在这里配，因为它知道 `TDependent` 是谁 |
| `OnModelCreating` 里的执行顺序 | 按你写 `Entity<...>` 的先后执行 | 重复配置时决定谁覆盖谁 |

==二：格式==

**1. 站在书（依赖方）—— 推荐**
```csharp
builder.HasOne(b => b.Author)
       .WithMany(a => a.Books)
       .HasForeignKey(b => b.AuthorId);
```

**2. 站在作者（主体方）—— 完全等价**
```csharp
builder.HasMany(a => a.Books)
       .WithOne(b => b.Author)
       .HasForeignKey(b => b.AuthorId);
```

**3. 两边都没有导航属性**
```csharp
builder.HasOne<Author>()
       .WithMany()
       .HasForeignKey(b => b.AuthorId);   // builder 是 Book，泛型可省
```

**4. 加删除行为（两种写法等价）**
```csharp
// 写法 A
.HasOne(b => b.Author).WithMany(a => a.Books).OnDelete(DeleteBehavior.Restrict);

// 写法 B
.HasMany(a => a.Books).WithOne(b => b.Author).OnDelete(DeleteBehavior.Restrict);
```

==三：代码==

用图书管理系统验证三种写法**等价**。

**第 1 步：把配置搬到 Author 一侧**

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<Book>(entity =>
    {
        entity.Property(b => b.Title).HasMaxLength(100).IsRequired();
    });

    // 关系配置搬到 Author 这一侧
    modelBuilder.Entity<Author>(entity =>
    {
        entity.Property(a => a.Name).HasMaxLength(50).IsRequired();

        entity.HasMany(a => a.Books)
              .WithOne(b => b.Author)
              .HasForeignKey(b => b.AuthorId);
    });
}
```

**第 2 步：迁移是空的**
```powershell
Add-Migration MoveRelationToAuthor
```
```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    // 空 —— 数据库不认识你代码里写在哪
}
```

**第 3 步：行为完全一致**
```csharp
var authors = await _ctx.Authors.Include(a => a.Books).ToListAsync();   // ✅
var books   = await _ctx.Books.Include(b => b.Author).ToListAsync();    // ✅
```
`Include` 的方向取决于**导航属性在谁身上**，跟配置写在哪完全无关。

**第 4 步：两边都写（内容一致）会怎样**

```csharp
modelBuilder.Entity<Book>(e =>
    e.HasOne(b => b.Author).WithMany(a => a.Books).HasForeignKey(b => b.AuthorId));

modelBuilder.Entity<Author>(e =>
    e.HasMany(a => a.Books).WithOne(b => b.Author).HasForeignKey(b => b.AuthorId));
```
**不报错**，等价于配一遍 —— 模型里还是一条边。但纯属浪费，且容易埋雷。

**第 5 步：两边都写（内容不一致）会怎样**

```csharp
// 书那边：级联删
entity.HasOne(b => b.Author).WithMany(a => a.Books).OnDelete(DeleteBehavior.Cascade);

// 作者那边：禁止删
entity.HasMany(a => a.Books).WithOne(b => b.Author).OnDelete(DeleteBehavior.Restrict);
```

两处作用于**同一条边**，具体生效的取决于 `OnModelCreating` 里**谁后执行**（而执行顺序 = 你写 `Entity<...>` 的先后）。

**别赌这个**：一条关系只在一处配。

**第 6 步：验证泛型可省**

```csharp
// 在 EntityTypeBuilder<Author> 里，这个能编译通过
entity.HasMany(a => a.Books)
      .WithOne(b => b.Author)
      .HasForeignKey(b => b.AuthorId);      // b 被推断为 Book

// 这个必须写泛型，因为 WithOne() 空参，没有任何线索指向 Book
entity.HasMany<Book>()
      .WithOne()
      .HasForeignKey<Book>(b => b.AuthorId);
```

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 写在哪边 | 哪边都行，模型里是同一条边 |
| 换边必须镜像 | `HasOne ↔ HasMany`、`WithMany ↔ WithOne` |
| `Has*` / `With*` 分工 | `Has*` = 我自己，`With*` = 对方 |
| 迁移影响 | 无，DDL 完全不变 |
| 泛型参数 | 有 lambda 能指认依赖方就不用写；全泛型无导航时必须写 |
| 推荐写法 | 统一写在**多**的一方（依赖方），`HasForeignKey` 最直观 |
| 重复配置 | 一致 = 无害；不一致 = 谁后执行谁生效，不要这么干 |

**三个易错点**

1. **混搭方向**：`HasOne().WithOne()` 是**一对一**，`HasMany().WithMany()` 是**多对多**，只有 `HasOne/WithMany` 和 `HasMany/WithOne` 才是一对多。
2. **把 `Include` 方向当成配置方向**：`Include(a => a.Books)` 只看 `Author` 有没有 `Books` 属性，和你在哪边写 `HasForeignKey` 毫无关系。
3. **一条关系两边都配**：内容不一致时结果依赖执行顺序，属于"今天能跑、明天重构后行为变了"的隐性 bug。

**记忆口诀**

> **一条关系一条边，站在哪头都能画；`Has` 说我自己，`With` 说对方。**
> **换边必镜像：`HasOne↔HasMany`、`WithMany↔WithOne`。**
> **配置写在哪都行，导航属性写在哪才决定 `Include` 方向。**
> **一条关系只配一处，两边都配就是给未来的自己埋雷。**
