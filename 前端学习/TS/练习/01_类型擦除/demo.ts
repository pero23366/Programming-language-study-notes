// demo.ts
import { describe } from './person.ts';
import type { Person } from './person.ts';   // 只导入类型，必须显式写 type

const p: Person = { name: 'pero', age: 20 };
console.log(describe(p));    // pero 今年 20 岁
