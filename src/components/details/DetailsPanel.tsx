import { EquipmentContent } from './EquipmentContent';
import { ParameterContent } from './ParameterContent';
import { SystemContent } from './SystemContent';
import { TechCardContent } from './TechCardContent';

const isRoom = (object: any, objectTypes: any[]) => objectTypes.find((type) => type.id === object?.typeId)?.code === 'ROOM';

export function DetailsPanel(props: any) {
  const p = props;
  const selectedObject = p.selectedRef.kind === 'object' ? p.objects.find((item: any) => item.id === p.selectedRef.id) : undefined;
  const selectedSystem = p.selectedRef.kind === 'system' ? p.systems.find((item: any) => item.id === p.selectedRef.id) : undefined;
  const selectedEquipment = p.selectedRef.kind === 'equipment' ? p.equipment.find((item: any) => item.id === p.selectedRef.id) : undefined;
  const selectedTechCard = p.selectedRef.kind === 'techCard' ? p.techCards.find((item: any) => item.id === p.selectedRef.id) : undefined;
  const selectedObjectIsRoom = isRoom(selectedObject, p.objectTypes);
  const parentObject = p.pendingObjectDraft ? p.objects.find((item: any) => item.id === p.pendingObjectDraft.parentObjectId) : null;
  const isRootDraft = p.pendingObjectDraft?.kind === 'rootObject';
  const selectedTemplate = p.pendingObjectDraft ? p.objectStructureTemplates.find((template: any) => template.id === p.pendingObjectDraft.templateId) : undefined;

  return (
    <section className="details-panel">
      <header className="details-header"><p className="eyebrow">Карточка элемента</p><h2>{p.pendingObjectDraft ? 'Создание объекта учета' : p.selectedEntity?.title ?? 'Элемент не выбран'}</h2><span>{p.pendingObjectDraft ? 'Заполните основные данные. Дальше можно добавить системы, помещения или оборудование.' : p.selectedEntity?.subtitle ?? 'Выберите строку в дереве'}</span></header>
      {p.detailsNotice ? <DetailsNoticePanel notice={p.detailsNotice} onDismiss={p.onDismissNotice} onConfirmRetire={p.onConfirmRetire} onConfirmObjectTypeRetire={p.onConfirmObjectTypeRetire} onCancelRetire={p.onCancelRetire} /> : null}

      {p.pendingObjectDraft ? (
        <div className="create-object-panel calm-create-panel">
          <div className="section-title"><h3>{isRootDraft ? 'Новый корневой объект' : p.pendingObjectDraft.kind === 'room' ? 'Новое помещение' : 'Новый элемент дерева'}</h3><p>Минимальный набор полей. Порядок заполнения не навязывается.</p></div>
          {isRootDraft ? <div className="creation-mode-card"><span>Способ создания</span><div className="mode-buttons"><button type="button" className={p.pendingObjectDraft.creationMode === 'empty' ? 'mode-button active' : 'mode-button'} onClick={() => p.onUpdatePendingObjectDraft({ creationMode: 'empty' })}>Пустой объект</button><button type="button" className={p.pendingObjectDraft.creationMode === 'template' ? 'mode-button active' : 'mode-button'} onClick={() => p.onUpdatePendingObjectDraft({ creationMode: 'template' })}>Из шаблона</button></div></div> : null}
          {isRootDraft && p.pendingObjectDraft.creationMode === 'template' ? <><label className="field-row"><span>Шаблон структуры</span><select value={p.pendingObjectDraft.templateId} onChange={(event) => p.onUpdatePendingObjectDraft({ templateId: event.target.value })}>{p.objectStructureTemplates.map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><div className="template-description"><b>{selectedTemplate?.name ?? 'Шаблон не выбран'}</b><p>{selectedTemplate?.description ?? 'Выберите шаблон структуры объекта.'}</p></div></> : null}
          <label className="field-row"><span>Родительский объект</span><input value={parentObject?.name ?? 'Корневой уровень'} readOnly /></label>
          <label className="field-row"><span>Вид элемента</span><select value={p.pendingObjectDraft.typeId} onChange={(event) => p.onUpdatePendingObjectDraft({ typeId: event.target.value })}>{p.objectTypes.map((type: any) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label>
          <label className="field-row"><span>Наименование</span><input value={p.pendingObjectDraft.name} onChange={(event) => p.onUpdatePendingObjectDraft({ name: event.target.value })} /></label>
          <label className="field-row"><span>Сокращение</span><input value={p.pendingObjectDraft.shortName} onChange={(event) => p.onUpdatePendingObjectDraft({ shortName: event.target.value })} /></label>
          {isRootDraft ? <label className="field-row"><span>Уровень детализации</span><input type="number" min={1} value={p.pendingObjectDraft.detailLevel} onChange={(event) => p.onUpdatePendingObjectDraft({ detailLevel: Math.max(1, Number(event.target.value) || 1) })} /></label> : null}
          <label className="field-row"><span>Площадь</span><input type="number" value={p.pendingObjectDraft.area ?? ''} onChange={(event) => p.onUpdatePendingObjectDraft({ area: event.target.value === '' ? null : Number(event.target.value) })} /></label>
          <label className="field-row"><span>Количество</span><input type="number" value={p.pendingObjectDraft.quantity} onChange={(event) => p.onUpdatePendingObjectDraft({ quantity: Number(event.target.value) })} /></label>
          <label className="field-row"><span>Единица измерения</span><input value={p.pendingObjectDraft.unit} onChange={(event) => p.onUpdatePendingObjectDraft({ unit: event.target.value })} /></label>
          <div className="create-actions"><button type="button" onClick={p.onConfirmCreateObject}>Создать</button><button type="button" onClick={p.onCreateObjectTypeForDraft}>Создать новый вид</button><button type="button" onClick={p.onCancelPendingObjectDraft}>Отмена</button></div>
        </div>
      ) : selectedSystem ? (
        <SystemContent system={selectedSystem} systems={p.systems} objects={p.objects} objectTypes={p.objectTypes} equipment={p.equipment} activeTab={p.activeTab} contextObjectId={p.selectedContextObjectId} onSetActiveTab={p.onSetActiveTab} onUpdateSystem={p.onUpdateSystem} onCreateSystemType={p.onCreateSystemType} onAddEquipmentToSystem={p.onAddEquipmentToSystem} onDetachEquipmentFromSystem={p.onDetachEquipmentFromSystem} onSelectEquipment={p.onSelectEquipment} onSelectSystem={(systemId) => p.onSelectSystem(systemId, p.selectedContextObjectId)} onCreate={p.onCreate} onLinkSystemToContextObject={p.onLinkSystemToContextObject} onLinkSystemToRoomsInContext={p.onLinkSystemToRoomsInContext} />
      ) : selectedEquipment ? (
        <EquipmentContent equipmentItem={selectedEquipment} equipment={p.equipment} systems={p.systems} objects={p.objects} objectTypes={p.objectTypes} techCards={p.techCards} activeTab={p.activeTab} onSetActiveTab={p.onSetActiveTab} onUpdateEquipment={p.onUpdateEquipment} onCreateEquipmentType={p.onCreateEquipmentType} onAddChildEquipment={p.onAddChildEquipment} onSelectEquipment={p.onSelectEquipment} onSelectSystem={(systemId) => p.onSelectSystem(systemId, p.selectedContextObjectId)} onSelectTechCard={p.onSelectTechCard} onCreateTechCardForEquipment={p.onCreateTechCardForEquipment} />
      ) : selectedTechCard ? (
        <TechCardContent card={selectedTechCard} objectTypes={p.objectTypes} dictionaries={p.dictionaries} activeTab={p.activeTab} onSetActiveTab={p.onSetActiveTab} onUpdateTechCard={p.onUpdateTechCard} />
      ) : (
        <><div className="tabs">{p.tabs.map((tab: string) => <button key={tab} type="button" className={tab === p.activeTab ? 'tab active' : 'tab'} onClick={() => p.onSetActiveTab(tab)}>{tab}</button>)}</div>{p.activeTab === 'Параметры' ? <div className="parameter-card parameter-card-wide">{selectedObject ? <ObjectNextActions object={selectedObject} isRoom={selectedObjectIsRoom} onCreate={p.onCreate} onSetActiveTab={p.onSetActiveTab} /> : null}{selectedObjectIsRoom && selectedObject ? <div className="relation-actions system-fast-actions"><button type="button" className="secondary-action" onClick={() => p.onCreate('equipment', selectedObject.id)}>Создать новое оборудование в этом помещении</button></div> : null}<ParameterContent selectedRef={p.selectedRef} selectedEntity={p.selectedEntity} activeGroupId={p.activeGroupId} showEmpty={p.showEmpty} objects={p.objects} objectTypes={p.objectTypes} systems={p.systems} equipment={p.equipment} techCards={p.techCards} dictionaries={p.dictionaries} onUpdateObject={p.onUpdateObject} onUpdateObjectType={p.onUpdateObjectType} onToggleAllowedChildType={p.onToggleAllowedChildType} onAddParameterGroup={p.onAddParameterGroup} onRenameParameterGroup={p.onRenameParameterGroup} onAddParameterToGroup={p.onAddParameterToGroup} onUpdateParameter={p.onUpdateParameter} onDeleteParameter={p.onDeleteParameter} onToggleObjectSystemLink={p.onToggleObjectSystemLink} onToggleEquipmentPlacement={p.onToggleEquipmentPlacement} onToggleSystemRoomLink={p.onToggleSystemRoomLink} onBulkLinkRoomsToSystem={p.onBulkLinkRoomsToSystem} onSelectSystem={(systemId) => p.onSelectSystem(systemId, p.selectedRef.kind === 'object' ? p.selectedRef.id : p.selectedContextObjectId)} onSelectEquipment={p.onSelectEquipment} onUpdateTechCard={p.onUpdateTechCard} /></div> : <div className="stub-tab"><h3>{p.activeTab}</h3><p>Раздел оставлен как заглушка этапа 1.</p></div>}</>
      )}
    </section>
  );
}

function ObjectNextActions({ object, isRoom, onCreate, onSetActiveTab }: any) {
  const actions = isRoom ? [
    { label: 'Создать еще', onClick: () => onCreate('room', object.parentId) },
    { label: 'Добавить оборудование в помещение', onClick: () => onCreate('equipment', object.id) },
    { label: 'Добавить систему для этого уровня', onClick: () => onCreate('system', object.parentId ?? object.id) },
    { label: 'Перейти к помещению', onClick: () => onSetActiveTab('Параметры') },
  ] : [
    { label: 'Создать еще', onClick: () => object.parentId ? onCreate('childObject', object.parentId) : onCreate('rootObject') },
    { label: 'Добавить систему', onClick: () => onCreate('system', object.id) },
    { label: 'Добавить помещение', onClick: () => onCreate('room', object.id) },
    { label: 'Перейти к карточке', onClick: () => onSetActiveTab('Параметры') },
  ];
  return <div className="next-actions-panel"><div><b>{isRoom ? 'Дальше по помещению' : 'Дальше по объекту'}</b><span>Можно продолжить с любого направления.</span></div><div className="next-actions-list">{actions.map((action) => <button key={action.label} type="button" className="quiet-action" onClick={action.onClick}>{action.label}</button>)}</div></div>;
}

function DetailsNoticePanel({ notice, onDismiss, onConfirmRetire, onConfirmObjectTypeRetire, onCancelRetire }: any) {
  if (notice.type === 'retireConfirm') { const impact = notice.impact; return <div className="notice-panel danger"><div><b>Снятие с учета</b><p>{impact.targetObjectName}: будет затронуто {impact.descendantCount} дочерних объектов, {impact.affectedSystems} систем, {impact.affectedEquipment} оборудования, {impact.affectedTechCards} техкарт.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmRetire}>Подтвердить</button><button type="button" onClick={onCancelRetire}>Отмена</button></div></div>; }
  if (notice.type === 'objectTypeRetireConfirm') { const impact = notice.impact; return <div className="notice-panel danger"><div><b>Отключение вида объекта</b><p>{impact.targetTypeName}: будет затронуто {impact.childTypeCount} дочерних видов и {impact.objectCount} объектов.</p></div><div className="notice-actions"><button type="button" className="danger-button" onClick={onConfirmObjectTypeRetire}>Подтвердить</button><button type="button" onClick={onDismiss}>Отмена</button></div></div>; }
  return <div className="notice-panel"><div><b>{notice.title}</b><p>{notice.message}</p></div><button type="button" onClick={onDismiss}>Закрыть</button></div>;
}
