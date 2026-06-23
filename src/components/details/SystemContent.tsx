import type { EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity } from '../../types/nsi';
import {
  buildSystemDescendantIds,
  getSystemParameterValue,
  getSystemTypeParameters,
  getSystemWarnings,
  normalizeSystemParameterInput,
  systemScopeLabels,
  systemTabs,
} from '../../utils/nsiSystems';
import { RelationBlock } from '../relations/RelationBlock';

interface SystemContentProps {
  system: SystemEntity;
  systems: SystemEntity[];
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  equipment: EquipmentEntity[];
  activeTab: string;
  contextObjectId: string | null;
  onSetActiveTab: (tab: string) => void;
  onUpdateSystem: (id: string, patch: Partial<SystemEntity>) => void;
  onCreateSystemType: (systemId: string) => void;
  onAddEquipmentToSystem: (systemId: string) => void;
  onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onSelectSystem: (systemId: string) => void;
  onLinkSystemToContextObject: (systemId: string) => void;
  onLinkSystemToRoomsInContext: (systemId: string) => void;
}

const isRoomType = (objectTypes: ObjectType[], object: InfrastructureObject) => objectTypes.find((type) => type.id === object.typeId)?.code === 'ROOM';
const typeLabel = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не найден';
const objectLabel = (objects: InfrastructureObject[], objectId: string) => objects.find((object) => object.id === objectId)?.name ?? 'Не найдено';

export function SystemContent({ system, systems, objects, objectTypes, equipment, activeTab, contextObjectId, onSetActiveTab, onUpdateSystem, onCreateSystemType, onAddEquipmentToSystem, onDetachEquipmentFromSystem, onSelectEquipment, onSelectSystem, onLinkSystemToContextObject, onLinkSystemToRoomsInContext }: SystemContentProps) {
  const safeActiveTab = systemTabs.includes(activeTab) ? activeTab : 'Параметры';
  const warnings = getSystemWarnings(system, equipment);
  const patchSystem = (patch: Partial<SystemEntity>) => onUpdateSystem(system.id, patch);

  return (
    <div className="tech-card-editor system-card-editor">
      <div className="tabs system-tabs">{systemTabs.map((tab) => <button key={tab} type="button" className={tab === safeActiveTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}</div>
      {warnings.length > 0 ? <div className="inline-warning system-warning"><b>Предупреждения по системе</b><p>{warnings.join('; ')}</p></div> : null}
      {safeActiveTab === 'Параметры' ? <SystemParameters system={system} systems={systems} objectTypes={objectTypes} patchSystem={patchSystem} onCreateSystemType={onCreateSystemType} /> : null}
      {safeActiveTab === 'Связи' ? <SystemRelations system={system} objects={objects} objectTypes={objectTypes} contextObjectId={contextObjectId} patchSystem={patchSystem} onLinkSystemToContextObject={onLinkSystemToContextObject} onLinkSystemToRoomsInContext={onLinkSystemToRoomsInContext} /> : null}
      {safeActiveTab === 'Оборудование' ? <SystemEquipment system={system} objects={objects} objectTypes={objectTypes} equipment={equipment} onAddEquipmentToSystem={onAddEquipmentToSystem} onDetachEquipmentFromSystem={onDetachEquipmentFromSystem} onSelectEquipment={onSelectEquipment} /> : null}
      {safeActiveTab === 'Документы' || safeActiveTab === 'Заметки' ? <div className="stub-tab"><h3>{safeActiveTab}</h3><p>Заглушка карточки системы. Детальная логика будет подключаться отдельным этапом.</p></div> : null}
      {systems.filter((item) => item.parentSystemId === system.id).length > 0 ? <div className="parameter-section system-children-block"><SectionTitle title="Дочерние системы" description="Вложенность систем хранится через parentSystemId. Перенос дерева систем пока не включен в левое меню." /><div className="check-list">{systems.filter((item) => item.parentSystemId === system.id).map((child) => <label key={child.id} className="relation-check-row"><span>{child.name}</span><button type="button" onClick={() => onSelectSystem(child.id)}>Открыть</button></label>)}</div></div> : null}
    </div>
  );
}

function SystemParameters({ system, systems, objectTypes, patchSystem, onCreateSystemType }: { system: SystemEntity; systems: SystemEntity[]; objectTypes: ObjectType[]; patchSystem: (patch: Partial<SystemEntity>) => void; onCreateSystemType: (systemId: string) => void }) {
  const systemType = objectTypes.find((type) => type.id === system.typeId);
  const blockedParentIds = new Set([system.id, ...buildSystemDescendantIds(systems, system.id)]);
  const parentSystemOptions = [{ value: '', label: 'Нет родительской системы' }, ...systems.filter((item) => !blockedParentIds.has(item.id)).map((item) => ({ value: item.id, label: item.name }))];
  const systemTypeParameters = getSystemTypeParameters(systemType);
  const updateSystemParameterValue = (parameter: ParameterDefinition, value: ParameterDefaultValue) => patchSystem({ parameters: { ...system.parameters, [parameter.code]: value } });
  return <div className="parameter-section reference-table-section"><SectionTitle title="Параметры системы" description="Система является отдельной сущностью и может быть привязана к любому уровню дерева объектов." /><div className="reference-fields-grid"><ReadOnlyField label="Идентификатор" value={system.id} /><EditableField label="Наименование" value={system.name} onChange={(value) => patchSystem({ name: value })} /><SelectField label="Вид системы" value={system.typeId} options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))} onChange={(value) => patchSystem({ typeId: value })} /><SelectField label="Родительская система" value={system.parentSystemId ?? ''} options={parentSystemOptions} onChange={(value) => patchSystem({ parentSystemId: value || null })} /><SelectField label="Область применения" value={system.scopeType} options={Object.entries(systemScopeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => patchSystem({ scopeType: value as SystemEntity['scopeType'] })} /><EditableField label="Количество" type="number" value={system.quantity} onChange={(value) => patchSystem({ quantity: Number(value) || 1 })} /><EditableField label="Единица измерения" value={system.unit} onChange={(value) => patchSystem({ unit: value })} /></div><button type="button" className="secondary-action" onClick={() => onCreateSystemType(system.id)}>Создать новый вид системы</button><div className="dynamic-parameter-list"><div className="inline-title"><b>Параметры по виду системы</b><small>{systemType?.name ?? 'Вид не найден'}</small></div>{systemTypeParameters.length > 0 ? systemTypeParameters.map((parameter) => <SystemParameterInput key={parameter.id} parameter={parameter} value={getSystemParameterValue(system, parameter)} onChange={(value) => updateSystemParameterValue(parameter, value)} />) : <EmptyState title="Параметров вида системы нет" description="Добавьте параметры в Дереве видов объектов или создайте новый вид системы." />}</div></div>;
}

function SystemRelations({ system, objects, objectTypes, contextObjectId, patchSystem, onLinkSystemToContextObject, onLinkSystemToRoomsInContext }: { system: SystemEntity; objects: InfrastructureObject[]; objectTypes: ObjectType[]; contextObjectId: string | null; patchSystem: (patch: Partial<SystemEntity>) => void; onLinkSystemToContextObject: (systemId: string) => void; onLinkSystemToRoomsInContext: (systemId: string) => void }) {
  const roomObjects = objects.filter((object) => isRoomType(objectTypes, object));
  const contextObject = contextObjectId ? objects.find((object) => object.id === contextObjectId) : null;
  return <div className="parameter-section reference-table-section"><SectionTitle title="Связи системы" description="Связи редактируются чекбоксами. Глобальная система не дублируется вниз, а считается применимой к выбранной области." /><div className="reference-fields-grid"><SelectField label="Область применения" value={system.scopeType} options={Object.entries(systemScopeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => patchSystem({ scopeType: value as SystemEntity['scopeType'] })} /><ReadOnlyField label="Контекстный объект" value={contextObject?.name ?? 'Не выбран'} /></div><div className="relation-actions system-fast-actions"><button type="button" disabled={!contextObjectId} onClick={() => onLinkSystemToContextObject(system.id)}>Привязать к выбранному объекту</button><button type="button" disabled={!contextObjectId} onClick={() => onLinkSystemToRoomsInContext(system.id)}>Привязать ко всем помещениям выбранного уровня</button></div><RelationBlock title="Связанные объекты" description="scopeObjectIds: область действия системы на уровне объекта, этажа, зоны или другого узла дерева." items={objects.map((object) => ({ id: object.id, label: `${object.name} · ${typeLabel(objectTypes, object.typeId)}`, checked: system.scopeObjectIds.includes(object.id) }))} onToggle={(objectId) => patchSystem({ scopeObjectIds: toggleId(system.scopeObjectIds, objectId) })} /><RelationBlock title="Связанные помещения" description="linkedRoomIds: помещения, в которых система явно применяется." items={roomObjects.map((object) => ({ id: object.id, label: `${object.name} · ${object.area ?? 'без площади'} м²`, checked: system.linkedRoomIds.includes(object.id) }))} onToggle={(roomId) => patchSystem({ linkedRoomIds: toggleId(system.linkedRoomIds, roomId) })} /></div>;
}

function SystemEquipment({ system, objects, objectTypes, equipment, onAddEquipmentToSystem, onDetachEquipmentFromSystem, onSelectEquipment }: { system: SystemEntity; objects: InfrastructureObject[]; objectTypes: ObjectType[]; equipment: EquipmentEntity[]; onAddEquipmentToSystem: (systemId: string) => void; onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void; onSelectEquipment: (equipmentId: string) => void }) {
  const systemEquipment = equipment.filter((item) => item.systemId === system.id || system.equipmentIds.includes(item.id));
  return <div className="parameter-section reference-table-section"><SectionTitle title="Оборудование системы" description="Оборудование является отдельной сущностью. Здесь можно создать оборудование, открыть полную карточку, увидеть размещение и вложенность." /><button type="button" className="secondary-action" onClick={() => onAddEquipmentToSystem(system.id)}>Добавить оборудование в систему</button>{systemEquipment.length === 0 ? <EmptyState title="Оборудование не добавлено" description="Добавьте первое оборудование в систему или оставьте список пустым для верхнего уровня системы." /> : null}{systemEquipment.map((item) => { const children = equipment.filter((child) => child.parentEquipmentId === item.id); return <div className="tech-card-row" key={item.id}><div className="inline-title"><b>{item.name}</b><div className="row-actions-inline"><button type="button" onClick={() => onSelectEquipment(item.id)}>Открыть карточку</button><button type="button" onClick={() => onDetachEquipmentFromSystem(system.id, item.id)}>Отвязать</button></div></div><div className="reference-fields-grid"><ReadOnlyField label="Вид оборудования" value={typeLabel(objectTypes, item.typeId)} /><ReadOnlyField label="Место размещения" value={objectLabel(objects, item.placementObjectId)} /><ReadOnlyField label="Количество" value={item.quantity} /><ReadOnlyField label="Единица измерения" value={item.unit} /><ReadOnlyField label="Дочернего оборудования" value={children.length} /></div></div>; })}</div>;
}

function SystemParameterInput({ parameter, value, onChange }: { parameter: ParameterDefinition; value: ParameterDefaultValue; onChange: (value: ParameterDefaultValue) => void }) { if (parameter.dataType === 'boolean') return <label className="boolean-row"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span>{parameter.name}</span></label>; return <label className="field-row"><span>{parameter.name}{parameter.required ? ' *' : ''}</span><input type={parameter.dataType === 'number' ? 'number' : parameter.dataType === 'date' ? 'date' : 'text'} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => onChange(normalizeSystemParameterInput(parameter, event.target.value))} /></label>; }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>; }
function ReadOnlyField({ label, value }: { label: string; value: string | number }) { return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>; }
function EditableField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: 'text' | 'number'; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>; }
function toggleId(ids: string[], id: string) { return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]; }
