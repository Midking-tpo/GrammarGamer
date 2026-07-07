import { useMemo, useState } from 'react';
import { checkOrder, shuffleChoices, shuffledWords } from '../game/engine';
import type { ChoiceQuestion, FillQuestion, OrderQuestion, Question } from '../types';

interface PanelProps {
  question: Question;
  answered: boolean;
  onAnswer: (isCorrect: boolean) => void;
}

/** 問題タイプに応じた出題と解答UI。親は key={question.id} を付けて使うこと */
export function QuestionPanel({ question, answered, onAnswer }: PanelProps) {
  if (question.type === 'order') {
    return <OrderBoard question={question} answered={answered} onAnswer={onAnswer} />;
  }
  return <ChoiceBoard question={question} answered={answered} onAnswer={onAnswer} />;
}

function ChoiceBoard({
  question,
  answered,
  onAnswer,
}: PanelProps & { question: ChoiceQuestion | FillQuestion }) {
  const { choices, answer } = useMemo(
    () => shuffleChoices(question.choices, question.answer),
    [question],
  );
  const [selected, setSelected] = useState<number | null>(null);

  function select(i: number) {
    if (answered || selected !== null) return;
    setSelected(i);
    onAnswer(i === answer);
  }

  return (
    <div className="question-panel">
      {question.type === 'fill' ? (
        <>
          <p className="sentence">
            {question.sentence.split('___').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className={`blank ${selected !== null ? 'filled' : ''}`}>
                    {selected !== null ? choices[answer] : '？'}
                  </span>
                )}
              </span>
            ))}
          </p>
          <p className="ja">{question.ja}</p>
        </>
      ) : (
        <p className="prompt">{question.prompt}</p>
      )}
      <div className={`choices ${choices.some((c) => c.length > 18) ? 'single' : ''}`}>
        {choices.map((choice, i) => {
          let cls = 'choice-btn';
          if (selected !== null) {
            if (i === answer) cls += ' correct';
            else if (i === selected) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={i} className={cls} onClick={() => select(i)} disabled={selected !== null}>
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Token {
  key: number;
  word: string;
}

function OrderBoard({
  question,
  answered,
  onAnswer,
}: PanelProps & { question: OrderQuestion }) {
  const tokens = useMemo<Token[]>(
    () => shuffledWords(question).map((word, key) => ({ key, word })),
    [question],
  );
  const [placed, setPlaced] = useState<Token[]>([]);
  const [result, setResult] = useState<boolean | null>(null);

  function place(token: Token) {
    if (result !== null || answered) return;
    const next = [...placed, token];
    setPlaced(next);
    if (next.length === tokens.length) {
      const ok = checkOrder(
        next.map((t) => t.word),
        question.answer,
      );
      setResult(ok);
      onAnswer(ok);
    }
  }

  function remove(token: Token) {
    if (result !== null || answered) return;
    setPlaced(placed.filter((t) => t.key !== token.key));
  }

  const available = tokens.filter((t) => !placed.some((p) => p.key === t.key));

  return (
    <div className="question-panel">
      <p className="ja">{question.ja}</p>
      <div
        className={`placed-row ${result === true ? 'correct' : ''} ${result === false ? 'wrong' : ''}`}
      >
        {placed.length === 0 && <span className="placeholder">カードをタップして英文を作ろう</span>}
        {placed.map((t) => (
          <button key={t.key} className="word-card placed" onClick={() => remove(t)}>
            {t.word}
          </button>
        ))}
      </div>
      <div className="available-row">
        {available.map((t) => (
          <button key={t.key} className="word-card" onClick={() => place(t)}>
            {t.word}
          </button>
        ))}
      </div>
    </div>
  );
}
