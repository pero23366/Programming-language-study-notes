==一：概念==
```csharp
它的核心思想是：**让你自己定义的类或结构体，也能像内置类型（如 `int`、`string`）一样，使用 `+`、`-`、`==` 等运算符**。

比如，我们有一个表示二维向量的 `Vector2` 类。在数学上，两个向量相加应该是它们的 `x` 和 `y` 分别相加。但默认情况下，C# 并不知道 `Vector2` 对象之间用 `+` 是什么意思。运算符重载就是**告诉编译器**：“当我用 `+` 连接两个 `Vector2` 时，请执行我定义好的相加逻辑”
```
==二：格式==
```csharp
public class YourClass
{
    // 重载 + 运算符
    public static YourClass operator +(YourClass a, YourClass b)
    {
        // 在这里定义 a + b 的逻辑
        // 返回一个新的 YourClass 对象
    }
}
```
%%
**必须是静态的**
**必须使用 `operator` 关键字**

%%
==三：题目==
```csharp
public class Vector2
{
    public float x;
    public float y;

    public Vector2(float x, float y)
    {
        this.x = x;
        this.y = y;
    }

    // 重载 + 运算符
    public static Vector2 operator +(Vector2 a, Vector2 b)
    {
        return new Vector2(a.x + b.x, a.y + b.y);
    }
}

// 使用
Vector2 v1 = new Vector2(1, 2);
Vector2 v2 = new Vector2(3, 4);
Vector2 v3 = v1 + v2; // 调用重载的 + 运算符
// v3 的 x 为 4，y 为 6

```
==四：补充==
```csharp
- **可以重载的运算符**：算术运算符（`+`, `-`, `*`, `/`, `%`）、比较运算符（`==`, `!=`, `>`, `<` 等）、逻辑运算符（`!`）、位运算符（`&`, `|`, `^`, `<<`, `>>`）以及 `++` 和 `--`。
    
- **必须成对重载**：如果你重载了 `==`，就必须也重载 `!=`；重载了 `>`，就必须也重载 `<`。这样可以避免逻辑矛盾。
    
- **不能重载的运算符**：主要是 `&&` 和 `||` 这两个逻辑运算符，以及赋值运算符（如 `=`、`+=`、`-=` 等）。不过，`+=` 这类复合赋值运算符的行为，是由其对应的基础运算符（如 `+`）决定的。
```