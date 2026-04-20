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

// アンケート質問の型（type フィールドで将来拡張可能）
export type SurveyQuestionType = 'binary' | 'scale' | 'text' | 'multiple';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[]; // binary: ["はい","いいえ"], scale: ["1","2",...,"5"] 等
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  is_active: boolean;
  created_at: string;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  user_email: string;
  answers: Record<string, string>; // { q1: "はい", q2: "いいえ" }
  created_at: string;
}
