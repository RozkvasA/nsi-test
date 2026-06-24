import { useState } from 'react';
import type { ReactNode } from 'react';
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

const cleanName = (name: string) => name.replace(/\s\/\s.+$/, '');
const formatArea = (area: number | null) => (area === null ? '' : `${area.toLocaleString('ru-RU')} м²`);
const limitItems = <T,>(items: T[], expanded: boolean, limit = 5) => ({ visible: expanded ? items : items.slice(0, limit), rest: Math.max(0, items.length - limit) });

export function ObjectOverview({ objects, objectTypes, systems, equipment, techCards, onAddObject, onCreateFromTemplate, onOpenInTree }: ObjectOverviewProps) {
  const cards = buildObjectOverviewCards(objects, objectTypes, systems, equipment, techCards);
  const [expandedOverviewRootIds, setExpandedOverviewRootIds] = useState<Set<string>>(new Set());
  const [expandedOverviewNodeIds, setExpandedOverviewNodeIds] = useState<Set<string>>(new Set());
  const [expandedOverviewDetailIds, setExpandedOverviewDetailIds] = useState<Set<string>>(new Set());
  const [expandedOverviewListKeys, setExpandedOverviewListKeys] = useState<Set<string>>(new Set());

  const toggleRoot = (rootId: string) => {
    setExpandedOverviewRootIds((prev) => toggleSetValue(prev, rootId));
  };

  const toggleNode = (nodeId: string) => {
    setExpandedOverviewNodeIds((prev) => toggleSetValue(prev, nodeId));
  };

  const toggleDetail = (detailId: string) => {
    setExpandedOverviewDetailIds((prev) => toggleSetValue(prev, detailId));
  };

  const toggleList = (listKey: string) => {
    setExpandedOverviewListKeys((prev) => toggleSetValue(prev, listKey));
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
        {cards.length === 0 ? <div className="empty-state compact-empty"><h3>Объекты не заведены</h3><p>Демо выключено. Создайте первый объект вручную или из шаблона.</p></div> : null}

        {cards.map((card) => {
          const isExpanded = expandedOverviewRootIds.has(card.id);
          const area = formatArea(card.area);
          return (
            <article className={isExpanded ? 'overview-tree-card expanded' : 'overview-tree-card'} key={card.id}>
              <div className="overview-root-row">
                <button type="button" className="overview-expand-button" onClick={() => toggleRoot(card.id)} aria-label={isExpanded ? 'Свернуть объект' : 'Раскрыть объект'}>{isExpanded ? '▾' : '▸'}</button>
                <div className="overview-root-main"><b>{cleanName(card.name)}</b><span>{card.typeName}</span></div>
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
                  {card.outlineNodes.map((node) => {
                    const isNodeExpanded = expandedOverviewNodeIds.has(node.id);
                    return (
                      <div className={isNodeExpanded ? 'overview-level-block expanded' : 'overview-level-block'} key={node.id}>
                        <div className="overview-level-row">
                          <button type="button" className="overview-expand-button" onClick={() => toggleNode(node.id)} aria-label={isNodeExpanded ? 'Свернуть уровень' : 'Раскрыть уровень'}>{isNodeExpanded ? '▾' : '▸'}</button>
                          <div className="overview-detail-main"><b>{cleanName(node.name)}</b><span>{node.typeName}</span></div>
                          <div className="overview-badges"><Badge label={`${node.detailChildren.length} узл.`} /></div>
                        </div>

                        {isNodeExpanded ? (
                          <div className="overview-level-children">
                            {node.detailChildren.map((detailNode) => {
                              const isDetailExpanded = expandedOverviewDetailIds.has(detailNode.id);
                              const detailArea = formatArea(detailNode.area);
                              const roomListKey = `${detailNode.id}:rooms`;
                              const systemListKey = `${detailNode.id}:systems`;
                              return (
                                <div className={isDetailExpanded ? 'overview-detail-node expanded' : 'overview-detail-node'} key={detailNode.id}>
                                  <div className="overview-detail-summary-row">
                                    <button type="button" className="overview-expand-button" onClick={() => toggleDetail(detailNode.id)} aria-label={isDetailExpanded ? 'Свернуть объект' : 'Раскрыть объект'}>{isDetailExpanded ? '▾' : '▸'}</button>
                                    <div className="overview-detail-main"><b>{cleanName(detailNode.name)}</b><span>{detailNode.typeName}</span></div>
                                    <div className="overview-badges">
                                      {detailArea ? <Badge label={detailArea} /> : null}
                                      <Badge label={`${detailNode.roomsCount} помещ.`} />
                                      <Badge label={`${detailNode.systemsCount} сист.`} />
                                      {detailNode.warnings.length > 0 ? <Badge label={`${detailNode.warnings.length} пред.`} tone="warning" /> : null}
                                    </div>
                                  </div>

                                  {isDetailExpanded ? (
                                    <div className="overview-detail-row">
                                      <CompactBlock title="Помещения" emptyText="нет помещений" items={detailNode.rooms} expanded={expandedOverviewListKeys.has(roomListKey)} onToggle={() => toggleList(roomListKey)} renderItem={(room) => <RoomLine room={room} />} />
                                      <CompactBlock title="Системы" emptyText="нет систем" items={detailNode.systems} expanded={expandedOverviewListKeys.has(systemListKey)} onToggle={() => toggleList(systemListKey)} renderItem={(system) => <SystemLine system={system} />} />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function toggleSetValue(prev: Set<string>, id: string) {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

function Badge({ label, tone }: { label: string; tone?: 'warning' }) {
  return <span className={tone === 'warning' ? 'overview-badge warning' : 'overview-badge'}>{label}</span>;
}

function CompactBlock<T>({ title, emptyText, items, expanded, onToggle, renderItem }: { title: string; emptyText: string; items: T[]; expanded: boolean; onToggle: () => void; renderItem: (item: T) => ReactNode }) {
  const { visible, rest } = limitItems(items, expanded, 5);
  return (
    <div className="overview-compact-block">
      <div className="overview-compact-block-title"><b>{title}</b><span>{items.length}</span></div>
      {visible.length === 0 ? <small>{emptyText}</small> : null}
      {visible.map((item, index) => <div className="overview-compact-line" key={index}>{renderItem(item)}</div>)}
      {items.length > 5 ? <button type="button" className="overview-list-toggle" onClick={onToggle}>{expanded ? 'Свернуть' : `+${rest} еще`}</button> : null}
    </div>
  );
}

function RoomLine({ room }: { room: OverviewRoomItem }) {
  const area = formatArea(room.area);
  return <><span>{cleanName(room.name)}</span><small>{room.typeName}{area ? ` · ${area}` : ''}</small></>;
}

function SystemLine({ system }: { system: OverviewSystemItem }) {
  return <><span>{system.name}</span><small>{system.scope} · {system.equipmentCount} обор.</small></>;
}
