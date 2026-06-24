import type { EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity, TechCard } from '../../types/nsi';
import {
  buildEquipmentDescendantIds,
  equipmentTabs,
  getApplicableTechCardsForEquipment,
  getEquipmentParameterValue,
  getEquipmentPlacementInfo,
  getEquipmentSystemLabel,
  getEquipmentTypeParameters,
  getEquipmentWarnings,
  normalizeEquipmentParameterInput,
} from '../../utils/nsiEquipment';
import { RelationBlock } from '../relations/RelationBlock';

interface EquipmentContentProps {
  equipmentItem: EquipmentEntity;
  equipment: EquipmentEntity[];
  systems: SystemEntity[];
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  techCards: TechCard[];
  activeTab: string;
  onSetActiveTab: (tab: string) => void;
  onUpdateEquipment: (id: string, patch: Partial<EquipmentEntity>) => void;
  onCreateEquipmentType: (equipmentId: string) => void;
  onAddChildEquipment: (parentEquipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onSelectSystem: (systemId: string) => void;
  onSelectTechCard: (techCardId: string) => void;
  onCreateTechCardForEquipment: (equipmentId: string) => void;
}

const typeLabel = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не найден';
const objectLabel = (objects: InfrastructureObject[], objectId: string) => objects.find((object) => object.id === objectId)?.name ?? 'Не задано';

export function EquipmentContent({
  equipmentItem,
  equipment,
  systems,
  objects,
  objectTypes,
  techCards,
  activeTab,
  onSetActiveTab,
  onUpdateEquipment,
  onCreateEquipmentType,
  onAddChildEquipment,
  onSelectEquipment,
  onSelectSystem,
  onSelectTechCard,
  onCreateTechCardForEquipment,
}: EquipmentContentProps) {
  const safeActiveTab = equipmentTabs.includes(activeTab) ? activeTab : 'Параметры';
  const warnings = getEquipmentWarnings(equipmentItem, equipment, systems);
  const patchEquipment = (patch: Partial<EquipmentEntity>) => onUpdateEquipment(equipmentItem.id, patch);

  return (
    <div className="tech-card-editor equipment-card-editor">
      <div className="tabs equipment-tabs">
        {equipmentTabs.map((tab) => <button key={tab} type="button" className={tab === safeActiveTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}
      </div>

      {warnings.length > 0 ? <div className="inline-warning equipment-warning"><b>Предупреждения по оборудованию</b><p>{warnings.join('; ')}</p></div> : null}

      {safeActiveTab === 'Параметры' ? <EquipmentParameters equipmentItem={equipmentItem} equipment={equipment} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} onCreateEquipmentType={onCreateEquipmentType} /> : null}
      {safeActiveTab === 'Размещение' ? <EquipmentPlacement equipmentItem={equipmentItem} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} /> : null}
      {safeActiveTab === 'Вложенность' ? <EquipmentNesting equipmentItem={equipmentItem} equipment={equipment} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} onAddChildEquipment={onAddChildEquipment} onSelectEquipment={onSelectEquipment} /> : null}
      {safeActiveTab === 'Техкарты' ? <EquipmentTechCards equipmentItem={equipmentItem} techCards={techCards} onSelectTechCard={onSelectTechCard} onCreateTechCardForEquipment={onCreateTechCardForEquipment} /> : null}
      {safeActiveTab === 'Документы' || safeActiveTab === 'Заметки' ? <div className="stub-tab"><h3>{safeActiveTab}</h3><p>Заглушка карточки оборудования. Детальная логика будет подключаться отдельным этапом.</p></div> : null}

      {equipmentItem.systemId ? <button type="button" className="secondary-action" onClick={() => onSelectSystem(equipmentItem.systemId)}>Открыть систему оборудования</button> : null}
    </div>
  );
}

function EquipmentParameters({
  equipmentItem,
  equipment,
  systems,
  objects,
  objectTypes,
  patchEquipment,
  onCreateEquipmentType,
}: {
  equipmentItem: EquipmentEntity;
  equipment: EquipmentEntity[];
  systems: SystemEntity[];
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  patchEquipment: (patch: Partial<EquipmentEntity>) => void;
  onCreateEquipmentType: (equipmentId: string) => void;
}) {
  const equipmentType = objectTypes.find((type) => type.id === equipmentItem.typeId);
  const blockedParentIds = new Set([equipmentItem.id, ...buildEquipmentDescendantIds(equipment, equipmentItem.id)]);
  const parentOptions = [
    { value: '', label: 'Нет родительского оборудования' },
    ...equipment
      .filter((item) => !blockedParentIds.has(item.id) && item.systemId === equipmentItem.systemId)
      .map((item) => ({ value: item.id, label: item.name })),
  ];
  const equipmentTypeParameters = getEquipmentTypeParameters(equipmentType);
  const systemOptions = [{ value: '', label: 'Не входит в систему' }, ...systems.map((system) => ({ value: system.id, label: system.name }))];

  const updateEquipmentParameterValue = (parameter: ParameterDefinition, value: ParameterDefaultValue) => {
    patchEquipment({ parameters: { ...equipmentItem.parameters, [parameter.code]: value } });
  };

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Основные данные оборудования" description="Оборудование может быть составом системы или самостоятельным элементом. Место размещения остается обязательным." />
      <div className="reference-fields-grid">
        <EditableField label="Наименование" value={equipmentItem.name} onChange={(value) => patchEquipment({ name: value })} />
        <SelectField label="Вид элемента" value={equipmentItem.typeId} options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))} onChange={(value) => patchEquipment({ typeId: value })} />
        <SelectField label="Система" value={equipmentItem.systemId} options={systemOptions} onChange={(value) => patchEquipment({ systemId: value, parentEquipmentId: '' })} />
        <SelectField label="Родительское оборудование" value={equipmentItem.parentEquipmentId ?? ''} options={parentOptions} onChange={(value) => patchEquipment({ parentEquipmentId: value || null })} />
        <SelectField label="Место размещения" value={equipmentItem.placementObjectId} options={objects.map((object) => ({ value: object.id, label: object.name }))} onChange={(value) => patchEquipment({ placementObjectId: value })} />
        <EditableField label="Количество" type="number" value={equipmentItem.quantity} onChange={(value) => patchEquipment({ quantity: Number(value) || 1 })} />
        <EditableField label="Единица измерения" value={equipmentItem.unit} onChange={(value) => patchEquipment({ unit: value })} />
      </div>
      <button type="button" className="secondary-action" onClick={() => onCreateEquipmentType(equipmentItem.id)}>Создать новый вид оборудования</button>
      <div className="dynamic-parameter-list">
        <div className="inline-title"><b>Параметры по виду оборудования</b><small>{equipmentType?.name ?? 'Вид не найден'}</small></div>
        {equipmentTypeParameters.length > 0 ? equipmentTypeParameters.map((parameter) => <EquipmentParameterInput key={parameter.id} parameter={parameter} value={getEquipmentParameterValue(equipmentItem, parameter)} onChange={(value) => updateEquipmentParameterValue(parameter, value)} />) : <EmptyState title="Параметров вида оборудования нет" description="Добавьте параметры в Дереве видов объектов или создайте новый вид оборудования." />}
      </div>
      <ServiceInfo equipmentItem={equipmentItem} />
    </div>
  );
}

function EquipmentPlacement({ equipmentItem, systems, objects, objectTypes, patchEquipment }: { equipmentItem: EquipmentEntity; systems: SystemEntity[]; objects: InfrastructureObject[]; objectTypes: ObjectType[]; patchEquipment: (patch: Partial<EquipmentEntity>) => void }) {
  const { object, detailInfo } = getEquipmentPlacementInfo(objects, equipmentItem);
  const objectType = object ? objectTypes.find((type) => type.id === object.typeId) : undefined;

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Размещение оборудования" description="Выберите помещение или объект размещения. Список выбора появляется только по действию пользователя." />
      {!equipmentItem.placementObjectId ? <div className="inline-warning"><b>Не выбрано место размещения</b><p>Оборудование должно быть связано с объектом размещения.</p></div> : null}
      <div className="reference-fields-grid">
        <ReadOnlyField label="Система" value={getEquipmentSystemLabel(equipmentItem, systems)} />
        <ReadOnlyField label="Помещение или объект размещения" value={object?.name ?? 'Не найдено'} />
        <ReadOnlyField label="Вид объекта размещения" value={objectType?.name ?? 'Не найден'} />
        <ReadOnlyField label="Уровень объекта" value={detailInfo?.objectLevel ?? 'Не определен'} />
      </div>
      <RelationBlock
        title="Помещение или объект размещения"
        description="Выберите одно место размещения. После выбора карточки помещений обновляются автоматически."
        actionLabel={equipmentItem.placementObjectId ? 'Изменить помещение' : 'Прикрепить к помещению'}
        singleChoice
        items={objects.map((candidate) => ({ id: candidate.id, label: `${candidate.name} · ${typeLabel(objectTypes, candidate.typeId)}`, checked: candidate.id === equipmentItem.placementObjectId }))}
        onToggle={(objectId) => patchEquipment({ placementObjectId: objectId })}
      />
    </div>
  );
}

function EquipmentNesting({
  equipmentItem,
  equipment,
  systems,
  objects,
  objectTypes,
  patchEquipment,
  onAddChildEquipment,
  onSelectEquipment,
}: {
  equipmentItem: EquipmentEntity;
  equipment: EquipmentEntity[];
  systems: SystemEntity[];
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  patchEquipment: (patch: Partial<EquipmentEntity>) => void;
  onAddChildEquipment: (parentEquipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
}) {
  const blockedParentIds = new Set([equipmentItem.id, ...buildEquipmentDescendantIds(equipment, equipmentItem.id)]);
  const parentCandidates = equipment.filter((item) => !blockedParentIds.has(item.id) && item.systemId === equipmentItem.systemId);
  const children = equipment.filter((item) => item.parentEquipmentId === equipmentItem.id);
  const parent = equipment.find((item) => item.id === equipmentItem.parentEquipmentId);

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Вложенность оборудования" description="Оборудование может быть одиночным, комплексным или иметь составные части." />
      <div className="reference-fields-grid">
        <ReadOnlyField label="Система" value={getEquipmentSystemLabel(equipmentItem, systems)} />
        <ReadOnlyField label="Родительское оборудование" value={parent?.name ?? 'Нет'} />
      </div>
      <RelationBlock
        title="Родительское оборудование"
        description="Выбор родителя формирует дерево состава. Самого себя и потомков выбрать нельзя."
        singleChoice
        actionLabel={equipmentItem.parentEquipmentId ? 'Изменить родителя' : 'Выбрать родителя'}
        emptyLabel="Родительское оборудование не выбрано"
        items={parentCandidates.map((item) => ({ id: item.id, label: `${item.name} · ${objectLabel(objects, item.placementObjectId)}`, checked: item.id === equipmentItem.parentEquipmentId }))}
        onToggle={(id) => patchEquipment({ parentEquipmentId: id })}
        onOpen={onSelectEquipment}
      />
      <button type="button" className="secondary-action" onClick={() => onAddChildEquipment(equipmentItem.id)}>Добавить составную часть</button>
      {children.length === 0 ? <EmptyState title="Составных частей нет" description="Добавьте дочернее оборудование или оставьте элемент одиночной единицей учета." /> : null}
      {children.map((child) => (
        <div className="tech-card-row" key={child.id}>
          <div className="inline-title"><b>{child.name}</b><button type="button" onClick={() => onSelectEquipment(child.id)}>Открыть карточку</button></div>
          <div className="reference-fields-grid">
            <ReadOnlyField label="Вид элемента" value={typeLabel(objectTypes, child.typeId)} />
            <ReadOnlyField label="Место размещения" value={objectLabel(objects, child.placementObjectId)} />
            <ReadOnlyField label="Количество" value={child.quantity} />
            <ReadOnlyField label="Единица измерения" value={child.unit} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentTechCards({ equipmentItem, techCards, onSelectTechCard, onCreateTechCardForEquipment }: { equipmentItem: EquipmentEntity; techCards: TechCard[]; onSelectTechCard: (techCardId: string) => void; onCreateTechCardForEquipment: (equipmentId: string) => void }) {
  const cards = getApplicableTechCardsForEquipment(equipmentItem, techCards);

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Техкарты оборудования" description="Показываются техкарты, привязанные к конкретному оборудованию, и техкарты, применимые к виду оборудования." />
      <button type="button" className="secondary-action" onClick={() => onCreateTechCardForEquipment(equipmentItem.id)}>Создать техкарту для оборудования</button>
      {cards.length === 0 ? <EmptyState title="Техкарт нет" description="Создайте первую техкарту для оборудования или задайте техкарту для вида оборудования." /> : null}
      {cards.map((card) => (
        <div className="tech-card-row" key={card.id}>
          <div className="inline-title"><b>{card.name || 'Техкарта без наименования'}</b><button type="button" onClick={() => onSelectTechCard(card.id)}>Открыть техкарту</button></div>
          <div className="reference-fields-grid">
            <ReadOnlyField label="Тип" value={card.type || 'Не задан'} />
            <ReadOnlyField label="Периодичность" value={card.periodicity || 'Не задана'} />
            <ReadOnlyField label="Минимальный интервал" value={card.minExecutionInterval || 'Не задан'} />
            <ReadOnlyField label="Активная" value={card.isActive ? 'Да' : 'Нет'} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceInfo({ equipmentItem }: { equipmentItem: EquipmentEntity }) {
  return <div className="service-info"><b>Служебные сведения</b><span>Идентификатор оборудования: {equipmentItem.id}</span><span>Идентификатор объекта размещения: {equipmentItem.placementObjectId || 'не задан'}</span>{equipmentItem.systemId ? <span>Идентификатор системы: {equipmentItem.systemId}</span> : null}</div>;
}

function EquipmentParameterInput({ parameter, value, onChange }: { parameter: ParameterDefinition; value: ParameterDefaultValue; onChange: (value: ParameterDefaultValue) => void }) {
  if (parameter.dataType === 'boolean') return <label className="boolean-row"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span>{parameter.name}</span></label>;
  return <label className="field-row"><span>{parameter.name}{parameter.required ? ' *' : ''}</span><input type={parameter.dataType === 'number' ? 'number' : parameter.dataType === 'date' ? 'date' : 'text'} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => onChange(normalizeEquipmentParameterInput(parameter, event.target.value))} /></label>;
}

function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>; }
function ReadOnlyField({ label, value }: { label: string; value: string | number }) { return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>; }
function EditableField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: 'text' | 'number'; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>; }
