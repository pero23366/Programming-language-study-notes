**概念**：路径用于指定文件位置。分为 **相对路径** 和 **绝对路径**。[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)

**格式**：

- **相对路径**：相对于当前文件，如 `images/photo.jpg`。
    
- **绝对路径**：完整地址，如 `https://example.com/photo.jpg`。
    

**代码**：

```html

<img src="images/photo.jpg" alt="相对路径">
<img src="https://picsum.photos/200" alt="绝对路径">
```

**总结**：开发时优先使用相对路径，便于项目迁移。