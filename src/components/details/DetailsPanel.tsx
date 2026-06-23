import type {
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ObjectStructureTemplate,
  ObjectType,
  ParameterDefinition,
  ParameterGroupId,
  ParameterGroupView,
  PendingObjectDraft,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
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
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  objectStructureTemplates: ObjectStructureTemplate[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  selectedContextObjectId: string | null;
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
  onCreateObjectTypeForDraft: () => void;
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onUpdateObjectType: (id: string, patch: Partial<ObjectType>) => void;
  onUpdateSystem: (id: string, patch: Partial<SystemEntity>) => void;
  onCreateSystemType: (systemId: string) => void;
  onAddEquipmentToSystem: (systemId: string) => void;
  onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void;
  onSelectSystem: (systemId: string, contextObjectId?: string | null) => void;
  onSelectEquipment: (equipmentId: string) => void;
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

export function DetailsPanel({
  selectedRef,
  selectedEntity,
  activeTab,
  tabs,
  activeGroupId,
  parameterGroups,
  showEmpty,
  detailsNotice,
  pendingObjectDraft,
  objects,
  objectTypes,
  objectStructureTemplates,
  systems,
  equipment,
  techCards,
  dictionaries,
  selectedContextObjectId,
  onSetActiveTab,
  onSetActiveGroupId,
  onSetShowEmpty,
  onDismissNotice,
  onConfirmRetire,
  onCancelRetire,
  onConfirmObjectTypeRetire,
  onUpdatePendingObjectDraft,
  onConfirmCreateObject,
  onCancelPendingObjectDraft,
  onCreateObjectTypeForDraft,
  onUpdateObject,
  onUpdateObjectType,
  onUpdateSystem,
  onCreateSystemType,
  onAddEquipmentToSystem,
  onDetachEquipmentFromSystem,
  onSelectSystem,
  onSelectEquipment,
  onLinkSystemToContextObject,
  onLinkSystemToRoomsInContext,
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
}: DetailsPanelProps) {
  const parentObject = pendingObjectDraft ? objects.find((item) => item.id === pendingObjectDraft.parentObjectId) : null;
  const isRootDraft = pendingObjectDraft?.kind === 'rootObject';
  const selectedTemplate = pendingObjectDraft ? objectStructureTemplates.find((template) => template.id === pendingObjectDraft.templateId) : undefined;
  const selectedTechCard = selectedRef.kind === 'techCard' ? techCards.find((card) => card.id === selectedRef.id) : undefined;
  const selectedSystem = selectedRef.kind === 'system' ? systems.find((system) => system.id === selectedRef.id) : undefined;
  const selectedEquipment = selectedRef.kind === 'equipment' ? equipment.find((item) => item.id === selectedRef.id) : undefined;

  return (
    <section className="details-panel">
      <header className="details-header">
        <p className="eyebrow">Карточка элемента</p>
        <h2>{pendingObjectDraft ? 'Создание объекта учета' : selectedEntity?.title ?? 'Элемент не выбран'}</h2>
        <span>{pendingObjectDraft ? 'Выберите способ создания и вид объекта' : selectedEntity?.subtitle ?? 'Выберите строку в дереве'}</span>
      </header>

      {detailsNotice ? (
        <DetailsNoticePanel notice={detailsNotice} onDismiss={onDismissNotice} onConfirmRetire={onConfirmRetire} onConfirmObjectTypeRetire={onConfirmObjectTypeRetire} onCancelRetire={onCancelRetire} />
      ) : null}

      {pendingObjectDraft ? (
        <div className="create-object-panel">
          <div className="section-title">
            <h3>{isRootDraft ? 'Новый корневой объект' : 'Новый элемент дерева объектов'}</h3>
            <p>Создание не назначает тип автоматически: пользователь выбирает вид из редактируемого дерева видов объектов.</p>
          </div>

          {isRootDraft ? (
            <div className="creation-mode-card">
              <span>Способ создания</span>
              <div className="mode-buttons">
                <button type="button" className={pendingObjectDraft.creationMode === 'empty' ? 'mode-button active' : 'mode-button'} onClick={() => onUpdatePendingObjectDraft({ creationMode: 'empty' })}>Создать пустой объект</button>
                <button type="button" className={pendingObjectDraft.creationMode === 'template' ? 'mode-button active' : 'mode-button'} onClick={() => onUpdatePendingObjectDraft({ creationMode: 'template' })}>Создать из шаблона</button>
              </div>
            </div>
          ) : null}

          {isRootDraft && pendingObjectDraft.creationMode === 'template' ? (
            <>
              <label className="field-row"><span>Шаблон структуры</span><select value={pendingObjectDraft.templateId} onChange={(event) => onUpdatePendingObjectDraft({ templateId: event.target.value })}>{objectStructureTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
              <div className="template-description"><b>{selectedTemplate?.name ?? 'Шаблон не выбран'}</b><p>{selectedTemplate?.description ?? 'Выберите шаблон структуры объекта.'}</p>{selectedTemplate ? <span>{selectedTemplate.nodes.length} узлов шаблона · рекомендуемый уровень детализации {selectedTemplate.detailLevel}</span> : null}</div>
            </>
          ) : null}

          <label className="field-row"><span>Родительский объект</span><input value={parentObject?.name ?? 'Корневой уровень'} readOnly /></label>
          <label className="field-row"><span>Вид объекта</span><select value={pendingObjectDraft.typeId} onChange={(event) => onUpdatePendingObjectDraft({ typeId: event.target.value })}>{objectTypes.map((type) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label>
          <label className="field-row"><span>Наименование</span><input value={pendingObjectDraft.name} onChange={(event) => onUpdatePendingObjectDraft({ name: event.target.value })} /></label>
          <label className="field-row"><span>Сокращение</span><input value={pendingObjectDraft.shortName} onChange={(event) => onUpdatePendingObjectDraft({ shortName: event.target.value })} /></label>
          {isRootDraft ? <label className="field-row"><span>Уровень детализации</span><input type="number" min={1} value={pendingObjectDraft.detailLevel} onChange={(event) => onUpdatePendingObjectDraft({ detailLevel: Math.max(1, Number(event.target.value) || 1) })} /></label> : null}
          <label className="field-row"><span>Площадь</span><input type="number" value={pendingObjectDraft.area ?? ''} onChange={(event) => onUpdatePendingObjectDraft({ area: event.target.value === '' ? null : Number(event.target.value) })} /></label>
          <label className="field-row"><span>Количество</span><input type="number" value={pendingObjectDraft.quantity} onChange={(event) => onUpdatePendingObjectDraft({ quantity: Number(event.target.value) })} /></label>
          <label className="field-row"><span>Единица измерения</span><input value={pendingObjectDraft.unit} onChange={(event) => onUpdatePendingObjectDraft({ unit: event.target.value })} /></label>
          <div className="create-actions"><button type="button" onClick={onConfirmCreateObject}>Создать объект</button><button type="button" onClick={onCreateObjectTypeForDraft}>Создать новый вид</button><button type="button" onClick={onCancelPendingObjectDraft}>Отмена</button></div>
        </div>
      ) : selectedSystem ? (
        <SystemContent
          system={selectedSystem}
          systems={systems}
          objects={objects}
          objectTypes={objectTypes}
          equipment={equipment}
          activeTab={activeTab}
          contextObjectId={selectedContextObjectId}
          onSetActiveTab={onSetActiveTab}
          onUpdateSystem={onUpdateSystem}
          onCreateSystemType={onCreateSystemType}
          onAddEquipmentToSystem={onAddEquipmentToSystem}
          onDetachEquipmentFromSystem={onDetachEquipmentFromSystem}
          onSelectEquipment={onSelectEquipment}
          onSelectSystem={(systemId) => onSelectSystem(systemId, selectedContextObjectId)}
          onLinkSystemToContextObject={onLinkSystemToContextObject}
          onLinkSystemToRoomsInContext={onLinkSystemToRoomsInContext}
        />
      ) : selectedEquipment ? (
        <EquipmentPlaceholder equipmentItem={selectedEquipment} objects={objects} objectTypes={objectTypes} systems={systems} onSelectSystem={onSelectSystem} />
      ) : selectedTechCard ? (
        <TechCardContent card={selectedTechCard} objectTypes={objectTypes} dictionaries={dictionaries} activeTab={activeTab} onSetActiveTab={onSetActiveTab} onUpdateTechCard={onUpdateTechCard} />
      ) : (
        <>
          <div className="tabs">{tabs.map((tab) => <button key={tab} type="button" className={tab === activeTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>{tab}</button>)}</div>
          {activeTab === 'Параметры' ? (
            <div className="parameters-layout">
              <aside className="parameter-groups">
                <div className="toggle-row"><span>Показать пустые</span><label className="switch"><input type="checkbox" checked={showEmpty} onChange={(event) => onSetShowEmpty(event.target.checked)} /><span /></label></div>
                {parameterGroups.map((group) => <button key={group.id} type="button" className={group.id === activeGroupId ? 'group-button active' : 'group-button'} onClick={() => onSetActiveGroupId(group.id)}><b>{group.title}</b><small>{group.hint}</small></button>)}
              </aside>
              <div className="parameter-card">
                <ParameterContent
                  selectedRef={selectedRef}
                  selectedEntity={selectedEntity}
                  activeGroupId={activeGroupId}
                  showEmpty={showEmpty}
                  objects={objects}
                  objectTypes={objectTypes}
                  systems={systems}
                  equipment={equipment}
                  techCards={techCards}
                  dictionaries={dictionaries}
                  onUpdateObject={onUpdateObject}
                  onUpdateObjectType={onUpdateObjectType}
                  onToggleAllowedChildType={onToggleAllowedChildType}
                  onAddParameterGroup={onAddParameterGroup}
                  onRenameParameterGroup={onRenameParameterGroup}
                  onAddParameterToGroup={onAddParameterToGroup}
                  onUpdateParameter={onUpdateParameter}
                  onDeleteParameter={onDeleteParameter}
                  onToggleObjectSystemLink={onToggleObjectSystemLink}
                  onToggleEquipmentPlacement={onToggleEquipmentPlacement}
                  onToggleSystemRoomLink={onToggleSystemRoomLink}
                  onBulkLinkRoomsToSystem={onBulkLinkRoomsToSystem}
                  onSelectSystem={(systemId) => onSelectSystem(systemId, selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId)}
                  onUpdateTechCard={onUpdateTechCard}
                />
              </div>
            </div>
          ) : <div className="stub-tab"><h3>{activeTab}</h3><p>Раздел оставлен как заглушка этапа 1. Каркас вкладки есть, детальная логика будет подключаться следующими этапами.</p></div>}
        </>
      )}
    </section>
  );
}

function EquipmentPlaceholder({ equipmentItem, objects, objectTypes, systems, onSelectSystem }: { equipmentItem: EquipmentEntity; objects: InfrastructureObject[]; objectTypes: ObjectType[]; systems: SystemEntity[]; onSelectSystem: (systemId: string) => void }) {
  const type = objectTypes.find((item) => item.id === equipmentItem.typeId);
  const placement = objects.find((item) => item.id === equipmentItem.placementObjectId);
  const system = systems.find((item) => item.id === equipmentItem.systemId);
  return (
    <div className="parameter-card">
      <div className="section-title"><h3>Карточка оборудования</h3><p>Безопасная заглушка до этапа Оборудование. Оборудование уже является отдельной сущностью и связано с системой.</p></div>
      <div className="reference-fields-grid">
        <label className="field-row"><span>Идентификатор</span><input value={equipmentItem.id} readOnly /></label>
        <label className="field-row"><span>Наименование</span><input value={equipmentItem.name} readOnly /></label>
        <label className="field-row"><span>Вид оборудования</span><input value={type?.name ?? 'Вид не найден'} readOnly /></label>
        <label className="field-row"><span>Система</span><input value={system?.name ?? 'Не привязано'} readOnly /></label>
        <label className="field-row"><span>Место размещения</span><input value={placement?.name ?? 'Не задано'} readOnly /></label>
        <label className="field-row"><span>Количество</span><input value={equipmentItem.quantity} readOnly /></label>
        <label className="field-row"><span>Единица измерения</span><input value={equipmentItem.unit} readOnly /></label>
      </div>
      {system ? <button type="button" className="secondary-action" onClick={() => onSelectSystem(system.id)}>Открыть систему</button> : null}
    </div>
  );
}

function DetailsNoticePanel({ notice, onDismiss, onConfirmRetire, onConfirmObjectTypeRetire, onCancelRetire }: { notice: DetailsNotice; onDismiss: () => void; onConfirmRetire: () => void; onConfirmObjectTypeRetire: () => void; onCancelRetire: () => void }) {
  if (notice.type === 'retireConfirm') {
    const { impact } = notice;
    return <div className="notice-panel danger"><div><b>Снятие с учета: {impact.targetObjectName}</b><p>Будет затронуто: дочерних элементов {impact.descendantCount}, систем {impact.affectedSystems}, оборудования {impact.affectedEquipment}, техкарт {impact.affectedTechCards}.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmRetire}>Подтвердить</button><button type="button" onClick={onCancelRetire}>Отмена</button></div></div>;
  }
  if (notice.type === 'objectTypeRetireConfirm') {
    const { impact } = notice;
    return <div className="notice-panel danger"><div><b>Снятие вида с учета: {impact.targetTypeName}</b><p>Будет затронуто: дочерних видов {impact.childTypeCount}, объектов этого вида и потомков {impact.objectCount}. Вид будет отключен для создания и редактирования.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmObjectTypeRetire}>Подтвердить</button><button type="button" onClick={onCancelRetire}>Отмена</button></div></div>;
  }
  return <div className={notice.type === 'moveBlocked' ? 'notice-panel danger' : 'notice-panel'}><div><b>{notice.title}</b><p>{notice.message}</p></div><button type="button" onClick={onDismiss}>Закрыть</button></div>;
}
