import { useState } from 'react';
import type { EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity, TechCard } from '../../types/nsi';
import {
  buildEquipmentDescendantIds,
  equipmentTabs,
  getApplicableTechCardsForEquipment,
  getEquipmentDisplayQuantity,
  getEquipmentParameterValue,
  getEquipmentPlacementInfo,
  getEquipmentSystemLabel,
  getEquipmentTypeParameters,
  getEquipmentWarnings,
  isAggregateEquipment,
  normalizeEquipmentParameterInput,
  type EquipmentLevel,
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
  onCreateMissingChildUnits: (parentEquipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onSelectSystem: (systemId: string) => void;
  onSelectTechCard: (techCardId: string) => void;
  onCreateTechCardForEquipment: (equipmentId: string) => void;
}

const typeLabel = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не найден';
const objectLabel = (objects: InfrastructureObject[], objectId: string) => objects.find((object) => object.id === objectId)?.name ?? 'Не задано';
const parameterTextValue = (value: ParameterDefaultValue) => value === null || value === undefined ? '' : String(value);
const equipmentLevelOptions: Array<{ value: EquipmentLevel; label: string }> = [
  { value: 'unit', label: 'Конкретная единица' },
  { value: 'group', label: 'Группа однотипных единиц' },
  { value: 'model', label: 'Модель / тип' },
  { value: 'aggregate', label: 'Агрегат / узел' },
];

export function EquipmentContent({ equipmentItem, equipment, systems, objects, objectTypes, techCards, activeTab, onSetActiveTab, onUpdateEquipment, onCreateEquipmentType, onAddChildEquipment, onCreateMissingChildUnits, onSelectEquipment, onSelectSystem, onSelectTechCard, onCreateTechCardForEquipment }: EquipmentContentProps) {
  const safeActiveTab = equipmentTabs.includes(activeTab) ? activeTab : 'Параметры';
  const warnings = getEquipmentWarnings(equipmentItem, equipment, systems);
  const patchEquipment = (patch: Partial<EquipmentEntity>) => onUpdateEquipment(equipmentItem.id, patch);

  return (
    <div className="tech-card-editor equipment-card-editor">
      <div className="tabs equipment-tabs">{equipmentTabs.map((tab) => <button key={tab} type="button" className={tab === safeActiveTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}</div>
      {warnings.length > 0 ? <div className="inline-warning equipment-warning"><b>Предупреждения по оборудованию</b><p>{warnings.join('; ')}</p></div> : null}
      {safeActiveTab === 'Параметры' ? <EquipmentParameters equipmentItem={equipmentItem} equipment={equipment} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} onCreateEquipmentType={onCreateEquipmentType} /> : null}
      {safeActiveTab === 'Размещение' ? <EquipmentPlacement equipmentItem={equipmentItem} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} /> : null}
      {safeActiveTab === 'Вложенность' ? <EquipmentNesting equipmentItem={equipmentItem} equipment={equipment} systems={systems} objects={objects} objectTypes={objectTypes} patchEquipment={patchEquipment} onUpdateEquipment={onUpdateEquipment} onAddChildEquipment={onAddChildEquipment} onCreateMissingChildUnits={onCreateMissingChildUnits} onSelectEquipment={onSelectEquipment} /> : null}
      {safeActiveTab === 'Техкарты' ? <EquipmentTechCards equipmentItem={equipmentItem} techCards={techCards} onSelectTechCard={onSelectTechCard} onCreateTechCardForEquipment={onCreateTechCardForEquipment} /> : null}
      {safeActiveTab === 'Документы' || safeActiveTab === 'Заметки' ? <div className="stub-tab"><h3>{safeActiveTab}</h3><p>Заглушка карточки оборудования. Детальная логика будет подключаться отдельным этапом.</p></div> : null}
      {equipmentItem.systemId ? <button type="button" className="secondary-action" onClick={() => onSelectSystem(equipmentItem.systemId)}>Открыть систему оборудования</button> : null}
    </div>
  );
}

function EquipmentParameters({ equipmentItem, equipment, systems, objects, objectTypes, patchEquipment, onCreateEquipmentType }: { equipmentItem: EquipmentEntity; equipment: EquipmentEntity[]; systems: SystemEntity[]; objects: InfrastructureObject[]; objectTypes: ObjectType[]; patchEquipment: (patch: Partial<EquipmentEntity>) => void; onCreateEquipmentType: (equipmentId: string) => void }) {
  const equipmentType = objectTypes.find((type) => type.id === equipmentItem.typeId);
  const parent = equipment.find((item) => item.id === equipmentItem.parentEquipmentId);
  const equipmentTypeParameters = getEquipmentTypeParameters(equipmentType);
  const systemOptions = [{ value: '', label: 'Не входит в систему' }, ...systems.map((system) => ({ value: system.id, label: system.name }))];
  const level = (equipmentItem.parameters.equipmentLevel ?? 'unit') as EquipmentLevel;
  const aggregate = isAggregateEquipment(equipmentItem, equipment);
  const displayQuantity = getEquipmentDisplayQuantity(equipmentItem, equipment);
  const updateEquipmentParameterValue = (parameter: ParameterDefinition, value: ParameterDefaultValue) => patchEquipment({ parameters: { ...equipmentItem.parameters, [parameter.code]: value } });
  const updateEquipmentLevel = (nextLevel: string) => {
    const equipmentLevel = nextLevel as EquipmentLevel;
    patchEquipment({
      parameters: { ...equipmentItem.parameters, equipmentLevel },
      quantity: equipmentLevel === 'unit' ? 1 : equipmentItem.quantity || 1,
    });
  };

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Основные данные оборудования" description={aggregate ? 'Это агрегированный уровень оборудования: вид, модель или группа однотипных единиц.' : 'Это конкретная единица оборудования. Количество по смыслу равно 1 и не выводится как основное поле.'} />
      <div className="reference-fields-grid">
        <EditableField label="Наименование" value={equipmentItem.name} onChange={(value) => patchEquipment({ name: value })} />
        <SelectField label="Вид элемента" value={equipmentItem.typeId} options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))} onChange={(value) => patchEquipment({ typeId: value })} />
        <SelectField label="Уровень учета" value={level} options={equipmentLevelOptions} onChange={updateEquipmentLevel} />
        <SelectField label="Система" value={equipmentItem.systemId} options={systemOptions} onChange={(value) => patchEquipment({ systemId: value, parentEquipmentId: null })} />
        <SelectField label="Место размещения" value={equipmentItem.placementObjectId} options={objects.map((object) => ({ value: object.id, label: object.name }))} onChange={(value) => patchEquipment({ placementObjectId: value })} />
        {equipmentItem.parentEquipmentId ? <ReadOnlyField label="Родительское оборудование" value={parent?.name ?? 'Не найдено'} /> : null}
        {aggregate ? <EditableField label="Количество единиц" type="number" value={displayQuantity} onChange={(value) => patchEquipment({ quantity: Number(value) || 1 })} /> : null}
        {aggregate ? <EditableField label="Единица измерения" value={equipmentItem.unit} onChange={(value) => patchEquipment({ unit: value })} /> : null}
      </div>
      <button type="button" className="secondary-action" onClick={() => onCreateEquipmentType(equipmentItem.id)}>Создать новый вид оборудования</button>
      <div className="dynamic-parameter-list"><div className="inline-title"><b>Параметры по виду оборудования</b><small>{equipmentType?.name ?? 'Вид не найден'}</small></div>{equipmentTypeParameters.length > 0 ? equipmentTypeParameters.map((parameter) => <EquipmentParameterInput key={parameter.id} parameter={parameter} value={getEquipmentParameterValue(equipmentItem, parameter)} onChange={(value) => updateEquipmentParameterValue(parameter, value)} />) : <EmptyState title="Параметров вида оборудования нет" description="Добавьте параметры в Дереве видов объектов или создайте новый вид оборудования." />}</div>
      <ServiceInfo equipmentItem={equipmentItem} aggregate={aggregate} />
    </div>
  );
}

function EquipmentPlacement({ equipmentItem, systems, objects, objectTypes, patchEquipment }: { equipmentItem: EquipmentEntity; systems: SystemEntity[]; objects: InfrastructureObject[]; objectTypes: ObjectType[]; patchEquipment: (patch: Partial<EquipmentEntity>) => void }) {
  const { object, detailInfo } = getEquipmentPlacementInfo(objects, equipmentItem);
  const objectType = object ? objectTypes.find((type) => type.id === object.typeId) : undefined;
  return <div className="parameter-section reference-table-section"><SectionTitle title="Размещение оборудования" description="Физическое место размещения есть только у оборудования и его составных частей." />{!equipmentItem.placementObjectId ? <div className="inline-warning"><b>Не выбрано место размещения</b><p>Оборудование должно быть связано с объектом размещения.</p></div> : null}<div className="reference-fields-grid"><ReadOnlyField label="Система" value={getEquipmentSystemLabel(equipmentItem, systems)} /><ReadOnlyField label="Помещение или объект размещения" value={object?.name ?? 'Не найдено'} /><ReadOnlyField label="Вид объекта размещения" value={objectType?.name ?? 'Не найден'} /><ReadOnlyField label="Уровень объекта" value={detailInfo?.objectLevel ?? 'Не определен'} /></div><RelationBlock title="Помещение или объект размещения" description="Выберите одно место размещения. После выбора карточки помещений обновляются автоматически." actionLabel={equipmentItem.placementObjectId ? 'Изменить помещение' : 'Прикрепить к помещению'} singleChoice items={objects.map((candidate) => ({ id: candidate.id, label: `${candidate.name} · ${typeLabel(objectTypes, candidate.typeId)}`, checked: candidate.id === equipmentItem.placementObjectId }))} onToggle={(objectId) => patchEquipment({ placementObjectId: objectId })} /></div>;
}

function EquipmentNesting({ equipmentItem, equipment, systems, objects, objectTypes, patchEquipment, onUpdateEquipment, onAddChildEquipment, onCreateMissingChildUnits, onSelectEquipment }: { equipmentItem: EquipmentEntity; equipment: EquipmentEntity[]; systems: SystemEntity[]; objects: InfrastructureObject[]; objectTypes: ObjectType[]; patchEquipment: (patch: Partial<EquipmentEntity>) => void; onUpdateEquipment: (id: string, patch: Partial<EquipmentEntity>) => void; onAddChildEquipment: (parentEquipmentId: string) => void; onCreateMissingChildUnits: (parentEquipmentId: string) => void; onSelectEquipment: (equipmentId: string) => void }) {
  const [selectedChildUnitIds, setSelectedChildUnitIds] = useState<Set<string>>(new Set());
  const blockedParentIds = new Set([equipmentItem.id, ...buildEquipmentDescendantIds(equipment, equipmentItem.id)]);
  const parentCandidates = equipment.filter((item) => !blockedParentIds.has(item.id) && item.systemId === equipmentItem.systemId);
  const children = equipment.filter((item) => item.parentEquipmentId === equipmentItem.id);
  const unitChildren = children.filter((item) => item.parameters.equipmentLevel === 'unit');
  const selectedUnitChildren = unitChildren.filter((child) => selectedChildUnitIds.has(child.id));
  const selectedCount = selectedUnitChildren.length;
  const allUnitsSelected = unitChildren.length > 0 && selectedCount === unitChildren.length;
  const targetQuantity = Math.max(0, Number(equipmentItem.quantity) || 0);
  const missingUnitCount = Math.max(targetQuantity - unitChildren.length, 0);
  const extraUnitCount = Math.max(unitChildren.length - targetQuantity, 0);
  const level = equipmentItem.parameters.equipmentLevel;
  const canGenerateUnits = (level === 'group' || level === 'model' || level === 'aggregate') && targetQuantity > 1;
  const parent = equipment.find((item) => item.id === equipmentItem.parentEquipmentId);
  const baseName = parameterTextValue(equipmentItem.parameters.inventoryNumber).trim() || equipmentItem.name;
  const systemMismatchCount = unitChildren.filter((child) => child.systemId !== equipmentItem.systemId).length;
  const placementMismatchCount = unitChildren.filter((child) => child.placementObjectId !== equipmentItem.placementObjectId).length;
  const typeMismatchCount = unitChildren.filter((child) => child.typeId !== equipmentItem.typeId).length;
  const hasSyncMismatch = systemMismatchCount > 0 || placementMismatchCount > 0 || typeMismatchCount > 0;
  const resetUnitSelection = () => setSelectedChildUnitIds(new Set());
  const toggleChildUnitSelection = (childId: string) => setSelectedChildUnitIds((prev) => { const next = new Set(prev); next.has(childId) ? next.delete(childId) : next.add(childId); return next; });
  const toggleAllChildUnits = () => setSelectedChildUnitIds((prev) => { const next = new Set(prev); unitChildren.forEach((child) => allUnitsSelected ? next.delete(child.id) : next.add(child.id)); return next; });
  const renameUnitsByTemplate = () => unitChildren.forEach((child, index) => onUpdateEquipment(child.id, { name: `${baseName} ${String(index + 1).padStart(3, '0')}` }));
  const syncUnitsWithParent = () => unitChildren.forEach((child) => onUpdateEquipment(child.id, { systemId: equipmentItem.systemId, placementObjectId: equipmentItem.placementObjectId, typeId: equipmentItem.typeId, quantity: 1, unit: 'шт.' }));
  const syncSelectedUnitsWithParent = () => { selectedUnitChildren.forEach((child) => onUpdateEquipment(child.id, { systemId: equipmentItem.systemId, placementObjectId: equipmentItem.placementObjectId, typeId: equipmentItem.typeId, quantity: 1, unit: 'шт.' })); resetUnitSelection(); };
  const renameSelectedUnitsByTemplate = () => { selectedUnitChildren.forEach((child, index) => onUpdateEquipment(child.id, { name: `${baseName} ${String(index + 1).padStart(3, '0')}` })); resetUnitSelection(); };
  const clearSelectedInventoryNumbers = () => { selectedUnitChildren.forEach((child) => onUpdateEquipment(child.id, { parameters: { ...child.parameters, inventoryNumber: '' } })); resetUnitSelection(); };
  const updateChildInventoryNumber = (child: EquipmentEntity, value: string) => onUpdateEquipment(child.id, { parameters: { ...child.parameters, inventoryNumber: value } });
  return <div className="parameter-section reference-table-section"><SectionTitle title="Вложенность оборудования" description="Родительское оборудование выбирается только здесь, а не шумит пустым полем в основной карточке." />{parent ? <div className="reference-fields-grid"><ReadOnlyField label="Система" value={getEquipmentSystemLabel(equipmentItem, systems)} /><ReadOnlyField label="Родительское оборудование" value={parent.name} /></div> : <div className="reference-fields-grid"><ReadOnlyField label="Система" value={getEquipmentSystemLabel(equipmentItem, systems)} />{canGenerateUnits ? <ReadOnlyField label="Количество по родителю" value={targetQuantity} /> : null}{canGenerateUnits ? <ReadOnlyField label="Создано единиц" value={`${unitChildren.length} из ${targetQuantity}`} /> : null}</div>}{canGenerateUnits && missingUnitCount === 0 && extraUnitCount === 0 ? <div className="empty-state"><h3>Количество заполнено</h3><p>Создано единиц: {unitChildren.length} из {targetQuantity}.</p></div> : null}{canGenerateUnits && extraUnitCount > 0 ? <div className="inline-warning"><b>Единиц больше, чем количество у родителя</b><p>Создано единиц: {unitChildren.length} из {targetQuantity}.</p></div> : null}{canGenerateUnits && missingUnitCount > 0 ? <button type="button" className="secondary-action" onClick={() => onCreateMissingChildUnits(equipmentItem.id)}>{unitChildren.length > 0 ? 'Создать недостающие единицы' : 'Создать единицы по количеству'}</button> : null}{unitChildren.length > 0 ? <div className="tech-card-row"><div className="inline-title"><b>Синхронизация с родителем</b>{hasSyncMismatch ? <button type="button" onClick={syncUnitsWithParent}>Синхронизировать дочерние unit с родителем</button> : null}</div><div className="reference-fields-grid"><ReadOnlyField label="Система родителя" value={getEquipmentSystemLabel(equipmentItem, systems)} /><ReadOnlyField label="Место размещения родителя" value={objectLabel(objects, equipmentItem.placementObjectId)} /><ReadOnlyField label="Вид оборудования родителя" value={typeLabel(objectTypes, equipmentItem.typeId)} /><ReadOnlyField label="Система отличается" value={systemMismatchCount} /><ReadOnlyField label="Место размещения отличается" value={placementMismatchCount} /><ReadOnlyField label="Вид оборудования отличается" value={typeMismatchCount} /></div>{hasSyncMismatch ? <div className="inline-warning"><b>Есть отличия дочерних единиц от родителя</b><p>Система отличается: {systemMismatchCount}; Место размещения отличается: {placementMismatchCount}; Вид оборудования отличается: {typeMismatchCount}.</p></div> : <div className="empty-state"><h3>Дочерние единицы соответствуют родителю</h3><p>systemId, placementObjectId и typeId совпадают с родителем.</p></div>}</div> : null}<RelationBlock title="Родительское оборудование" description="Выбор родителя формирует дерево состава. Самого себя и потомков выбрать нельзя." singleChoice actionLabel={equipmentItem.parentEquipmentId ? 'Изменить родителя' : 'Выбрать родителя'} emptyLabel="Родительское оборудование не выбрано" items={parentCandidates.map((item) => ({ id: item.id, label: `${item.name} · ${objectLabel(objects, item.placementObjectId)}`, checked: item.id === equipmentItem.parentEquipmentId }))} onToggle={(id) => patchEquipment({ parentEquipmentId: id })} onOpen={onSelectEquipment} /><button type="button" className="secondary-action" onClick={() => onAddChildEquipment(equipmentItem.id)}>Добавить составную часть</button>{unitChildren.length > 0 ? <div className="tech-card-row"><div className="inline-title"><b>Дочерние единицы</b><span>Выбрано: {selectedCount} из {unitChildren.length}</span><button type="button" onClick={renameUnitsByTemplate}>Переименовать по шаблону</button></div>{selectedCount > 0 ? <div className="relation-actions system-fast-actions"><button type="button" className="secondary-action" onClick={syncSelectedUnitsWithParent}>Синхронизировать выбранные с родителем</button><button type="button" className="secondary-action" onClick={renameSelectedUnitsByTemplate}>Переименовать выбранные по шаблону</button><button type="button" className="secondary-action" onClick={clearSelectedInventoryNumbers}>Очистить инвентарные номера выбранных</button></div> : null}<table className="reference-table child-unit-table"><thead><tr><th><input type="checkbox" checked={allUnitsSelected} onChange={toggleAllChildUnits} /></th><th>Наименование</th><th>Инвентарный номер</th><th>Система</th><th>Место размещения</th><th>Действие</th></tr></thead><tbody>{unitChildren.map((child) => <tr key={child.id}><td><input type="checkbox" checked={selectedChildUnitIds.has(child.id)} onChange={() => toggleChildUnitSelection(child.id)} /></td><td><input value={child.name} onChange={(event) => onUpdateEquipment(child.id, { name: event.target.value })} /></td><td><input value={parameterTextValue(child.parameters.inventoryNumber)} onChange={(event) => updateChildInventoryNumber(child, event.target.value)} /></td><td>{getEquipmentSystemLabel(child, systems)}</td><td>{objectLabel(objects, child.placementObjectId)}</td><td><button type="button" onClick={() => onSelectEquipment(child.id)}>Открыть</button></td></tr>)}</tbody></table></div> : null}{children.length === 0 ? <EmptyState title="Составных частей нет" description="Добавьте дочернее оборудование или оставьте элемент одиночной единицей учета." /> : null}{children.filter((child) => child.parameters.equipmentLevel !== 'unit').map((child) => <div className="tech-card-row" key={child.id}><div className="inline-title"><b>{child.name}</b><button type="button" onClick={() => onSelectEquipment(child.id)}>Открыть карточку</button></div><div className="reference-fields-grid"><ReadOnlyField label="Вид элемента" value={typeLabel(objectTypes, child.typeId)} /><ReadOnlyField label="Место размещения" value={objectLabel(objects, child.placementObjectId)} />{isAggregateEquipment(child, equipment) ? <ReadOnlyField label="Количество единиц" value={getEquipmentDisplayQuantity(child, equipment)} /> : null}</div></div>)}</div>;
}

function EquipmentTechCards({ equipmentItem, techCards, onSelectTechCard, onCreateTechCardForEquipment }: { equipmentItem: EquipmentEntity; techCards: TechCard[]; onSelectTechCard: (techCardId: string) => void; onCreateTechCardForEquipment: (equipmentId: string) => void }) {
  const cards = getApplicableTechCardsForEquipment(equipmentItem, techCards);
  return <div className="parameter-section reference-table-section"><SectionTitle title="Техкарты оборудования" description="Показываются техкарты, привязанные к конкретному оборудованию, и техкарты, применимые к виду оборудования." /><button type="button" className="secondary-action" onClick={() => onCreateTechCardForEquipment(equipmentItem.id)}>Создать техкарту для оборудования</button>{cards.length === 0 ? <EmptyState title="Техкарт нет" description="Создайте первую техкарту для оборудования или задайте техкарту для вида оборудования." /> : null}{cards.map((card) => <div className="tech-card-row" key={card.id}><div className="inline-title"><b>{card.name || 'Техкарта без наименования'}</b><button type="button" onClick={() => onSelectTechCard(card.id)}>Открыть техкарту</button></div><div className="reference-fields-grid"><ReadOnlyField label="Тип" value={card.type || 'Не задан'} /><ReadOnlyField label="Периодичность" value={card.periodicity || 'Не задана'} /><ReadOnlyField label="Минимальный интервал" value={card.minExecutionInterval || 'Не задан'} /><ReadOnlyField label="Активная" value={card.isActive ? 'Да' : 'Нет'} /></div></div>)}</div>;
}

function ServiceInfo({ equipmentItem, aggregate }: { equipmentItem: EquipmentEntity; aggregate: boolean }) {
  return <div className="service-info"><b>Служебные сведения</b><span>Идентификатор оборудования: {equipmentItem.id}</span><span>Идентификатор объекта размещения: {equipmentItem.placementObjectId || 'не задан'}</span>{equipmentItem.systemId ? <span>Идентификатор системы: {equipmentItem.systemId}</span> : null}<span>Количество: {aggregate ? equipmentItem.quantity : 1}</span></div>;
}
function EquipmentParameterInput({ parameter, value, onChange }: { parameter: ParameterDefinition; value: ParameterDefaultValue; onChange: (value: ParameterDefaultValue) => void }) { if (parameter.dataType === 'boolean') return <label className="boolean-row"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span>{parameter.name}</span></label>; return <label className="field-row"><span>{parameter.name}{parameter.required ? ' *' : ''}</span><input type={parameter.dataType === 'number' ? 'number' : parameter.dataType === 'date' ? 'date' : 'text'} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => onChange(normalizeEquipmentParameterInput(parameter, event.target.value))} /></label>; }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>; }
function ReadOnlyField({ label, value }: { label: string | number; value: string | number }) { return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>; }
function EditableField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: 'text' | 'number'; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>; }
