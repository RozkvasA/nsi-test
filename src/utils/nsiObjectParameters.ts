import type { InfrastructureObject, ObjectType, ParameterDefinition, ParameterDefaultValue } from '../types/nsi';

export const coreObjectFieldCodes = new Set(['id', 'name', 'shortName', 'typeId', 'parentId', 'area', 'quantity', 'unit', 'status']);
export const relationParameterCodes = new Set(['systems', 'equipment', 'techCards']);

export function getObjectParameterValue(object: InfrastructureObject, parameter: ParameterDefinition): ParameterDefaultValue {
  const builtInValue = getBuiltInObjectValue(object, parameter.code);
  if (builtInValue !== undefined) return builtInValue;
  return object.parameters[parameter.code] ?? parameter.defaultValue ?? null;
}

export function getBuiltInObjectValue(object: InfrastructureObject, code: string): ParameterDefaultValue | undefined {
  if (code === 'name') return object.name;
  if (code === 'shortName') return object.shortName;
  if (code === 'typeId') return object.typeId;
  if (code === 'parentId') return object.parentId;
  if (code === 'area') return object.area;
  if (code === 'quantity') return object.quantity;
  if (code === 'unit') return object.unit;
  if (code === 'status') return object.status;
  return undefined;
}

export function normalizeParameterInput(parameter: ParameterDefinition, rawValue: string | boolean): ParameterDefaultValue {
  if (parameter.dataType === 'boolean') return Boolean(rawValue);
  if (parameter.dataType === 'number') {
    if (rawValue === '') return null;
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof rawValue === 'boolean') return rawValue;
  return rawValue === '' ? null : rawValue;
}

export function isEmptyParameterValue(value: ParameterDefaultValue | undefined): boolean {
  return value === null || value === undefined || value === '';
}

export function getMainObjectTypeParameters(objectType: ObjectType | undefined): ParameterDefinition[] {
  if (!objectType) return [];
  const mainGroup = objectType.parameterGroups.find((group) => group.name.toLowerCase().includes('основ')) ?? objectType.parameterGroups[0];
  const mainIds = new Set(mainGroup?.parameterIds ?? []);
  return objectType.parameters.filter((parameter) => mainIds.has(parameter.id) && !coreObjectFieldCodes.has(parameter.code) && !relationParameterCodes.has(parameter.code));
}

export function getAdditionalObjectTypeParameters(objectType: ObjectType | undefined): ParameterDefinition[] {
  if (!objectType) return [];
  const mainParameterIds = new Set(getMainObjectTypeParameters(objectType).map((parameter) => parameter.id));
  return objectType.parameters.filter(
    (parameter) => !mainParameterIds.has(parameter.id) && !coreObjectFieldCodes.has(parameter.code) && !relationParameterCodes.has(parameter.code),
  );
}

export function collectRequiredParameterWarnings(object: InfrastructureObject, objectType: ObjectType | undefined): string[] {
  if (!objectType) return ['Вид объекта не найден'];
  return objectType.parameters
    .filter((parameter) => parameter.required)
    .filter((parameter) => isEmptyParameterValue(getObjectParameterValue(object, parameter)))
    .map((parameter) => `Не заполнен параметр: ${parameter.name}`);
}

export function formatParameterValue(value: ParameterDefaultValue | undefined, unit?: string): string {
  if (isEmptyParameterValue(value)) return 'не заполнено';
  const rendered = typeof value === 'boolean' ? (value ? 'да' : 'нет') : String(value);
  return unit ? `${rendered} ${unit}` : rendered;
}

export function formatShowInTreeParameters(object: InfrastructureObject, objectType: ObjectType | undefined): string[] {
  if (!objectType) return [];
  return objectType.parameters
    .filter((parameter) => parameter.showInTree)
    .filter((parameter) => !['name', 'shortName', 'area'].includes(parameter.code))
    .map((parameter) => `${parameter.name}: ${formatParameterValue(getObjectParameterValue(object, parameter), parameter.unit)}`);
}
