import type {
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  NsiSectionId,
  ObjectType,
  ObjectTypeRetireImpact,
  RetireImpact,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
  TreeNode,
} from '../types/nsi';
import { collectRequiredParameterWarnings } from './nsiObjectParameters';
import { getEquipmentDisplayQuantity, getEquipmentChildren, getEquipmentSystemLabel, getEquipmentWarnings, isAggregateEquipment } from './nsiEquipment';
import { getSystemEquipment, getSystemWarnings, systemScopeLabels } from './nsiSystems';
import { formatTechCardSummary, getTechCardWarnings } from './nsiTechCards';

export const formatArea = (area: number | null) => (area === null ? 'площ. нет' : `${area.toLocaleString('ru-RU')} м²`);
export const isRoomType = (typeId: string, objectTypes: ObjectType[]) => objectTypes.find((type) => type.id === typeId)?.code === 'ROOM';
export const buildDescendantIds = (objects: InfrastructureObject[], rootId: string): string[] => objects.filter((item) => item.parentId === rootId).flatMap((child) => [child.id, ...buildDescendantIds(objects, child.id)]);
export const buildObjectTypeDescendantIds = (objectTypes: ObjectType[], rootId: string): string[] => objectTypes.filter((item) => item.parentTypeId === rootId).flatMap((child) => [child.id, ...buildObjectTypeDescendantIds(objectTypes, child.id)]);

const systemsFolderId = (objectId: string) => `folder:systems:${objectId}`;
const roomsFolderId = (objectId: string) => `folder:rooms:${objectId}`;
const standaloneFolderId = (objectId: string) => `folder:standalone-equipment:${objectId}`;
const emptyNodeId = (kind: string, objectId: string) => `empty:${kind}:${objectId}`;
const inheritedSummaryId = (objectId: string) => `summary:inherited-systems:${objectId}`;
const systemNodeId = (objectId: string, systemId: string) => `system:${objectId}:${systemId}`;
const equipmentNodeId = (objectId: string, systemId: string, equipmentId: string) => `equipment:${objectId}:${systemId || 'standalone'}:${equipmentId}`;

function getAncestorIds(objects: InfrastructureObject[], objectId: string): string[] {
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

function isSystemDirectForObject(system: SystemEntity, object: InfrastructureObject) {
  if (system.scopeObjectIds.includes(object.id) || system.linkedRoomIds.includes(object.id)) return true;
  return system.scopeType === 'wholeObject' && object.parentId === null;
}

function getDirectSystemsForObject(systems: SystemEntity[], object: InfrastructureObject) {
  return systems.filter((system) => isSystemDirectForObject(system, object));
}

function getInheritedSystemsForObject(objects: InfrastructureObject[], systems: SystemEntity[], object: InfrastructureObject) {
  const ancestorIds = getAncestorIds(objects, object.id);
  const directIds = new Set(getDirectSystemsForObject(systems, object).map((system) => system.id));
  return systems.filter((system) => {
    if (directIds.has(system.id)) return false;
    if (system.scopeType === 'wholeObject') return ancestorIds.some((ancestorId) => objects.find((item) => item.id === ancestorId)?.parentId === null);
    return system.scopeObjectIds.some((id) => ancestorIds.includes(id)) || system.linkedRoomIds.some((id) => ancestorIds.includes(id));
  });
}

function compactSystemSummary(system: SystemEntity, equipment: EquipmentEntity[]) {
  const systemEquipment = getSystemEquipment(system, equipment);
  return `${systemScopeLabels[system.scopeType]} · обор. ${systemEquipment.length}`;
}

function buildObjectTreeNodes(objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], techCards: TechCard[], objectTypes: ObjectType[]) {
  const nodes: TreeNode[] = [];
  const objectIndex = new Map(objects.map((object, index) => [object.id, index]));

  objects.forEach((object) => {
    const objectType = objectTypes.find((type) => type.id === object.typeId);
    const childObjects = objects.filter((item) => item.parentId === object.id);
    const directSystems = getDirectSystemsForObject(systems, object);
    const inheritedSystems = getInheritedSystemsForObject(objects, systems, object);
    const standaloneEquipment = equipment.filter((item) => !item.systemId && item.placementObjectId === object.id);
    const requiredWarnings = collectRequiredParameterWarnings(object, objectType);
    const warningCount = (object.area === null ? 1 : 0) + (object.status === 'retired' ? 1 : 0) + requiredWarnings.length;
    const summaryParts = [`пом. ${childObjects.length}`, `сист. ${directSystems.length}`, inheritedSystems.length > 0 ? `наслед. ${inheritedSystems.length}` : null, warningCount > 0 ? `⚠ ${warningCount}` : null].filter(Boolean);

    nodes.push({ id: object.id, parentId: object.parentId ? roomsFolderId(object.parentId) : null, entityKind: 'object', title: object.name, subtitle: object.description || objectType?.shortName || objectType?.name || 'Вид не задан', summary: summaryParts.join(' · '), warning: object.status === 'retired' ? 'снят' : warningCount > 0 ? `⚠ ${warningCount}` : undefined, objectId: object.id, order: 100 + (objectIndex.get(object.id) ?? 0) });
    nodes.push({ id: systemsFolderId(object.id), parentId: object.id, entityKind: 'objectFolder', title: 'Системы', subtitle: 'Инженерная структура', summary: `сист. ${directSystems.length} · наслед. ${inheritedSystems.length}${standaloneEquipment.length > 0 ? ` · самост. ${standaloneEquipment.length}` : ''}`, objectId: object.id, virtualRole: 'systemsFolder', order: 10 });
    nodes.push({ id: roomsFolderId(object.id), parentId: object.id, entityKind: 'objectFolder', title: 'Помещения', subtitle: 'Вложенные объекты', summary: childObjects.length > 0 ? `пом. ${childObjects.length}` : 'нет помещений', objectId: object.id, virtualRole: 'roomsFolder', order: 20 });
    buildSystemFolderNodes(nodes, object, objects, systems, equipment, objectTypes, directSystems, inheritedSystems, standaloneEquipment);
    if (childObjects.length === 0) nodes.push({ id: emptyNodeId('rooms', object.id), parentId: roomsFolderId(object.id), entityKind: 'objectFolder', title: 'нет помещений', subtitle: 'Папка не скрывается', summary: 'можно добавить', objectId: object.id, virtualRole: 'emptyState', readOnly: true, order: 10 });
  });
  return nodes;
}

function buildSystemFolderNodes(nodes: TreeNode[], object: InfrastructureObject, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], objectTypes: ObjectType[], directSystems: SystemEntity[], inheritedSystems: SystemEntity[], standaloneEquipment: EquipmentEntity[]) {
  const directSystemIds = new Set(directSystems.map((system) => system.id));
  const directRoots = directSystems.filter((system) => !system.parentSystemId || !directSystemIds.has(system.parentSystemId));
  if (directSystems.length === 0 && inheritedSystems.length === 0) nodes.push({ id: emptyNodeId('systems', object.id), parentId: systemsFolderId(object.id), entityKind: 'objectFolder', title: 'нет систем', subtitle: 'Папка не скрывается', summary: 'можно добавить', objectId: object.id, virtualRole: 'emptyState', readOnly: true, order: 10 });
  directRoots.forEach((system, index) => buildSystemNode(nodes, object.id, objects, systems, equipment, objectTypes, system, systemsFolderId(object.id), 100 + index));
  if (inheritedSystems.length > 0) nodes.push({ id: inheritedSummaryId(object.id), parentId: systemsFolderId(object.id), entityKind: 'objectFolder', title: `наследуется ${inheritedSystems.length} систем`, subtitle: 'Полный список в карточке', summary: `наслед. ${inheritedSystems.length}`, objectId: object.id, virtualRole: 'inheritedSystemsFolder', readOnly: true, order: 300 });
  if (standaloneEquipment.length > 0) {
    nodes.push({ id: standaloneFolderId(object.id), parentId: systemsFolderId(object.id), entityKind: 'objectFolder', title: 'Самостоятельное оборудование', subtitle: 'Без системы', summary: `обор. ${standaloneEquipment.length}`, objectId: object.id, virtualRole: 'standaloneEquipmentFolder', order: 700 });
    standaloneEquipment.filter((item) => !item.parentEquipmentId || !standaloneEquipment.some((candidate) => candidate.id === item.parentEquipmentId)).forEach((item, index) => buildEquipmentNode(nodes, object.id, '', equipment, objectTypes, objects, item, standaloneFolderId(object.id), 100 + index));
  }
}

function buildSystemNode(nodes: TreeNode[], objectId: string, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], objectTypes: ObjectType[], system: SystemEntity, parentId: string, order: number) {
  const systemEquipment = getSystemEquipment(system, equipment);
  const warnings = getSystemWarnings(system, equipment);
  const systemType = objectTypes.find((type) => type.id === system.typeId);
  const nodeId = systemNodeId(objectId, system.id);
  const systemWarning = systemEquipment.length === 0 ? 'нет обор.' : warnings.length > 0 ? `⚠ ${warnings.length}` : undefined;
  nodes.push({ id: nodeId, parentId, entityKind: 'system', refId: system.id, title: system.name, subtitle: systemType?.shortName || systemType?.name || 'Система', summary: compactSystemSummary(system, equipment), warning: systemWarning, objectId, systemId: system.id, order });
  systems.filter((child) => child.parentSystemId === system.id).forEach((child, index) => buildSystemNode(nodes, objectId, objects, systems, equipment, objectTypes, child, nodeId, 100 + index));
  const systemEquipmentIds = new Set(systemEquipment.map((item) => item.id));
  systemEquipment.filter((item) => !item.parentEquipmentId || !systemEquipmentIds.has(item.parentEquipmentId)).forEach((item, index) => buildEquipmentNode(nodes, objectId, system.id, systemEquipment, objectTypes, objects, item, nodeId, 500 + index));
}

function buildEquipmentNode(nodes: TreeNode[], objectId: string, systemId: string, equipment: EquipmentEntity[], objectTypes: ObjectType[], objects: InfrastructureObject[], item: EquipmentEntity, parentId: string, order: number) {
  const type = objectTypes.find((objectType) => objectType.id === item.typeId);
  const nodeId = equipmentNodeId(objectId, systemId, item.id);
  const aggregate = isAggregateEquipment(item, equipment);
  const placementName = objects.find((object) => object.id === item.placementObjectId)?.name ?? item.placementObjectId;
  const summary = aggregate ? `ед. ${getEquipmentDisplayQuantity(item, equipment)}` : placementName || 'нет места';
  nodes.push({ id: nodeId, parentId, entityKind: 'equipment', refId: item.id, title: item.name, subtitle: type?.shortName || type?.name || 'Оборудование', summary, warning: item.placementObjectId ? undefined : 'нет места', objectId, systemId, order });
  getEquipmentChildren(equipment, item.id).forEach((child, index) => buildEquipmentNode(nodes, objectId, systemId, equipment, objectTypes, objects, child, nodeId, 100 + index));
}

export function buildTreeNodes(sectionId: NsiSectionId, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], techCards: TechCard[], dictionaries: DictionaryItem[], objectTypes: ObjectType[]): TreeNode[] {
  if (sectionId === 'overview') return objects.filter((object) => object.parentId === null).map((object) => { const objectType = objectTypes.find((type) => type.id === object.typeId); return { id: object.id, parentId: null, entityKind: 'object', title: object.name, subtitle: objectType?.name ?? 'Вид не задан', summary: formatArea(object.area), warning: object.status === 'retired' ? 'снят с учета' : undefined, objectId: object.id }; });
  if (sectionId === 'objects') return buildObjectTreeNodes(objects, systems, equipment, techCards, objectTypes);
  if (sectionId === 'objectTypes') return objectTypes.map((type) => ({ id: type.id, parentId: type.parentTypeId, entityKind: 'objectType', title: `${type.icon} ${type.name}`, subtitle: `${type.code} · ${type.shortName}`, summary: `${type.allowedChildTypeIds.length} доч. видов · ${type.parameterGroups.length} групп · ${type.parameters.length} параметров`, warning: !type.canCreateObjects ? 'создание запрещено' : undefined }));
  if (sectionId === 'techCards') return techCards.map((card) => { const warnings = getTechCardWarnings(card); return { id: card.id, parentId: null, entityKind: 'techCard', title: card.name || 'Техкарта без наименования', subtitle: `${card.type || 'тип не задан'} · цель: ${targetLabel(card.targetType)}`, summary: formatTechCardSummary(card, objectTypes, dictionaries), warning: warnings.length > 0 ? `${warnings.length} предупрежд.` : undefined }; });
  return dictionaries.map((item) => ({ id: item.id, parentId: item.parentId, entityKind: 'dictionary', title: item.title, subtitle: item.code, summary: item.description }));
}

export function filterTreeNodes(treeNodes: TreeNode[], searchQuery: string): TreeNode[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return treeNodes;
  const nodesById = new Map(treeNodes.map((node) => [node.id, node]));
  const visibleIds = new Set<string>();
  treeNodes.forEach((node) => {
    const haystack = `${node.title} ${node.subtitle} ${node.summary}`.toLowerCase();
    if (!haystack.includes(query)) return;
    visibleIds.add(node.id);
    let parentId = node.parentId;
    while (parentId) {
      visibleIds.add(parentId);
      parentId = nodesById.get(parentId)?.parentId ?? null;
    }
  });
  return treeNodes.filter((node) => visibleIds.has(node.id));
}

export function groupTreeNodes(treeNodes: TreeNode[], sortAscending: boolean): Map<string | null, TreeNode[]> {
  const map = new Map<string | null, TreeNode[]>();
  treeNodes.forEach((node) => { const siblings = map.get(node.parentId) ?? []; siblings.push(node); map.set(node.parentId, siblings); });
  map.forEach((siblings) => siblings.sort((a, b) => { const orderDiff = (a.order ?? 1000) - (b.order ?? 1000); if (orderDiff !== 0) return orderDiff; return sortAscending ? a.title.localeCompare(b.title, 'ru') : b.title.localeCompare(a.title, 'ru'); }));
  return map;
}

export function resolveSelectedEntity(selectedRef: SelectedRef, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], techCards: TechCard[], dictionaries: DictionaryItem[], objectTypes: ObjectType[]): SelectedEntityView | null {
  if (selectedRef.kind === 'objectFolder') {
    if (selectedRef.id.includes(':systems:')) return { title: 'Системы', subtitle: 'Виртуальная папка инженерной структуры' };
    if (selectedRef.id.includes(':rooms:')) return { title: 'Помещения', subtitle: 'Виртуальная папка объектов и помещений' };
    if (selectedRef.id.includes(':standalone-equipment:')) return { title: 'Самостоятельное оборудование', subtitle: 'Оборудование без системы' };
    if (selectedRef.id.includes('inherited-systems')) return { title: 'Наследуемые системы', subtitle: 'Полный список отображается в карточке объекта' };
    return { title: 'Служебная строка дерева', subtitle: 'Виртуальный элемент навигации' };
  }
  if (selectedRef.kind === 'object') { const object = objects.find((item) => item.id === selectedRef.id); if (!object) return null; const objectType = objectTypes.find((type) => type.id === object.typeId); return { title: object.name, subtitle: object.description || objectType?.name || 'Вид не задан' }; }
  if (selectedRef.kind === 'objectType') { const type = objectTypes.find((item) => item.id === selectedRef.id); return type ? { title: type.name, subtitle: `${type.code} · ${type.shortName}` } : null; }
  if (selectedRef.kind === 'system') { const system = systems.find((item) => item.id === selectedRef.id); if (!system) return null; const systemType = objectTypes.find((type) => type.id === system.typeId); const warnings = getSystemWarnings(system, equipment); return { title: system.name, subtitle: `${systemType?.name ?? 'Вид системы не задан'} · ${compactSystemSummary(system, equipment)}${warnings.length > 0 ? ` · ${warnings.length} предупрежд.` : ''}` }; }
  if (selectedRef.kind === 'equipment') { const item = equipment.find((equipmentItem) => equipmentItem.id === selectedRef.id); if (!item) return null; const type = objectTypes.find((objectType) => objectType.id === item.typeId); return { title: item.name, subtitle: `${type?.name ?? 'Вид оборудования не задан'} · ${getEquipmentSystemLabel(item, systems)}` }; }
  if (selectedRef.kind === 'techCard') { const card = techCards.find((item) => item.id === selectedRef.id); return card ? { title: card.name || 'Техкарта без наименования', subtitle: `${card.type || 'тип не задан'} · ${resolveTargetName(card, objects, systems, equipment)}` } : null; }
  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  return dictionary ? { title: dictionary.title, subtitle: dictionary.code } : null;
}

export function resolveTargetName(card: TechCard, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[]) {
  if (!card.targetId) return 'Не выбрано';
  if (card.targetType === 'room') return objects.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  if (card.targetType === 'system') return systems.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  return equipment.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
}

export function targetLabel(targetType: TechCard['targetType']) {
  const labels: Record<TechCard['targetType'], string> = { room: 'помещение', system: 'система', equipment: 'оборудование' };
  return labels[targetType];
}

export function getRetireImpact(objectId: string, objects: InfrastructureObject[], systems: SystemEntity[], equipment: EquipmentEntity[], techCards: TechCard[]): RetireImpact {
  const selectedObject = objects.find((item) => item.id === objectId);
  if (!selectedObject) return { targetObjectId: objectId, targetObjectName: 'Элемент не найден', descendantCount: 0, affectedSystems: 0, affectedEquipment: 0, affectedTechCards: 0, affectedObjectIds: [] };
  const descendants = buildDescendantIds(objects, selectedObject.id);
  const affectedObjectIds = [selectedObject.id, ...descendants];
  const affectedSystems = systems.filter((system) => system.scopeObjectIds.some((id) => affectedObjectIds.includes(id)) || system.linkedRoomIds.some((id) => affectedObjectIds.includes(id))).length;
  const affectedEquipment = equipment.filter((item) => affectedObjectIds.includes(item.placementObjectId)).length;
  const affectedTechCards = techCards.filter((card) => affectedObjectIds.includes(card.targetId)).length;
  return { targetObjectId: selectedObject.id, targetObjectName: selectedObject.name, descendantCount: descendants.length, affectedSystems, affectedEquipment, affectedTechCards, affectedObjectIds };
}

export function getObjectTypeRetireImpact(typeId: string, objectTypes: ObjectType[], objects: InfrastructureObject[]): ObjectTypeRetireImpact {
  const selectedType = objectTypes.find((item) => item.id === typeId);
  if (!selectedType) return { targetTypeId: typeId, targetTypeName: 'Вид не найден', childTypeCount: 0, objectCount: 0 };
  const descendants = buildObjectTypeDescendantIds(objectTypes, typeId);
  const affectedTypeIds = [selectedType.id, ...descendants];
  return { targetTypeId: selectedType.id, targetTypeName: selectedType.name, childTypeCount: descendants.length, objectCount: objects.filter((object) => affectedTypeIds.includes(object.typeId)).length };
}
