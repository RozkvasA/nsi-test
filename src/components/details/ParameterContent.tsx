import { useState } from 'react';
import type {
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ObjectType,
  ParameterDataType,
  ParameterDefinition,
  ParameterGroupId,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
import { buildObjectTypeDescendantIds, isRoomType, resolveTargetName, targetLabel } from '../../utils/nsiTree';
import { RelationBlock } from '../relations/RelationBlock';

const parameterDataTypes: ParameterDataType[] = ['string', 'number', 'boolean', 'date', 'dictionary'];

interface ParameterContentProps {
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  activeGroupId: ParameterGroupId;
  showEmpty: boolean;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onUpdateObjectType: (id: string, patch: Partial<ObjectType>) => void;
  onToggleAllowedChildType: (typeId: string, childTypeId: string) => void;
  onAddParameterGroup: (typeId: string) => void;
  onRenameParameterGroup: (typeId: string, groupId: string, name: string) => void;
  onAddParameterToGroup: (typeId: string, groupId: string) => void;
  onUpdateParameter: (typeId: string, parameterId: string, patch: Partial<ParameterDefinition>) => void;
  onDeleteParameter: (typeId: string, parameterId: string) => void;
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
  objectTypes,
  systems,
  equipment,
  techCards,
  dictionaries,
  onUpdateObject,
  onUpdateObjectType,
  onToggleAllowedChildType,
  onAddParameterGroup,
  onRenameParameterGroup,
  onAddParameterToGroup,
  onUpdateParameter,
  onDeleteParameter,
  onToggleObjectSystemLink,
  onToggleEquipmentPlacement,
  onToggleSystemRoomLink,
  onBulkLinkRoomsToSystem,
  onUpdateTechCard,
}: ParameterContentProps) {
  const [selectedObjectTypeGroupId, setSelectedObjectTypeGroupId] = useState('');

  if (!selectedEntity) return <EmptyState title="Элемент не выбран" description="Выберите строку в центральном дереве." />;

  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;

    const objectType = objectTypes.find((type) => type.id === object.typeId);
    const parent = objects.find((item) => item.id === object.parentId);
    const roomsInBranch = objects.filter((item) => isRoomType(item.typeId, objectTypes));
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
        <SelectField
          label="Вид объекта"
          value={object.typeId}
          options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))}
          onChange={(value) => onUpdateObject(object.id, { typeId: value })}
        />
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
    const blockedParentIds = new Set([type.id, ...buildObjectTypeDescendantIds(objectTypes, type.id)]);
    const parentOptions = [
      { value: '', label: 'Нет родительского вида' },
      ...objectTypes.filter((item) => !blockedParentIds.has(item.id)).map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` })),
    ];

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Дочерние виды и правила создания" description="Дерево видов является справочником и шаблоном, а не жестким ограничителем." />
          <InfoGrid
            items={[
              { label: 'Родительский вид', value: parent?.name ?? 'Нет' },
              { label: 'Дочерних видов', value: objectTypes.filter((item) => item.parentTypeId === type.id).length },
              { label: 'Допустимых дочерних видов', value: type.allowedChildTypeIds.length },
            ]}
          />
          <RelationBlock
            title="Допустимые дочерние виды"
            description="Эти чекбоксы задают шаблон создания дочерних элементов. Пользователь все равно может создать новый вид, если нужного нет."
            items={objectTypes
              .filter((item) => item.id !== type.id)
              .map((item) => ({ id: item.id, label: `${item.icon} ${item.name}`, checked: type.allowedChildTypeIds.includes(item.id) }))}
            onToggle={(childTypeId) => onToggleAllowedChildType(type.id, childTypeId)}
          />
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      const firstGroupId = type.parameterGroups[0]?.id ?? '';
      const activeObjectTypeGroupId = type.parameterGroups.some((group) => group.id === selectedObjectTypeGroupId) ? selectedObjectTypeGroupId : firstGroupId;
      const activeGroup = type.parameterGroups.find((group) => group.id === activeObjectTypeGroupId);
      const groupParameters = activeGroup ? type.parameters.filter((parameter) => activeGroup.parameterIds.includes(parameter.id)) : [];

      return (
        <div className="parameter-section">
          <SectionTitle title="Группы параметров и параметры вида" description="Эти настройки будут управлять формами объектов на следующих этапах." />
          <div className="type-parameters-layout">
            <div className="type-group-list">
              <div className="inline-title">
                <b>Группы параметров</b>
                <button type="button" onClick={() => onAddParameterGroup(type.id)}>
                  Добавить группу
                </button>
              </div>
              {type.parameterGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={group.id === activeObjectTypeGroupId ? 'type-group-row active' : 'type-group-row'}
                  onClick={() => setSelectedObjectTypeGroupId(group.id)}
                >
                  <span>{group.name}</span>
                  <small>{group.parameterIds.length} параметров</small>
                </button>
              ))}
            </div>

            <div className="type-parameter-editor">
              {activeGroup ? (
                <>
                  <EditableField label="Название группы" value={activeGroup.name} onChange={(value) => onRenameParameterGroup(type.id, activeGroup.id, value)} />
                  <div className="inline-title">
                    <b>Параметры группы</b>
                    <button type="button" onClick={() => onAddParameterToGroup(type.id, activeGroup.id)}>
                      Добавить параметр
                    </button>
                  </div>
                  {groupParameters.length === 0 ? <EmptyState title="Параметров нет" description="Добавьте первый параметр для выбранной группы." /> : null}
                  {groupParameters.map((parameter) => (
                    <ParameterEditor
                      key={parameter.id}
                      parameter={parameter}
                      onUpdate={(patch) => onUpdateParameter(type.id, parameter.id, patch)}
                      onDelete={() => onDeleteParameter(type.id, parameter.id)}
                    />
                  ))}
                </>
              ) : (
                <EmptyState title="Группа не выбрана" description="Добавьте или выберите группу параметров." />
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры вида" description="Редактирование вида выполняется прямо в карточке. Вид остается универсальным шаблоном, а не частной моделью ЖК." />
        <EditableField label="Идентификатор" value={type.id} readOnly />
        <EditableField label="Наименование" value={type.name} onChange={(value) => onUpdateObjectType(type.id, { name: value })} />
        <EditableField label="Код" value={type.code} onChange={(value) => onUpdateObjectType(type.id, { code: value })} />
        <EditableField label="Сокращение" value={type.shortName} onChange={(value) => onUpdateObjectType(type.id, { shortName: value })} />
        <EditableField label="Иконка" value={type.icon} onChange={(value) => onUpdateObjectType(type.id, { icon: value })} />
        <SelectField label="Родительский вид" value={type.parentTypeId ?? ''} options={parentOptions} onChange={(value) => onUpdateObjectType(type.id, { parentTypeId: value || null })} />
        <CheckboxField label="Можно создавать объекты этого вида" checked={type.canCreateObjects} onChange={(checked) => onUpdateObjectType(type.id, { canCreateObjects: checked })} />
        <CheckboxField label="Можно редактировать объекты этого вида" checked={type.canEditObjects} onChange={(checked) => onUpdateObjectType(type.id, { canEditObjects: checked })} />
        <CheckboxField label="Можно снимать объекты этого вида с учета" checked={type.canRetireObjects} onChange={(checked) => onUpdateObjectType(type.id, { canRetireObjects: checked })} />
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

function ParameterEditor({ parameter, onUpdate, onDelete }: { parameter: ParameterDefinition; onUpdate: (patch: Partial<ParameterDefinition>) => void; onDelete: () => void }) {
  return (
    <div className="parameter-definition-card">
      <div className="inline-title">
        <b>{parameter.name || 'Новый параметр'}</b>
        <button type="button" onClick={onDelete}>
          Удалить параметр
        </button>
      </div>
      <EditableField label="Наименование" value={parameter.name} onChange={(value) => onUpdate({ name: value })} />
      <EditableField label="Код" value={parameter.code} onChange={(value) => onUpdate({ code: value })} />
      <SelectField label="Тип данных" value={parameter.dataType} options={parameterDataTypes.map((type) => ({ value: type, label: type }))} onChange={(value) => onUpdate({ dataType: value as ParameterDataType })} />
      <EditableField label="Единица измерения" value={parameter.unit} onChange={(value) => onUpdate({ unit: value })} />
      <EditableField label="Значение по умолчанию" value={String(parameter.defaultValue ?? '')} onChange={(value) => onUpdate({ defaultValue: value || null })} />
      <CheckboxField label="Обязательный параметр" checked={parameter.required} onChange={(checked) => onUpdate({ required: checked })} />
      <CheckboxField label="Показывать в строке дерева" checked={parameter.showInTree} onChange={(checked) => onUpdate({ showInTree: checked })} />
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

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="boolean-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
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
