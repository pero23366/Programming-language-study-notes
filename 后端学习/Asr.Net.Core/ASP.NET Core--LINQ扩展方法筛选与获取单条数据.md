## 一：筛选与获取单条数据

### 1. `Where` 方法

`Where` 用于筛选符合条件的元素。它会遍历集合中的每个元素，对每个元素调用Lambda表达式进行判断，返回 `true` 则保留该元素[](https://blog.csdn.net/weixin_43847546/article/details/142827060#1)。

```csharp

IEnumerable<Employee> res = list.Where(e => e.Age > 30);

`Where` 还支持带索引的重载，Lambda的第二个参数是当前元素的索引：

```
```csharp

var res2 = list.Where((e, index) => index % 2 == 0); // 取偶数索引位置的元素
```

### 2. 获取单条数据的方法

LINQ提供了四种获取单条数据的方法，它们在“多条匹配”和“零条匹配”时的行为各不相同[](https://blog.csdn.net/weixin_43847546/article/details/142827060#1)[](https://blog.csdn.net/xiao01111/article/details/135487145)：

|方法|多条匹配|零条匹配|
|---|---|---|
|`Single()`|**抛异常**|**抛异常**|
|`SingleOrDefault()`|**抛异常**|返回默认值（null）|
|`First()`|返回第一条|**抛异常**|
|`FirstOrDefault()`|返回第一条|返回默认值（null）|

```csharp

Employee e1 = list.First(e => e.Age > 30);            // 返回第一条，没有则抛异常
Employee e2 = list.FirstOrDefault(e => e.Age > 30);   // 返回第一条，没有则返回null
Employee e3 = list.Single(e => e.Name == "张三");      // 有且只有一条，否则抛异常
Employee e4 = list.SingleOrDefault(e => e.Name == "张三"); // 最多一条，没有则返回null
```

**选择原则**：如果预期结果**只有一条**（如按主键查询），用 `Single` 系列；如果预期结果**可能有多条**但只需要第一条，用 `First` 系列。工作中最常用的是 `FirstOrDefault`[](https://blog.csdn.net/xiao01111/article/details/135487145)。

### 3. `Count` 与 `Any`

```csharp

int count = list.Count(e => e.Age > 20);      // 统计满足条件的元素个数
bool hasSenior = list.Any(e => e.Age > 60);   // 是否存在至少一条满足条件
```

**关键区别**：`Any` 只要找到一条满足条件的数据就会立即返回，而 `Count` 需要遍历全部元素，因此 **`Any` 的效率通常比 `Count` 更高**，判断“是否存在”时应优先用 `Any`[](https://blog.csdn.net/weixin_43847546/article/details/142827060#1)[](https://blog.csdn.net/a313966416/article/details/120235821)。
