import type { InfrastructureObject, ObjectStructureTemplate } from '../types/nsi';

export interface GeneratedTemplateObjects {
  objects: InfrastructureObject[];
  rootObjectId: string;
  expandedObjectIds: string[];
}

export interface ObjectDetailInfo {
  objectLevel: number;
  detailLevel: number;
  rootObjectId: string;
  isDetailAvailable: boolean;
  remainingLevels: number;
}

export function getObjectLevel(objects: InfrastructureObject[], objectId: string): number {
  let level = 1;
  const byId = new Map(objects.map((object) => [object.id, object]));
  let current = byId.get(objectId);
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    level += 1;
    current = parent;
  }

  return level;
}

export function findRootObject(objects: InfrastructureObject[], objectId: string): InfrastructureObject | null {
  const byId = new Map(objects.map((object) => [object.id, object]));
  let current = byId.get(objectId) ?? null;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }

  return current;
}

export function normalizeDetailLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 1;
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.round(parsed));
}

export function getRootDetailLevel(rootObject: InfrastructureObject | null): number {
  return normalizeDetailLevel(rootObject?.parameters.detailLevel);
}

export function getObjectDetailInfo(objects: InfrastructureObject[], objectId: string): ObjectDetailInfo {
  const root = findRootObject(objects, objectId);
  const objectLevel = getObjectLevel(objects, objectId);
  const detailLevel = getRootDetailLevel(root);
  const remainingLevels = Math.max(0, detailLevel - objectLevel);

  return {
    objectLevel,
    detailLevel,
    rootObjectId: root?.id ?? objectId,
    isDetailAvailable: objectLevel >= detailLevel,
    remainingLevels,
  };
}

export function getDetailSummaryLabel(objects: InfrastructureObject[], objectId: string): string {
  const info = getObjectDetailInfo(objects, objectId);
  return info.isDetailAvailable ? 'детализация доступна' : `до детализации ${info.remainingLevels} ур.`;
}

export function getDetailStatusLabel(objects: InfrastructureObject[], objectId: string): string {
  return getObjectDetailInfo(objects, objectId).isDetailAvailable ? 'доступна детализация' : 'еще не достигнута';
}

export function buildObjectsFromTemplate(template: ObjectStructureTemplate, rootName: string, detailLevel: number): GeneratedTemplateObjects {
  const createdObjects: InfrastructureObject[] = [];
  const createdIdsByTemplateNode = new Map<string, string[]>();
  const expandedObjectIds: string[] = [];
  const createdAt = Date.now();
  let counter = 0;
  let rootObjectId = '';

  template.nodes.forEach((node) => {
    const parentIds = node.parentNodeId ? createdIdsByTemplateNode.get(node.parentNodeId) ?? [] : [null];
    const nodeCreatedIds: string[] = [];

    parentIds.forEach((parentId) => {
      const count = Math.max(1, Math.round(node.quantity));
      for (let index = 1; index <= count; index += 1) {
        counter += 1;
        const id = `obj-tpl-${createdAt}-${counter}`;
        const isRoot = node.parentNodeId === null;
        const hasManySiblings = count > 1;
        const objectName = isRoot ? rootName || node.name : hasManySiblings ? `${node.name} ${index}` : node.name;
        const objectShortName = isRoot ? node.shortName : hasManySiblings ? `${node.shortName} ${index}` : node.shortName;

        const nextObject: InfrastructureObject = {
          id,
          name: objectName,
          shortName: objectShortName,
          typeId: isRoot ? template.rootTypeId : node.typeId,
          parentId,
          area: null,
          quantity: 1,
          unit: node.unit,
          status: 'active',
          parameters: {
            ...node.parameters,
            ...(isRoot
              ? {
                  detailLevel: normalizeDetailLevel(detailLevel),
                  templateId: template.id,
                  templateName: template.name,
                }
              : {}),
          },
        };

        createdObjects.push(nextObject);
        nodeCreatedIds.push(id);
        if (parentId) expandedObjectIds.push(parentId);
        if (isRoot && !rootObjectId) rootObjectId = id;
      }
    });

    createdIdsByTemplateNode.set(node.id, nodeCreatedIds);
  });

  return {
    objects: createdObjects,
    rootObjectId: rootObjectId || createdObjects[0]?.id || '',
    expandedObjectIds: Array.from(new Set(expandedObjectIds)),
  };
}
