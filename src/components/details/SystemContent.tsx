import type { CreateEntityKind, EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity } from '../../types/nsi';
import { buildSystemDescendantIds, getSystemEquipment, getSystemParameterValue, getSystemTypeParameters, getSystemWarnings, normalizeSystemParameterInput, systemScopeLabels, systemTabs } from '../../utils/nsiSystems';
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
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => void;
  onLinkSystemToContextObject: (systemId: string) => void;
  onLinkSystemToRoomsInContext: (systemId: string) => void;
}

const isRoomType = (objectTypes: ObjectType[], object: InfrastructureObject) => objectTypes.find((type) => type.id === object.typeId)?.code === 'ROOM';
const typeLabel = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не найден';
const objectLabel = (objects: InfrastructureObject[], objectId: string) => objects.find((object) => object.id === objectId)?.name ?? 'Не найдено';
const toggleId = (ids: string[], id: string) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

interface NextActionPanelProps {
  title: string;
  hint: string;
  actions: Array<{ label: string; disabled?: boolean; onClick: () => void }>;
}

interface SystemParametersProps {
  system: SystemEntity;
  systems: SystemEntity[];
  objectTypes: ObjectType[];
  equipment: EquipmentEntity[];
  patchSystem: (patch: Partial<SystemEntity>) => void;
  onCreateSystemType: (systemId: string) => void;
}

interface SystemRelationsProps {
  system: SystemEntity;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  contextObjectId: string | null;
  patchSystem: (patch: Partial<SystemEntity>) => void;
  onLinkSystemToContextObject: (systemId: string) => void;
  onLinkSystemToRoomsInContext: (systemId: string) => void;
}

interface SystemEquipmentProps {
  system: SystemEntity;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  equipment: EquipmentEntity[];
  onAddEquipmentToSystem: (systemId: string) => void;
  onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
}

interface EquipmentTreeNodeProps {
  item: EquipmentEntity;
  allEquipment: EquipmentEntity[];
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  level: number;
  onDetachEquipmentFromSystem: (equipmentId: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
}

export function SystemContent({ system, systems, objects, objectTypes, equipment, activeTab, contextObjectId, onSetActiveTab, onUpdateSystem, onCreateSystemType, onAddEquipmentToSystem, onDetachEquipmentFromSystem, onSelectEquipment, onSelectSystem, onCreate, onLinkSystemToContextObject, onLinkSystemToRoomsInContext }: SystemContentProps) {
  const safeActiveTab = systemTabs.includes(activeTab) ? activeTab : 'Параметры';
  const warnings = getSystemWarnings(system, equipment);
  const patchSystem = (patch: Partial<SystemEntity>) => onUpdateSystem(system.id, patch);
  const contextObject = contextObjectId ? objects.find((object) => object.id === contextObjectId) : null;

  return (
    <div className="tech-card-editor system-card-editor">
      <div className="tabs system-tabs">
        {systemTabs.map((tab) => <button key={tab} type="button" className={tab === safeActiveTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}
      </div>

      <NextActionPanel
        title="Дальше"
        hint={contextObject ? `Контекст: ${contextObject.name}` : 'Выберите объект в дереве для создания на уровне.'}
        actions={[
          { label: 'Создать еще', disabled: !contextObjectId, onClick: () => contextObjectId && onCreate('system', contextObjectId) },
          { label: 'Добавить оборудование', onClick: () => onAddEquipmentToSystem(system.id) },
          { label: 'Перейти к системе', onClick: () => onSetActiveTab('Параметры') },
          { label: 'Добавить помещение на этом уровне', disabled: !contextObjectId, onClick: () => contextObjectId && onCreate('room', contextObjectId) },
        ]}
      />

      {warnings.length > 0 ? <div className="inline-warning system-warning"><b>Предупреждения по системе</b><p>{warnings.join('; ')}</p></div> : null}
      {safeActiveTab === 'Параметры' ? <SystemParameters system={system} systems={systems} objectTypes={objectTypes} equipment={equipment} patchSystem={patchSystem} onCreateSystemType={onCreateSystemType} /> : null}
      {safeActiveTab === 'Связи' ? <SystemRelations system={system} objects={objects} objectTypes={objectTypes} contextObjectId={contextObjectId} patchSystem={patchSystem} onLinkSystemToContextObject={onLinkSystemToContextObject} onLinkSystemToRoomsInContext={onLinkSystemToRoomsInContext} /> : null}
      {safeActiveTab === 'Оборудование' ? <SystemEquipment system={system} objects={objects} objectTypes={objectTypes} equipment={equipment} onAddEquipmentToSystem={onAddEquipmentToSystem} onDetachEquipmentFromSystem={onDetachEquipmentFromSystem} onSelectEquipment={onSelectEquipment} /> : null}
      {safeActiveTab === 'Документы' || safeActiveTab === 'Заметки' ? <div className="stub-tab"><h3>{safeActiveTab}</h3><p>Заглушка карточки системы.</p></div> : null}
      {systems.filter((item) => item.parentSystemId === system.id).length > 0 ? (
        <div className="parameter-section system-children-block">
          <SectionTitle title="Дочерние системы" description="Подсистемы внутри инженерного контура." />
          <div className="relation-selected-table">
            {systems.filter((item) => item.parentSystemId === system.id).map((child) => <div key={child.id} className="relation-selected-row"><span>{child.name}</span><button type="button" onClick={() => onSelectSystem(child.id)}>Открыть</button></div>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NextActionPanel({ title, hint, actions }: NextActionPanelProps) {
  return <div className="next-actions-panel"><div><b>{title}</b><span>{hint}</span></div><div className="next-actions-list">{actions.map((action) => <button key={action.label} type="button" className="quiet-action" disabled={action.disabled} onClick={action.onClick}>{action.label}</button>)}</div></div>;
}

function SystemParameters({ system, systems, objectTypes, equipment, patchSystem, onCreateSystemType }: SystemParametersProps) {
  const systemType = objectTypes.find((type) => type.id === system.typeId);
  const blockedParentIds = new Set([system.id, ...buildSystemDescendantIds(systems, system.id)]);
  const parentSystemOptions = [{ value: '', label: 'Нет родительской системы' }, ...systems.filter((item) => !blockedParentIds.has(item.id)).map((item) => ({ value: item.id, label: item.name }))];
  const systemTypeParameters = getSystemTypeParameters(systemType);
  const equipmentCount = getSystemEquipment(system, equipment).length;
  const updateSystemParameterValue = (parameter: ParameterDefinition, value: ParameterDefaultValue) => patchSystem({ parameters: { ...system.parameters, [parameter.code]: value } });

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Основные данные системы" description="Система задает область действия. Физическое размещение есть только у оборудования." />
      <div className="reference-fields-grid">
        <EditableField label="Наименование" value={system.name} onChange={(value) => patchSystem({ name: value })} />
        <SelectField label="Вид элемента" value={system.typeId} options={objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))} onChange={(value) => patchSystem({ typeId: value })} />
        <SelectField label="Область действия" value={system.scopeType} options={Object.entries(systemScopeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => patchSystem({ scopeType: value as SystemEntity['scopeType'] })} />
        <ReadOnlyField label="Количество единиц оборудования" value={equipmentCount} />
        <ReadOnlyField label="Статус наполнения" value={equipmentCount > 0 ? 'есть оборудование' : 'нет оборудования'} />
        {system.parentSystemId ? <SelectField label="Родительская система" value={system.parentSystemId} options={parentSystemOptions} onChange={(value) => patchSystem({ parentSystemId: value || null })} /> : null}
      </div>
      {equipmentCount === 0 ? <div className="inline-warning"><b>нет оборудования</b><p>Система может быть черновиком. Добавьте оборудование.</p></div> : null}
      <button type="button" className="secondary-action" onClick={() => onCreateSystemType(system.id)}>Создать новый вид системы</button>
      <div className="dynamic-parameter-list"><div className="inline-title"><b>Параметры по виду системы</b><small>{systemType?.name ?? 'Вид не найден'}</small></div>{systemTypeParameters.length > 0 ? systemTypeParameters.map((parameter) => <SystemParameterInput key={parameter.id} parameter={parameter} value={getSystemParameterValue(system, parameter)} onChange={(value) => updateSystemParameterValue(parameter, value)} />) : <EmptyState title="Параметров вида системы нет" description="Добавьте параметры в Дереве видов объектов или создайте новый вид системы." />}</div>
      <div className="service-info"><b>Служебные сведения</b><span>Идентификатор системы: {system.id}</span></div>
    </div>
  );
}

function SystemRelations({ system, objects, objectTypes, contextObjectId, patchSystem, onLinkSystemToContextObject, onLinkSystemToRoomsInContext }: SystemRelationsProps) {
  const roomObjects = objects.filter((object) => isRoomType(objectTypes, object));
  const contextObject = contextObjectId ? objects.find((object) => object.id === contextObjectId) : null;

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Область действия системы" description="Система применяется к объекту, этажу, зоне, офису или набору помещений." />
      <div className="reference-fields-grid">
        <SelectField label="Область действия" value={system.scopeType} options={Object.entries(systemScopeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => patchSystem({ scopeType: value as SystemEntity['scopeType'] })} />
        <ReadOnlyField label="Контекстный объект" value={contextObject?.name ?? 'Не выбран'} />
      </div>
      <div className="relation-actions system-fast-actions"><button type="button" disabled={!contextObjectId} onClick={() => onLinkSystemToContextObject(system.id)}>Связать с выбранным объектом</button><button type="button" disabled={!contextObjectId} onClick={() => onLinkSystemToRoomsInContext(system.id)}>Связать со всеми помещениями выбранного уровня</button></div>
      <RelationBlock title="Область действия" description="Объекты, этажи или зоны, на которые распространяется система." actionLabel="Добавить объект" items={objects.map((object) => ({ id: object.id, label: `${object.name} · ${typeLabel(objectTypes, object.typeId)}`, checked: system.scopeObjectIds.includes(object.id) }))} onToggle={(objectId) => patchSystem({ scopeObjectIds: toggleId(system.scopeObjectIds, objectId) })} />
      <RelationBlock title="Связанные помещения" description="Помещения, в которых система явно применяется." actionLabel="Добавить помещение" items={roomObjects.map((object) => ({ id: object.id, label: `${object.name} · ${object.area ?? 'без площади'} м²`, checked: system.linkedRoomIds.includes(object.id) }))} onToggle={(roomId) => patchSystem({ linkedRoomIds: toggleId(system.linkedRoomIds, roomId) })} />
    </div>
  );
}

function SystemEquipment({ system, objects, objectTypes, equipment, onAddEquipmentToSystem, onDetachEquipmentFromSystem, onSelectEquipment }: SystemEquipmentProps) {
  const systemEquipment = getSystemEquipment(system, equipment);
  const systemEquipmentIds = new Set(systemEquipment.map((item) => item.id));
  const roots = systemEquipment.filter((item) => !item.parentEquipmentId || !systemEquipmentIds.has(item.parentEquipmentId));

  return (
    <div className="parameter-section reference-table-section">
      <SectionTitle title="Состав системы" description="Физическое размещение хранится у оборудования. Уровень учета unit/group/model/aggregate меняется в карточке оборудования." />
      <div className="relation-actions system-fast-actions">
        <button type="button" className="secondary-action" onClick={() => onAddEquipmentToSystem(system.id)}>Добавить оборудование</button>
      </div>
      {systemEquipment.length === 0 ? <EmptyState title="Пустая система" description="Система создана как черновик. Добавьте оборудование." /> : null}
      <div className="engineering-tree">{roots.map((item) => <EquipmentTreeNode key={item.id} item={item} allEquipment={systemEquipment} objects={objects} objectTypes={objectTypes} level={0} onDetachEquipmentFromSystem={(equipmentId) => onDetachEquipmentFromSystem(system.id, equipmentId)} onSelectEquipment={onSelectEquipment} />)}</div>
    </div>
  );
}

function EquipmentTreeNode({ item, allEquipment, objects, objectTypes, level, onDetachEquipmentFromSystem, onSelectEquipment }: EquipmentTreeNodeProps) {
  const children = allEquipment.filter((child) => child.parentEquipmentId === item.id);
  return <div className="engineering-tree-node" style={{ marginLeft: level * 18 }}><div className="engineering-tree-row"><div><b>{item.name}</b><small>{typeLabel(objectTypes, item.typeId)} · место: {objectLabel(objects, item.placementObjectId)} · {item.quantity} {item.unit}</small></div><div className="row-actions-inline"><button type="button" onClick={() => onSelectEquipment(item.id)}>Открыть</button></div></div>{children.map((child) => <EquipmentTreeNode key={child.id} item={child} allEquipment={allEquipment} objects={objects} objectTypes={objectTypes} level={level + 1} onDetachEquipmentFromSystem={onDetachEquipmentFromSystem} onSelectEquipment={onSelectEquipment} />)}</div>;
}

function SystemParameterInput({ parameter, value, onChange }: { parameter: ParameterDefinition; value: ParameterDefaultValue; onChange: (value: ParameterDefaultValue) => void }) { if (parameter.dataType === 'boolean') return <label className="boolean-row"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span>{parameter.name}</span></label>; return <label className="field-row"><span>{parameter.name}{parameter.required ? ' *' : ''}</span><input type={parameter.dataType === 'number' ? 'number' : parameter.dataType === 'date' ? 'date' : 'text'} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => onChange(normalizeSystemParameterInput(parameter, event.target.value))} /></label>; }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>; }
function ReadOnlyField({ label, value }: { label: string | number; value: string | number }) { return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>; }
function EditableField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: 'text' | 'number'; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>; }
