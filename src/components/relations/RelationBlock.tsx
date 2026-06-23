import { useState } from 'react';

interface RelationBlockProps {
  title: string;
  description: string;
  items: Array<{ id: string; label: string; checked: boolean }>; 
  onToggle: (id: string) => void;
  onOpen?: (id: string) => void;
  singleChoice?: boolean;
}

export function RelationBlock({ title, description, items, onToggle, onOpen, singleChoice = false }: RelationBlockProps) {
  const [query, setQuery] = useState('');
  const visibleItems = items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relation-block">
      <div className="relation-header">
        <div>
          <b>{title}</b>
          <p>{description}</p>
        </div>
        {!singleChoice ? <span className="counter">{items.filter((item) => item.checked).length} выбрано</span> : null}
      </div>
      <input className="relation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по списку" />
      <div className="relation-actions">
        {!singleChoice ? (
          <>
            <button type="button" onClick={() => visibleItems.filter((item) => !item.checked).forEach((item) => onToggle(item.id))}>
              Выбрать все найденные
            </button>
            <button type="button" onClick={() => visibleItems.filter((item) => item.checked).forEach((item) => onToggle(item.id))}>
              Очистить найденные
            </button>
          </>
        ) : null}
      </div>
      <div className="check-list">
        {visibleItems.map((item) => (
          <label key={item.id} className="relation-check-row">
            <input type="checkbox" checked={item.checked} onChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
            {onOpen ? <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOpen(item.id); }}>Открыть</button> : null}
          </label>
        ))}
      </div>
    </div>
  );
}
