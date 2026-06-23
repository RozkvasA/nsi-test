import type { EquipmentEntity, InfrastructureObject, ObjectType, SystemEntity, TechCard } from '../../types/nsi';
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

const formatArea = (area: number | null) => (area === null ? 'не заполнена' : `${area.toLocaleString('ru-RU')} м²`);

export function ObjectOverview({ objects, objectTypes, systems, equipment, techCards, onAddObject, onCreateFromTemplate, onOpenInTree }: ObjectOverviewProps) {
  const cards = buildObjectOverviewCards(objects, objectTypes, systems, equipment, techCards);

  return (
    <section className="overview-panel">
      <header className="overview-header">
        <div>
          <p className="eyebrow">Начальный раздел</p>
          <h2>Обзор объектов</h2>
          <span>Краткая сводка корневых объектов без раскрытия полной технической иерархии.</span>
        </div>
        <div className="overview-actions">
          <button type="button" onClick={onAddObject}>Добавить объект</button>
          <button type="button" onClick={onCreateFromTemplate}>Создать из шаблона</button>
        </div>
      </header>

      <div className="overview-list">
        {cards.length === 0 ? (
          <div className="empty-state">
            <h3>Объекты не заведены</h3>
            <p>Создайте первый корневой объект вручную или из шаблона структуры.</p>
          </div>
        ) : null}

        {cards.map((card) => (
          <article className="overview-card" key={card.id}>
            <div className="overview-card-header">
              <div>
                <h3>{card.name}</h3>
                <p>{card.typeName}</p>
              </div>
              <button type="button" onClick={() => onOpenInTree(card.id)}>Открыть в дереве</button>
            </div>

            <div className="overview-metrics">
              <Metric label="Уровень детализации" value={card.detailLevel} />
              <Metric label="Площадь" value={formatArea(card.area)} />
              <Metric label="Дочерних элементов" value={card.descendantCount} />
              <Metric label="Помещений" value={card.roomsCount} />
              <Metric label="Систем" value={card.systemsCount} />
              <Metric label="Оборудования" value={card.equipmentCount} />
              <Metric label="Техкарт" value={card.techCardsCount} />
              <Metric label="Предупреждений" value={card.warnings.length} tone={card.warnings.length > 0 ? 'warning' : 'ok'} />
            </div>

            {card.warnings.length > 0 ? (
              <div className="inline-warning overview-warning">
                <b>Предупреждения</b>
                <p>{card.warnings.join('; ')}</p>
              </div>
            ) : null}

            <div className="overview-detail-list">
              {card.detailNodes.map((node) => (
                <div className="overview-detail-card" key={node.id}>
                  <div className="overview-detail-title">
                    <div>
                      <b>{node.name}</b>
                      <span>{node.typeName} · {node.path}</span>
                    </div>
                  </div>
                  <div className="overview-blocks">
                    <div className="overview-block">
                      <strong>Помещения</strong>
                      {node.rooms.length === 0 ? <p>На этом уровне помещения или зоны не заведены.</p> : null}
                      {node.rooms.map((room) => (
                        <div className="overview-line" key={room.id}>
                          <span>{room.name}</span>
                          <small>{room.typeName} · {room.quantity} {room.area !== null ? `· ${formatArea(room.area)}` : ''}</small>
                        </div>
                      ))}
                    </div>
                    <div className="overview-block">
                      <strong>Системы</strong>
                      {node.systems.length === 0 ? <p>На этом уровне системы не привязаны.</p> : null}
                      {node.systems.map((system) => (
                        <div className="overview-line" key={system.id}>
                          <span>{system.name}</span>
                          <small>{system.scope} · оборудование: {system.equipmentCount}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'warning' }) {
  return (
    <div className={tone ? `overview-metric ${tone}` : 'overview-metric'}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
