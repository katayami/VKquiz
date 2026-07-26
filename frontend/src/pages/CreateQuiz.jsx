import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

const emptyOption = () => ({ text: '', isCorrect: false });

function QuestionForm({ quizId, order, onAdded }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('single');
  const [timeLimit, setTimeLimit] = useState(20);
  const [image, setImage] = useState(null);
  const [options, setOptions] = useState([emptyOption(), emptyOption()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateOption(index, patch) {
    setOptions((opts) => {
      const next = opts.map((o, i) => (i === index ? { ...o, ...patch } : o));
      if (type === 'single' && patch.isCorrect) {
        return next.map((o, i) => (i === index ? o : { ...o, isCorrect: false }));
      }
      return next;
    });
  }

  function addOption() {
    setOptions((opts) => [...opts, emptyOption()]);
  }

  function removeOption(index) {
    setOptions((opts) => (opts.length > 2 ? opts.filter((_, i) => i !== index) : opts));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanOptions = options.filter((o) => o.text.trim());
    if (cleanOptions.length < 2) return setError('Нужно минимум 2 варианта с текстом');
    if (!cleanOptions.some((o) => o.isCorrect)) return setError('Отметьте хотя бы один правильный вариант');

    const fd = new FormData();
    fd.append('text', text);
    fd.append('type', type);
    fd.append('timeLimit', String(timeLimit));
    fd.append('order', String(order));
    fd.append('options', JSON.stringify(cleanOptions));
    if (image) fd.append('image', image);

    setSaving(true);
    try {
      const question = await apiFetch(`/quizzes/${quizId}/questions`, { method: 'POST', body: fd, isForm: true });
      onAdded(question);
      setText('');
      setImage(null);
      setOptions([emptyOption(), emptyOption()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-200 p-4 flex flex-col gap-3">
      <h3 className="font-medium">Новый вопрос</h3>
      <p className="text-sm opacity-60 -mt-2">Не забудьте нажать «Добавить вопрос» — иначе он не сохранится</p>

      <input
        className="input input-bordered w-full"
        placeholder="Текст вопроса"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />

      <div className="flex gap-3 flex-wrap items-center">
        <select className="select select-bordered" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="single">Один ответ</option>
          <option value="multiple">Несколько ответов</option>
        </select>
        <label className="flex items-center gap-2">
          Время (сек)
          <input
            type="number"
            min={5}
            max={300}
            className="input input-bordered w-24"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
          />
        </label>
        <input type="file" accept="image/*" className="file-input file-input-bordered" onChange={(e) => setImage(e.target.files[0] || null)} />
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type={type === 'single' ? 'radio' : 'checkbox'}
              name={`correct-${order}`}
              className={type === 'single' ? 'radio' : 'checkbox'}
              checked={opt.isCorrect}
              onChange={(e) => updateOption(i, { isCorrect: e.target.checked })}
            />
            <input
              className="input input-bordered flex-1"
              placeholder={`Вариант ${i + 1}`}
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
            />
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeOption(i)} disabled={options.length <= 2}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm w-fit" onClick={addOption}>
          + вариант
        </button>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary w-fit" disabled={saving}>
        {saving ? <span className="loading loading-spinner loading-sm" /> : 'Добавить вопрос'}
      </button>
    </form>
  );
}

export default function CreateQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [rules, setRules] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/quizzes/${id}`).then((q) => {
      setQuiz(q);
      setTitle(q.title);
      setCategory(q.category || '');
      setRules(q.rules || '');
    }).catch((e) => setError(e.message));
  }, [id]);

  async function handleSaveMeta(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (quiz) {
        const updated = await apiFetch(`/quizzes/${quiz.id}`, { method: 'PATCH', body: { title, category, rules } });
        setQuiz((q) => ({ ...q, ...updated }));
      } else {
        const created = await apiFetch('/quizzes', { method: 'POST', body: { title, category, rules } });
        navigate(`/quizzes/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleQuestionAdded(question) {
    setQuiz((q) => ({ ...q, questions: [...(q.questions || []), question] }));
  }

  async function handleDeleteQuestion(questionId) {
    await apiFetch(`/quizzes/${quiz.id}/questions/${questionId}`, { method: 'DELETE' });
    setQuiz((q) => ({ ...q, questions: q.questions.filter((qq) => qq.id !== questionId) }));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{quiz ? 'Редактирование квиза' : 'Новый квиз'}</h1>

      <form onSubmit={handleSaveMeta} className="card bg-base-200 p-4 flex flex-col gap-3">
        <input className="input input-bordered" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input input-bordered" placeholder="Категория" value={category} onChange={(e) => setCategory(e.target.value)} />
        <textarea className="textarea textarea-bordered" placeholder="Правила" value={rules} onChange={(e) => setRules(e.target.value)} />
        {error && <p className="text-error text-sm">{error}</p>}
        <button type="submit" className="btn btn-primary w-fit" disabled={saving}>
          {quiz ? 'Сохранить' : 'Создать и перейти к вопросам'}
        </button>
      </form>

      {quiz && (
        <>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Вопросы ({quiz.questions?.length || 0})</h2>
              <span className="font-mono text-sm opacity-70">код комнаты: {quiz.roomCode}</span>
            </div>
            <ul className="flex flex-col gap-2 mb-4">
              {quiz.questions?.map((q, i) => (
                <li key={q.id} className="card bg-base-200">
                  <div className="card-body py-2 px-4 flex-row items-center justify-between">
                    <span>
                      {i + 1}. {q.text} <span className="opacity-60 text-sm">({q.type}, {q.timeLimit}с)</span>
                    </span>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteQuestion(q.id)}>
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <QuestionForm quizId={quiz.id} order={(quiz.questions?.length || 0) + 1} onAdded={handleQuestionAdded} />
          </div>

          <Link to={`/room/${quiz.roomCode}/lobby`} className="btn btn-success w-fit">
            Перейти в комнату →
          </Link>
        </>
      )}
    </div>
  );
}
