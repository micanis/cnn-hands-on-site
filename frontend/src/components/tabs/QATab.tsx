import React, { useState, useEffect } from 'react';
import { LuMessageSquare, LuSend, LuLoader, LuTrash2, LuChevronDown, LuChevronUp, LuPlus, LuToggleLeft, LuToggleRight, LuCheck, LuChartBar } from 'react-icons/lu';
import type { Question, Survey, SurveyQuestion } from '../../types';
import { questionApi, surveyApi } from '../../services/api';
import type { Locale } from '../../i18n/translations';
import { t } from '../../i18n/translations';

interface QATabProps {
  isAdmin?: boolean;
  questions: Question[] | null;
  isLoading: boolean;
  onQuestionSubmit: () => Promise<void>;
  surveys: Survey[] | null;
  onSurveyRefresh: () => Promise<void>;
  userEmail: string;
  locale: Locale;
}

// アンケート回答コンポーネント
function SurveyCard({
  survey,
  userEmail,
  isAdmin,
  onRefresh,
  locale,
}: {
  survey: Survey;
  userEmail: string;
  isAdmin: boolean;
  onRefresh: () => Promise<void>;
  locale: Locale;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [responses, setResponses] = useState<Awaited<ReturnType<typeof surveyApi.listResponses>> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (userEmail) {
      surveyApi.hasResponded(survey.id, userEmail).then(setDone);
    }
  }, [survey.id, userEmail]);

  const handleAnswer = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const allAnswered = survey.questions.every(q => answers[q.id]);

  const handleSubmit = async () => {
    if (!allAnswered || !userEmail) return;
    setIsSubmitting(true);
    try {
      const res = await surveyApi.respond(survey.id, userEmail, answers);
      if (res.ok) {
        setDone(true);
        onRefresh();
      } else {
        alert(t('survey', 'submitFail', locale));
      }
    } catch {
      alert(t('common', 'error', locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    await surveyApi.update(survey.id, { ...survey, is_active: !survey.is_active });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(`「${survey.title}」${t('common', 'confirmDelete', locale)}`)) return;
    await surveyApi.delete(survey.id);
    onRefresh();
  };

  const handleShowResponses = async () => {
    if (!showResponses) {
      const data = await surveyApi.listResponses(survey.id);
      setResponses(data);
    }
    setShowResponses(v => !v);
  };

  return (
    <div className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-neutral-800/50 overflow-hidden mb-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{survey.title}</h3>
          {survey.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{survey.description}</p>}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              onClick={handleToggleActive}
              className="p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
              title={t('survey', 'toggleActive', locale)}
            >
              {survey.is_active ? <LuToggleRight className="w-4 h-4 text-orange-500" /> : <LuToggleLeft className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title={t('common', 'delete', locale)}
            >
              <LuTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 回答フォーム or 回答済み */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        {done ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
            <span><LuCheck className="w-4 h-4" /></span> {t('survey', 'alreadyDone', locale)}
          </div>
        ) : (
          <div className="space-y-3">
            {survey.questions.map((q: SurveyQuestion) => (
              <div key={q.id}>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{q.text}</p>
                {q.type === 'binary' && q.options && (
                  <div className="flex gap-2">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(q.id, opt)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all cursor-pointer ${answers[q.id] === opt
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-gray-400 hover:border-orange-300'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${allAnswered && !isSubmitting
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-200 dark:bg-neutral-700 text-gray-400 cursor-not-allowed'
                }`}
            >
              {isSubmitting ? t('survey', 'submitting', locale) : t('survey', 'submitBtn', locale)}
            </button>
          </div>
        )}

        {/* 管理者: 回答一覧 */}
        {isAdmin && (
          <div className="mt-3">
            <button
              onClick={handleShowResponses}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
            >
              {showResponses ? <LuChevronUp className="w-3.5 h-3.5" /> : <LuChevronDown className="w-3.5 h-3.5" />}
              {t('survey', 'responses', locale)} {responses ? `(${responses.length})` : ''}
            </button>
            {showResponses && responses && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-neutral-800">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-semibold">{t('survey', 'respondent', locale)}</th>
                      {survey.questions.map(q => (
                        <th key={q.id} className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-semibold truncate max-w-[80px]">{q.text}</th>
                      ))}
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-semibold">{t('survey', 'answeredAt', locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map(r => (
                      <tr key={r.id} className="border-t border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{r.user_email}</td>
                        {survey.questions.map(q => (
                          <td key={q.id} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {(r.answers as Record<string, string>)[q.id] ?? '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-gray-400 font-mono">{r.created_at}</td>
                      </tr>
                    ))}
                    {responses.length === 0 && (
                      <tr><td colSpan={survey.questions.length + 2} className="text-center py-4 text-gray-400">{t('survey', 'noSurveys', locale)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 管理者: アンケート作成フォーム
function CreateSurveyForm({ onCreated, locale }: { onCreated: () => void; locale: Locale }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: 'q1', text: '', type: 'binary', options: ['はい', 'いいえ'] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    setQuestions(prev => [...prev, { id: nextId, text: '', type: 'binary', options: ['はい', 'いいえ'] }]);
  };

  const updateQuestion = (idx: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, text } : q));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...(q.options ?? [])];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const handleCreate = async () => {
    if (!title || questions.some(q => !q.text)) return;
    setIsSubmitting(true);
    try {
      await surveyApi.create({ title, description, questions, is_active: true });
      setTitle(''); setDescription('');
      setQuestions([{ id: 'q1', text: '', type: 'binary', options: ['はい', 'いいえ'] }]);
      onCreated();
    } catch {
      alert(t('common', 'error', locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-neutral-800/30 space-y-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('survey', 'createSurvey', locale)}</h3>
      <input
        type="text"
        placeholder={t('survey', 'surveyTitle', locale)}
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
      />
      <input
        type="text"
        placeholder={t('survey', 'description', locale)}
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
      />
      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-2">
          <input
            type="text"
            placeholder={`${t('survey', 'questionText', locale)} ${idx + 1}`}
            value={q.text}
            onChange={e => updateQuestion(idx, e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={q.options?.[0] ?? ''}
              onChange={e => updateOption(idx, 0, e.target.value)}
              placeholder={t('survey', 'optionA', locale)}
              className="flex-1 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-gray-700 dark:text-gray-300 outline-none"
            />
            <input
              type="text"
              value={q.options?.[1] ?? ''}
              onChange={e => updateOption(idx, 1, e.target.value)}
              placeholder={t('survey', 'optionB', locale)}
              className="flex-1 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-gray-700 dark:text-gray-300 outline-none"
            />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={addQuestion}
          className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
        >
          <LuPlus className="w-3.5 h-3.5" /> {t('survey', 'addQuestion', locale)}
        </button>
      </div>
      <button
        onClick={handleCreate}
        disabled={!title || questions.some(q => !q.text) || isSubmitting}
        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${!title || questions.some(q => !q.text) || isSubmitting
            ? 'bg-gray-200 dark:bg-neutral-700 text-gray-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
      >
        {isSubmitting ? t('survey', 'submitting', locale) : t('survey', 'createSurvey', locale)}
      </button>
    </div>
  );
}

// メインコンポーネント
function QATab({ isAdmin = false, questions, isLoading, onQuestionSubmit, surveys, onSurveyRefresh, userEmail, locale }: QATabProps) {
  const [session, setSession] = useState(t('qa', 'sessAll', locale));
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await questionApi.create({ session, content });
      if (res.ok) {
        setContent('');
        onQuestionSubmit();
      } else {
        alert(t('qa', 'submitFail', locale));
      }
    } catch {
      alert(t('common', 'error', locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm(t('qa', 'confirmDel', locale))) return;
    try {
      await questionApi.delete(id);
      onQuestionSubmit();
    } catch {
      alert(t('common', 'deleteFailed', locale));
    }
  };

  return (
    <div className="h-full max-w-3xl mx-auto flex flex-col animate-fade-in pointer-events-auto pb-10">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 dark:text-white flex items-center gap-2 sm:gap-3">
        <span className="w-2 h-6 sm:h-7 bg-orange-500 rounded-full inline-block" />
        {t('qa', 'heading', locale)}
      </h2>

      {/* ── アンケートセクション ── */}
      <section className="mb-8">
        <h3 className="text-base sm:text-lg font-bold mb-3 dark:text-gray-200 flex items-center gap-2">
          <span><LuChartBar className="w-5 h-5 text-orange-500" /></span> {t('survey', 'heading', locale)}
        </h3>

        {isAdmin && (
          <CreateSurveyForm onCreated={onSurveyRefresh} locale={locale} />
        )}

        {isLoading && !surveys && (
          <p className="text-gray-500 text-sm animate-pulse">{t('common', 'loading', locale)}</p>
        )}

        {surveys && surveys.length > 0 ? (
          surveys.map(survey => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              userEmail={userEmail}
              isAdmin={isAdmin}
              onRefresh={onSurveyRefresh}
              locale={locale}
            />
          ))
        ) : !isLoading && (
          <p className="text-gray-500 text-sm py-4 text-center">{t('survey', 'noSurveys', locale)}</p>
        )}
      </section>

      {/* ── 区切り線 ── */}
      <div className="border-t border-gray-200 dark:border-neutral-800 mb-8" />

      {/* ── 質問箱セクション ── */}
      <section>
        <h3 className="text-base sm:text-lg font-bold mb-2 dark:text-gray-200 flex items-center gap-2">
          <span><LuMessageSquare className="w-5 h-5 text-orange-500" /></span> {t('qa', 'heading', locale)}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">{t('qa', 'description', locale)}</p>

        {/* 投稿フォーム */}
        <div className="bg-orange-50/40 dark:bg-neutral-800/50 rounded-xl p-4 sm:p-6 border border-orange-100/70 dark:border-orange-900/40 mb-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('qa', 'session', locale)}</label>
              <select
                value={session}
                onChange={e => setSession(e.target.value)}
                className="w-full p-2 sm:p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
              >
                <option>{t('qa', 'sessAll', locale)}</option>
                <option>{t('qa', 'sess1', locale)}</option>
                <option>{t('qa', 'sess2', locale)}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('qa', 'content', locale)}</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white outline-none resize-none h-28 sm:h-32 text-sm focus:ring-2 focus:ring-orange-500 transition-shadow"
                placeholder={t('qa', 'placeholder', locale)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-lg transition-all shadow-md cursor-pointer
                  ${!content.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'}
                `}
              >
                {isSubmitting ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSend className="w-4 h-4" />}
                {isSubmitting ? t('qa', 'submitting', locale) : t('qa', 'submit', locale)}
              </button>
            </div>
          </div>
        </div>

        {/* タイムライン */}
        <h4 className="text-sm sm:text-base font-bold mb-3 sm:mb-4 dark:text-gray-200 flex items-center gap-2">
          <LuMessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          {t('qa', 'timeline', locale)}
        </h4>
        {isLoading && <p className="text-gray-500 text-sm animate-pulse">{t('common', 'loading', locale)}</p>}
        <div className="space-y-4">
          {questions && questions.length > 0 ? (
            questions.map(q => (
              <div key={q.id} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col gap-2 sm:gap-3 hover:border-orange-300 dark:hover:border-orange-700 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 border-b border-gray-100 dark:border-neutral-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 sm:py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded w-fit">
                      {q.session}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title={t('common', 'delete', locale)}
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{q.created_at}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{q.content}</p>
              </div>
            ))
          ) : !isLoading && (
            <p className="text-gray-500 text-sm text-center py-8">{t('qa', 'noQuestions', locale)}</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default React.memo(QATab);
