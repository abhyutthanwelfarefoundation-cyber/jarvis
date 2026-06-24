import React, { useState } from 'react';
import MicButton from '../components/MicButton';
import LangBadge from '../components/LangBadge';
import { completeTask, deleteTask, createTask } from '../services/api';

export default function Tasks({ jarvis }) {
  const { tasks, lang, loadTasks, activateMic, listening, status, sendText } = jarvis;
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();

  const todayTasks = tasks.filter(t => {
    const d = t.scheduled_at ? new Date(t.scheduled_at).toDateString() : today;
    return d === today;
  });

  const tomorrowTasks = tasks.filter(t => {
    const d = t.scheduled_at ? new Date(t.scheduled_at).toDateString() : '';
    return d === tomorrow;
  });

  const handleComplete = async (id) => {
    setLoading(true);
    await completeTask(id);
    await loadTasks();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    await loadTasks();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText('');
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px 10px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight:500 }}>TASKS</p>
          <p style={{ fontSize: 13, color: 'var(--blue)' }}>
            {todayTasks.filter(t => !t.completed).length} remaining today
          </p>
        </div>
        <LangBadge lang={lang} />
      </div>

      {/* Task list */}
      <div className="page-scroll" style={{ flex: 1 }}>
        <TaskSection
          title={lang === 'hi' ? 'आज' : 'Today'}
          tasks={todayTasks}
          onComplete={handleComplete}
          onDelete={handleDelete}
          formatTime={formatTime}
          loading={loading}
        />
        {tomorrowTasks.length > 0 && (
          <TaskSection
            title={lang === 'hi' ? 'कल' : 'Tomorrow'}
            tasks={tomorrowTasks}
            onComplete={handleComplete}
            onDelete={handleDelete}
            formatTime={formatTime}
            loading={loading}
          />
        )}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--blue)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {lang === 'hi' ? 'कोई task नहीं है। Jarvis को बोलें।' : 'No tasks. Tell Jarvis to add one.'}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 14px',
        borderTop: '0.5px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={lang === 'hi' ? 'Task add करें...' : 'Add task by voice or type...'}
          style={{
            flex: 1, background: 'var(--bg-input)',
            border: '0.5px solid var(--border-light)',
            borderRadius: 22, padding: '10px 16px',
            fontSize: 13, color: 'var(--text-primary)',
            fontFamily: lang === 'hi' ? 'var(--font-hi)' : 'var(--font-ui)', outline: 'none',
          }}
        />
        {inputText ? (
          <button onClick={handleSend} style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'var(--blue-dim)', border: '1px solid var(--blue)',
            color: 'var(--blue)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>↑</button>
        ) : (
          <MicButton
            listening={listening} lang={lang}
            disabled={status === 'thinking' || status === 'speaking'}
            onClick={activateMic}
          />
        )}
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, onComplete, onDelete, formatTime, loading }) {
  return (
    <div style={{ padding: '0 16px', marginTop: 8 }}>
      <p style={{
        fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5,
        textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
        padding: '10px 0 6px',
      }}>{title}</p>

      {tasks.map(task => (
        <div key={task.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0',
          borderBottom: '0.5px solid var(--border)',
          animation: 'fadeUp 0.2s ease forwards',
        }}>
          {/* Checkbox */}
          <button
            onClick={() => !task.completed && onComplete(task.id)}
            disabled={loading || task.completed}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: task.completed ? 'none' : '1.5px solid var(--blue-dim)',
              background: task.completed ? 'var(--blue-dim)' : 'transparent',
              cursor: task.completed ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {task.completed && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
            )}
          </button>

          {/* Title */}
          <span style={{
            flex: 1, fontSize: 13,
            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: task.completed ? 'line-through' : 'none',
            fontFamily: 'var(--font-ui)',
          }}>
            {task.title}
          </span>

          {/* Time */}
          {task.scheduled_at && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {formatTime(task.scheduled_at)}
            </span>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(task.id)}
            style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
      ))}

      {tasks.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--blue)', padding: '10px 0', fontFamily: 'var(--font-mono)' }}>
          No tasks
        </p>
      )}
    </div>
  );
}
