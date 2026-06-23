import { useState } from 'react';
import type { EquipmentEntity, InfrastructureObject, ObjectType, SystemEntity, TechCard } from '../../types/nsi';
import type { OverviewRoomItem, OverviewSystemItem } from '../../utils/nsiOverview';
import { buildObjectOverviewCards } from '../../utils/nsiOverview';

interface ObjectOverviewProps {
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  onAddObject: () => void;
  onCreateFromTemplate: () => void;
  onOpenInTree: (objectId: string) => void;
}

const formatArea = (area: number | null) => (area === null ? '' : `${area.toLocaleString('ru-RU')} м²`);
const limitItems = <T,>(items: T[], limit = 5) => ({ visible: items.slice(0, limit), rest: Math.max(0, items.length - limit) });

export function ObjectOverview({ objects, objectTypes, systems, equipment, techCards, onAddObject, onCreateFromTemplate, onOpenInTree }: ObjectOverviewProps) {
  const cards = buildObjectOverviewCards(objects, objectTypes, systems, equipment, techCards);
  const [expandedOverviewRootIds, setExpandedOverviewRootIds] = useState<Set<string>>(new Set());

  const toggleRoot = (rootId: string) => {
    setExpandedOverviewRootIds((prev) => {
      const next = new Set(prev);
      next.has(rootId) ? next.delete(rootId) : next.add(rootId);
      return next;
    });
  };

  return (
    <section className="overview-panel compact-overview-panel">
      <header className="overview-header compact-overview-header">
        <h2>Обзор объектов</h2>
        <div className="overview-actions">
          <button type="button" onClick={onAddObject}>Добавить объект</button>
          <button type="button" onClick={onCreateFromTemplate}>Создать из шаблона</button>
        </div>
      </header>

      <div className="overview-list compact-overview-list">
        {cards.length === 0 ? <div className="empty-state compact-empty"><h3>Объекты не заведены</h3><p>Создайте первый объект вручную или из шаблона.</p></div> : null}

        {cards.map((card) => {
          const isExpanded = expandedOverviewRootIds.has(card.id);
          const area = formatArea(card.area);
          return (
            <article className={isExpanded ? 'overview-tree-card expanded' : 'overview-tree-card'} key={card.id}>
              <div className="overview-root-row">
                <button type="button" className="overview-expand-button" onClick={() => toggleRoot(card.id)} aria-label={isExpanded ? 'Свернуть объект' : 'Раскрыть объект'}>{isExpanded ? '▾' : '▸'}</button>
                <div className="overview-root-main">
                  <b>{card.name}</b>
                  <span>{card.typeName}</span>
                </div>
                <div className="overview-badges">
                  <Badge label={`L${card.detailLevel}`} />
                  {area ? <Badge label={area} /> : null}
                  <Badge label={`${card.roomsCount} помещ.`} />
                  <Badge label={`${card.systemsCount} сист.`} />
                  <Badge label={`${card.equipmentCount} обор.`} />
                  <Badge label={`${card.techCardsCount} ТК`} />
                  {card.warnings.length > 0 ? <Badge label={`${card.warnings.length} пред.`} tone="warning" /> : null}
                </div>
                <button type="button" className="overview-open-button" onClick={() => onOpenInTree(card.id)}>Открыть</button>
              </div>

              {isExpanded ? (
                <div className="overview-tree-body">
                  {card.warnings.length > 0 ? <div className="overview-warning-line">{card.warnings.join('; ')}</div> : null}
                  {card.detailNodes.map((node) => (
                    <div className="overview-detail-row" key={node.id}>
                      <div className="overview-detail-main">
                        <b>{node.name}</b>
                        <span>{node.typeName} · {node.path}</span>
                      </div>
                      <CompactBlock title="Помещения" emptyText="нет помещений" items={node.rooms} renderItem={(room) => <RoomLine room={room} />} />
                      <CompactBlock title="Системы" emptyText="нет систем" items={node.systems} renderItem={(system) => <SystemLine system={system} />} />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Badge({ label, tone }: { label: string; tone?: 'warning' }) {
  return <span className={tone === 'warning' ? 'overview-badge warning' : 'overview-badge'}>{label}</span>;
}

function CompactBlock<T>({ title, emptyText, items, renderItem }: { title: string; emptyText: string; items: T[]; renderItem: (item: T) => JSX.Element }) {
  const { visible, rest } = limitItems(items, 5);
  return (
    <div className="overview-compact-block">
      <div className="overview-compact-block-title"><b>{title}</b><span>{items.length}</span></div>
      {visible.length === 0 ? <small>{emptyText}</small> : null}
      {visible.map((item, index) => <div className="overview-compact-line" key={index}>{renderItem(item)}</div>)}
      {rest > 0 ? <small>+{rest} еще</small> : null}
    </div>
  );
}

function RoomLine({ room }: { room: OverviewRoomItem }) {
  const area = formatArea(room.area);
  return <><span>{room.name}</span><small>{room.typeName}{area ? ` · ${area}` : ''}</small></>;
}

function SystemLine({ system }: { system: OverviewSystemItem }) {
  return <><span>{system.name}</span><small>{system.scope} · {system.equipmentCount} обор.</small></>;
}
