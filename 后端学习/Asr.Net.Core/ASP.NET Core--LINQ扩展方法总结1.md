## 七：延迟执行与立即执行

LINQ查询默认采用**延迟执行**：调用 `Where`、`Select` 等方法时并不会立即执行，只有当你**实际遍历**结果时（如 `foreach`），查询才会真正执行。

```csharp

var query = list.Where(e => e.Age > 30); // 此时并未执行
foreach (var item in query) { }           // 此时才真正执行过滤
```

如果需要**立即执行**，可以使用以下方法：

```csharp

var listResult = query.ToList();    // 立即执行并转为 List
var arrayResult = query.ToArray();  // 立即执行并转为数组
var count = query.Count();          // 立即执行并返回数量
var first = query.First();          // 立即执行并返回第一条
```

集合转换方法 `ToList()` 和 `ToArray()` 在实际开发中非常常用，尤其是在需要立即拿到结果或多次使用同一查询结果时[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。

---

## 八：总结

| 分类   | 方法                                | 作用                     |
| ---- | --------------------------------- | ---------------------- |
| 筛选   | `Where`                           | 筛选符合条件的元素              |
| 单条   | `First` / `FirstOrDefault`        | 返回第一条/第一条或默认值          |
| 单条   | `Single` / `SingleOrDefault`      | 返回唯一一条/唯一一条或默认值        |
| 判断   | `Any`                             | 是否存在满足条件的元素（效率比Count高） |
| 计数   | `Count`                           | 统计满足条件的元素个数            |
| 排序   | `OrderBy` / `OrderByDescending`   | 升序/降序排序                |
| 排序   | `ThenBy` / `ThenByDescending`     | 第二排序字段                 |
| 分页   | `Skip` / `Take`                   | 跳过/获取指定数量的元素           |
| 聚合   | `Max` / `Min` / `Average` / `Sum` | 最大值/最小值/平均值/求和         |
| 分组   | `GroupBy`                         | 按条件分组，返回 `IGrouping`   |
| 投影   | `Select`                          | 将元素转换为新形式              |
| 类型筛选 | `OfType`                          | 筛选指定类型的数据              |
| 转换   | `ToList` / `ToArray`              | 立即执行并转换为 List/数组       |

**核心要点**：

1. 几乎所有方法都支持**链式调用**，因为它们返回的都是 `IEnumerable<T>`。
    
2. **`Any` 比 `Count` 效率高**，判断是否存在时优先用 `Any`。
    
3. **`Single` 和 `First` 的区别**：`Single` 要求结果集只能有一条，`First` 只要求至少有一条。
    
4. **延迟执行**是LINQ的默认行为，需要立即执行时用 `ToList()`、`ToArray()` 等方法。
    
5. **`GroupBy` 返回 `IGrouping` 对象**，通过 `Key` 获取分组键。
    

建议把**分组统计**和 **`Skip/Take` 分页**这两个场景亲手敲一遍，它们在Web API开发中（返回分页列表、统计报表）会非常常用。