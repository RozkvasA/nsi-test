import type {
  CreateEntityKind,
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ObjectStructureTemplate,
  ObjectType,
  ParameterDefinition,
  ParameterGroupId,
  ParameterGroupView,
  PendingEquipmentDraft,
  PendingObjectDraft,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
import { EquipmentContent } from './EquipmentContent';
import { EquipmentDraftPanel } from './EquipmentDraftPanel';
import { ParameterContent } from './ParameterContent';
import { SystemContent } from './SystemContent';
import { TechCardContent } from './TechCardContent';

interface DetailsPanelProps {
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  activeTab: string;
  tabs: string[];
  activeGroupId: ParameterGroupId;
  parameterGroups: ParameterGroupView[];
  showEmpty: boolean;
  detailsNotice: DetailsNotice | null;
  pendingObjectDraft: PendingObjectDraft | null;
  pendingEquipmentDraft: PendingEquipmentDraft | null;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  objectStructureTemplates: ObjectStructureTemplate[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  selectedContextObjectId: string | null;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => void;
  onSetActiveTab: (tab: string) => void;
  onSetActiveGroupId: (groupId: ParameterGroupId) => void;
  onSetShowEmpty: (value: boolean) => void;
  onDismissNotice: () => void;
  onConfirmRetire: () => void;
  onCancelRetire: () => void;
  onConfirmObjectTypeRetire: () => void;
  onUpdatePendingObjectDraft: (patch: Partial<PendingObjectDraft>) => void;
  onConfirmCreateObject: () => void;
  onCancelPendingObjectDraft: () => void;
  onUpdatePendingEquipmentDraft: (patch: Partial<PendingEquipmentDraft>) => void;
  onConfirmCreateEquipment: () => void;
  onCancelPendingEquipmentDraft: () => void;
  onCreateObjectTypeForDraft: () => void;
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onUpdateObjectType: (id: string, patch: Partial<ObjectType>) => void;
  onUpdateSystem: (id: string, patch: Partial<SystemEntity>) => void;
  onUpdateEquipment: (id: string, patch: Partial<EquipmentEntity>) => void;
  onCreateSystemType: (systemId: string) => void;
  onCreateEquipmentType: (equipmentId: string) => void;
  onAddEquipmentToSystem: (systemId: string) => void;
  onAddChildEquipment: (parentEquipmentId: string) => void;
  onCreateMissingChildUnits: (parentEquipmentId: string) => void;
  onCreateChildUnitsFromRows: (parentEquipmentId: string, rows: Array<{ name: string; inventoryNumber?: string }>) => void;
  onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void;
  onSelectSystem: (systemId: string, contextObjectId?: string | null) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onSelectTechCard: (techCardId: string) => void;
  onCreateTechCardForEquipment: (equipmentId: string) => void;
  onLinkSystemToContextObject: (systemId: string) => void;
  onLinkSystemToRoomsInContext: (systemId: string) => void;
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

interface ObjectNextActionsProps {
  object: InfrastructureObject;
  isRoom: boolean;
  onCreate: DetailsPanelProps['onCreate'];
  onSetActiveTab: (tab: string) => void;
}

interface DetailsNoticePanelProps {
  notice: DetailsNotice;
  onDismiss: () => void;
  onConfirmRetire: () => void;
  onConfirmObjectTypeRetire: () => void;
  onCancelRetire: () => void;
}

export function DetailsPanel(props: DetailsPanelProps) {
  const {
    selectedRef, selectedEntity, activeTab, tabs, activeGroupId, showEmpty, detailsNotice, pendingObjectDraft, pendingEquipmentDraft,
    objects, objectTypes, objectStructureTemplates, systems, equipment, techCards, dictionaries, selectedContextObjectId,
    onCreate, onSetActiveTab, onDismissNotice, onConfirmRetire, onCancelRetire, onConfirmObjectTypeRetire,
    onUpdatePendingObjectDraft, onConfirmCreateObject, onCancelPendingObjectDraft, onUpdatePendingEquipmentDraft, onConfirmCreateEquipment, onCancelPendingEquipmentDraft,
    onCreateObjectTypeForDraft, onUpdateObject, onUpdateObjectType, onUpdateSystem, onUpdateEquipment, onCreateSystemType, onCreateEquipmentType,
    onAddEquipmentToSystem, onAddChildEquipment, onCreateMissingChildUnits, onCreateChildUnitsFromRows, onDetachEquipmentFromSystem, onSelectSystem, onSelectEquipment, onSelectTechCard, onCreateTechCardForEquipment,
    onLinkSystemToContextObject, onLinkSystemToRoomsInContext, onToggleAllowedChildType, onAddParameterGroup, onRenameParameterGroup, onAddParameterToGroup,
    onUpdateParameter, onDeleteParameter, onToggleObjectSystemLink, onToggleEquipmentPlacement, onToggleSystemRoomLink, onBulkLinkRoomsToSystem, onUpdateTechCard,
  } = props;

  const selectedObject = selectedRef.kind === 'object' ? objects.find((item) => item.id === selectedRef.id) : undefined;
  const selectedSystem = selectedRef.kind === 'system' ? systems.find((item) => item.id === selectedRef.id) : undefined;
  const selectedEquipment = selectedRef.kind === 'equipment' ? equipment.find((item) => item.id === selectedRef.id) : undefined;
  const selectedTechCard = selectedRef.kind === 'techCard' ? techCards.find((item) => item.id === selectedRef.id) : undefined;
  const selectedObjectType = selectedObject ? objectTypes.find((type) => type.id === selectedObject.typeId) : undefined;
  const selectedObjectIsRoom = selectedObjectType?.code === 'ROOM';
  const parentObject = pendingObjectDraft ? objects.find((item) => item.id === pendingObjectDraft.parentObjectId) : null;
  const isRootDraft = pendingObjectDraft?.kind === 'rootObject';
  const selectedTemplate = pendingObjectDraft ? objectStructureTemplates.find((template) => template.id === pendingObjectDraft.templateId) : undefined;
  const title = pendingObjectDraft ? 'Создание объекта учета' : pendingEquipmentDraft ? 'Создание оборудования' : selectedEntity?.title ?? 'Элемент не выбран';
  const subtitle = pendingObjectDraft || pendingEquipmentDraft ? 'Заполните основные данные, затем откройте карточку для деталей.' : selectedEntity?.subtitle ?? 'Выберите строку в дереве';

  return (
    <section className="details-panel">
      <header className="details-header"><p className="eyebrow">Карточка элемента</p><h2>{title}</h2><span>{subtitle}</span></header>
      {detailsNotice ? <DetailsNoticePanel notice={detailsNotice} onDismiss={onDismissNotice} onConfirmRetire={onConfirmRetire} onConfirmObjectTypeRetire={onConfirmObjectTypeRetire} onCancelRetire={onCancelRetire} /> : null}

      {pendingObjectDraft ? (
        <div className="create-object-panel calm-create-panel">
          <div className="section-title"><h3>{isRootDraft ? 'Новый корневой объект' : pendingObjectDraft.kind === 'room' ? 'Новое помещение' : 'Новый элемент дерева'}</h3><p>Минимальный набор полей. Порядок заполнения не навязывается.</p></div>
          {isRootDraft ? <div className="creation-mode-card"><span>Способ создания</span><div className="mode-buttons"><button type="button" className={pendingObjectDraft.creationMode === 'empty' ? 'mode-button active' : 'mode-button'} onClick={() => onUpdatePendingObjectDraft({ creationMode: 'empty' })}>Пустой объект</button><button type="button" className={pendingObjectDraft.creationMode === 'template' ? 'mode-button active' : 'mode-button'} onClick={() => onUpdatePendingObjectDraft({ creationMode: 'template' })}>Из шаблона</button></div></div> : null}
          {isRootDraft && pendingObjectDraft.creationMode === 'template' ? <><label className="field-row"><span>Шаблон структуры</span><select value={pendingObjectDraft.templateId} onChange={(event) => onUpdatePendingObjectDraft({ templateId: event.target.value })}>{objectStructureTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><div className="template-description"><b>{selectedTemplate?.name ?? 'Шаблон не выбран'}</b><p>{selectedTemplate?.description ?? 'Выберите шаблон структуры объекта.'}</p></div></> : null}
          <label className="field-row"><span>Родительский объект</span><input value={parentObject?.name ?? 'Корневой уровень'} readOnly /></label><label className="field-row"><span>Вид элемента</span><select value={pendingObjectDraft.typeId} onChange={(event) => onUpdatePendingObjectDraft({ typeId: event.target.value })}>{objectTypes.map((type) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label><label className="field-row"><span>Наименование</span><input value={pendingObjectDraft.name} onChange={(event) => onUpdatePendingObjectDraft({ name: event.target.value })} /></label><label className="field-row"><span>Сокращение</span><input value={pendingObjectDraft.shortName} onChange={(event) => onUpdatePendingObjectDraft({ shortName: event.target.value })} /></label>{isRootDraft ? <label className="field-row"><span>Уровень детализации</span><input type="number" min={1} value={pendingObjectDraft.detailLevel} onChange={(event) => onUpdatePendingObjectDraft({ detailLevel: Math.max(1, Number(event.target.value) || 1) })} /></label> : null}<label className="field-row"><span>Площадь</span><input type="number" value={pendingObjectDraft.area ?? ''} onChange={(event) => onUpdatePendingObjectDraft({ area: event.target.value === '' ? null : Number(event.target.value) })} /></label><label className="field-row"><span>Количество</span><input type="number" value={pendingObjectDraft.quantity} onChange={(event) => onUpdatePendingObjectDraft({ quantity: Number(event.target.value) })} /></label><label className="field-row"><span>Единица измерения</span><input value={pendingObjectDraft.unit} onChange={(event) => onUpdatePendingObjectDraft({ unit: event.target.value })} /></label><div className="create-actions"><button type="button" onClick={onConfirmCreateObject}>Создать</button><button type="button" onClick={onCreateObjectTypeForDraft}>Создать новый вид</button><button type="button" onClick={onCancelPendingObjectDraft}>Отмена</button></div>
        </div>
      ) : pendingEquipmentDraft ? (
        <EquipmentDraftPanel draft={pendingEquipmentDraft} objects={objects} objectTypes={objectTypes} systems={systems} equipment={equipment} onUpdate={onUpdatePendingEquipmentDraft} onConfirm={onConfirmCreateEquipment} onCancel={onCancelPendingEquipmentDraft} />
      ) : selectedSystem ? (
        <SystemContent system={selectedSystem} systems={systems} objects={objects} objectTypes={objectTypes} equipment={equipment} activeTab={activeTab} contextObjectId={selectedContextObjectId} onSetActiveTab={onSetActiveTab} onUpdateSystem={onUpdateSystem} onCreateSystemType={onCreateSystemType} onAddEquipmentToSystem={onAddEquipmentToSystem} onDetachEquipmentFromSystem={onDetachEquipmentFromSystem} onSelectEquipment={onSelectEquipment} onSelectSystem={(systemId) => onSelectSystem(systemId, selectedContextObjectId)} onCreate={onCreate} onLinkSystemToContextObject={onLinkSystemToContextObject} onLinkSystemToRoomsInContext={onLinkSystemToRoomsInContext} />
      ) : selectedEquipment ? (
        <EquipmentContent equipmentItem={selectedEquipment} equipment={equipment} systems={systems} objects={objects} objectTypes={objectTypes} techCards={techCards} activeTab={activeTab} onSetActiveTab={onSetActiveTab} onUpdateEquipment={onUpdateEquipment} onCreateEquipmentType={onCreateEquipmentType} onAddChildEquipment={onAddChildEquipment} onCreateMissingChildUnits={onCreateMissingChildUnits} onCreateChildUnitsFromRows={onCreateChildUnitsFromRows} onSelectEquipment={onSelectEquipment} onSelectSystem={(systemId) => onSelectSystem(systemId, selectedContextObjectId)} onSelectTechCard={onSelectTechCard} onCreateTechCardForEquipment={onCreateTechCardForEquipment} />
      ) : selectedTechCard ? (
        <TechCardContent card={selectedTechCard} objectTypes={objectTypes} dictionaries={dictionaries} activeTab={activeTab} onSetActiveTab={onSetActiveTab} onUpdateTechCard={onUpdateTechCard} />
      ) : (
        <><div className="tabs">{tabs.map((tab) => <button key={tab} type="button" className={tab === activeTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}</div>{activeTab === 'Параметры' ? <div className="parameter-card parameter-card-wide">{selectedObject ? <ObjectNextActions object={selectedObject} isRoom={selectedObjectIsRoom} onCreate={onCreate} onSetActiveTab={onSetActiveTab} /> : null}{selectedObjectIsRoom && selectedObject ? <div className="relation-actions system-fast-actions"><button type="button" className="secondary-action" onClick={() => onCreate('equipment', selectedObject.id)}>Создать новое оборудование в этом помещении</button></div> : null}<ParameterContent selectedRef={selectedRef} selectedEntity={selectedEntity} activeGroupId={activeGroupId} showEmpty={showEmpty} objects={objects} objectTypes={objectTypes} systems={systems} equipment={equipment} techCards={techCards} dictionaries={dictionaries} onUpdateObject={onUpdateObject} onUpdateObjectType={onUpdateObjectType} onToggleAllowedChildType={onToggleAllowedChildType} onAddParameterGroup={onAddParameterGroup} onRenameParameterGroup={onRenameParameterGroup} onAddParameterToGroup={onAddParameterToGroup} onUpdateParameter={onUpdateParameter} onDeleteParameter={onDeleteParameter} onToggleObjectSystemLink={onToggleObjectSystemLink} onToggleEquipmentPlacement={onToggleEquipmentPlacement} onToggleSystemRoomLink={onToggleSystemRoomLink} onBulkLinkRoomsToSystem={onBulkLinkRoomsToSystem} onSelectSystem={(systemId) => onSelectSystem(systemId, selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId)} onSelectEquipment={onSelectEquipment} onUpdateTechCard={onUpdateTechCard} /></div> : <div className="stub-tab"><h3>{activeTab}</h3><p>Раздел оставлен как заглушка этапа 1.</p></div>}</>
      )}
    </section>
  );
}

function ObjectNextActions({ object, isRoom, onCreate, onSetActiveTab }: ObjectNextActionsProps) {
  const actions = isRoom ? [
    { label: 'Создать еще', onClick: () => onCreate('room', object.parentId) },
    { label: 'Добавить оборудование в помещение', onClick: () => onCreate('equipment', object.id) },
    { label: 'Добавить систему для этого уровня', onClick: () => onCreate('system', object.id) },
    { label: 'Перейти к помещению', onClick: () => onSetActiveTab('Параметры') },
  ] : [
    { label: 'Создать еще', onClick: () => object.parentId ? onCreate('childObject', object.parentId) : onCreate('rootObject') },
    { label: 'Добавить систему', onClick: () => onCreate('system', object.id) },
    { label: 'Добавить помещение', onClick: () => onCreate('room', object.id) },
    { label: 'Перейти к карточке', onClick: () => onSetActiveTab('Параметры') },
  ];
  return <div className="next-actions-panel"><div><b>{isRoom ? 'Дальше по помещению' : 'Дальше по объекту'}</b><span>Можно продолжить с любого направления.</span></div><div className="next-actions-list">{actions.map((action) => <button key={action.label} type="button" className="quiet-action" onClick={action.onClick}>{action.label}</button>)}</div></div>;
}

function DetailsNoticePanel({ notice, onDismiss, onConfirmRetire, onConfirmObjectTypeRetire, onCancelRetire }: DetailsNoticePanelProps) {
  if (notice.type === 'retireConfirm') { const impact = notice.impact; return <div className="notice-panel danger"><div><b>Снятие с учета</b><p>{impact.targetObjectName}: будет затронуто {impact.descendantCount} дочерних объектов, {impact.affectedSystems} систем, {impact.affectedEquipment} оборудования, {impact.affectedTechCards} техкарт.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmRetire}>Подтвердить</button><button type="button" onClick={onCancelRetire}>Отмена</button></div></div>; }
  if (notice.type === 'objectTypeRetireConfirm') { const impact = notice.impact; return <div className="notice-panel danger"><div><b>Отключение вида объекта</b><p>{impact.targetTypeName}: будет затронуто {impact.childTypeCount} дочерних видов и {impact.objectCount} объектов.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmObjectTypeRetire}>Подтвердить</button><button type="button" onClick={onDismiss}>Отмена</button></div></div>; }
  return <div className="notice-panel"><div><b>{notice.title}</b><p>{notice.message}</p></div><button type="button" onClick={onDismiss}>Закрыть</button></div>;
}
