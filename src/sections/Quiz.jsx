import { useState } from 'react'
import { QUIZ } from '../data/quiz.js'

export default function Quiz() {
  const [answers, setAnswers] = useState({})
  const pick = (i, opt) => {
    if (answers[i] != null) return
    setAnswers({ ...answers, [i]: opt })
  }
  const correct = Object.entries(answers).filter(([i, v]) => QUIZ[i].answer === v).length
  const total = Object.keys(answers).length
  const progress = (total / QUIZ.length) * 100
  const score = total === QUIZ.length ? Math.round((correct / QUIZ.length) * 100) : null

  return (
    <>
      <div className="quiz-progress">
        <div className="stats">
          <div className="stat">
            <span className="label">Progress</span>
            <span className="value">{total}/{QUIZ.length}</span>
          </div>
          <div className="stat correct">
            <span className="label">Correct</span>
            <span className="value">{correct}</span>
          </div>
          {score !== null && (
            <div className="stat score">
              <span className="label">Score</span>
              <span className="value">{score}%</span>
            </div>
          )}
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: progress + '%' }} />
        </div>
      </div>

      {QUIZ.map((q, i) => (
        <div className="quiz-q" key={i}>
          <div className="q-header">
            <span className="q-num">Q{String(i + 1).padStart(2, '0')}</span>
            <div className="q-text">{q.q}</div>
          </div>
          {q.opts.map((o, j) => {
            let cls = 'quiz-opt'
            if (answers[i] != null) {
              cls += ' disabled'
              if (j === q.answer) cls += ' correct'
              else if (j === answers[i]) cls += ' wrong'
            }
            return (
              <div key={j} className={cls} onClick={() => pick(i, j)}>
                <span className="letter">{String.fromCharCode(65 + j)}</span>
                <span>{o}</span>
              </div>
            )
          })}
          {answers[i] != null && (
            <div className="quiz-explain">
              <b>💡 해설.</b> {q.explain}
            </div>
          )}
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button className="btn ghost" onClick={() => setAnswers({})}>↻ 다시 풀기 / Reset</button>
      </div>
    </>
  )
}
