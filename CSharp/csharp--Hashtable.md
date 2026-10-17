==一：概念==

**Hashtable 是什么？**

Hashtable 是 C# 封装好的一个**非泛型集合类**，它的本质是一个**哈希表**。它和 ArrayList、Stack、Queue 最大的不同在于：**它存储的不是单个元素，而是“键值对”（Key-Value Pair）。**

**核心特点：**

|特点|说明|
|---|---|
|**键值对存储**|一个键（Key）对应一个值（Value），成对出现|
|**键唯一**|同一个 Hashtable 中，键不能重复|
|**通过键快速查找**|用键来访问值，速度非常快|
|**存储任意类型**|键和值都是 `object` 类型，可以存任何东西|
|**存在装箱拆箱**|存值类型时会装箱，取出来时拆箱|

**打个比方：**

Hashtable 就像**字典**。你要查“苹果”这个词的意思，不会从第一页翻到最后一页，而是直接根据拼音或部首**定位**到它所在的页。**“苹果”就是键（Key），“苹果的解释”就是值（Value）。**

**生活中的例子：**

- 字典：通过“词”快速找到“解释”
    
- 通讯录：通过“姓名”快速找到“电话号码”
    
- 游戏背包：通过“物品ID”快速找到“物品数据”
    
- 配置表：通过“配置Key”快速找到“配置Value”
    

**命名空间：** `System.Collections`

**和 ArrayList 的关系：**

ArrayList 存的是单个元素，通过**索引**（0, 1, 2...）访问。  
Hashtable 存的是键值对，通过**键**访问。

|ArrayList|Hashtable|
|---|---|---|
|存储内容|单个元素|键值对|
|访问方式|索引（`list[0]`）|键（`table["key"]`）|
|查找速度|要遍历，慢|直接定位，快|
|键|没有键|键必须唯一|
==二：格式==

**声明与初始化：**

csharp

using System.Collections;  // 引入命名空间
Hashtable table = new Hashtable();  // 空哈希表

**常用方法：**

|方法/属性|作用|说明|
|---|---|---|
|`Add(key, value)`|添加键值对|键不能重复，重复会报错|
|`table[key] = value`|添加或修改|键存在则修改，不存在则添加|
|`Remove(key)`|删除指定键|传入要删除的键|
|`Clear()`|清空|删除所有键值对|
|`ContainsKey(key)`|判断键是否存在|返回 bool|
|`ContainsValue(value)`|判断值是否存在|返回 bool|
|`table[key]`|通过键取值|返回 `object`，需要强转|
|`Count`|键值对个数|属性|

**遍历：**

```csharp

foreach (object key in table.Keys)      // 遍历所有键
{
    object value = table[key];
}
foreach (DictionaryEntry entry in table)  // 遍历键值对
{
    // entry.Key 和 entry.Value
}
```

**泛型版本（实际开发更常用）：**

```csharp

using System.Collections.Generic;
Dictionary<string, int> dict = new Dictionary<string, int>();

`Dictionary<TKey, TValue>` 是 `Hashtable` 的泛型版本，用法几乎一样，但没有装箱拆箱，类型更安全。
```
==三：代码==

### 基础操作

```csharp

using System;
using System.Collections;
class Program
{
    static void Main()
    {
        Hashtable table = new Hashtable();
        // 添加键值对
        table.Add("apple", 10);
        table.Add("banana", 20);
        table["orange"] = 30;   // 也可以用索引器添加
        // 通过键取值
        int a = (int)table["apple"];   // 必须强转！因为存的是 object
        Console.WriteLine("apple 的数量：" + a);  // 10
        // 判断键是否存在
        Console.WriteLine(table.ContainsKey("banana"));  // True
        Console.WriteLine(table.ContainsKey("grape"));   // False
        // 修改值
        table["apple"] = 99;   // 键已存在，直接修改
        Console.WriteLine("apple 修改后：" + table["apple"]);  // 99
        // 删除键值对
        table.Remove("banana");
        Console.WriteLine("删除后个数：" + table.Count);  // 2
    }
}
```

**你要观察：**

- `table["apple"]` 取出来的是 `object`，要 `(int)` 强转
    
- `Add` 重复键会报错，`table[key] = value` 重复键会覆盖
    
- `ContainsKey` 判断键存不存在
    

### 遍历

```csharp

Hashtable table = new Hashtable();
table.Add("name", "唐老狮");
table.Add("age", 18);
table.Add("job", "游戏开发");
// 方式一：遍历键
foreach (object key in table.Keys)
{
    Console.WriteLine(key + " = " + table[key]);
}
// 方式二：遍历键值对
foreach (DictionaryEntry entry in table)
{
    Console.WriteLine(entry.Key + " = " + entry.Value);
}
```

**输出（顺序可能不同）：**

```text

name = 唐老狮
age = 18
job = 游戏开发
```

**注意：** Hashtable **不保证遍历顺序**，因为它是按哈希值存储的。

### 实际应用：怪物管理器

```csharp

using System;
using System.Collections;
class Monster
{
    public int Id;
    public string Name;
    public int Hp;
    public Monster(int id, string name, int hp)
    {
        Id = id;
        Name = name;
        Hp = hp;
    }
}
class MonsterManager
{
    private Hashtable monsters = new Hashtable();
    // 添加怪物
    public void AddMonster(Monster monster)
    {
        if (!monsters.ContainsKey(monster.Id))
        {
            monsters.Add(monster.Id, monster);
            Console.WriteLine("添加怪物：" + monster.Name);
        }
        else
        {
            Console.WriteLine("怪物ID已存在！");
        }
    }
    // 通过ID获取怪物
    public Monster GetMonster(int id)
    {
        if (monsters.ContainsKey(id))
        {
            return (Monster)monsters[id];  // 强转
        }
        return null;
    }
    // 移除怪物
    public void RemoveMonster(int id)
    {
        if (monsters.ContainsKey(id))
        {
            monsters.Remove(id);
            Console.WriteLine("移除怪物ID：" + id);
        }
    }
}
class Program
{
    static void Main()
    {
        MonsterManager manager = new MonsterManager();
        manager.AddMonster(new Monster(1, "史莱姆", 100));
        manager.AddMonster(new Monster(2, "哥布林", 200));
        manager.AddMonster(new Monster(3, "巨龙", 5000));
        // 通过ID快速查找
        Monster m = manager.GetMonster(2);
        Console.WriteLine("找到怪物：" + m.Name + "，HP：" + m.Hp);  // 哥布林，HP：200
        manager.RemoveMonster(1);
    }
}
```

**你要观察：**

- 用 `怪物ID` 作为键，可以**快速查找**怪物
    
- 不需要遍历整个列表，直接 `monsters[id]` 就拿到了
    
- **这就是 Hashtable 的意义：通过键快速定位**
    

### 泛型版本对比

```csharp

using System.Collections.Generic;
// 非泛型 Hashtable
Hashtable table1 = new Hashtable();
table1.Add(1, "史莱姆");
string s1 = (string)table1[1];  // 要强转
// 泛型 Dictionary
Dictionary<int, string> table2 = new Dictionary<int, string>();
table2.Add(1, "史莱姆");
string s2 = table2[1];  // 不用强转！
```
==四：总结==

### 核心特点

|特点|说明|
|---|---|
|键值对存储|Key-Value 成对出现|
|键唯一|键不能重复|
|快速查找|通过键直接定位，不用遍历|
|非泛型|存 object，有装箱拆箱|
|无序|不保证遍历顺序|

### 方法速查

|方法|作用|
|---|---|
|`Add(key, value)`|添加（键重复会报错）|
|`table[key] = value`|添加或修改|
|`Remove(key)`|删除|
|`ContainsKey(key)`|判断键是否存在|
|`table[key]`|取值（需强转）|
|`Count`|个数|

### 和其他集合的关系

|集合|存储|访问方式|特点|
|---|---|---|---|
|ArrayList|单个元素|索引|有序，可重复|
|Stack|单个元素|栈顶|后进先出|
|Queue|单个元素|队头|先进先出|
|**Hashtable**|**键值对**|**键**|**快速查找，键唯一**|

### 什么时候用 Hashtable？

- 需要**通过一个标识快速找到对应数据**的时候
    
- 数据本身有**唯一标识**（ID、名字、Key）的时候
    
- 不需要关心**存储顺序**的时候
    

### 一句话总结

> **Hashtable 就是一本字典——通过“键”快速翻到“值”所在的那一页。**