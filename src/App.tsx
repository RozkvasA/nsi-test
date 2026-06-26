import { useMemo, useState } from 'react';
import { dictionaries as initialDictionaries, equipment as initialEquipment, infrastructureObjects as initialObjects, nsiSections, objectStructureTemplates as initialObjectStructureTemplates, objectTypes as initialObjectTypes, systems as initialSystems, techCards as initialTechCards } from './data/nsiDemoData';
import { NsiLayout } from './components/layout/NsiLayout';
import type { CreateEntityKind, DetailsNotice, DictionaryItem, EquipmentEntity, EntityKind, InfrastructureObject, NsiSectionId, ObjectStructureTemplate, ObjectType, ParameterDefinition, ParameterGroupId, ParameterGroupView, PendingEquipmentDraft, PendingObjectDraft, RootObjectCreationMode, SelectedRef, SystemEntity, TechCard, TreeActionId, TreeNode } from './types/nsi';
import { buildDescendantIds, buildObjectTypeDescendantIds, buildTreeNodes, filterTreeNodes, getObjectTypeRetireImpact, getRetireImpact, groupTreeNodes, isRoomType, resolveSelectedEntity } from './utils/nsiTree';
import { buildObjectsFromTemplate, normalizeDetailLevel } from './utils/nsiObjectTemplates';
import { createEquipmentEntity } from './utils/nsiEquipment';
import { createSystemEntity } from './utils/nsiSystems';

const tabs = ['Параметры', 'Документы', 'Заметки', 'Карта', 'Обслуживание'];
const parameterGroups: ParameterGroupView[] = [{ id: 'main', title: 'Основные', hint: 'Основные данные' }, { id: 'relations', title: 'Связи', hint: 'Связанные элементы' }, { id: 'additional', title: 'Прочие', hint: 'Параметры по виду' }];
const nextKindBySection: Record<NsiSectionId, EntityKind> = { overview: 'object', objects: 'object', objectTypes: 'objectType', techCards: 'techCard', dictionaries: 'dictionary' };
const roomsFolderId = (objectId: string) => `folder:rooms:${objectId}`;
const toggleId = (ids: string[], id: string) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

type ChildUnitRow = { name: string; inventoryNumber?: string };
type ReorderDirection = 'up' | 'down';

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
  const [pendingEquipmentDraft, setPendingEquipmentDraft] = useState<PendingEquipmentDraft | null>(null);
  const [detailsNotice, setDetailsNotice] = useState<DetailsNotice | null>(null);

  const activeSection = nsiSections.find((section) => section.id === activeSectionId) ?? nsiSections[0];
  const treeNodes = useMemo(() => buildTreeNodes(activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes), [activeSectionId, objects, systems, equipment, techCards, dictionaries, objectTypes]);
  const filteredTreeNodes = useMemo(() => filterTreeNodes(treeNodes, searchQuery), [treeNodes, searchQuery]);
  const childrenByParentId = useMemo(() => groupTreeNodes(filteredTreeNodes, sortAscending), [filteredTreeNodes, sortAscending]);
  const selectedEntity = useMemo(() => resolveSelectedEntity(selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes), [selectedRef, objects, systems, equipment, techCards, dictionaries, objectTypes]);

  const resetRightPanel = () => { setPendingObjectDraft(null); setPendingEquipmentDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };
  const clearDraftsForSelection = () => { setPendingObjectDraft(null); setPendingEquipmentDraft(null); setDetailsNotice(null); setActiveTab('Параметры'); setActiveGroupId('main'); };

  const toggleDemoMode = () => {
    setPendingObjectDraft(null); setPendingEquipmentDraft(null); setPendingMoveRef(null); setExpandedIds(new Set()); setSearchQuery(''); setActiveTab('Параметры'); setActiveGroupId('main'); setActiveSectionId('overview');
    if (isDemoMode) { setIsDemoMode(false); setObjects([]); setSystems([]); setEquipment([]); setTechCards([]); setSelectedRef({ kind: 'object', id: '' }); setSelectedContextObjectId(null); setDetailsNotice({ type: 'editHint', title: 'Демо выключено', message: 'Демо-данные очищены.' }); return; }
    setIsDemoMode(true); setObjectTypes(initialObjectTypes); setObjects(initialObjects); setSystems(initialSystems); setEquipment(initialEquipment); setTechCards(initialTechCards); setSelectedRef({ kind: 'object', id: initialObjects[0]?.id ?? '' }); setSelectedContextObjectId(initialObjects[0]?.id ?? null); setDetailsNotice({ type: 'editHint', title: 'Демо включено', message: 'Загружен демо-набор БЦ Lucky.' });
  };

  const selectSection = (sectionId: NsiSectionId) => {
    const nextNodes = buildTreeNodes(sectionId, objects, systems, equipment, techCards, dictionaries, objectTypes);
    const firstNode = nextNodes[0];
    const firstRootObject = objects.find((object) => object.parentId === null);
    setActiveSectionId(sectionId);
    setSelectedRef(sectionId === 'overview' ? { kind: 'object', id: firstRootObject?.id ?? '' } : { kind: nextKindBySection[sectionId], id: firstNode?.refId ?? firstNode?.id ?? '' });
    setSelectedContextObjectId(sectionId === 'overview' ? firstRootObject?.id ?? null : sectionId === 'objects' ? firstNode?.objectId ?? null : selectedContextObjectId);
    setSearchQuery(''); setExpandedIds(new Set()); setPendingMoveRef(null); resetRightPanel();
  };

  const toggleExpanded = (nodeId: string) => setExpandedIds((prev) => { const next = new Set(prev); next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId); return next; });
  const handleSelectNode = (node: TreeNode) => { const refId = node.refId ?? node.id; setSelectedRef({ kind: node.entityKind, id: refId }); if (node.objectId) setSelectedContextObjectId(node.objectId); if (node.entityKind === 'object') setSelectedContextObjectId(refId); clearDraftsForSelection(); };
  const handleSelectSystem = (systemId: string, contextObjectId?: string | null) => { setSelectedRef({ kind: 'system', id: systemId }); if (contextObjectId !== undefined) setSelectedContextObjectId(contextObjectId); clearDraftsForSelection(); };
  const handleSelectEquipment = (equipmentId: string) => { const item = equipment.find((equipmentItem) => equipmentItem.id === equipmentId); setSelectedRef({ kind: 'equipment', id: equipmentId }); if (item?.placementObjectId) setSelectedContextObjectId(item.placementObjectId); clearDraftsForSelection(); };
  const handleSelectTechCard = (techCardId: string) => { setSelectedRef({ kind: 'techCard', id: techCardId }); clearDraftsForSelection(); };

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
    const parentId = kind === 'rootObject' ? null : parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId);
    const defaultTemplate = objectStructureTemplates[0];
    setPendingEquipmentDraft(null);
    setPendingObjectDraft({ kind, parentObjectId: parentId, name: kind === 'rootObject' ? 'Новый корневой объект' : kind === 'room' ? 'Новое помещение' : 'Новый объект учета', shortName: kind === 'rootObject' ? 'Объект' : kind === 'room' ? 'Помещение' : 'Новый', typeId: pickDefaultTypeId(kind, parentId), area: null, quantity: 1, unit: kind === 'rootObject' ? 'объект' : kind === 'room' ? 'помещение' : 'ед.', creationMode, templateId: defaultTemplate?.id ?? '', detailLevel: kind === 'rootObject' ? defaultTemplate?.detailLevel ?? 1 : 1 });
    setDetailsNotice({ type: 'editHint', title: 'Создание объекта учета', message: 'Заполните карточку создания объекта.' });
  };

  const startEquipmentDraft = (parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => {
    const parentEquipment = parentEquipmentId ? equipment.find((item) => item.id === parentEquipmentId) : null;
    const placementObjectId = parentEquipment?.placementObjectId ?? parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId) ?? objects[0]?.id ?? '';
    const systemId = contextSystemId ?? parentEquipment?.systemId ?? '';
    setPendingObjectDraft(null);
    setPendingEquipmentDraft({ name: parentEquipmentId ? 'Составная часть оборудования' : 'Новое оборудование', typeId: parentEquipment?.typeId || objectTypes.find((type) => type.code === 'EQUIPMENT')?.id || objectTypes[0]?.id || 'type-equipment', equipmentLevel: 'unit', systemId, placementObjectId, quantity: 1, unit: 'шт.', parentEquipmentId: parentEquipmentId ?? null });
    setActiveTab('Параметры'); setActiveGroupId('main');
    setDetailsNotice({ type: 'editHint', title: 'Создание оборудования', message: 'Выберите уровень учета и размещение оборудования.' });
  };

  const handleCreateRootFromTemplate = () => startObjectDraft('rootObject', null, 'template');
  const openObjectInTree = (objectId: string) => { const ancestorIds: string[] = []; let current = objects.find((object) => object.id === objectId); const visited = new Set<string>(); while (current?.parentId) { if (visited.has(current.id)) break; visited.add(current.id); ancestorIds.push(current.parentId, roomsFolderId(current.parentId)); current = objects.find((object) => object.id === current?.parentId); } setActiveSectionId('objects'); setSelectedRef({ kind: 'object', id: objectId }); setSelectedContextObjectId(objectId); setExpandedIds((prev) => new Set([...prev, ...ancestorIds, objectId])); setPendingMoveRef(null); resetRightPanel(); };
  const createObjectTypeSeed = (parentTypeId: string | null, name = 'Новый вид объекта'): ObjectType => { const createdAt = Date.now(); const nameParamId = `param-name-${createdAt}`; return { id: `type-${createdAt}`, name, code: `TYPE_${createdAt}`, shortName: 'Новый', icon: '□', parentTypeId, allowedChildTypeIds: [], parameterGroups: [{ id: `group-main-${createdAt}`, name: 'Основные', parameterIds: [nameParamId] }], parameters: [{ id: nameParamId, name: 'Наименование', code: 'name', dataType: 'string', unit: '', required: true, showInTree: true, defaultValue: '' }], canCreateObjects: true, canEditObjects: true, canRetireObjects: true }; };
  const addObjectType = (parentTypeId: string | null, name?: string) => { const nextType = createObjectTypeSeed(parentTypeId, name); setObjectTypes((prev) => [...prev.map((type) => parentTypeId && type.id === parentTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setSelectedRef({ kind: 'objectType', id: nextType.id }); setActiveSectionId('objectTypes'); setActiveTab('Параметры'); setActiveGroupId('main'); if (parentTypeId) setExpandedIds((prev) => new Set(prev).add(parentTypeId)); return nextType; };
  const createObjectTypeForDraft = () => { if (!pendingObjectDraft) return; const parentObject = objects.find((item) => item.id === pendingObjectDraft.parentObjectId); const nextType = createObjectTypeSeed(parentObject?.typeId ?? null, 'Новый вид для объекта'); setObjectTypes((prev) => [...prev.map((type) => parentObject?.typeId && type.id === parentObject.typeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setPendingObjectDraft((prev) => (prev ? { ...prev, typeId: nextType.id } : prev)); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид объекта', message: 'Новый вид выбран для создаваемого объекта.' }); };
  const createSystemTypeForSystem = (systemId: string) => { const parentSystemTypeId = objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? null; const nextType = createObjectTypeSeed(parentSystemTypeId, 'Новый вид системы'); setObjectTypes((prev) => [...prev.map((type) => parentSystemTypeId && type.id === parentSystemTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, typeId: nextType.id } : system))); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид системы', message: 'Вид выбран для текущей системы.' }); };
  const createEquipmentTypeForEquipment = (equipmentId: string) => { const parentEquipmentTypeId = objectTypes.find((type) => type.code === 'EQUIPMENT')?.id ?? null; const nextType = createObjectTypeSeed(parentEquipmentTypeId, 'Новый вид оборудования'); setObjectTypes((prev) => [...prev.map((type) => parentEquipmentTypeId && type.id === parentEquipmentTypeId ? { ...type, allowedChildTypeIds: Array.from(new Set([...type.allowedChildTypeIds, nextType.id])) } : type), nextType]); setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, typeId: nextType.id } : item))); setDetailsNotice({ type: 'editHint', title: 'Создан новый вид оборудования', message: 'Вид выбран для текущего оборудования.' }); };

  const confirmCreateObject = () => { if (!pendingObjectDraft) return; if (pendingObjectDraft.kind === 'rootObject' && pendingObjectDraft.creationMode === 'template') { const template = objectStructureTemplates.find((item) => item.id === pendingObjectDraft.templateId); if (!template) { setDetailsNotice({ type: 'moveBlocked', title: 'Шаблон не найден', message: 'Выберите другой шаблон.' }); return; } const generated = buildObjectsFromTemplate(template, pendingObjectDraft.name, pendingObjectDraft.detailLevel); setObjects((prev) => [...prev, ...generated.objects]); setSelectedRef({ kind: 'object', id: generated.rootObjectId }); setSelectedContextObjectId(generated.rootObjectId); setExpandedIds((prev) => new Set([...prev, ...generated.expandedObjectIds, generated.rootObjectId])); resetRightPanel(); return; } const id = `obj-${Date.now()}`; setObjects((prev) => [...prev, { id, name: pendingObjectDraft.name, shortName: pendingObjectDraft.shortName, typeId: pendingObjectDraft.typeId, parentId: pendingObjectDraft.parentObjectId, area: pendingObjectDraft.area, quantity: pendingObjectDraft.quantity, unit: pendingObjectDraft.unit, status: 'active', parameters: pendingObjectDraft.kind === 'rootObject' ? { detailLevel: normalizeDetailLevel(pendingObjectDraft.detailLevel) } : {} }]); setSelectedRef({ kind: 'object', id }); setSelectedContextObjectId(id); if (pendingObjectDraft.parentObjectId) setExpandedIds((prev) => new Set([...prev, pendingObjectDraft.parentObjectId as string, roomsFolderId(pendingObjectDraft.parentObjectId as string)])); resetRightPanel(); };
  const confirmCreateEquipment = () => { if (!pendingEquipmentDraft) return; const createdAt = Date.now(); const equipmentItem = createEquipmentEntity({ createdAt, systemId: pendingEquipmentDraft.systemId, typeId: pendingEquipmentDraft.typeId, placementObjectId: pendingEquipmentDraft.placementObjectId, parentEquipmentId: pendingEquipmentDraft.parentEquipmentId, name: pendingEquipmentDraft.name, equipmentLevel: pendingEquipmentDraft.equipmentLevel, quantity: pendingEquipmentDraft.quantity, unit: pendingEquipmentDraft.unit }); setEquipment((prev) => [...prev, equipmentItem]); if (equipmentItem.systemId) setSystems((prev) => prev.map((system) => system.id === equipmentItem.systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, equipmentItem.id])) } : system)); setSelectedRef({ kind: 'equipment', id: equipmentItem.id }); setSelectedContextObjectId(equipmentItem.placementObjectId); setPendingEquipmentDraft(null); setActiveTab('Параметры'); setActiveGroupId('main'); setDetailsNotice({ type: 'editHint', title: 'Оборудование создано', message: 'Оборудование открыто в карточке.' }); };
  const updatePendingEquipmentDraft = (patch: Partial<PendingEquipmentDraft>) => setPendingEquipmentDraft((prev) => { if (!prev) return prev; const next = { ...prev, ...patch }; if (next.equipmentLevel === 'unit') next.quantity = 1; if (next.quantity < 1) next.quantity = 1; return next; });

  const syncEquipmentSystemLinks = (equipmentId: string, oldSystemId: string, nextSystemId: string) => { if (oldSystemId === nextSystemId) return; setSystems((prev) => prev.map((system) => { if (system.id === oldSystemId) return { ...system, equipmentIds: system.equipmentIds.filter((id) => id !== equipmentId) }; if (system.id === nextSystemId) return { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, equipmentId])) }; return system; })); };
  const updateEquipment = (id: string, patch: Partial<EquipmentEntity>) => { const current = equipment.find((item) => item.id === id); if (current && patch.systemId !== undefined) syncEquipmentSystemLinks(id, current.systemId, patch.systemId); setEquipment((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))); };
  const reorderChildUnit = (parentEquipmentId: string, unitId: string, direction: ReorderDirection) => { setEquipment((prev) => { const unitChildren = prev.filter((item) => item.parentEquipmentId === parentEquipmentId && item.parameters.equipmentLevel === 'unit'); const currentIndex = unitChildren.findIndex((item) => item.id === unitId); const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1; if (currentIndex < 0 || nextIndex < 0 || nextIndex >= unitChildren.length) return prev; const reorderedChildren = [...unitChildren]; [reorderedChildren[currentIndex], reorderedChildren[nextIndex]] = [reorderedChildren[nextIndex], reorderedChildren[currentIndex]]; let childIndex = 0; return prev.map((item) => { if (item.parentEquipmentId !== parentEquipmentId || item.parameters.equipmentLevel !== 'unit') return item; const nextItem = reorderedChildren[childIndex] ?? item; childIndex += 1; return nextItem; }); }); };
  const handleCreate = (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => { if (kind === 'rootObject' || kind === 'childObject' || kind === 'room') { startObjectDraft(kind, parentObjectId); return; } const parentId = parentObjectId ?? (selectedRef.kind === 'object' ? selectedRef.id : selectedContextObjectId); const parent = objects.find((item) => item.id === parentId); const createdAt = Date.now(); if (kind === 'system') { const system = { ...createSystemEntity({ createdAt, typeId: objectTypes.find((type) => type.code === 'SYSTEM')?.id ?? 'type-system', parentObject: parent ?? null, isRoom: parent ? isRoomType(parent.typeId, objectTypes) : false }), parentSystemId: contextSystemId || null }; setSystems((prev) => [...prev, system]); setSelectedRef({ kind: 'system', id: system.id }); setSelectedContextObjectId(parentId ?? null); setActiveTab('Параметры'); setActiveGroupId('main'); setDetailsNotice({ type: 'editHint', title: contextSystemId ? 'Подсистема добавлена' : 'Система добавлена', message: 'Сущность открыта в карточке.' }); return; } startEquipmentDraft(parentId, contextSystemId, parentEquipmentId); };
  const addEquipmentToSystem = (systemId: string) => handleCreate('equipment', selectedContextObjectId ?? objects[0]?.id ?? '', systemId);
  const addChildEquipment = (parentEquipmentId: string) => { const parent = equipment.find((item) => item.id === parentEquipmentId); handleCreate('equipment', parent?.placementObjectId ?? selectedContextObjectId, parent?.systemId ?? '', parentEquipmentId); };
  const createMissingChildEquipmentUnits = (parentEquipmentId: string) => { const parent = equipment.find((item) => item.id === parentEquipmentId); if (!parent) return; const existingUnitChildren = equipment.filter((item) => item.parentEquipmentId === parent.id && item.parameters.equipmentLevel === 'unit'); const targetQuantity = Math.max(0, Number(parent.quantity) || 0); const missingCount = Math.max(targetQuantity - existingUnitChildren.length, 0); if (missingCount === 0) { setDetailsNotice({ type: 'editHint', title: 'Единицы уже созданы', message: `Создано единиц: ${existingUnitChildren.length} из ${targetQuantity}.` }); return; } const technicalName = typeof parent.parameters.inventoryNumber === 'string' ? parent.parameters.inventoryNumber.trim() : ''; const baseName = technicalName || parent.name; const createdAt = Date.now(); const createdUnits = Array.from({ length: missingCount }, (_, index) => createEquipmentEntity({ createdAt: createdAt + index, systemId: parent.systemId, typeId: parent.typeId, placementObjectId: parent.placementObjectId, parentEquipmentId: parent.id, name: `${baseName} ${String(existingUnitChildren.length + index + 1).padStart(3, '0')}`, equipmentLevel: 'unit', quantity: 1, unit: 'шт.' })); setEquipment((prev) => [...prev, ...createdUnits]); if (parent.systemId) setSystems((prev) => prev.map((system) => system.id === parent.systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, ...createdUnits.map((item) => item.id)])) } : system)); setDetailsNotice({ type: 'editHint', title: 'Единицы созданы', message: `Создано недостающих единиц: ${createdUnits.length}.` }); };
  const createChildUnitsFromRows = (parentEquipmentId: string, rows: ChildUnitRow[]) => { const parent = equipment.find((item) => item.id === parentEquipmentId); if (!parent) return; const sourceRows = rows.filter((row) => row.name.trim().length > 0); if (sourceRows.length === 0) { setDetailsNotice({ type: 'editHint', title: 'Нет строк для создания', message: 'Лишние строки с пустым наименованием не используются.' }); return; } const createdAt = Date.now(); const createdUnits = sourceRows.map((row, index) => { const unit = createEquipmentEntity({ createdAt: createdAt + index, systemId: parent.systemId, typeId: parent.typeId, placementObjectId: parent.placementObjectId, parentEquipmentId: parent.id, name: row.name.trim(), equipmentLevel: 'unit', quantity: 1, unit: 'шт.' }); return row.inventoryNumber !== undefined ? { ...unit, parameters: { ...unit.parameters, inventoryNumber: row.inventoryNumber } } : unit; }); setEquipment((prev) => [...prev, ...createdUnits]); if (parent.systemId) setSystems((prev) => prev.map((system) => system.id === parent.systemId ? { ...system, equipmentIds: Array.from(new Set([...system.equipmentIds, ...createdUnits.map((item) => item.id)])) } : system)); setDetailsNotice({ type: 'editHint', title: 'Единицы созданы из списка', message: `Создано unit из лишних строк: ${createdUnits.length}.` }); };
  const removeChildUnits = (unitIds: string[]) => { const idsToRemove = Array.from(new Set(unitIds)).filter((id) => equipment.some((item) => item.id === id && item.parameters.equipmentLevel === 'unit')); if (idsToRemove.length === 0) return 0; setEquipment((prev) => prev.filter((item) => !idsToRemove.includes(item.id))); setSystems((prev) => prev.map((system) => ({ ...system, equipmentIds: system.equipmentIds.filter((id) => !idsToRemove.includes(id)) }))); setDetailsNotice({ type: 'editHint', title: 'Лишние unit удалены', message: `Удалено лишних unit: ${idsToRemove.length}.` }); return idsToRemove.length; };
  const detachEquipmentFromSystem = (systemId: string, equipmentId: string) => { setEquipment((prev) => prev.map((item) => (item.id === equipmentId ? { ...item, systemId: '', parentEquipmentId: null } : item))); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, equipmentIds: system.equipmentIds.filter((id) => id !== equipmentId) } : system))); setSelectedRef({ kind: 'equipment', id: equipmentId }); setDetailsNotice({ type: 'editHint', title: 'Оборудование стало самостоятельным', message: 'Место размещения сохранено.' }); };
  const createTechCardForEquipment = (equipmentId: string) => { const item = equipment.find((equipmentItem) => equipmentItem.id === equipmentId); if (!item) return; const createdAt = Date.now(); const card: TechCard = { id: `tc-eq-${createdAt}`, name: `Новая техкарта для ${item.name}`, type: '', targetType: 'equipment', targetId: item.id, targetObjectTypeId: item.typeId, workTypeId: '', inputDate: '', outputDate: '', periodicity: '', minExecutionInterval: '', minDurationManHours: null, operations: [], personnel: [], materials: [], ppe: [], isActive: false, isComplex: false }; setTechCards((prev) => [...prev, card]); setSelectedRef({ kind: 'techCard', id: card.id }); setActiveTab('Параметры'); setDetailsNotice({ type: 'editHint', title: 'Техкарта создана', message: 'Создан черновик техкарты.' }); };
  const linkSystemToContextObject = (systemId: string) => { const contextObject = selectedContextObjectId ? objects.find((object) => object.id === selectedContextObjectId) : null; if (!contextObject) return; setSystems((prev) => prev.map((system) => { if (system.id !== systemId) return system; if (isRoomType(contextObject.typeId, objectTypes)) return { ...system, scopeType: 'singleRoom', linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, contextObject.id])) }; return { ...system, scopeType: 'objectNode', scopeObjectIds: Array.from(new Set([...system.scopeObjectIds, contextObject.id])) }; })); };
  const linkSystemToRoomsInContext = (systemId: string) => { if (!selectedContextObjectId) return; const ids = [selectedContextObjectId, ...buildDescendantIds(objects, selectedContextObjectId)]; const roomIds = objects.filter((object) => ids.includes(object.id) && isRoomType(object.typeId, objectTypes)).map((object) => object.id); setSystems((prev) => prev.map((system) => (system.id === systemId ? { ...system, scopeType: 'multipleRooms', linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system))); };
  const copyObject = (objectId: string) => { const source = objects.find((item) => item.id === objectId); if (!source) return; const id = `obj-copy-${Date.now()}`; setObjects((prev) => [...prev, { ...source, id, name: `${source.name} копия`, shortName: `${source.shortName} копия`, parameters: { ...source.parameters }, status: 'active' }]); setSelectedRef({ kind: 'object', id }); setSelectedContextObjectId(id); };
  const copyObjectType = (typeId: string) => { const source = objectTypes.find((item) => item.id === typeId); if (!source) return; const createdAt = Date.now(); const copy: ObjectType = { ...source, id: `type-copy-${createdAt}`, name: `${source.name} копия`, code: `${source.code}_COPY_${createdAt}`, shortName: `${source.shortName} копия`, parentTypeId: source.parentTypeId, allowedChildTypeIds: [...source.allowedChildTypeIds], parameterGroups: source.parameterGroups.map((group) => ({ ...group, id: `${group.id}-copy-${createdAt}`, parameterIds: group.parameterIds.map((id) => `${id}-copy-${createdAt}`) })), parameters: source.parameters.map((parameter) => ({ ...parameter, id: `${parameter.id}-copy-${createdAt}`, code: `${parameter.code}_copy_${createdAt}` })) }; setObjectTypes((prev) => [...prev, copy]); setSelectedRef({ kind: 'objectType', id: copy.id }); };
  const requestRetireObject = (objectId: string) => { const impact = getRetireImpact(objectId, objects, systems, equipment, techCards); if (impact) setDetailsNotice({ type: 'retireConfirm', impact }); setSelectedRef({ kind: 'object', id: objectId }); setSelectedContextObjectId(objectId); };
  const confirmRetireObject = () => { if (!detailsNotice || detailsNotice.type !== 'retireConfirm') return; setObjects((prev) => prev.map((item) => (detailsNotice.impact.affectedObjectIds.includes(item.id) ? { ...item, status: 'retired' } : item))); setDetailsNotice(null); };
  const requestRetireObjectType = (typeId: string) => { const impact = getObjectTypeRetireImpact(typeId, objectTypes, objects); if (impact) setDetailsNotice({ type: 'objectTypeRetireConfirm', impact }); setSelectedRef({ kind: 'objectType', id: typeId }); };
  const confirmRetireObjectType = () => { if (!detailsNotice || detailsNotice.type !== 'objectTypeRetireConfirm') return; const typeIds = [detailsNotice.impact.targetTypeId, ...buildObjectTypeDescendantIds(objectTypes, detailsNotice.impact.targetTypeId)]; setObjectTypes((prev) => prev.map((type) => (typeIds.includes(type.id) ? { ...type, canCreateObjects: false, canEditObjects: false, canRetireObjects: false } : type))); setDetailsNotice(null); };
  const moveSelectedRefToNode = (sourceRef: SelectedRef, targetNode: TreeNode) => { if (sourceRef.kind !== targetNode.entityKind || targetNode.refId) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Перенос доступен только для реальных объектов и видов.' }); return; } if (sourceRef.id === targetNode.id) return; if (sourceRef.kind === 'object') { const descendants = buildDescendantIds(objects, sourceRef.id); if (descendants.includes(targetNode.id)) { setDetailsNotice({ type: 'moveBlocked', title: 'Перенос невозможен', message: 'Нельзя перенести объект внутрь собственного потомка.' }); return; } setObjects((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentId: targetNode.id } : item))); } if (sourceRef.kind === 'objectType') { setObjectTypes((prev) => prev.map((item) => (item.id === sourceRef.id ? { ...item, parentTypeId: targetNode.id } : item))); } setExpandedIds((prev) => new Set(prev).add(targetNode.id)); setPendingMoveRef(null); setDetailsNotice(null); };
  const startMove = (ref: SelectedRef) => { setPendingMoveRef(ref); setSelectedRef(ref); setDetailsNotice({ type: 'moveMode', title: 'Режим переноса', message: 'Выберите новый родительский узел.' }); };
  const handleTreeAction = (node: TreeNode, actionId: TreeActionId) => { const actualNode = treeNodes.find((item) => item.id === node.id) ?? node; handleSelectNode(actualNode); if (actionId === 'edit') return; if (actualNode.entityKind === 'object') { if (actionId === 'move') startMove({ kind: 'object', id: actualNode.refId ?? actualNode.id }); if (actionId === 'retire') requestRetireObject(actualNode.refId ?? actualNode.id); if (actionId === 'copy') copyObject(actualNode.refId ?? actualNode.id); } if (actualNode.entityKind === 'objectType') { if (actionId === 'add') addObjectType(actualNode.refId ?? actualNode.id, 'Новый дочерний вид'); if (actionId === 'move') startMove({ kind: 'objectType', id: actualNode.refId ?? actualNode.id }); if (actionId === 'retire') requestRetireObjectType(actualNode.refId ?? actualNode.id); if (actionId === 'copy') copyObjectType(actualNode.refId ?? actualNode.id); } };

  return <NsiLayout
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
    pendingEquipmentDraft={pendingEquipmentDraft}
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
    onStartDrag={(node) => setDraggedRef({ kind: node.entityKind, id: node.refId ?? node.id })}
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
    onUpdatePendingEquipmentDraft={updatePendingEquipmentDraft}
    onConfirmCreateEquipment={confirmCreateEquipment}
    onCancelPendingEquipmentDraft={resetRightPanel}
    onCreateObjectTypeForDraft={createObjectTypeForDraft}
    onUpdateObject={(id, patch) => setObjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    onUpdateObjectType={(id, patch) => setObjectTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    onUpdateSystem={(id, patch) => setSystems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))}
    onUpdateEquipment={updateEquipment}
    onReorderChildUnit={reorderChildUnit}
    onCreateSystemType={createSystemTypeForSystem}
    onCreateEquipmentType={createEquipmentTypeForEquipment}
    onAddEquipmentToSystem={addEquipmentToSystem}
    onAddChildEquipment={addChildEquipment}
    onCreateMissingChildUnits={createMissingChildEquipmentUnits}
    onCreateChildUnitsFromRows={createChildUnitsFromRows}
    onRemoveChildUnits={removeChildUnits}
    onDetachEquipmentFromSystem={detachEquipmentFromSystem}
    onSelectSystem={handleSelectSystem}
    onSelectEquipment={handleSelectEquipment}
    onSelectTechCard={handleSelectTechCard}
    onCreateTechCardForEquipment={createTechCardForEquipment}
    onLinkSystemToContextObject={linkSystemToContextObject}
    onLinkSystemToRoomsInContext={linkSystemToRoomsInContext}
    onToggleAllowedChildType={(typeId, childTypeId) => setObjectTypes((prev) => prev.map((type) => type.id !== typeId ? type : { ...type, allowedChildTypeIds: toggleId(type.allowedChildTypeIds, childTypeId) }))}
    onAddParameterGroup={(typeId) => { const id = `group-${Date.now()}`; setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameterGroups: [...type.parameterGroups, { id, name: 'Новая группа', parameterIds: [] }] } : type)); }}
    onRenameParameterGroup={(typeId, groupId, name) => setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameterGroups: type.parameterGroups.map((group) => group.id === groupId ? { ...group, name } : group) } : type))}
    onAddParameterToGroup={(typeId, groupId) => { const createdAt = Date.now(); const parameter: ParameterDefinition = { id: `param-${createdAt}`, name: 'Новый параметр', code: `param_${createdAt}`, dataType: 'string', unit: '', required: false, showInTree: false, defaultValue: null }; setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameters: [...type.parameters, parameter], parameterGroups: type.parameterGroups.map((group) => group.id === groupId ? { ...group, parameterIds: [...group.parameterIds, parameter.id] } : group) } : type)); }}
    onUpdateParameter={(typeId, parameterId, patch) => setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameters: type.parameters.map((parameter) => parameter.id === parameterId ? { ...parameter, ...patch } : parameter) } : type))}
    onDeleteParameter={(typeId, parameterId) => setObjectTypes((prev) => prev.map((type) => type.id === typeId ? { ...type, parameters: type.parameters.filter((parameter) => parameter.id !== parameterId), parameterGroups: type.parameterGroups.map((group) => ({ ...group, parameterIds: group.parameterIds.filter((id) => id !== parameterId) })) } : type))}
    onToggleObjectSystemLink={(objectId, systemId) => setSystems((prev) => prev.map((system) => { if (system.id !== systemId) return system; const object = objects.find((item) => item.id === objectId); if (object && isRoomType(object.typeId, objectTypes)) return { ...system, linkedRoomIds: toggleId(system.linkedRoomIds, objectId) }; return { ...system, scopeObjectIds: toggleId(system.scopeObjectIds, objectId) }; }))}
    onToggleEquipmentPlacement={(objectId, equipmentId) => setEquipment((prev) => prev.map((item) => item.id === equipmentId ? { ...item, placementObjectId: item.placementObjectId === objectId ? '' : objectId } : item))}
    onToggleSystemRoomLink={(systemId, roomId) => setSystems((prev) => prev.map((system) => system.id === systemId ? { ...system, linkedRoomIds: toggleId(system.linkedRoomIds, roomId) } : system))}
    onBulkLinkRoomsToSystem={(systemId, roomIds) => setSystems((prev) => prev.map((system) => system.id === systemId ? { ...system, linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system))}
    onUpdateTechCard={(id, patch) => setTechCards((prev) => prev.map((card) => card.id === id ? { ...card, ...patch } : card))}
  />;
}

export default App;
