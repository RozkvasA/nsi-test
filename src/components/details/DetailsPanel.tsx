import type {
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  ParameterGroupId,
  ParameterGroupView,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
} from '../../types/nsi';
import { ParameterContent } from './ParameterContent';

interface DetailsPanelProps {
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  activeTab: string;
  tabs: string[];
  activeGroupId: ParameterGroupId;
  parameterGroups: ParameterGroupView[];
  showEmpty: boolean;
  detailsNotice: DetailsNotice | null;
  objects: InfrastructureObject[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  onSetActiveTab: (tab: string) => void;
  onSetActiveGroupId: (groupId: ParameterGroupId) => void;
  onSetShowEmpty: (value: boolean) => void;
  onDismissNotice: () => void;
  onConfirmRetire: () => void;
  onCancelRetire: () => void;
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onToggleObjectSystemLink: (objectId: string, systemId: string) => void;
  onToggleEquipmentPlacement: (objectId: string, equipmentId: string) => void;
  onToggleSystemRoomLink: (systemId: string, roomId: string) => void;
  onBulkLinkRoomsToSystem: (systemId: string, roomIds: string[]) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

export function DetailsPanel({
  selectedRef,
  selectedEntity,
  activeTab,
  tabs,
  activeGroupId,
  parameterGroups,
  showEmpty,
  detailsNotice,
  objects,
  systems,
  equipment,
  techCards,
  dictionaries,
  onSetActiveTab,
  onSetActiveGroupId,
  onSetShowEmpty,
  onDismissNotice,
  onConfirmRetire,
  onCancelRetire,
  onUpdateObject,
  onToggleObjectSystemLink,
  onToggleEquipmentPlacement,
  onToggleSystemRoomLink,
  onBulkLinkRoomsToSystem,
  onUpdateTechCard,
}: DetailsPanelProps) {
  return (
    <section className="details-panel">
      <header className="details-header">
        <p className="eyebrow">Карточка элемента</p>
        <h2>{selectedEntity?.title ?? 'Элемент не выбран'}</h2>
        <span>{selectedEntity?.subtitle ?? 'Выберите строку в дереве'}</span>
      </header>

      {detailsNotice ? (
        <DetailsNoticePanel notice={detailsNotice} onDismiss={onDismissNotice} onConfirmRetire={onConfirmRetire} onCancelRetire={onCancelRetire} />
      ) : null}

      <div className="tabs">
        {tabs.map((tab) => (
          <button key={tab} type="button" className={tab === activeTab ? 'tab active' : 'tab'} onClick={() => onSetActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Параметры' ? (
        <div className="parameters-layout">
          <aside className="parameter-groups">
            <div className="toggle-row">
              <span>Показать пустые</span>
              <label className="switch">
                <input type="checkbox" checked={showEmpty} onChange={(event) => onSetShowEmpty(event.target.checked)} />
                <span />
              </label>
            </div>
            {parameterGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={group.id === activeGroupId ? 'group-button active' : 'group-button'}
                onClick={() => onSetActiveGroupId(group.id)}
              >
                <b>{group.title}</b>
                <small>{group.hint}</small>
              </button>
            ))}
          </aside>

          <div className="parameter-card">
            <ParameterContent
              selectedRef={selectedRef}
              selectedEntity={selectedEntity}
              activeGroupId={activeGroupId}
              showEmpty={showEmpty}
              objects={objects}
              systems={systems}
              equipment={equipment}
              techCards={techCards}
              dictionaries={dictionaries}
              onUpdateObject={onUpdateObject}
              onToggleObjectSystemLink={onToggleObjectSystemLink}
              onToggleEquipmentPlacement={onToggleEquipmentPlacement}
              onToggleSystemRoomLink={onToggleSystemRoomLink}
              onBulkLinkRoomsToSystem={onBulkLinkRoomsToSystem}
              onUpdateTechCard={onUpdateTechCard}
            />
          </div>
        </div>
      ) : (
        <div className="stub-tab">
          <h3>{activeTab}</h3>
          <p>Раздел оставлен как заглушка этапа 1. Каркас вкладки есть, детальная логика будет подключаться следующими этапами.</p>
        </div>
      )}
    </section>
  );
}

function DetailsNoticePanel({
  notice,
  onDismiss,
  onConfirmRetire,
  onCancelRetire,
}: {
  notice: DetailsNotice;
  onDismiss: () => void;
  onConfirmRetire: () => void;
  onCancelRetire: () => void;
}) {
  if (notice.type === 'retireConfirm') {
    const { impact } = notice;
    return (
      <div className="notice-panel danger">
        <div>
          <b>Снятие с учета: {impact.targetObjectName}</b>
          <p>
            Будет затронуто: дочерних элементов {impact.descendantCount}, систем {impact.affectedSystems}, оборудования {impact.affectedEquipment}, техкарт {impact.affectedTechCards}.
          </p>
        </div>
        <div className="notice-actions">
          <button type="button" className="danger-button" onClick={onConfirmRetire}>
            Подтвердить
          </button>
          <button type="button" onClick={onCancelRetire}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={notice.type === 'moveBlocked' ? 'notice-panel danger' : 'notice-panel'}>
      <div>
        <b>{notice.title}</b>
        <p>{notice.message}</p>
      </div>
      <button type="button" onClick={onDismiss}>
        Закрыть
      </button>
    </div>
  );
}
