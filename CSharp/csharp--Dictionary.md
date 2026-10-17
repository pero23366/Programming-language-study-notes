==一：概念==

**Dictionary<TKey, TValue> 是什么？**

`Dictionary<TKey, TValue>` 是 C# 中最常用的**泛型键值对集合**，它是 **Hashtable 的泛型版本**。你可以把它理解为一本**真正的字典**——通过“键”（Key）快速找到对应的“值”（Value）。

**和 Hashtable 的关系：**

|Hashtable|Dictionary<TKey, TValue>|
|---|---|---|
|命名空间|`System.Collections`|`System.Collections.Generic`|
|存储类型|`object`，什么都能装|**指定键和值的类型**|
|取值|必须强制转换|**直接就是原类型**|
|性能|值类型有装箱拆箱|**无装箱拆箱**|
|键不存在直接取值|返回 `null`|**抛 KeyNotFoundException**|
|推荐使用|不推荐|**推荐**|

**核心特点：**

|特点|说明|
|---|---|
|**键值对存储**|一个键对应一个值|
|**键唯一**|键不能重复，重复会报错|
|**快速查找**|通过键直接定位，平均 O(1)|
|**类型安全**|编译时检查，存错类型直接报错|
|**无序**|不保证遍历顺序|

**打个比方：**

Hashtable 像一个**大杂烩仓库**，什么都能往里扔，取出来要自己辨认。`Dictionary<TKey, TValue>` 像一个**分类明确的档案柜**——你建一个“学号→姓名”的档案柜，就只能存学号和姓名，取出来也一定是学号和姓名，不用猜。

**为什么 Dictionary 查找这么快？**

内部使用**哈希表**实现。你把键传进去，它通过哈希函数**直接算出**这个键对应的数据存在哪个位置，不需要从头遍历。就像你查字典，不会从第一页翻到最后一页，而是根据拼音或部首**直接定位**到那一页。
==二：格式==

**声明与初始化：**

```csharp

using System.Collections.Generic;
// 创建空字典
Dictionary<string, int> dict = new Dictionary<string, int>();
Dictionary<int, string> students = new Dictionary<int, string>();
// 用集合初始化器初始化
Dictionary<string, int> scores = new Dictionary<string, int>
{
    { "小王", 85 },
    { "小李", 90 },
    { "小张", 78 }
};

```
**常用方法：**

|方法/属性|作用|说明|
|---|---|---|
|`Add(key, value)`|添加键值对|键重复会报错|
|`dict[key] = value`|添加或修改|键存在则修改，不存在则添加|
|`Remove(key)`|删除指定键||
|`Clear()`|清空||
|`ContainsKey(key)`|判断键是否存在|返回 bool|
|`ContainsValue(value)`|判断值是否存在|返回 bool|
|`TryGetValue(key, out value)`|**安全取值**|找到返回 true，找不到返回 false|
|`dict[key]`|通过键取值|键不存在会抛异常|
|`Count`|键值对个数|属性|
|`Keys`|所有键的集合|可遍历|
|`Values`|所有值的集合|可遍历|

**遍历的三种方式：**

```csharp

// 方式一：遍历键值对（最常用）
foreach (KeyValuePair<string, int> kvp in dict)
{
    Console.WriteLine(kvp.Key + " = " + kvp.Value);
}
// 方式二：遍历键
foreach (string key in dict.Keys)
{
    Console.WriteLine(key + " = " + dict[key]);
}
// 方式三：遍历值
foreach (int value in dict.Values)
{
    Console.WriteLine(value);
}
```
==三：代码==

### 基础操作

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        Dictionary<string, int> scores = new Dictionary<string, int>();
        // 添加
        scores.Add("小王", 85);
        scores.Add("小李", 90);
        scores["小张"] = 78;   // 也可以用索引器添加
        // 访问
        Console.WriteLine(scores["小王"]);   // 85
        // 安全取值（推荐）
        if (scores.TryGetValue("小李", out int score))
        {
            Console.WriteLine("小李的分数：" + score);  // 90
        }
        // 判断键是否存在
        Console.WriteLine(scores.ContainsKey("小明"));  // False
        // 修改
        scores["小王"] = 100;   // 键已存在，修改值
        // 删除
        scores.Remove("小张");
        // 个数
        Console.WriteLine(scores.Count);  // 2
    }
}
```

**你要观察：**

- `scores["小王"]` 直接返回 `int`，不用强转
    
- `scores["小明"]` 如果键不存在，**会抛 `KeyNotFoundException`**
    
- `TryGetValue` 是安全取值，不会抛异常
    

### 遍历

```csharp

Dictionary<string, int> scores = new Dictionary<string, int>
{
    { "小王", 85 },
    { "小李", 90 },
    { "小张", 78 }
};
foreach (KeyValuePair<string, int> kvp in scores)
{
    Console.WriteLine($"{kvp.Key}: {kvp.Value}分");
}

```
**输出（顺序可能不同）：**

```text

小王: 85分
小李: 90分
小张: 78分
```

**注意：** Dictionary **不保证遍历顺序**，因为它是按哈希值存储的。

### 实际应用：你的 Inventory 就是最好的例子

```csharp

class Inventory
{
    private Dictionary<string, int> quantities = new Dictionary<string, int>();
    private List<string> order = new List<string>();
    public int Count => quantities.Count;
    public int this[string student]
    {
        get
        {
            // TryGetValue 安全取值
            if (quantities.TryGetValue(student, out int score))
                return score;
            else
                return 0;
        }
        set
        {
            if (!quantities.ContainsKey(student))
                order.Add(student);   // 新学生，记录顺序
            quantities[student] = value;  // 存分数
        }
    }
}

```
**这个例子完美展示了 Dictionary + List 的配合：**

- **Dictionary** → 快速通过名字查分数
    
- **List** → 记住名字的插入顺序（因为 Dictionary 无序）
    

### Dictionary 的底层原理（了解即可）

Dictionary 内部用**哈希表**实现：

text

1. 你传入键 "小王"
2. 哈希函数计算出 "小王" 的哈希值（一个数字）
3. 通过哈希值找到对应的"桶"（数组位置）
4. 在桶里找到 "小王" 对应的值

**为什么快？** 因为不需要遍历所有元素，而是**直接算位置**。

**如果两个键算出同一个位置怎么办？** 这叫**哈希冲突**。Dictionary 用**链式法**解决——同一个位置挂一个链表，冲突的键值对都挂上去，查找时再在链表里找。

**一个重要的坑：** 如果自定义类型作为键，需要**正确重写 `GetHashCode()` 和 `Equals()`**，否则哈希会出问题。这个属于进阶内容，先了解即可。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|Hashtable 的泛型版本，键值对集合|
|命名空间|`System.Collections.Generic`|
|核心优势|类型安全、无装箱拆箱、快速查找|
|底层|哈希表，平均 O(1) 查找|
|关键方法|`TryGetValue`（安全取值）、`ContainsKey`（判断键）|

### Dictionary vs Hashtable

|Hashtable|Dictionary<TKey, TValue>|
|---|---|---|
|类型安全|❌ 什么都能装|✅ 编译时检查|
|装箱拆箱|✅ 有|❌ 无|
|取值|必须强转|直接取|
|键不存在直接取值|返回 `null`|抛异常|
|推荐使用|**不推荐**|**✅ 推荐**|

### 什么时候用 Dictionary？

- 需要**通过一个唯一标识快速查找数据**时
    
- 数据本身有**唯一 ID、名字、Key** 时
    
- 需要**存储映射关系**（学号→姓名、物品ID→物品数据）时
    
- **不需要关心存储顺序**时
    

### 一句话总结

> **Dictionary 就是一本真正的字典——通过“键”直接翻到“值”，不用从头找。它是 Hashtable 的升级版，类型安全、性能更好。实际开发中，能用 `Dictionary<TKey, TValue>` 就不用 Hashtable。**

### 和你之前知识的联系

|你写过的|对应知识|
|---|---|
|`Dictionary<string, int> quantities`|泛型字典，存名字→分数|
|`quantities.TryGetValue(student, out int score)`|安全取值，不抛异常|
|`quantities.ContainsKey(student)`|判断键是否存在|
|`quantities.Values`|获取所有值的集合|
|`quantities[student] = value`|索引器添加/修改|
