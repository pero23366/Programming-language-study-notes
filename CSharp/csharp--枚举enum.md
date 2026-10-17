==一：定义==
C# 里的 `enum`（枚举）用来定义**一组有名字的常量**
`枚举变量只能保存这些命名值（或强制转换后的底层整数值）`
==二：意义==
1. **代替魔法数字/字符串**  
    比如订单状态不要写 `0/1/2`，而是写 `Pending/Paid/Shipped`。
    
2. **类型安全**  
    方法参数写成枚举类型，调用者只能传枚举里的值，IDE 也有提示。
    
3. **可读性和可维护性更好**  
    `status == OrderStatus.Paid` 比 `status == 1` 清楚得多。
    
4. **配合 `switch` 很清晰**  
    分支处理状态、类型、角色等。
    
5. **配合 `[Flags]` 表示组合值**  
    比如权限：读、写、执行可以组合。
```text
==默认底层类型是 `int`==，也可以指定：

csharp

enum SmallStatus : byte
{
    A = 1,
    B = 2
}
```
```text
- 枚举是值类型，默认底层是 `int`。
    
- 默认第一个成员是 `0`，后面依次加 `1`。
    
- 枚举变量不能直接赋 `int`，需要强制转换：`(OrderStatus)1`。

```
## ==不写 `:`，底层类型默认是 `int`==
```csharp
enum OrderStatus
{
    Pending,
    Paid,
    Shipped
}
```
它等价于：
```csharp
enum OrderStatus : int
{
    Pending = 0,
    Paid = 1,
    Shipped = 2
}
```