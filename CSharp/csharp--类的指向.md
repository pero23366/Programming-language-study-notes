[[csharp--小点]]
```text
Student s = new Student0;
s.deskmate = new Student0:
s.deskmate.age. = 10;
Sudent s2 = s.deskmate;
s2.age = 20;
请问s.deskmate.age为多少?
```
```text
s ──> 对象1
        └── deskmate ──> 对象2 { age = 10 }
s2 ──────────────────────┘
```