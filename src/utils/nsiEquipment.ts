import type { EquipmentEntity, InfrastructureObject, ObjectType, ParameterDefaultValue, ParameterDefinition, SystemEntity, TechCard } from '../types/nsi';
import { getObjectDetailInfo } from './nsiObjectTemplates';

export const equipmentTabs = ['Параметры', 'Размещение', 'Вложенность', 'Техкарты', 'Документы', 'Заметки'];

const equipmentCoreCodes = new Set(['id', 'name', 'typeId', 'parentEquipmentId', 'systemId', 'placementObjectId', 'quantity', 'unit']);

export function createEquipmentEntity(args: {
  createdAt: number;
  systemId: string;
  typeId: string;
  placementObjectId: string;
  parentEquipmentId?: string | null;
  name?: string;
}): EquipmentEntity {
  return {
    id: `eq-${args.createdAt}`,
    name: args.name ?? 'Новое оборудование',
    typeId: args.typeId,
    parentEquipmentId: args.parentEquipmentId ?? null,
    systemId: args.systemId,
    placementObjectId: args.placementObjectId,
    quantity: 1,
    unit: 'шт.',
    parameters: { manufacturer: null, inventoryNumber: null },
  };
}

export function buildEquipmentDescendantIds(equipment: EquipmentEntity[], rootId: string): string[] {
  const children = equipment.filter((item) => item.parentEquipmentId === rootId);
  return children.flatMap((child) => [child.id, ...buildEquipmentDescendantIds(equipment, child.id)]);
}

export function getEquipmentTypeParameters(objectType: ObjectType | undefined): ParameterDefinition[] {
  if (!objectType) return [];
  return objectType.parameters.filter((parameter) => !equipmentCoreCodes.has(parameter.code));
}

export function getEquipmentParameterValue(equipmentItem: EquipmentEntity, parameter: ParameterDefinition): ParameterDefaultValue {
  if (parameter.code === 'name') return equipmentItem.name;
  if (parameter.code === 'typeId') return equipmentItem.typeId;
  if (parameter.code === 'parentEquipmentId') return equipmentItem.parentEquipmentId;
  if (parameter.code === 'systemId') return equipmentItem.systemId;
  if (parameter.code === 'placementObjectId') return equipmentItem.placementObjectId;
  if (parameter.code === 'quantity') return equipmentItem.quantity;
  if (parameter.code === 'unit') return equipmentItem.unit;
  return equipmentItem.parameters[parameter.code] ?? parameter.defaultValue ?? null;
}

export function normalizeEquipmentParameterInput(parameter: ParameterDefinition, rawValue: string | boolean): ParameterDefaultValue {
  if (parameter.dataType === 'boolean') return Boolean(rawValue);
  if (parameter.dataType === 'number') {
    if (rawValue === '') return null;
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof rawValue === 'boolean') return rawValue;
  return rawValue === '' ? null : rawValue;
}

export function getEquipmentWarnings(equipmentItem: EquipmentEntity, equipment: EquipmentEntity[], systems: SystemEntity[]): string[] {
  const warnings: string[] = [];
  if (!equipmentItem.typeId) warnings.push('оборудование без вида');
  if (!equipmentItem.systemId) warnings.push('оборудование без системы');
  if (!equipmentItem.placementObjectId) warnings.push('оборудование без места размещения');

  if (equipmentItem.parentEquipmentId) {
    if (equipmentItem.parentEquipmentId === equipmentItem.id) warnings.push('оборудование выбрано родителем само себе');
    const descendantIds = buildEquipmentDescendantIds(equipment, equipmentItem.id);
    if (descendantIds.includes(equipmentItem.parentEquipmentId)) warnings.push('родителем выбран собственный потомок');
    const parent = equipment.find((item) => item.id === equipmentItem.parentEquipmentId);
    if (parent && parent.systemId !== equipmentItem.systemId) warnings.push('родительское оборудование находится в другой системе');
  }

  if (equipmentItem.systemId && !systems.some((system) => system.id === equipmentItem.systemId)) warnings.push('указанная система не найдена');
  return warnings;
}

export function getApplicableTechCardsForEquipment(equipmentItem: EquipmentEntity, techCards: TechCard[]): TechCard[] {
  return techCards.filter((card) => (card.targetType === 'equipment' && card.targetId === equipmentItem.id) || card.targetObjectTypeId === equipmentItem.typeId);
}

export function getEquipmentPlacementInfo(objects: InfrastructureObject[], equipmentItem: EquipmentEntity) {
  const object = objects.find((item) => item.id === equipmentItem.placementObjectId) ?? null;
  return {
    object,
    detailInfo: object ? getObjectDetailInfo(objects, object.id) : null,
  };
}

export function formatEquipmentSummary(equipmentItem: EquipmentEntity, equipment: EquipmentEntity[], systems: SystemEntity[]): string {
  const warnings = getEquipmentWarnings(equipmentItem, equipment, systems);
  return [equipmentItem.quantity ? `${equipmentItem.quantity} ${equipmentItem.unit}` : null, equipmentItem.systemId ? `система: ${equipmentItem.systemId}` : 'без системы', equipmentItem.placementObjectId ? `размещение: ${equipmentItem.placementObjectId}` : 'без размещения', warnings.length > 0 ? `${warnings.length} предупрежд.` : null].filter(Boolean).join(' · ');
}
