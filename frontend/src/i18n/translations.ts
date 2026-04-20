// 多言語対応の翻訳定義（日本語 / 英語）
// ユーザーがアップロードしたコンテンツは翻訳対象外

export type Locale = 'ja' | 'en';

export const translations = {
  // --- タブ名 ---
  tabs: {
    home: { ja: 'ホーム', en: 'Home' },
    slides: { ja: 'スライド', en: 'Slides' },
    items: { ja: '配布物', en: 'Items' },
    qa: { ja: 'フィードバック', en: 'Feedback' },
  },

  // --- 共通 ---
  common: {
    loading: { ja: '読み込み中...', en: 'Loading...' },
    delete: { ja: '削除', en: 'Delete' },
    edit: { ja: '編集', en: 'Edit' },
    save: { ja: '保存', en: 'Save' },
    cancel: { ja: 'キャンセル', en: 'Cancel' },
    open: { ja: '開く', en: 'Open' },
    view: { ja: '閲覧', en: 'View' },
    download: { ja: 'DL', en: 'DL' },
    confirmDelete: { ja: 'を削除しますか？この操作は取り消せません。', en: ' will be deleted. This cannot be undone. Continue?' },
    deleteFailed: { ja: '削除に失敗しました。', en: 'Failed to delete.' },
    error: { ja: 'エラーが発生しました。', en: 'An error occurred.' },
  },

  // --- ログイン ---
  auth: {
    portalTitle: { ja: 'Class Portal', en: 'Class Portal' },
    signInPrompt: { ja: 'サインインして続行', en: 'Sign in to continue' },
    signInGoogle: { ja: 'Google でサインイン', en: 'Sign in with Google' },
    restricted: { ja: 'アクセス制限', en: 'Access Restricted' },
    restrictedMsg: {
      ja: 'は、このポータルへのアクセス権がありません。大学発行のメールアドレスでお試しください。',
      en: ' is not authorized to access this portal. Please try again with your university-issued email address.'
    },
    switchAccount: { ja: '別のアカウントでサインイン', en: 'Sign in with a different account' },
  },

  // --- 設定 ---
  settings: {
    title: { ja: '設定', en: 'Settings' },
    signedInAs: { ja: 'ログイン中', en: 'Signed in as' },
    appearance: { ja: 'テーマ', en: 'Appearance' },
    light: { ja: 'ライト', en: 'Light' },
    dark: { ja: 'ダーク', en: 'Dark' },
    system: { ja: 'システム', en: 'System' },
    language: { ja: '言語', en: 'Language' },
    signOut: { ja: 'サインアウト', en: 'Sign Out' },
    close: { ja: '閉じる', en: 'Close' },
  },

  // --- Welcome タブ ---
  welcome: {
    title: {
      ja: 'CNNを用いた画像認識の仕組みと実装\nへようこそ',
      en: 'Welcome to\nCCNNを用いた画像認識の仕組みと実装'
    },
    news: { ja: '最新情報', en: 'Latest Updates' },
    noNews: { ja: '現在、新しいお知らせはありません。', en: 'No updates at this time.' },
    newSlide: { ja: '新しいスライド', en: 'New slide' },
    newItem: { ja: '新しいアイテム', en: 'New item' },
    published: { ja: 'が公開されました。', en: ' has been published.' },
  },

  // --- Slides タブ ---
  slides: {
    heading: { ja: '講義スライド', en: 'Lecture Slides' },
    noSlides: { ja: '公開中のスライドはありません。', en: 'No slides available.' },
    updateFail: { ja: '更新に失敗しました。', en: 'Failed to update.' },
  },

  // --- Items タブ ---
  items: {
    heading: { ja: '配布アイテム & アップロード', en: 'Distributed Items & Upload' },
    titleLabel: { ja: 'タイトル', en: 'Title' },
    titleHint: { ja: '例: 第1回 授業スライド', en: 'e.g. Lecture 1 Slides' },
    category: { ja: 'カテゴリ', en: 'Category' },
    catSlide: { ja: '発表スライド', en: 'Presentation Slide' },
    catItem: { ja: '補足アイテム', en: 'Supplementary Item' },
    uploading: { ja: '送信中...', en: 'Uploading...' },
    uploadBtn: { ja: 'GCSへアップロード', en: 'Upload to GCS' },
    getUrl: { ja: '署名付きURLを取得中...', en: 'Getting signed URL...' },
    uploadDone: { ja: '公開リストへの登録が完了しました！', en: 'Successfully published!' },
    listHeading: { ja: '公開中のアイテム', en: 'Published Items' },
    noItems: { ja: '公開中のアイテムはありません。', en: 'No items available.' },
  },

  // --- Q&A タブ ---
  qa: {
    heading: { ja: '質問箱', en: 'Question Box' },
    description: { ja: '講義内容やコードの実装に関する質問を匿名で送信できます。', en: 'Submit anonymous questions about the lecture or code implementation.' },
    session: { ja: '関連するセッション', en: 'Related Session' },
    sessAll: { ja: '全体的な質問', en: 'General Questions' },
    sess1: { ja: '第1回について', en: 'About Session 1' },
    sess2: { ja: '第2回について', en: 'About Session 2' },
    content: { ja: '質問内容', en: 'Your Question' },
    placeholder: { ja: '質問を入力...', en: 'Type your question...' },
    submitting: { ja: '送信中...', en: 'Submitting...' },
    submit: { ja: '送信する', en: 'Submit' },
    submitFail: { ja: '送信に失敗しました。', en: 'Failed to submit.' },
    timeline: { ja: 'みんなの質問', en: "Everyone's Questions" },
    noQuestions: { ja: 'まだ質問はありません。', en: 'No questions yet.' },
    confirmDel: { ja: 'この質問を削除しますか？', en: 'Delete this question?' },
  },

  // --- アンケート ---
  survey: {
    heading:       { ja: 'アンケート',             en: 'Survey' },
    noSurveys:     { ja: '現在アンケートはありません。', en: 'No surveys available.' },
    respondBtn:    { ja: '回答する',              en: 'Answer' },
    alreadyDone:   { ja: '回答済み',            en: 'Answered' },
    submitBtn:     { ja: '送信する',              en: 'Submit' },
    submitting:    { ja: '送信中...',             en: 'Submitting...' },
    submitDone:    { ja: '回答を送信しました！ありがとうございます。', en: 'Thank you for your response!' },
    submitFail:    { ja: '送信に失敗しました。',    en: 'Failed to submit.' },
    responses:     { ja: '回答一覧',              en: 'Responses' },
    respondent:    { ja: '回答者',               en: 'Respondent' },
    answeredAt:    { ja: '回答日時',              en: 'Answered At' },
    toggleActive:  { ja: '受付状態を変更',         en: 'Toggle Active' },
    createSurvey:  { ja: 'アンケートを作成',        en: 'Create Survey' },
    surveyTitle:   { ja: 'アンケートタイトル',      en: 'Survey Title' },
    description:   { ja: '説明文（任意）',         en: 'Description (optional)' },
    addQuestion:   { ja: '質問を追加',            en: 'Add Question' },
    questionText:  { ja: '質問文',               en: 'Question' },
    optionA:       { ja: '選択肢A',              en: 'Option A' },
    optionB:       { ja: '選択肢B',              en: 'Option B' },
    // ホームタブのバナー
    bannerTitle:   { ja: 'アンケート実施中！',      en: 'Survey in Progress!' },
    bannerMsg:     { ja: 'フィードバックタブから回答できます。', en: 'You can respond from the Feedback tab.' },
    bannerBtn:     { ja: 'フィードバックへ →',     en: 'Go to Feedback →' },
  },
} as const;

// ヘルパー: 翻訳テキストを取得する型安全な関数
export function t(
  section: keyof typeof translations,
  key: string,
  locale: Locale
): string {
  const sec = translations[section] as Record<string, Record<Locale, string>>;
  return sec?.[key]?.[locale] ?? key;
}
