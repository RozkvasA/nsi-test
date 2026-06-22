import type {
  CreateEntityKind,
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  NsiSection,
  NsiSectionId,
  ParameterGroupId,
  ParameterGroupView,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
  TreeActionId,
  TreeNode,
} from '../../types/nsi';
import { DetailsPanel } from '../details/DetailsPanel';
import { NsiTree } from '../tree/NsiTree';

interface NsiLayoutProps {
  sections: NsiSection[];
  activeSection: NsiSection;
  activeSectionId: NsiSectionId;
  searchQuery: string;
  sortAscending: boolean;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  pendingMoveObjectId: string | null;
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
  onSelectSection: (sectionId: NsiSectionId) => void;
  onSetSearchQuery: (value: string) => void;
  onToggleSort: () => void;
  onToggleExpanded: (nodeId: string) => void;
  onSelectNode: (node: TreeNode) => void;
  onStartDrag: (objectId: string) => void;
  onDropOnObject: (objectId: string) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToObject: (targetObjectId: string) => void;
  onCancelMove: () => void;
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

export function NsiLayout({
  sections,
  activeSection,
  activeSectionId,
  searchQuery,
  sortAscending,
  childrenByParentId,
  expandedIds,
  selectedRef,
  selectedEntity,
  pendingMoveObjectId,
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
  onSelectSection,
  onSetSearchQuery,
  onToggleSort,
  onToggleExpanded,
  onSelectNode,
  onStartDrag,
  onDropOnObject,
  onCreate,
  onTreeAction,
  onMoveToObject,
  onCancelMove,
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
}: NsiLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">НСИ</span>
          <div>
            <h1>Модуль НСИ</h1>
            <p>универсальная база исходных данных</p>
          </div>
        </div>

        <nav className="section-nav" aria-label="Разделы НСИ">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSectionId ? 'section-button active' : 'section-button'}
              onClick={() => onSelectSection(section.id)}
            >
              <span>{section.title}</span>
              <small>{section.description}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="work-area">
        <NsiTree
          activeSection={activeSection}
          activeSectionId={activeSectionId}
          searchQuery={searchQuery}
          sortAscending={sortAscending}
          childrenByParentId={childrenByParentId}
          expandedIds={expandedIds}
          selectedRef={selectedRef}
          pendingMoveObjectId={pendingMoveObjectId}
          onSetSearchQuery={onSetSearchQuery}
          onToggleSort={onToggleSort}
          onToggleExpanded={onToggleExpanded}
          onSelectNode={onSelectNode}
          onStartDrag={onStartDrag}
          onDropOnObject={onDropOnObject}
          onCreate={onCreate}
          onTreeAction={onTreeAction}
          onMoveToObject={onMoveToObject}
          onCancelMove={onCancelMove}
        />

        <DetailsPanel
          selectedRef={selectedRef}
          selectedEntity={selectedEntity}
          activeTab={activeTab}
          tabs={tabs}
          activeGroupId={activeGroupId}
          parameterGroups={parameterGroups}
          showEmpty={showEmpty}
          detailsNotice={detailsNotice}
          objects={objects}
          systems={systems}
          equipment={equipment}
          techCards={techCards}
          dictionaries={dictionaries}
          onSetActiveTab={onSetActiveTab}
          onSetActiveGroupId={onSetActiveGroupId}
          onSetShowEmpty={onSetShowEmpty}
          onDismissNotice={onDismissNotice}
          onConfirmRetire={onConfirmRetire}
          onCancelRetire={onCancelRetire}
          onUpdateObject={onUpdateObject}
          onToggleObjectSystemLink={onToggleObjectSystemLink}
          onToggleEquipmentPlacement={onToggleEquipmentPlacement}
          onToggleSystemRoomLink={onToggleSystemRoomLink}
          onBulkLinkRoomsToSystem={onBulkLinkRoomsToSystem}
          onUpdateTechCard={onUpdateTechCard}
        />
      </main>
    </div>
  );
}
