import type {
  DictionaryItem,
  ObjectType,
  TechCard,
  TechCardMaterial,
  TechCardOperation,
  TechCardPersonnel,
  TechCardPpe,
} from '../../types/nsi';
import {
  createEmptyMaterial,
  createEmptyOperation,
  createEmptyPersonnel,
  createEmptyPpe,
  getDictionaryChildren,
  getDictionaryTitle,
  getTechCardWarnings,
  moveOperation,
  techCardTabs,
} from '../../utils/nsiTechCards';

interface TechCardContentProps {
  card: TechCard;
  objectTypes: ObjectType[];
  dictionaries: DictionaryItem[];
  activeTab: string;
  onSetActiveTab: (tab: string) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

export function TechCardContent({ card, objectTypes, dictionaries, activeTab, onSetActiveTab, onUpdateTechCard }: TechCardContentProps) {
  const safeActiveTab = techCardTabs.includes(activeTab) ? activeTab : 'Параметры';
  const warnings = getTechCardWarnings(card);

  const patchCard = (patch: Partial<TechCard>) => onUpdateTechCard(card.id, patch);

  return (
    <div className="tech-card-editor">
      <div className="tabs tech-card-tabs">
        {techCardTabs.map((tab) => (
          <button key={tab} type="button" className={tab === safeActiveTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="inline-warning tech-card-warning">
          <b>Предупреждения по техкарте</b>
          <p>{warnings.join('; ')}</p>
        </div>
      ) : null}

      {safeActiveTab === 'Параметры' ? (
        <TechCardParameters card={card} objectTypes={objectTypes} dictionaries={dictionaries} patchCard={patchCard} />
      ) : null}
      {safeActiveTab === 'Операции' ? <TechCardOperations card={card} patchCard={patchCard} /> : null}
      {safeActiveTab === 'Персонал' ? <TechCardPersonnelTab card={card} dictionaries={dictionaries} patchCard={patchCard} /> : null}
      {safeActiveTab === 'Материалы' ? <TechCardMaterials card={card} dictionaries={dictionaries} patchCard={patchCard} /> : null}
      {safeActiveTab === 'СИЗ' ? <TechCardPpeTab card={card} dictionaries={dictionaries} patchCard={patchCard} /> : null}
    </div>
  );
}

function TechCardParameters({
  card,
  objectTypes,
  dictionaries,
  patchCard,
}: {
  card: TechCard;
  objectTypes: ObjectType[];
  dictionaries: DictionaryItem[];
  patchCard: (patch: Partial<TechCard>) => void;
}) {
  const workTypes = getDictionaryChildren(dictionaries, 'WORK_TYPES');

  return (
    <div className="parameter-section">
      <SectionTitle title="Параметры технологической карты" description="Основные реквизиты нормативной карточки работ. Планирование и расчет графика здесь не выполняются." />
      <ReadOnlyField label="Идентификатор" value={card.id} />
      <EditableField label="Наименование" value={card.name} onChange={(value) => patchCard({ name: value })} />
      <EditableField label="Тип" value={card.type} onChange={(value) => patchCard({ type: value })} />
      <SelectField label="Вид объекта" value={card.targetObjectTypeId} options={[{ value: '', label: 'Не выбрано' }, ...objectTypes.map((type) => ({ value: type.id, label: `${type.icon} ${type.name}` }))]} onChange={(value) => patchCard({ targetObjectTypeId: value })} />
      <SelectField label="Вид работ" value={card.workTypeId} options={[{ value: '', label: 'Не выбрано' }, ...workTypes.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => patchCard({ workTypeId: value })} />
      <EditableField label="Дата ввода" type="date" value={card.inputDate} onChange={(value) => patchCard({ inputDate: value })} />
      <EditableField label="Дата вывода" type="date" value={card.outputDate} onChange={(value) => patchCard({ outputDate: value })} />
      <EditableField label="Периодичность" value={card.periodicity} onChange={(value) => patchCard({ periodicity: value })} />
      <EditableField label="Минимальный интервал выполнения" value={card.minExecutionInterval} onChange={(value) => patchCard({ minExecutionInterval: value })} />
      <CheckboxField label="Активная" checked={card.isActive} onChange={(checked) => patchCard({ isActive: checked })} />
      <CheckboxField label="Комплексная" checked={card.isComplex} onChange={(checked) => patchCard({ isComplex: checked })} />
    </div>
  );
}

function TechCardOperations({ card, patchCard }: { card: TechCard; patchCard: (patch: Partial<TechCard>) => void }) {
  const updateOperation = (operationId: string, patch: Partial<TechCardOperation>) => {
    patchCard({ operations: card.operations.map((operation) => (operation.id === operationId ? { ...operation, ...patch } : operation)) });
  };

  const deleteOperation = (operationId: string) => {
    patchCard({ operations: card.operations.filter((operation) => operation.id !== operationId).map((operation, index) => ({ ...operation, order: index + 1 })) });
  };

  return (
    <div className="parameter-section">
      <SectionTitle title="Операции" description="Состав работ редактируется прямо в карточке техкарты." />
      <button type="button" className="secondary-action" onClick={() => patchCard({ operations: [...card.operations, createEmptyOperation(card.operations.length + 1)] })}>
        Добавить операцию
      </button>
      {card.isActive && card.operations.length === 0 ? <InlineWarning message="Активная техкарта должна содержать хотя бы одну операцию." /> : null}
      {card.operations.length === 0 ? <EmptyState title="Операций нет" description="Добавьте первую операцию для технологической карты." /> : null}
      {card.operations
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((operation, index) => (
          <div className="tech-card-row" key={operation.id}>
            <div className="inline-title">
              <b>Операция {operation.order}</b>
              <div className="row-actions-inline">
                <button type="button" onClick={() => patchCard({ operations: moveOperation(card.operations, operation.id, 'up') })} disabled={index === 0}>Выше</button>
                <button type="button" onClick={() => patchCard({ operations: moveOperation(card.operations, operation.id, 'down') })} disabled={index === card.operations.length - 1}>Ниже</button>
                <button type="button" onClick={() => deleteOperation(operation.id)}>Удалить</button>
              </div>
            </div>
            <EditableField label="Порядок" type="number" value={operation.order} onChange={(value) => updateOperation(operation.id, { order: Number(value) || 1 })} />
            <EditableField label="Наименование" value={operation.name} onChange={(value) => updateOperation(operation.id, { name: value })} />
            <TextAreaField label="Описание" value={operation.description} onChange={(value) => updateOperation(operation.id, { description: value })} />
            <CheckboxField label="Обязательная" checked={operation.required} onChange={(checked) => updateOperation(operation.id, { required: checked })} />
            <TextAreaField label="Ожидаемый результат" value={operation.expectedResult} onChange={(value) => updateOperation(operation.id, { expectedResult: value })} />
          </div>
        ))}
    </div>
  );
}

function TechCardPersonnelTab({ card, dictionaries, patchCard }: { card: TechCard; dictionaries: DictionaryItem[]; patchCard: (patch: Partial<TechCard>) => void }) {
  const positions = getDictionaryChildren(dictionaries, 'POSITIONS');
  const qualifications = getDictionaryChildren(dictionaries, 'QUALIFICATIONS');
  const grades = getDictionaryChildren(dictionaries, 'GRADES');

  const updatePersonnel = (rowId: string, patch: Partial<TechCardPersonnel>) => {
    patchCard({ personnel: card.personnel.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) });
  };

  return (
    <div className="parameter-section">
      <SectionTitle title="Персонал" description="Требования к исполнителям работ. Должности, квалификации и разряды берутся из справочников." />
      <button type="button" className="secondary-action" onClick={() => patchCard({ personnel: [...card.personnel, createEmptyPersonnel()] })}>Добавить персонал</button>
      {card.isActive && card.personnel.length === 0 ? <InlineWarning message="Активная техкарта должна содержать требования к персоналу." /> : null}
      {card.personnel.length === 0 ? <EmptyState title="Персонал не задан" description="Добавьте исполнителей или оставьте техкарту черновой." /> : null}
      {card.personnel.map((row) => (
        <div className="tech-card-row" key={row.id}>
          <div className="inline-title"><b>{getDictionaryTitle(dictionaries, row.positionId)}</b><button type="button" onClick={() => patchCard({ personnel: card.personnel.filter((item) => item.id !== row.id) })}>Удалить</button></div>
          <SelectField label="Должность" value={row.positionId} options={[{ value: '', label: 'Не выбрано' }, ...positions.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updatePersonnel(row.id, { positionId: value })} />
          <SelectField label="Квалификация" value={row.qualificationId} options={[{ value: '', label: 'Не выбрано' }, ...qualifications.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updatePersonnel(row.id, { qualificationId: value })} />
          <SelectField label="Разряд" value={row.gradeId} options={[{ value: '', label: 'Не выбрано' }, ...grades.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updatePersonnel(row.id, { gradeId: value })} />
          <EditableField label="Количество исполнителей" type="number" value={row.count} onChange={(value) => updatePersonnel(row.id, { count: Number(value) || 1 })} />
          <EditableField label="Минимальная длительность, чел-ч" type="number" value={row.minDurationManHours ?? ''} onChange={(value) => updatePersonnel(row.id, { minDurationManHours: value === '' ? null : Number(value) })} />
          <TextAreaField label="Комментарий" value={row.comment} onChange={(value) => updatePersonnel(row.id, { comment: value })} />
        </div>
      ))}
    </div>
  );
}

function TechCardMaterials({ card, dictionaries, patchCard }: { card: TechCard; dictionaries: DictionaryItem[]; patchCard: (patch: Partial<TechCard>) => void }) {
  const materials = getDictionaryChildren(dictionaries, 'MATERIALS');
  const units = getDictionaryChildren(dictionaries, 'UNITS');
  const updateMaterial = (rowId: string, patch: Partial<TechCardMaterial>) => patchCard({ materials: card.materials.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) });

  return (
    <div className="parameter-section">
      <SectionTitle title="Материалы" description="Материалы и расходники. Список может быть осознанно пустым, если материалы не требуются." />
      <button type="button" className="secondary-action" onClick={() => patchCard({ materials: [...card.materials, createEmptyMaterial()] })}>Добавить материал</button>
      {card.materials.length === 0 ? <EmptyState title="Материалы не заданы" description="Это допустимо, если работа не требует расходников." /> : null}
      {card.materials.map((row) => (
        <div className="tech-card-row" key={row.id}>
          <div className="inline-title"><b>{getDictionaryTitle(dictionaries, row.materialId)}</b><button type="button" onClick={() => patchCard({ materials: card.materials.filter((item) => item.id !== row.id) })}>Удалить</button></div>
          <SelectField label="Материал" value={row.materialId} options={[{ value: '', label: 'Не выбрано' }, ...materials.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updateMaterial(row.id, { materialId: value })} />
          <EditableField label="Количество" type="number" value={row.quantity} onChange={(value) => updateMaterial(row.id, { quantity: Number(value) || 0 })} />
          <SelectField label="Единица измерения" value={row.unitId} options={[{ value: '', label: 'Не выбрано' }, ...units.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updateMaterial(row.id, { unitId: value })} />
          <CheckboxField label="Обязательный материал" checked={row.required} onChange={(checked) => updateMaterial(row.id, { required: checked })} />
          <TextAreaField label="Комментарий" value={row.comment} onChange={(value) => updateMaterial(row.id, { comment: value })} />
        </div>
      ))}
    </div>
  );
}

function TechCardPpeTab({ card, dictionaries, patchCard }: { card: TechCard; dictionaries: DictionaryItem[]; patchCard: (patch: Partial<TechCard>) => void }) {
  const ppeItems = getDictionaryChildren(dictionaries, 'PPE');
  const units = getDictionaryChildren(dictionaries, 'UNITS');
  const updatePpe = (rowId: string, patch: Partial<TechCardPpe>) => patchCard({ ppe: card.ppe.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) });

  return (
    <div className="parameter-section">
      <SectionTitle title="СИЗ" description="Средства индивидуальной защиты для выполнения технологической карты." />
      <button type="button" className="secondary-action" onClick={() => patchCard({ ppe: [...card.ppe, createEmptyPpe()] })}>Добавить СИЗ</button>
      {card.ppe.length === 0 ? <EmptyState title="СИЗ не заданы" description="Добавьте СИЗ, если они требуются для безопасного выполнения работы." /> : null}
      {card.ppe.map((row) => (
        <div className="tech-card-row" key={row.id}>
          <div className="inline-title"><b>{getDictionaryTitle(dictionaries, row.ppeId)}</b><button type="button" onClick={() => patchCard({ ppe: card.ppe.filter((item) => item.id !== row.id) })}>Удалить</button></div>
          <SelectField label="Наименование СИЗ" value={row.ppeId} options={[{ value: '', label: 'Не выбрано' }, ...ppeItems.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updatePpe(row.id, { ppeId: value })} />
          <EditableField label="Количество" type="number" value={row.quantity} onChange={(value) => updatePpe(row.id, { quantity: Number(value) || 0 })} />
          <SelectField label="Единица измерения" value={row.unitId} options={[{ value: '', label: 'Не выбрано' }, ...units.map((item) => ({ value: item.id, label: item.title }))]} onChange={(value) => updatePpe(row.id, { unitId: value })} />
          <CheckboxField label="Обязательное СИЗ" checked={row.required} onChange={(checked) => updatePpe(row.id, { required: checked })} />
          <TextAreaField label="Комментарий" value={row.comment} onChange={(value) => updatePpe(row.id, { comment: value })} />
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="section-title"><h3>{title}</h3><p>{description}</p></div>;
}

function InlineWarning({ message }: { message: string }) {
  return <div className="inline-warning"><b>Предупреждение</b><p>{message}</p></div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return <label className="field-row"><span>{label}</span><input value={value} readOnly /></label>;
}

function EditableField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: 'text' | 'number' | 'date'; onChange: (value: string) => void }) {
  return <label className="field-row"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field-row"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="field-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="boolean-row"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>;
}
