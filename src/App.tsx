import { useMemo, useState } from 'react';
import {
  dictionaries as initialDictionaries,
  equipment as initialEquipment,
  infrastructureObjects as initialObjects,
  nsiSections,
  objectTypes as initialObjectTypes,
  systems as initialSystems,
  techCards as initialTechCards,
} from './data/nsiDemoData';
import { NsiLayout } from './components/layout/NsiLayout';
import type {
  CreateEntityKind,
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  EntityKind,
  InfrastructureObject,
  NsiSectionId,
  ObjectType,
  ParameterDefinition,
  ParameterGroupId,
  ParameterGroupView,
  PendingObjectDraft,
  SelectedRef,
  SystemEntity,
  TechCard,
  TreeActionId,
  TreeNode,
} from './types/nsi';
import {
  buildDescendantIds,
  buildObjectTypeDescendantIds,
  buildTreeNodes,
  filterTreeNodes,
  getObjectTypeRetireImpact,
  getRetireImpact,
  groupTreeNodes,
  isRoomType,
  resolveSelectedEntity,
} from './utils/nsiTree';

const tabs = ['Параметры', 'Документы', 'Заметки', 'Карта', 'Обслуживание'];

const parameterGroups: ParameterGroupView[] = [
  { id: 'main', title: 'Основные', hint: 'Идентификатор, наименование, вид, родитель, площадь и количество' },
  { id: 'relations', title: 'Связи', hint: 'Двусторонние связи через чекбоксы и массовый выбор' },
  { id: 'additional', title: 'Прочие', hint: 'Параметры по виду объекта и служебные признаки' },
];

const nextKindBySection: Record<NsiSectionId, EntityKind> = {
  objects: 'object',
  objectTypes: 'objectType',
  techCards: 'techCard',
  dictionaries: 'dictionary',
};

function App() {
  const [activeSectionId, setActiveSectionId] = useState<NsiSectionId>('objects');
  const [objects, setObjects] = useState<InfrastructureObject[]>(initialObjects);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>(initialObjectTypes);
  const [systems, setSystems] = useState<SystemEntity[]>(initialSystems);
  const [equipment, setEquipment] = useState<EquipmentEntity[]>(initialEquipment);
  const [techCards, setTechCards] = useState<TechCard[]>(initialTechCards);
  const [dictionaries] = useState<DictionaryItem[]>(initialDictionaries);
  const [selectedRef, setSelectedRef] = useState<SelectedRef>({ kind: 'object', id: 'obj-root' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [activeTab, setActiveTab] = useState('Параметры');
  const [activeGroupId, setActiveGroupId] = useState<ParameterGroupId>('main');
  const [showEmpty, setShowEmpty] = useState(true);
  const [draggedRef, setDraggedRef] = useState<SelectedRef | null>(null);
  const [pendingMoveRef, setPendingMoveRef] = useState<SelectedRef | null>(null);
  const [pendingObjectDraft, setPendingObjectDraft] = useState<PendingObjectDraft | null>(null);
  const [detailsNotice, setDetailsNotice] = useState<DetailsNotice | null>(null);

  const activeSection = nsiSections.find((section) => section.id === activeSectionId) ?? nsiSections[0];
  const treeNodes = useMemo(
    () => buildTreeNodes(activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes),
    [activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes],
  );
  const filteredTreeNodes = useMemo(() => filterTreeNodes(treeNodes, searchQuery), [treeNodes, searchQuery]);
  const childrenByParentId = useMemo(() => groupTreeNodes(filteredTreeNodes, sortAscending), [filteredTreeNodes, sortAscending]);
  const selectedEntity = useMemo(
    () => resolveSelectedEntity(selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes),
    [selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes],
  );

  const resetRightPanel = () => {
    setPendingObjectDraft(null);
    setDetailsNotice(null);
    setActiveTab('Параметры');
    setActiveGroupId('main');
  };

  const selectSection = (sectionId: NsiSectionId) => {
    const nextNodes = buildTreeNodes(sectionId, objects, systems, equipment, techCards, dictionaries, objectTypes);
    setActiveSectionId(sectionId);
    setSelectedRef({ kind: nextKindBySection[sectionId], id: nextNodes[0]?.id ?? '' });
    setSearchQuery('');
    setExpandedIds(new Set());
    setPendingMoveRef(null);
    resetRightPanel();
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedRef({ kind: node.entityKind, id: node.id });
    setPendingObjectDraft(null);
    setActiveTab('Параметры');
    setActiveGroupId('main');
  };

  const pickDefaultTypeId = (kind: Extract<CreateEntityKind, 'childObject' | 'room'>, parentObjectId: string | null) => {
    if (kind === 'room') return objectTypes.find((type) => type.code === 'ROOM')?.id ?? objectTypes[0]?.id ?? '';
    const parentObject = objects.find((item) => item.id === parentObjectId);
    const parentType = objectTypes.find((type) => type.id === parentObject?.typeId);
    const allowedType = parentType?.allowedChildTypeIds
      .map((id) => objectTypes.find((type) => type.id === id))
      .find((type): type is ObjectType => Boolean(type) && type.code !== 'SYSTEM' && type.code !== 'EQUIPMENT');
    return allowedType?.id ?? objectTypes.find((type) => type.code !== 'SYSTEM' && type.code !== 'EQUIPMENT')?.id ?? objectTypes[0]?.id ?? '';
  };

  const startObjectDraft = (kind: Extract<CreateEntityKind, 'childObject' | 'room'>, parentObjectId?: string | null) => {
    const parentId = parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : null);
    setPendingObjectDraft({
      kind,
      parentObjectId: parentId,
      name: kind === 'room' ? 'Новое помещение' : 'Новый объект учета',
      shortName: kind === 'room' ? 'Помещение' : 'Новый',
      typeId: pickDefaultTypeId(kind, parentId),
      area: null,
      quantity: 1,
      unit: kind === 'room' ? 'помещение' : 'ед.',
    });
    setDetailsNotice({
      type: 'editHint',
      title: 'Создание объекта учета',
      message: 'Выберите вид объекта в правой карточке. Если нужного вида нет, создайте его из этой же карточки.',
    });
  };

  const createObjectTypeSeed = (parentTypeId: string | null, name = 'Новый вид объекта'): ObjectType => {
    const createdAt = Date.now();
    const nameParamId = `param-name-${createdAt}`;
    return {
      id: `type-${createdAt}`,
      name,
      code: `TYPE_${createdAt}`,
      shortName: 'Новый',
      icon: '□',
      parentTypeId,
      allowedChildTypeIds: [],
      parameterGroups: [{ id: `group-main-${createdAt}`, name: 'Основные', parameterIds: [nameParamId] }],
      parameters: [{ id: nameParamId, name: 'Наименование', code: 'name', dataType: 'string', unit: '', required: true, showInTree: true, defaultValue: '' }],
      canCreateObjects: true,
      canEditObjects: true,
      canRetireObjects: true,
    };
  };

  const addObjectType = (parentTypeId: string | null, name?: string) => {
    const nextType = createObjectTypeSeed(parentTypeId, name);
    setObjectTypes((prev) => [
      ...prev.map((type) =>
        parentTypeId && type.id === parentTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type,
      ),
      nextType,
    ]);
    setSelectedRef({ kind: 'objectType', id: nextType.id });
    setActiveSectionId('objectTypes');
    setActiveTab('Параметры');
    setActiveGroupId('main');
    if (parentTypeId) setExpandedIds((prev) => new Set(prev).add(parentTypeId));
    return nextType;
  };

  const createObjectTypeForDraft = () => {
    if (!pendingObjectDraft) return;
    const parentObject = objects.find((item) => item.id === pendingObjectDraft.parentObjectId);
    const nextType = createObjectTypeSeed(parentObject?.typeId ?? null, 'Новый вид для объекта');
    setObjectTypes((prev) => [
      ...prev.map((type) =>
        parentObject?.typeId && type.id === parentObject.typeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type,
      ),
      nextType,
    ]);
    setPendingObjectDraft((prev) => (prev ? { ...prev, typeId: nextType.id } : prev));
    setDetailsNotice({ type: 'editHint', title: 'Создан новый вид объекта', message: 'Новый вид добавлен в Дерево видов объектов и выбран для создаваемого объекта учета.' });
  };

  const confirmCreateObject = () => {
    if (!pendingObjectDraft) return;
    const id = `obj-${Date.now()}`;
    setObjects((prev) => [
      ...prev,
      {
        id,
        name: pendingObjectDraft.name,
        shortName: pendingObjectDraft.shortName,
        typeId: pendingObjectDraft.typeId,
        parentId: pendingObjectDraft.parentObjectId,
        area: pendingObjectDraft.area,
        quantity: pendingObjectDraft.quantity,
        unit: pendingObjectDraft.unit,
        status: 'active',
        parameters: {},
      },
    ]);
    setSelectedRef({ kind: 'object', id });
    if (pendingObjectDraft.parentObjectId) setExpandedIds((prev) => new Set(prev).add(pendingObjectDraft.parentObjectId as string));
    resetRightPanel();
  };

  const handleCreate = (kind: CreateEntityKind, parentObjectId?: string | null) => {
    if (kind === 'childObject' || kind === 'room') {
      startObjectDraft(kind, parentObjectId);
      return;
    }

    const parentId = parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : null);
    const parent = objects.find((item) => item.id === parentId);
    const createdAt = Date.now();

    if (kind === 'system') {
      const id = `sys-${createdAt}`;
      setSystems((prev) => [
        ...prev,
        {
          id,
          name: 'Новая система',
          typeId: objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? 'type-system',
          parentSystemId: null,
          scopeType: 'objectNode',
          scopeObjectIds: parentId ? [parentId] : [],
          linkedRoomIds: parent && isRoomType(parent.typeId, objectTypes) ? [parent.id] : [],
          equipmentIds: [],
          quantity: 1,
          unit: 'система',
          parameters: { serviceZone: parent?.name ?? 'Не задано', criticality: null },
        },
      ]);
      setActiveGroupId('relations');
      setDetailsNotice({ type: 'editHint', title: 'Система добавлена', message: 'Новая система создана отдельной сущностью и привязана к выбранной области.' });
      return;
    }

    const id = `eq-${createdAt}`;
    const fallbackSystemId = systems[0]?.id ?? `sys-auto-${createdAt}`;
    const placementObjectId = parentId ?? objects[0]?.id ?? 'obj-root';

    if (systems.length === 0) {
      setSystems([
        {
          id: fallbackSystemId,
          name: 'Система для оборудования',
          typeId: objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? 'type-system',
          parentSystemId: null,
          scopeType: 'objectNode',
          scopeObjectIds: [placementObjectId],
          linkedRoomIds: [],
          equipmentIds: [id],
          quantity: 1,
          unit: 'система',
          parameters: { serviceZone: 'Создано автоматически для оборудования', criticality: null },
        },
      ]);
    } else {
      setSystems((prev) => prev.map((system) => (system.id === fallbackSystemId ? { ...system, equipmentIds: [...system.equipmentIds, id] } : system)));
    }

    setEquipment((prev) => [
      ...prev,
      {
        id,
        name: 'Новое оборудование',
        typeId: objectTypes.find((type) => type.code === 'EQUIPMENT')?.id ?? 'type-equipment',
        parentEquipmentId: null,
        systemId: fallbackSystemId,
        placementObjectId,
        quantity: 1,
        unit: 'шт.',
        parameters: { manufacturer: null, inventoryNumber: null },
      },
    ]);
    setActiveGroupId('relations');
    setDetailsNotice({ type: 'editHint', title: 'Оборудование добавлено', message: 'Оборудование создано отдельной сущностью с systemId и placementObjectId.' });
  };

  const copyObject = (objectId: string) => {
    const source = objects.find((item) => item.id === objectId);
    if (!source) return;
    const id = `obj-copy-${Date.now()}`;
    setObjects((prev) => [...prev, { ...source, id, name: `${source.name} копия`, shortName: `${source.shortName} коп.` }]);
    setSelectedRef({ kind: 'object', id });
    if (source.parentId) setExpandedIds((prev) => new Set(prev).add(source.parentId as string));
  };

  const copyObjectType = (typeId: string) => {
    const source = objectTypes.find((item) => item.id === typeId);
    if (!source) return;
    const createdAt = Date.now();
    const idMap = new Map(source.parameters.map((parameter) => [parameter.id, `${parameter.id}-copy-${createdAt}`]));
    const nextType: ObjectType = {
      ...source,
      id: `type-copy-${createdAt}`,
      name: `${source.name} копия`,
      code: `${source.code}_COPY_${createdAt}`,
      shortName: `${source.shortName} коп.`,
      parameterGroups: source.parameterGroups.map((group) => ({ ...group, id: `${group.id}-copy-${createdAt}`, parameterIds: group.parameterIds.map((id) => idMap.get(id) ?? id) })),
      parameters: source.parameters.map((parameter) => ({ ...parameter, id: idMap.get(parameter.id) ?? `${parameter.id}-copy-${createdAt}` })),
    };
    setObjectTypes((prev) => [...prev, nextType]);
    setSelectedRef({ kind: 'objectType', id: nextType.id });
  };

  const requestRetireObject = (objectId: string) => {
    const impact = getRetireImpact(objectId, objects, systems, equipment, techCards);
    if (impact) setDetailsNotice({ type: 'retireConfirm', impact });
    setSelectedRef({ kind: 'object', id: objectId });
  };

  const confirmRetireObject = () => {
    if (!detailsNotice || detailsNotice.type !== 'retireConfirm') return;
    setObjects((prev) => prev.map((item) => (detailsNotice.impact.affectedObjectIds.includes(item.id) ? { ...item, status: 'retired' } : item)));
    setDetailsNotice(null);
  };

  const requestRetireObjectType = (typeId: string) => {
    const impact = getObjectTypeRetireImpact(typeId, objectTypes, objects);
    if (impact) setDetailsNotice({ type: 'objectTypeRetireConfirm', impact });
    setSelectedRef({ kind: 'objectType', id: typeId });
  };

  const confirmRetireObjectType = () => {
    if (!detailsNotice || detailsNotice.type !== 'objectTypeRetireConfirm') return;
    const typeIds = [detailsNotice.impact.targetTypeId, ...buildObjectTypeDescendantIds(objectTypes, detailsNotice.impact.targetTypeId)];
    setObjectTypes((prev) => prev.map((type) => (typeIds.includes(type.id) ? { ...type, canCreateObjects: false, canEditObjects: false, canRetireObjects: false } : type)));
    setDetailsNotice(null);
  };

  const moveSelectedRefToNode = (sourceRef: SelectedRef, targetNode: TreeNode) => {
    if (sourceRef.kind !== targetNode.entityKind) {
      setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя переносить элементы между разными деревьями.' });
      return;
    }
    if (sourceRef.id === targetNode.id) {
      setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести элемент внутрь самого себя.' });
      return;
    }
    if (sourceRef.kind === 'object') {
      const descendants = buildDescendantIds(objects, sourceRef.id);
      if (descendants.includes(targetNode.id)) {
        setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести объект внутрь собственного дочернего элемента.' });
        return;
      }
      setObjects((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentId: targetNode.id } : item)));
    }
    if (sourceRef.kind === 'objectType') {
      const descendants = buildObjectTypeDescendantIds(objectTypes, sourceRef.id);
      if (descendants.includes(targetNode.id)) {
        setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести вид объекта внутрь собственного дочернего вида.' });
        return;
      }
      setObjectTypes((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentTypeId: targetNode.id } : item)));
    }
    setExpandedIds((prev) => new Set(prev).add(targetNode.id));
    setPendingMoveRef(null);
    setDetailsNotice(null);
  };

  const startMove = (ref: SelectedRef) => {
    setPendingMoveRef(ref);
    setSelectedRef(ref);
    setDetailsNotice({ type: 'moveMode', title: 'Режим переноса', message: ref.kind === 'objectType' ? 'Выберите новый родительский вид объекта.' : 'Выберите новый родительский объект.' });
  };

  const handleTreeAction = (node: TreeNode, actionId: TreeActionId) => {
    const actualNode = treeNodes.find((item) => item.entityKind === node.entityKind && item.id === node.id) ?? node;
    handleSelectNode(actualNode);
    if (actionId === 'edit') {
      setDetailsNotice({ type: 'editHint', title: 'Редактирование открыто в карточке', message: 'Поля выбранного элемента меняются справа во вкладке Параметры.' });
      return;
    }
    if (actualNode.entityKind === 'object') {
      if (actionId === 'move') startMove({ kind: 'object', id: actualNode.id });
      if (actionId === 'retire') requestRetireObject(actualNode.id);
      if (actionId === 'copy') copyObject(actualNode.id);
      return;
    }
    if (actualNode.entityKind === 'objectType') {
      if (actionId === 'add') addObjectType(actualNode.id, 'Новый дочерний вид');
      if (actionId === 'move') startMove({ kind: 'objectType', id: actualNode.id });
      if (actionId === 'retire') requestRetireObjectType(actualNode.id);
      if (actionId === 'copy') copyObjectType(actualNode.id);
    }
  };

  return (
    <NsiLayout
      sections={nsiSections}
      activeSection={activeSection}
      activeSectionId={activeSectionId}
      searchQuery={searchQuery}
      sortAscending={sortAscending}
      childrenByParentId={childrenByParentId}
      expandedIds={expandedIds}
      selectedRef={selectedRef}
      selectedEntity={selectedEntity}
      pendingMoveRef={pendingMoveRef}
      pendingObjectDraft={pendingObjectDraft}
      activeTab={activeTab}
      tabs={tabs}
      activeGroupId={activeGroupId}
      parameterGroups={parameterGroups}
      showEmpty={showEmpty}
      detailsNotice={detailsNotice}
      objects={objects}
      objectTypes={objectTypes}
      systems={systems}
      equipment={equipment}
      techCards={techCards}
      dictionaries={dictionaries}
      onSelectSection={selectSection}
      onSetSearchQuery={setSearchQuery}
      onToggleSort={() => setSortAscending((value) => !value)}
      onToggleExpanded={toggleExpanded}
      onSelectNode={handleSelectNode}
      onStartDrag={(node) => setDraggedRef({ kind: node.entityKind, id: node.id })}
      onDropOnNode={(node) => {
        if (!draggedRef) return;
        moveSelectedRefToNode(draggedRef, node);
        setDraggedRef(null);
      }}
      onCreate={handleCreate}
      onTreeAction={handleTreeAction}
      onMoveToNode={(node) => pendingMoveRef && moveSelectedRefToNode(pendingMoveRef, node)}
      onCancelMove={() => {
        setPendingMoveRef(null);
        setDetailsNotice(null);
      }}
      onSetActiveTab={setActiveTab}
      onSetActiveGroupId={setActiveGroupId}
      onSetShowEmpty={setShowEmpty}
      onDismissNotice={() => setDetailsNotice(null)}
      onConfirmRetire={confirmRetireObject}
      onCancelRetire={() => setDetailsNotice(null)}
      onConfirmObjectTypeRetire={confirmRetireObjectType}
      onUpdatePendingObjectDraft={(patch) => setPendingObjectDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
      onConfirmCreateObject={confirmCreateObject}
      onCancelPendingObjectDraft={resetRightPanel}
      onCreateObjectTypeForDraft={createObjectTypeForDraft}
      onUpdateObject={(id, patch) => setObjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onUpdateObjectType={(id, patch) => setObjectTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onToggleAllowedChildType={(typeId, childTypeId) => {
        setObjectTypes((prev) =>
          prev.map((type) => {
            if (type.id !== typeId) return type;
            const exists = type.allowedChildTypeIds.includes(childTypeId);
            return { ...type, allowedChildTypeIds: exists ? type.allowedChildTypeIds.filter((id) => id !== childTypeId) : [...type.allowedChildTypeIds, childTypeId] };
          }),
        );
      }}
      onAddParameterGroup={(typeId) => {
        const id = `group-${Date.now()}`;
        setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameterGroups: [...type.parameterGroups, { id, name: 'Новая группа', parameterIds: [] }] } : type)));
      }}
      onRenameParameterGroup={(typeId, groupId, name) =>
        setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameterGroups: type.parameterGroups.map((group) => (group.id === groupId ? { ...group, name } : group)) } : type)))
      }
      onAddParameterToGroup={(typeId, groupId) => {
        const createdAt = Date.now();
        const parameter: ParameterDefinition = { id: `param-${createdAt}`, name: 'Новый параметр', code: `param_${createdAt}`, dataType: 'string', unit: '', required: false, showInTree: false, defaultValue: null };
        setObjectTypes((prev) =>
          prev.map((type) =>
            type.id === typeId
              ? { ...type, parameters: [...type.parameters, parameter], parameterGroups: type.parameterGroups.map((group) => (group.id === groupId ? { ...group, parameterIds: [...group.parameterIds, parameter.id] } : group)) }
              : type,
          ),
        );
      }}
      onUpdateParameter={(typeId, parameterId, patch) =>
        setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameters: type.parameters.map((parameter) => (parameter.id === parameterId ? { ...parameter, ...patch } : parameter)) } : type)))
      }
      onDeleteParameter={(typeId, parameterId) =>
        setObjectTypes((prev) =>
          prev.map((type) =>
            type.id === typeId
              ? { ...type, parameters: type.parameters.filter((parameter) => parameter.id !== parameterId), parameterGroups: type.parameterGroups.map((group) => ({ ...group, parameterIds: group.parameterIds.filter((id) => id !== parameterId) })) }
              : type,
          ),
        )
      }
      onToggleObjectSystemLink={(objectId, systemId) => {
        setSystems((prev) =>
          prev.map((system) => {
            if (system.id !== systemId) return system;
            const targetObject = objects.find((item) => item.id === objectId);
            const roomLink = system.linkedRoomIds.includes(objectId);
            const scopeLink = system.scopeObjectIds.includes(objectId);
            if (targetObject && isRoomType(targetObject.typeId, objectTypes)) {
              return { ...system, linkedRoomIds: roomLink ? system.linkedRoomIds.filter((id) => id !== objectId) : [...system.linkedRoomIds, objectId] };
            }
            return { ...system, scopeObjectIds: scopeLink ? system.scopeObjectIds.filter((id) => id !== objectId) : [...system.scopeObjectIds, objectId] };
          }),
        );
      }}
      onToggleEquipmentPlacement={(objectId, equipmentId) => setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, placementObjectId: objectId } : item)))}
      onToggleSystemRoomLink={(systemId, roomId) => {
        setSystems((prev) =>
          prev.map((system) => {
            if (system.id !== systemId) return system;
            const exists = system.linkedRoomIds.includes(roomId);
            return { ...system, linkedRoomIds: exists ? system.linkedRoomIds.filter((id) => id !== roomId) : [...system.linkedRoomIds, roomId] };
          }),
        );
      }}
      onBulkLinkRoomsToSystem={(systemId, roomIds) =>
        setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system)))
      }
      onUpdateTechCard={(id, patch) => setTechCards((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    />
  );
}

export default App;
