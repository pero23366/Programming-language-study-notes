// person.ts

export interface Person {
  name: string;
  age: number;
}

export function describe(p: Person): string {
  return `${p.name} 今年 ${p.age} 岁`;
}
