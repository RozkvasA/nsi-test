import { useMemo, useState } from 'react';
import {
  dictionaries as initialDictionaries,
  equipment as initialEquipment,
  infrastructureObjects as initialObjects,
  nsiSections,
  objectStructureTemplates as initialObjectStructureTemplates,
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
  ObjectStructureTemplate,
  ObjectType,
  ParameterDefinition,
  ParameterGroupId,
  ParameterGroupView,
  PendingObjectDraft,
  RootObjectCreationMode,
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
import { buildObjectsFromTemplate, normalizeDetailLevel } from './utils/nsiObjectTemplates';
import { createEquipmentEntity } from './utils/nsiEquipment';
import { createSystemEntity } from './utils/nsiSystems';

const tabs = ['Параметры', 'Документы', 'Заметки', 'Карта', 'Обслуживание'];

const parameterGroups: ParameterGroupView[] = [
  { id: 'main', title: 'Основные', hint: 'Идентификатор, наименование, вид, родитель, площадь и количество' },
  { id: 'relations', title: 'Связи', hint: 'Двусторонние связи через чекбоксы и массовый выбор' },
  { id: 'additional', title: 'Прочие', hint: 'Параметры по виду объекта и служебные признаки' },
];

const nextKindBySection: Record<NsiSectionId, EntityKind> = { overview: 'object', objects: 'object', objectTypes: 'objectType', techCards: 'techCard', dictionaries: 'dictionary' };

function App() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<NsiSectionId>('overview');
  const [objects, setObjects] = useState<InfrastructureObject[]>(initialObjects);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>(initialObjectTypes);
  const [objectStructureTemplates] = useState<ObjectStructureTemplate[]>(initialObjectStructureTemplates);
  const [systems, setSystems] = useState<SystemEntity[]>(initialSystems);
  const [equipment, setEquipment] = useState<EquipmentEntity[]>(initialEquipment);
  const [techCards, setTechCards] = useState<TechCard[]>(initialTechCards);
  const [dictionaries] = useState<DictionaryItem[]>(initialDictionaries);
  const [selectedRef, setSelectedRef] = useState<SelectedRef>({ kind: 'object', id: initialObjects[0]?.id ?? '' });
  const [selectedContextObjectId, setSelectedContextObjectId] = useState<string | null>(initialObjects[0]?.id ?? null);
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
  const treeNodes = useMemo(() => buildTreeNodes(activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes), [activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes]);
  const filteredTreeNodes = useMemo(() => filterTreeNodes(treeNodes, searchQuery), [treeNodes, searchQuery]);
  const childrenByParentId = useMemo(() => groupTreeNodes(filteredTreeNodes, sortAscending), [filteredTreeNodes, sortAscending]);
  const selectedEntity = useMemo(() => resolveSelectedEntity(selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes), [selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes]);

  const resetRightPanel = () => { setPendingObjectDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };

  const toggleDemoMode = () => {
    setPendingObjectDraft(null);
    setPendingMoveRef(null);
    setExpandedIds(new Set());
    setSearchQuery('');
    setActiveTab('Параметры');
    setActiveGroupId('main');
    setActiveSectionId('overview');

    if (isDemoMode) {
      setIsDemoMode(false);
      setObjects([]);
      setSystems([]);
      setEquipment([]);
      setTechCards([]);
      setSelectedRef({ kind: 'object', id: '' });
      setSelectedContextObjectId(null);
      setDetailsNotice({ type: 'editHint', title: 'Демо выключено', message: 'Объекты, системы, оборудование и техкарты очищены. Демо-режим сбрасывает текущие данные.' });
      return;
    }

    setIsDemoMode(true);
    setObjectTypes(initialObjectTypes);
    setObjects(initialObjects);
    setSystems(initialSystems);
    setEquipment(initialEquipment);
    setTechCards(initialTechCards);
    setSelectedRef({ kind: 'object', id: initialObjects[0]?.id ?? '' });
    setSelectedContextObjectId(initialObjects[0]?.id ?? null);
    setDetailsNotice({ type: 'editHint', title: 'Демо включено', message: 'Загружен демо-набор БЦ Lucky. Текущие данные были сброшены.' });
  };

  const selectSection = (sectionId: NsiSectionId) => {
    const nextNodes = buildTreeNodes(sectionId, objects, systems, equipment, techCards, dictionaries, objectTypes);
    const firstRootObject = objects.find((object) => object.parentId === null);
    setActiveSectionId(sectionId);
    setSelectedRef(sectionId === 'overview' ? { kind: 'object', id: firstRootObject?.id ?? '' } : { kind: nextKindBySection[sectionId], id: nextNodes[0]?.id ?? '' });
    setSelectedContextObjectId(sectionId === 'overview' ? firstRootObject?.id ?? null : sectionId === 'objects' ? nextNodes[0]?.id ?? null : selectedContextObjectId);
    setSearchQuery(''); setExpandedIds(new Set()); setPendingMoveRef(null); resetRightPanel();
  };

  const toggleExpanded = (nodeId: string) => setExpandedIds((prev) => { const next = new Set(prev); next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId); return next; });

  const handleSelectNode = (node: TreeNode) => { setSelectedRef({ kind: node.entityKind, id: node.id }); if (node.entityKind === 'object') setSelectedContextObjectId(node.id); setPendingObjectDraft(null); setActiveTab('Параметры'); setActiveGroupId('main'); };
  const handleSelectSystem = (systemId: string, contextObjectId?: string | null) => { setSelectedRef({ kind: 'system', id: systemId }); if (contextObjectId !== undefined) setSelectedContextObjectId(contextObjectId); setPendingObjectDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };
  const handleSelectEquipment = (equipmentId: string) => { const item = equipment.find((equipmentItem) => equipmentItem.id === equipmentId); setSelectedRef({ kind: 'equipment', id: equipmentId }); if (item?.placementObjectId) setSelectedContextObjectId(item.placementObjectId); setPendingObjectDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };
  const handleSelectTechCard = (techCardId: string) => { setSelectedRef({ kind: 'techCard', id: techCardId }); setPendingObjectDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };

  const pickDefaultTypeId = (kind: Extract<CreateEntityKind, 'rootObject' | 'childObject' | 'room'>, parentObjectId: string | null) => {
    const firstTypeId = objectTypes[0]?.id ?? '';
    if (kind === 'room') return objectTypes.find((objectType) => objectType.code === 'ROOM')?.id ?? firstTypeId;
    if (kind === 'rootObject') return objectStructureTemplates[0]?.rootTypeId ?? objectTypes.find((objectType) => objectType.code === 'INFRA_OBJECT')?.id ?? firstTypeId;
    const parentObject = objects.find((item) => item.id === parentObjectId);
    const parentType = objectTypes.find((objectType) => objectType.id === parentObject?.typeId);
    const allowedType = parentType?.allowedChildTypeIds.map((id) => objectTypes.find((objectType) => objectType.id === id)).find((objectType): objectType is ObjectType => objectType !== undefined && objectType.code !== 'SYSTEM' && objectType.code !== 'EQUIPMENT');
    const fallbackType = objectTypes.find((objectType) => objectType.code !== 'SYSTEM' && objectType.code !== 'EQUIPMENT');
    return allowedType?.id ?? fallbackType?.id ?? firstTypeId;
  };

  const startObjectDraft = (kind: Extract<CreateEntityKind, 'rootObject' | 'childObject' | 'room'>, parentObjectId?: string | null, creationMode: RootObjectCreationMode = 'empty') => {
    const parentId = kind === 'rootObject' ? null : parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : null);
    const defaultTemplate = objectStructureTemplates[0];
    setPendingObjectDraft({ kind, parentObjectId: parentId, name: kind === 'rootObject' ? 'Новый корневой объект' : kind === 'room' ? 'Новое помещение' : 'Новый объект учета', shortName: kind === 'rootObject' ? 'Объект' : kind === 'room' ? 'Помещение' : 'Новый', typeId: pickDefaultTypeId(kind, parentId), area: null, quantity: 1, unit: kind === 'rootObject' ? 'объект' : kind === 'room' ? 'помещение' : 'ед.', creationMode, templateId: defaultTemplate?.id ?? '', detailLevel: kind === 'rootObject' ? defaultTemplate?.detailLevel ?? 1 : 1 });
    setDetailsNotice({ type: 'editHint', title: 'Создание объекта учета', message: 'Выберите вид объекта или шаблон структуры в правой карточке. Если нужного вида нет, создайте его из этой же карточки.' });
  };

  const handleCreateRootFromTemplate = () => startObjectDraft('rootObject', null, 'template');

  const openObjectInTree = (objectId: string) => {
    const ancestorIds: string[] = [];
    let current = objects.find((object) => object.id === objectId);
    const visited = new Set<string>();
    while (current?.parentId) { if (visited.has(current.id)) break; visited.add(current.id); ancestorIds.push(current.parentId); current = objects.find((object) => object.id === current?.parentId); }
    setActiveSectionId('objects'); setSelectedRef({ kind: 'object', id: objectId }); setSelectedContextObjectId(objectId); setExpandedIds((prev) => new Set([...prev, ...ancestorIds])); setPendingMoveRef(null); resetRightPanel();
  };

  const createObjectTypeSeed = (parentTypeId: string | null, name = 'Новый вид объекта'): ObjectType => {
    const createdAt = Date.now(); const nameParamId = `param-name-${createdAt}`;
    return { id: `type-${createdAt}`, name, code: `TYPE_${createdAt}`, shortName: 'Новый', icon: '□', parentTypeId, allowedChildTypeIds: [], parameterGroups: [{ id: `group-main-${createdAt}`, name: 'Основные', parameterIds: [nameParamId] }], parameters: [{ id: nameParamId, name: 'Наименование', code: 'name', dataType: 'string', unit: '', required: true, showInTree: true, defaultValue: '' }], canCreateObjects: true, canEditObjects: true, canRetireObjects: true };
  };

  const addObjectType = (parentTypeId: string | null, name?: string) => { const nextType = createObjectTypeSeed(parentTypeId, name); setObjectTypes((prev) => [...prev.map((type) => parentTypeId && type.id === parentTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setSelectedRef({ kind: 'objectType', id: nextType.id }); setActiveSectionId('objectTypes'); setActiveTab('Параметры'); setActiveGroupId('main'); if (parentTypeId) setExpandedIds((prev) => new Set(prev).add(parentTypeId)); return nextType; };
  const createObjectTypeForDraft = () => { if (!pendingObjectDraft) return; const parentObject = objects.find((item) => item.id === pendingObjectDraft.parentObjectId); const nextType = createObjectTypeSeed(parentObject?.typeId ?? null, 'Новый вид для объекта'); setObjectTypes((prev) => [...prev.map((type) => parentObject?.typeId && type.id === parentObject.typeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setPendingObjectDraft((prev) => (prev ? { ...prev, typeId: nextType.id } : prev)); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид объекта', message: 'Новый вид добавлен в Дерево видов объектов и выбран для создаваемого объекта учета.' }); };
  const createSystemTypeForSystem = (systemId: string) => { const parentSystemTypeId = objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? null; const nextType = createObjectTypeSeed(parentSystemTypeId, 'Новый вид системы'); setObjectTypes((prev) => [...prev.map((type) => parentSystemTypeId && type.id === parentSystemTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, typeId: nextType.id } : system))); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид системы', message: 'Вид добавлен в Дерево видов объектов и выбран для текущей системы.' }); };
  const createEquipmentTypeForEquipment = (equipmentId: string) => { const parentEquipmentTypeId = objectTypes.find((type) => type.code === 'EQUIPMENT')?.id ?? null; const nextType = createObjectTypeSeed(parentEquipmentTypeId, 'Новый вид оборудования'); setObjectTypes((prev) => [...prev.map((type) => parentEquipmentTypeId && type.id === parentEquipmentTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, typeId: nextType.id } : item))); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид оборудования', message: 'Вид добавлен в Дерево видов объектов и выбран для текущего оборудования.' }); };

  const confirmCreateObject = () => {
    if (!pendingObjectDraft) return;
    if (pendingObjectDraft.kind === 'rootObject' && pendingObjectDraft.creationMode === 'template') {
      const template = objectStructureTemplates.find((item) => item.id === pendingObjectDraft.templateId);
      if (!template) { setDetailsNotice({ type: 'moveBlocked', title: 'Шаблон не найден', message: 'Выберите другой шаблон структуры объекта.' }); return; }
      const generated = buildObjectsFromTemplate(template, pendingObjectDraft.name, pendingObjectDraft.detailLevel);
      setObjects((prev) => [...prev, ...generated.objects]); setSelectedRef({ kind: 'object', id: generated.rootObjectId }); setSelectedContextObjectId(generated.rootObjectId); setExpandedIds((prev) => new Set([...prev, ...generated.expandedObjectIds, generated.rootObjectId])); resetRightPanel(); return;
    }
    const id = `obj-${Date.now()}`;
    setObjects((prev) => [...prev, { id, name: pendingObjectDraft.name, shortName: pendingObjectDraft.shortName, typeId: pendingObjectDraft.typeId, parentId: pendingObjectDraft.parentObjectId, area: pendingObjectDraft.area, quantity: pendingObjectDraft.quantity, unit: pendingObjectDraft.unit, status: 'active', parameters: pendingObjectDraft.kind === 'rootObject' ? { detailLevel: normalizeDetailLevel(pendingObjectDraft.detailLevel) } : {} }]);
    setSelectedRef({ kind: 'object', id }); setSelectedContextObjectId(id); if (pendingObjectDraft.parentObjectId) setExpandedIds((prev) => new Set(prev).add(pendingObjectDraft.parentObjectId as string)); resetRightPanel();
  };

  const ensureSystemForEquipment = (createdAt: number, placementObjectId: string) => { const selectedSystemId = selectedRef.kind === 'system' ? selectedRef.id : null; const existingSystemId = selectedSystemId ?? systems[0]?.id; if (existingSystemId) return existingSystemId; const fallbackSystemId = `sys-auto-${createdAt}`; setSystems([{ id: fallbackSystemId, name: 'Система для оборудования', typeId: objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? 'type-system', parentSystemId: null, scopeType: 'objectNode', scopeObjectIds: [placementObjectId], linkedRoomIds: [], equipmentIds: [], quantity: 1, unit: 'система', parameters: { serviceZone: 'Создано автоматически для оборудования', criticality: null } }]); return fallbackSystemId; };

  const handleCreate = (kind: CreateEntityKind, parentObjectId?: string | null) => {
    if (kind === 'rootObject' || kind === 'childObject' || kind === 'room') { startObjectDraft(kind, parentObjectId); return; }
    const parentId = parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId);
    const parent = objects.find((item) => item.id === parentId);
    const createdAt = Date.now();

    if (kind === 'system') {
      const system = createSystemEntity({ createdAt, typeId: objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? 'type-system', parentObject: parent ?? null, isRoom: parent ? isRoomType(parent.typeId, objectTypes) : false });
      setSystems((prev) => [...prev, system]); setSelectedRef({ kind: 'system', id: system.id }); setSelectedContextObjectId(parentId ?? null); setActiveTab('Параметры'); setActiveGroupId('main'); setDetailsNotice({ type: 'editHint', title: 'Система добавлена', message: 'Новая система создана отдельной сущностью и открыта в правой карточке.' }); return;
    }

    const placementObjectId = parentId ?? objects[0]?.id ?? '';
    const systemId = ensureSystemForEquipment(createdAt, placementObjectId);
    const equipmentItem = createEquipmentEntity({ createdAt, systemId, typeId: objectTypes.find((type) => type.code === 'EQUIPMENT')?.id ?? 'type-equipment', placementObjectId });
    setEquipment((prev) => [...prev, equipmentItem]);
    setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, equipmentItem.id])) } : system)));
    setSelectedRef({ kind: 'equipment', id: equipmentItem.id }); setSelectedContextObjectId(placementObjectId); setActiveTab('Параметры'); setActiveGroupId('main'); setDetailsNotice({ type: 'editHint', title: 'Оборудование добавлено', message: 'Оборудование создано как отдельная сущность внутри системы и открыто в карточке.' });
  };

  const addEquipmentToSystem = (systemId: string) => { const createdAt = Date.now(); const placementObjectId = selectedContextObjectId ?? objects[0]?.id ?? ''; const equipmentItem = createEquipmentEntity({ createdAt, systemId, typeId: objectTypes.find((type) => type.code === 'EQUIPMENT')?.id ?? 'type-equipment', placementObjectId }); setEquipment((prev) => [...prev, equipmentItem]); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, equipmentItem.id])) } : system))); setSelectedRef({ kind: 'equipment', id: equipmentItem.id }); setSelectedContextObjectId(placementObjectId); setActiveTab('Параметры'); setActiveGroupId('main'); };
  const addChildEquipment = (parentEquipmentId: string) => { const parent = equipment.find((item) => item.id === parentEquipmentId); if (!parent) return; const createdAt = Date.now(); const child = createEquipmentEntity({ createdAt, systemId: parent.systemId, typeId: parent.typeId || objectTypes.find((type) => type.code === 'EQUIPMENT')?.id || 'type-equipment', placementObjectId: parent.placementObjectId, parentEquipmentId, name: 'Дочернее оборудование' }); setEquipment((prev) => [...prev, child]); setSystems((prev) => prev.map((system) => (system.id === parent.systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, child.id])) } : system))); setSelectedRef({ kind: 'equipment', id: child.id }); setSelectedContextObjectId(child.placementObjectId); setActiveTab('Параметры'); };
  const detachEquipmentFromSystem = (systemId: string, equipmentId: string) => { setSelectedRef({ kind: 'equipment', id: equipmentId }); setDetailsNotice({ type: 'moveBlocked', title: 'Оборудование не отвязано', message: 'Оборудование не может существовать без системы. Откройте карточку оборудования и выберите другую систему.' }); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, equipmentIds: system.equipmentIds.filter((id) => id !== equipmentId) } : system))); };
  const createTechCardForEquipment = (equipmentId: string) => { const item = equipment.find((equipmentItem) => equipmentItem.id === equipmentId); if (!item) return; const createdAt = Date.now(); const card: TechCard = { id: `tc-eq-${createdAt}`, name: `Новая техкарта для ${item.name}`, type: '', targetType: 'equipment', targetId: item.id, targetObjectTypeId: item.typeId, workTypeId: '', inputDate: '', outputDate: '', periodicity: '', minExecutionInterval: '', minDurationManHours: null, operations: [], personnel: [], materials: [], ppe: [], isActive: false, isComplex: false }; setTechCards((prev) => [...prev, card]); setSelectedRef({ kind: 'techCard', id: card.id }); setActiveTab('Параметры'); setDetailsNotice({ type: 'editHint', title: 'Техкарта создана', message: 'Создан черновик техкарты для выбранного оборудования. Заполните обязательные поля перед вводом в работу.' }); };
  const linkSystemToContextObject = (systemId: string) => { const contextObject = selectedContextObjectId ? objects.find((object) => object.id === selectedContextObjectId) : null; if (!contextObject) return; setSystems((prev) => prev.map((system) => { if (system.id !== systemId) return system; if (isRoomType(contextObject.typeId, objectTypes)) return { ...system, scopeType: 'singleRoom', linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, contextObject.id])) }; return { ...system, scopeType: 'objectNode', scopeObjectIds: Array.from(new Set([...system.scopeObjectIds, contextObject.id])) }; })); };
  const linkSystemToRoomsInContext = (systemId: string) => { if (!selectedContextObjectId) return; const ids = [selectedContextObjectId, ...buildDescendantIds(objects, selectedContextObjectId)]; const roomIds = objects.filter((object) => ids.includes(object.id) && isRoomType(object.typeId, objectTypes)).map((object) => object.id); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, scopeType: 'multipleRooms', linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system))); };
  const copyObject = (objectId: string) => { const source = objects.find((item) => item.id === objectId); if (!source) return; const id = `obj-copy-${Date.now()}`; setObjects((prev) => [...prev, { ...source, id, name: `${source.name} копия`, shortName: `${source.shortName} копия`, parameters: { ...source.parameters }, status: 'active' }]); setSelectedRef({ kind: 'object', id }); setSelectedContextObjectId(id); };
  const copyObjectType = (typeId: string) => { const source = objectTypes.find((item) => item.id === typeId); if (!source) return; const createdAt = Date.now(); const copy: ObjectType = { ...source, id: `type-copy-${createdAt}`, name: `${source.name} копия`, code: `${source.code}_COPY_${createdAt}`, shortName: `${source.shortName} копия`, parentTypeId: source.parentTypeId, allowedChildTypeIds: [...source.allowedChildTypeIds], parameterGroups: source.parameterGroups.map((group) => ({ ...group, id: `${group.id}-copy-${createdAt}`, parameterIds: group.parameterIds.map((id) => `${id}-copy-${createdAt}`) })), parameters: source.parameters.map((parameter) => ({ ...parameter, id: `${parameter.id}-copy-${createdAt}`, code: `${parameter.code}_copy_${createdAt}` })) }; setObjectTypes((prev) => [...prev, copy]); setSelectedRef({ kind: 'objectType', id: copy.id }); };
  const requestRetireObject = (objectId: string) => { const impact = getRetireImpact(objectId, objects, systems, equipment, techCards); if (impact) setDetailsNotice({ type: 'retireConfirm', impact }); setSelectedRef({ kind: 'object', id: objectId }); setSelectedContextObjectId(objectId); };
  const confirmRetireObject = () => { if (!detailsNotice || detailsNotice.type !== 'retireConfirm') return; setObjects((prev) => prev.map((item) => (detailsNotice.impact.affectedObjectIds.includes(item.id) ? { ...item, status: 'retired' } : item))); setDetailsNotice(null); };
  const requestRetireObjectType = (typeId: string) => { const impact = getObjectTypeRetireImpact(typeId, objectTypes, objects); if (impact) setDetailsNotice({ type: 'objectTypeRetireConfirm', impact }); setSelectedRef({ kind: 'objectType', id: typeId }); };
  const confirmRetireObjectType = () => { if (!detailsNotice || detailsNotice.type !== 'objectTypeRetireConfirm') return; const typeIds = [detailsNotice.impact.targetTypeId, ...buildObjectTypeDescendantIds(objectTypes, detailsNotice.impact.targetTypeId)]; setObjectTypes((prev) => prev.map((type) => (typeIds.includes(type.id) ? { ...type, canCreateObjects: false, canEditObjects: false, canRetireObjects: false } : type))); setDetailsNotice(null); };
  const moveSelectedRefToNode = (sourceRef: SelectedRef, targetNode: TreeNode) => { if (sourceRef.kind !== targetNode.entityKind) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя переносить элементы между разными деревьями.' }); return; } if (sourceRef.id === targetNode.id) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести элемент внутрь самого себя.' }); return; } if (sourceRef.kind === 'object') { const descendants = buildDescendantIds(objects, sourceRef.id); if (descendants.includes(targetNode.id)) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести объект внутрь собственного дочернего элемента.' }); return; } setObjects((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentId: targetNode.id } : item))); } if (sourceRef.kind === 'objectType') { const descendants = buildObjectTypeDescendantIds(objectTypes, sourceRef.id); if (descendants.includes(targetNode.id)) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести вид объекта внутрь собственного дочернего вида.' }); return; } setObjectTypes((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentTypeId: targetNode.id } : item))); } setExpandedIds((prev) => new Set(prev).add(targetNode.id)); setPendingMoveRef(null); setDetailsNotice(null); };
  const startMove = (ref: SelectedRef) => { setPendingMoveRef(ref); setSelectedRef(ref); setDetailsNotice({ type: 'moveMode', title: 'Режим переноса', message: ref.kind === 'objectType' ? 'Выберите новый родительский вид объекта.' : 'Выберите новый родительский объект.' }); };
  const handleTreeAction = (node: TreeNode, actionId: TreeActionId) => { const actualNode = treeNodes.find((item) => item.entityKind === node.entityKind && item.id === node.id) ?? node; handleSelectNode(actualNode); if (actionId === 'edit') { setDetailsNotice({ type: 'editHint', title: 'Редактирование открыто в карточке', message: 'Поля выбранного элемента меняются справа во вкладке Параметры.' }); return; } if (actualNode.entityKind === 'object') { if (actionId === 'move') startMove({ kind: 'object', id: actualNode.id }); if (actionId === 'retire') requestRetireObject(actualNode.id); if (actionId === 'copy') copyObject(actualNode.id); return; } if (actualNode.entityKind === 'objectType') { if (actionId === 'add') addObjectType(actualNode.id, 'Новый дочерний вид'); if (actionId === 'move') startMove({ kind: 'objectType', id: actualNode.id }); if (actionId === 'retire') requestRetireObjectType(actualNode.id); if (actionId === 'copy') copyObjectType(actualNode.id); } };

  return (
    <NsiLayout
      sections={nsiSections}
      activeSection={activeSection}
      activeSectionId={activeSectionId}
      isDemoMode={isDemoMode}
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
      objectStructureTemplates={objectStructureTemplates}
      systems={systems}
      equipment={equipment}
      techCards={techCards}
      dictionaries={dictionaries}
      selectedContextObjectId={selectedContextObjectId}
      onToggleDemoMode={toggleDemoMode}
      onSelectSection={selectSection}
      onOpenObjectInTree={openObjectInTree}
      onCreateRootFromTemplate={handleCreateRootFromTemplate}
      onSetSearchQuery={setSearchQuery}
      onToggleSort={() => setSortAscending((value) => !value)}
      onToggleExpanded={toggleExpanded}
      onSelectNode={handleSelectNode}
      onStartDrag={(node) => setDraggedRef({ kind: node.entityKind, id: node.id })}
      onDropOnNode={(node) => { if (!draggedRef) return; moveSelectedRefToNode(draggedRef, node); setDraggedRef(null); }}
      onCreate={handleCreate}
      onTreeAction={handleTreeAction}
      onMoveToNode={(node) => pendingMoveRef && moveSelectedRefToNode(pendingMoveRef, node)}
      onCancelMove={() => { setPendingMoveRef(null); setDetailsNotice(null); }}
      onSetActiveTab={setActiveTab}
      onSetActiveGroupId={setActiveGroupId}
      onSetShowEmpty={setShowEmpty}
      onDismissNotice={() => setDetailsNotice(null)}
      onConfirmRetire={confirmRetireObject}
      onCancelRetire={() => setDetailsNotice(null)}
      onConfirmObjectTypeRetire={confirmRetireObjectType}
      onUpdatePendingObjectDraft={(patch) => setPendingObjectDraft((prev) => { if (!prev) return prev; const selectedTemplate = patch.templateId ? objectStructureTemplates.find((template) => template.id === patch.templateId) : undefined; return { ...prev, ...patch, ...(selectedTemplate ? { typeId: selectedTemplate.rootTypeId, detailLevel: selectedTemplate.detailLevel } : {}) }; })}
      onConfirmCreateObject={confirmCreateObject}
      onCancelPendingObjectDraft={resetRightPanel}
      onCreateObjectTypeForDraft={createObjectTypeForDraft}
      onUpdateObject={(id, patch) => setObjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onUpdateObjectType={(id, patch) => setObjectTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onUpdateSystem={(id, patch) => setSystems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onUpdateEquipment={(id, patch) => setEquipment((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
      onCreateSystemType={createSystemTypeForSystem}
      onCreateEquipmentType={createEquipmentTypeForEquipment}
      onAddEquipmentToSystem={addEquipmentToSystem}
      onAddChildEquipment={addChildEquipment}
      onDetachEquipmentFromSystem={detachEquipmentFromSystem}
      onSelectSystem={handleSelectSystem}
      onSelectEquipment={handleSelectEquipment}
      onSelectTechCard={handleSelectTechCard}
      onCreateTechCardForEquipment={createTechCardForEquipment}
      onLinkSystemToContextObject={linkSystemToContextObject}
      onLinkSystemToRoomsInContext={linkSystemToRoomsInContext}
      onToggleAllowedChildType={(typeId, childTypeId) => setObjectTypes((prev) => prev.map((type) => { if (type.id !== typeId) return type; const exists = type.allowedChildTypeIds.includes(childTypeId); return { ...type, allowedChildTypeIds: exists ? type.allowedChildTypeIds.filter((id) => id !== childTypeId) : [...type.allowedChildTypeIds, childTypeId] }; }))}
      onAddParameterGroup={(typeId) => { const id = `group-${Date.now()}`; setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameterGroups: [...type.parameterGroups, { id, name: 'Новая группа', parameterIds: [] }] } : type))); }}
      onRenameParameterGroup={(typeId, groupId, name) => setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameterGroups: type.parameterGroups.map((group) => (group.id === groupId ? { ...group, name } : group)) } : type)))}
      onAddParameterToGroup={(typeId, groupId) => { const createdAt = Date.now(); const parameter: ParameterDefinition = { id: `param-${createdAt}`, name: 'Новый параметр', code: `param_${createdAt}`, dataType: 'string', unit: '', required: false, showInTree: false, defaultValue: null }; setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameters: [...type.parameters, parameter], parameterGroups: type.parameterGroups.map((group) => (group.id === groupId ? { ...group, parameterIds: [...group.parameterIds, parameter.id] } : group)) } : type)); }}
      onUpdateParameter={(typeId, parameterId, patch) => setObjectTypes((prev) => prev.map((type) => (type.id === typeId ? { ...type, parameters: type.parameters.map((parameter) => (parameter.id === parameterId ? { ...parameter, ...patch } : parameter)) } : type)))}
      onDeleteParameter={(typeId, parameterId) => setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameters: type.parameters.filter((parameter) => parameter.id !== parameterId), parameterGroups: type.parameterGroups.map((group) => ({ ...group, parameterIds: group.parameterIds.filter((id) => id !== parameterId) })) } : type))}
      onToggleObjectSystemLink={(objectId, systemId) => setSystems((prev) => prev.map((system) => { if (system.id !== systemId) return system; const targetObject = objects.find((item) => item.id === objectId); const roomLink = system.linkedRoomIds.includes(objectId); const scopeLink = system.scopeObjectIds.includes(objectId); if (targetObject && isRoomType(targetObject.typeId, objectTypes)) return { ...system, linkedRoomIds: roomLink ? system.linkedRoomIds.filter((id) => id !== objectId) : [...system.linkedRoomIds, objectId] }; return { ...system, scopeObjectIds: scopeLink ? system.scopeObjectIds.filter((id) => id !== objectId) : [...system.scopeObjectIds, objectId] }; }))}
      onToggleEquipmentPlacement={(objectId, equipmentId) => setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, placementObjectId: item.placementObjectId === objectId ? '' : objectId } : item)))}
      onToggleSystemRoomLink={(systemId, roomId) => setSystems((prev) => prev.map((system) => { if (system.id !== systemId) return system; const exists = system.linkedRoomIds.includes(roomId); return { ...system, linkedRoomIds: exists ? system.linkedRoomIds.filter((id) => id !== roomId) : [...system.linkedRoomIds, roomId] }; }))}
      onBulkLinkRoomsToSystem={(systemId, roomIds) => setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system)))}
      onUpdateTechCard={(id, patch) => setTechCards((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    />
  );
}

export default App;
