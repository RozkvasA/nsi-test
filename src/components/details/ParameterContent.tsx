import { objectTypes } from '../../data/nsiDemoData';
import type {
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ParameterGroupId,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
import { isRoomType, resolveTargetName, targetLabel } from '../../utils/nsiTree';
import { RelationBlock } from '../relations/RelationBlock';

interface ParameterContentProps {
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  activeGroupId: ParameterGroupId;
  showEmpty: boolean;
  objects: InfrastructureObject[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onToggleObjectSystemLink: (objectId: string, systemId: string) => void;
  onToggleEquipmentPlacement: (objectId: string, equipmentId: string) => void;
  onToggleSystemRoomLink: (systemId: string, roomId: string) => void;
  onBulkLinkRoomsToSystem: (systemId: string, roomIds: string[]) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

export function ParameterContent({
  selectedRef,
  selectedEntity,
  activeGroupId,
  showEmpty,
  objects,
  systems,
  equipment,
  techCards,
  dictionaries,
  onUpdateObject,
  onToggleObjectSystemLink,
  onToggleEquipmentPlacement,
  onToggleSystemRoomLink,
  onBulkLinkRoomsToSystem,
  onUpdateTechCard,
}: ParameterContentProps) {
  if (!selectedEntity) return <EmptyState title="Элемент не выбран" description="Выберите строку в центральном дереве." />;

  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;

    const objectType = objectTypes.find((type) => type.id === object.typeId);
    const parent = objects.find((item) => item.id === object.parentId);
    const roomsInBranch = objects.filter((item) => isRoomType(item.typeId));
    const linkedEquipment = equipment.filter((item) => item.placementObjectId === object.id);
    const linkedTechCards = techCards.filter((item) => item.targetId === object.id);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Связи объекта учета" description="Системы и оборудование не хранятся строками внутри помещения. Связи редактируются отдельно и остаются двусторонними." />
          <RelationBlock
            title="Связанные системы"
            description="Для помещения меняется linkedRoomIds, для другого узла дерева меняется scopeObjectIds. Глобальная система не дублируется ниже."
            items={systems.map((system) => ({
              id: system.id,
              label: system.name,
              checked: system.linkedRoomIds.includes(object.id) || system.scopeObjectIds.includes(object.id),
            }))}
            onToggle={(id) => onToggleObjectSystemLink(object.id, id)}
          />
          <RelationBlock
            title="Связанное оборудование"
            description="Оборудование остается отдельной сущностью и хранит placementObjectId."
            items={equipment.map((item) => ({
              id: item.id,
              label: item.name,
              checked: item.placementObjectId === object.id,
            }))}
            onToggle={(id) => onToggleEquipmentPlacement(object.id, id)}
            singleChoice
          />
          <div className="bulk-panel">
            <b>Массовая привязка</b>
            <p>Для выбранного объекта можно привязать систему ко всем помещениям ветки. Действие сохраняет систему отдельной сущностью.</p>
            <button type="button" onClick={() => systems[0] && onBulkLinkRoomsToSystem(systems[0].id, roomsInBranch.map((room) => room.id))}>
              Привязать первую систему ко всем помещениям
            </button>
          </div>
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Прочие параметры по виду объекта" description="Поля берутся из вида объекта и не завязаны на конкретный тип недвижимости." />
          <KeyValueList showEmpty={showEmpty} rows={Object.entries(object.parameters).map(([key, value]) => ({ label: key, value }))} />
          <InfoGrid
            items={[
              { label: 'Связанных техкарт', value: linkedTechCards.length },
              { label: 'Размещенного оборудования', value: linkedEquipment.length },
              { label: 'Статус учета', value: object.status === 'active' ? 'На учете' : 'Снят с учета' },
            ]}
          />
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры" description="Редактирование выполняется в правой карточке, без модального окна поверх интерфейса." />
        <EditableField label="Идентификатор" value={object.id} readOnly />
        <EditableField label="Наименование" value={object.name} onChange={(value) => onUpdateObject(object.id, { name: value })} />
        <EditableField label="Сокращение" value={object.shortName} onChange={(value) => onUpdateObject(object.id, { shortName: value })} />
        <EditableField label="Вид объекта" value={objectType?.name ?? ''} readOnly empty={!objectType} showEmpty={showEmpty} />
        <EditableField label="Родительский объект" value={parent?.name ?? ''} readOnly empty={!parent} showEmpty={showEmpty} />
        <EditableField
          label="Площадь"
          value={object.area ?? ''}
          type="number"
          empty={object.area === null}
          showEmpty={showEmpty}
          onChange={(value) => onUpdateObject(object.id, { area: value === '' ? null : Number(value) })}
        />
        <EditableField label="Количество" value={object.quantity} type="number" onChange={(value) => onUpdateObject(object.id, { quantity: Number(value) })} />
        <EditableField label="Единица измерения" value={object.unit} onChange={(value) => onUpdateObject(object.id, { unit: value })} />
      </div>
    );
  }

  if (selectedRef.kind === 'objectType') {
    const type = objectTypes.find((item) => item.id === selectedRef.id);
    if (!type) return null;
    const parent = objectTypes.find((item) => item.id === type.parentTypeId);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Дочерние виды и правила создания" description="Дерево видов является справочником и шаблоном, а не жестким ограничителем." />
          <InfoGrid
            items={[
              { label: 'Родительский вид', value: parent?.name ?? 'Нет' },
              { label: 'Разрешено создавать', value: type.canCreateObjects ? 'Да' : 'Нет' },
              { label: 'Разрешено редактировать', value: type.canEditObjects ? 'Да' : 'Нет' },
              { label: 'Разрешено снимать с учета', value: type.canRetireObjects ? 'Да' : 'Нет' },
            ]}
          />
          <TagList title="Допустимые дочерние виды" tags={type.allowedChildTypeIds.map((id) => objectTypes.find((item) => item.id === id)?.name ?? id)} />
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Группы параметров" description="На следующих этапах эти группы будут управлять карточками объектов." />
          {type.parameterGroups.map((group) => (
            <div className="mini-card" key={group.id}>
              <b>{group.name}</b>
              <p>{group.parameterIds.join(', ')}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры вида" description="Вид объекта хранит код, сокращение, иконку и правила шаблона." />
        <EditableField label="Идентификатор" value={type.id} readOnly />
        <EditableField label="Наименование" value={type.name} readOnly />
        <EditableField label="Код" value={type.code} readOnly />
        <EditableField label="Сокращение" value={type.shortName} readOnly />
        <EditableField label="Иконка" value={type.icon} readOnly />
      </div>
    );
  }

  if (selectedRef.kind === 'techCard') {
    const card = techCards.find((item) => item.id === selectedRef.id);
    if (!card) return null;
    const targetName = resolveTargetName(card, objects, systems, equipment);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Привязка техкарты" description="Техкарта не существует сама по себе. Целью может быть помещение, система или оборудование." />
          <InfoGrid items={[{ label: 'Тип цели', value: targetLabel(card.targetType) }, { label: 'Объект применения', value: targetName }, { label: 'Активна', value: card.isActive ? 'Да' : 'Нет' }]} />
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Операции и ресурсы" description="Планирование работ сюда не входит, здесь только нормативные исходные данные." />
          <TagList title="Операции" tags={card.operations} />
          <TagList title="Персонал" tags={card.personnel} />
          <TagList title="Материалы" tags={card.materials.length > 0 ? card.materials : ['Не заполнено']} />
          <TagList title="СИЗ" tags={card.ppe.length > 0 ? card.ppe : ['Не заполнено']} />
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры техкарты" description="Обязательные поля показаны в карточке, расчет объемов не выполняется." />
        <EditableField label="Идентификатор" value={card.id} readOnly />
        <EditableField label="Наименование" value={card.name} onChange={(value) => onUpdateTechCard(card.id, { name: value })} />
        <EditableField label="Тип техкарты" value={card.type} onChange={(value) => onUpdateTechCard(card.id, { type: value })} />
        <EditableField label="Вид работы" value={card.workTypeId} readOnly />
        <EditableField label="Периодичность" value={card.periodicity} onChange={(value) => onUpdateTechCard(card.id, { periodicity: value })} />
        <EditableField
          label="Минимальная продолжительность, чел-ч"
          value={card.minDurationManHours ?? ''}
          type="number"
          empty={card.minDurationManHours === null}
          showEmpty={showEmpty}
          onChange={(value) => onUpdateTechCard(card.id, { minDurationManHours: value === '' ? null : Number(value) })}
        />
      </div>
    );
  }

  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  if (!dictionary) return null;
  const parent = dictionaries.find((item) => item.id === dictionary.parentId);
  const children = dictionaries.filter((item) => item.parentId === dictionary.id);

  if (activeGroupId === 'relations') {
    return (
      <div className="parameter-section">
        <SectionTitle title="Связи справочника" description="Справочники отображаются тем же паттерном: дерево слева, карточка справа." />
        <InfoGrid items={[{ label: 'Родитель', value: parent?.title ?? 'Нет' }, { label: 'Дочерних записей', value: children.length }]} />
      </div>
    );
  }

  return (
    <div className="parameter-section">
      <SectionTitle title="Основные параметры справочника" description="Минимальный каркас для единиц измерения, видов работ, дефектов, персонала и материалов." />
      <EditableField label="Идентификатор" value={dictionary.id} readOnly />
      <EditableField label="Наименование" value={dictionary.title} readOnly />
      <EditableField label="Код" value={dictionary.code} readOnly />
      <EditableField label="Описание" value={dictionary.description} readOnly />
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  type = 'text',
  readOnly = false,
  empty = false,
  showEmpty = true,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  readOnly?: boolean;
  empty?: boolean;
  showEmpty?: boolean;
  onChange?: (value: string) => void;
}) {
  if (empty && !showEmpty) return null;

  return (
    <label className={empty ? 'field-row empty' : 'field-row'}>
      <span>{label}</span>
      <input type={type} value={value} readOnly={readOnly} placeholder={empty ? 'Не заполнено' : undefined} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <div className="info-card" key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function TagList({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="tag-list">
      <b>{title}</b>
      <div>
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

function KeyValueList({ showEmpty, rows }: { showEmpty: boolean; rows: Array<{ label: string; value: string | number | boolean | null }> }) {
  const visibleRows = showEmpty ? rows : rows.filter((row) => row.value !== null && row.value !== '' && row.value !== 'Не заполнено');

  if (visibleRows.length === 0) return <EmptyState title="Нет заполненных параметров" description="Включите показ пустых полей или заполните параметры." />;

  return (
    <div className="key-value-list">
      {visibleRows.map((row) => (
        <div key={row.label} className={row.value === null || row.value === 'Не заполнено' ? 'key-value-row empty' : 'key-value-row'}>
          <span>{row.label}</span>
          <b>{String(row.value ?? 'Не заполнено')}</b>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
