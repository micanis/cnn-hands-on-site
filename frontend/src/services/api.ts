// API サービスレイヤー（単一責任の原則）
// 全ての API 通信ロジックをここに集約し、コンポーネントから分離する

import type { Material, Question, Survey, SurveyResponse } from '../types';

const API_URL = import.meta.env.DEV
  ? (import.meta.env.PUBLIC_API_URL_LOCAL || import.meta.env.PUBLIC_API_URL)
  : import.meta.env.PUBLIC_API_URL;

// --- Materials API ---
export const materialApi = {
  list: async (category?: string): Promise<Material[]> => {
    const url = category
      ? `${API_URL}/api/materials?category=${category}`
      : `${API_URL}/api/materials`;
    const res = await fetch(url);
    return res.json();
  },

  create: async (data: { title: string; pages: number; category: string; file_path: string }): Promise<void> => {
    await fetch(`${API_URL}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: { title: string; category: string }): Promise<void> => {
    await fetch(`${API_URL}/api/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    await fetch(`${API_URL}/api/materials/${id}`, {
      method: 'DELETE',
    });
  },
};

// --- Questions API ---
export const questionApi = {
  list: async (): Promise<Question[]> => {
    const res = await fetch(`${API_URL}/api/questions`);
    return res.json();
  },

  create: async (data: { session: string; content: string }): Promise<Response> => {
    return fetch(`${API_URL}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    await fetch(`${API_URL}/api/questions/${id}`, {
      method: 'DELETE',
    });
  },
};

// --- Surveys API ---
export const surveyApi = {
  listActive: async (): Promise<Survey[]> => {
    const res = await fetch(`${API_URL}/api/surveys`);
    return res.json();
  },

  create: async (data: Omit<Survey, 'id' | 'created_at'>): Promise<void> => {
    await fetch(`${API_URL}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Survey>): Promise<void> => {
    await fetch(`${API_URL}/api/surveys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    await fetch(`${API_URL}/api/surveys/${id}`, { method: 'DELETE' });
  },

  respond: async (surveyId: number, userEmail: string, answers: Record<string, string>): Promise<Response> => {
    return fetch(`${API_URL}/api/surveys/${surveyId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, answers }),
    });
  },

  listResponses: async (surveyId: number): Promise<SurveyResponse[]> => {
    const res = await fetch(`${API_URL}/api/surveys/${surveyId}/responses`);
    return res.json();
  },

  hasResponded: async (surveyId: number, email: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/api/surveys/${surveyId}/check?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return data.responded;
  },
};

// --- Storage API ---
export const storageApi = {
  getUploadUrl: async (filename: string, contentType: string): Promise<string> => {
    const res = await fetch(
      `${API_URL}/api/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`
    );
    const data = await res.json();
    return data.uploadUrl;
  },

  getDownloadUrl: (filename: string, action: 'view' | 'download' = 'view'): string => {
    return `${API_URL}/api/download-url?filename=${filename}&action=${action}`;
  },

  upload: async (uploadUrl: string, file: File, contentType: string): Promise<void> => {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    });
  },
};
