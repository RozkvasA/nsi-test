import type { EquipmentEntity, InfrastructureObject, ObjectType, SystemEntity, TechCard } from '../types/nsi';
import { collectRequiredParameterWarnings } from './nsiObjectParameters';
import { getObjectLevel, getRootDetailLevel } from './nsiObjectTemplates';

export interface OverviewRoomItem {
  id: string;
  name: string;
  typeName: string;
  quantity: number;
  area: number | null;
}

export interface OverviewSystemItem {
  id: string;
  name: string;
  scope: string;
  equipmentCount: number;
}

export interface OverviewDetailNode {
  id: string;
  name: string;
  typeName: string;
  path: string;
  rooms: OverviewRoomItem[];
  systems: OverviewSystemItem[];
}

export interface OverviewOutlineNode {
  id: string;
  name: string;
  typeName: string;
  path: string;
  level: number;
  detailChildren: OverviewDetailNode[];
}

export interface OverviewRootCard {
  id: string;
  name: string;
  typeName: string;
  detailLevel: number;
  area: number | null;
  descendantCount: number;
  roomsCount: number;
  systemsCount: number;
  equipmentCount: number;
  techCardsCount: number;
  warnings: string[];
  detailNodes: OverviewDetailNode[];
  outlineNodes: OverviewOutlineNode[];
}

const getTypeName = (objectTypes: ObjectType[], typeId: string) => objectTypes.find((type) => type.id === typeId)?.name ?? 'Вид не задан';
const isRoomObject = (objectTypes: ObjectType[], object: InfrastructureObject) => objectTypes.find((type) => type.id === object.typeId)?.code === 'ROOM';
const isZoneLikeObject = (objectTypes: ObjectType[], object: InfrastructureObject) => ['ROOM', 'ZONE'].includes(objectTypes.find((type) => type.id === object.typeId)?.code ?? '');

function getDescendantIds(objects: InfrastructureObject[], rootId: string): string[] {
  const children = objects.filter((object) => object.parentId === rootId);
  return children.flatMap((child) => [child.id, ...getDescendantIds(objects, child.id)]);
}

function getPath(objects: InfrastructureObject[], objectId: string): string {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const path: string[] = [];
  let current = byId.get(objectId);
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path.join(' / ');
}

function getAncestorIds(objects: InfrastructureObject[], objectId: string): string[] {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const ancestors: string[] = [];
  let current = byId.get(objectId);
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    ancestors.push(current.parentId);
    current = byId.get(current.parentId);
  }

  return ancestors;
}

function getApplicableSystems(node: InfrastructureObject, objects: InfrastructureObject[], systems: SystemEntity[]): OverviewSystemItem[] {
  const subtreeIds = [node.id, ...getDescendantIds(objects, node.id)];
  const ancestorIds = getAncestorIds(objects, node.id);
  const applicableObjectIds = new Set([...subtreeIds, ...ancestorIds]);

  return systems
    .filter((system) => system.scopeObjectIds.some((id) => applicableObjectIds.has(id)) || system.linkedRoomIds.some((id) => subtreeIds.includes(id)))
    .map((system) => ({
      id: system.id,
      name: system.name,
      scope: system.scopeObjectIds.length > 0 ? `область: ${system.scopeObjectIds.length} объект(ов)` : system.scopeType,
      equipmentCount: system.equipmentIds.length,
    }));
}

function getRoomsForDetailNode(node: InfrastructureObject, objects: InfrastructureObject[], objectTypes: ObjectType[]): OverviewRoomItem[] {
  const subtreeObjects = objects.filter((object) => [node.id, ...getDescendantIds(objects, node.id)].includes(object.id));
  const items = subtreeObjects.filter((object) => object.id !== node.id && isZoneLikeObject(objectTypes, object));

  return items.map((object) => ({
    id: object.id,
    name: object.name,
    typeName: getTypeName(objectTypes, object.typeId),
    quantity: object.quantity,
    area: object.area,
  }));
}

function toDetailNode(node: InfrastructureObject, objects: InfrastructureObject[], objectTypes: ObjectType[], systems: SystemEntity[]): OverviewDetailNode {
  return {
    id: node.id,
    name: node.name,
    typeName: getTypeName(objectTypes, node.typeId),
    path: getPath(objects, node.id),
    rooms: getRoomsForDetailNode(node, objects, objectTypes),
    systems: getApplicableSystems(node, objects, systems),
  };
}

function buildOutlineNodes(root: InfrastructureObject, objects: InfrastructureObject[], objectTypes: ObjectType[], systems: SystemEntity[], detailLevel: number): OverviewOutlineNode[] {
  const rootChildNodes = objects.filter((object) => object.parentId === root.id);

  return rootChildNodes.map((child) => {
    const childSubtreeIds = [child.id, ...getDescendantIds(objects, child.id)];
    const detailCandidates = objects.filter((object) => childSubtreeIds.includes(object.id) && getObjectLevel(objects, object.id) === detailLevel);
    const detailChildren = (detailCandidates.length > 0 ? detailCandidates : [child]).map((node) => toDetailNode(node, objects, objectTypes, systems));

    return {
      id: child.id,
      name: child.name,
      typeName: getTypeName(objectTypes, child.typeId),
      path: getPath(objects, child.id),
      level: getObjectLevel(objects, child.id),
      detailChildren,
    };
  });
}

export function buildObjectOverviewCards(
  objects: InfrastructureObject[],
  objectTypes: ObjectType[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
): OverviewRootCard[] {
  return objects
    .filter((object) => object.parentId === null)
    .map((root) => {
      const descendantIds = getDescendantIds(objects, root.id);
      const objectIds = [root.id, ...descendantIds];
      const detailLevel = getRootDetailLevel(root);
      const detailNodes = objects.filter((object) => objectIds.includes(object.id) && getObjectLevel(objects, object.id) === detailLevel);
      const systemsInBranch = systems.filter((system) => system.scopeObjectIds.some((id) => objectIds.includes(id)) || system.linkedRoomIds.some((id) => objectIds.includes(id)));
      const equipmentInBranch = equipment.filter((item) => objectIds.includes(item.placementObjectId) || systemsInBranch.some((system) => system.equipmentIds.includes(item.id)));
      const targetIdsForTechCards = new Set([...objectIds, ...systemsInBranch.map((system) => system.id), ...equipmentInBranch.map((item) => item.id)]);
      const objectType = objectTypes.find((type) => type.id === root.typeId);
      const warnings = [root.status === 'retired' ? 'объект снят с учета' : null, ...collectRequiredParameterWarnings(root, objectType)].filter((item): item is string => Boolean(item));

      return {
        id: root.id,
        name: root.name,
        typeName: getTypeName(objectTypes, root.typeId),
        detailLevel,
        area: root.area,
        descendantCount: descendantIds.length,
        roomsCount: objects.filter((object) => objectIds.includes(object.id) && isRoomObject(objectTypes, object)).length,
        systemsCount: systemsInBranch.length,
        equipmentCount: equipmentInBranch.length,
        techCardsCount: techCards.filter((card) => targetIdsForTechCards.has(card.targetId)).length,
        warnings,
        detailNodes: (detailNodes.length > 0 ? detailNodes : [root]).map((node) => toDetailNode(node, objects, objectTypes, systems)),
        outlineNodes: buildOutlineNodes(root, objects, objectTypes, systems, detailLevel),
      };
    });
}
