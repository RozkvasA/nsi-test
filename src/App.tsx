import { useMemo, useState } from 'react';
import {
  dictionaries as initialDictionaries,
  equipment as initialEquipment,
  infrastructureObjects as initialObjects,
  nsiSections,
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
  ParameterGroupId,
  ParameterGroupView,
  SelectedRef,
  SystemEntity,
  TechCard,
  TreeActionId,
  TreeNode,
} from './types/nsi';
import {
  buildDescendantIds,
  buildTreeNodes,
  filterTreeNodes,
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
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [pendingMoveObjectId, setPendingMoveObjectId] = useState<string | null>(null);
  const [detailsNotice, setDetailsNotice] = useState<DetailsNotice | null>(null);

  const activeSection = nsiSections.find((section) => section.id === activeSectionId) ?? nsiSections[0];

  const treeNodes = useMemo(
    () => buildTreeNodes(activeSectionId, objects, systems, equipment, techCards, dictionaries),
    [activeSectionId, objects, systems, equipment, techCards, dictionaries],
  );

  const filteredTreeNodes = useMemo(() => filterTreeNodes(treeNodes, searchQuery), [searchQuery, treeNodes]);

  const childrenByParentId = useMemo(() => groupTreeNodes(filteredTreeNodes, sortAscending), [filteredTreeNodes, sortAscending]);

  const selectedEntity = useMemo(
    () => resolveSelectedEntity(selectedRef, objects, systems, equipment, techCards, dictionaries),
    [selectedRef, objects, systems, equipment, techCards, dictionaries],
  );

  const selectSection = (sectionId: NsiSectionId) => {
    const nextNodes = buildTreeNodes(sectionId, objects, systems, equipment, techCards, dictionaries);
    setActiveSectionId(sectionId);
    setSelectedRef({ kind: nextKindBySection[sectionId], id: nextNodes[0]?.id ?? '' });
    setActiveTab('Параметры');
    setActiveGroupId('main');
    setSearchQuery('');
    setExpandedIds(new Set());
    setPendingMoveObjectId(null);
    setDetailsNotice(null);
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedRef({ kind: node.entityKind, id: node.id });
    setActiveTab('Параметры');
    setActiveGroupId('main');
  };

  const getParentObjectId = (parentObjectId?: string | null) => parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : null);

  const handleCreate = (kind: CreateEntityKind, parentObjectId?: string | null) => {
    const parentId = getParentObjectId(parentObjectId);
    const parent = objects.find((item) => item.id === parentId);
    const createdAt = Date.now();

    if (kind === 'system') {
      const id = `sys-${createdAt}`;
      setSystems((prev) => [
        ...prev,
        {
          id,
          name: 'Новая система',
          typeId: 'type-system',
          parentSystemId: null,
          scopeType: 'objectNode',
          scopeObjectIds: parentId ? [parentId] : [],
          linkedRoomIds: parent && isRoomType(parent.typeId) ? [parent.id] : [],
          equipmentIds: [],
          quantity: 1,
          unit: 'система',
          parameters: { serviceZone: parent?.name ?? 'Не задано', criticality: null },
        },
      ]);
      setActiveGroupId('relations');
      setDetailsNotice({
        type: 'editHint',
        title: 'Система добавлена',
        message: 'Новая система создана отдельной сущностью и привязана к выбранной области. Она не добавлена строкой внутрь помещения.',
      });
      return;
    }

    if (kind === 'equipment') {
      const id = `eq-${createdAt}`;
      const fallbackSystemId = systems[0]?.id ?? `sys-auto-${createdAt}`;
      const placementObjectId = parentId ?? objects[0]?.id ?? 'obj-root';

      if (systems.length === 0) {
        setSystems([
          {
            id: fallbackSystemId,
            name: 'Система для оборудования',
            typeId: 'type-system',
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
          typeId: 'type-equipment',
          parentEquipmentId: null,
          systemId: fallbackSystemId,
          placementObjectId,
          quantity: 1,
          unit: 'шт.',
          parameters: { manufacturer: null, inventoryNumber: null },
        },
      ]);
      setActiveGroupId('relations');
      setDetailsNotice({
        type: 'editHint',
        title: 'Оборудование добавлено',
        message: 'Оборудование создано отдельной сущностью с systemId и placementObjectId. В карточке выбранного объекта его видно в связанных сущностях.',
      });
      return;
    }

    const id = `obj-${createdAt}`;
    const isRoom = kind === 'room';
    const nextObject: InfrastructureObject = {
      id,
      name: isRoom ? 'Новое помещение' : 'Новый объект учета',
      shortName: isRoom ? 'Помещение' : 'Новый',
      typeId: isRoom ? 'type-room' : parent?.typeId === 'type-infrastructure-object' ? 'type-level' : 'type-zone',
      parentId,
      area: null,
      quantity: 1,
      unit: isRoom ? 'помещение' : 'ед.',
      status: 'active',
      parameters: {},
    };

    setObjects((prev) => [...prev, nextObject]);
    setSelectedRef({ kind: 'object', id });
    setActiveTab('Параметры');
    setActiveGroupId('main');
    if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
    setDetailsNotice(null);
  };

  const handleCopyObject = (objectId: string) => {
    const source = objects.find((item) => item.id === objectId);
    if (!source) return;

    const id = `obj-copy-${Date.now()}`;
    setObjects((prev) => [
      ...prev,
      {
        ...source,
        id,
        name: `${source.name} копия`,
        shortName: `${source.shortName} коп.`,
      },
    ]);
    setSelectedRef({ kind: 'object', id });
    const parentId = source.parentId;
    if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const requestRetireObject = (objectId: string) => {
    const impact = getRetireImpact(objectId, objects, systems, equipment, techCards);
    if (!impact) return;
    setSelectedRef({ kind: 'object', id: objectId });
    setActiveTab('Параметры');
    setDetailsNotice({ type: 'retireConfirm', impact });
  };

  const confirmRetireObject = () => {
    if (!detailsNotice || detailsNotice.type !== 'retireConfirm') return;

    setObjects((prev) =>
      prev.map((item) => (detailsNotice.impact.affectedObjectIds.includes(item.id) ? { ...item, status: 'retired' } : item)),
    );
    setDetailsNotice(null);
  };

  const startMoveObject = (objectId: string) => {
    const selectedObject = objects.find((item) => item.id === objectId);
    setPendingMoveObjectId(objectId);
    setSelectedRef({ kind: 'object', id: objectId });
    setDetailsNotice({
      type: 'moveMode',
      title: 'Режим переноса',
      message: selectedObject ? `Выберите новый родительский объект для ${selectedObject.name}.` : 'Выберите новый родительский объект.',
    });
  };

  const moveObjectTo = (targetId: string) => {
    if (!pendingMoveObjectId) return;
    if (pendingMoveObjectId === targetId) {
      setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести элемент внутрь самого себя.' });
      return;
    }

    const descendants = buildDescendantIds(objects, pendingMoveObjectId);
    if (descendants.includes(targetId)) {
      setDetailsNotice({
        type: 'moveBlocked',
        title: 'Перенос невозможен',
        message: 'Нельзя перенести элемент внутрь собственного дочернего элемента. Выберите другой родительский объект.',
      });
      return;
    }

    setObjects((prev) => prev.map((item) => (item.id === pendingMoveObjectId ? { ...item, parentId: targetId } : item)));
    setExpandedIds((prev) => new Set(prev).add(targetId));
    setPendingMoveObjectId(null);
    setDetailsNotice(null);
  };

  const handleDropOnObject = (targetId: string) => {
    if (!draggedObjectId) return;
    if (draggedObjectId === targetId) {
      setDraggedObjectId(null);
      setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести элемент внутрь самого себя.' });
      return;
    }

    const descendants = buildDescendantIds(objects, draggedObjectId);
    if (descendants.includes(targetId)) {
      setDraggedObjectId(null);
      setDetailsNotice({
        type: 'moveBlocked',
        title: 'Перенос невозможен',
        message: 'Нельзя перенести элемент внутрь собственного дочернего элемента. Дерево оставлено без изменений.',
      });
      return;
    }

    setObjects((prev) => prev.map((item) => (item.id === draggedObjectId ? { ...item, parentId: targetId } : item)));
    setDraggedObjectId(null);
    setExpandedIds((prev) => new Set(prev).add(targetId));
    setDetailsNotice(null);
  };

  const handleTreeAction = (node: TreeNode, actionId: TreeActionId) => {
    const actualNode = treeNodes.find((item) => item.entityKind === node.entityKind && item.id === node.id) ?? node;
    handleSelectNode(actualNode);

    if (actionId === 'edit') {
      setDetailsNotice({
        type: 'editHint',
        title: 'Редактирование открыто в карточке',
        message: 'Поля выбранного элемента меняются справа во вкладке Параметры, без отдельного модального окна.',
      });
      return;
    }

    if (actualNode.entityKind !== 'object') return;

    if (actionId === 'move') startMoveObject(actualNode.id);
    if (actionId === 'retire') requestRetireObject(actualNode.id);
    if (actionId === 'copy') handleCopyObject(actualNode.id);
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
      pendingMoveObjectId={pendingMoveObjectId}
      activeTab={activeTab}
      tabs={tabs}
      activeGroupId={activeGroupId}
      parameterGroups={parameterGroups}
      showEmpty={showEmpty}
      detailsNotice={detailsNotice}
      objects={objects}
      systems={systems}
      equipment={equipment}
      techCards={techCards}
      dictionaries={dictionaries}
      onSelectSection={selectSection}
      onSetSearchQuery={setSearchQuery}
      onToggleSort={() => setSortAscending((value) => !value)}
      onToggleExpanded={toggleExpanded}
      onSelectNode={handleSelectNode}
      onStartDrag={setDraggedObjectId}
      onDropOnObject={handleDropOnObject}
      onCreate={handleCreate}
      onTreeAction={handleTreeAction}
      onMoveToObject={moveObjectTo}
      onCancelMove={() => {
        setPendingMoveObjectId(null);
        setDetailsNotice(null);
      }}
      onSetActiveTab={setActiveTab}
      onSetActiveGroupId={setActiveGroupId}
      onSetShowEmpty={setShowEmpty}
      onDismissNotice={() => setDetailsNotice(null)}
      onConfirmRetire={confirmRetireObject}
      onCancelRetire={() => setDetailsNotice(null)}
      onUpdateObject={(id, patch) => setObjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onToggleObjectSystemLink={(objectId, systemId) => {
        setSystems((prev) =>
          prev.map((system) => {
            if (system.id !== systemId) return system;
            const targetObject = objects.find((item) => item.id === objectId);
            const roomLink = system.linkedRoomIds.includes(objectId);
            const scopeLink = system.scopeObjectIds.includes(objectId);

            if (targetObject && isRoomType(targetObject.typeId)) {
              return {
                ...system,
                linkedRoomIds: roomLink ? system.linkedRoomIds.filter((id) => id !== objectId) : [...system.linkedRoomIds, objectId],
              };
            }

            return {
              ...system,
              scopeObjectIds: scopeLink ? system.scopeObjectIds.filter((id) => id !== objectId) : [...system.scopeObjectIds, objectId],
            };
          }),
        );
      }}
      onToggleEquipmentPlacement={(objectId, equipmentId) => {
        setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, placementObjectId: objectId } : item)));
      }}
      onToggleSystemRoomLink={(systemId, roomId) => {
        setSystems((prev) =>
          prev.map((system) => {
            if (system.id !== systemId) return system;
            const exists = system.linkedRoomIds.includes(roomId);
            return {
              ...system,
              linkedRoomIds: exists ? system.linkedRoomIds.filter((id) => id !== roomId) : [...system.linkedRoomIds, roomId],
            };
          }),
        );
      }}
      onBulkLinkRoomsToSystem={(systemId, roomIds) => {
        setSystems((prev) =>
          prev.map((system) =>
            system.id === systemId ? { ...system, linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system,
          ),
        );
      }}
      onUpdateTechCard={(id, patch) => setTechCards((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    />
  );
}

export default App;
