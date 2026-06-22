import type {
  DictionaryItem,
  ObjectType,
  TechCard,
  TechCardMaterial,
  TechCardOperation,
  TechCardPersonnel,
  TechCardPpe,
} from '../types/nsi';

export const techCardTabs = ['Параметры', 'Операции', 'Персонал', 'Материалы', 'СИЗ'];

export function createEmptyOperation(order: number): TechCardOperation {
  const id = `op-${Date.now()}-${order}`;
  return { id, order, name: 'Новая операция', description: '', required: true, expectedResult: '' };
}

export function createEmptyPersonnel(): TechCardPersonnel {
  return { id: `pers-${Date.now()}`, positionId: '', qualificationId: '', gradeId: '', count: 1, minDurationManHours: null, comment: '' };
}

export function createEmptyMaterial(): TechCardMaterial {
  return { id: `mat-${Date.now()}`, materialId: '', quantity: 1, unitId: 'unit-piece', required: false, comment: '' };
}

export function createEmptyPpe(): TechCardPpe {
  return { id: `ppe-row-${Date.now()}`, ppeId: '', quantity: 1, unitId: 'unit-piece', required: true, comment: '' };
}

export function getDictionaryChildren(dictionaries: DictionaryItem[], rootCode: string): DictionaryItem[] {
  const root = dictionaries.find((item) => item.code === rootCode);
  if (!root) return [];
  return dictionaries.filter((item) => item.parentId === root.id);
}

export function getDictionaryTitle(dictionaries: DictionaryItem[], id: string): string {
  if (!id) return 'Не выбрано';
  return dictionaries.find((item) => item.id === id)?.title ?? id;
}

export function getObjectTypeTitle(objectTypes: ObjectType[], id: string): string {
  if (!id) return 'Не выбрано';
  return objectTypes.find((item) => item.id === id)?.name ?? id;
}

export function getWorkTypeTitle(dictionaries: DictionaryItem[], id: string): string {
  return getDictionaryTitle(dictionaries, id);
}

export function getTechCardWarnings(card: TechCard): string[] {
  if (!card.isActive) return [];
  const warnings: string[] = [];

  if (!card.name.trim()) warnings.push('нет наименования');
  if (!card.type.trim()) warnings.push('нет типа');
  if (!card.targetObjectTypeId && !card.targetId) warnings.push('не выбран вид объекта или конкретный объект применения');
  if (!card.workTypeId) warnings.push('нет вида работ');
  if (!card.inputDate) warnings.push('нет даты ввода');
  if (!card.periodicity && !card.minExecutionInterval) warnings.push('нет периодичности или минимального интервала');
  if (card.operations.length === 0) warnings.push('нет операций');
  if (card.personnel.length === 0) warnings.push('нет персонала');

  return warnings;
}

export function formatTechCardSummary(card: TechCard, objectTypes: ObjectType[], dictionaries: DictionaryItem[]): string {
  const warnings = getTechCardWarnings(card);
  const parts = [
    card.type || 'тип не задан',
    getObjectTypeTitle(objectTypes, card.targetObjectTypeId),
    getWorkTypeTitle(dictionaries, card.workTypeId),
    card.periodicity || 'периодичность не задана',
    card.minExecutionInterval || 'мин. интервал не задан',
    `${card.operations.length} опер.`,
    `${card.personnel.length} перс.`,
    `${card.materials.length} мат.`,
    `${card.ppe.length} СИЗ`,
    card.isActive ? 'активная' : 'неактивная',
    warnings.length > 0 ? `${warnings.length} предупрежд.` : null,
  ];

  return parts.filter(Boolean).join(' · ');
}

export function moveOperation(operations: TechCardOperation[], operationId: string, direction: 'up' | 'down'): TechCardOperation[] {
  const index = operations.findIndex((operation) => operation.id === operationId);
  if (index < 0) return operations;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= operations.length) return operations;

  const next = [...operations];
  const [operation] = next.splice(index, 1);
  next.splice(targetIndex, 0, operation);
  return next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }));
}
