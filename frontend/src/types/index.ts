// 共有型定義（Single Source of Truth）
// 全コンポーネントで同じ型を使用する

export interface Material {
  id: number;
  title: string;
  pages?: number;
  category: string;
  file_path: string;
}

export interface Question {
  id: number;
  session: string;
  content: string;
  created_at: string;
}

export interface NewsItem {
  date: string;
  text: string;
  tag: string;
}

export interface Tab {
  id: string;
  label: string;
}
