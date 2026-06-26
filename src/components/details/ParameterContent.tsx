import { useState } from 'react';
import type {
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ObjectStatus,
  ObjectType,
  ParameterDataType,
  ParameterDefaultValue,
  ParameterDefinition,
  ParameterGroupId,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
import { buildDescendantIds, buildObjectTypeDescendantIds, isRoomType } from '../../utils/nsiTree';
import { getEquipmentDisplayQuantity, isAggregateEquipment } from '../../utils/nsiEquipment';
import {
  collectRequiredParameterWarnings,
  coreObjectFieldCodes,
  formatParameterValue,
  getAdditionalObjectTypeParameters,
  getMainObjectTypeParameters,
  getObjectParameterValue,
  isEmptyParameterValue,
  normalizeParameterInput,
} from '../../utils/nsiObjectParameters';
import { getDetailStatusLabel, getObjectDetailInfo } from '../../utils/nsiObjectTemplates';
import { getSystemEquipment, systemScopeLabels } from '../../utils/nsiSystems';
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
  onSelectSystem: (systemId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

const typeLabel = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не найден';
const systemLabel = (systems: SystemEntity[], systemId: string) => systems.find((system) => system.id === systemId)?.name ?? 'Не входит в систему';

function hasEquipmentChildren(equipment: EquipmentEntity[], equipmentId: string) {
  return equipment.some((item) => item.parentEquipmentId === equipmentId);
}

function isRoomVisibleEquipment(item: EquipmentEntity, equipment: EquipmentEntity[]) {
  const level = item.parameters.equipmentLevel;
  const hasChildren = hasEquipmentChildren(equipment, item.id);

  if (hasChildren) return false;
  if (level !== 'unit') return false;

  return true;
}

const equipmentLabel = (item: EquipmentEntity, equipment: EquipmentEntity[], systems: SystemEntity[], objectTypes: ObjectType[]) => {
  const quantity = isAggregateEquipment(item, equipment) ? ` · ед. ${getEquipmentDisplayQuantity(item, equipment)}` : '';
  return `${item.name} · ${typeLabel(objectTypes, item.typeId)} · ${systemLabel(systems, item.systemId)}${quantity}`;
};

function getAncestorIds(objects: InfrastructureObject[], objectId: string) {
  const result: string[] = [];
  let current = objects.find((object) => object.id === objectId);
  const visited = new Set<string>();
  while (current?.parentId) {
    if (visited.has(current.parentId)) break;
    visited.add(current.parentId);
    result.push(current.parentId);
    current = objects.find((object) => object.id === current?.parentId);
  }
  return result;
}

function getInheritedSystemsForObject(objects: InfrastructureObject[], systems: SystemEntity[], object: InfrastructureObject) {
  const ancestorIds = getAncestorIds(objects, object.id);
  const directIds = new Set(systems.filter((system) => system.scopeObjectIds.includes(object.id) || system.linkedRoomIds.includes(object.id) || (system.scopeType === 'wholeObject' && object.parentId === null)).map((system) => system.id));
  return systems.filter((system) => {
    if (directIds.has(system.id)) return false;
    if (system.scopeType === 'wholeObject') return ancestorIds.some((ancestorId) => objects.find((item) => item.id === ancestorId)?.parentId === null);
    return system.scopeObjectIds.some((id) => ancestorIds.includes(id)) || system.linkedRoomIds.some((id) => ancestorIds.includes(id));
  });
}

export function ParameterContent({
  selectedRef,
  selectedEntity,
  objects,
  objectTypes,
  systems,
  equipment,
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
  onBulkLinkRoomsToSystem,
  onSelectSystem,
  onSelectEquipment,
}: ParameterContentProps) {
  const [selectedObjectTypeGroupId, setSelectedObjectTypeGroupId] = useState('');

  if (!selectedEntity) return <EmptyState title="Элемент не выбран" description="Выберите строку в центральном дереве." />;

  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;

    const objectType = objectTypes.find((type) => type.id === object.typeId);
    const descendantIds = new Set([object.id, ...buildDescendantIds(objects, object.id)]);
    const parentOptions = [{ value: '', label: 'Нет родительского объекта' }, ...objects.filter((item) => !descendantIds.has(item.id)).map((item) => ({ value: item.id, label: item.name }))];
    const roomsInBranch = objects.filter((item) => descendantIds.has(item.id) && isRoomType(item.typeId, objectTypes));
    const linkedSystems = systems.filter((system) => system.scopeObjectIds.includes(object.id) || system.linkedRoomIds.includes(object.id));
    const inheritedSystems = getInheritedSystemsForObject(objects, systems, object);
    const roomEquipmentItems = equipment.filter((item) => isRoomVisibleEquipment(item, equipment));
    const placedEquipment = equipment.filter(
      (item) => item.placementObjectId === object.id && isRoomVisibleEquipment(item, equipment)
    );
    const requiredWarnings = collectRequiredParameterWarnings(object, objectType);
    const mainTypeParameters = getMainObjectTypeParameters(objectType);
    const additionalTypeParameters = getAdditionalObjectTypeParameters(objectType);
    const definedParameterCodes = new Set(objectType?.parameters.map((parameter) => parameter.code) ?? []);
    const serviceParameterCodes = new Set(['detailLevel', 'templateId', 'templateName']);
    const orphanParameters = Object.entries(object.parameters).filter(([code, value]) => !definedParameterCodes.has(code) && !serviceParameterCodes.has(code) && value !== null && value !== '');
    const detailInfo = getObjectDetailInfo(objects, object.id);
    const detailStatus = getDetailStatusLabel(objects, object.id);
    const isRootObject = object.parentId === null;
    const isRoom = isRoomType(object.typeId, objectTypes);

    const updateObjectParameterValue = (parameter: ParameterDefinition, value: ParameterDefaultValue) => {
      if (coreObjectFieldCodes.has(parameter.code)) return;
      onUpdateObject(object.id, { parameters: { ...object.parameters, [parameter.code]: value } });
    };

    const inheritedSystemsBlock = inheritedSystems.length > 0 ? (
      <div className="relation-selected-table inherited-systems-card">
        <div className="relation-empty-row">Наследуется систем: {inheritedSystems.length}</div>
        {inheritedSystems.map((system) => (
          <div className="relation-selected-row" key={system.id}>
            <span>{system.name} · {systemScopeLabels[system.scopeType]} · обор. {getSystemEquipment(system, equipment).length}</span>
            <button type="button" onClick={() => onSelectSystem(system.id)}>Открыть</button>
          </div>
        ))}
      </div>
    ) : null;

    return (
      <div className="parameter-sections-stack">
        <section className="parameter-section">
          <SectionTitle title="Основные данные" description="Основные поля объекта учета показываются всегда. Описание помогает не зашивать контекст в название строки дерева." />
          {requiredWarnings.length > 0 ? <div className="inline-warning"><b>Есть обязательные незаполненные параметры</b><p>{requiredWarnings.join('; ')}</p></div> : null}
          <div className="reference-fields-grid">
            <EditableField label="Наименование" value={object.name} onChange={(value) => onUpdateObject(object.id, { name: value })} />
            <EditableField label="Описание" value={object.description ?? ''} onChange={(value) => onUpdateObject(object.id, { description: value || undefined })} />
            <EditableField label="Сокращение" value={object.shortName} onChange={(value) => onUpdateObject(object.id, { shortName: value })} />
            <SelectField label="Вид элемента" value={object.typeId} options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))} onChange={(value) => onUpdateObject(object.id, { typeId: value })} />
            <EditableField label="Площадь" value={object.area ?? ''} type="number" onChange={(value) => onUpdateObject(object.id, { area: value === '' ? null : Number(value) })} />
            <EditableField label="Количество" value={object.quantity} type="number" onChange={(value) => onUpdateObject(object.id, { quantity: Number(value) })} />
            <EditableField label="Единица измерения" value={object.unit} onChange={(value) => onUpdateObject(object.id, { unit: value })} />
            <SelectField label="Статус" value={object.status} options={[{ value: 'active', label: 'На учете' }, { value: 'retired', label: 'Снят с учета' }]} onChange={(value) => onUpdateObject(object.id, { status: value as ObjectStatus })} />
          </div>
        </section>

        <section className="parameter-section">
          <SectionTitle title="Иерархия и размещение" description="Положение элемента внутри дерева объектов." />
          <div className="reference-fields-grid">
            <SelectField label="Родительский объект" value={object.parentId ?? ''} options={parentOptions} onChange={(value) => onUpdateObject(object.id, { parentId: value || null })} />
            {isRootObject ? <EditableField label="Уровень детализации" value={detailInfo.detailLevel} type="number" onChange={(value) => onUpdateObject(object.id, { parameters: { ...object.parameters, detailLevel: Math.max(1, Number(value) || 1) } })} /> : null}
            <ReadOnlyField label="Уровень объекта" value={detailInfo.objectLevel} />
            <ReadOnlyField label="Детализация начинается с уровня" value={detailInfo.detailLevel} />
            <ReadOnlyField label="Статус детализации" value={detailStatus} />
          </div>
        </section>

        <section className="parameter-section">
          <SectionTitle title="Параметры по виду" description={`Динамические параметры вида: ${objectType?.name ?? 'вид не найден'}.`} />
          <div className="dynamic-parameter-list">
            {[...mainTypeParameters, ...additionalTypeParameters].length > 0 ? [...mainTypeParameters, ...additionalTypeParameters].map((parameter) => (
              <ObjectParameterInput key={parameter.id} parameter={parameter} value={getObjectParameterValue(object, parameter)} onChange={(value) => updateObjectParameterValue(parameter, value)} />
            )) : <EmptyState title="Параметров по виду нет" description="Добавьте параметры в Дереве видов объектов или выберите другой вид." />}
          </div>
        </section>

        {isRoom ? (
          <section className="parameter-section">
            <SectionTitle title="Связанные системы" description="В дереве показывается только счетчик наследования, полный список находится в карточке." />
            {inheritedSystemsBlock}
            <RelationBlock
              title="Системы помещения"
              description="Собственные связи помещения с системами."
              actionLabel="Добавить систему"
              items={systems.map((system) => ({
                id: system.id,
                label: `${system.name} · ${systemScopeLabels[system.scopeType]} · обор. ${getSystemEquipment(system, equipment).length}`,
                checked: system.linkedRoomIds.includes(object.id) || system.scopeObjectIds.includes(object.id),
              }))}
              onToggle={(id) => onToggleObjectSystemLink(object.id, id)}
              onOpen={onSelectSystem}
            />
          </section>
        ) : null}

        {isRoom ? (
          <section className="parameter-section">
            <SectionTitle title="Оборудование в помещении" description="Показываются только конкретные единицы оборудования, размещенные в этом помещении." />
            <RelationBlock
              title="Оборудование помещения"
              description="Агрегаты и группы с дочерними единицами показываются в системе, а не как отдельные строки помещения."
              actionLabel="Добавить оборудование"
              emptyLabel="В помещении нет оборудования"
              items={roomEquipmentItems.map((item) => ({
                id: item.id,
                label: equipmentLabel(item, equipment, systems, objectTypes),
                checked: placedEquipment.some((linkedItem) => linkedItem.id === item.id),
              }))}
              onToggle={(id) => onToggleEquipmentPlacement(object.id, id)}
              onOpen={onSelectEquipment}
            />
          </section>
        ) : null}

        {!isRoom ? (
          <section className="parameter-section">
            <SectionTitle title="Связанные системы" description="Для этажей, зон и корневых объектов показываются собственные системы, а наследуемые системы вынесены в компактный список карточки." />
            {inheritedSystemsBlock}
            <RelationBlock
              title="Системы объекта"
              description="Система может действовать на уровне объекта, этажа или зоны."
              actionLabel="Связать систему"
              items={systems.map((system) => ({
                id: system.id,
                label: `${system.name} · ${systemScopeLabels[system.scopeType]} · обор. ${getSystemEquipment(system, equipment).length}`,
                checked: linkedSystems.some((linkedSystem) => linkedSystem.id === system.id),
              }))}
              onToggle={(id) => onToggleObjectSystemLink(object.id, id)}
              onOpen={onSelectSystem}
            />
            <div className="bulk-panel">
              <b>Массовая привязка</b>
              <p>Для выбранного объекта можно привязать первую систему ко всем помещениям ветки.</p>
              <button type="button" disabled={!systems[0] || roomsInBranch.length === 0} onClick={() => systems[0] && onBulkLinkRoomsToSystem(systems[0].id, roomsInBranch.map((room) => room.id))}>Привязать первую систему ко всем помещениям</button>
            </div>
          </section>
        ) : null}

        <section className="parameter-section service-section">
          <SectionTitle title="Служебные сведения" description="Технические идентификаторы скрыты из основных полей и собраны отдельно." />
          <InfoGrid items={[{ label: 'Идентификатор объекта', value: object.id }, { label: 'Идентификатор вида элемента', value: object.typeId }, { label: 'Идентификатор родительского объекта', value: object.parentId ?? 'Нет' }, { label: 'Корневой объект', value: detailInfo.rootObjectId }]} />
          {orphanParameters.length > 0 ? <KeyValueList rows={orphanParameters.map(([label, value]) => ({ label, value }))} /> : null}
        </section>
      </div>
    );
  }

  if (selectedRef.kind === 'objectType') {
    const type = objectTypes.find((item) => item.id === selectedRef.id);
    if (!type) return null;
    const parent = objectTypes.find((item) => item.id === type.parentTypeId);
    const blockedParentIds = new Set([type.id, ...buildObjectTypeDescendantIds(objectTypes, type.id)]);
    const parentOptions = [{ value: '', label: 'Нет родительского вида' }, ...objectTypes.filter((item) => !blockedParentIds.has(item.id)).map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` }))];
    const firstGroupId = type.parameterGroups[0]?.id ?? '';
    const activeObjectTypeGroupId = type.parameterGroups.some((group) => group.id === selectedObjectTypeGroupId) ? selectedObjectTypeGroupId : firstGroupId;
    const activeGroup = type.parameterGroups.find((group) => group.id === activeObjectTypeGroupId);
    const groupParameters = activeGroup ? type.parameters.filter((parameter) => activeGroup.parameterIds.includes(parameter.id)) : [];

    return (
      <div className="parameter-sections-stack">
        <section className="parameter-section">
          <SectionTitle title="Основные данные вида" description="Вид элемента является универсальным шаблоном для объектов, систем и оборудования." />
          <div className="reference-fields-grid">
            <EditableField label="Наименование" value={type.name} onChange={(value) => onUpdateObjectType(type.id, { name: value })} />
            <EditableField label="Код" value={type.code} onChange={(value) => onUpdateObjectType(type.id, { code: value })} />
            <EditableField label="Сокращение" value={type.shortName} onChange={(value) => onUpdateObjectType(type.id, { shortName: value })} />
            <EditableField label="Иконка" value={type.icon} onChange={(value) => onUpdateObjectType(type.id, { icon: value })} />
            <SelectField label="Родительский вид" value={type.parentTypeId ?? ''} options={parentOptions} onChange={(value) => onUpdateObjectType(type.id, { parentTypeId: value || null })} />
          </div>
          <InfoGrid items={[{ label: 'Родительский вид', value: parent?.name ?? 'Нет' }, { label: 'Дочерних видов', value: objectTypes.filter((item) => item.parentTypeId === type.id).length }, { label: 'Допустимых дочерних видов', value: type.allowedChildTypeIds.length }]} />
        </section>

        <section className="parameter-section">
          <SectionTitle title="Правила создания" description="Допустимые дочерние виды выбираются через поисковое добавление, без большой checkbox-простыни." />
          <div className="reference-fields-grid">
            <CheckboxField label="Можно создавать объекты этого вида" checked={type.canCreateObjects} onChange={(checked) => onUpdateObjectType(type.id, { canCreateObjects: checked })} />
            <CheckboxField label="Можно редактировать объекты этого вида" checked={type.canEditObjects} onChange={(checked) => onUpdateObjectType(type.id, { canEditObjects: checked })} />
            <CheckboxField label="Можно снимать объекты этого вида с учета" checked={type.canRetireObjects} onChange={(checked) => onUpdateObjectType(type.id, { canRetireObjects: checked })} />
          </div>
          <RelationBlock
            title="Допустимые дочерние виды"
            description="Эти связи задают шаблон создания дочерних элементов."
            actionLabel="Добавить вид"
            items={objectTypes.filter((item) => item.id !== type.id).map((item) => ({ id: item.id, label: `${item.icon} ${item.name}`, checked: type.allowedChildTypeIds.includes(item.id) }))}
            onToggle={(childTypeId) => onToggleAllowedChildType(type.id, childTypeId)}
          />
        </section>

        <section className="parameter-section">
          <SectionTitle title="Параметры по виду" description="Группы параметров остаются справочником настройки вида." />
          <div className="type-parameters-layout">
            <div className="type-group-list">
              <div className="inline-title"><b>Группы параметров</b><button type="button" onClick={() => onAddParameterGroup(type.id)}>Добавить группу</button></div>
              {type.parameterGroups.map((group) => (
                <button key={group.id} type="button" className={group.id === activeObjectTypeGroupId ? 'type-group-row active' : 'type-group-row'} onClick={() => setSelectedObjectTypeGroupId(group.id)}>
                  <span>{group.name}</span>
                  <small>{group.parameterIds.length} параметров</small>
                </button>
              ))}
            </div>
            <div className="type-parameter-editor">
              {activeGroup ? (
                <>
                  <EditableField label="Название группы" value={activeGroup.name} onChange={(value) => onRenameParameterGroup(type.id, activeGroup.id, value)} />
                  <div className="inline-title"><b>Параметры группы</b><button type="button" onClick={() => onAddParameterToGroup(type.id, activeGroup.id)}>Добавить параметр</button></div>
                  {groupParameters.length === 0 ? <EmptyState title="Параметров нет" description="Добавьте первый параметр для выбранной группы." /> : null}
                  {groupParameters.map((parameter) => <ParameterEditor key={parameter.id} parameter={parameter} onUpdate={(patch) => onUpdateParameter(type.id, parameter.id, patch)} onDelete={() => onDeleteParameter(type.id, parameter.id)} />)}
                </>
              ) : <EmptyState title="Группа не выбрана" description="Добавьте или выберите группу параметров." />}
            </div>
          </div>
        </section>

        <section className="parameter-section service-section">
          <SectionTitle title="Служебные сведения" description="Технические идентификаторы вынесены из основных полей." />
          <InfoGrid items={[{ label: 'Идентификатор вида элемента', value: type.id }, { label: 'Идентификатор родительского вида', value: type.parentTypeId ?? 'Нет' }]} />
        </section>
      </div>
    );
  }

  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  if (!dictionary) return null;
  const parent = dictionaries.find((item) => item.id === dictionary.parentId);
  const children = dictionaries.filter((item) => item.parentId === dictionary.id);
  return (
    <div className="parameter-sections-stack">
      <section className="parameter-section">
        <SectionTitle title="Основные данные справочника" description="Минимальный каркас для единиц измерения, видов работ, дефектов, персонала и материалов." />
        <div className="reference-fields-grid">
          <ReadOnlyField label="Наименование" value={dictionary.title} />
          <ReadOnlyField label="Код" value={dictionary.code} />
          <ReadOnlyField label="Описание" value={dictionary.description} />
        </div>
      </section>
      <section className="parameter-section">
        <SectionTitle title="Иерархия справочника" description="Родитель и дочерние записи." />
        <InfoGrid items={[{ label: 'Родитель', value: parent?.title ?? 'Нет' }, { label: 'Дочерних записей', value: children.length }, { label: 'Идентификатор записи', value: dictionary.id }]} />
      </section>
    </div>
  );
}

function ObjectParameterInput({ parameter, value, onChange }: { parameter: ParameterDefinition; value: ParameterDefaultValue; onChange: (value: ParameterDefaultValue) => void }) {
  const isRequiredEmpty = parameter.required && isEmptyParameterValue(value);
  if (parameter.dataType === 'boolean') {
    return (
      <div className={isRequiredEmpty ? 'object-parameter-field warning-field' : 'object-parameter-field'}>
        <CheckboxField label={`${parameter.name}${parameter.unit ? `, ${parameter.unit}` : ''}`} checked={Boolean(value)} onChange={(checked) => onChange(checked)} />
        {isRequiredEmpty ? <small>Обязательный параметр не заполнен</small> : null}
      </div>
    );
  }
  const inputType = parameter.dataType === 'number' ? 'number' : parameter.dataType === 'date' ? 'date' : 'text';
  return (
    <label className={isRequiredEmpty ? 'field-row warning-field' : 'field-row'}>
      <span>{parameter.name}{parameter.unit ? `, ${parameter.unit}` : ''}</span>
      <input type={inputType} value={String(value ?? '')} placeholder={String(parameter.defaultValue ?? '')} onChange={(event) => onChange(normalizeParameterInput(parameter, event.target.value))} />
      {isRequiredEmpty ? <small>Обязательный параметр не заполнен</small> : null}
    </label>
  );
}

function ParameterEditor({ parameter, onUpdate, onDelete }: { parameter: ParameterDefinition; onUpdate: (patch: Partial<ParameterDefinition>) => void; onDelete: () => void }) {
  return (
    <div className="parameter-definition-card">
      <div className="inline-title"><b>{parameter.name || 'Новый параметр'}</b><button type="button" onClick={onDelete}>Удалить параметр</button></div>
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

function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>; }
function EditableField({ label, value, type = 'text', readOnly = false, onChange }: { label: string; value: string | number; type?: 'text' | 'number'; readOnly?: boolean; onChange?: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input type={type} value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="boolean-row"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }
function ReadOnlyField({ label, value }: { label: string | number; value: string | number }) { return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>; }
function InfoGrid({ items }: { items: Array<{ label: string; value: string | number }> }) { return <div className="info-grid">{items.map((item) => <div className="info-card" key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div>; }
function KeyValueList({ rows }: { rows: Array<{ label: string; value: string | number | boolean | null }> }) { const visibleRows = rows.filter((row) => row.value !== null && row.value !== '' && row.value !== 'Не заполнено'); if (visibleRows.length === 0) return null; return <div className="key-value-list">{visibleRows.map((row) => <div key={row.label} className="key-value-row"><span>{row.label}</span><b>{formatParameterValue(row.value)}</b></div>)}</div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>; }
