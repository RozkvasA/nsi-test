import type { EquipmentEntity, EquipmentLevel, InfrastructureObject, ObjectType, PendingEquipmentDraft, SystemEntity } from '../../types/nsi';

interface EquipmentDraftPanelProps {
  draft: PendingEquipmentDraft;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  onUpdate: (patch: Partial<PendingEquipmentDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const equipmentLevelOptions: Array<{ value: EquipmentLevel; label: string }> = [
  { value: 'unit', label: 'Конкретная единица' },
  { value: 'group', label: 'Группа однотипных единиц' },
  { value: 'model', label: 'Модель / тип' },
  { value: 'aggregate', label: 'Агрегат / узел' },
];

export function EquipmentDraftPanel({ draft, objects, objectTypes, systems, equipment, onUpdate, onConfirm, onCancel }: EquipmentDraftPanelProps) {
  const aggregate = draft.equipmentLevel !== 'unit';
  const parent = draft.parentEquipmentId ? equipment.find((item) => item.id === draft.parentEquipmentId) : null;

  return (
    <div className="create-object-panel calm-create-panel equipment-create-panel">
      <div className="section-title">
        <h3>Новое оборудование</h3>
        <p>Сначала выберите, что создается: единица, группа, модель или агрегат.</p>
      </div>
      {parent ? <label className="field-row"><span>Родительское оборудование</span><input value={parent.name} readOnly /></label> : null}
      <label className="field-row"><span>Наименование</span><input value={draft.name} onChange={(event) => onUpdate({ name: event.target.value })} /></label>
      <label className="field-row"><span>Вид оборудования</span><select value={draft.typeId} onChange={(event) => onUpdate({ typeId: event.target.value })}>{objectTypes.map((type) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label>
      <label className="field-row"><span>Уровень учета</span><select value={draft.equipmentLevel} onChange={(event) => onUpdate({ equipmentLevel: event.target.value as EquipmentLevel })}>{equipmentLevelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="field-row"><span>Система</span><select value={draft.systemId} onChange={(event) => onUpdate({ systemId: event.target.value })}><option value="">Самостоятельное оборудование</option>{systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
      <label className="field-row"><span>Место размещения</span><select value={draft.placementObjectId} onChange={(event) => onUpdate({ placementObjectId: event.target.value })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
      {aggregate ? <label className="field-row"><span>Количество</span><input type="number" min={1} value={draft.quantity} onChange={(event) => onUpdate({ quantity: Number(event.target.value) || 1 })} /></label> : null}
      {aggregate ? <label className="field-row"><span>Единица измерения</span><input value={draft.unit} onChange={(event) => onUpdate({ unit: event.target.value })} /></label> : null}
      <div className="create-actions"><button type="button" onClick={onConfirm}>Создать оборудование</button><button type="button" onClick={onCancel}>Отмена</button></div>
    </div>
  );
}
