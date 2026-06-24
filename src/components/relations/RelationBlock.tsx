import { useMemo, useState } from 'react';

interface RelationBlockProps {
  title: string;
  description: string;
  items: Array<{ id: string; label: string; checked: boolean }>;
  onToggle: (id: string) => void;
  onOpen?: (id: string) => void;
  singleChoice?: boolean;
  actionLabel?: string;
  emptyLabel?: string;
}

export function RelationBlock({ title, description, items, onToggle, onOpen, singleChoice = false, actionLabel = 'Добавить', emptyLabel = 'Связи не выбраны' }: RelationBlockProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedItems = items.filter((item) => item.checked);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    const candidates = singleChoice ? items : items.filter((item) => !item.checked);
    return candidates.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [items, normalizedQuery, singleChoice]);

  const selectItem = (id: string) => {
    onToggle(id);
    setQuery('');
    setIsPickerOpen(false);
  };

  return (
    <div className="relation-block relation-table-block">
      <div className="relation-header">
        <div>
          <b>{title}</b>
          <p>{description}</p>
        </div>
        <span className="counter">{selectedItems.length} выбрано</span>
      </div>

      <div className="relation-selected-table">
        {selectedItems.length === 0 ? <div className="relation-empty-row">{emptyLabel}</div> : null}
        {selectedItems.map((item) => (
          <div className="relation-selected-row" key={item.id}>
            <span>{item.label}</span>
            <div className="row-actions-inline">
              {onOpen ? <button type="button" onClick={() => onOpen(item.id)}>Открыть</button> : null}
              {!singleChoice ? <button type="button" onClick={() => onToggle(item.id)}>Убрать</button> : null}
            </div>
          </div>
        ))}
      </div>

      {isPickerOpen ? (
        <div className="relation-picker">
          <input className="relation-search" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Найти по названию" />
          <div className="relation-picker-list">
            {visibleItems.length === 0 ? <div className="relation-empty-row">Ничего не найдено</div> : null}
            {visibleItems.map((item) => (
              <button type="button" className={item.checked ? 'relation-pick-row active' : 'relation-pick-row'} key={item.id} onClick={() => selectItem(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" className="secondary-action relation-add-button" onClick={() => setIsPickerOpen(true)}>{singleChoice && selectedItems.length > 0 ? 'Изменить' : actionLabel}</button>
      )}
    </div>
  );
}
