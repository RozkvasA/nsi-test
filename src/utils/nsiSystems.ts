import type { EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity } from '../types/nsi';

export const systemTabs = ['Параметры', 'Связи', 'Оборудование', 'Документы', 'Заметки'];

export const systemScopeLabels: Record<SystemEntity['scopeType'], string> = {
  wholeObject: 'Весь объект',
  objectNode: 'Узел дерева объектов',
  singleRoom: 'Одно помещение',
  multipleRooms: 'Несколько помещений',
};

const systemCoreCodes = new Set(['id', 'name', 'typeId', 'parentSystemId', 'scopeType', 'scopeObjectIds', 'linkedRoomIds', 'equipmentIds', 'quantity', 'unit']);

export function createSystemEntity(args: { createdAt: number; typeId: string; parentObject: InfrastructureObject | null; isRoom: boolean }): SystemEntity {
  return {
    id: `sys-${args.createdAt}`,
    name: 'Новая система',
    typeId: args.typeId,
    parentSystemId: null,
    scopeType: args.isRoom ? 'singleRoom' : 'objectNode',
    scopeObjectIds: args.parentObject && !args.isRoom ? [args.parentObject.id] : [],
    linkedRoomIds: args.parentObject && args.isRoom ? [args.parentObject.id] : [],
    equipmentIds: [],
    quantity: 1,
    unit: 'система',
    parameters: { serviceZone: args.parentObject?.name ?? 'Не задано', criticality: null },
  };
}

export function createEquipmentForSystem(args: { createdAt: number; systemId: string; typeId: string; placementObjectId: string }): EquipmentEntity {
  return {
    id: `eq-${args.createdAt}`,
    name: 'Новое оборудование',
    typeId: args.typeId,
    parentEquipmentId: null,
    systemId: args.systemId,
    placementObjectId: args.placementObjectId,
    quantity: 1,
    unit: 'шт.',
    parameters: { manufacturer: null, inventoryNumber: null },
  };
}

export function buildSystemDescendantIds(systems: SystemEntity[], rootId: string): string[] {
  const children = systems.filter((system) => system.parentSystemId === rootId);
  return children.flatMap((child) => [child.id, ...buildSystemDescendantIds(systems, child.id)]);
}

export function getSystemTypeParameters(objectType: ObjectType | undefined): ParameterDefinition[] {
  if (!objectType) return [];
  return objectType.parameters.filter((parameter) => !systemCoreCodes.has(parameter.code));
}

export function getSystemParameterValue(system: SystemEntity, parameter: ParameterDefinition): ParameterDefaultValue {
  if (parameter.code === 'name') return system.name;
  if (parameter.code === 'typeId') return system.typeId;
  if (parameter.code === 'parentSystemId') return system.parentSystemId;
  if (parameter.code === 'scopeType') return system.scopeType;
  if (parameter.code === 'quantity') return system.quantity;
  if (parameter.code === 'unit') return system.unit;
  return system.parameters[parameter.code] ?? parameter.defaultValue ?? null;
}

export function normalizeSystemParameterInput(parameter: ParameterDefinition, rawValue: string | boolean): ParameterDefaultValue {
  if (parameter.dataType === 'boolean') return Boolean(rawValue);
  if (parameter.dataType === 'number') {
    if (rawValue === '') return null;
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof rawValue === 'boolean') return rawValue;
  return rawValue === '' ? null : rawValue;
}

export function getSystemWarnings(system: SystemEntity, equipment: EquipmentEntity[]): string[] {
  const warnings: string[] = [];
  if (!system.typeId) warnings.push('система без вида');
  if (!system.scopeType) warnings.push('не задана область применения');
  if (system.scopeObjectIds.length === 0 && system.linkedRoomIds.length === 0) warnings.push('нет связанных объектов или помещений');

  const equipmentWithoutPlacement = equipment.filter((item) => (item.systemId === system.id || system.equipmentIds.includes(item.id)) && !item.placementObjectId);
  if (equipmentWithoutPlacement.length > 0) warnings.push(`оборудование без места размещения: ${equipmentWithoutPlacement.length}`);

  return warnings;
}

export function formatSystemSummary(system: SystemEntity, equipment: EquipmentEntity[]): string {
  const warnings = getSystemWarnings(system, equipment);
  return [
    systemScopeLabels[system.scopeType],
    `${system.scopeObjectIds.length} объект(ов)`,
    `${system.linkedRoomIds.length} помещ.`,
    `${equipment.filter((item) => item.systemId === system.id || system.equipmentIds.includes(item.id)).length} обор.`,
    warnings.length > 0 ? `${warnings.length} предупрежд.` : null,
  ].filter(Boolean).join(' · ');
}
