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

export const formatArea = (area: number | null) => (area === null ? 'площадь не заполнена' : `${area.toLocaleString('ru-RU')} м²`);

export const isRoomType = (typeId: string, objectTypes: ObjectType[]) => objectTypes.find((type) => type.id === typeId)?.code === 'ROOM';

export const buildDescendantIds = (objects: InfrastructureObject[], rootId: string): string[] => {
  const children = objects.filter((item) => item.parentId === rootId);
  return children.flatMap((child) => [child.id, ...buildDescendantIds(objects, child.id)]);
};

export const buildObjectTypeDescendantIds = (objectTypes: ObjectType[], rootId: string): string[] => {
  const children = objectTypes.filter((item) => item.parentTypeId === rootId);
  return children.flatMap((child) => [child.id, ...buildObjectTypeDescendantIds(objectTypes, child.id)]);
};

export function buildTreeNodes(
  sectionId: NsiSectionId,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
  dictionaries: DictionaryItem[],
  objectTypes: ObjectType[],
): TreeNode[] {
  if (sectionId === 'objects') {
    return objects.map((object) => {
      const objectType = objectTypes.find((type) => type.id === object.typeId);
      const childCount = objects.filter((item) => item.parentId === object.id).length;
      const linkedSystemCount = systems.filter(
        (system) => system.scopeObjectIds.includes(object.id) || system.linkedRoomIds.includes(object.id),
      ).length;
      const linkedEquipmentCount = equipment.filter((item) => item.placementObjectId === object.id).length;
      const linkedTechCardCount = techCards.filter((item) => item.targetId === object.id).length;
      const summary = `${formatArea(object.area)} · ${childCount} доч. · ${linkedSystemCount} сист. · ${linkedEquipmentCount} обор. · ${linkedTechCardCount} ТК`;

      return {
        id: object.id,
        parentId: object.parentId,
        entityKind: 'object',
        title: object.name,
        subtitle: objectType?.name ?? 'Вид не задан',
        summary,
        warning: object.area === null ? 'нет площади' : object.status === 'retired' ? 'снят с учета' : undefined,
      };
    });
  }

  if (sectionId === 'objectTypes') {
    return objectTypes.map((type) => ({
      id: type.id,
      parentId: type.parentTypeId,
      entityKind: 'objectType',
      title: `${type.icon} ${type.name}`,
      subtitle: `${type.code} · ${type.shortName}`,
      summary: `${type.allowedChildTypeIds.length} доч. видов · ${type.parameterGroups.length} групп · ${type.parameters.length} параметров`,
      warning: !type.canCreateObjects ? 'создание запрещено' : undefined,
    }));
  }

  if (sectionId === 'techCards') {
    return techCards.map((card) => ({
      id: card.id,
      parentId: null,
      entityKind: 'techCard',
      title: card.name,
      subtitle: `${card.type} · цель: ${targetLabel(card.targetType)}`,
      summary: `${card.periodicity} · ${card.operations.length} опер. · ${card.minDurationManHours ?? '—'} чел-ч`,
      warning: card.operations.length === 0 ? 'нет операций' : undefined,
    }));
  }

  return dictionaries.map((item) => ({
    id: item.id,
    parentId: item.parentId,
    entityKind: 'dictionary',
    title: item.title,
    subtitle: item.code,
    summary: item.description,
  }));
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

  treeNodes.forEach((node) => {
    const siblings = map.get(node.parentId) ?? [];
    siblings.push(node);
    map.set(node.parentId, siblings);
  });

  map.forEach((siblings) => {
    siblings.sort((a, b) => (sortAscending ? a.title.localeCompare(b.title, 'ru') : b.title.localeCompare(a.title, 'ru')));
  });

  return map;
}

export function resolveSelectedEntity(
  selectedRef: SelectedRef,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
  dictionaries: DictionaryItem[],
  objectTypes: ObjectType[],
): SelectedEntityView | null {
  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;
    const objectType = objectTypes.find((type) => type.id === object.typeId);
    return { title: object.name, subtitle: objectType?.name ?? 'Вид не задан' };
  }

  if (selectedRef.kind === 'objectType') {
    const type = objectTypes.find((item) => item.id === selectedRef.id);
    return type ? { title: type.name, subtitle: `${type.code} · ${type.shortName}` } : null;
  }

  if (selectedRef.kind === 'techCard') {
    const card = techCards.find((item) => item.id === selectedRef.id);
    return card ? { title: card.name, subtitle: `${card.type} · ${resolveTargetName(card, objects, systems, equipment)}` } : null;
  }

  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  return dictionary ? { title: dictionary.title, subtitle: dictionary.code } : null;
}

export function resolveTargetName(
  card: TechCard,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
) {
  if (card.targetType === 'room') return objects.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  if (card.targetType === 'system') return systems.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  return equipment.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
}

export function targetLabel(targetType: TechCard['targetType']) {
  const labels: Record<TechCard['targetType'], string> = {
    room: 'помещение',
    system: 'система',
    equipment: 'оборудование',
  };
  return labels[targetType];
}

export function getRetireImpact(
  objectId: string,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
): RetireImpact | null {
  const selectedObject = objects.find((item) => item.id === objectId);
  if (!selectedObject) return null;

  const descendants = buildDescendantIds(objects, selectedObject.id);
  const affectedObjectIds = [selectedObject.id, ...descendants];
  const affectedSystems = systems.filter(
    (system) =>
      system.scopeObjectIds.some((id) => affectedObjectIds.includes(id)) ||
      system.linkedRoomIds.some((id) => affectedObjectIds.includes(id)),
  ).length;
  const affectedEquipment = equipment.filter((item) => affectedObjectIds.includes(item.placementObjectId)).length;
  const affectedTechCards = techCards.filter((card) => affectedObjectIds.includes(card.targetId)).length;

  return {
    targetObjectId: selectedObject.id,
    targetObjectName: selectedObject.name,
    descendantCount: descendants.length,
    affectedSystems,
    affectedEquipment,
    affectedTechCards,
    affectedObjectIds,
  };
}

export function getObjectTypeRetireImpact(typeId: string, objectTypes: ObjectType[], objects: InfrastructureObject[]): ObjectTypeRetireImpact | null {
  const selectedType = objectTypes.find((item) => item.id === typeId);
  if (!selectedType) return null;

  const descendants = buildObjectTypeDescendantIds(objectTypes, typeId);
  const affectedTypeIds = [typeId, ...descendants];

  return {
    targetTypeId: selectedType.id,
    targetTypeName: selectedType.name,
    childTypeCount: descendants.length,
    objectCount: objects.filter((object) => affectedTypeIds.includes(object.typeId)).length,
  };
}
